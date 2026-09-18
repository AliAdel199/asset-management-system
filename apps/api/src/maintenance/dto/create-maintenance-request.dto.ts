import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMaintenanceRequestDto {
  @IsString()
  @MinLength(1)
  assetId!: string;

  @IsString()
  @MinLength(1)
  maintenanceTypeId!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  cost?: string | number | null;
}
