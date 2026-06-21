import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';

@Injectable()
export class TelegramNotifierService {
    private readonly logger = new Logger(TelegramNotifierService.name);

    constructor(private readonly configService: ConfigService) { }

    async sendAdminMessageToAll(
        chatIds: string[],
        message: string,
        replyMarkup?: Record<string, unknown>,
    ): Promise<{ chatId: string; messageId: number }[]> {
        const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        if (!botToken) {
            this.logger.warn('Telegram sendAdminMessageToAll skipped: TELEGRAM_BOT_TOKEN is missing.');
            return [];
        }

        const results = await Promise.all(
            chatIds.map(chatId => this.sendToChat(botToken, chatId, message, replyMarkup)),
        );

        return results.filter((r): r is { chatId: string; messageId: number } => r !== null);
    }

    async editAllAdminMessages(
        messages: { chatId: string; messageId: number }[],
        text: string,
    ): Promise<void> {
        await Promise.all(
            messages.map(({ chatId, messageId }) => this.editMessageText(chatId, messageId, text)),
        );
    }

    private async sendToChat(
        botToken: string,
        chatId: string,
        message: string,
        replyMarkup?: Record<string, unknown>,
    ): Promise<{ chatId: string; messageId: number } | null> {
        try {
            const response = await this.postTelegramMethod(botToken, 'sendMessage', {
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
            });

            if (!response.ok) {
                this.logger.warn(`Telegram sendMessage to ${chatId} failed: ${response.statusCode} ${response.body}`);
                return null;
            }

            const parsed = JSON.parse(response.body);
            const messageId = parsed?.result?.message_id;
            if (!messageId) {
                this.logger.warn(`Telegram sendMessage to ${chatId}: no message_id in response`);
                return null;
            }

            return { chatId, messageId };
        } catch (err: any) {
            this.logger.warn(`Telegram sendMessage to ${chatId} failed: ${err?.message ?? err}`);
            return null;
        }
    }

    async answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
        await this.callBotApi('answerCallbackQuery', {
            callback_query_id: callbackQueryId,
            text,
            show_alert: false,
        });
    }

    async editMessageText(chatId: number | string, messageId: number, text: string): Promise<void> {
        await this.callBotApi('editMessageText', {
            chat_id: chatId,
            message_id: messageId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: { inline_keyboard: [] },
        });
    }

    private async callBotApi(method: string, payload: Record<string, unknown>): Promise<void> {
        const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

        if (!botToken) {
            this.logger.warn(`Telegram ${method} skipped: TELEGRAM_BOT_TOKEN is missing.`);
            return;
        }

        try {
            const response = await this.postTelegramMethod(botToken, method, payload);
            if (!response.ok) {
                this.logger.warn(`Telegram ${method} failed: ${response.statusCode} ${response.body}`);
            }
        } catch (err: any) {
            this.logger.warn(`Telegram ${method} failed: ${err?.message ?? err}`);
        }
    }

    private postTelegramMethod(
        botToken: string,
        method: string,
        payload: Record<string, unknown>,
    ): Promise<{ ok: boolean; statusCode: number; body: string }> {
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
                        resolve({
                            ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
                            statusCode: res.statusCode ?? 0,
                            body: responseBody,
                        });
                    });
                },
            );

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}
