import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderInquiryDto } from './dto/order-inquiry.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { CurrentUser } from '../../libs/decorators/current-user.decorator';
import { MemberType } from '../member/schemas/member.schema';

@Controller('order')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post('create')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.USER)
    create(@Body() createOrderDto: CreateOrderDto, @CurrentUser() user: any) {
        return this.ordersService.create(user.sub, createOrderDto);
    }

    @Get('my-list')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.USER)
    findMyOrders(@CurrentUser() user: any, @Query() query: OrderInquiryDto) {
        return this.ordersService.findMyOrders(user.sub, query);
    }

    @Get('seller-list')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER)
    findSellerOrders(@CurrentUser() user: any, @Query() query: OrderInquiryDto) {
        return this.ordersService.findSellerOrders(user.sub, query);
    }

    @Post('update-status/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER)
    updateStatus(
        @Param('id') id: string,
        @Body() updateOrderStatusDto: UpdateOrderStatusDto,
        @CurrentUser() user: any,
    ) {
        return this.ordersService.updateStatus(id, user.sub, updateOrderStatusDto);
    }
}
