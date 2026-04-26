import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MemberType } from '../schemas/member.schema';

export class MemberInquiryDto {
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page: number = 1;

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit: number = 10;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(MemberType)
    type?: MemberType;
}
