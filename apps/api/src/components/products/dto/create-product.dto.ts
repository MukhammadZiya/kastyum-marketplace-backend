import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ProductStatus } from '../schemas/product.schema';

export class CreateProductDto {
    @IsString() title: string;
    @IsString() description: string;
    @IsNumber() price: number;
    @IsOptional() @IsString() currency?: string;
    @IsOptional() @IsArray() @IsString({ each: true }) colors?: string[];
    @IsOptional() @IsArray() @IsString({ each: true }) sizes?: string[];
    @IsOptional() @IsString() brand?: string;
    @IsOptional() @IsString() material?: string;
    @IsOptional() @IsString() fit?: string;
    @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
    @IsNumber() stockCount: number;
    @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
