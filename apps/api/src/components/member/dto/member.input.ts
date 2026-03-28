import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { MemberStatus, MemberType } from '../schemas/member.schema';

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
    @IsString()
    image?: string;

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

export class MemberUpdateInput {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    nick?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    phone?: string;

    @IsOptional()
    @IsString()
    image?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;
}

export class MemberAdminUpdateInput {
    @IsOptional()
    @IsEnum(MemberType)
    type?: MemberType;

    @IsOptional()
    @IsEnum(MemberStatus)
    status?: MemberStatus;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    nick?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    phone?: string;

    @IsOptional()
    @IsString()
    image?: string;
}
