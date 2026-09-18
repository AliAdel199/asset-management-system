import { IsOptional, IsString, MinLength } from 'class-validator';

export class ChangeAssetStatusDto {
  @IsString()
  @MinLength(1)
  statusId!: string;

  @IsOptional()
  @IsString()
  documentNumber?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
