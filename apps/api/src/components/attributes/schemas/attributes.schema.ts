import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Color extends Document {
    @Prop({ required: true, unique: true }) name: string;
    @Prop() hexCode?: string;
    @Prop() code?: string;
}
export const ColorSchema = SchemaFactory.createForClass(Color);

@Schema()
export class Size extends Document {
    @Prop({ required: true, unique: true }) name: string;
}
export const SizeSchema = SchemaFactory.createForClass(Size);

@Schema()
export class Brand extends Document {
    @Prop({ required: true, unique: true }) name: string;
    @Prop() logoUrl?: string;
}
export const BrandSchema = SchemaFactory.createForClass(Brand);

@Schema()
export class Material extends Document {
    @Prop({ required: true, unique: true }) name: string;
}
export const MaterialSchema = SchemaFactory.createForClass(Material);

@Schema()
export class Fit extends Document {
    @Prop({ required: true, unique: true }) name: string;
}
export const FitSchema = SchemaFactory.createForClass(Fit);

@Schema()
export class Style extends Document {
    @Prop({ required: true, unique: true }) name: string;
}
export const StyleSchema = SchemaFactory.createForClass(Style);
