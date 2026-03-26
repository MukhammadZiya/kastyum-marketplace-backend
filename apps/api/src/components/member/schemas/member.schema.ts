import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum MemberType {
    ADMIN = 'ADMIN',
    SELLER = 'SELLER',
    USER = 'USER',
}

export enum MemberStatus {
    ACTIVE = 'ACTIVE',
    BLOCK = 'BLOCK',
    DELETE = 'DELETE',
}

@Schema({ timestamps: true })
export class Member extends Document {
    @Prop({ required: true })
    nick: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password?: string;

    @Prop()
    phone?: string;

    @Prop({ required: true, enum: MemberType, default: MemberType.USER })
    type: MemberType;

    @Prop({ required: true, enum: MemberStatus, default: MemberStatus.ACTIVE })
    status: MemberStatus;
}

export const MemberSchema = SchemaFactory.createForClass(Member);
