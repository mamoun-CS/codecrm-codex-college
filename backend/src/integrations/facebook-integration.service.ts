import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Integration, IntegrationProvider, IntegrationType, IntegrationStatus } from '../entities/integrations.entity';
import { IntegrationsService, AdSourceLeadData } from './integrations.service';

interface OAuthExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

@Injectable()
export class FacebookIntegrationService {
  private readonly logger = new Logger(FacebookIntegrationService.name);

  constructor(
    @InjectRepository(Integration)
    private readonly integrationRepository: Repository<Integration>,
    private readonly integrationsService: IntegrationsService,
  ) {}

  private getConfig() {
    // Handle multiple domains in CRM_DOMAIN by taking the first one
    let backendUrl = process.env.BACKEND_URL;
    if (!backendUrl && process.env.CRM_DOMAIN) {
      backendUrl = process.env.CRM_DOMAIN.split(',')[0].trim();
    }
    backendUrl = backendUrl || 'http://localhost:3001';

    const clientId = process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = `${backendUrl.replace(/\/$/, '')}/api/integrations/meta/callback`;
    const scopes =
      process.env.FACEBOOK_SCOPES ||
      'pages_show_list,pages_read_engagement,pages_manage_ads,leads_retrieval,business_management,ads_management';

    if (!clientId || !clientSecret) {
      throw new Error('Facebook app credentials are not configured');
    }

    return { backendUrl, clientId, clientSecret, redirectUri, scopes };
  }

