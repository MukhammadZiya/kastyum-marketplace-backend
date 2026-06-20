import { Controller, Post, Body, Get, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MemberService } from './member.service';
import { GoogleLoginInput, LoginInput, MemberAdminUpdateInput, MemberInput, MemberUpdateInput, TelegramLoginInput } from './dto/member.input';
import { MemberAuthResponse, MemberResponse, SellerApplicationResponse } from './dto/member.response';
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

    // Stricter throttle on auth endpoints: 10 requests per minute per IP
    @Throttle({ auth: { ttl: 60000, limit: 10 } })
    @Post('signup')
    async signup(@Body() input: MemberInput): Promise<MemberAuthResponse> {
        return this.memberService.signup(input);
    }

    @Post('seller/apply')
    async applySeller(@Body() input: MemberInput): Promise<SellerApplicationResponse> {
        return this.memberService.applySeller(input);
    }

    @Get('seller/review/:id/:action')
    async reviewSellerApplication(
        @Param('id') id: string,
        @Param('action') action: 'approve' | 'decline',
        @Query('token') token: string,
    ): Promise<string> {
        return this.memberService.reviewSellerApplication(id, action, token);
    }

    @Post('seller/telegram-review')
    async handleSellerTelegramReview(
        @Body() update: any,
        @Query('secret') secret: string,
    ): Promise<{ ok: true }> {
        return this.memberService.handleSellerReviewTelegramUpdate(update, secret);
    }

    @Throttle({ auth: { ttl: 60000, limit: 10 } })
    @Post('google-login')
    async googleLogin(@Body() input: GoogleLoginInput): Promise<MemberAuthResponse> {
        return this.memberService.googleLogin(input);
    }

    @Throttle({ auth: { ttl: 60000, limit: 10 } })
    @Post('login')
    async login(@Body() input: LoginInput): Promise<MemberAuthResponse> {
        return this.memberService.login(input);
    }

    @Throttle({ auth: { ttl: 60000, limit: 10 } })
    @Post('telegram-login')
    async telegramLogin(@Body() input: TelegramLoginInput): Promise<MemberAuthResponse> {
        return this.memberService.telegramLogin(input);
    }

    @Throttle({ auth: { ttl: 60000, limit: 10 } })
    @Post('seller/telegram-login')
    async sellerTelegramLogin(@Body() input: TelegramLoginInput): Promise<MemberAuthResponse> {
        return this.memberService.sellerTelegramLogin(input);
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
    ): Promise<MemberAuthResponse> {
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
