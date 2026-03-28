import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { LoginInput, MemberInput } from './dto/member.input';
import { MemberAuthResponse } from './dto/member.response';
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
}
