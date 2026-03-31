import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsInquiryDto } from './dto/products-inquiry.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from '../member/schemas/member.schema';

@Controller('admin/product')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MemberType.ADMIN)
export class ProductsAdminController {
    constructor(private readonly productsService: ProductsService) { }

    @Get('list')
    async getProductsByAdmin(@Query() query: ProductsInquiryDto) {
        return this.productsService.getProductsByAdmin(query);
    }

    @Get('detail/:id')
    async getProductByAdmin(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Post('update/:id')
    async updateProductByAdmin(
        @Param('id') id: string,
        @Body() updateData: Partial<CreateProductDto>,
    ) {
        return this.productsService.updateProductByAdmin(id, updateData);
    }

    @Post('remove/:id')
    async removeProductByAdmin(@Param('id') id: string) {
        return this.productsService.removeProductByAdmin(id);
    }
}
