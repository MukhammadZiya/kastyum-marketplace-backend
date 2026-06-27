import { Controller, Get, Post, Body, Param, UseGuards, Query, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../../libs/utils/multer-options';
import { ShapeService } from '../../libs/services/shape.service';
import { Message } from '../../libs/enums/common.enum';
import { ProductsService } from './products.service';
import { HomeShowcaseService } from './home-showcase.service';
import { ProductsInquiryDto } from './dto/products-inquiry.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { Roles } from '../../libs/decorators/roles.decorator';
import { CurrentUser } from '../../libs/decorators/current-user.decorator';
import { MemberType } from '../member/schemas/member.schema';

@Controller('product')
export class ProductsController {
    constructor(
        private readonly productsService: ProductsService,
        private readonly shapeService: ShapeService,
        private readonly homeShowcaseService: HomeShowcaseService,
    ) { }

    @Post('create')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER)
    @UseInterceptors(FilesInterceptor('images', 5, multerOptions))
    async create(
        @UploadedFiles() files: Express.Multer.File[],
        @Body() createProductDto: CreateProductDto,
        @CurrentUser() user: any
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException(Message.PROVIDE_PRODUCT_IMAGE);
        }

        const uploadedImages = [];
        for (const file of files) {
            const imgUrl = await this.shapeService.processImage(file, 'products');
            uploadedImages.push(imgUrl);
        }
        createProductDto.images = uploadedImages;

        return this.productsService.create(user.sub, createProductDto);
    }

    @Get('seller-list')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER)
    findSellerList(@CurrentUser() user: any, @Query() query: ProductsInquiryDto) {
        return this.productsService.findSellerProducts(user.sub, query);
    }

    @Get('seller-product/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER)
    findSellerProduct(@Param('id') id: string, @CurrentUser() user: any) {
        return this.productsService.findSellerProductById(id, user.sub);
    }

    @Get('list')
    findAll(@Query() query: ProductsInquiryDto) {
        return this.productsService.findAll(query);
    }

    @Get('home-showcase')
    homeShowcase() {
        return this.homeShowcaseService.getStorefrontPayload();
    }

    @Get('detail/:id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Post('update/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER)
    @UseInterceptors(FilesInterceptor('images', 5, multerOptions))
    async update(
        @Param('id') id: string,
        @UploadedFiles() files: Express.Multer.File[],
        @Body() updateProductDto: Partial<CreateProductDto>,
        @CurrentUser() user: any,
    ) {
        if (files && files.length > 0) {
            const product = await this.productsService.findOne(id);
            // Ensure the seller owns the product before deleting images
            const sellerId = (product.sellerId as any)._id?.toString() || product.sellerId.toString();
            if (sellerId !== user.sub) {
                throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
            }

            // Remove old images from storage
            if (product.images && product.images.length > 0) {
                for (const oldImage of product.images) {
                    this.shapeService.removeImage(oldImage);
                }
            }

            const uploadedImages = [];
            for (const file of files) {
                const imgUrl = await this.shapeService.processImage(file, 'products');
                uploadedImages.push(imgUrl);
            }
            updateProductDto.images = uploadedImages;
        }
        return this.productsService.update(id, updateProductDto, user.sub);
    }

    @Post('delete/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.SELLER, MemberType.ADMIN)
    remove(@Param('id') id: string, @CurrentUser() user: any) {
        return this.productsService.remove(id, user.sub, user.type);
    }
}
