import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { ProductStatus, TargetAudience } from '../schemas/product.schema';

export class ProductVariantStockLineInputDto {
    @IsOptional() @IsMongoId() sizeId?: string;
    @IsOptional() @IsMongoId() colorId?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    quantity: number;
}

export class CreateProductDto {
    @IsString() title: string;
    @IsString() description: string;
    @IsString() modelNumber: string;
    @IsEnum(TargetAudience) audience: TargetAudience;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    listPrice?: number;

    @IsOptional() @IsArray() @IsString({ each: true }) colors?: string[];
    @IsOptional() @IsArray() @IsString({ each: true }) sizes?: string[];
    @IsOptional() @IsString() brand?: string;
    @IsOptional() @IsString() material?: string;
    @IsOptional() @IsString() fit?: string;
    @IsOptional() @IsString() style?: string;
    @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    stockCount: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductVariantStockLineInputDto)
    variantStock?: ProductVariantStockLineInputDto[];

    @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
}
