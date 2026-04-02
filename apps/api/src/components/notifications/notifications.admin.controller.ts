import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationInquiryDto } from './dto/notification-inquiry.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from '../member/schemas/member.schema';

@Controller('admin/notification')
export class NotificationsAdminController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get('list')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.ADMIN)
    getAllNotificationsByAdmin(@Query() query: NotificationInquiryDto) {
        return this.notificationsService.getAllNotificationsByAdmin(query);
    }
}
