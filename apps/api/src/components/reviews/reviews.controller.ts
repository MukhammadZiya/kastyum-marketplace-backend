import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../libs/decorators/current-user.decorator';
import { Roles } from '../../libs/decorators/roles.decorator';
import { JwtAuthGuard } from '../../libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../libs/guards/roles.guard';
import { MemberType } from '../member/schemas/member.schema';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('product/reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    @Get(':productId')
    listByProduct(@Param('productId') productId: string) {
        return this.reviewsService.listByProduct(productId);
    }

    @Get(':productId/me')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.USER)
    getMyEligibility(@Param('productId') productId: string, @CurrentUser() user: any) {
        return this.reviewsService.getMyEligibility(productId, user.sub);
    }

    @Post(':productId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(MemberType.USER)
    create(
        @Param('productId') productId: string,
        @Body() dto: CreateProductReviewDto,
        @CurrentUser() user: any,
    ) {
        return this.reviewsService.create(productId, user.sub, dto);
    }
}
