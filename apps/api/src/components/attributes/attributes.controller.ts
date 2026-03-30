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

    @Get('list')
    getAllAttributes() {
        return this.attrService.findAllAttributes();
    }

    @Get('list/:type')
    getAll(@Param('type') type: string) {
        return this.attrService.findAll(type);
    }

}
