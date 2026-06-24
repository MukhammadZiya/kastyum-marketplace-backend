import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class PreparePaymentDto {
    @IsMongoId()
    orderId: string;

    @IsOptional()
    @IsString()
    phone?: string;
}
