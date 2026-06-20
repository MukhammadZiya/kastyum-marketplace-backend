import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Member } from '../member/schemas/member.schema';
import { MemberAuthResponse, TokenPayload } from '../member/dto/member.response';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { TelegramLoginInput } from '../member/dto/member.input';
import { OAuth2Client } from 'google-auth-library';
import * as https from 'https';

export type GoogleUserInfo = {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
};

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

    async verifyGoogleCredential(idToken?: string, accessToken?: string): Promise<GoogleUserInfo> {
        if (!idToken && !accessToken) {
            throw new UnauthorizedException('Provide either idToken or accessToken for Google login.');
        }

        if (idToken) {
            const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
            if (!clientId) throw new UnauthorizedException('Google login is not configured on this server.');

            const client = new OAuth2Client(clientId);
            try {
                const ticket = await client.verifyIdToken({ idToken, audience: clientId });
                const payload = ticket.getPayload();
                if (!payload?.sub || !payload.email) {
                    throw new UnauthorizedException('Invalid Google ID token payload.');
                }
                return {
                    googleId: payload.sub,
                    email: payload.email,
                    name: payload.name || payload.email,
                    picture: payload.picture,
                };
            } catch {
                throw new UnauthorizedException('Google ID token verification failed.');
            }
        }

        // accessToken path — used by the React Native app via expo-auth-session
        return new Promise((resolve, reject) => {
            const url = `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken!)}`;
            https.get(url, (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        if (!data.sub || !data.email) {
                            return reject(new UnauthorizedException('Google access token is invalid or expired.'));
                        }
                        resolve({
                            googleId: data.sub,
                            email: data.email,
                            name: data.name || data.email,
                            picture: data.picture,
                        });
                    } catch {
                        reject(new UnauthorizedException('Failed to parse Google userinfo response.'));
                    }
                });
            }).on('error', () => reject(new UnauthorizedException('Could not reach Google userinfo endpoint.')));
        });
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
