import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Lead } from '../entities/leads.entity';
import { Campaign } from '../entities/campaigns.entity';
import { AdSource } from '../entities/ad-sources.entity';
import { Integration, IntegrationType, IntegrationProvider, IntegrationStatus, WebhookStatus, TikTokIntegration } from '../entities/integrations.entity';
import { LeadSource } from '../entities/leads.entity';
import { User } from '../entities/user.entity';
import { File } from '../entities/files.entity';
import { PriceOffer } from '../entities/price-offers.entity';
import { Meeting } from '../entities/meetings.entity';
import { Message } from '../entities/messages.entity';
import { LeadNote } from '../entities/lead-notes.entity';
import { randomBytes } from 'crypto';
import { Website } from '../entities/integrations.entity';
import { LeadsService } from '../leads/leads.service';

export interface AdSourceLeadData {
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  source: string;
  campaign_id?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ad_source_id?: string;
  ad_id?: string;
  adset_id?: string;
  form_id?: string;
  lead_id?: string;
  advertiser_id?: string;
  custom_fields?: Record<string, any>;
  website_id?: number;
}

export interface IntegrationResult {
  success: boolean;
  lead_id?: number;
  error?: string;
  processing_time_ms: number;
}

export interface IntegrationHealth {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  maxProcessingTime: number;
  sourceMetrics: Record<string, {
    requests: number;
    successes: number;
    avgTime: number;
  }>;
}


@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private metrics: IntegrationHealth = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageProcessingTime: 0,
    maxProcessingTime: 0,
    sourceMetrics: {}
  };

  // Add this method to your IntegrationsService class

// ...other methods...

async updateIntegration(id: number, data: any) {
  const integration = await this.integrationRepository.findOne({ where: { id } });
  if (!integration) {
    throw new NotFoundException('Integration not found');
  }

  // Convert scopes if it's a string
  if (data.scopes && typeof data.scopes === 'string') {
    data.scopes = data.scopes.split(',').map((s: string) => s.trim());
  }

  Object.assign(integration, data, { updated_at: new Date() });
  return this.integrationRepository.save(integration);
}


