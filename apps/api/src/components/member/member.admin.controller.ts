import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberAdminUpdateInput } from './dto/member.input';
import { MemberResponse } from './dto/member.response';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from './schemas/member.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../../libs/utils/multer-options';

@Controller('admin/members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MemberType.ADMIN)
export class MemberAdminController {
    constructor(private readonly memberService: MemberService) { }

    @Get('list')
    async getMembersByAdmin(): Promise<MemberResponse[]> {
        return this.memberService.getMembersByAdmin();
    }

    @Get('detail/:id')
    async getMemberByAdmin(@Param('id') id: string): Promise<MemberResponse> {
        return this.memberService.getMemberByAdmin(id);
    }

    @UseInterceptors(FileInterceptor('image', multerOptions))
    @Post('update/:id')
    async updateMemberByAdmin(
        @Param('id') id: string,
        @Body() input: MemberAdminUpdateInput,
        @UploadedFile() file: any,
    ): Promise<MemberResponse> {
        if (file) {
            input.image = `uploads/members/${file.filename}`;
        }
        return this.memberService.updateMemberByAdmin(id, input);
    }
}
