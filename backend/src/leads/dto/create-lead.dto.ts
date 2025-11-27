import { IsString, IsOptional, IsEmail, IsEnum, IsNumber, IsObject } from 'class-validator';
import { LeadSource, LeadStatus } from '../../entities/leads.entity';

export class CreateLeadDto {
  @IsString()
  full_name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  substatus?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsNumber()
  campaign_id?: number;

  @IsOptional()
  @IsNumber()
  owner_user_id?: number;

  @IsOptional()
  @IsNumber()
  assigned_to?: number;

  @IsOptional()
  @IsString()
  utm_source?: string;

  @IsOptional()
  @IsString()
  utm_medium?: string;

  @IsOptional()
  @IsString()
  utm_campaign?: string;

  @IsOptional()
  @IsString()
  utm_term?: string;

  @IsOptional()
  @IsString()
  utm_content?: string;

  @IsOptional()
  @IsString()
  external_lead_id?: string;

  @IsOptional()
  @IsString()
  source_reference_id?: string;

  @IsOptional()
  @IsString()
  advertiser_id?: string;

  @IsOptional()
  @IsObject()
  custom_fields?: Record<string, any>;

  @IsOptional()
  @IsObject()
  raw_payload?: Record<string, any>;
}

export class UpdateLeadDto extends CreateLeadDto {
  @IsOptional()
  @IsNumber()
  id?: number;
}

export class LeadResponseDto {
  constructor(data: Partial<LeadResponseDto>) {
    Object.assign(this, data);
  }

  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  status: LeadStatus;
  substatus?: string;
  source: LeadSource;
  campaign_id?: number;
  owner_user_id?: number;
  assigned_to?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  external_lead_id?: string;
  source_reference_id?: string;
  advertiser_id?: string;
  custom_fields: Record<string, any>;
  raw_payload: Record<string, any>;
  original_created_at?: string | Date;
  created_at: string | Date;
  updated_at: string | Date;
}