  /**
   * Build OAuth URL with optional state (userId)
   */
  getOAuthUrl(userId?: number) {
    const { clientId, redirectUri, scopes } = this.getConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
    });

    if (userId) {
      params.set('state', String(userId));
    }

    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Handle OAuth callback: exchange tokens, fetch user/pages/accounts, persist integration
    async handleCallback(code: string, state?: string) {
    const config = this.getConfig();

    const shortToken = await this.exchangeCodeForToken(code, config.clientId, config.clientSecret, config.redirectUri);
    if (!shortToken?.access_token) {
      throw new Error('No Facebook short-lived token returned');
    }

    const longToken = await this.exchangeLongLivedToken(shortToken.access_token, config.clientId, config.clientSecret);
    if (!longToken?.access_token) {
      throw new Error('No Facebook long-lived token returned');
    }

    const user = await this.fetchUser(longToken.access_token);
    const pages = await this.fetchPages(longToken.access_token);
    const adAccounts = await this.fetchAdAccounts(longToken.access_token);

    const userId = state ? parseInt(state, 10) || null : null;
    const integration = await this.saveIntegration({
      user_id: userId,
      user_access_token: longToken.access_token,
      expires_in: longToken.expires_in,
      pages,
      ad_accounts: adAccounts,
      user,
    });

    // Subscribe primary page (first) for leadgen webhooks
    if (pages?.length) {
      const primaryPage = pages[0];
      await this.subscribeLeadgen(primaryPage.id, primaryPage.access_token);
    }

    return integration;
  }*/
 async handleCallback(code: string, state?: string) {
  try {
    const config = this.getConfig();

    const shortToken = await this.exchangeCodeForToken(code, config.clientId, config.clientSecret, config.redirectUri);
    if (!shortToken?.access_token) {
      throw new Error('No Facebook short-lived token returned');
    }

    const longToken = await this.exchangeLongLivedToken(shortToken.access_token, config.clientId, config.clientSecret);
    if (!longToken?.access_token) {
      throw new Error('No Facebook long-lived token returned');
    }

    const user = await this.fetchUser(longToken.access_token);
    const pages = await this.fetchPages(longToken.access_token);
    const adAccounts = await this.fetchAdAccounts(longToken.access_token);

    const userId = state ? parseInt(state, 10) || null : null;
    const integration = await this.saveIntegration({
      user_id: userId,
      user_access_token: longToken.access_token,
      expires_in: longToken.expires_in,
      pages,
      ad_accounts: adAccounts,
      user,
    });

    if (pages?.length) {
      const primaryPage = pages[0];
      await this.subscribeLeadgen(primaryPage.id, primaryPage.access_token);
    }

    return integration;
  } catch (err) {
    console.error('Facebook callback failed:', err.message);
    throw new BadRequestException(`Facebook callback failed: ${err.message}`);
  }
}

 

  async getStatus(userId?: number) {
    const integration = await this.getIntegration(userId);
    if (!integration) {
      return {
        connected: false,
        pages: [],
        ad_accounts: [],
      };
    }

    await this.refreshIfExpired(integration);

    const extra = integration.extra || {};

    // ✅ Check if integration is connected (status can be 'connected' or 'active')
    const isConnected = integration.status === IntegrationStatus.CONNECTED ||
                        integration.status === IntegrationStatus.ACTIVE ||
                        integration.status === 'active' as any;

    return {
      connected: isConnected,
      pages: extra.pages || [],
      ad_accounts: extra.ad_accounts || [],
      expires_at: integration.expires_at,
      user: extra.user || null,
      last_synced_at: extra.last_synced_at || null,
    };
  }

  async getAdAccounts(userId?: number) {
    const integration = await this.getIntegration(userId);
    if (!integration) {
      throw new BadRequestException('Meta integration not connected');
    }

    // ✅ Extract user_access_token from extra JSONB or virtual field
    const extra = integration.extra || {};
    const userAccessToken = integration.user_access_token || extra.user_access_token;

    if (!userAccessToken) {
      this.logger.error(`No user access token found for integration ${integration.id}`);
      throw new BadRequestException('Meta integration not connected - missing access token');
    }

    await this.refreshIfExpired(integration);

    // Prefer cached ad_accounts from extra
    const cachedAdAccounts = extra.ad_accounts;

    if (cachedAdAccounts && Array.isArray(cachedAdAccounts) && cachedAdAccounts.length > 0) {
      this.logger.log(`✅ Returning ${cachedAdAccounts.length} cached ad accounts`);
      return cachedAdAccounts;
    }

    // Fetch fresh ad accounts if not cached
    this.logger.log('Fetching fresh ad accounts from Meta API...');
    const adAccounts = await this.fetchAdAccounts(userAccessToken).catch((error) => {
      this.logger.error(`Failed to fetch ad accounts: ${error.message}`);
      return [];
    });

    // Store cache
    if (adAccounts && adAccounts.length > 0) {
      integration.extra = { ...extra, ad_accounts: adAccounts };
      await this.integrationRepository.save(integration);
      this.logger.log(`✅ Cached ${adAccounts.length} ad accounts`);
    }

    return adAccounts || [];
  }

  async getForms(accountId: string, userId?: number) {
    const integration = await this.getIntegration(userId);
    if (!integration) {
      throw new BadRequestException('Meta integration not connected');
    }

    const extra = integration.extra || {};

    // ✅ Extract user_access_token from extra JSONB or virtual field
    const userAccessToken = integration.user_access_token || extra.user_access_token;

    if (!userAccessToken) {
      this.logger.error(`No user access token found for integration ${integration.id}`);
      throw new BadRequestException('Meta integration not connected - missing access token');
    }

    await this.refreshIfExpired(integration);

    const pages = extra.pages || [];

    // ℹ️ IMPORTANT: Meta Lead Forms are associated with PAGES, not Ad Accounts
    // The accountId parameter is kept for API compatibility but we fetch forms from all connected pages

    if (!pages.length) {
      this.logger.warn('No pages found in integration');
      return [];
    }

    // Fetch forms from all connected pages
    const allForms: any[] = [];

    for (const page of pages) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}/leadgen_forms?access_token=${page.access_token}`,
        );

        if (!response.ok) {
          const text = await response.text();
          this.logger.error(`Failed to fetch forms for page ${page.id}: ${response.statusText} - ${text}`);
          continue; // Skip this page and try the next one
        }

        const data = await response.json();
        const forms = data?.data || [];

        // Add page info to each form for reference
        forms.forEach((form: any) => {
          form.page_id = page.id;
          form.page_name = page.name;
        });

        allForms.push(...forms);
      } catch (error) {
        this.logger.error(`Error fetching forms for page ${page.id}:`, error.message);
        continue;
      }
    }

    this.logger.log(`✅ Fetched ${allForms.length} lead forms from ${pages.length} page(s)`);
    return allForms;
  }

  async importLeads(formId: string, userId?: number) {
    const integration = await this.getIntegration(userId);
    if (!integration) {
      throw new BadRequestException('Meta integration not connected');
    }

    const extra = integration.extra || {};

    // ✅ Extract user_access_token from extra JSONB or virtual field
    const userAccessToken = integration.user_access_token || extra.user_access_token;

    if (!userAccessToken) {
      this.logger.error(`No user access token found for integration ${integration.id}`);
      throw new BadRequestException('Meta integration not connected - missing access token');
    }

    await this.refreshIfExpired(integration);

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${formId}/leads?access_token=${userAccessToken}`,
    );
    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Failed to fetch leads for form ${formId}: ${response.statusText} - ${text}`);
      throw new BadRequestException('Failed to fetch leads');
    }

    const payload = await response.json();
    const leads = payload?.data || [];
    let imported = 0;

    for (const lead of leads) {
      const mapped = this.mapLeadData(lead);
      try {
        // ✅ CRITICAL: Link lead to integration for proper leads_count tracking
        mapped.website_id = integration.id;

        const result = await this.integrationsService.processMetaLead(mapped);
        if (result.success) {
          imported += 1;
        }
      } catch (error) {
        this.logger.error(`Failed to import lead ${lead.id}: ${error.message}`);
      }
    }

    // ✅ leads_count is automatically updated by database trigger
    await this.integrationRepository.save(integration);

    return { imported };
  }

  /**
   * Webhook verification
   */
  verifyWebhook(mode?: string, verifyToken?: string, challenge?: string) {
    const expected = process.env.FACEBOOK_VERIFY_TOKEN || process.env.FB_VERIFY_TOKEN;
    if (mode === 'subscribe' && verifyToken === expected) {
      return challenge;
    }
    throw new BadRequestException('Invalid verify token');
  }

  /**
   * Handle webhook payload with leadgen change
   */
  async handleWebhook(payload: any) {
    const change = this.extractLeadChange(payload);
    if (!change?.leadgen_id) {
      this.logger.warn('Meta webhook missing leadgen_id');
      return { success: false };
    }

    try {
      // Find the integration for this page
      const integration = await this.integrationsService.findIntegrationByMetaWebhook(change.page_id, change.leadgen_id);

      const lead = await this.integrationsService.fetchFacebookLead(change.leadgen_id, change.page_id);
      const mapped = this.mapLeadData({ ...lead, page_id: change.page_id, form_id: change.form_id });

      // ✅ CRITICAL: Link lead to integration for proper leads_count tracking
      if (integration) {
        mapped.website_id = integration.id;
      }

      const result = await this.integrationsService.processMetaLead(mapped);
      return result;
    } catch (error) {
      this.logger.error(`Failed to process Meta webhook lead ${change.leadgen_id}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<OAuthExchangeResponse> {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Facebook token exchange failed: ${response.statusText}`);
    }
    return response.json();
  }

  private async exchangeLongLivedToken(shortToken: string, clientId: string, clientSecret: string) {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortToken,
    });
    const url = `https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Facebook long-lived token exchange failed: ${response.statusText}`);
    }
    return response.json();
  }

  private async fetchUser(accessToken: string) {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch Facebook user: ${response.statusText}`);
    }
    return response.json();
  }

  private async fetchPages(accessToken: string) {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch Facebook pages: ${response.statusText}`);
    }
    const data = await response.json();
    return data?.data || [];
  }

  private async fetchAdAccounts(accessToken: string) {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,account_id,name&access_token=${accessToken}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch ad accounts: ${response.statusText}`);
    }
    const data = await response.json();
    return data?.data || [];
  }

  private async saveIntegration(data: {
    user_id?: number | null;
    user_access_token: string;
    expires_in?: number;
    pages: any[];
    ad_accounts: any[];
    user: any;
  }) {
    const where: FindOptionsWhere<Integration> = { provider: IntegrationProvider.META, type: IntegrationType.OAUTH };
    if (data.user_id) {
      where.user_id = data.user_id;
    }
    let integration = await this.integrationRepository.findOne({ where });
    const now = new Date();
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;

    if (!integration) {
      integration = this.integrationRepository.create({
        name: 'Meta Lead Ads',
        provider: IntegrationProvider.META,
        type: IntegrationType.OAUTH,
        user_id: data.user_id || undefined,
        slug: data.pages?.[0]?.id ? `meta-${data.pages[0].id}` : 'meta',
        auth_token: this.integrationsService.generateAuthToken(),
      });
    }

    // ✅ Set virtual fields (for in-memory use)
    integration.user_access_token = data.user_access_token;
    integration.page_access_token = data.pages?.[0]?.access_token || integration.page_access_token;
    integration.scopes = this.getConfig().scopes.split(',');

    // ✅ Set database columns
    integration.page_id = data.pages?.[0]?.id || integration.page_id;
    integration.page_name = data.pages?.[0]?.name || integration.page_name;
    integration.status = IntegrationStatus.CONNECTED;
    integration.connected_at = now;
    integration.updated_at = now;
    if (expiresAt) {
      integration.expires_at = expiresAt;
    }

    // ✅ Save all data to extra JSONB column (including user_access_token)
    integration.extra = {
      ...(integration.extra || {}),
      user_access_token: data.user_access_token,  // ✅ CRITICAL: Save access token to extra
      page_access_token: data.pages?.[0]?.access_token,
      scopes: this.getConfig().scopes.split(','),
      pages: data.pages,
      ad_accounts: data.ad_accounts,
      user: data.user,
      last_synced_at: now.toISOString(),
    };

    return this.integrationRepository.save(integration);
  }

  private async subscribeLeadgen(pageId: string, pageAccessToken: string) {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${pageId}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: ['leadgen'],
          access_token: pageAccessToken,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Failed to subscribe page ${pageId}: ${response.statusText} - ${text}`);
      }
    } catch (error) {
      this.logger.error(`Error subscribing page ${pageId}: ${error.message}`);
    }
  }

  private mapLeadData(lead: any): AdSourceLeadData {
    // Transform field_data array into key-value pairs
    const fields: Record<string, any> = {};
    if (Array.isArray(lead.field_data)) {
      lead.field_data.forEach((item: any) => {
        const name = item.name || item.field_key;
        const value = Array.isArray(item.values) ? item.values[0] : item.values || item.value;
        if (name) {
          fields[name] = value;
        }
      });
    }

    const firstName = fields.first_name || fields.firstname || '';
    const lastName = fields.last_name || fields.lastname || '';
    const fullName =
      lead.full_name ||
      fields.full_name ||
      `${firstName} ${lastName}`.trim() ||
      lead.name ||
      'Meta Lead';

    return {
      full_name: fullName,
      phone: lead.phone_number || fields.phone_number || fields.phone,
      email: lead.email || fields.email,
      country: fields.country,
      city: fields.city,
      source: 'meta',  // ✅ Standardized from 'facebook' to 'meta'
      ad_source_id: lead.adset_id || lead.campaign_id,
      ad_id: lead.ad_id,
      adset_id: lead.adset_id,
      form_id: lead.form_id || fields.form_id,
      lead_id: lead.id || lead.leadgen_id,
      custom_fields: { ...fields, raw: lead },
    };
  }

  private extractLeadChange(data: any) {
    if (data?.leadgen_id || data?.lead_id) {
      return {
        leadgen_id: data.leadgen_id || data.lead_id,
        form_id: data.form_id,
        ad_id: data.ad_id,
        adgroup_id: data.adgroup_id,
        campaign_id: data.campaign_id,
        page_id: data.page_id,
      };
    }

    const value = data?.entry?.[0]?.changes?.[0]?.value;
    if (!value) {
      return null;
    }

    return {
      leadgen_id: value.leadgen_id || value.id,
      form_id: value.form_id,
      ad_id: value.ad_id,
      adgroup_id: value.adgroup_id,
      campaign_id: value.campaign_id,
      page_id: value.page_id || data?.entry?.[0]?.id,
    };
  }

  private async refreshIfExpired(integration: Integration) {
    // ✅ Extract user_access_token from extra JSONB or virtual field
    const extra = integration.extra || {};
    const userAccessToken = integration.user_access_token || extra.user_access_token;

    if (!integration?.expires_at || !userAccessToken) return;

    const expiresSoon = new Date(integration.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000;
    if (!expiresSoon) return;

    try {
      const config = this.getConfig();
      const refreshed = await this.exchangeLongLivedToken(
        userAccessToken,
        config.clientId,
        config.clientSecret,
      );
      if (refreshed?.access_token) {
        // ✅ Update both virtual field and extra JSONB
        integration.user_access_token = refreshed.access_token;
        integration.expires_at = refreshed.expires_in
          ? new Date(Date.now() + refreshed.expires_in * 1000)
          : integration.expires_at;

        // ✅ CRITICAL: Save refreshed token to extra JSONB
        integration.extra = {
          ...extra,
          user_access_token: refreshed.access_token,
          last_token_refresh: new Date().toISOString(),
        };

        await this.integrationRepository.save(integration);
        this.logger.log(`✅ Refreshed Facebook long-lived token for integration ${integration.id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to refresh Facebook token: ${error.message}`);
    }
  }

  private async getIntegration(userId?: number) {
    const where: FindOptionsWhere<Integration> = { provider: IntegrationProvider.META, type: IntegrationType.OAUTH };
    if (userId) {
      where.user_id = userId;
    }

    return this.integrationRepository.findOne({
      where,
      order: { created_at: 'DESC' },  // ✅ Fixed: Use created_at instead of updated_at (which doesn't exist in DB)
    });
  }
}
