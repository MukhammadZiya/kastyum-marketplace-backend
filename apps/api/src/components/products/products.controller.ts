import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { CurrentUser } from '../../libs/decorators/current-user.decorator';
import { MemberType } from '../member/schemas/member.schema';

@Controller('product')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Post('create')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER)
    create(@Body() createProductDto: CreateProductDto, @CurrentUser() user: any) {
        return this.productsService.create(user.sub, createProductDto);
    }

    @Get('list')
    findAll(@Query() query: any) {
        return this.productsService.findAll(query);
    }

    @Get('detail/:id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Post('update/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER)
    update(
        @Param('id') id: string,
        @Body() updateProductDto: Partial<CreateProductDto>,
        @CurrentUser() user: any,
    ) {
        return this.productsService.update(id, updateProductDto, user.sub);
    }

    @Post('delete/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER, MemberType.ADMIN)
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.productsService.remove(id, user.sub, user.type);
    }
}
