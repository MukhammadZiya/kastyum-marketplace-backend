import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderInquiryDto } from './dto/order-inquiry.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from '../member/schemas/member.schema';

@Controller('admin/order')
export class OrdersAdminController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get('list')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.ADMIN)
    getAllOrdersByAdmin(@Query() query: OrderInquiryDto) {
        return this.ordersService.getAllOrdersByAdmin(query);
    }
}
