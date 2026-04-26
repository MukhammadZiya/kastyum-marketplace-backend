import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Min, IsString } from 'class-validator';

export class NotificationInquiryDto {
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page: number = 1;

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit: number = 10;

    @IsOptional()
    @IsIn(['true', 'false'])
    isRead?: string;

    @IsOptional()
    @IsString()
    receiverId?: string;
}