// Add this method to support deletion of an integration by ID
async deleteIntegration(id: number): Promise<any> {
  // Find the integration first to ensure it exists
  const integration = await this.integrationRepository.findOne({
    where: { id }
  });

  if (!integration) {
    throw new NotFoundException('Integration not found');
  }

  // Delete the integration from the database
  await this.integrationRepository.remove(integration);

  return { message: `Integration with id ${id} deleted successfully` };
}

  private updateMetrics(source: string, success: boolean, processingTime: number): void {
    const m = this.metrics;

    // Update global counters
    m.totalRequests = (m.totalRequests || 0) + 1;
    if (success) {
      m.successfulRequests = (m.successfulRequests || 0) + 1;
    } else {
      m.failedRequests = (m.failedRequests || 0) + 1;
    }

    // Update max processing time
    m.maxProcessingTime = Math.max(m.maxProcessingTime || 0, processingTime);

    // Update running average for global processing time
    const prevTotal = m.totalRequests - 1;
    if (prevTotal <= 0) {
      m.averageProcessingTime = processingTime;
    } else {
      m.averageProcessingTime = ((m.averageProcessingTime * prevTotal) + processingTime) / m.totalRequests;
    }

    // Update per-source metrics
    const key = (source || 'unknown').toLowerCase();
    if (!m.sourceMetrics[key]) {
      m.sourceMetrics[key] = {
        requests: 0,
        successes: 0,
        avgTime: 0,
      };
    }

    const sm = m.sourceMetrics[key];
    const prevSourceTotal = sm.requests;
    sm.requests = prevSourceTotal + 1;
    if (success) {
      sm.successes = (sm.successes || 0) + 1;
    }

    if (prevSourceTotal <= 0) {
      sm.avgTime = processingTime;
    } else {
      sm.avgTime = ((sm.avgTime * prevSourceTotal) + processingTime) / sm.requests;
    }
  }

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Integration)
    private integrationRepository: Repository<Integration>,
    @InjectRepository(TikTokIntegration)
    private tiktokIntegrationRepository: Repository<TikTokIntegration>,
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    @InjectRepository(PriceOffer)
    private priceOfferRepository: Repository<PriceOffer>,
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(LeadNote)
    private leadNoteRepository: Repository<LeadNote>,
    private dataSource: DataSource,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Get all integrations (including TikTok integrations)
   * ✅ leads_count is now automatically maintained by database triggers
   */
  async getAllIntegrations(): Promise<any[]> {
    // Get regular integrations
    const integrations = await this.integrationRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' }
    });

    // Populate virtual fields from extra JSONB
    // ✅ leads_count comes directly from database column (maintained by triggers)
    const enrichedIntegrations = integrations.map(integration => {
      const extra = integration.extra || {};

      return {
        ...integration,
        auth_token: extra.auth_token,
        status: extra.status || IntegrationStatus.ACTIVE,
        leads_count: integration.leads_count || 0, // ✅ Direct from database column
        page_access_token: extra.page_access_token,
        user_access_token: extra.user_access_token,
        scopes: extra.scopes,
        webhook_status: extra.webhook_status,
        updated_at: integration.created_at, // Use created_at as fallback
      };
    });

    // Get TikTok integrations
    const tiktokIntegrations = await this.tiktokIntegrationRepository.find({
      order: { created_at: 'DESC' }
    });

    // Transform TikTok integrations to match Integration format
    const transformedTikTok = tiktokIntegrations.map(tiktok => ({
      id: `tiktok_${tiktok.id}`,
      name: `TikTok Integration ${tiktok.id}`,
      provider: 'tiktok',
      type: 'oauth',
      status: tiktok.active ? 'connected' : 'inactive',
      access_token: tiktok.access_token ? '***' : null,
      refresh_token: tiktok.refresh_token ? '***' : null,
      expires_at: tiktok.expires_at,
      user_id: tiktok.user_id,
      created_by: tiktok.created_by,
      created_at: tiktok.created_at,
      updated_at: tiktok.updated_at,
      leads_count: 0,
      extra: {
        advertiser_ids: tiktok.advertiser_ids,
        app_id: tiktok.app_id,
        integration_type: 'tiktok'
      }
    }));

    // Combine and return all integrations
    return [...enrichedIntegrations, ...transformedTikTok];
  }


  /**
   * Create new integration
   */
  async createIntegration(data: any): Promise<Integration> {
    try {
      // Generate API key for website integrations (both EXTERNAL_WEBSITE and WORDPRESS)
      if ((data.type === IntegrationType.EXTERNAL_WEBSITE || data.type === IntegrationType.WORDPRESS) && !data.api_key && !data.generated_api_key) {
        data.api_key = this.generateApiKey();
        data.generated_api_key = data.api_key; // For backward compatibility
      }

      // Generate slug from name
      if (data.name && !data.slug) {
        data.slug = this.generateSlug(data.name);
      }

      // Generate auth token for webhook authentication
      const authToken = data.auth_token || this.generateAuthToken();

      // Generate endpoint URL
      if (!data.endpoint_url && data.slug) {
        const domain = process.env.CRM_DOMAIN || process.env.API_URL || 'http://localhost:3002';
        data.endpoint_url = `${domain}/api/integrations/webhook/${data.slug}`;
      }

      // Store virtual fields in extra JSONB
      const extra = data.extra || {};
      extra.auth_token = authToken;
      extra.status = data.status || IntegrationStatus.ACTIVE;
      extra.leads_count = data.leads_count || 0;

      // Store other virtual fields if provided
      if (data.page_access_token) extra.page_access_token = data.page_access_token;
      if (data.user_access_token) extra.user_access_token = data.user_access_token;
      if (data.scopes) extra.scopes = data.scopes;
      if (data.webhook_status) extra.webhook_status = data.webhook_status;

      this.logger.log(`Creating integration with data: ${JSON.stringify({
        name: data.name,
        type: data.type,
        provider: data.provider,
        slug: data.slug,
        has_api_key: !!data.api_key,
        has_auth_token: !!authToken,
      })}`);

      // Create integration with only database columns
      const integrationData = {
        provider: data.provider,
        name: data.name,
        slug: data.slug,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        page_id: data.page_id,
        page_name: data.page_name,
        account_id: data.account_id,
        webhook_url: data.webhook_url,
        webhook_config: data.webhook_config,
        extra: extra,
        connected_at: data.connected_at,
        created_by: data.created_by,
        user_id: data.user_id,
        type: data.type,
        endpoint_url: data.endpoint_url,
        api_key: data.api_key,
        url: data.url,
      };

      const integration = this.integrationRepository.create(integrationData);
      const savedIntegration = await this.integrationRepository.save(integration);

      // Handle both single object and array returns
      const saved = Array.isArray(savedIntegration) ? savedIntegration[0] : savedIntegration;

      // Return plain object with virtual fields populated
      const result = {
        ...saved,
        auth_token: authToken,
        status: extra.status,
        leads_count: extra.leads_count,
        page_access_token: extra.page_access_token,
        user_access_token: extra.user_access_token,
        scopes: extra.scopes,
        webhook_status: extra.webhook_status,
        updated_at: saved.created_at,
      };

      this.logger.log(`Integration created successfully: ID ${result.id}`);

      return result as unknown as Integration;
    } catch (error) {
      this.logger.error('Error creating integration:', error.message);
      this.logger.error('Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Generate a unique API key for website integration
   */
  generateApiKey(): string {
    return `crm_api_${randomBytes(24).toString('hex')}`;
  }

  /**
   * Generate a unique auth token for webhook authentication
   */
  generateAuthToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a URL-friendly slug from the integration name
   */
  generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Ensure uniqueness by appending timestamp
    return `${baseSlug}-${Date.now()}`;
  }

  /**
   * Get integration by slug
   */
  async getIntegrationBySlug(slug: string): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({
      where: { slug }
    });
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    // Populate virtual fields from extra JSONB
    const extra = integration.extra || {};
    const enriched = {
      ...integration,
      auth_token: extra.auth_token,
      status: extra.status || IntegrationStatus.ACTIVE,
      leads_count: extra.leads_count || 0,
      page_access_token: extra.page_access_token,
      user_access_token: extra.user_access_token,
      scopes: extra.scopes,
      webhook_status: extra.webhook_status,
    };

    return enriched as unknown as Integration;
  }

  /**
   * ✅ DEPRECATED: Leads count is now automatically maintained by database triggers
   * This method is kept for backward compatibility but does nothing
   */
  async incrementLeadsCount(integrationId: number): Promise<void> {
    this.logger.debug(`incrementLeadsCount called for integration ${integrationId} - handled by database trigger`);
    // Database trigger automatically updates leads_count
  }

  /**
   * Get actual leads count from database for an integration
   * ✅ This queries the actual count from leads table
   */
  async getActualLeadsCount(integrationId: number): Promise<number> {
    try {
      const count = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from('leads', 'lead')
        .where('lead.website_id = :integrationId', { integrationId })
        .getRawOne();

      return parseInt(count?.count || '0', 10);
    } catch (error) {
      this.logger.error(`Error getting leads count for integration ${integrationId}:`, error);
      return 0;
    }
  }

  /**
   * ✅ Synchronize leads_count for a specific integration
   * Useful for fixing discrepancies or manual corrections
   */
  async syncIntegrationLeadsCount(integrationId: number): Promise<number> {
    try {
      const actualCount = await this.getActualLeadsCount(integrationId);

      await this.integrationRepository.update(integrationId, {
        leads_count: actualCount
      });

      this.logger.log(`✅ Synced leads count for integration ${integrationId}: ${actualCount}`);
      return actualCount;
    } catch (error) {
      this.logger.error(`Error syncing leads count for integration ${integrationId}:`, error);
      throw error;
    }
  }

  /**
   * ✅ Synchronize leads_count for ALL integrations
   * Run this as a maintenance task if needed
   */
  async syncAllIntegrationsLeadsCount(): Promise<{ synced: number; errors: number }> {
    const integrations = await this.integrationRepository.find();
    let synced = 0;
    let errors = 0;

    for (const integration of integrations) {
      try {
        await this.syncIntegrationLeadsCount(integration.id);
        synced++;
      } catch (error) {
        errors++;
        this.logger.error(`Failed to sync integration ${integration.id}:`, error);
      }
    }

    this.logger.log(`✅ Sync completed: ${synced} synced, ${errors} errors`);
    return { synced, errors };
  }

  /**
   * Get all leads for a specific integration
   */
  async getLeadsForIntegration(integrationId: number): Promise<any[]> {
    try {
      const leads = await this.dataSource
        .createQueryBuilder()
        .select('lead.*')
        .from('leads', 'lead')
        .where('lead.website_id = :integrationId', { integrationId })
        .orderBy('lead.created_at', 'DESC')
        .getRawMany();

      return leads;
    } catch (error) {
      this.logger.error(`Error getting leads for integration ${integrationId}:`, error);
      return [];
    }
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(id: number): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({
      where: { id }
    });
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }
    return integration;
  }

  /**
   * Get integration by auth token
   */
  async getIntegrationByAuthToken(authToken: string): Promise<Integration> {
    const integration = await this.integrationRepository.findOne({
      where: { auth_token: authToken }
    });
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }
    return integration;
  }

