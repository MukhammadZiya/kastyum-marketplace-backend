import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
    @IsString() productId: string;
    @IsNumber() quantity: number;
    @IsOptional() @IsString() size?: string;
    @IsOptional() @IsString() color?: string;
}

export class CreateOrderDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsOptional() @IsString() shippingAddress?: string;
}
