import api from './api';

const FRONTEND_API_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
const INTEGRATIONS_API_BASE = '/api/integrations';

const unwrap = async <T>(promise: Promise<any>): Promise<T> => {
  const response = await promise;
  return (response?.data ?? response) as T;
};

export interface Integration {
  id: number;
  type: 'wordpress' | 'ad_platform' | 'external_website' | 'form_mapping' | 'oauth' | 'webhook';
  provider?: 'facebook' | 'meta' | 'tiktok' | 'google' | 'wordpress' | 'external_website' | 'other';
  name: string;
  platform?: string;
  url?: string;
  status: 'active' | 'inactive' | 'error' | 'testing' | 'connected' | 'disconnected';
  leads_count: number;
  generated_api_key?: string;
  created_at: string;
  updated_at: string;
}

export interface OAuthStatus {
  facebook: {
    connected: boolean;
    connected_at?: string;
  };
  tiktok: {
    connected: boolean;
    connected_at?: string;
  };
}

export interface IntegrationHealth {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  maxProcessingTime: number;
  sourceMetrics: Record<
    string,
    {
      requests: number;
      successes: number;
      avgTime: number;
    }
  >;
}

export interface TestResult {
  success: boolean;
  latency: number;
  message: string;
  platform: string;
}

export interface MetaStatus {
  connected: boolean;
  pages: any[];
  ad_accounts: any[];
  expires_at?: string;
}

export const integrationsAPI = {
  // Get all integrations
  getAll: (): Promise<Integration[]> => unwrap(api.get(INTEGRATIONS_API_BASE)),

  // Get integration by ID
  getById: (id: number): Promise<Integration> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/${id}`)),

  // Create new integration
  create: (data: Partial<Integration>): Promise<Integration> =>
    unwrap(api.post(INTEGRATIONS_API_BASE, data)),

  // Update integration
  update: (id: number, data: Partial<Integration>): Promise<Integration> =>
    unwrap(api.patch(`${INTEGRATIONS_API_BASE}/${id}`, data)),

  // Test integration connection
  test: (id: number): Promise<TestResult> =>
    unwrap(api.post(`${INTEGRATIONS_API_BASE}/${id}/test`)),

  // Generate API key
  generateApiKey: (): Promise<{ api_key: string }> =>
    unwrap(api.post(`${INTEGRATIONS_API_BASE}/generate-api-key`)),

  // Get health metrics
  getHealth: (): Promise<IntegrationHealth> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/metrics`)),

  // Reset metrics
  resetMetrics: (): Promise<{ message: string }> =>
    unwrap(api.post(`${INTEGRATIONS_API_BASE}/metrics/reset`)),

  // Register website integration
  registerWebsite: (data: { name: string; url: string }) =>
    unwrap(api.post(`${INTEGRATIONS_API_BASE}/register-website`, data)),

  // Delete integration
  delete: (id: number): Promise<void> =>
    unwrap(api.delete(`${INTEGRATIONS_API_BASE}/${id}`)),

  // Process lead from specific source (direct to backend)
  processLead: (source: string, data: any): Promise<any> =>
    unwrap(api.post(`${INTEGRATIONS_API_BASE}/${source}`, data)),

  // ✅ Webhook proxy through frontend API route
  webhook: async (source: string, data: any): Promise<any> => {
    const response = await fetch(`${FRONTEND_API_URL}/api/integrations/${source}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token':
          process.env.NEXT_PUBLIC_FRONTEND_WEBHOOK_TOKEN || 'my-frontend-secret',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // OAuth Integration Methods
  // Get Facebook OAuth URL
  getFacebookAuthUrl: (): Promise<{ url: string }> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/facebook/oauth-url`)),

  // Get TikTok OAuth URL
  getTikTokAuthUrl: (): Promise<{ url: string }> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/tiktok/oauth-url`)),

  // Get OAuth integration status
  getOAuthStatus: (): Promise<OAuthStatus> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/status`)),

  // Disconnect OAuth integration
  disconnectOAuth: (
    provider: 'facebook' | 'tiktok',
  ): Promise<{ success: boolean; message: string }> =>
    unwrap(api.post(`${INTEGRATIONS_API_BASE}/disconnect`, { provider })),

  // Connect OAuth integration (redirect to OAuth URL)
  connectOAuth: async (provider: 'facebook' | 'tiktok'): Promise<void> => {
    try {
      let response;
      if (provider === 'facebook') {
        response = await integrationsAPI.getMetaOAuthUrl();
      } else {
        response = await integrationsAPI.getTikTokAuthUrl();
      }


      if (response.url) {
        // Open OAuth in a new tab/window to keep the current page intact
        window.open(response.url, '_blank', 'noopener,noreferrer');
      } else {
        console.error(`❌ No URL in ${provider} OAuth response:`, response);
        const errorMsg = (response as any).error || 'Unknown error';
        throw new Error(`Failed to get OAuth URL: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`Failed to connect ${provider}:`, error);
      throw error;
    }
  },

  // Meta-specific helpers
  getMetaOAuthUrl: (): Promise<{ url: string }> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/meta/oauth-url`)),
  getMetaStatus: (): Promise<MetaStatus> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/meta/status`)),
  getMetaAdAccounts: (): Promise<any[]> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/meta/accounts`)),
  getMetaForms: (accountId: string): Promise<any[]> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/meta/forms`, { params: { account_id: accountId } })),
  importMetaLeads: (formId: string): Promise<{ imported: number }> =>
    unwrap(api.get(`${INTEGRATIONS_API_BASE}/meta/import-leads`, { params: { form_id: formId } })),
};
