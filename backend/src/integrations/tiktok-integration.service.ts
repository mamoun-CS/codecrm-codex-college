import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHmac } from 'crypto';
import { TikTokIntegration } from '../entities/integrations.entity';
import { IntegrationsService, AdSourceLeadData } from './integrations.service';
import { TikTokFormsQueryDto } from './dto/tiktok.dto';
import { TikTokOAuthHelper } from './tiktok-oauth.helper';

interface TikTokTokenResult {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

@Injectable()
export class TikTokIntegrationService {
  private readonly logger = new Logger(TikTokIntegrationService.name);
  private readonly oauthHelper: TikTokOAuthHelper;

  constructor(
    @InjectRepository(TikTokIntegration)
    private readonly tiktokRepo: Repository<TikTokIntegration>,
    private readonly integrationsService: IntegrationsService,
  ) {
    const clientId = process.env.TIKTOK_CLIENT_ID;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${(process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '')}/api/integrations/tiktok/callback`;
    const stateSecret = process.env.TIKTOK_STATE_SECRET || process.env.JWT_SECRET || 'tiktok-state-secret';

    if (!clientId || !clientSecret) {
      this.logger.error('TikTok client credentials missing. Set TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET.');
    }
    this.oauthHelper = new TikTokOAuthHelper(clientId || '', clientSecret || '', redirectUri, stateSecret);
  }

  async getStatus(userId: number) {
    const record = await this.tiktokRepo.findOne({ where: { user_id: userId } });
    return {
      connected: !!record?.access_token,
      advertiser_ids: record?.advertiser_ids || [],
      expires_at: record?.expires_at,
    };
  }

  buildOAuthUrl(userId: number) {
    return this.oauthHelper.buildAuthUrl(userId);
  }

  async handleCallback(code: string, state: string) {
    const payload = this.oauthHelper.validateState(state);
    const userId = payload.userId;

    const tokenData = await this.exchangeCodeForToken(code);
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined;

    let record = await this.tiktokRepo.findOne({ where: { user_id: userId } });
    if (!record) {
      record = this.tiktokRepo.create({ user_id: userId });
    }
    record.access_token = tokenData.access_token;
    record.refresh_token = tokenData.refresh_token;
    if (expiresAt) {
      record.expires_at = expiresAt;
    }

    await this.tiktokRepo.save(record);

    const advertisers = await this.fetchAdvertisers(record);
    record.advertiser_ids = advertisers;
    await this.tiktokRepo.save(record);

    return { userId, advertisers };
  }

  async listForms(userId: number, query: TikTokFormsQueryDto) {
    const record = await this.requireIntegration(userId);
    const accessToken = await this.ensureValidToken(record);
    const forms = await this.getLeadForms(accessToken, query.advertiser_id);
    return forms;
  }

  async listAdvertisers(userId: number) {
    const record = await this.requireIntegration(userId);
    const advertisers = await this.fetchAdvertisers(record);
    return { advertisers };
  }

  async handleWebhook(payload: any, signature?: string) {
    const advertiserId = payload?.advertiser_id || payload?.data?.advertiser_id;
    if (!advertiserId) {
      throw new BadRequestException('Missing advertiser ID');
    }

    const tiktokIntegration = await this.findByAdvertiser(advertiserId);
    if (!tiktokIntegration) {
      throw new BadRequestException('No TikTok integration for this advertiser');
    }

    this.validateWebhookSignature(tiktokIntegration, payload, signature);

    const leadData = this.transformWebhookToLead(payload, advertiserId);

    // ✅ CRITICAL: Find the main Integration entity and link lead to it
    if (tiktokIntegration.user_id) {
      const mainIntegration = await this.integrationsService.findIntegrationByProvider(
        tiktokIntegration.user_id,
        'tiktok'
      );
      if (mainIntegration) {
        leadData.website_id = mainIntegration.id;
      }
    }

    return this.integrationsService.processTikTokLead(leadData);
  }

  // ---------- Helpers ----------

  private async requireIntegration(userId: number) {
    const record = await this.tiktokRepo.findOne({ where: { user_id: userId } });
    if (!record?.access_token) {
      throw new BadRequestException('TikTok is not connected for this user');
    }
    return record;
  }

  private async exchangeCodeForToken(code: string): Promise<TikTokTokenResult> {
    const clientId = process.env.TIKTOK_CLIENT_ID;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('TikTok client credentials not configured');

    const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_key: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} during token exchange`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(data.message || 'TikTok token exchange failed');

    return data.data as TikTokTokenResult;
  }

