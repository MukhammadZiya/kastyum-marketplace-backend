import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export class UploadHomeSlotImageDto {
    @IsIn(['newArrivals', 'mostPurchased'])
    section: 'newArrivals' | 'mostPurchased';

    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(7)
    index: number;
}
