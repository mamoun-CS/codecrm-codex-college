import { IsOptional, IsString, IsBoolean, IsArray, IsObject, IsNumber } from 'class-validator';

export class UpdateLandingPageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  sections?: any[];

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  campaign_id?: number;
}
