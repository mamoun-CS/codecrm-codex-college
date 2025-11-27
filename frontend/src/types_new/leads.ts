import { LeadStatus, LeadSource, LeadPlatformSource } from './enums';

export interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  status: LeadStatus;
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
  team_id?: number;
  pipeline_id?: number;
  substatus?: string;
  ad_source_id?: string;
  ad_id?: string;
  adset_id?: string;
  form_id?: string;
  lead_id?: string;
  custom_fields: Record<string, any>;
  raw_payload: Record<string, any>;
  raw_payload_snapshot?: Record<string, any>;
  original_created_at?: string;
  ingested_at?: string;
  last_interaction_date?: string;
  transfer_from_user_id?: number;
  transfer_to_user_id?: number;
  transfer_notes?: string;
  transferred_at?: string;
  archived_at?: string;
  archive_reason?: string;
  created_at: string;
  updated_at: string;

  // Relations (forward declarations to avoid circular imports)
  campaign?: {
    id: number;
    name: string;
    description?: string;
    country?: string;
    ad_source_id?: number;
    created_by?: number;
    platform_campaign_id?: string;
    active: boolean;
    budget: number;
    cost_per_lead: number;
    lead_count: number;
    created_at: string;
  };
  owner?: {
    id: number;
    name: string;
    email: string;
    role: string;
    team_id?: number;
    active: boolean;
    created_at: string;
  };
  assignedTo?: {
    id: number;
    name: string;
    email: string;
    role: string;
    team_id?: number;
    active: boolean;
    created_at: string;
  };
  team?: {
    id: number;
    name: string;
    description?: string;
    created_at: string;
  };
  pipeline?: {
    id: number;
    name: string;
  };
}

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  country?: string;
  ad_source_id?: number;
  created_by?: number;
  platform_campaign_id?: string;
  active: boolean;
  budget: number;
  cost_per_lead: number;
  lead_count: number;
  created_at: string;

  // Relations (forward declarations)
  adSource?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
    email: string;
    role: string;
    team_id?: number;
    active: boolean;
    created_at: string;
  };
}

export interface AdSource {
  id: number;
  name: string;
  // Add other fields as needed
}