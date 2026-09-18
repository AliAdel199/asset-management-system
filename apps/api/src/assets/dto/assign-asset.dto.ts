import { IsOptional, IsString } from 'class-validator';

export class AssignAssetDto {
  @IsOptional()
  @IsString()
  toEmployeeId?: string | null;

  @IsOptional()
  @IsString()
  toOrganizationUnitId?: string | null;

  @IsOptional()
  @IsString()
  documentNumber?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
