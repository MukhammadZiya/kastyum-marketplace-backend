import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { LoginInput, MemberAdminUpdateInput, MemberInput, MemberUpdateInput } from './dto/member.input';
import { MemberAuthResponse, MemberResponse } from './dto/member.response';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { CurrentUser } from '../../libs/decorators/current-user.decorator';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from './schemas/member.schema';
import { RolesGuard } from '../../libs/guards/roles.guard';

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

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMemberMe(@CurrentUser('sub') id: string): Promise<MemberResponse> {
        return this.memberService.getMemberMe(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('update')
    async updateMember(
        @CurrentUser('sub') id: string,
        @Body() input: MemberUpdateInput,
    ): Promise<MemberResponse> {
        return this.memberService.updateMember(id, input);
    }

    @Get('detail/:id')
    async getMemberDetail(@Param('id') id: string): Promise<MemberResponse> {
        return this.memberService.getMemberDetail(id);
    }

    /** ADMIN **/

    @Roles(MemberType.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Get('admin/list')
    async getMembersByAdmin(): Promise<MemberResponse[]> {
        return this.memberService.getMembersByAdmin();
    }

    @Roles(MemberType.ADMIN)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Post('admin/update/:id')
    async updateMemberByAdmin(
        @Param('id') id: string,
        @Body() input: MemberAdminUpdateInput,
    ): Promise<MemberResponse> {
        return this.memberService.updateMemberByAdmin(id, input);
    }
}
