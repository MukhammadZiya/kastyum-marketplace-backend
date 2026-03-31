import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberAdminUpdateInput } from './dto/member.input';
import { MemberResponse } from './dto/member.response';
import { MemberInquiryDto } from './dto/member-inquiry.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from './schemas/member.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../../libs/utils/multer-options';
import { ShapeService } from '../../libs/services/shape.service';

@Controller('admin/member')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MemberType.ADMIN)
export class MemberAdminController {
    constructor(
        private readonly memberService: MemberService,
        private readonly shapeService: ShapeService,
    ) { }

    @Get('list')
    async getMembersByAdmin(@Query() query: MemberInquiryDto): Promise<{ list: MemberResponse[], total: number }> {
        return this.memberService.getMembersByAdmin(query);
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
            const oldMember = await this.memberService.getMemberByAdmin(id);
            if (oldMember.image) {
                this.shapeService.removeImage(oldMember.image);
            }
            input.image = await this.shapeService.processImage(file);
        }
        return this.memberService.updateMemberByAdmin(id, input);
    }
}
