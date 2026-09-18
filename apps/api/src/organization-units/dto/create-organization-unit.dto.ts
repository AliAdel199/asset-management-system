import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrganizationUnitDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  unitType!: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;
}
