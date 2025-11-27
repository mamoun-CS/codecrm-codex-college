import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const normalizeString = ({ value }: { value?: string }) =>
  typeof value === 'string' ? value.trim() : undefined;

export class GetLeadsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(100)
  @IsOptional()
  limit = 25;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  status?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  source?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  platform_source?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  campaign_id?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  owner_user_id?: number;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  owner?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  language?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  search?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  country?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  startDate?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  endDate?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  start_date?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  end_date?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  email?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  phone?: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeUnassigned?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  useCache: boolean = true;

  @Transform(normalizeString)
  @IsOptional()
  @IsIn(['created_at', 'status', 'full_name'])
  sortBy?: 'created_at' | 'status' | 'full_name';

  @Transform(normalizeString)
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
