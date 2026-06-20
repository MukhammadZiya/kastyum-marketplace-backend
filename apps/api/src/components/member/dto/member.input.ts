import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { MemberStatus, MemberType } from '../schemas/member.schema';

export class MemberInput {
    @IsString()
    nick: string;

    @IsEmail()
    email: string;

    @IsOptional()
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

    // image is not a user-submittable JSON field — it is set server-side after
    // a multipart upload and must never come from raw request body to prevent
    // arbitrary path injection.
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

export class TelegramLoginInput {
    @IsNotEmpty()
    id: number;

    @IsNotEmpty()
    @IsString()
    first_name: string;

    @IsOptional()
    @IsString()
    last_name?: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    photo_url?: string;

    @IsNotEmpty()
    auth_date: number;

    @IsNotEmpty()
    @IsString()
    hash: string;
}

export class GoogleLoginInput {
    @IsOptional()
    @IsString()
    idToken?: string;

    @IsOptional()
    @IsString()
    accessToken?: string;
}
