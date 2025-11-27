export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}

import { LeadSource } from '../../entities/leads.entity';
import { LeadResponseDto } from './create-lead.dto';

export interface LeadListItem {
  id: number;
  name: string;
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  language?: string;
  source?: LeadSource;
  status: string;
  created_at: Date;
  updated_at?: Date;
  owner_user_id?: number;
  campaign?: { id: number; name?: string };
  owner?: { id: number; name?: string };
}

export interface PaginatedLeadsResponse {
  data: LeadListItem[];
  leads: LeadListItem[];
  meta: PaginatedMeta;
}
