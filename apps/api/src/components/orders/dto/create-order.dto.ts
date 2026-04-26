import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
    @IsString() productId: string;
    @IsNumber() quantity: number;
    @IsOptional() @IsString() size?: string;
    @IsOptional() @IsString() color?: string;
    /** Used with variant inventory (sizes / colors on the product). */
    @IsOptional() @IsMongoId() sizeId?: string;
    @IsOptional() @IsMongoId() colorId?: string;
}

export class CreateOrderDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @IsOptional() @IsString() shippingAddress?: string;
}
