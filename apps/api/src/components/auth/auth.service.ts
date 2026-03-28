import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Member } from '../member/schemas/member.schema';
import { MemberAuthResponse, TokenPayload } from '../member/dto/member.response';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) { }

    generateToken(member: Member): MemberAuthResponse {
        const payload: TokenPayload = { sub: member._id as unknown as string, email: member.email, type: member.type };
        return {
            accessToken: this.jwtService.sign(payload),
            member: {
                _id: member._id as unknown as string,
                nick: member.nick,
                email: member.email,
                type: member.type,
                status: member.status,
                phone: member.phone,
                createdAt: member.get('createdAt'),
                updatedAt: member.get('updatedAt'),
            },
        };
    }
}
