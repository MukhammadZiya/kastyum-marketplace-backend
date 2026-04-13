import {
    Body,
    Controller,
    Get,
    Post,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from '../member/schemas/member.schema';
import { HomeShowcaseService } from './home-showcase.service';
import { UpdateHomeShowcaseDto } from './dto/update-home-showcase.dto';
import { UploadHomeSlotImageDto } from './dto/upload-home-slot-image.dto';
import { multerOptions } from '../../libs/utils/multer-options';

@Controller('admin/home-showcase')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MemberType.ADMIN)
export class HomeShowcaseAdminController {
    constructor(private readonly homeShowcaseService: HomeShowcaseService) { }

    @Get()
    getConfig() {
        return this.homeShowcaseService.getAdminConfig();
    }

    @Post()
    update(@Body() dto: UpdateHomeShowcaseDto) {
        return this.homeShowcaseService.updateConfig(dto);
    }

    @UseInterceptors(FileInterceptor('image', multerOptions))
    @Post('upload-image')
    async uploadImage(
        @Body() body: UploadHomeSlotImageDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.homeShowcaseService.uploadSlotImage(body.section, body.index, file);
    }
}
