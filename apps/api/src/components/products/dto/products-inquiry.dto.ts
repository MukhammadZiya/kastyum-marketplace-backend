import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductsInquiryDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit: number = 10;

    @IsOptional()
    @IsString()
    brand?: string;

    @IsOptional()
    @IsString()
    material?: string;

    @IsOptional()
    @IsString()
    fit?: string;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsString()
    size?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    maxPrice?: number;
}
