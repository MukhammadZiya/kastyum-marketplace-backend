import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberAdminUpdateInput } from './dto/member.input';
import { MemberResponse } from './dto/member.response';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from './schemas/member.schema';

@Controller('admin/members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MemberType.ADMIN)
export class MemberAdminController {
    constructor(private readonly memberService: MemberService) { }

    @Get('list')
    async getMembersByAdmin(): Promise<MemberResponse[]> {
        return this.memberService.getMembersByAdmin();
    }

    @Post('update/:id')
    async updateMemberByAdmin(
        @Param('id') id: string,
        @Body() input: MemberAdminUpdateInput,
    ): Promise<MemberResponse> {
        return this.memberService.updateMemberByAdmin(id, input);
    }
}
