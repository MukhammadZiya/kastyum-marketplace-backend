import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

export interface OctoPrepareParams {
    shopTransactionId: string;
    totalSum: number;
    currency: string;
    description: string;
    userId: string;
    phone?: string;
    email?: string;
    returnUrl: string;
    notifyUrl?: string;
    language?: string;
}

export interface OctoPrepareData {
    shop_transaction_id: string;
    octo_payment_UUID: string;
    status: string;
    octo_pay_url: string;
    total_sum: number;
}

export interface OctoStatusData {
    shop_transaction_id: string;
    octo_payment_UUID: string;
    status: string;
}

export interface OctoResponse<T> {
    error: number;
    errMessage?: string;
    data?: T;
}

@Injectable()
export class OctoPaymentService {
    private readonly logger = new Logger(OctoPaymentService.name);

    constructor(private readonly configService: ConfigService) { }

    async preparePayment(params: OctoPrepareParams): Promise<OctoResponse<OctoPrepareData>> {
        const octoShopId = this.configService.get<string>('OCTO_SHOP_ID');
        const octoSecret = this.configService.get<string>('OCTO_SECRET');

        if (!octoShopId || !octoSecret) {
            this.logger.warn('OCTO_SHOP_ID or OCTO_SECRET is not configured; skipping prepare_payment call.');
            return { error: 1, errMessage: 'OCTO credentials are not configured yet.' };
        }

        const testMode = this.configService.get<string>('OCTO_TEST_MODE') !== 'false';
        const ttlMinutes = Number(this.configService.get<string>('OCTO_PAYMENT_TTL_MINUTES')) || 30;

        const body: Record<string, unknown> = {
            octo_shop_id: octoShopId,
            octo_secret: octoSecret,
            shop_transaction_id: params.shopTransactionId,
            auto_capture: true,
            test: testMode,
            init_time: this.formatInitTime(),
            user_data: {
                user_id: params.userId,
                phone: params.phone,
                email: params.email,
            },
            total_sum: params.totalSum,
            currency: params.currency,
            description: params.description,
            payment_methods: [
                { method: 'bank_card' },
                { method: 'uzcard' },
                { method: 'humo' },
            ],
            return_url: params.returnUrl,
            language: params.language ?? 'uz',
            ttl: ttlMinutes,
        };

        if (params.notifyUrl) {
            body.notify_url = params.notifyUrl;
        }

        return this.postJson<OctoPrepareData>('/prepare_payment', body);
    }

    async checkStatus(shopTransactionId: string): Promise<OctoResponse<OctoStatusData>> {
        const octoShopId = this.configService.get<string>('OCTO_SHOP_ID');
        const octoSecret = this.configService.get<string>('OCTO_SECRET');

        if (!octoShopId || !octoSecret) {
            this.logger.warn('OCTO_SHOP_ID or OCTO_SECRET is not configured; skipping status check.');
            return { error: 1, errMessage: 'OCTO credentials are not configured yet.' };
        }

        return this.postJson<OctoStatusData>('/prepare_payment', {
            octo_shop_id: octoShopId,
            octo_secret: octoSecret,
            shop_transaction_id: shopTransactionId,
        });
    }

    private formatInitTime(): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        const now = new Date();
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }

    private postJson<T>(path: string, body: object): Promise<OctoResponse<T>> {
        const payload = JSON.stringify(body);

        return new Promise((resolve, reject) => {
            const req = https.request(
                {
                    hostname: 'secure.octo.uz',
                    path,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload),
                    },
                },
                (res) => {
                    let responseBody = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        responseBody += chunk;
                    });
                    res.on('end', () => {
                        this.logger.debug(`OCTO POST ${path} -> ${res.statusCode}: ${responseBody}`);
                        try {
                            resolve(JSON.parse(responseBody));
                        } catch (err) {
                            this.logger.error(`Failed to parse OCTO response (status ${res.statusCode}): ${responseBody}`);
                            reject(err);
                        }
                    });
                },
            );

            req.on('error', (err) => {
                this.logger.error(`OCTO request to ${path} failed: ${err.message}`);
                reject(err);
            });
            req.write(payload);
            req.end();
        });
    }
}
