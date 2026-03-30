import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum ProductStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    DELETE = 'DELETE',
}

export enum TargetAudience {
    MEN = 'MEN',
    WOMEN = 'WOMEN',
    KIDS = 'KIDS',
}

@Schema({ timestamps: true })
export class Product extends Document {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Member', required: true })
    sellerId: string;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    modelNumber: string;

    @Prop({ required: true, enum: TargetAudience })
    audience: TargetAudience;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    price: number;

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Color' }] })
    colors: string[];

    @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Size' }] })
    sizes: string[];

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Brand' })
    brand?: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Material' })
    material?: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Style' })
    style?: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Fit' })
    fit?: string;

    @Prop({ type: [String] })
    images: string[];

    @Prop({ required: true, default: 0 })
    stockCount: number;

    @Prop({ default: false })
    inStock: boolean;

    @Prop({ enum: ProductStatus, default: ProductStatus.ACTIVE })
    status: ProductStatus;
}
export const ProductSchema = SchemaFactory.createForClass(Product);
