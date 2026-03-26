import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { LoginInput, MemberInput } from './dto/member.input';
import { Member, MemberStatus } from './schemas/member.schema';
import { Message } from '../../libs/enums/common.enum';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class MemberService {
    constructor(
        @InjectModel(Member.name) private readonly memberModel: Model<Member>,
        private readonly authService: AuthService,
    ) { }

    async signup(input: MemberInput): Promise<any> {
        const existing = await this.memberModel.findOne({ email: input.email });
        if (existing) {
            throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
        }

        if (input.password) {
            input.password = await bcrypt.hash(input.password, 10);
        }

        try {
            const result = await this.memberModel.create(input);
            const token = this.authService.generateToken(result);
            return { member: result, accessToken: token.access_token };
        } catch (err: any) {
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    async login(input: LoginInput): Promise<any> {
        const { email, password } = input;
        const response = await this.memberModel
            .findOne({ email })
            .exec();

        if (!response || response.status === MemberStatus.DELETE) {
            throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
        } else if (response.status === MemberStatus.BLOCK) {
            throw new InternalServerErrorException(Message.BLOCKED_USER);
        }

        const isMatch = await bcrypt.compare(password, response.password!);
        if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

        const token = this.authService.generateToken(response);
        return { member: response, accessToken: token.access_token };
    }
}
