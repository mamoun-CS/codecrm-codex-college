import axios, { AxiosError, AxiosInstance } from 'axios';
import {
  // Import all new types
  Lead,
  Campaign,
  User,
  Team,
  Pipeline,
  Stage,
  Deal,
  Activity,
  Message,
  File,
  Meeting,
  PriceOffer,
  Integration,
  TikTokIntegration,
  Website,
  LeadSource,
  LeadStatus,
  ActivityType,
  MessageChannel,
  MessageDirection,
  FileType,
  MeetingStatus,
  PriceOfferStatus,
  IntegrationProvider,
  IntegrationStatus,
} from '../types_new';

// Common API types (keeping these for now)
interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Response types using new entity types
interface LeadsResponse extends PaginatedResponse<Lead> {}
interface CampaignsResponse extends PaginatedResponse<Campaign> {}
interface IntegrationsResponse extends PaginatedResponse<Integration> {}

// Form/DTO types (simplified for now - can be expanded later)
interface LeadFormValues {
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  status?: LeadStatus;
  source?: LeadSource;
  campaign_id?: number;
  owner_user_id?: number;
  assigned_to?: number;
  custom_fields?: Record<string, any>;
  raw_payload?: Record<string, any>;
}

interface LeadDTO extends Partial<LeadFormValues> {}

interface CampaignFormValues {
  name: string;
  description?: string;
  country?: string;
  ad_source_id?: number;
  created_by?: number;
  platform_campaign_id?: string;
  active?: boolean;
  budget?: number;
  cost_per_lead?: number;
}

interface CampaignDTO extends Partial<CampaignFormValues> {}

interface IntegrationFormValues {
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
  type?: string;
  status?: IntegrationStatus;
}

interface IntegrationDTO extends Partial<IntegrationFormValues> {}

const getApiBaseUrl = () => {
  if (process.env.BACKEND_URL && process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.BACKEND_URL || 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

export class ApiClientError extends Error {
  status?: number;
  details?: ApiError | string;

  constructor(message: string, status?: number, details?: ApiError | string) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const isBrowser = typeof window !== 'undefined';
let isHandlingUnauthorized = false;

const redirectToLogin = () => {
  if (!isBrowser || isHandlingUnauthorized) return;
  isHandlingUnauthorized = true;
  try {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');
    const path = `${window.location.pathname}${window.location.search ?? ''}`;
    const redirectParam = window.location.pathname.startsWith('/login')
      ? ''
      : `?redirect=${encodeURIComponent(path)}`;
    window.location.href = `/login${redirectParam}`;
  } catch (err) {
    console.error('Failed to redirect after unauthorized response:', err);
    window.location.href = '/login';
  } finally {
    setTimeout(() => {
      isHandlingUnauthorized = false;
    }, 2000);
  }
};

const createAxiosClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
  });

  client.interceptors.request.use((config) => {
    if (isBrowser) {
      const token = window.localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    config.headers.Accept = config.headers.Accept ?? 'application/json';
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      if (error.response?.status === 401) {
        redirectToLogin();
      }
      return Promise.reject(error);
    },
  );

  return client;
};

const client = createAxiosClient();

const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    const payload = axiosError.response?.data;
    const message =
      payload?.message || axiosError.message || 'Unexpected API error occurred';
    throw new ApiClientError(message, axiosError.response?.status, payload);
  }
  throw new ApiClientError('Unexpected error', undefined, String(error));
};

const request = async <T>(promise: Promise<{ data: T }>): Promise<T> => {
  try {
    const { data } = await promise;
    return data;
  } catch (error) {
    return handleApiError(error);
  }
};

/* -------------------------------------------------------------------------- */
/*                                Leads Service                               */
/* -------------------------------------------------------------------------- */

export interface LeadsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  owner?: string;
  campaign_id?: number | string;
  platform_source?: string;
  start_date?: string;
  end_date?: string;
}

const leads = {
  list: (filters?: LeadsFilters) =>
    request<LeadsResponse>(client.get('/api/leads', { params: filters })),
  get: (id: number) => request<Lead>(client.get(`/api/leads/${id}`)),
  create: (payload: LeadFormValues) =>
    request<Lead>(client.post('/api/leads', payload)),
  update: (id: number, payload: LeadDTO) =>
    request<Lead>(client.patch(`/api/leads/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/leads/${id}`)),
  transfer: (payload: { leadId: number; receiverId: number; notes?: string }) =>
    request<ApiResponse<{ success: boolean }>>(client.post('/api/leads/transfer', payload)),
};

/* -------------------------------------------------------------------------- */
/*                             Integrations Service                           */
/* -------------------------------------------------------------------------- */

export interface IntegrationsFilters {
  page?: number;
  limit?: number;
  status?: string;
  platform_type?: string;
  provider?: string;
  search?: string;
}

