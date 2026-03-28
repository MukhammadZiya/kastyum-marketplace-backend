import { Controller, Post, Body } from '@nestjs/common';
import { MemberService } from './member.service';
import { LoginInput, MemberInput } from './dto/member.input';
import { MemberAuthResponse } from './dto/member.response';

@Controller('member')
export class MemberController {
    constructor(private readonly memberService: MemberService) { }

    @Post('signup')
    async signup(@Body() input: MemberInput): Promise<MemberAuthResponse> {
        return this.memberService.signup(input);
    }

    @Post('login')
    async login(@Body() input: LoginInput): Promise<MemberAuthResponse> {
        return this.memberService.login(input);
    }
}
