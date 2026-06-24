import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { OrdersService } from '../orders/orders.service';
import { PaymentStatus } from '../orders/schemas/order.schema';
import { OctoPaymentService } from '../../libs/services/octo-payment.service';
import { Member } from '../member/schemas/member.schema';

const OCTO_STATUS_MAP: Record<string, PaymentStatus> = {
    created: PaymentStatus.PROCESSING,
    wait_user_action: PaymentStatus.PROCESSING,
    waiting_for_capture: PaymentStatus.PROCESSING,
    succeeded: PaymentStatus.PAID,
    canceled: PaymentStatus.FAILED,
};

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly ordersService: OrdersService,
        private readonly octoPaymentService: OctoPaymentService,
        private readonly configService: ConfigService,
        @InjectModel(Member.name) private readonly memberModel: Model<Member>,
    ) { }

    private sanitizePhone(raw: string | undefined): string | undefined {
        if (!raw) return undefined;
        const digits = raw.replace(/\D/g, '');
        // 9-digit Uzbek local number (e.g. "916020810") → prepend country code
        if (digits.length === 9) return `998${digits}`;
        // Already full Uzbek international format
        if (digits.length === 12 && digits.startsWith('998')) return digits;
        // Other valid lengths (13 digits with leading zero stripped, etc.)
        if (digits.length >= 10 && digits.length <= 15) return digits;
        return undefined;
    }

    async preparePayment(memberId: string, email: string | undefined, orderId: string, formPhone?: string) {
        const [order, member] = await Promise.all([
            this.ordersService.findOwnedById(memberId, orderId),
            this.memberModel.findById(memberId).select('phone email').lean().exec(),
        ]);

        if (order.paymentStatus === PaymentStatus.PAID) {
            throw new BadRequestException('This order has already been paid.');
        }

        const shopTransactionId = `${order._id.toString()}-${order.paymentAttemptCount + 1}`;
        const marketplaceOrigin = this.configService.get<string>('MARKETPLACE_ORIGIN') || 'http://127.0.0.1';
        const apiPublicUrl = this.configService.get<string>('API_PUBLIC_URL');

        const memberPhone = this.sanitizePhone(formPhone) ?? this.sanitizePhone(member?.phone);
        const memberEmail = email || member?.email;

        const response = await this.octoPaymentService.preparePayment({
            shopTransactionId,
            totalSum: order.totalAmount,
            currency: order.currency || 'UZS',
            description: `Order ${order._id.toString()}`,
            userId: memberId,
            phone: memberPhone,
            email: memberEmail,
            returnUrl: `${marketplaceOrigin}/payment-result?orderId=${order._id.toString()}`,
            notifyUrl: apiPublicUrl ? `${apiPublicUrl}/payments/octo/notify` : undefined,
        });

        if (response.error !== 0 || !response.data) {
            this.logger.warn(`OCTO prepare_payment failed for order ${orderId}: ${JSON.stringify(response)}`);
            await this.ordersService.updatePaymentStatus(orderId, PaymentStatus.FAILED);
            throw new BadGatewayException(response.errMessage || 'Payment provider error.');
        }

        await this.ordersService.recordPaymentAttempt(orderId, {
            shopTransactionId: response.data.shop_transaction_id,
            octoPaymentUUID: response.data.octo_payment_UUID,
            octoPayUrl: response.data.octo_pay_url,
            paymentStatus: OCTO_STATUS_MAP[response.data.status] ?? PaymentStatus.PROCESSING,
        });

        return {
            octo_pay_url: response.data.octo_pay_url,
            shop_transaction_id: response.data.shop_transaction_id,
            status: response.data.status,
        };
    }

    async getStatus(memberId: string, orderId: string) {
        const order = await this.ordersService.findOwnedById(memberId, orderId);

        const isTerminal = order.paymentStatus === PaymentStatus.PAID || order.paymentStatus === PaymentStatus.FAILED;
        if (isTerminal || !order.shopTransactionId) {
            return { paymentStatus: order.paymentStatus, orderStatus: order.status };
        }

        const response = await this.octoPaymentService.checkStatus(order.shopTransactionId);
        if (response.error !== 0 || !response.data) {
            return { paymentStatus: order.paymentStatus, orderStatus: order.status };
        }

        const mapped = OCTO_STATUS_MAP[response.data.status] ?? order.paymentStatus;
        if (mapped !== order.paymentStatus) {
            await this.ordersService.updatePaymentStatus(orderId, mapped);
        }

        return { paymentStatus: mapped, octoStatus: response.data.status, orderStatus: order.status };
    }

    async handleNotify(payload: any): Promise<{ status: string; message: string }> {
        try {
            const shopTransactionId: string | undefined = payload?.shop_transaction_id || payload?.data?.shop_transaction_id;

            if (!shopTransactionId) {
                this.logger.warn('OCTO notify received without shop_transaction_id.');
                return { status: 'success', message: 'ok' };
            }

            const order = await this.ordersService.findByShopTransactionId(shopTransactionId);
            if (!order || order.shopTransactionId !== shopTransactionId) {
                this.logger.warn(`OCTO notify for unknown or stale transaction: ${shopTransactionId}`);
                return { status: 'success', message: 'ok' };
            }

            const response = await this.octoPaymentService.checkStatus(shopTransactionId);
            if (response.error === 0 && response.data) {
                const mapped = OCTO_STATUS_MAP[response.data.status] ?? order.paymentStatus;
                if (mapped !== order.paymentStatus) {
                    await this.ordersService.updatePaymentStatus(order._id.toString(), mapped);
                }
            }
        } catch (err: any) {
            this.logger.error(`OCTO notify handling failed: ${err?.message ?? err}`);
        }

        return { status: 'success', message: 'ok' };
    }
}