/**
 * Find website by auth token
 */ 

async findWebsiteByToken(authToken: string) {
  const query = this.dataSource
    .getRepository(Website)
    .createQueryBuilder('website')
    .where('LOWER(TRIM(website.apiKey)) = LOWER(TRIM(:authToken))', {
      authToken,
    });

  const website = await query.getOne();
  return website;
}

async deleteWebsite(id: number) {
  // Delete from Integration table since frontend loads from there
  const integration = await this.integrationRepository.findOne({ where: { id } });

  if (!integration) {
    throw new NotFoundException('Website integration not found');
  }

  await this.integrationRepository.remove(integration);
  return { message: 'Website integration deleted successfully' };
}


  /**
   * Process lead from Google Ads
   */
  async processGoogleAdsLead(data: AdSourceLeadData): Promise<IntegrationResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing Google Ads lead: ${data.full_name}`);

      // Validate required fields
      if (!data.full_name) {
        throw new BadRequestException('Full name is required');
      }

      // Set source if not provided
      if (!data.source) {
        data.source = 'google_ads';
      }

      // Create lead using existing service
      const lead = await this.leadsService.createFromLandingPage({
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        country: data.country,
        city: data.city,
        language: data.language,
        campaign_id: data.campaign_id,
        utm_source: data.utm_source || 'google',
        utm_medium: data.utm_medium || 'cpc',
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        source: data.source,
        website_id: data.website_id,
        ad_source_id: data.ad_source_id,
        ad_id: data.ad_id,
        adset_id: data.adset_id,
        form_id: data.form_id,
        lead_id: data.lead_id,
        advertiser_id: data.advertiser_id,
        custom_fields: data.custom_fields,
      }, { requireRecaptcha: false });

      const processingTime = Date.now() - startTime;
      this.updateMetrics('google', true, processingTime);
      this.logger.log(`Google Ads lead processed successfully in ${processingTime}ms`);

      return {
        success: true,
        lead_id: lead.id,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics('google', false, processingTime);
      this.logger.error(`Failed to process Google Ads lead: ${error.message}`);

      return {
        success: false,
        error: error.message,
        processing_time_ms: processingTime,
      };
    }
  }

  /**
   * Process lead from Meta (Facebook)
   */
  async processMetaLead(data: AdSourceLeadData): Promise<IntegrationResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing Meta lead: ${data.full_name}`);

      if (!data.full_name) {
        throw new BadRequestException('Full name is required');
      }

      if (!data.source) {
        data.source = 'facebook';
      }

      const lead = await this.leadsService.createFromLandingPage({
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        country: data.country,
        city: data.city,
        language: data.language,
        campaign_id: data.campaign_id,
        utm_source: data.utm_source || 'facebook',
        utm_medium: data.utm_medium || 'social',
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        source: data.source,
        website_id: data.website_id,
        ad_source_id: data.ad_source_id,
        ad_id: data.ad_id,
        adset_id: data.adset_id,
        form_id: data.form_id,
        lead_id: data.lead_id,
        advertiser_id: data.advertiser_id,
        custom_fields: data.custom_fields,
      }, { requireRecaptcha: false });

      const processingTime = Date.now() - startTime;
      this.updateMetrics('facebook', true, processingTime);
      this.logger.log(`Meta lead processed successfully in ${processingTime}ms`);

      return {
        success: true,
        lead_id: lead.id,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics('facebook', false, processingTime);
      this.logger.error(`Failed to process Meta lead: ${error.message}`);

      return {
        success: false,
        error: error.message,
        processing_time_ms: processingTime,
      };
    }
  }

  /**
   * Process lead from TikTok
   */
  async processTikTokLead(data: AdSourceLeadData): Promise<IntegrationResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing TikTok lead: ${data.full_name}`);

      if (!data.full_name) {
        throw new BadRequestException('Full name is required');
      }

      if (!data.source) {
        data.source = 'tiktok';
      }

      const lead = await this.leadsService.createFromLandingPage({
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        country: data.country,
        city: data.city,
        language: data.language,
        campaign_id: data.campaign_id,
        utm_source: data.utm_source || 'tiktok',
        utm_medium: data.utm_medium || 'social',
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        source: data.source,
        website_id: data.website_id,
        ad_source_id: data.ad_source_id,
        ad_id: data.ad_id,
        adset_id: data.adset_id,
        form_id: data.form_id,
        lead_id: data.lead_id,
        advertiser_id: data.advertiser_id,
        custom_fields: data.custom_fields,
      }, { requireRecaptcha: false });

      const processingTime = Date.now() - startTime;
      this.updateMetrics('tiktok', true, processingTime);
      this.logger.log(`TikTok lead processed successfully in ${processingTime}ms`);

      return {
        success: true,
        lead_id: lead.id,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics('tiktok', false, processingTime);
      this.logger.error(`Failed to process TikTok lead: ${error.message}`);

      return {
        success: false,
        error: error.message,
        processing_time_ms: processingTime,
      };
    }
  }

  /**
     * Process lead from website forms
     */
    async processWebsiteLead(data: AdSourceLeadData, website?: any): Promise<IntegrationResult> {
      const startTime = Date.now();

      try {
        this.logger.log(`Processing website lead: ${data.full_name}`);

        if (!data.full_name) {
          throw new BadRequestException('Full name is required');
        }

        if (!data.source) {
          data.source = 'website';
        }

        // If website is provided, use its information
        const websiteId = website?.id || data.website_id;
        const websiteName = website?.name || data.source;

        const lead = await this.leadsService.createFromLandingPage({
          full_name: data.full_name,
          phone: data.phone,
          email: data.email,
          country: data.country,
          city: data.city,
          language: data.language,
          campaign_id: data.campaign_id,
          utm_source: data.utm_source || 'website',
          utm_medium: data.utm_medium || 'organic',
          utm_campaign: data.utm_campaign,
          utm_term: data.utm_term,
          utm_content: data.utm_content,
          website_id: websiteId,
          website_name: websiteName,
          source: websiteName,
          ad_source_id: data.ad_source_id,
          ad_id: data.ad_id,
          adset_id: data.adset_id,
          form_id: data.form_id,
          lead_id: data.lead_id,
          advertiser_id: data.advertiser_id,
          custom_fields: data.custom_fields,
        }, { requireRecaptcha: false });

        const processingTime = Date.now() - startTime;
        this.updateMetrics('website', true, processingTime);
        this.logger.log(`Website lead processed successfully in ${processingTime}ms`);

        return {
          success: true,
          lead_id: lead.id,
          processing_time_ms: processingTime,
        };
      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.updateMetrics('website', false, processingTime);
        this.logger.error(`Failed to process website lead: ${error.message}`);

        return {
          success: false,
          error: error.message,
          processing_time_ms: processingTime,
        };
      }
    }

  /**
   * Process lead from external API
   */
  async processExternalAPILead(data: AdSourceLeadData): Promise<IntegrationResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing external API lead: ${data.full_name}`);

      if (!data.full_name) {
        throw new BadRequestException('Full name is required');
      }

      if (!data.source) {
        data.source = 'external_api';
      }

      const lead = await this.leadsService.createFromLandingPage({
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        country: data.country,
        city: data.city,
        language: data.language,
        campaign_id: data.campaign_id,
        utm_source: data.utm_source || 'external_api',
        utm_medium: data.utm_medium || 'api',
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        website_id: data.website_id,
        source: data.source,
        ad_source_id: data.ad_source_id,
        ad_id: data.ad_id,
        adset_id: data.adset_id,
        form_id: data.form_id,
        lead_id: data.lead_id,
        advertiser_id: data.advertiser_id,
        custom_fields: data.custom_fields,
      }, { requireRecaptcha: false });

      const processingTime = Date.now() - startTime;
      this.updateMetrics('external_api', true, processingTime);
      this.logger.log(`External API lead processed successfully in ${processingTime}ms`);

      return {
        success: true,
        lead_id: lead.id,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetrics('external_api', false, processingTime);
      this.logger.error(`Failed to process external API lead: ${error.message}`);

      return {
        success: false,
        error: error.message,
        processing_time_ms: processingTime,
      };
    }
  }

  /**
   * Generic lead processing method that routes to appropriate handler
   */
  async processLead(source: string, data: AdSourceLeadData): Promise<IntegrationResult> {
    switch (source.toLowerCase()) {
      case 'google':
      case 'google_ads':
        return this.processGoogleAdsLead(data);
      case 'meta':
      case 'facebook':
        return this.processMetaLead(data);
      case 'tiktok':
        return this.processTikTokLead(data);
      case 'website':
        return this.processWebsiteLead(data);
      case 'external_api':
      case 'api':
        return this.processExternalAPILead(data);
      default:
        return this.processWebsiteLead(data); // Default fallback
    }
  }

  /**
   * Register a new website integration
   */
  async registerWebsite(name: string, url: string) {
    // Create integration with type 'external_website'
    const integration = await this.createIntegration({
      name: name,
      url: url,
      type: 'external_website',
      status: 'active',
    });

    // Return integration data in the expected format
    return {
      id: integration.id,
      name: integration.name,
      url: integration.webhook_url || '',
      apiKey: integration.auth_token, // Use auth_token as apiKey
      endpoint_url: integration.webhook_url || '',
      status: integration.status,
      created_at: integration.created_at,
      updated_at: integration.updated_at,
    } as any;
  }
  /**
   * Create lead from landing page data (copied from LeadsService)
   */
  // helper methods removed - logic centralized inside LeadsService

  /**
   * Get OAuth authorization URL for a provider
   */
  getAuthUrl(provider: 'facebook' | 'tiktok', state?: string): string {
    const baseUrl = process.env.CRM_DOMAIN || 'http://localhost:3000';

    switch (provider) {
      case 'facebook': {
        const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID;
        if (!clientId) {
          throw new Error('FACEBOOK_CLIENT_ID environment variable is not set');
        }

        const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${baseUrl}/api/integrations/facebook/callback`;
        const scopes = process.env.FACEBOOK_SCOPES || 'pages_show_list,pages_read_engagement,pages_manage_ads,leads_retrieval,business_management';

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: scopes,
          response_type: 'code',
        });

        if (state) {
          params.append('state', state);
        }

        return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
      }

      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
  }

  /**
   * Handle OAuth callback and finalize integration
   */
  async handleCallback(provider: 'facebook' | 'tiktok', code: string, userId: number): Promise<void> {
    try {
      switch (provider) {
        case 'facebook':
          await this.handleFacebookOAuthCallback(code, userId);
          break;
        default:
          throw new Error(`Unsupported OAuth provider: ${provider}`);
      }

      this.logger.log(`Successfully connected ${provider} integration for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle ${provider} OAuth callback: ${error.message}`);
      throw error;
    }
  }

  /**
   * Facebook OAuth: exchange code, pick page, subscribe to leadgen
   */
  private async handleFacebookOAuthCallback(code: string, userId: number): Promise<void> {
    const config = this.getFacebookConfig();

    const shortLived = await this.exchangeFacebookCodeForShortToken(code, config.clientId, config.clientSecret, config.redirectUri);
    if (!shortLived?.access_token) {
      throw new Error('No Facebook access token returned from exchange');
    }

    const longLived = await this.exchangeFacebookLongLivedToken(shortLived.access_token, config.clientId, config.clientSecret);
    if (!longLived?.access_token) {
      throw new Error('No Facebook long-lived token returned from exchange');
    }

    const pages = await this.fetchFacebookPages(longLived.access_token);

    if (!pages?.length) {
      throw new Error('No Facebook pages found for this user');
    }

    // Create integrations for all available pages
    const integrations: Integration[] = [];
    for (const page of pages) {
      if (!page?.access_token) {
        this.logger.warn(`Skipping page ${page.id} (${page.name}) - missing access token`);
        continue;
      }

      try {
        const integration = await this.saveFacebookIntegration(userId, {
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          user_access_token: longLived.access_token,
          scopes: config.scopes,
        });

        const subscribed = await this.subscribeFacebookLeadgenWebhook(page.id, page.access_token);
        integration.webhook_status = subscribed ? WebhookStatus.ACTIVE : WebhookStatus.ERROR;
        integration.status = subscribed ? IntegrationStatus.CONNECTED : IntegrationStatus.ERROR;
        await this.integrationRepository.save(integration);
        integrations.push(integration);

        this.logger.log(`✅ Created integration for page ${page.name} (ID: ${integration.id})`);
      } catch (error) {
        this.logger.error(`Failed to create integration for page ${page.name}: ${error.message}`);
      }
    }

    if (integrations.length === 0) {
      throw new Error('Failed to create any Facebook page integrations');
    }
  }

  private getFacebookConfig() {
    const baseUrl = process.env.CRM_DOMAIN || 'http://localhost:3000';
    const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${baseUrl}/api/integrations/facebook/callback`;
    const scopes = process.env.FACEBOOK_SCOPES || 'pages_show_list,pages_read_engagement,pages_manage_ads,leads_retrieval,business_management';

    if (!clientId || !clientSecret) {
      throw new Error('Facebook app credentials are not configured');
    }

    return { clientId, clientSecret, redirectUri, scopes };
  }

  private async exchangeFacebookCodeForShortToken(code: string, clientId: string, clientSecret: string, redirectUri: string) {
    const tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(`${tokenUrl}?${params.toString()}`, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Facebook token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async exchangeFacebookLongLivedToken(shortToken: string, clientId: string, clientSecret: string) {
    const tokenUrl = 'https://graph.facebook.com/v19.0/oauth/access_token';
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortToken,
    });

    const response = await fetch(`${tokenUrl}?${params.toString()}`, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Facebook long-lived token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchFacebookPages(userAccessToken: string) {
    const response = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Facebook pages: ${response.statusText}`);
    }

    const payload = await response.json();
    return payload?.data || [];
  }

  private async subscribeFacebookLeadgenWebhook(pageId: string, pageAccessToken: string): Promise<boolean> {
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
        const errorText = await response.text();
        this.logger.error(`Failed to subscribe page ${pageId} to leadgen: ${response.statusText} - ${errorText}`);
        return false;
      }

      const result = await response.json();
      return result.success !== false;
    } catch (error) {
      this.logger.error(`Error subscribing Facebook page ${pageId}: ${error.message}`);
      return false;
    }
  }

  async fetchFacebookLead(leadgenId: string, pageId?: string): Promise<any> {
    this.logger.log(`🔍 Fetching Facebook lead ${leadgenId} with pageId=${pageId}`);

    let integration: Integration | null = null;

    // If pageId is provided, try to find integration for that specific page
    if (pageId) {
      integration = await this.findIntegrationByMetaWebhook(pageId, leadgenId);
    }

    // If no integration found or no pageId provided, try to find any connected Facebook integration
    if (!integration) {
      this.logger.log(`🔄 No specific integration found, trying any connected Facebook integration`);
      integration = await this.findIntegrationByMetaWebhook(undefined, leadgenId);
    }

    if (!integration?.page_access_token) {
      throw new Error(`Facebook page access token not configured for lead ${leadgenId}`);
    }

    this.logger.log(`📡 Using integration ${integration.name} (ID: ${integration.id}) to fetch lead`);

    const response = await fetch(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${integration.page_access_token}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Facebook API error for lead ${leadgenId}: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Failed to fetch Facebook lead ${leadgenId}: ${response.statusText}`);
    }

    const lead = await response.json();
    this.logger.log(`✅ Successfully fetched lead ${leadgenId} from page ${integration.page_id}`);

    return {
      ...lead,
      page_id: integration.page_id,
      page_name: integration.page_name,
    };
  }

  /**
   * Find integration by user ID and provider
   */
  async findIntegrationByProvider(userId: number, provider: string): Promise<Integration | null> {
    // Normalize 'facebook' to 'meta'
    const normalizedProvider = provider === 'facebook' ? 'meta' : provider;

    const integration = await this.integrationRepository.findOne({
      where: {
        user_id: userId,
        provider: normalizedProvider as any,
        status: IntegrationStatus.CONNECTED
      },
    });

    return integration || null;
  }

  /**
   * Find Facebook integration by multiple criteria (page_id primary, with fallbacks)
   */
  async findIntegrationByMetaWebhook(pageId?: string, leadgenId?: string): Promise<Integration | null> {
    this.logger.log(`🔍 Finding Meta integration: pageId=${pageId}, leadgenId=${leadgenId}`);

    // Primary: exact match with page_id
    if (pageId) {
      const exactMatch = await this.integrationRepository.findOne({
        where: {
          provider: IntegrationProvider.META,
          page_id: pageId,
          status: IntegrationStatus.CONNECTED
        },
      });

      if (exactMatch) {
        this.logger.log(`✅ Found exact page match: ${exactMatch.name} (ID: ${exactMatch.id})`);
        return exactMatch;
      }
    }

    // Fallback 1: any connected Meta integration
    const anyConnected = await this.integrationRepository.find({
      where: {
        provider: IntegrationProvider.META,
        status: IntegrationStatus.CONNECTED
      },
      order: { created_at: 'DESC' },  // ✅ Fixed: Use created_at instead of updated_at
      take: 1,
    });

    if (anyConnected.length > 0) {
      this.logger.log(`⚠️ Using fallback connected integration: ${anyConnected[0].name} (ID: ${anyConnected[0].id})`);
      return anyConnected[0];
    }

    // Fallback 2: any Meta integration (for debugging)
    const anyMeta = await this.integrationRepository.find({
      where: { provider: IntegrationProvider.META },
      order: { created_at: 'DESC' },  // ✅ Fixed: Use created_at instead of updated_at
      take: 1,
    });

    if (anyMeta.length > 0) {
      this.logger.warn(`⚠️ Found inactive Meta integration: ${anyMeta[0].name} (ID: ${anyMeta[0].id}, Status: ${anyMeta[0].status})`);
      return anyMeta[0];
    }

    this.logger.error(`❌ No Meta integration found for pageId=${pageId}`);
    return null;
  }

  async getFacebookIntegrationForPage(pageId?: string): Promise<Integration | null> {
    return this.findIntegrationByMetaWebhook(pageId);
  }

  private async saveFacebookIntegration(
    userId: number,
    data: {
      page_id: string;
      page_name: string;
      page_access_token: string;
      user_access_token: string;
      scopes?: string;
    },
  ): Promise<Integration> {
    this.logger.log(`💾 Saving Facebook integration for user ${userId}: page=${data.page_id} (${data.page_name})`);

    // Check if integration for this specific page already exists
    let integration = await this.integrationRepository.findOne({
      where: { user_id: userId, provider: IntegrationProvider.META, page_id: data.page_id },
    });

    const now = new Date();

    if (!integration) {
      this.logger.log('🆕 Creating new Meta integration for page');
      integration = this.integrationRepository.create({
        type: IntegrationType.OAUTH,
        provider: IntegrationProvider.META,
        user_id: userId,
        name: `Meta: ${data.page_name}`,
        slug: `meta-${data.page_id}-${Date.now()}`, // Make slug unique
        auth_token: this.generateAuthToken(),
      });
    } else {
      this.logger.log(`🔄 Updating existing Facebook integration for page (ID: ${integration.id})`);
    }

    // Save all Facebook-specific data
    integration.page_id = data.page_id;
    integration.page_name = data.page_name;
    integration.page_access_token = data.page_access_token;
    integration.user_access_token = data.user_access_token;
    if (data.scopes) {
      integration.scopes = Array.isArray(data.scopes) ? data.scopes : data.scopes.split(',');
    }
    integration.status = IntegrationStatus.CONNECTED;
    integration.connected_at = now;
    integration.updated_at = now;
    integration.extra = {
      ...(integration.extra || {}),
      last_connected_at: now.toISOString(),
      page_id: data.page_id,
      page_name: data.page_name
    };

    const saved = await this.integrationRepository.save(integration);
    this.logger.log(`✅ Facebook integration saved successfully (ID: ${saved.id})`);

    return saved;
  }

  /**
   * Save or update integration token for a user (generic for TikTok / future)
   */
  async saveIntegrationToken(userId: number, provider: 'facebook' | 'tiktok' | 'meta', tokenInfo: any): Promise<void> {
    // Normalize 'facebook' to 'meta'
    const normalizedProvider = provider === 'facebook' ? 'meta' : provider;

    let integration = await this.integrationRepository.findOne({
      where: { user_id: userId, provider: normalizedProvider === 'meta' ? IntegrationProvider.META : IntegrationProvider.TIKTOK, type: IntegrationType.OAUTH },
    });

    const now = new Date();

    if (integration) {
      integration.access_token = tokenInfo.access_token;
      integration.refresh_token = tokenInfo.refresh_token;
      integration.expires_at = tokenInfo.expires_at;
      integration.connected_at = now;
      integration.status = IntegrationStatus.CONNECTED;
      integration.updated_at = now;
    } else {
      integration = this.integrationRepository.create();
      integration.provider = normalizedProvider === 'meta' ? IntegrationProvider.META : IntegrationProvider.TIKTOK;
      integration.user_id = userId;
      integration.access_token = tokenInfo.access_token;
      integration.refresh_token = tokenInfo.refresh_token;
      integration.expires_at = tokenInfo.expires_at;
      integration.connected_at = now;
      integration.status = IntegrationStatus.CONNECTED;
      integration.name = `${provider.charAt(0).toUpperCase() + provider.slice(1)} Integration`;
      integration.slug = provider;
      integration.auth_token = this.generateAuthToken();
    }

    await this.integrationRepository.save(integration);
  }

  /**
   * Disconnect integration for a user
   */
  async disconnectIntegration(userId: number, provider: 'facebook' | 'tiktok' | 'meta'): Promise<void> {
    // Normalize 'facebook' to 'meta'
    const normalizedProvider = provider === 'facebook' ? 'meta' : provider;

    const integration = await this.integrationRepository.findOne({
      where: { user_id: userId, provider: normalizedProvider === 'meta' ? IntegrationProvider.META : IntegrationProvider.TIKTOK, type: IntegrationType.OAUTH },
    });

    if (integration) {
      integration.status = IntegrationStatus.INACTIVE;
      integration.access_token = null as any;
      integration.refresh_token = null as any;
        integration.expires_at = null as any;
        integration.connected_at = null as any;
        integration.page_access_token = null as any;
        integration.page_id = null as any;
        integration.page_name = null as any;
        integration.user_access_token = null as any;
        integration.webhook_status = null as any;

      integration.updated_at = new Date();
      await this.integrationRepository.save(integration);
      this.logger.log(`Disconnected ${provider} integration for user ${userId}`);
    }
  }

  /**
   * Get integration status for a user
   */
  async getIntegrationStatus(userId: number, integrationType?: string): Promise<any> {
    const whereClause: any = { user_id: userId, type: IntegrationType.OAUTH };

    const integrations = await this.integrationRepository.find({
      where: whereClause,
    });

    const status = {
      facebook: { connected: false },
      tiktok: { connected: false },
    };

    integrations.forEach(integration => {
      if (integration.provider === IntegrationProvider.META || integration.provider === 'facebook' as any) {
        status.facebook = {
          connected: integration.status === IntegrationStatus.CONNECTED,
          connected_at: integration.connected_at?.toISOString(),
          page_name: integration.page_name,
          page_id: integration.page_id,
          webhook_status: integration.webhook_status,
        } as any;
      }

      if (integration.provider === 'tiktok') {
        status.tiktok = {
          connected: integration.status === IntegrationStatus.CONNECTED,
          connected_at: integration.connected_at?.toISOString(),
        } as any;
      }
    });

    return status;
  }

  /**
   * Refresh access token if supported and needed
   */
  async refreshTokenIfNeeded(userId: number, provider: 'facebook' | 'tiktok' | 'meta'): Promise<void> {
    // Normalize 'facebook' to 'meta'
    const normalizedProvider = provider === 'facebook' ? 'meta' : provider;

    const integration = await this.integrationRepository.findOne({
      where: { user_id: userId, provider: normalizedProvider === 'meta' ? IntegrationProvider.META : IntegrationProvider.TIKTOK, type: IntegrationType.OAUTH },
    });

    if (!integration || !integration.refresh_token || !integration.expires_at) {
      return; // No refresh token or no expiration info
    }

    // Check if token expires within the next hour
    const expiresSoon = new Date(integration.expires_at).getTime() - Date.now() < 60 * 60 * 1000;

    if (!expiresSoon) {
      return; // Token is still valid
    }

    try {
      if (provider === 'facebook') {
        // Facebook doesn't support refresh tokens in the standard OAuth flow
        return;
      }

      if (provider === 'tiktok') {
        this.logger.debug('TikTok token refresh is handled by TikTokIntegrationService.');
        return;
      }
    } catch (error) {
      this.logger.error(`Failed to refresh ${provider} token for user ${userId}: ${error.message}`);
      // Mark integration as error state
      integration.status = IntegrationStatus.ERROR;
      await this.integrationRepository.save(integration);
    }
  }

  /**
   * Verify webhook endpoint
   */
  async verifyWebhook(source: string, token?: string): Promise<boolean> {
    try {
      // Basic verification logic - can be extended for specific providers
      if (source === 'facebook' || source === 'meta') {
        // Facebook webhook verification
        const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || process.env.FB_VERIFY_TOKEN;
        return token === verifyToken;
      } else if (source === 'tiktok') {
        // TikTok webhook verification - implement as needed
        return true; // Placeholder
      } else {
        // For other sources, check if integration exists
        const integration = await this.getIntegrationBySlug(source);
        return !!integration;
      }
    } catch (error) {
      this.logger.error(`Webhook verification failed for ${source}:`, error.message);
      return false;
    }
  }

  /**
   * WordPress Integration Methods
   */

  /**
   * Get WordPress sites
   */
  async getWordPressSites(): Promise<Integration[]> {
    return this.integrationRepository.find({
      where: { type: IntegrationType.WORDPRESS },
      order: { created_at: 'DESC' }
    });
  }

  /**
   * ✅ Get External Website integrations
   */
  async getExternalWebsites(): Promise<Integration[]> {
    return this.integrationRepository.find({
      where: { type: IntegrationType.EXTERNAL_WEBSITE },
      order: { created_at: 'DESC' }
    });
  }

  /**
   * Create WordPress site
   */
  async createWordPressSite(data: { name: string; url: string; apiKey: string }): Promise<Integration> {
    this.logger.log(`Creating WordPress site: ${data.name} at ${data.url}`);

    const integration = await this.createIntegration({
      provider: IntegrationProvider.WORDPRESS,  // ✅ Set provider
      name: data.name,
      url: data.url,
      type: IntegrationType.WORDPRESS,  // ✅ Use enum
      status: IntegrationStatus.ACTIVE,  // ✅ Use enum
      api_key: data.apiKey || undefined,  // ✅ Optional API key (will be auto-generated if not provided)
    });

    this.logger.log(`✅ WordPress site created successfully: ID ${integration.id}, auth_token: ${integration.auth_token?.substring(0, 10)}...`);

    return integration;
  }

  /**
   * Get WordPress forms (mock implementation - would need a separate entity)
   */
  async getWordPressForms(siteId?: number): Promise<any[]> {
    // Mock implementation - in production, this would query a wordpress_forms table
    // For now, return empty array as frontend has mock data
    return [];
  }

  /**
   * Create WordPress form mapping (mock implementation)
   */
  async createWordPressForm(data: { wordpress_site_id: number; form_id: string; name: string; fields_mapping: Record<string, string> }): Promise<any> {
    // Mock implementation - in production, this would create a wordpress form mapping
    // For now, return a mock object
    return {
      id: Date.now(),
      wordpress_site_id: data.wordpress_site_id,
      form_id: data.form_id,
      name: data.name,
      fields_mapping: data.fields_mapping,
      status: 'active',
      created_at: new Date().toISOString(),
      submissions_count: 0
    };
  }

  /**
   * Get integration metrics
   */
  async getIntegrationMetrics(params: { userId?: number; timeframe?: string }): Promise<any> {
    try {
      const { userId, timeframe = '30d' } = params;

      // Calculate date range based on timeframe
      const now = new Date();
      const startDate = new Date();

      switch (timeframe) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 30);
      }

      // Build query conditions
      const whereClause: any = {};
      if (userId) {
        whereClause.user_id = userId;
      }

      // Get all integrations
      const integrations = await this.integrationRepository.find({
        where: whereClause,
      });

      // Calculate metrics
      const totalIntegrations = integrations.length;
      const activeIntegrations = integrations.filter(
        (i) => i.status === IntegrationStatus.ACTIVE || i.status === IntegrationStatus.CONNECTED
      ).length;
      const errorIntegrations = integrations.filter(
        (i) => i.status === IntegrationStatus.ERROR
      ).length;

      // Group by provider
      const byProvider: Record<string, number> = {};
      integrations.forEach((integration) => {
        const provider = integration.provider || 'other';
        byProvider[provider] = (byProvider[provider] || 0) + 1;
      });

      // Calculate total leads from integrations
      const totalLeads = integrations.reduce(
        (sum, integration) => sum + (integration.leads_count || 0),
        0
      );

      return {
        total: totalIntegrations,
        active: activeIntegrations,
        error: errorIntegrations,
        inactive: totalIntegrations - activeIntegrations - errorIntegrations,
        byProvider,
        totalLeads,
        timeframe,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting integration metrics:', error.message);
      return {
        total: 0,
        active: 0,
        error: 0,
        inactive: 0,
        byProvider: {},
        totalLeads: 0,
        timeframe: params.timeframe || '30d',
      };
    }
  }
}
