import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Message } from '../../libs/enums/common.enum';

import { ProductsService } from '../products/products.service';
import { OrderInquiryDto } from './dto/order-inquiry.dto';

@Injectable()
export class OrdersService {
    constructor(
        @InjectModel(Order.name) private orderModel: Model<Order>,
        private readonly productsService: ProductsService,
    ) { }

    async create(memberId: string, createOrderDto: CreateOrderDto): Promise<Order> {
        if (!createOrderDto.items || createOrderDto.items.length === 0) {
            throw new BadRequestException('Order must contain at least one item.');
        }

        const fullItems = [];
        let totalAmount = 0;
        let expectedSellerId = '';
        const productsToUpdate = [];

        for (const item of createOrderDto.items) {
            const product = await this.productsService.findOne(item.productId);
            if (!product) throw new NotFoundException(`${Message.NO_DATA_FOUND}: ${item.productId}`);

            if (product.stockCount < item.quantity) {
                throw new BadRequestException(Message.NOT_ENOUGH_STOCK);
            }

            // Verify seller consistency
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
                size: item.size,
                color: item.color,
            };

            fullItems.push(orderItem);
            totalAmount += product.price * item.quantity;
            productsToUpdate.push({ product, quantity: item.quantity });
        }

        try {
            // Apply stock updates
            for (const update of productsToUpdate) {
                update.product.stockCount -= update.quantity;
                if (update.product.stockCount <= 0) {
                    update.product.stockCount = 0;
                    update.product.inStock = false;
                }
                await update.product.save();
            }

            const createdOrder = new this.orderModel({
                ...createOrderDto,
                sellerId: expectedSellerId,
                memberId,
                items: fullItems,
                totalAmount,
            });

            return await createdOrder.save();
        } catch (err) {
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
                        product.stockCount += item.quantity;
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
        return order.save();
    }
}
