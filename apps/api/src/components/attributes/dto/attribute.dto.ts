import { IsOptional, IsString } from 'class-validator';

export class CreateAttributeDto {
    @IsOptional() @IsString() name?: string;
    @IsOptional() @IsString() value?: string;
    @IsOptional() @IsString() hexCode?: string;
    @IsOptional() @IsString() logoUrl?: string;
}
