import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
    @IsString() productId: string;
    @IsNumber() quantity: number;
    @IsOptional() @IsString() size?: string;
    @IsOptional() @IsString() color?: string;
    @IsNumber() currentPrice: number;
}

export class CreateOrderDto {
    @IsString() sellerId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsNumber() totalAmount: number;

    @IsOptional() @IsObject() shippingAddress?: Record<string, any>;
}
