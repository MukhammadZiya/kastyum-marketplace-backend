import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { CurrentUser } from '../../libs/decorators/current-user.decorator';
import { MemberType } from '../member/schemas/member.schema';

@Controller('payments/octo')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Post('prepare')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.USER)
    prepare(@Body() dto: PreparePaymentDto, @CurrentUser() user: any) {
        return this.paymentsService.preparePayment(user.sub, user.email, dto.orderId);
    }

    @Get('status/:orderId')
    @UseGuards(JwtAuthGuard)
    status(@Param('orderId') orderId: string, @CurrentUser() user: any) {
        return this.paymentsService.getStatus(user.sub, orderId);
    }

    @Post('notify')
    notify(@Body() body: any) {
        return this.paymentsService.handleNotify(body);
    }
}
