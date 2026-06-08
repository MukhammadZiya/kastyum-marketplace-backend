import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { OrdersModule } from '../orders/orders.module';
import { ProductReview, ProductReviewSchema } from './schemas/product-review.schema';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ProductReview.name, schema: ProductReviewSchema },
            { name: Product.name, schema: ProductSchema },
        ]),
        OrdersModule,
    ],
    controllers: [ReviewsController],
    providers: [ReviewsService],
})
export class ReviewsModule { }
