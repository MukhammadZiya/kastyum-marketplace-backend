import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { MemberService } from '../../components/member/member.service';

@Injectable()
export class TelegramReviewPollingService implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(TelegramReviewPollingService.name);
    private polling = false;
    private updateOffset = 0;
    private timer?: NodeJS.Timeout;

    constructor(
        private readonly configService: ConfigService,
        private readonly memberService: MemberService,
    ) { }

    onApplicationBootstrap(): void {
        const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        const enabled = this.configService.get<string>('TELEGRAM_ENABLE_POLLING');
        const isProduction = process.env.NODE_ENV === 'production';

        if (!botToken) {
            this.logger.warn('Telegram review polling skipped: TELEGRAM_BOT_TOKEN is missing.');
            return;
        }

        if (enabled === 'false' || (enabled !== 'true' && isProduction)) {
            return;
        }

        this.polling = true;
        void this.startPolling(botToken);
    }

    onModuleDestroy(): void {
        this.polling = false;
        if (this.timer) {
            clearTimeout(this.timer);
        }
    }

    private async startPolling(botToken: string): Promise<void> {
        await this.callTelegram(botToken, 'deleteWebhook', { drop_pending_updates: false });
        this.logger.log('Telegram review polling started.');
        await this.poll(botToken);
    }

    private async poll(botToken: string): Promise<void> {
        if (!this.polling) return;

        try {
            const response = await this.callTelegram(botToken, 'getUpdates', {
                offset: this.updateOffset || undefined,
                timeout: 25,
                allowed_updates: ['callback_query'],
            });

            if (response.ok && Array.isArray(response.result)) {
                for (const update of response.result) {
                    const updateId = typeof update.update_id === 'number' ? update.update_id : undefined;
                    const callbackData = update?.callback_query?.data;

                    try {
                        if (callbackData) {
                            this.logger.log(`Telegram callback update received: ${callbackData}`);
                        }

                        await this.memberService.handleSellerReviewTelegramUpdate(
                            update,
                            this.configService.get<string>('TELEGRAM_REVIEW_SECRET') || botToken,
                        );

                        if (updateId !== undefined) {
                            this.updateOffset = updateId + 1;
                        }
                    } catch (err: any) {
                        this.logger.warn(`Telegram callback update failed: ${err?.message ?? err}`);
                    }
                }
            } else if (!response.ok) {
                this.logger.warn(`Telegram polling failed: ${JSON.stringify(response)}`);
            }
        } catch (err: any) {
            this.logger.warn(`Telegram polling failed: ${err?.message ?? err}`);
        } finally {
            if (this.polling) {
                this.timer = setTimeout(() => void this.poll(botToken), 1000);
            }
        }
    }

    private callTelegram(
        botToken: string,
        method: string,
        payload: Record<string, unknown>,
    ): Promise<any> {
        const body = JSON.stringify(payload);

        return new Promise((resolve, reject) => {
            const req = https.request(
                {
                    hostname: 'api.telegram.org',
                    path: `/bot${botToken}/${method}`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                    },
                },
                (res) => {
                    let responseBody = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => {
                        responseBody += chunk;
                    });
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(responseBody));
                        } catch {
                            resolve({
                                ok: false,
                                description: responseBody,
                            });
                        }
                    });
                },
            );

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}
