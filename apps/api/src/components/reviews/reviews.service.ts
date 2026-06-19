import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from '../products/schemas/product.schema';
import { OrdersService } from '../orders/orders.service';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ProductReview } from './schemas/product-review.schema';
import { Message } from '../../libs/enums/common.enum';

type ReviewStats = {
    average: number;
    count: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

@Injectable()
export class ReviewsService {
    constructor(
        @InjectModel(ProductReview.name) private readonly reviewModel: Model<ProductReview>,
        @InjectModel(Product.name) private readonly productModel: Model<Product>,
        private readonly ordersService: OrdersService,
    ) { }

    private assertObjectId(id: string): void {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(Message.BAD_REQUEST);
        }
    }

    private async ensureProduct(productId: string): Promise<void> {
        this.assertObjectId(productId);
        const exists = await this.productModel.exists({ _id: productId });
        if (!exists) {
            throw new NotFoundException(Message.NO_DATA_FOUND);
        }
    }

    private buildStats(reviews: ProductReview[]): ReviewStats {
        const distribution: ReviewStats['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const review of reviews) {
            const rating = review.rating as 1 | 2 | 3 | 4 | 5;
            distribution[rating] += 1;
        }
        const count = reviews.length;
        const average = count === 0 ? 0 : reviews.reduce((sum, review) => sum + review.rating, 0) / count;
        return { average, count, distribution };
    }

    async listByProduct(productId: string): Promise<{ list: ProductReview[]; stats: ReviewStats }> {
        await this.ensureProduct(productId);

        const list = await this.reviewModel
            .find({ productId })
            .sort({ createdAt: -1 })
            .populate('memberId', 'nick image')
            .exec();

        return { list, stats: this.buildStats(list) };
    }

    async getMyEligibility(productId: string, memberId: string): Promise<{ canReview: boolean; hasReviewed: boolean; hasPurchased: boolean }> {
        await this.ensureProduct(productId);

        const [existingReview, hasPurchased] = await Promise.all([
            this.reviewModel.exists({
                productId,
                memberId,
            }),
            this.ordersService.memberHasPurchasedProduct(memberId, productId),
        ]);

        return {
            canReview: hasPurchased && !existingReview,
            hasReviewed: Boolean(existingReview),
            hasPurchased,
        };
    }

    async create(productId: string, memberId: string, dto: CreateProductReviewDto): Promise<ProductReview> {
        await this.ensureProduct(productId);
        const body = dto.body.trim();
        if (!body) {
            throw new BadRequestException(Message.BAD_REQUEST);
        }

        const hasPurchased = await this.ordersService.memberHasPurchasedProduct(memberId, productId);
        if (!hasPurchased) {
            throw new ForbiddenException('Only customers who bought this product can leave a review.');
        }

        const existingReview = await this.reviewModel.exists({
            productId,
            memberId,
        });
        if (existingReview) {
            throw new ConflictException('You have already reviewed this product.');
        }

        const created = await this.reviewModel.create({
            productId,
            memberId,
            rating: dto.rating,
            title: dto.title?.trim() || undefined,
            body,
            verifiedPurchase: true,
        });

        return this.reviewModel
            .findById(created._id)
            .populate('memberId', 'nick image')
            .orFail()
            .exec();
    }
}
