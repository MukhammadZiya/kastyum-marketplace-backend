import { Controller, Post, Body } from '@nestjs/common';
import { MemberService } from './member.service';
import { LoginInput, MemberInput } from './dto/member.input';

@Controller('member')
export class MemberController {
    constructor(private readonly memberService: MemberService) { }

    @Post('signup')
    async signup(@Body() input: MemberInput) {
        return this.memberService.signup(input);
    }

    @Post('login')
    async login(@Body() input: LoginInput) {
        return this.memberService.login(input);
    }
}
