// src/integrations/google-integration.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationProvider, IntegrationStatus, IntegrationType } from '../entities/integrations.entity';
import axios from 'axios';

@Injectable()
export class GoogleIntegrationService {
  private readonly logger = new Logger(GoogleIntegrationService.name);

  constructor(
    @InjectRepository(Integration)
    private integrationRepository: Repository<Integration>,
  ) {}

  /**
   * Get Google OAuth configuration
   */
  private getConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
    const redirectUri = `${backendUrl}/api/integrations/google/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured');
    }

    return { backendUrl, clientId, clientSecret, redirectUri, scopes };
  }

  /**
   * Build Google OAuth URL
   */
  getOAuthUrl(userId?: number) {
    const { clientId, redirectUri, scopes } = this.getConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });

    if (userId) {
      params.set('state', String(userId));
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange Google code for token:', error.response?.data || error.message);
      throw new BadRequestException('Failed to exchange authorization code');
    }
  }

  /**
   * Get user info from Google
   */
  private async getUserInfo(accessToken: string) {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch Google user info:', error.message);
      return null;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state?: string) {
    try {
      const config = this.getConfig();

      // Exchange code for tokens
      const tokenData = await this.exchangeCodeForToken(code, config.clientId, config.clientSecret, config.redirectUri);

      if (!tokenData?.access_token) {
        throw new Error('No access token returned from Google');
      }

      // Get user info
      const userInfo = await this.getUserInfo(tokenData.access_token);

      // Parse user ID from state
      const userId = state ? parseInt(state, 10) || null : null;

      // Calculate expiration
      const expiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

      // Save integration
      const integrationData: Partial<Integration> = {
        provider: IntegrationProvider.GOOGLE,
        name: `Google Ads - ${userInfo?.email || 'Account'}`,
        type: IntegrationType.OAUTH,
        status: IntegrationStatus.CONNECTED,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt || undefined,
        user_id: userId || undefined,
        created_by: userId || undefined,
        extra: {
          email: userInfo?.email,
          name: userInfo?.name,
          picture: userInfo?.picture,
          scope: tokenData.scope,
        },
      };

      const integration = this.integrationRepository.create(integrationData);
      await this.integrationRepository.save(integration);

      this.logger.log(`Google Ads integration created for user ${userId}`);
      return integration;
    } catch (err) {
      this.logger.error('Google callback failed:', err.message);
      throw new BadRequestException(`Google callback failed: ${err.message}`);
    }
  }

  /**
   * Get Google integration status for a user
   */
  async getStatus(userId: number) {
    const integration = await this.integrationRepository.findOne({
      where: {
        user_id: userId,
        provider: IntegrationProvider.GOOGLE
      },
      order: { created_at: 'DESC' },
    });

    return {
      connected: !!integration?.access_token,
      email: integration?.extra?.email,
      name: integration?.extra?.name,
      expires_at: integration?.expires_at,
    };
  }
}
