import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { LoginInput, MemberAdminUpdateInput, MemberInput, MemberUpdateInput } from './dto/member.input';
import { MemberAuthResponse, MemberResponse } from './dto/member.response';
import { MemberInquiryDto } from './dto/member-inquiry.dto';
import { Member, MemberStatus } from './schemas/member.schema';
import { Message } from '../../libs/enums/common.enum';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class MemberService {
    constructor(
        @InjectModel(Member.name) private readonly memberModel: Model<Member>,
        private readonly authService: AuthService,
    ) { }

    async signup(input: MemberInput): Promise<MemberAuthResponse> {
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
            const result = await this.memberModel.create(input);
            return this.authService.generateToken(result);
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
        }

        const isMatch = await bcrypt.compare(password, response.password!);
        if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

        return this.authService.generateToken(response);
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
        const { page, limit, search } = query;
        const match: any = {};

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
