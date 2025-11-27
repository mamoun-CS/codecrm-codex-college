import axios from 'axios';

// Determine API base URL based on environment and current protocol
const getApiBaseUrl = () => {
  // In production or when explicitly set, use the environment variable
  if (process.env.BACKEND_URL && process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_URL;
  }

  // Use the API URL as configured, including protocol
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Fallback for server-side rendering
  return process.env.BACKEND_URL || 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const isBrowser = typeof window !== 'undefined';
let isHandlingUnauthorized = false;

const redirectToLogin = () => {
  if (!isBrowser || isHandlingUnauthorized) {
    return;
  }

  isHandlingUnauthorized = true;
  try {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('user');

    const currentPath = `${window.location.pathname}${window.location.search ?? ''}`;
    const redirectParam = window.location.pathname.startsWith('/login')
      ? ''
      : `?redirect=${encodeURIComponent(currentPath)}`;

    window.location.href = `/login${redirectParam}`;
  } catch (err) {
    console.error('Failed to redirect after unauthorized response:', err);
    window.location.href = '/login';
  } finally {
    setTimeout(() => {
      isHandlingUnauthorized = false;
    }, 3000);
  }
};

api.interceptors.request.use((config) => {
  if (isBrowser) {
    const token = window.localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  config.headers.Accept = config.headers.Accept ?? 'application/json';
  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      redirectToLogin();
    }

    // Enhanced error handling
    const errorMessage = error.response?.data?.message ||
                        error.response?.data?.error ||
                        error.message ||
                        'An unexpected error occurred';

    // Log errors for debugging
    console.error('API Error:', {
      status: error.response?.status,
      message: errorMessage,
      url: error.config?.url,
      method: error.config?.method
    });

    return Promise.reject({
      ...error,
      message: errorMessage,
      status: error.response?.status
    });
  }
);

export const authAPI = {
  login: (data: { email: string; password: string }) => api.post('/api/auth/login', data),
  register: (data: any) => api.post('/api/auth/register', data),
};

export const usersAPI = {
  getUsers: () => api.get('/api/users'),
  updateUserRole: (id: number, role: string) => api.put(`/api/users/${id}/role`, { role }),
  deleteUser: (id: number) => api.delete(`/api/users/${id}`),
  getAllowedRoles: () => api.get('/api/users/allowed-roles'),
  getTransferrableUsers: () => api.get('/api/users/transferrable-users'),
  createUser: (data: any) => api.post('/api/users/create', data),
  getSubUsers: () => api.get('/api/users/sub-users'),
  updateUser: (id: number, data: any) => api.put(`/api/users/${id}`, data),
};

export const dashboardAPI = {
  getAdminDashboard: (userId: number) => api.get(`/api/dashboard/admin/${userId}`),
  getManagerDashboard: (userId: number) => api.get(`/api/dashboard/manager/${userId}`),
  getSalesDashboard: (userId: number) => api.get(`/api/dashboard/sales/${userId}`),
  getMarketingDashboard: (userId: number) => api.get(`/api/dashboard/marketing/${userId}`),
  getStaleLeads: () => api.get('/api/dashboard/stale-leads'),
};

export const leadsAPI = {
  getLeads: (filters?: any) => api.get('/api/leads', { params: filters }),
  getLead: (id: number) => api.get(`/api/leads/${id}`),
  getLeadStats: () => api.get('/api/leads/stats'),
  createLead: (data: any) => api.post('/api/leads', data),
  updateLead: (id: number, data: any) => api.patch(`/api/leads/${id}`, data),
  updateLeadStatus: (id: number, data: { status: string; substatus?: string | null }) => api.patch(`/api/leads/${id}/status`, data),
  deleteLead: (id: number) => api.delete(`/api/leads/${id}`),
  bulkCreateLeads: (leads: any[]) => api.post('/api/leads/bulk', leads),
  takeOwnership: (id: number) => api.post(`/api/leads/${id}/take-ownership`),
  getUnassignedLeads: () => api.get('/api/leads/unassigned/list'),
  getLeadNotes: (leadId: number) => api.get(`/api/leads/${leadId}/notes`),
  addLeadNote: (leadId: number, note: string) => api.post(`/api/leads/${leadId}/notes`, { note }),
  transferLead: (leadId: number, receiverId: number, notes?: string) =>
    api.post('/api/leads/transfer', { leadId, receiverId, notes }),
  exportLeads: (filters?: any) => api.get('/api/leads/export/csv', { params: filters, responseType: 'blob' }),
  exportLeadsExcel: (filters?: any) => api.get('/api/leads/export/excel', { params: filters, responseType: 'blob' }),

  // Files
  getLeadFiles: (id: number) => api.get(`/api/leads/${id}/files`),
  uploadLeadFile: (id: number, formData: FormData) => api.post(`/api/leads/${id}/files`, formData),
  deleteLeadFile: (id: number, fileId: number) => api.delete(`/api/leads/${id}/files/${fileId}`),

  // Price Offers
  getLeadPriceOffers: (id: number) => api.get(`/api/leads/${id}/price-offers`),
  createPriceOffer: (id: number, data: any) => api.post(`/api/leads/${id}/price-offers`, data),
  updatePriceOffer: (id: number, offerId: number, data: any) => api.patch(`/api/leads/${id}/price-offers/${offerId}`, data),
  deletePriceOffer: (id: number, offerId: number) => api.delete(`/api/leads/${id}/price-offers/${offerId}`),

  // Meetings
  getLeadMeetings: (id: number) => api.get(`/api/leads/${id}/meetings`),
  scheduleMeeting: (id: number, data: any) => api.post(`/api/leads/${id}/meetings`, data),
  updateMeeting: (id: number, meetingId: number, data: any) => api.patch(`/api/leads/${id}/meetings/${meetingId}`, data),
  deleteMeeting: (id: number, meetingId: number) => api.delete(`/api/leads/${id}/meetings/${meetingId}`),

  // Tasks (Activities)
  getLeadTasks: (id: number) => api.get(`/api/leads/${id}/tasks`),
  createTask: (id: number, data: any) => api.post(`/api/activities`, { ...data, lead_id: id, type: 'task' }),
  updateTask: (id: number, taskId: number, data: any) => api.put(`/api/activities/${taskId}/status`, data),
  deleteTask: (id: number, taskId: number) => api.delete(`/api/activities/${taskId}`),

  // Messages
  getLeadSMS: (id: number) => api.get(`/api/leads/${id}/sms`),
  getLeadEmails: (id: number) => api.get(`/api/leads/${id}/emails`),
  sendSMS: (id: number, data: { message: string }) => api.post(`/api/messages/send`, { ...data, lead_id: id, channel: 'sms' }),
  sendEmail: (id: number, data: { subject: string; body: string }) => api.post(`/api/messages/send-email`, { ...data, lead_id: id }),

  // Deals and Offers
  getLeadDealsAndOffers: (id: number, timeFilter?: string) =>
    api.get(`/api/leads/${id}/deals-and-offers`, { params: { timeFilter } }),
};

export const analyticsAPI = {
  getOverview: (params?: any) => api.get('/api/analytics/overview', { params }),
  getLeadsBySource: (params?: any) => api.get('/api/analytics/leads-by-source', { params }),
  getCostPerLead: (params?: any) => api.get('/api/analytics/cost-per-lead', { params }),
  getPipelineConversion: () => api.get('/api/analytics/pipeline-conversion'),
  getTeamPerformance: (params?: any) => api.get('/api/analytics/team-performance', { params }),
  getLeadsTrend: (days?: number) => api.get('/api/analytics/leads-trend', { params: { days } }),
  getCampaignROI: (params?: any) => api.get('/api/analytics/campaign-roi', { params }),
  getLeadsSummary: () => api.get('/api/analytics/leads-summary'),
  getSuccessfulLeads: () => api.get('/api/analytics/successful-leads'),
  getLandingPageStats: (params?: { campaign?: string; startDate?: string; endDate?: string }) =>
    api.get('/api/analytics/landing-page-stats', { params }),
};

export const integrationsAPI = {
  getAll: () => api.get('/api/integrations'),
  getById: (id: number) => api.get(`/api/integrations/${id}`),
  create: (data: any) => api.post('/api/integrations', data),
  update: (id: number, data: any) => api.patch(`/api/integrations/${id}`, data),
  delete: (id: number) => api.delete(`/api/integrations/${id}`),
  registerWebsite: (data: { name: string; url: string }) => api.post('/api/integrations/register-website', data),
  generateApiKey: () => api.post('/api/integrations/generate-api-key'),
  getMetrics: () => api.get('/api/integrations/metrics'),
  resetMetrics: () => api.post('/api/integrations/metrics/reset'),

  // WordPress
  getWordPressSites: () => api.get('/api/integrations/wordpress/sites'),
  createWordPressSite: (data: { name: string; url: string; apiKey: string }) =>
    api.post('/api/integrations/wordpress/site', data),
  getWordPressForms: (siteId?: number) =>
    api.get('/api/integrations/wordpress/forms', { params: siteId ? { site_id: siteId } : {} }),

  // Meta/Facebook
  getMetaOAuthUrl: () => api.get('/api/integrations/meta/oauth-url'),
  getMetaStatus: () => api.get('/api/integrations/meta/status'),
  getMetaAdAccounts: () => api.get('/api/integrations/meta/accounts'),
  getMetaForms: (accountId: string) => api.get('/api/integrations/meta/forms', { params: { account_id: accountId } }),
  importMetaLeads: (formId: string) => api.get('/api/integrations/meta/import-leads', { params: { form_id: formId } }),

  // TikTok
  getTikTokOAuthUrl: () => api.get('/api/integrations/tiktok/oauth-url'),
  getTikTokStatus: () => api.get('/api/integrations/tiktok/status'),
  getTikTokAdvertisers: () => api.get('/api/integrations/tiktok/advertisers'),
  getTikTokForms: (advertiserId: string) => api.get('/api/integrations/tiktok/forms', { params: { advertiser_id: advertiserId } }),
};

export const messagesAPI = {
  sendMessage: (data: any) => api.post('/api/messages/send', data),
  getMessagesByLead: (leadId: number) => api.get(`/api/messages/lead/${leadId}`),
  getLeadSMS: (leadId: number) => api.get(`/api/messages/lead/${leadId}/sms`),
  getLeadEmails: (leadId: number) => api.get(`/api/messages/lead/${leadId}/emails`),
  sendEmail: (data: any) => api.post('/api/messages/send-email', data),
  createActivity: (data: any) => api.post('/api/activities', data),
  getActivitiesByLead: (leadId: number) => api.get(`/api/activities/lead/${leadId}`),
  updateActivityStatus: (id: number, done: boolean) => api.put(`/api/activities/${id}/status`, { done }),
  getPendingActivities: () => api.get('/api/activities/pending'),
};

export const twilioSettingsAPI = {
  getSettings: () => api.get('/api/twilio-settings'),
  getMySettings: () => api.get('/api/twilio/settings/me'),
  createSettings: (data: any) => api.post('/api/twilio/settings', data),
  updateSettings: (data: any) => api.put('/api/twilio-settings', data),
  updateMySettings: (data: any) => api.put('/api/twilio/settings/me', data),
  testConnection: () => api.post('/api/twilio-settings/test'),
  setupDefault: () => api.post('/api/twilio/settings/setup-default'),
};

export const campaignsAPI = {
  // Get all campaigns
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/api/campaigns', { params }),

  // Get single campaign
  getById: (id: number) => api.get(`/api/campaigns/${id}`),

  // Create campaign
  create: (data: any) => api.post('/api/campaigns', data),

  // Update campaign
  update: (id: number, data: any) => api.patch(`/api/campaigns/${id}`, data),

  // Delete campaign
  delete: (id: number) => api.delete(`/api/campaigns/${id}`),
};

export const marketingAPI = {
  // Get all marketing accounts
  getMarketingAccounts: () => api.get('/api/users/marketing-accounts'),

  // Create marketing account
  createMarketingAccount: (data: {
    name: string;
    email: string;
    campaign_budget: number;
    spending_limit: number;
    reports_access: 'read-only' | 'full-access';
    leads_access: 'read-only' | 'no-access';
    status: 'active' | 'paused';
  }) => api.post('/api/users/marketing-accounts', data),

  // Update marketing account
  updateMarketingAccount: (id: number, data: Partial<{
    name: string;
    email: string;
    campaign_budget: number;
    spending_limit: number;
    reports_access: 'read-only' | 'full-access';
    leads_access: 'read-only' | 'no-access';
    status: 'active' | 'paused';
  }>) => api.put(`/api/users/marketing-accounts/${id}`, data),

  // Delete marketing account
  deleteMarketingAccount: (id: number) => api.delete(`/api/users/marketing-accounts/${id}`),
};

export const landingPagesAPI = {
  // Get all landing pages with optional filters
  getAll: (params?: { campaign_id?: number; search?: string; active?: boolean }) =>
    api.get('/api/landing-pages', { params }),

  // Get single landing page by ID
  getById: (id: number) => api.get(`/api/landing-pages/${id}`),

  // Get landing page by slug (public)
  getBySlug: (slug: string) => api.get(`/api/landing/${slug}`),

  // Create new landing page
  create: (data: {
    title: string;
    slug: string;
    description?: string;
    content: string;
    template?: string;
    campaign_id?: number;
    active?: boolean;
    sections?: any[];
    settings?: Record<string, any>;
  }) => api.post('/api/landing-pages', data),

  // Update landing page
  update: (id: number, data: {
    title?: string;
    slug?: string;
    description?: string;
    content?: string;
    template?: string;
    campaign_id?: number;
    active?: boolean;
    sections?: any[];
    settings?: Record<string, any>;
  }) => api.put(`/api/landing-pages/${id}`, data),

  // Partial update (PATCH)
  patch: (id: number, data: Partial<{
    title: string;
    slug: string;
    description: string;
    content: string;
    active: boolean;
    sections: any[];
    settings: Record<string, any>;
  }>) => api.patch(`/api/landing-pages/${id}`, data),

  // Delete landing page
  delete: (id: number) => api.delete(`/api/landing-pages/${id}`),

  // Get sections for a landing page
  getSections: (id: number) => api.get(`/api/landing-pages/${id}/sections`),

  // Update sections
  updateSections: (id: number, sections: any[]) =>
    api.put(`/api/landing-pages/${id}/sections`, { sections }),

  // Get settings for a landing page
  getSettings: (id: number) => api.get(`/api/landing-pages/${id}/settings`),

  // Update settings
  updateSettings: (id: number, settings: Record<string, any>) =>
    api.put(`/api/landing-pages/${id}/settings`, { settings }),
};

export default api;

// Utility functions for better error handling
export const handleApiError = (error: any) => {
  const status = error.status || error.response?.status;
  const message = error.message || 'An unexpected error occurred';

  switch (status) {
    case 400:
      return { type: 'validation', message: 'Invalid data provided' };
    case 401:
      return { type: 'auth', message: 'Authentication required' };
    case 403:
      return { type: 'permission', message: 'Access denied' };
    case 404:
      return { type: 'not_found', message: 'Resource not found' };
    case 500:
      return { type: 'server', message: 'Server error occurred' };
    default:
      return { type: 'unknown', message };
  }
};

export const isApiError = (error: any): boolean => {
  return error && (error.status || error.response?.status);
};

export const getApiErrorMessage = (error: any): string => {
  if (isApiError(error)) {
    return handleApiError(error).message;
  }
  return error?.message || 'An unexpected error occurred';
};
