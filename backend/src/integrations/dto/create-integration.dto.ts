import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import {
  IntegrationProvider,
  IntegrationStatus,
  IntegrationType,
} from '../../entities/integrations.entity';

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

const toArray = ({ value }: { value: any }) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
};

export class CreateIntegrationDto {
  @ApiProperty({ example: 'Meta Ads - Primary' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: IntegrationType,
    example: IntegrationType.OAUTH,
  })
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @ApiPropertyOptional({
    enum: IntegrationProvider,
    example: IntegrationProvider.META,
  })
  @IsOptional()
  @IsEnum(IntegrationProvider)
  provider?: IntegrationProvider;

  @ApiProperty({
    enum: IntegrationProvider,
    example: IntegrationProvider.META,
  })
  @IsEnum(IntegrationProvider)
  @IsOptional()
  platform_type?: IntegrationProvider;

  @ApiPropertyOptional({
    enum: IntegrationStatus,
    example: IntegrationStatus.CONNECTED,
  })
  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @ApiPropertyOptional({ example: 'meta-primary' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'https://graph.facebook.com' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: 'https://webhook.crm.com/meta' })
  @IsOptional()
  @IsUrl()
  webhook_url?: string;

  @ApiPropertyOptional({ example: 'https://graph.facebook.com/leadgen' })
  @IsOptional()
  @IsUrl()
  endpoint_url?: string;

  @ApiPropertyOptional({ example: 'act_1234567890' })
  @IsOptional()
  @IsString()
  account_id?: string;

  @ApiPropertyOptional({ example: 'EAAG...' })
  @IsOptional()
  @IsString()
  access_token?: string;

  @ApiPropertyOptional({ example: 'EAAG_REFRESH...' })
  @IsOptional()
  @IsString()
  refresh_token?: string;

  @ApiPropertyOptional({ example: 'token_xyz' })
  @IsOptional()
  @IsString()
  auth_token?: string;

  @ApiPropertyOptional({ example: 'key_12345' })
  @IsOptional()
  @IsString()
  api_key?: string;

  @ApiPropertyOptional({ example: 'auto_key_98765' })
  @IsOptional()
  @IsString()
  generated_api_key?: string;

  @ApiPropertyOptional({ example: '123456789012345' })
  @IsOptional()
  @IsString()
  page_id?: string;

  @ApiPropertyOptional({ example: 'My Meta Page' })
  @IsOptional()
  @IsString()
  page_name?: string;

  @ApiPropertyOptional({ example: 'EAAG_PAGE...' })
  @IsOptional()
  @IsString()
  page_access_token?: string;

  @ApiPropertyOptional({ example: 'EAAG_USER...' })
  @IsOptional()
  @IsString()
  user_access_token?: string;

  @ApiPropertyOptional({
    example: ['leads', 'reports', 'offline_access'],
    type: [String],
    description: 'OAuth scopes as array or comma-separated string'
  })
  @IsOptional()
  scopes?: string | string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { appId: '123', appSecret: '***' },
  })
  @Transform(toJson)
  @IsOptional()
  @IsObject()
  connection_config?: Record<string, any>;

  @ApiPropertyOptional({
    type: [String],
    example: ['1234567890', '9876543210'],
  })
  @Transform(toArray)
  @IsOptional()
  @IsArray()
  advertiser_ids?: string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { forms: [{ id: '1', name: 'Lead Gen Form' }] },
  })
  @Transform(toJson)
  @IsOptional()
  @IsObject()
  forms_data?: Record<string, any>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { connected_by: 'automation' },
  })
  @Transform(toJson)
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { lastSyncStatus: 'ok' },
  })
  @Transform(toJson)
  @IsOptional()
  @IsObject()
  extra?: Record<string, any>;
}

