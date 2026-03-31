import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, TargetAudience } from '../schemas/product.schema';

export class CreateProductDto {
    @IsString() title: string;
    @IsString() description: string;
    @IsString() modelNumber: string;
    @IsEnum(TargetAudience) audience: TargetAudience;

    @Type(() => Number)
    @IsNumber() price: number;

    @IsOptional() @IsArray() @IsString({ each: true }) colors?: string[];
    @IsOptional() @IsArray() @IsString({ each: true }) sizes?: string[];
    @IsOptional() @IsString() brand?: string;
    @IsOptional() @IsString() material?: string;
    @IsOptional() @IsString() fit?: string;
    @IsOptional() @IsString() style?: string;
    @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];

    @Type(() => Number)
    @IsNumber() stockCount: number;

    @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
