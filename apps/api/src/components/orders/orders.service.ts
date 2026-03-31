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
        const fullItems = [];
        let totalAmount = 0;

        for (const item of createOrderDto.items) {
            const product = await this.productsService.findOne(item.productId);
            if (!product) throw new NotFoundException(`${Message.NO_DATA_FOUND}: ${item.productId}`);

            // Verify seller consistency
            const productSellerId = (product.sellerId as any)._id?.toString() || product.sellerId.toString();
            if (productSellerId !== createOrderDto.sellerId) {
                throw new BadRequestException(`Product ${item.productId} does not belong to the specified seller.`);
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
        }

        const createdOrder = new this.orderModel({
            ...createOrderDto,
            memberId,
            items: fullItems,
            totalAmount,
        });

        return createdOrder.save();
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

        order.status = updateDto.status;
        return order.save();
    }
}
