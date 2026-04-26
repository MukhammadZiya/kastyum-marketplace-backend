import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationInquiryDto } from './dto/notification-inquiry.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { CurrentUser } from '../../libs/decorators/current-user.decorator';

@Controller('notification')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get('list')
    @UseGuards(JwtAuthGuard)
    getNotifications(@CurrentUser() user: any, @Query() query: NotificationInquiryDto) {
        return this.notificationsService.getNotifications(user.sub, query);
    }

    @Post('read/:id')
    @UseGuards(JwtAuthGuard)
    markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
        return this.notificationsService.markAsRead(id, user.sub);
    }
}
