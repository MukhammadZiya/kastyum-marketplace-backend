import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OctoPaymentService } from '../../libs/services/octo-payment.service';
import { Member, MemberSchema } from '../member/schemas/member.schema';

@Module({
    imports: [
        OrdersModule,
        MongooseModule.forFeature([{ name: Member.name, schema: MemberSchema }]),
    ],
    providers: [PaymentsService, OctoPaymentService],
    controllers: [PaymentsController],
})
export class PaymentsModule { }
