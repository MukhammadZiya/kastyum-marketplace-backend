import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ _id: false })
export class ProductVariantStockLine {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Size' })
    sizeId?: Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Color' })
    colorId?: Types.ObjectId;

    @Prop({ required: true, default: 0 })
    quantity: number;
}
export const ProductVariantStockLineSchema = SchemaFactory.createForClass(ProductVariantStockLine);

@Schema({ _id: false })
export class I18nText {
    @Prop() uz?: string;
    @Prop() ru?: string;
    @Prop() en?: string;
    @Prop() kk?: string;
}
export const I18nTextSchema = SchemaFactory.createForClass(I18nText);

@Schema({ _id: false })
export class GuaranteeInfo {
    @Prop() duration?: string;
    @Prop({ type: I18nTextSchema }) terms?: I18nText;
}
export const GuaranteeInfoSchema = SchemaFactory.createForClass(GuaranteeInfo);

@Schema({ _id: false })
export class ProductDimensions {
    @Prop() length?: number;
    @Prop() width?: number;
    @Prop() height?: number;
}
export const ProductDimensionsSchema = SchemaFactory.createForClass(ProductDimensions);

@Schema({ _id: false })
export class CustomAttributeLine {
    @Prop({ required: true }) key: string;
    @Prop({ required: true }) value: string;
}
export const CustomAttributeLineSchema = SchemaFactory.createForClass(CustomAttributeLine);

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

    @Prop({ type: I18nTextSchema })
    titleI18n?: I18nText;

    @Prop({ required: true })
    modelNumber: string;

    @Prop()
    barcode?: string;

    @Prop({ required: true, enum: TargetAudience })
    audience: TargetAudience;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category' })
    category?: Types.ObjectId;

    @Prop({ required: true })
    description: string;

    @Prop({ type: I18nTextSchema })
    descriptionI18n?: I18nText;

    @Prop({ required: true })
    price: number;

    @Prop()
    listPrice?: number;

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

    @Prop({ type: [String] })
    images: string[];

    @Prop({ required: true, default: 0 })
    stockCount: number;

    @Prop({ type: [ProductVariantStockLineSchema], default: [] })
    variantStock: ProductVariantStockLine[];

    @Prop({ default: false })
    inStock: boolean;

    @Prop({ enum: ProductStatus, default: ProductStatus.ACTIVE })
    status: ProductStatus;

    @Prop({ type: I18nTextSchema })
    careInstructions?: I18nText;

    @Prop({ type: GuaranteeInfoSchema })
    guarantee?: GuaranteeInfo;

    @Prop()
    weight?: number;

    @Prop({ type: ProductDimensionsSchema })
    dimensions?: ProductDimensions;

    @Prop({ type: [CustomAttributeLineSchema], default: [] })
    customAttributes: CustomAttributeLine[];
}
export const ProductSchema = SchemaFactory.createForClass(Product);
