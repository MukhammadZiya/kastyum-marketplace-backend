import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { LoginInput, MemberAdminUpdateInput, MemberInput, MemberUpdateInput, TelegramLoginInput } from './dto/member.input';
import { MemberAuthResponse, MemberResponse, SellerApplicationResponse } from './dto/member.response';
import { MemberInquiryDto } from './dto/member-inquiry.dto';
import { Member, MemberStatus, MemberType } from './schemas/member.schema';
import { Message } from '../../libs/enums/common.enum';
import { TelegramNotifierService } from '../../libs/services/telegram-notifier.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class MemberService {
    constructor(
        @InjectModel(Member.name) private readonly memberModel: Model<Member>,
        private readonly authService: AuthService,
        private readonly telegramNotifierService: TelegramNotifierService,
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
                throw new BadRequestException(Message.SELLER_APPLICATION_UNDER_REVIEW);
            }
            throw new BadRequestException(Message.USED_NICK);
        }

        const existingEmail = await this.memberModel.findOne({ email: input.email });
        if (existingEmail) {
            if (existingEmail.type === MemberType.SELLER && existingEmail.status === MemberStatus.PENDING) {
                throw new BadRequestException(Message.SELLER_APPLICATION_UNDER_REVIEW);
            }
            throw new BadRequestException(Message.USED_EMAIL);
        }

        if (input.phone) {
            const existingPhone = await this.memberModel.findOne({ phone: input.phone });
            if (existingPhone) {
                if (existingPhone.type === MemberType.SELLER && existingPhone.status === MemberStatus.PENDING) {
                    throw new BadRequestException(Message.SELLER_APPLICATION_UNDER_REVIEW);
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

            await this.telegramNotifierService.sendAdminMessage([
                '<b>New iBerry seller application</b>',
                `Store: ${this.escapeTelegramHtml(result.nick)}`,
                `Email: ${this.escapeTelegramHtml(result.email)}`,
                result.phone ? `Phone: ${this.escapeTelegramHtml(result.phone)}` : null,
                `Member ID: ${result._id}`,
                'Review this seller from the buttons below.',
            ].filter(Boolean).join('\n'), this.buildSellerReviewKeyboard(result._id.toString()));

            return {
                status: MemberStatus.PENDING,
                message: Message.SELLER_APPLICATION_UNDER_REVIEW,
                member: result as any,
            };
        } catch (err: any) {
            throw new BadRequestException(Message.CREATE_FAILED);
        }
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
                    url: this.buildSellerReviewUrl(memberId, 'approve'),
                },
                {
                    text: 'Decline',
                    url: this.buildSellerReviewUrl(memberId, 'decline'),
                },
            ]],
        };
    }

    private buildSellerReviewUrl(memberId: string, action: 'approve' | 'decline'): string {
        const baseUrl = process.env.API_PUBLIC_URL || `http://127.0.0.1:${process.env.PORT ?? 3000}`;
        const token = this.signSellerReview(memberId, action);
        return `${baseUrl.replace(/\/$/, '')}/member/seller/review/${memberId}/${action}?token=${token}`;
    }

    private signSellerReview(memberId: string, action: string): string {
        const secret = process.env.TELEGRAM_REVIEW_SECRET || process.env.TELEGRAM_BOT_TOKEN || 'iberry-local-review';
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

        const status = action === 'approve' ? MemberStatus.ACTIVE : MemberStatus.DELETE;
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
            : `Declined seller: ${result.nick}.`;
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
