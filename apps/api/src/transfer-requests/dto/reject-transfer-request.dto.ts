import { IsOptional, IsString } from 'class-validator';

export class RejectTransferRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