  private async refreshToken(refreshToken: string): Promise<TikTokTokenResult> {
    const clientId = process.env.TIKTOK_CLIENT_ID;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('TikTok client credentials not configured');

    const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/refresh_token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_key: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} during token refresh`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(data.message || 'TikTok refresh failed');

    return data.data as TikTokTokenResult;
  }

  private async ensureValidToken(record: TikTokIntegration): Promise<string> {
    if (record.expires_at && record.expires_at.getTime() - Date.now() > 5 * 60 * 1000) {
      return record.access_token as string;
    }
    if (!record.refresh_token) throw new UnauthorizedException('TikTok session expired, please reconnect');

    const refreshed = await this.refreshToken(record.refresh_token);
    record.access_token = refreshed.access_token;
    record.refresh_token = refreshed.refresh_token;
    if (refreshed.expires_in) {
      record.expires_at = new Date(Date.now() + refreshed.expires_in * 1000);
    }
    await this.tiktokRepo.save(record);
    return record.access_token as string;
  }

  private async fetchAdvertisers(record: TikTokIntegration): Promise<string[]> {
    const accessToken = await this.ensureValidToken(record);
    const response = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching advertisers`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(data.message || 'Failed to fetch advertisers');
    return (data.data?.list || []).map((a: any) => a.advertiser_id || a.id).filter(Boolean);
  }

  private async getLeadForms(accessToken: string, advertiserId: string) {
    const url = `https://business-api.tiktok.com/open_api/v1.3/leads/ad/get/?advertiser_id=${encodeURIComponent(advertiserId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching forms`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(data.message || 'Failed to fetch lead forms');
    return data.data?.list || [];
  }

  private async findByAdvertiser(advertiserId: string) {
    return this.tiktokRepo.createQueryBuilder('t')
      .where(`t.advertiser_ids::jsonb @> :aid`, { aid: JSON.stringify([advertiserId]) })
      .getOne();
  }

  private validateWebhookSignature(integration: TikTokIntegration, payload: any, signature?: string) {
    if (!signature) {
      this.logger.warn('TikTok webhook without signature header');
      return;
    }
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const secret = process.env.TIKTOK_WEBHOOK_SECRET || integration.refresh_token || '';
    const computed = createHmac('sha256', secret).update(body).digest('hex');
    if (computed !== signature) throw new UnauthorizedException('Invalid TikTok webhook signature');
  }

  private transformWebhookToLead(payload: any, advertiserId: string): AdSourceLeadData {
    const fields = payload?.data?.form_data?.fields || payload?.user || payload?.fields || [];
    const mapped: Record<string, any> = {};
    if (Array.isArray(fields)) {
      fields.forEach((f: any) => {
        const key = f?.name || f?.key;
        const value = f?.value ?? f?.string_value ?? f?.values?.[0];
        if (key) mapped[key] = value;
      });
    }

    const full_name = mapped.full_name || mapped.name || [mapped.first_name, mapped.last_name].filter(Boolean).join(' ') || 'TikTok Lead';

    return {
      full_name,
      phone: mapped.phone || mapped.phone_number,
      email: mapped.email,
      source: 'tiktok',
      advertiser_id: advertiserId,
      ad_source_id: advertiserId,
      form_id: payload?.data?.form_id || payload?.form_id,
      lead_id: payload?.data?.lead_id || payload?.lead_id,
      utm_source: 'tiktok',
      utm_medium: 'social',
      utm_campaign: mapped.campaign || mapped.campaign_name,
      custom_fields: mapped,
    };
  }
}
