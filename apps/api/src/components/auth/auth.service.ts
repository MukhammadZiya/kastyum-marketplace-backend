import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Member } from '../member/schemas/member.schema';
import { MemberAuthResponse, TokenPayload } from '../member/dto/member.response';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TelegramLoginInput } from '../member/dto/member.input';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    generateToken(member: Member): MemberAuthResponse {
        const payload: TokenPayload = {
            sub: member._id as unknown as string,
            email: member.email,
            telegramId: member.telegramId,
            type: member.type
        };
        return {
            accessToken: this.jwtService.sign(payload),
            member: {
                _id: member._id as unknown as string,
                nick: member.nick,
                email: member.email,
                telegramId: member.telegramId,
                type: member.type,
                status: member.status,
                phone: member.phone,
                image: member.image,
                createdAt: member.get('createdAt'),
                updatedAt: member.get('updatedAt'),
            },
        };
    }

    verifyTelegramHash(data: TelegramLoginInput): boolean {
        const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        if (!botToken) return false;

        // Reject stale Telegram auth payloads to prevent replay attacks.
        // Telegram's own docs recommend a max of 24 hours.
        const MAX_AGE_SECONDS = 86400;
        const authDate = Number(data.auth_date);
        if (!authDate || Math.floor(Date.now() / 1000) - authDate > MAX_AGE_SECONDS) {
            return false;
        }

        const { hash, ...dataToVerify } = data;
        const dataCheckString = Object.keys(dataToVerify)
            .sort()
            .filter((key) => (dataToVerify as any)[key] !== undefined && (dataToVerify as any)[key] !== null)
            .map((key) => `${key}=${(dataToVerify as any)[key]}`)
            .join('\n');

        const secretKey = crypto.createHash('sha256').update(botToken).digest();
        const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        return hmac === hash;
    }
}
