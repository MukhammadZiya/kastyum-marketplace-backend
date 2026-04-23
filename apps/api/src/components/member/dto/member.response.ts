import { MemberStatus, MemberType } from '../schemas/member.schema';

export interface MemberResponse {
    _id: string;
    nick: string;
    email?: string;
    telegramId?: string;
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

export interface TokenPayload {
    sub: string;
    email?: string;
    telegramId?: string;
    type: MemberType;
}
