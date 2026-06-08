import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramNotifierService {
    private readonly logger = new Logger(TelegramNotifierService.name);

    constructor(private readonly configService: ConfigService) { }

    async sendAdminMessage(message: string): Promise<void> {
        const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        const chatId = this.configService.get<string>('TELEGRAM_ADMIN_CHAT_ID');

        if (!botToken || !chatId) {
            this.logger.warn('Telegram admin notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is missing.');
            return;
        }

        try {
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                }),
            });

            if (!response.ok) {
                this.logger.warn(`Telegram admin notification failed: ${response.status} ${response.statusText}`);
            }
        } catch (err: any) {
            this.logger.warn(`Telegram admin notification failed: ${err?.message ?? err}`);
        }
    }
}
