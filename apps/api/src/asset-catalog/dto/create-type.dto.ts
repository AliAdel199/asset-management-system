import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTypeDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}
