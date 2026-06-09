import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';
import { Member } from '../../member/schemas/member.schema';

@Schema({ timestamps: true })
export class ProductReview extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: Product.name, required: true, index: true })
    productId: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: Member.name, required: true, index: true })
    memberId: string;

    @Prop({ required: true, min: 1, max: 5 })
    rating: number;

    @Prop({ trim: true, maxlength: 120 })
    title?: string;

    @Prop({ required: true, trim: true, maxlength: 1200 })
    body: string;

    @Prop({ default: true })
    verifiedPurchase: boolean;
}

export const ProductReviewSchema = SchemaFactory.createForClass(ProductReview);

ProductReviewSchema.index({ productId: 1, memberId: 1 }, { unique: true });
