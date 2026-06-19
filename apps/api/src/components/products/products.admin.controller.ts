import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { ProductsService } from './products.service';
import { HomeShowcaseService } from './home-showcase.service';
import { ProductsInquiryDto } from './dto/products-inquiry.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { AdminCreateProductFormDto } from './dto/admin-create-product-form.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { MemberType } from '../member/schemas/member.schema';
import { ProductStatus } from './schemas/product.schema';
import { MemberService } from '../member/member.service';
import { ShapeService } from '../../libs/services/shape.service';
import { Message } from '../../libs/enums/common.enum';
import { multerOptions } from '../../libs/utils/multer-options';

@Controller('admin/product')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(MemberType.ADMIN)
export class ProductsAdminController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly homeShowcaseService: HomeShowcaseService,
        private readonly memberService: MemberService,
        private readonly shapeService: ShapeService,
    ) { }

    @Post('create')
    @UseInterceptors(FilesInterceptor('images', 5, multerOptions))
    async createProduct(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() form: AdminCreateProductFormDto,
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException(Message.PROVIDE_PRODUCT_IMAGE);
        }
        const member = await this.memberService.getMemberByAdmin(form.sellerId);
        if (member.type !== MemberType.SELLER) {
            throw new BadRequestException('Products must be assigned to a seller account.');
        }

        const uploadedImages: string[] = [];
        for (const file of files) {
            uploadedImages.push(await this.shapeService.processImage(file, 'products'));
        }

        const dto: CreateProductDto = {
            title: form.title.trim(),
            description: form.description.trim(),
            modelNumber: form.modelNumber?.trim() || `ADM-${randomUUID().replace(/-/g, '').slice(0, 12)}`,
            audience: form.audience,
            price: form.price,
            listPrice: form.listPrice,
            stockCount: form.stockCount,
            colors: form.colorIds,
            sizes: form.sizeIds,
            variantStock: form.variantStock,
            brand: form.brand,
            material: form.material,
            style: form.style,
            images: uploadedImages,
            status: form.status ?? ProductStatus.ACTIVE,
        };

        const product = await this.productsService.create(form.sellerId, dto);
        await this.homeShowcaseService.appendProductToShowcaseSections(
            product._id.toString(),
            {
                newArrivals: !!form.homeShowcaseNewArrivals,
                mostPurchased: !!form.homeShowcaseMostPurchased,
            },
        );
        return product;
    }

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

    @Post('delete/:id')
    async deleteProductByAdmin(@Param('id') id: string) {
        return this.productsService.deleteProductByAdmin(id);
    }
}
