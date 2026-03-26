import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum OrderStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    SHIPPED = 'SHIPPED',
    CANCELLED = 'CANCELLED',
}

@Schema()
export class OrderItem {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true }) productId: string;
    @Prop({ required: true }) quantity: number;
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Size' }) size?: string;
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Color' }) color?: string;
    @Prop({ required: true }) currentPrice: number;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true })
export class Order extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Member', required: true })
    memberId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Member', required: true })
    sellerId: string;

    @Prop({ type: [OrderItemSchema], required: true })
    items: OrderItem[];

    @Prop({ required: true })
    totalAmount: number;

    @Prop({ enum: OrderStatus, default: OrderStatus.PENDING })
    status: OrderStatus;

    @Prop({ type: Object })
    shippingAddress: Record<string, any>;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
