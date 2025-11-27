import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CampaignPlatformType } from '../../entities/campaigns.entity';

export enum CampaignLifecycleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

const toJson = ({ value }: { value: any }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const toBoolean = ({ value }: { value: any }) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
};

export class CreateCampaignDto {
  @ApiProperty({ example: 'Spring Meta Campaign' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Primary campaign for spring launch' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  ad_source_id: number;

  @ApiPropertyOptional({ example: 'cmp_12345' })
  @IsOptional()
  @IsString()
  platform_campaign_id?: string;

  @ApiPropertyOptional({
    enum: CampaignPlatformType,
    example: CampaignPlatformType.META,
  })
  @IsOptional()
  @IsEnum(CampaignPlatformType)
  platform_type?: CampaignPlatformType;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { objective: 'LEAD_GENERATION' },
  })
  @IsOptional()
  @Transform(toJson)
  @IsObject()
  platform_campaign_data?: Record<string, any>;

  @ApiPropertyOptional({ example: 'Israel' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ example: 1250 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total_spent?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost_per_lead?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lead_count?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  conversion_count?: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  conversion_rate?: number;

  @ApiPropertyOptional({ example: 'facebook' })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/ads/123' })
  @IsOptional()
  @IsString()
  channel_url?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { budgetOptimized: true },
  })
  @IsOptional()
  @Transform(toJson)
  @IsObject()
  channel_metadata?: Record<string, any>;

  @ApiPropertyOptional({
    enum: CampaignLifecycleStatus,
    example: CampaignLifecycleStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CampaignLifecycleStatus)
  status?: CampaignLifecycleStatus;

  @ApiPropertyOptional({
    example: '2024-03-01T09:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    example: '2024-04-01T09:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class ListCampaignsDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 25 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsPositive()
  limit?: number = 25;

  @ApiPropertyOptional({
    enum: CampaignLifecycleStatus,
    example: CampaignLifecycleStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CampaignLifecycleStatus)
  status?: CampaignLifecycleStatus;

  @ApiPropertyOptional({
    enum: CampaignPlatformType,
    example: CampaignPlatformType.GOOGLE,
  })
  @IsOptional()
  @IsEnum(CampaignPlatformType)
  platform_type?: CampaignPlatformType;

  @ApiPropertyOptional({ example: 'spring' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true })
  @Transform(toBoolean)
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

