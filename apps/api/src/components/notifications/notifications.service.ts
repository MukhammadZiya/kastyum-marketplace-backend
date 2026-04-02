import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationType } from './schemas/notification.schema';
import { NotificationInquiryDto } from './dto/notification-inquiry.dto';
import { Message } from '../../libs/enums/common.enum';

@Injectable()
export class NotificationsService {
    constructor(@InjectModel(Notification.name) private notificationModel: Model<Notification>) { }

    async createNotification(receiverId: string, message: string, type: NotificationType, targetId?: string): Promise<Notification> {
        const notification = new this.notificationModel({
            receiverId,
            message,
            type,
            targetId,
        });
        return notification.save();
    }

    async getNotifications(memberId: string, query: NotificationInquiryDto): Promise<{ list: Notification[], total: number }> {
        const { page, limit, isRead } = query;
        const match: any = { receiverId: new Types.ObjectId(memberId) };

        if (isRead === 'true') match.readAt = { $ne: null };
        if (isRead === 'false') match.readAt = null;

        const aggregateResult = await this.notificationModel.aggregate([
            { $match: match },
            {
                $facet: {
                    list: [
                        { $sort: { createdAt: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
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

    async markAsRead(id: string, memberId: string): Promise<Notification> {
        const notification = await this.notificationModel.findOneAndUpdate(
            { _id: id, receiverId: memberId },
            { readAt: new Date() },
            { new: true }
        ).exec();

        if (!notification) throw new NotFoundException(Message.NO_DATA_FOUND);
        return notification;
    }

    async getAllNotificationsByAdmin(query: NotificationInquiryDto): Promise<{ list: Notification[], total: number }> {
        const { page, limit, isRead, receiverId } = query;
        const match: any = {};

        if (isRead === 'true') match.readAt = { $ne: null };
        if (isRead === 'false') match.readAt = null;
        if (receiverId) match.receiverId = new Types.ObjectId(receiverId);

        const aggregateResult = await this.notificationModel.aggregate([
            { $match: match },
            {
                $facet: {
                    list: [
                        { $sort: { createdAt: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'members',
                                localField: 'receiverId',
                                foreignField: '_id',
                                as: 'receiverId',
                            },
                        },
                        { $unwind: { path: '$receiverId', preserveNullAndEmptyArrays: true } },
                        { $project: { 'receiverId.password': 0 } },
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
}
