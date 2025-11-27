import api from './api';

const BASE = '/api/integrations/tiktok';

const unwrap = async <T>(promise: Promise<any>): Promise<T> => {
  const response = await promise;
  return (response?.data ?? response) as T;
};

export interface TikTokSettings {
  id?: number;
  user_id?: number;
  advertiser_ids: string[];
  expires_at?: string;
  connected: boolean;
}

export interface TikTokLeadForm {
  id?: string;
  form_id?: string;
  name?: string;
  status?: string;
  created_time?: string;
}

export interface TikTokLeadPreview {
  lead_id?: string;
  form_id?: string;
  phone?: string;
  email?: string;
  full_name?: string;
  created_time?: string;
}

export const tiktokIntegrationAPI = {
  getSettings: (): Promise<TikTokSettings | null> => unwrap(api.get(`${BASE}/status`)),
  getOAuthUrl: (): Promise<{ url: string }> => unwrap(api.get(`${BASE}/oauth-url`)),
  listAdvertisers: (): Promise<{ advertisers: string[] }> => unwrap(api.get(`${BASE}/advertisers`)),
  getForms: (advertiser_id: string): Promise<TikTokLeadForm[]> =>
    unwrap(api.get(`${BASE}/forms`, { params: { advertiser_id } })),
};
