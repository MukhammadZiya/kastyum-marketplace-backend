import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { MemberType } from '../schemas/member.schema';

export class MemberInput {
    @IsString()
    nick: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsEnum(MemberType)
    type?: MemberType;
}

export class LoginInput {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;
}
