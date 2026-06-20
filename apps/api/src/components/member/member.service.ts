import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { GoogleLoginInput, LoginInput, MemberAdminUpdateInput, MemberInput, MemberUpdateInput, TelegramLoginInput } from './dto/member.input';
import { MemberAuthResponse, MemberResponse, SellerApplicationResponse } from './dto/member.response';
import { MemberInquiryDto } from './dto/member-inquiry.dto';
import { Member, MemberStatus, MemberType } from './schemas/member.schema';
import { Message } from '../../libs/enums/common.enum';
import { TelegramNotifierService } from '../../libs/services/telegram-notifier.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class MemberService {
    private readonly logger = new Logger(MemberService.name);

    constructor(
        @InjectModel(Member.name) private readonly memberModel: Model<Member>,
        private readonly authService: AuthService,
        private readonly telegramNotifierService: TelegramNotifierService,
        private readonly configService: ConfigService,
    ) { }

    async signup(input: MemberInput): Promise<MemberAuthResponse> {
        if (input.type === MemberType.SELLER) {
            throw new BadRequestException(Message.SELLER_APPLICATION_APPROVED_REQUIRED);
        }

        const existingNick = await this.memberModel.findOne({ nick: input.nick });
        if (existingNick) {
            throw new BadRequestException(Message.USED_NICK);
        }

        const existingEmail = await this.memberModel.findOne({ email: input.email });
        if (existingEmail) {
            throw new BadRequestException(Message.USED_EMAIL);
        }

        if (input.phone) {
            const existingPhone = await this.memberModel.findOne({ phone: input.phone });
            if (existingPhone) {
                throw new BadRequestException(Message.USED_PHONE);
            }
        }

        if (input.password) {
            input.password = await bcrypt.hash(input.password, 10);
        }

        try {
            const result = await this.memberModel.create({ ...input, type: MemberType.USER });
            return this.authService.generateToken(result);
        } catch (err: any) {
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    async applySeller(input: MemberInput): Promise<SellerApplicationResponse> {
        const existingNick = await this.memberModel.findOne({ nick: input.nick });
        if (existingNick) {
            if (existingNick.type === MemberType.SELLER && existingNick.status === MemberStatus.PENDING) {
                await this.notifySellerApplication(existingNick);
                return {
                    status: MemberStatus.PENDING,
                    message: Message.SELLER_APPLICATION_UNDER_REVIEW,
                    member: existingNick as any,
                };
            }
            throw new BadRequestException(Message.USED_NICK);
        }

        const existingEmail = await this.memberModel.findOne({ email: input.email });
        if (existingEmail) {
            if (existingEmail.type === MemberType.SELLER && existingEmail.status === MemberStatus.PENDING) {
                await this.notifySellerApplication(existingEmail);
                return {
                    status: MemberStatus.PENDING,
                    message: Message.SELLER_APPLICATION_UNDER_REVIEW,
                    member: existingEmail as any,
                };
            }
            throw new BadRequestException(Message.USED_EMAIL);
        }

        if (input.phone) {
            const existingPhone = await this.memberModel.findOne({ phone: input.phone });
            if (existingPhone) {
                if (existingPhone.type === MemberType.SELLER && existingPhone.status === MemberStatus.PENDING) {
                    await this.notifySellerApplication(existingPhone);
                    return {
                        status: MemberStatus.PENDING,
                        message: Message.SELLER_APPLICATION_UNDER_REVIEW,
                        member: existingPhone as any,
                    };
                }
                throw new BadRequestException(Message.USED_PHONE);
            }
        }

        const password = input.password ? await bcrypt.hash(input.password, 10) : undefined;

        try {
            const result = await this.memberModel.create({
                ...input,
                password,
                type: MemberType.SELLER,
                status: MemberStatus.PENDING,
            });

            await this.notifySellerApplication(result);

            return {
                status: MemberStatus.PENDING,
                message: Message.SELLER_APPLICATION_UNDER_REVIEW,
                member: result as any,
            };
        } catch (err: any) {
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    private async notifySellerApplication(member: Member): Promise<void> {
        await this.telegramNotifierService.sendAdminMessage([
            '<b>New iBerry seller application</b>',
            `Store: ${this.escapeTelegramHtml(member.nick)}`,
            `Email: ${this.escapeTelegramHtml(member.email)}`,
            member.phone ? `Phone: ${this.escapeTelegramHtml(member.phone)}` : null,
            `Member ID: ${member._id}`,
            'Review this seller from the buttons below.',
        ].filter(Boolean).join('\n'), this.buildSellerReviewKeyboard(member._id.toString()));
    }

    async login(input: LoginInput): Promise<MemberAuthResponse> {
        const { email, password } = input;
        const response = await this.memberModel
            .findOne({ email })
            .select('+password')
            .exec();

        if (!response || response.status === MemberStatus.DELETE) {
            throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
        } else if (response.status === MemberStatus.BLOCK) {
            throw new InternalServerErrorException(Message.BLOCKED_USER);
        } else if (response.status === MemberStatus.PENDING) {
            throw new UnauthorizedException(Message.SELLER_APPLICATION_APPROVED_REQUIRED);
        }

        const isMatch = await bcrypt.compare(password, response.password!);
        if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

        return this.authService.generateToken(response);
    }

    async googleLogin(input: GoogleLoginInput): Promise<MemberAuthResponse> {
        const info = await this.authService.verifyGoogleCredential(input.idToken, input.accessToken);

        let member = await this.memberModel.findOne({ email: info.email }).exec();

        if (!member) {
            let nick = info.name.replace(/\s+/g, '_').slice(0, 30);
            const existingNick = await this.memberModel.findOne({ nick }).exec();
            if (existingNick) nick = `${nick}_g${info.googleId.slice(-6)}`;

            member = await this.memberModel.create({
                email: info.email,
                nick,
                image: info.picture,
                type: MemberType.USER,
                status: MemberStatus.ACTIVE,
            });
        } else if (member.status === MemberStatus.BLOCK) {
            throw new UnauthorizedException(Message.BLOCKED_USER);
        } else if (member.status === MemberStatus.DELETE) {
            throw new UnauthorizedException(Message.NO_MEMBER_NICK);
        } else if (member.status === MemberStatus.PENDING) {
            throw new UnauthorizedException(Message.SELLER_APPLICATION_APPROVED_REQUIRED);
        }

        return this.authService.generateToken(member);
    }

    async telegramLogin(input: TelegramLoginInput): Promise<MemberAuthResponse> {
        return this.telegramLoginByType(input, MemberType.USER);
    }

    async sellerTelegramLogin(input: TelegramLoginInput): Promise<MemberAuthResponse> {
        throw new BadRequestException(Message.SELLER_APPLICATION_APPROVED_REQUIRED);
    }

    private async telegramLoginByType(input: TelegramLoginInput, type: MemberType): Promise<MemberAuthResponse> {
        const isValid = this.authService.verifyTelegramHash(input);
        if (!isValid) {
            throw new UnauthorizedException(Message.INVALID_TELEGRAM_DATA);
        }

        const { id, first_name, last_name, username } = input;
        const telegramId = id.toString();

        let member = await this.memberModel.findOne({ telegramId }).exec();

        if (!member) {
            let nick = username || `${first_name}${last_name ? '_' + last_name : ''}`;
            const existingNick = await this.memberModel.findOne({ nick }).exec();
            if (existingNick) {
                nick = `${nick}_${telegramId}`;
            }

            member = await this.memberModel.create({
                telegramId,
                nick,
                email: `tg_${telegramId}_${type.toLowerCase()}@kastyum.uz`,
                type,
            });
        } else if (member.status === MemberStatus.BLOCK) {
            throw new UnauthorizedException(Message.BLOCKED_USER);
        } else if (member.status === MemberStatus.DELETE) {
            throw new UnauthorizedException(Message.NO_MEMBER_NICK);
        } else if (member.type !== type) {
            throw new UnauthorizedException(Message.WRONG_PORTAL);
        }

        return this.authService.generateToken(member);
    }

    private escapeTelegramHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    private buildSellerReviewKeyboard(memberId: string): Record<string, unknown> {
        return {
            inline_keyboard: [[
                {
                    text: 'Approve',
                    callback_data: `seller_review:approve:${memberId}`,
                },
                {
                    text: 'Decline',
                    callback_data: `seller_review:decline:${memberId}`,
                },
            ]],
        };
    }

    private buildSellerReviewUrl(memberId: string, action: 'approve' | 'decline'): string {
        const baseUrl = this.configService.get<string>('API_PUBLIC_URL') || `http://127.0.0.1:${this.configService.get<string>('PORT') ?? 3000}`;
        const token = this.signSellerReview(memberId, action);
        return `${baseUrl.replace(/\/$/, '')}/member/seller/review/${memberId}/${action}?token=${token}`;
    }

    private signSellerReview(memberId: string, action: string): string {
        const secret = this.getTelegramReviewSecret() || 'iberry-local-review';
        return crypto
            .createHmac('sha256', secret)
            .update(`${memberId}:${action}`)
            .digest('hex');
    }

    async reviewSellerApplication(id: string, action: 'approve' | 'decline', token: string): Promise<string> {
        if (action !== 'approve' && action !== 'decline') {
            throw new BadRequestException(Message.BAD_REQUEST);
        }

        if (!token) {
            throw new BadRequestException(Message.INVALID_TOKEN);
        }

        const expectedToken = this.signSellerReview(id, action);
        const isValidToken =
            token.length === expectedToken.length &&
            crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));

        if (!isValidToken) {
            throw new BadRequestException(Message.INVALID_TOKEN);
        }

        const status = action === 'approve' ? MemberStatus.ACTIVE : MemberStatus.BLOCK;
        const result = await this.memberModel
            .findOneAndUpdate(
                { _id: id, type: MemberType.SELLER, status: MemberStatus.PENDING },
                { status },
                { new: true },
            )
            .exec();

        if (!result) {
            return 'This seller application is already reviewed or no longer exists.';
        }

        return action === 'approve'
            ? `Approved seller: ${result.nick}. They can now sign in.`
            : `Declined seller: ${result.nick}. Seller status is paused.`;
    }

    async handleSellerReviewTelegramUpdate(update: any, secret: string): Promise<{ ok: true }> {
        const expectedSecret = this.getTelegramReviewSecret();
        if (expectedSecret && secret !== expectedSecret) {
            this.logger.warn('Telegram seller review callback skipped: invalid review secret.');
            return { ok: true };
        }

        const callbackQuery = update?.callback_query;
        const callbackData = callbackQuery?.data;

        if (!callbackQuery?.id || typeof callbackData !== 'string') {
            return { ok: true };
        }

        const [scope, action, memberId] = callbackData.split(':');
        if (scope !== 'seller_review' || (action !== 'approve' && action !== 'decline') || !memberId) {
            return { ok: true };
        }

        this.logger.log(`Telegram seller review callback received: ${action} ${memberId}`);

        const adminChatId = this.configService.get<string>('TELEGRAM_ADMIN_CHAT_ID');
        const callbackChatId = callbackQuery.message?.chat?.id?.toString();
        if (adminChatId && callbackChatId !== adminChatId) {
            this.logger.warn(`Telegram seller review callback rejected: chat ${callbackChatId ?? 'unknown'} is not admin chat.`);
            await this.telegramNotifierService.answerCallbackQuery(callbackQuery.id, 'Only the admin chat can review seller applications.');
            return { ok: true };
        }

        const status = action === 'approve' ? MemberStatus.ACTIVE : MemberStatus.BLOCK;
        const result = await this.memberModel
            .findOneAndUpdate(
                { _id: memberId, type: MemberType.SELLER, status: MemberStatus.PENDING },
                { status },
                { new: true },
            )
            .exec();

        if (!result) {
            this.logger.warn(`Telegram seller review callback found no pending seller: ${memberId}`);
            await this.telegramNotifierService.answerCallbackQuery(callbackQuery.id, 'This seller application is already reviewed.');
            return { ok: true };
        }

        this.logger.log(`Seller application ${memberId} set to ${status}.`);

        const escapedStore = this.escapeTelegramHtml(result.nick);
        const reviewedText = action === 'approve'
            ? [
                '<b>iBerry seller application approved</b>',
                `Store: ${escapedStore}`,
                `Email: ${this.escapeTelegramHtml(result.email)}`,
                result.phone ? `Phone: ${this.escapeTelegramHtml(result.phone)}` : null,
                `Status: ${MemberStatus.ACTIVE}`,
            ].filter(Boolean).join('\n')
            : [
                '<b>iBerry seller application declined</b>',
                `Store: ${escapedStore}`,
                `Email: ${this.escapeTelegramHtml(result.email)}`,
                result.phone ? `Phone: ${this.escapeTelegramHtml(result.phone)}` : null,
                `Status: ${MemberStatus.BLOCK}`,
            ].filter(Boolean).join('\n');

        await this.telegramNotifierService.answerCallbackQuery(
            callbackQuery.id,
            action === 'approve' ? 'Seller approved.' : 'Seller declined.',
        );

        if (callbackQuery.message?.chat?.id && callbackQuery.message?.message_id) {
            await this.telegramNotifierService.editMessageText(
                callbackQuery.message.chat.id,
                callbackQuery.message.message_id,
                reviewedText,
            );
        }

        if (action === 'approve') {
            await this.telegramNotifierService.sendAdminMessage([
                '<b>Seller approved</b>',
                `Store: ${escapedStore}`,
            ].join('\n'));
        }

        return { ok: true };
    }

    private getTelegramReviewSecret(): string | undefined {
        return this.configService.get<string>('TELEGRAM_REVIEW_SECRET')
            || this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    }

    async getMemberMe(id: string): Promise<MemberResponse> {
        const result = await this.memberModel.findById(id).exec();
        if (!result || result.status !== MemberStatus.ACTIVE) {
            throw new BadRequestException(Message.NO_MEMBER_NICK);
        }
        return result as any;
    }

    async updateMember(id: string, input: MemberUpdateInput): Promise<MemberAuthResponse> {
        const { password } = input;

        if (password) {
            input.password = await bcrypt.hash(password, 10);
        }

        const result = await this.memberModel
            .findByIdAndUpdate(id, input, { new: true })
            .exec();

        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

        return this.authService.generateToken(result);
    }

    async getMemberDetail(id: string): Promise<MemberResponse> {
        const result = await this.memberModel
            .findOne({ _id: id, status: MemberStatus.ACTIVE })
            .exec();

        if (!result) throw new BadRequestException(Message.NO_DATA_FOUND);
        return result as any;
    }

    async getMembersByAdmin(query: MemberInquiryDto): Promise<{ list: MemberResponse[], total: number }> {
        const { page, limit, search, type } = query;
        const match: any = {};

        if (type) {
            match.type = type;
        }

        if (search) {
            match.$or = [
                { nick: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const aggregateResult = await this.memberModel.aggregate([
            { $match: match },
            {
                $facet: {
                    list: [
                        { $sort: { createdAt: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        { $project: { password: 0 } },
                    ],
                    total: [
                        { $count: 'count' }
                    ]
                }
            }
        ]).exec();

        const list = aggregateResult[0].list;
        const total = aggregateResult[0].total[0]?.count || 0;

        return { list, total };
    }

    async updateMemberByAdmin(id: string, input: MemberAdminUpdateInput): Promise<MemberResponse> {
        const result = await this.memberModel
            .findByIdAndUpdate(id, input, { new: true })
            .exec();

        if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
        return result as any;
    }

    async getMemberByAdmin(id: string): Promise<MemberResponse> {
        const result = await this.memberModel.findById(id).exec();
        if (!result) throw new BadRequestException(Message.NO_DATA_FOUND);
        return result as any;
    }
}
