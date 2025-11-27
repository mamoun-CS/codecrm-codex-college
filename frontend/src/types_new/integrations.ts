import {
  IntegrationProvider,
  IntegrationType,
  IntegrationStatus,
  WebhookStatus,
  IntegrationPlatformType
} from './enums';

export interface Integration {
  id: number;
  provider: IntegrationProvider;
  name?: string;
  slug?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  page_id?: string;
  page_name?: string;
  account_id?: string;
  webhook_url?: string;
  webhook_config?: any;
  extra?: any;
  connected_at?: string;
  created_by?: number;
  user_id?: number;
  type?: IntegrationType;
  status: IntegrationStatus;
  page_access_token?: string;
  user_access_token?: string;
  auth_token?: string;
  url?: string;
  endpoint_url?: string;
  scopes?: string;
  leads_count?: number;
  platform_type?: IntegrationPlatformType;
  webhook_status?: WebhookStatus;
  updated_at?: string;
  created_at: string;

  // Relations (forward declaration)
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface TikTokIntegration {
  id: number;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  user_id?: number;
  advertiser_ids?: string[];
  app_id?: string;
  secret?: string;
  active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;

  // Relations (forward declaration)
  creator?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface Website {
  id: number;
  name: string;
  url?: string;
  api_key?: string;
  auth_token?: string;
  endpoint_url?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;

  // Relations (forward declaration)
  creator?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}
