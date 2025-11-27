import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateLandingPageDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  campaign_id?: number; // ✅ لاحظ: رقم اختياري


  @IsString()
  content: string;

  
}