const integrations = {
  list: (filters?: IntegrationsFilters) =>
    request<IntegrationsResponse>(client.get('/api/integrations', { params: filters })),
  get: (id: number) => request<Integration>(client.get(`/api/integrations/${id}`)),
  create: (payload: IntegrationFormValues) =>
    request<Integration>(client.post('/api/integrations', payload)),
  update: (id: number, payload: IntegrationDTO) =>
    request<Integration>(client.patch(`/api/integrations/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/integrations/${id}`)),
  connectOAuth: (provider: 'facebook' | 'tiktok') =>
    request<ApiResponse<{ url: string }>>(client.post('/api/integrations/connect', { provider })),
  disconnectOAuth: (provider: 'facebook' | 'tiktok') =>
    request<ApiResponse<{ success: boolean }>>(client.post('/api/integrations/disconnect', { provider })),
  triggerSync: (id: number) =>
    request<ApiResponse<{ success: boolean }>>(client.post(`/api/integrations/${id}/sync`)),
};

/* -------------------------------------------------------------------------- */
/*                              Campaigns Service                             */
/* -------------------------------------------------------------------------- */

export interface CampaignFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  platform_type?: string;
}

const campaigns = {
  list: (filters?: CampaignFilters) =>
    request<CampaignsResponse>(client.get('/api/campaigns', { params: filters })),
  get: (id: number) => request<Campaign>(client.get(`/api/campaigns/${id}`)),
  create: (payload: CampaignFormValues) =>
    request<Campaign>(client.post('/api/campaigns', payload)),
  update: (id: number, payload: CampaignDTO) =>
    request<Campaign>(client.patch(`/api/campaigns/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/campaigns/${id}`)),
  analytics: (id: number) =>
    request<ApiResponse<{ roi: number; spend: number; leads: number }>>(client.get(`/api/campaigns/${id}/stats`)),
};

/* -------------------------------------------------------------------------- */
/*                                 Sync Service                               */
/* -------------------------------------------------------------------------- */

