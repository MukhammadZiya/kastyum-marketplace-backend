import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private jwtService: JwtService) { }

    generateToken(member: any) {
        const payload = { sub: member._id, email: member.email, type: member.type };
        return {
            access_token: this.jwtService.sign(payload),
            member: {
                _id: member._id,
                nick: member.nick,
                email: member.email,
                type: member.type,
            },
        };
    }
}
