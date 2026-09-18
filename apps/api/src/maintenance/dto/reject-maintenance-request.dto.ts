import { IsOptional, IsString } from 'class-validator';

export class RejectMaintenanceRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
