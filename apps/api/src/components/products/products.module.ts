import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsAdminController } from './products.admin.controller';
import { ShapeService } from '../../libs/services/shape.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]), AuthModule],
    providers: [ProductsService, ShapeService],
    controllers: [ProductsController, ProductsAdminController],
    exports: [ProductsService],
})
export class ProductsModule { }
