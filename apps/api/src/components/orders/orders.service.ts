import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Message } from '../../libs/enums/common.enum';

@Injectable()
export class OrdersService {
    constructor(@InjectModel(Order.name) private orderModel: Model<Order>) { }

    async create(memberId: string, createOrderDto: CreateOrderDto): Promise<Order> {
        const createdOrder = new this.orderModel({
            ...createOrderDto,
            memberId,
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
