import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { HomeShowcase, HomeShowcaseSchema } from './schemas/home-showcase.schema';
import { ProductsService } from './products.service';
import { HomeShowcaseService } from './home-showcase.service';
import { ProductsController } from './products.controller';
import { ProductsAdminController } from './products.admin.controller';
import { HomeShowcaseAdminController } from './home-showcase.admin.controller';
import { ShapeService } from '../../libs/services/shape.service';
import { AuthModule } from '../auth/auth.module';
import { MemberModule } from '../member/member.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Product.name, schema: ProductSchema },
            { name: HomeShowcase.name, schema: HomeShowcaseSchema },
        ]),
        AuthModule,
        MemberModule,
    ],
    providers: [ProductsService, HomeShowcaseService, ShapeService],
    controllers: [ProductsController, ProductsAdminController, HomeShowcaseAdminController],
    exports: [ProductsService, HomeShowcaseService],
})
export class ProductsModule { }
