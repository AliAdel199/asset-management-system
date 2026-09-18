import { IsOptional, IsString, MinLength } from 'class-validator';

export class DeactivateAssetDto {
  @IsString()
  @MinLength(1)
  documentNumber!: string;

  @IsOptional()
  @IsString()
  reason?: string | null;
}