export interface SyncPayload {
  platform_type: string;
  leads: LeadFormValues[];
  integration_id?: number;
  batch_id?: string;
  synced_at?: string;
  sync_metadata?: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/*                              Activities Service                            */
/* -------------------------------------------------------------------------- */

export interface ActivitiesFilters {
  page?: number;
  limit?: number;
  lead_id?: number;
  user_id?: number;
  type?: ActivityType;
  start_date?: string;
  end_date?: string;
}

const activities = {
  list: (filters?: ActivitiesFilters) =>
    request<PaginatedResponse<Activity>>(client.get('/api/activities', { params: filters })),
  get: (id: number) => request<Activity>(client.get(`/api/activities/${id}`)),
  create: (payload: { lead_id?: number; user_id?: number; type: ActivityType; content?: string; due_at?: string; done_at?: string }) =>
    request<Activity>(client.post('/api/activities', payload)),
  update: (id: number, payload: { content?: string; due_at?: string; done_at?: string }) =>
    request<Activity>(client.patch(`/api/activities/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/activities/${id}`)),
  markDone: (id: number) => request<ApiResponse<{ success: boolean }>>(client.put(`/api/activities/${id}/status`, { done_at: new Date().toISOString() })),
};

/* -------------------------------------------------------------------------- */
/*                               Messages Service                             */
/* -------------------------------------------------------------------------- */

export interface MessagesFilters {
  page?: number;
  limit?: number;
  lead_id?: number;
  channel?: MessageChannel;
  direction?: MessageDirection;
  start_date?: string;
  end_date?: string;
}

const messages = {
  list: (filters?: MessagesFilters) =>
    request<PaginatedResponse<Message>>(client.get('/api/messages', { params: filters })),
  get: (id: number) => request<Message>(client.get(`/api/messages/${id}`)),
  create: (payload: { lead_id?: number; channel: MessageChannel; direction: MessageDirection; body: string; external_id?: string }) =>
    request<Message>(client.post('/api/messages', payload)),
  sendEmail: (payload: { lead_id: number; subject: string; body: string }) =>
    request<ApiResponse<{ success: boolean }>>(client.post('/api/messages/send-email', payload)),
};

/* -------------------------------------------------------------------------- */
/*                                Deals Service                               */
/* -------------------------------------------------------------------------- */

export interface DealsFilters {
  page?: number;
  limit?: number;
  lead_id?: number;
  pipeline_id?: number;
  stage_id?: number;
  won?: boolean;
  start_date?: string;
  end_date?: string;
}

const deals = {
  list: (filters?: DealsFilters) =>
    request<PaginatedResponse<Deal>>(client.get('/api/deals', { params: filters })),
  get: (id: number) => request<Deal>(client.get(`/api/deals/${id}`)),
  create: (payload: { lead_id?: number; pipeline_id?: number; stage_id?: number; amount?: number; currency?: string; expected_close_date?: string }) =>
    request<Deal>(client.post('/api/deals', payload)),
  update: (id: number, payload: { stage_id?: number; amount?: number; currency?: string; expected_close_date?: string; won?: boolean; lost_reason?: string }) =>
    request<Deal>(client.patch(`/api/deals/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/deals/${id}`)),
};

/* -------------------------------------------------------------------------- */
/*                              Pipelines Service                             */
/* -------------------------------------------------------------------------- */

const pipelines = {
  list: () => request<Pipeline[]>(client.get('/api/pipelines')),
  get: (id: number) => request<Pipeline>(client.get(`/api/pipelines/${id}`)),
  create: (payload: { name: string }) => request<Pipeline>(client.post('/api/pipelines', payload)),
  update: (id: number, payload: { name: string }) => request<Pipeline>(client.patch(`/api/pipelines/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/pipelines/${id}`)),
  getStages: (id: number) => request<Stage[]>(client.get(`/api/pipelines/${id}/stages`)),
};

/* -------------------------------------------------------------------------- */
/*                                Files Service                               */
/* -------------------------------------------------------------------------- */

export interface FilesFilters {
  page?: number;
  limit?: number;
  lead_id?: number;
  uploaded_by?: number;
  type?: FileType;
  start_date?: string;
  end_date?: string;
}

const files = {
  list: (filters?: FilesFilters) =>
    request<PaginatedResponse<File>>(client.get('/api/files', { params: filters })),
  get: (id: number) => request<File>(client.get(`/api/files/${id}`)),
  upload: (formData: FormData) =>
    request<File>(client.post('/api/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/files/${id}`)),
};

/* -------------------------------------------------------------------------- */
/*                               Meetings Service                             */
/* -------------------------------------------------------------------------- */

export interface MeetingsFilters {
  page?: number;
  limit?: number;
  lead_id?: number;
  created_by?: number;
  status?: MeetingStatus;
  start_date?: string;
  end_date?: string;
}

const meetings = {
  list: (filters?: MeetingsFilters) =>
    request<PaginatedResponse<Meeting>>(client.get('/api/meetings', { params: filters })),
  get: (id: number) => request<Meeting>(client.get(`/api/meetings/${id}`)),
  create: (payload: { lead_id?: number; title: string; date: string; duration?: number; location?: string; participants?: string; notes?: string }) =>
    request<Meeting>(client.post('/api/meetings', payload)),
  update: (id: number, payload: { title?: string; date?: string; duration?: number; location?: string; participants?: string; notes?: string; status?: MeetingStatus }) =>
    request<Meeting>(client.patch(`/api/meetings/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/meetings/${id}`)),
};

/* -------------------------------------------------------------------------- */
/*                             Price Offers Service                           */
/* -------------------------------------------------------------------------- */

export interface PriceOffersFilters {
  page?: number;
  limit?: number;
  lead_id?: number;
  created_by?: number;
  status?: PriceOfferStatus;
  start_date?: string;
  end_date?: string;
}

const priceOffers = {
  list: (filters?: PriceOffersFilters) =>
    request<PaginatedResponse<PriceOffer>>(client.get('/api/price-offers', { params: filters })),
  get: (id: number) => request<PriceOffer>(client.get(`/api/price-offers/${id}`)),
  create: (payload: { lead_id?: number; title: string; amount: number; currency?: string; description?: string; valid_until?: string }) =>
    request<PriceOffer>(client.post('/api/price-offers', payload)),
  update: (id: number, payload: { title?: string; amount?: number; currency?: string; description?: string; valid_until?: string; status?: PriceOfferStatus }) =>
    request<PriceOffer>(client.patch(`/api/price-offers/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/price-offers/${id}`)),
};

/* -------------------------------------------------------------------------- */
/*                                Users Service                               */
/* -------------------------------------------------------------------------- */

const users = {
  list: () => request<User[]>(client.get('/api/users')),
  get: (id: number) => request<User>(client.get(`/api/users/${id}`)),
  create: (payload: { name: string; email: string; password_hash: string; role: string; team_id?: number }) =>
    request<User>(client.post('/api/users', payload)),
  update: (id: number, payload: { name?: string; email?: string; role?: string; team_id?: number; active?: boolean }) =>
    request<User>(client.patch(`/api/users/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/users/${id}`)),
  updateRole: (id: number, role: string) => request<ApiResponse<{ success: boolean }>>(client.put(`/api/users/${id}/role`, { role })),
};

/* -------------------------------------------------------------------------- */
/*                                Teams Service                               */
/* -------------------------------------------------------------------------- */

const teams = {
  list: () => request<Team[]>(client.get('/api/teams')),
  get: (id: number) => request<Team>(client.get(`/api/teams/${id}`)),
  create: (payload: { name: string; description?: string }) => request<Team>(client.post('/api/teams', payload)),
  update: (id: number, payload: { name?: string; description?: string }) => request<Team>(client.patch(`/api/teams/${id}`, payload)),
  remove: (id: number) => request<ApiResponse<{ success: boolean }>>(client.delete(`/api/teams/${id}`)),
};

const sync = {
  leads: (payload: SyncPayload) =>
    request<ApiResponse<{ processed: number }>>(client.post('/api/sync/leads', payload)),
  triggerAuto: () =>
    request<ApiResponse<{ success: boolean }>>(client.post('/api/sync/leads/auto')),
};

export const crmApi = {
  leads,
  integrations,
  campaigns,
  activities,
  messages,
  deals,
  pipelines,
  files,
  meetings,
  priceOffers,
  users,
  teams,
  sync,
  client,
};

export default crmApi;

