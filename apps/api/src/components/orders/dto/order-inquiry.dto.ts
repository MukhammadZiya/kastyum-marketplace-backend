import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../schemas/order.schema';

export class OrderInquiryDto {
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page: number = 1;

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit: number = 10;

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
}
