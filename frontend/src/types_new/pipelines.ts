export interface Pipeline {
  id: number;
  name: string;

  // Relations
  stages?: Stage[];
}

export interface Stage {
  id: number;
  pipeline_id?: number;
  name: string;
  order: number;

  // Relations
  pipeline?: Pipeline;
  deals?: Deal[];
}

export interface Deal {
  id: number;
  lead_id?: number;
  pipeline_id?: number;
  stage_id?: number;
  amount?: number;
  currency?: string;
  expected_close_date?: string;
  won: boolean;
  lost_reason?: string;

  // Relations
  lead?: Lead;
  pipeline?: Pipeline;
  stage?: Stage;
}

// Import Lead to avoid circular dependency issues
import { Lead } from './leads';