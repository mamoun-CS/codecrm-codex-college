import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { IntegrationProvider } from '../../entities/integrations.entity';
import { CreateLeadDto } from './create-lead.dto';

export class SyncLeadsDto {
  @ApiProperty({
    enum: IntegrationProvider,
    example: IntegrationProvider.META,
  })
  @IsString()
  platform_type: string;

  @ApiProperty({
    type: [CreateLeadDto],
    description: 'Array of normalized leads fetched from the integration',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLeadDto)
  leads: CreateLeadDto[];

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  integration_id?: number;

  @ApiPropertyOptional({
    example: 'batch_2024_03_21T10_00_00Z',
    description: 'External batch identifier to make the sync idempotent',
  })
  @IsOptional()
  @IsString()
  batch_id?: string;

  @ApiPropertyOptional({
    example: '2024-03-21T10:00:00.000Z',
    format: 'date-time',
    description: 'Timestamp supplied by the integration',
  })
  @IsOptional()
  @IsDateString()
  synced_at?: string;

  @ApiPropertyOptional({
    type: 'object',
    example: { cursor: 'MjAyNC0wMy0yMVQxMDowMDowMFo=' },
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  sync_metadata?: Record<string, any>;
}

