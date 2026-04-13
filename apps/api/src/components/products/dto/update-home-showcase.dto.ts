import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsMongoId,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

export class HomeShowcaseSlotInputDto {
    @IsMongoId()
    productId: string;

    @IsOptional()
    @IsString()
    customImage?: string | null;
}

export class UpdateHomeShowcaseDto {
    @IsArray()
    @ArrayMaxSize(8)
    @ValidateNested({ each: true })
    @Type(() => HomeShowcaseSlotInputDto)
    newArrivals: HomeShowcaseSlotInputDto[];

    @IsArray()
    @ArrayMaxSize(8)
    @ValidateNested({ each: true })
    @Type(() => HomeShowcaseSlotInputDto)
    mostPurchased: HomeShowcaseSlotInputDto[];
}
