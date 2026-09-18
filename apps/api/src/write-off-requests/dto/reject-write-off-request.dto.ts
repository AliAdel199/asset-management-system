import { IsOptional, IsString } from 'class-validator';

export class RejectWriteOffRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
