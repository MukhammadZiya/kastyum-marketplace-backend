import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAttributeDto {
    @IsNotEmpty() @IsString() name: string;
    @IsOptional() @IsString() hexCode?: string;
    @IsOptional() @IsString() logoUrl?: string;
    @IsOptional() @IsString() code?: string;
}
