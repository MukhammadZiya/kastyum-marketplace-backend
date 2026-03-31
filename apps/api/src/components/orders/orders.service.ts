import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Message } from '../../libs/enums/common.enum';

import { ProductsService } from '../products/products.service';

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

    async findMyOrders(memberId: string): Promise<Order[]> {
        return this.orderModel.find({ memberId })
            .populate('sellerId', 'nick email phone -_id')
            .populate('items.productId')
            .exec();
    }

    async findSellerOrders(sellerId: string): Promise<Order[]> {
        return this.orderModel.find({ sellerId })
            .populate('memberId', 'nick email phone -_id')
            .populate('items.productId')
            .exec();
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
