import { IsOptional, IsString, MinLength } from 'class-validator';

export class AddAssetAttachmentDto {
  @IsString()
  @MinLength(1)
  attachmentType!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
