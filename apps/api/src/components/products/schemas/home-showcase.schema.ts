import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

const KEY_DEFAULT = 'default';

@Schema({ _id: false })
export class HomeShowcaseSlot {
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
    productId: MongooseSchema.Types.ObjectId;

    /** Optional hero image for this slot (e.g. uploads/home/xxx.webp). */
    @Prop({ type: String })
    customImage?: string;
}

export const HomeShowcaseSlotSchema = SchemaFactory.createForClass(HomeShowcaseSlot);

@Schema({ timestamps: true, collection: 'homeshowcases' })
export class HomeShowcase extends Document {
    @Prop({ type: String, unique: true, default: KEY_DEFAULT })
    key: string;

    @Prop({ type: [HomeShowcaseSlotSchema], default: [] })
    newArrivals: HomeShowcaseSlot[];

    @Prop({ type: [HomeShowcaseSlotSchema], default: [] })
    mostPurchased: HomeShowcaseSlot[];
}

export const HomeShowcaseSchema = SchemaFactory.createForClass(HomeShowcase);
