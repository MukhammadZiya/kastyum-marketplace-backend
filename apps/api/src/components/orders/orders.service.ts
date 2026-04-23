import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Message } from '../../libs/enums/common.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

import { Product } from '../products/schemas/product.schema';
import { ProductsService } from '../products/products.service';
import { OrderInquiryDto } from './dto/order-inquiry.dto';
import { OrderItemDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
    constructor(
        @InjectModel(Order.name) private orderModel: Model<Order>,
        private readonly productsService: ProductsService,
        private readonly notificationsService: NotificationsService,
    ) { }

    private deductStockForLine(product: Product, item: OrderItemDto): void {
        const rows = product.variantStock;
        const hasVariants = Array.isArray(rows) && rows.length > 0;
        const rawSizes = product.sizes as unknown;
        const rawColors = product.colors as unknown;
        const hasS = Array.isArray(rawSizes) && rawSizes.length > 0;
        const hasC = Array.isArray(rawColors) && rawColors.length > 0;

        if (!hasVariants) {
            if (product.stockCount < item.quantity) {
                throw new BadRequestException(Message.NOT_ENOUGH_STOCK);
            }
            product.stockCount -= item.quantity;
            if (product.stockCount <= 0) {
                product.stockCount = 0;
                product.inStock = false;
            }
            return;
        }

        if (hasS && !item.sizeId) {
            throw new BadRequestException('This product requires a size on the order line.');
        }
        if (hasC && !item.colorId) {
            throw new BadRequestException('This product requires a color on the order line.');
        }

        const line = (rows as { sizeId?: { toString(): string }; colorId?: { toString(): string }; quantity: number }[]).find(
            (r) => {
                const rs = r.sizeId?.toString?.() ?? '';
                const rc = r.colorId?.toString?.() ?? '';
                if (hasS && rs !== item.sizeId) return false;
                if (!hasS && rs) return false;
                if (hasC && rc !== item.colorId) return false;
                if (!hasC && rc) return false;
                return true;
            },
        );

        if (!line) {
            throw new BadRequestException('Selected variant is not available for this product.');
        }
        if (line.quantity < item.quantity) {
            throw new BadRequestException(Message.NOT_ENOUGH_STOCK);
        }
        line.quantity -= item.quantity;
        const sum = (rows as { quantity: number }[]).reduce((a, r) => a + r.quantity, 0);
        product.stockCount = sum;
        product.inStock = sum > 0;
    }

    async create(memberId: string, createOrderDto: CreateOrderDto): Promise<Order> {
        if (!createOrderDto.items || createOrderDto.items.length === 0) {
            throw new BadRequestException('Order must contain at least one item.');
        }

        const fullItems = [];
        let totalAmount = 0;
        let expectedSellerId = '';
        const linesByProduct = new Map<string, OrderItemDto[]>();

        for (const item of createOrderDto.items) {
            const list = linesByProduct.get(item.productId) ?? [];
            list.push(item);
            linesByProduct.set(item.productId, list);
        }

        for (const item of createOrderDto.items) {
            const product = await this.productsService.findOne(item.productId);
            if (!product) throw new NotFoundException(`${Message.NO_DATA_FOUND}: ${item.productId}`);

            const productSellerId = (product.sellerId as any)._id?.toString() || product.sellerId.toString();

            if (!expectedSellerId) {
                expectedSellerId = productSellerId;
            } else if (expectedSellerId !== productSellerId) {
                throw new BadRequestException('All products in a single order must belong to the same seller.');
            }

            const orderItem = {
                productId: item.productId,
                productTitle: product.title,
                productImage: product.images[0] || '',
                price: product.price,
                quantity: item.quantity,
                size: item.sizeId,
                color: item.colorId,
            };

            fullItems.push(orderItem);
            totalAmount += product.price * item.quantity;
        }

        try {
            for (const [productId, lines] of linesByProduct) {
                const product = await this.productsService.findOne(productId);
                for (const line of lines) {
                    this.deductStockForLine(product as unknown as Product, line);
                }
                await (product as any).save();
            }

            const createdOrder = new this.orderModel({
                ...createOrderDto,
                sellerId: expectedSellerId,
                memberId,
                items: fullItems,
                totalAmount,
            });

            const savedOrder = await createdOrder.save();

            try {
                await this.notificationsService.createNotification(
                    expectedSellerId,
                    `A new order was placed for ${fullItems.length} items. Total: $${totalAmount}`,
                    NotificationType.ORDER_NEW,
                    savedOrder._id.toString()
                );
            } catch (notifErr) {
                console.log('Notification failed:', notifErr.message);
            }

            return savedOrder;
        } catch (err) {
            if (err instanceof BadRequestException) {
                throw err;
            }
            console.log('Error, creating order:', err.message);
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    async findMyOrders(memberId: string, query: OrderInquiryDto): Promise<{ list: Order[], total: number }> {
        const { page, limit, status } = query;
        const match: any = { memberId: new Types.ObjectId(memberId) };

        if (status) match.status = status;

        return this.aggregateOrders(match, page, limit);
    }

    async findSellerOrders(sellerId: string, query: OrderInquiryDto): Promise<{ list: Order[], total: number }> {
        const { page, limit, status } = query;
        const match: any = { sellerId: new Types.ObjectId(sellerId) };

        if (status) match.status = status;

        return this.aggregateOrders(match, page, limit);
    }

    async getAllOrdersByAdmin(query: OrderInquiryDto): Promise<{ list: Order[], total: number }> {
        const { page, limit, status, memberId, sellerId } = query;
        const match: any = {};

        if (status) match.status = status;
        if (memberId) match.memberId = new Types.ObjectId(memberId);
        if (sellerId) match.sellerId = new Types.ObjectId(sellerId);

        return this.aggregateOrders(match, page, limit);
    }

    private async aggregateOrders(match: any, page: number, limit: number): Promise<{ list: Order[], total: number }> {
        const aggregateResult = await this.orderModel.aggregate([
            { $match: match },
            {
                $facet: {
                    list: [
                        { $sort: { createdAt: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        // For findMyOrders we might want seller info, for findSellerOrders we want member info.
                        // Let's populate both just in case, or make it dynamic.
                        {
                            $lookup: {
                                from: 'members',
                                localField: 'sellerId',
                                foreignField: '_id',
                                as: 'sellerId',
                            },
                        },
                        { $unwind: { path: '$sellerId', preserveNullAndEmptyArrays: true } },
                        { $project: { 'sellerId.password': 0 } },
                        {
                            $lookup: {
                                from: 'members',
                                localField: 'memberId',
                                foreignField: '_id',
                                as: 'memberId',
                            },
                        },
                        { $unwind: { path: '$memberId', preserveNullAndEmptyArrays: true } },
                        { $project: { 'memberId.password': 0 } },
                    ],
                    total: [
                        { $count: 'count' }
                    ]
                }
            }
        ]).exec();

        const list = aggregateResult[0].list;
        const total = aggregateResult[0].total[0]?.count || 0;

        return { list, total };
    }

    async updateStatus(id: string, sellerId: string, updateDto: UpdateOrderStatusDto): Promise<Order> {
        const order = await this.orderModel.findOne({ _id: id });
        if (!order) throw new NotFoundException(Message.NO_DATA_FOUND);
        if (order.sellerId.toString() !== sellerId) {
            throw new ForbiddenException(Message.NOT_ALLOWED_REQUEST);
        }

        // Prevent modifying an already cancelled order
        if (order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
        }

        // If order is now being cancelled, restore product stock
        if (updateDto.status === OrderStatus.CANCELLED) {
            for (const item of order.items) {
                try {
                    const product = await this.productsService.findOne(item.productId);
                    if (product) {
                        const rows = product.variantStock || [];
                        const hasVariants = rows.length > 0;

                        if (!hasVariants) {
                            product.stockCount += item.quantity;
                        } else {
                            // Find the specific variant to restore
                            const line = (rows as any[]).find((r) => {
                                const rs = r.sizeId?.toString() ?? '';
                                const rc = r.colorId?.toString() ?? '';
                                const isId = item.size?.toString() ?? '';
                                const icId = item.color?.toString() ?? '';
                                return rs === isId && rc === icId;
                            });

                            if (line) {
                                line.quantity += item.quantity;
                            } else {
                                // If variant not found in stock (rare), just increment total or ignore?
                                // Better to add it back to total anyway
                                product.stockCount += item.quantity;
                            }
                            
                            // Always recalculate total stock from variants to be sure
                            product.stockCount = rows.reduce((a, r: any) => a + (r.quantity || 0), 0);
                        }
                        
                        if (product.stockCount > 0) {
                            product.inStock = true;
                        }
                        await product.save();
                    }
                } catch (err) {
                    console.log(`Failed to restore stock for productId: ${item.productId}`, err.message);
                }
            }
        }

        order.status = updateDto.status;
        const savedOrder = await order.save();

        try {
            await this.notificationsService.createNotification(
                order.memberId.toString(),
                `Your order status has been updated to ${updateDto.status}.`,
                NotificationType.ORDER_UPDATE,
                order._id.toString()
            );
        } catch (notifErr) {
            console.log('Notification failed:', notifErr.message);
        }

        return savedOrder;
    }
}
