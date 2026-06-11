import { Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { ProductStatus, TargetAudience } from '../schemas/product.schema';
import { ProductVariantStockLineInputDto } from './create-product.dto';

function emptyToUndefined({ value }: { value: unknown }) {
    if (value === '' || value === undefined || value === null) return undefined;
    return value;
}

function optionalBoolFromForm({ value }: { value: unknown }): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    if (typeof value === 'string') {
        const v = value.toLowerCase().trim();
        if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
        if (v === 'false' || v === '0' || v === 'no') return false;
    }
    return undefined;
}

function parseIdArray({ value }: { value: unknown }): string[] | undefined {
    if (value == null || value === '') return undefined;
    if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
    }
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
                return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
            }
        } catch {
            return undefined;
        }
    }
    return undefined;
}

/**
 * Parse multipart `variantStock` (JSON string or array) into real
 * `ProductVariantStockLineInputDto` instances. Returning instances (not plain objects)
 * is required so that `ValidationPipe({ whitelist: true })` doesn't strip every
 * property off the rows — see note in `create-product.dto.ts`.
 */
function parseVariantStockJson({ value }: { value: unknown }) {
    if (value == null || value === '') return undefined;
    let arr: unknown = value;
    if (typeof value === 'string') {
        try {
            arr = JSON.parse(value);
        } catch {
            return undefined;
        }
    }
    if (!Array.isArray(arr)) return undefined;
    return arr.map((row: any) => {
        const inst = new ProductVariantStockLineInputDto();
        if (typeof row?.sizeId === 'string' && row.sizeId.trim()) {
            inst.sizeId = row.sizeId.trim();
        }
        if (typeof row?.colorId === 'string' && row.colorId.trim()) {
            inst.colorId = row.colorId.trim();
        }
        const n = Number(row?.quantity);
        inst.quantity = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : (NaN as unknown as number);
        return inst;
    });
}

export class AdminCreateProductFormDto {
    @IsMongoId()
    sellerId: string;

    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsString()
    modelNumber?: string;

    @IsEnum(TargetAudience)
    audience: TargetAudience;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    price: number;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === '' || value === undefined || value === null) return undefined;
        const n = Number(value);
        return Number.isNaN(n) ? undefined : n;
    })
    @IsNumber()
    @Min(0)
    listPrice?: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    stockCount: number;

    @IsOptional()
    @Transform(parseIdArray)
    @IsArray()
    @IsMongoId({ each: true })
    colorIds?: string[];

    @IsOptional()
    @Transform(parseIdArray)
    @IsArray()
    @IsMongoId({ each: true })
    sizeIds?: string[];

    /** JSON array: { sizeId?, colorId?, quantity }[] — required when sizeIds or colorIds are set. */
    @IsOptional()
    @Transform(parseVariantStockJson)
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductVariantStockLineInputDto)
    variantStock?: ProductVariantStockLineInputDto[];

    @IsOptional()
    @Transform(emptyToUndefined)
    @IsMongoId()
    brand?: string;

    @IsOptional()
    @Transform(emptyToUndefined)
    @IsMongoId()
    material?: string;

    @IsOptional()
    @Transform(emptyToUndefined)
    @IsMongoId()
    style?: string;

    @IsOptional()
    @IsEnum(ProductStatus)
    status?: ProductStatus;

    /** When true, append this product to the storefront “new arrivals” home block (if not full / not duplicate). */
    @IsOptional()
    @Transform(optionalBoolFromForm)
    @IsBoolean()
    homeShowcaseNewArrivals?: boolean;

    /** When true, append to the “most purchased / favorites” home block. */
    @IsOptional()
    @Transform(optionalBoolFromForm)
    @IsBoolean()
    homeShowcaseMostPurchased?: boolean;
}
