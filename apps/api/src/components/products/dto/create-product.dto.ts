import { Transform, Type } from 'class-transformer';
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

export class I18nTextDto {
    @IsOptional() @IsString() uz?: string;
    @IsOptional() @IsString() ru?: string;
    @IsOptional() @IsString() en?: string;
    @IsOptional() @IsString() kk?: string;
}

export class GuaranteeTermsDto {
    @IsOptional() @IsString() uz?: string;
    @IsOptional() @IsString() ru?: string;
    @IsOptional() @IsString() en?: string;
    @IsOptional() @IsString() kk?: string;
}

export class GuaranteeDto {
    @IsOptional() @IsString() duration?: string;
    @IsOptional() @ValidateNested() @Type(() => GuaranteeTermsDto) terms?: GuaranteeTermsDto;
}

export class ProductDimensionsDto {
    @IsOptional() @Type(() => Number) @IsNumber() @Min(0) length?: number;
    @IsOptional() @Type(() => Number) @IsNumber() @Min(0) width?: number;
    @IsOptional() @Type(() => Number) @IsNumber() @Min(0) height?: number;
}

export class CustomAttributeLineDto {
    @IsString() key: string;
    @IsString() value: string;
}

function parseJsonField<T>(value: unknown): T | undefined {
    if (value == null || value === '') return undefined;
    if (typeof value === 'object') return value as T;
    if (typeof value === 'string') {
        try { return JSON.parse(value) as T; } catch { return undefined; }
    }
    return undefined;
}

function emptyToUndefined({ value }: { value: unknown }) {
    if (value === '' || value === undefined || value === null) return undefined;
    return value;
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

export class ProductVariantStockLineInputDto {
    @IsOptional() @IsMongoId() sizeId?: string;
    @IsOptional() @IsMongoId() colorId?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    quantity: number;
}

/**
 * Parse the multipart `variantStock` field (JSON string or already-array) into real
 * `ProductVariantStockLineInputDto` instances.
 *
 * Returning instances (not plain objects) is required: `class-transformer@0.5.1` does NOT
 * apply the sibling `@Type(() => ProductVariantStockLineInputDto)` recursion when this
 * `@Transform` returns a brand-new value, and `ValidationPipe({ whitelist: true })` would
 * then strip every property off the plain rows (so `quantity` would arrive as `undefined`
 * in the service).
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

export class CreateProductDto {
    @IsString() title: string;
    @IsString() description: string;
    @IsOptional() @IsString() modelNumber?: string;
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

    @IsOptional()
    @Transform(parseIdArray)
    @IsArray()
    @IsMongoId({ each: true })
    colors?: string[];

    @IsOptional()
    @Transform(parseIdArray)
    @IsArray()
    @IsMongoId({ each: true })
    sizes?: string[];

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
    @Transform(emptyToUndefined)
    @IsMongoId()
    category?: string;

    @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    stockCount?: number;

    @IsOptional()
    @Transform(parseVariantStockJson)
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductVariantStockLineInputDto)
    variantStock?: ProductVariantStockLineInputDto[];

    @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;

    @IsOptional()
    @Transform(({ value }) => parseJsonField<I18nTextDto>(value))
    @ValidateNested()
    @Type(() => I18nTextDto)
    titleI18n?: I18nTextDto;

    @IsOptional()
    @Transform(({ value }) => parseJsonField<I18nTextDto>(value))
    @ValidateNested()
    @Type(() => I18nTextDto)
    descriptionI18n?: I18nTextDto;

    @IsOptional()
    @Transform(({ value }) => parseJsonField<I18nTextDto>(value))
    @ValidateNested()
    @Type(() => I18nTextDto)
    careInstructions?: I18nTextDto;

    @IsOptional()
    @Transform(({ value }) => parseJsonField<GuaranteeDto>(value))
    @ValidateNested()
    @Type(() => GuaranteeDto)
    guarantee?: GuaranteeDto;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    weight?: number;

    @IsOptional()
    @Transform(({ value }) => parseJsonField<ProductDimensionsDto>(value))
    @ValidateNested()
    @Type(() => ProductDimensionsDto)
    dimensions?: ProductDimensionsDto;

    @IsOptional()
    @Transform(({ value }) => parseJsonField<CustomAttributeLineDto[]>(value))
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomAttributeLineDto)
    customAttributes?: CustomAttributeLineDto[];
}
