import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OctoPaymentService } from '../../libs/services/octo-payment.service';

@Module({
    imports: [OrdersModule],
    providers: [PaymentsService, OctoPaymentService],
    controllers: [PaymentsController],
})
export class PaymentsModule { }
