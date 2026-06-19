import { IsMongoId } from 'class-validator';

export class PreparePaymentDto {
    @IsMongoId()
    orderId: string;
}
