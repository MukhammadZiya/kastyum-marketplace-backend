import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AttributesService } from './attributes.service';
import { CreateAttributeDto } from './dto/attribute.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from '../member/schemas/member.schema';

@Controller('attribute')
export class AttributesController {
    constructor(private readonly attrService: AttributesService) { }

    @Get('list/:type')
    getAll(@Param('type') type: string) {
        return this.attrService.findAll(type);
    }

    @Post('create/:type')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.ADMIN)
    create(@Param('type') type: string, @Body() data: CreateAttributeDto) {
        return this.attrService.create(type, data);
    }

    @Post('delete/:type/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.ADMIN)
    remove(@Param('type') type: string, @Param('id') id: string) {
        return this.attrService.remove(type, id);
    }
}
