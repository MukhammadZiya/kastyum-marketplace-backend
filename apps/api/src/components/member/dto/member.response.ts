import { MemberStatus, MemberType } from '../schemas/member.schema';

export interface MemberResponse {
    _id: string;
    nick: string;
    email?: string;
    telegramId?: string;
    telegramUsername?: string;
    phone?: string;
    image?: string;
    type: MemberType;
    status: MemberStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface MemberAuthResponse {
    member: MemberResponse;
    accessToken: string;
}

export interface SellerApplicationResponse {
    status: MemberStatus.PENDING;
    message: string;
    member: MemberResponse;
}

export interface TokenPayload {
    sub: string;
    email?: string;
    telegramId?: string;
    type: MemberType;
}
