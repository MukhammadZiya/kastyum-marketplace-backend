import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum NotificationType {
    ORDER_NEW = 'ORDER_NEW',
    ORDER_UPDATE = 'ORDER_UPDATE',
    SYSTEM = 'SYSTEM',
}

@Schema({ timestamps: true })
export class Notification extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Member', required: true })
    receiverId: string;

    @Prop({ required: true })
    message: string;

    @Prop({ enum: NotificationType, required: true })
    type: NotificationType;

    @Prop({ type: MongooseSchema.Types.ObjectId })
    targetId?: string;

    @Prop({ type: Date })
    readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
