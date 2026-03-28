import { Controller, Post, Body, Get, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { MemberService } from './member.service';
import { LoginInput, MemberAdminUpdateInput, MemberInput, MemberUpdateInput } from './dto/member.input';
import { MemberAuthResponse, MemberResponse } from './dto/member.response';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { CurrentUser } from '../../libs/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../../libs/utils/multer-options';
import { ShapeService } from '../../libs/services/shape.service';

@Controller('member')
export class MemberController {
    constructor(
        private readonly memberService: MemberService,
        private readonly shapeService: ShapeService,
    ) { }

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
    @UseInterceptors(FileInterceptor('image', multerOptions))
    @Post('update')
    async updateMember(
        @CurrentUser('sub') id: string,
        @Body() input: MemberUpdateInput,
        @UploadedFile() file: any,
    ): Promise<MemberResponse> {
        if (file) {
            const oldMember = await this.memberService.getMemberMe(id);
            if (oldMember.image) {
                this.shapeService.removeImage(oldMember.image);
            }
            input.image = await this.shapeService.processImage(file);
        }
        return this.memberService.updateMember(id, input);
    }

    @Get('detail/:id')
    async getMemberDetail(@Param('id') id: string): Promise<MemberResponse> {
        return this.memberService.getMemberDetail(id);
    }
}
