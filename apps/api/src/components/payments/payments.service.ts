import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { PaymentStatus } from '../orders/schemas/order.schema';
import { OctoPaymentService } from '../../libs/services/octo-payment.service';

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
    ) { }

    async preparePayment(memberId: string, email: string | undefined, orderId: string) {
        const order = await this.ordersService.findOwnedById(memberId, orderId);

        if (order.paymentStatus === PaymentStatus.PAID) {
            throw new BadRequestException('This order has already been paid.');
        }

        const shopTransactionId = `${order._id.toString()}-${order.paymentAttemptCount + 1}`;
        const marketplaceOrigin = this.configService.get<string>('MARKETPLACE_ORIGIN') || 'http://127.0.0.1';
        const apiPublicUrl = this.configService.get<string>('API_PUBLIC_URL');

        const response = await this.octoPaymentService.preparePayment({
            shopTransactionId,
            totalSum: order.totalAmount,
            currency: order.currency || 'UZS',
            description: `Order ${order._id.toString()}`,
            userId: memberId,
            email,
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
