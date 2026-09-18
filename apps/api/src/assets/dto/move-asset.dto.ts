import { IsOptional, IsString, MinLength } from 'class-validator';

export class MoveAssetDto {
  @IsString()
  @MinLength(1)
  toOrganizationUnitId!: string;

  @IsOptional()
  @IsString()
  documentNumber?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
