import { BadRequestException, Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AttributesService } from './attributes.service';
import { CreateAttributeDto } from './dto/attribute.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from '../member/schemas/member.schema';
import { Message } from '../../libs/enums/common.enum';

const SELLER_CREATABLE_ATTRIBUTE_TYPES = ['size', 'color', 'brand', 'material', 'style'];

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

    /** Lets sellers add their own sizes/colors to the shared catalog while creating a product. */
    @Post('seller/create/:type')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER, MemberType.ADMIN)
    createSellerAttribute(@Param('type') type: string, @Body() data: CreateAttributeDto) {
        if (!SELLER_CREATABLE_ATTRIBUTE_TYPES.includes(type.toLowerCase())) {
            throw new BadRequestException(Message.ATTRIBUTE_TYPE_NOT_FOUND);
        }
        return this.attrService.findOrCreate(type, data.name);
    }
}
