import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class MaintenanceMaterialDto {
  @IsOptional()
  @IsString()
  materialName?: string | null;

  @IsOptional()
  quantity?: string | number | null;

  @IsOptional()
  unitCost?: string | number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateMaintenanceStatusDto {
  @IsIn(['COMPLETED', 'CANCELLED'])
  status!: string;

  @IsOptional()
  cost?: string | number | null;

  @IsOptional()
  @IsString()
  finalAssetStatusId?: string | null;

  @IsOptional()
  @IsString()
  resultNotes?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaintenanceMaterialDto)
  materials?: MaintenanceMaterialDto[];
}
