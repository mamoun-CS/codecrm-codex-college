import { ActivityType, LeadTouchpointEvent } from './enums';

export interface Activity {
  id: number;
  lead_id?: number;
  user_id?: number;
  type: ActivityType;
  content?: string;
  due_at?: string;
  done_at?: string;
  created_at: string;

  // Relations (forward declarations)
  lead?: {
    id: number;
    full_name: string;
    phone?: string;
    email?: string;
    status: string;
    source: string;
  };
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface LeadTouchpoint {
  id: number;
  lead_id?: number;
  campaign_id?: number;
  event_type: LeadTouchpointEvent;
  campaign_name?: string;
  ip_address?: string;
  country?: string;
  user_agent?: string;
  additional_data?: Record<string, any>;
  created_at: string;

  // Relations (forward declarations)
  lead?: {
    id: number;
    full_name: string;
    phone?: string;
    email?: string;
    status: string;
    source: string;
  };
  campaign?: {
    id: number;
    name: string;
    active: boolean;
  };
}

// Forward declarations to avoid circular dependencies