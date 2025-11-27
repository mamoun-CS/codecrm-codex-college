import {
  Controller,
  Post,
  Body,
  Logger,
  Headers,
  Param,
  Get,
  Patch,
  Delete,
  Req,
  UnauthorizedException,
  BadRequestException,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { IntegrationsService } from './integrations.service';
import { LeadsService } from '../leads/leads.service';
import { FacebookIntegrationService } from './facebook-integration.service';
import type { AdSourceLeadData, IntegrationResult } from './integrations.service';
import type { Request } from 'express';
import { User, UserRole } from '../entities/user.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { Integration, IntegrationType, IntegrationProvider, IntegrationStatus } from '../entities/integrations.entity';

@ApiTags('Integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly leadsService: LeadsService,
    private readonly facebookIntegrationService: FacebookIntegrationService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List integrations with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'platform_type', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by integration name or slug',
  })
  @ApiOkResponse({
    description: 'Paginated list of integrations',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(Integration) },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 25 },
            total: { type: 'number', example: 10 },
            hasNextPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  async listIntegrations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('platform_type') platformType?: string,
    @Query('provider') provider?: string,
    @Query('search') search?: string,
  ) {
    try {
      const integrations = await this.integrationsService.getAllIntegrations();
      let filtered = integrations;
      if (status) {
        filtered = filtered.filter(
          (integration) => integration.status === status,
        );
      }
      if (platformType) {
        filtered = filtered.filter(
          (integration) => integration.provider === platformType,
        );
      }
      if (provider) {
        filtered = filtered.filter(
          (integration) => integration.provider === provider,
        );
      }
      if (search) {
        const normalized = search.toLowerCase();
        filtered = filtered.filter(
          (integration) =>
            integration.name?.toLowerCase().includes(normalized) ||
            integration.slug?.toLowerCase().includes(normalized),
        );
      }

      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const start = (Math.max(page, 1) - 1) * safeLimit;
      const data = filtered.slice(start, start + safeLimit);

      return {
        data,
        meta: {
          page: Math.max(page, 1),
          limit: safeLimit,
          total: filtered.length,
          hasNextPage: start + safeLimit < filtered.length,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching integrations:', error.message);
      throw error;
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Get integration details' })
  @ApiOkResponse({ type: Integration })
  @ApiNotFoundResponse({
    schema: {
      example: { statusCode: 404, message: 'Integration not found' },
    },
  })
  async getIntegration(@Param('id', ParseIntPipe) id: number) {
    return this.integrationsService.getIntegrationById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create integration' })
  @ApiCreatedResponse({ type: Integration })
  @ApiBadRequestResponse({
    schema: {
      example: {
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
      },
    },
  })
  async createIntegration(@Body() dto: CreateIntegrationDto) {
    return this.integrationsService.createIntegration(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update integration' })
  @ApiOkResponse({ type: Integration })
  async updateIntegration(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIntegrationDto,
  ) {
    return this.integrationsService.updateIntegration(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete integration' })
  @ApiOkResponse({
    description: 'Integration removed',
    schema: { example: { success: true } },
  })
  async deleteIntegration(@Param('id', ParseIntPipe) id: number) {
    await this.integrationsService.deleteIntegration(id);
    return { success: true };
  }

  /**
   * Get leads for a specific integration
   * GET /integrations/:id/leads
   */
  @Get(':id/leads')
  @Public()
  async getIntegrationLeads(@Param('id', ParseIntPipe) id: number) {
    const leads = await this.integrationsService.getLeadsForIntegration(id);
    const count = leads.length;

    return {
      integration_id: id,
      leads_count: count,
      leads: leads,
    };
  }

  /**
   * Google Ads webhook endpoint
   * 
   * POST /integrations/google-ads
   */
  @Post(['google-ads', 'google'])
  @Public()
  async handleGoogleAdsWebhook(
    @Body() data: any,
    @Headers() headers: Record<string, string>,
  ): Promise<IntegrationResult> {
    this.logger.log('Received Google Ads webhook');

    try {
      const leadData = this.transformGoogleAdsData(data);
      return await this.integrationsService.processGoogleAdsLead(leadData);
    } catch (error) {
      this.logger.error(`Google Ads webhook error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        processing_time_ms: 0,
      };
    }
  }

  /**
   * Meta (Facebook) webhook endpoint
   * POST /integrations/meta
   */
  @Get('meta')
  @Public()
  async verifyMetaWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    if (mode === 'subscribe' && verifyToken === (process.env.FACEBOOK_VERIFY_TOKEN || process.env.FB_VERIFY_TOKEN)) {
      return challenge;
    }

    this.logger.warn('Invalid Meta webhook verification attempt');
    throw new UnauthorizedException('Invalid verify token');
  }

  @Post('meta')
  @Public()
  async handleMetaWebhook(
    @Body() data: any,
    @Headers() headers: Record<string, string>,
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    this.logger.log('🔗 Received Meta webhook');

    try {
      // Extract lead change data from webhook payload
      const metaChange: any = this.extractMetaLeadChange(data) || {};

      // DEBUG: Log webhook payload details
      this.logger.log(`📋 Meta webhook payload: page_id=${metaChange.page_id}, leadgen_id=${metaChange.leadgen_id}, form_id=${metaChange.form_id}, ad_id=${metaChange.ad_id}`);

      // CRITICAL: Try to get page_id from webhook, with fallback logic
      let targetPageId = metaChange.page_id;

      if (!targetPageId && metaChange.leadgen_id) {
        // Fallback: Try to fetch the lead to get page_id from Facebook API
        try {
          this.logger.log(`🔄 Missing page_id in webhook, fetching lead ${metaChange.leadgen_id} to get page_id`);
          const fullLead = await this.integrationsService.fetchFacebookLead(metaChange.leadgen_id);
          targetPageId = fullLead.page_id;
          this.logger.log(`✅ Retrieved page_id ${targetPageId} from Facebook API`);
        } catch (fetchError) {
          this.logger.error(`❌ Could not fetch page_id from Facebook API: ${fetchError.message}`);
        }
      }

      if (!targetPageId) {
        this.logger.error('❌ Meta webhook missing page_id and could not retrieve from API');
        return {
          success: false,
          error: 'Missing page_id in webhook payload and could not retrieve from Facebook API',
          processing_time_ms: Date.now() - startTime,
        };
      }

      // Find the Facebook integration for this page
      const integration = await this.integrationsService.findIntegrationByMetaWebhook(targetPageId, metaChange.leadgen_id);

      if (!integration) {
        // DEBUG: List all integrations for troubleshooting
        const allIntegrations = await this.integrationsService.getAllIntegrations();
        this.logger.error(`❌ No Facebook integration found for page_id: ${targetPageId}`);
        this.logger.error(`📋 Available integrations (${allIntegrations.length} total):`);

        allIntegrations.forEach((i, index) => {
          this.logger.error(`  ${index + 1}. ID:${i.id}, Provider:${i.provider}, Type:${i.type}, PageID:${i.page_id}, Status:${i.status}, Name:${i.name}`);
        });

        // Try to find any Facebook integrations regardless of status
        const facebookIntegrations = allIntegrations.filter(i => i.provider === 'facebook');
        if (facebookIntegrations.length > 0) {
          this.logger.error(`⚠️ Found ${facebookIntegrations.length} Facebook integrations, but none match page_id ${targetPageId}`);
          facebookIntegrations.forEach((i, index) => {
            this.logger.error(`  FB${index + 1}. ID:${i.id}, PageID:${i.page_id}, Status:${i.status}, PageToken:${!!i.page_access_token}`);
          });
        } else {
          this.logger.error(`❌ No Facebook integrations found in database at all!`);
        }

        return {
          success: false,
          error: `Integration not found for page_id: ${targetPageId}. Check OAuth setup and database.`,
          processing_time_ms: Date.now() - startTime,
        };
      }

      this.logger.log(`✅ Found integration for page ${targetPageId}: ${integration.name} (ID: ${integration.id})`);

      let payload = data;

      // Try to fetch full lead data from Facebook API
      if (metaChange.leadgen_id) {
        try {
          this.logger.log(`🔍 Fetching full lead data for leadgen_id: ${metaChange.leadgen_id}`);
          payload = await this.integrationsService.fetchFacebookLead(metaChange.leadgen_id, metaChange.page_id);
          payload.form_id = payload.form_id || metaChange.form_id;
          payload.campaign_id = payload.campaign_id || metaChange.campaign_id;
          payload.ad_id = payload.ad_id || metaChange.ad_id || metaChange.adgroup_id;
          this.logger.log(`✅ Successfully fetched full lead data`);
        } catch (fetchError) {
          this.logger.error(`⚠️ Meta lead fetch error: ${fetchError.message} - using webhook data instead`);
          payload = metaChange;
        }
      }

      // Transform and process the lead
      const leadData = this.transformMetaData({ ...payload, ...metaChange });
      leadData.full_name = leadData.full_name || 'Meta Lead';

      // ✅ CRITICAL: Link lead to integration for proper leads_count tracking
      leadData.website_id = integration.id;

      this.logger.log(`🚀 Processing Meta lead: ${leadData.full_name} (${leadData.email || 'no email'}) for integration ID: ${integration.id}`);

      const result = await this.integrationsService.processMetaLead(leadData);

      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ Meta webhook processed successfully in ${processingTime}ms (Lead ID: ${result.lead_id})`);

      return {
        ...result,
        processing_time_ms: processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Meta webhook error: ${error.message}`);

      return {
        success: false,
        error: error.message,
        processing_time_ms: processingTime,
      };
    }
  }

  /**
   * Generic webhook endpoint for all sources (secure)
   * POST /integrations/webhook/:source
   */
  @Post('webhook/:source')
  @Public()
  async handleWebhook(
    @Body() body: any,
    @Headers('x-auth-token') authToken: string,
    @Headers('x-api-key') apiKey: string,
    @Headers() headers: Record<string, string>,
    @Param('source') source: string,
  ): Promise<IntegrationResult> {
    const start = Date.now();
    this.logger.log(`🔗 Webhook received from ${source}`);

    try {
      // Get integration by slug
      const integration = await this.integrationsService.getIntegrationBySlug(source);
      if (!integration) {
        throw new UnauthorizedException('Integration not found');
      }

      // Validate authentication - accept either x-auth-token or x-api-key
      const providedToken = authToken || apiKey;
      const isValidAuthToken = integration.auth_token && integration.auth_token === providedToken;
      const isValidApiKey = integration.api_key && integration.api_key === providedToken;

      if (!providedToken || (!isValidAuthToken && !isValidApiKey)) {
        this.logger.error(`❌ Authentication failed for ${source}: provided=${providedToken?.substring(0, 10)}..., auth_token=${integration.auth_token?.substring(0, 10)}..., api_key=${integration.api_key?.substring(0, 10)}...`);
        throw new UnauthorizedException('Invalid authentication credentials');
      }

      this.logger.log(`✅ Authentication successful for ${source}`);


      let leadData: AdSourceLeadData | null = null;

      if (['meta', 'facebook'].includes(source.toLowerCase())) {
        const metaChange = (this.extractMetaLeadChange(body) || {}) as any;
        if (metaChange.leadgen_id) {
          try {
            const fullLead = await this.integrationsService.fetchFacebookLead(metaChange.leadgen_id, metaChange.page_id || integration.page_id);
            leadData = this.transformMetaData({ ...fullLead, ...metaChange });
          } catch (fetchError) {
            this.logger.error(`Failed to fetch Meta lead ${metaChange.leadgen_id}: ${fetchError.message}`);
            leadData = this.transformMetaData({ ...metaChange });
          }
        }
      }

      if (!leadData) {
        leadData = this.transformWebhookData(source, body, headers);
      }

      // Create lead using service and link to integration
      const lead = await this.leadsService.create({
        full_name: leadData.full_name || 'Unknown',
        email: leadData.email || undefined,
        phone: leadData.phone || undefined,
        country: leadData.country || undefined,
        source: source,
        campaign_id: leadData.campaign_id,
        utm_source: leadData.utm_source,
        utm_medium: leadData.utm_medium,
        utm_campaign: leadData.utm_campaign,
        website_id: integration.id, // ✅ Link lead to integration
      }, null); // No current user for integrations

      // ✅ Increment leads_count for this integration
      await this.integrationsService.incrementLeadsCount(integration.id);

      const processingTime = Date.now() - start;
      this.logger.log(`✅ Lead created from ${source} in ${processingTime}ms (ID: ${lead.id})`);

      return {
        success: true,
        lead_id: lead.id,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - start;
      this.logger.error(`❌ Webhook processing error for ${source}: ${error.message}`);

      return {
        success: false,
        error: error.message,
        processing_time_ms: processingTime,
      };
    }
  }

  /**
   * Website form submission endpoint
   * POST /integrations/website
   */
 /* @Post('website')
  @Public()
  async handleWebsiteSubmission(@Body() data: any): Promise<IntegrationResult> {
    this.logger.log('Received website form submission');

    try {
      const leadData = this.transformWebsiteData(data);
      return await this.integrationsService.processWebsiteLead(leadData);
    } catch (error) {
      this.logger.error(`Website submission error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        processing_time_ms: 0,
      };
    }
  }*/

    /**
 * Website form submission endpoint
 * POST /integrations/website
 */
@Post('website')
@Public()
async handleWebsiteSubmission(
  @Body() data: any,
  @Headers('x-auth-token') authToken: string,
): Promise<IntegrationResult> {
  this.logger.log('🌐 Received website form submission');

  // تحقق من وجود التوكن
  if (!authToken) {
    this.logger.warn('❌ Missing x-auth-token header');
    return {
      success: false,
      error: 'Missing authentication token in headers',
      processing_time_ms: 0,
    };
  }

  try {
    // ✅ تحقق من صحة التوكن من جدول الـ integrations
    const integration = await this.integrationsService.getIntegrationByAuthToken(authToken);

    // ✅ Accept both EXTERNAL_WEBSITE and WORDPRESS types
    if (!integration || (integration.type !== IntegrationType.EXTERNAL_WEBSITE && integration.type !== IntegrationType.WORDPRESS)) {
      this.logger.warn(`❌ Invalid or unknown auth token: ${authToken}`);
      return {
        success: false,
        error: 'Invalid authentication token',
        processing_time_ms: 0,
      };
    }

    // ✅ حوّل البيانات القادمة من الموقع إلى تنسيق lead
    const leadData = this.transformWebsiteData(data);

    // ✅ مرّر اسم الموقع أو معرفه إلى leadData
    leadData.source = integration.name;
    leadData.website_id = integration.id;

    // ✅ عالج lead
    return await this.integrationsService.processWebsiteLead(leadData, integration);
  } catch (error) {
    this.logger.error(`❌ Website submission error: ${error.message}`);
    return {
      success: false,
      error: error.message,
      processing_time_ms: 0,
    };
  }
}


  /**
   * External API endpoint
   * POST /integrations/external-api
   */
  @Post('external-api')
  @Public()
  async handleExternalAPI(@Body() data: AdSourceLeadData): Promise<IntegrationResult> {
    this.logger.log('Received external API lead');

    try {
      return await this.integrationsService.processExternalAPILead(data);
    } catch (error) {
      this.logger.error(`External API error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        processing_time_ms: 0,
      };
    }
  }

  /**
   * Get performance metrics
   * GET /integrations/metrics
   */
  @Get('metrics')
  @Public()
  async getMetrics(
    @Query('userId') userId?: string,
    @Query('timeframe') timeframe?: string,
  ) {
    try {
      // Validate userId if provided
      if (userId && isNaN(Number(userId))) {
        return {
          error: 'User ID must be a number',
          statusCode: 400,
        };
      }

      // Get metrics from service
      const metrics = await this.integrationsService.getIntegrationMetrics({
        userId: userId ? Number(userId) : undefined,
        timeframe: timeframe || '30d',
      });

      return metrics;
    } catch (error) {
      this.logger.error('Error fetching integration metrics:', error.message);
      return {
        error: 'Failed to fetch integration metrics',
        details: error.message,
        statusCode: 500,
      };
    }
  }

  /**
   * Reset performance metrics
   * POST /integrations/metrics/reset
   */
  @Post('metrics/reset')
  async resetMetrics() {
    // this.integrationsService.resetMetrics(); // Method does not exist
    return { message: 'Metrics reset endpoint not implemented' };
  }


  /**
   * Get Facebook OAuth URL
   * GET /integrations/facebook/oauth-url
   */
  @Get('facebook/oauth-url')
  @UseGuards(JwtAuthGuard)
  async getFacebookAuthUrl(@Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user?.id) {
        return { error: 'User not authenticated' };
      }

      // Generate state parameter with user ID for secure callback identification
      const state = this.generateOAuthState(user.id);
      const url = this.integrationsService.getAuthUrl('facebook', state);
      return { url };
    } catch (error) {
      this.logger.error('Failed to get Facebook auth URL:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Facebook OAuth callback
   * GET /integrations/facebook/callback
   */
  @Get('facebook/callback')
  @Public()
  async handleFacebookCallback(@Query('code') code: string, @Query('error') error: string, @Req() req: Request) {
    try {
      if (error) {
        this.logger.error(`Facebook OAuth error: ${error}`);
        return this.redirectWithError('/integrations', `Facebook OAuth failed: ${error}`);
      }

      if (!code) {
        return this.redirectWithError('/integrations', 'No authorization code received from Facebook');
      }

      // For OAuth callbacks, we need to handle user identification differently
      // This is a simplified implementation - in production, you'd use state parameter
      // to securely identify the user who initiated the OAuth flow
      const userId = this.extractUserIdFromState(req);
      if (!userId) {
        return this.redirectWithError('/integrations', 'Invalid OAuth state - user not identified');
      }

      await this.integrationsService.handleCallback('facebook', code, userId);
      return this.redirectWithSuccess('/integrations', 'Facebook integration connected successfully');
    } catch (error) {
      this.logger.error('Facebook OAuth callback error:', error.message);
      return this.redirectWithError('/integrations', `Facebook integration failed: ${error.message}`);
    }
  }

  /**
   * Get OAuth integration status for current user
   * GET /integrations/status
   */
  @Get('status')
  @Public()
  async getOAuthStatus(
    @Req() req: Request,
    @Query('userId') userId?: string,
    @Query('integrationType') integrationType?: string,
  ) {
    try {
      // Get user ID from request or query parameter
      const user = req.user as any;
      let targetUserId: number | undefined;

      if (userId) {
        // Validate userId if provided as query parameter
        if (isNaN(Number(userId))) {
          return {
            error: 'User ID must be a number',
            statusCode: 400,
          };
        }
        targetUserId = Number(userId);
      } else if (user?.id) {
        targetUserId = user.id;
      }

      if (!targetUserId) {
        return {
          facebook: { connected: false },
          tiktok: { connected: false },
          google: { connected: false },
        };
      }

      return await this.integrationsService.getIntegrationStatus(
        targetUserId,
        integrationType,
      );
    } catch (error) {
      this.logger.error('Failed to get integration status:', error.message);
      return {
        facebook: { connected: false },
        tiktok: { connected: false },
        google: { connected: false },
        error: error.message,
      };
    }
  }

  /**
   * Disconnect OAuth integration
   * POST /integrations/disconnect
   */
  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnectIntegration(@Body() data: { provider: 'facebook' | 'tiktok' }, @Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user?.id) {
        return { success: false, error: 'User not authenticated' };
      }

      await this.integrationsService.disconnectIntegration(user.id, data.provider);
      return { success: true, message: `${data.provider} integration disconnected` };
    } catch (error) {
      this.logger.error(`Failed to disconnect ${data.provider} integration:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Meta (Facebook) integration status
   * GET /integrations/meta/status
   */
  @Get('meta/status')
  @UseGuards(JwtAuthGuard)
  async getMetaStatus(@Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user?.id) {
        return {
          connected: false,
          pages: [],
          ad_accounts: [],
        };
      }

      return await this.facebookIntegrationService.getStatus(user.id);
    } catch (error) {
      this.logger.error('Failed to get Meta status:', error.message);
      return {
        connected: false,
        pages: [],
        ad_accounts: [],
      };
    }
  }

  /**
   * Get Meta (Facebook) ad accounts
   * GET /integrations/meta/accounts
   */
  @Get('meta/accounts')
  @UseGuards(JwtAuthGuard)
  async getMetaAdAccounts(@Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user?.id) {
        return [];
      }

      return await this.facebookIntegrationService.getAdAccounts(user.id);
    } catch (error) {
      this.logger.error('Failed to get Meta ad accounts:', error.message);
      return [];
    }
  }

  /**
   * Get Meta (Facebook) lead forms
   * GET /integrations/meta/forms?account_id=...
   *
   * ℹ️ NOTE: Meta Lead Forms are associated with PAGES, not Ad Accounts.
   * The account_id parameter is kept for API compatibility but forms are fetched from all connected pages.
   */
  @Get('meta/forms')
  @UseGuards(JwtAuthGuard)
  async getMetaForms(@Query('account_id') accountId: string, @Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user?.id) {
        return [];
      }

      // accountId is optional - forms are fetched from all connected pages
      return await this.facebookIntegrationService.getForms(accountId || '', user.id);
    } catch (error) {
      this.logger.error('Failed to get Meta forms:', error.message);
      return [];
    }
  }

  /**
   * Import leads from Meta form
   * GET /integrations/meta/import-leads?form_id=...
   */
  @Get('meta/import-leads')
  @UseGuards(JwtAuthGuard)
  async importMetaLeads(@Query('form_id') formId: string, @Req() req: Request) {
    try {
      const user = req.user as any;
      if (!user?.id || !formId) {
        return { imported: 0 };
      }

      return await this.facebookIntegrationService.importLeads(formId, user.id);
    } catch (error) {
      this.logger.error('Failed to import Meta leads:', error.message);
      return { imported: 0 };
    }
  }

  /**
   * Verify webhook endpoint
   * POST /integrations/verify-webhook
   */
  @Post('verify-webhook')
  @Public()
  async verifyWebhook(@Body() data: { source: string; token?: string }) {
    try {
      // Basic verification - in production, implement proper webhook verification
      const isValid = await this.integrationsService.verifyWebhook(data.source, data.token);
      return {
        success: isValid,
        message: isValid ? 'Webhook verified successfully' : 'Webhook verification failed'
      };
    } catch (error) {
      this.logger.error('Webhook verification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * WordPress Integration Endpoints
   */

  /**
   * Get WordPress sites
   * GET /integrations/wordpress/sites
   */
  @Get('wordpress/sites')
  @Public()
  async getWordPressSites() {
    try {
      this.logger.log('Fetching WordPress sites');
      const sites = await this.integrationsService.getWordPressSites();
      return sites || [];
    } catch (error) {
      this.logger.error('Error fetching WordPress sites:', error.message);
      return [];
    }
  }

  /**
   * ✅ Get External Website integrations
   * GET /integrations/external-websites
   */
  @Get('external-websites')
  @Public()
  async getExternalWebsites() {
    try {
      this.logger.log('✅ Fetching External Website integrations');
      const websites = await this.integrationsService.getExternalWebsites();
      return websites || [];
    } catch (error) {
      this.logger.error('Error fetching external websites:', error.message);
      return [];
    }
  }

  /**
   * Create WordPress site
   * POST /integrations/wordpress/site
   */
  @Post('wordpress/site')
  async createWordPressSite(@Body() data: { name: string; url: string; apiKey: string }) {
    return await this.integrationsService.createWordPressSite(data);
  }

  /**
   * Get WordPress forms
   * GET /integrations/wordpress/forms
   */
  @Get('wordpress/forms')
  async getWordPressForms(@Query('site_id') siteId?: string) {
    return await this.integrationsService.getWordPressForms(siteId ? +siteId : undefined);
  }

  /**
   * Create WordPress form mapping
   * POST /integrations/wordpress/form
   */
  @Post('wordpress/form')
  async createWordPressForm(@Body() data: { wordpress_site_id: number; form_id: string; name: string; fields_mapping: Record<string, string> }) {
    return await this.integrationsService.createWordPressForm(data);
  }


  /**
   * Helper method to redirect with success message
   */
  private redirectWithSuccess(redirectUrl: string, message: string) {
    // In a real implementation, you'd redirect to frontend with success parameter
    // For now, we'll return a simple response
    return {
      success: true,
      message: message,
      redirect_url: `${redirectUrl}?success=true&message=${encodeURIComponent(message)}`
    };
  }

  /**
   * Helper method to redirect with error message
   */
  private redirectWithError(redirectUrl: string, error: string) {
    return {
      success: false,
      error: error,
      redirect_url: `${redirectUrl}?error=true&message=${encodeURIComponent(error)}`
    };
  }

  /**
   * Generate OAuth state parameter with user ID
   */
  private generateOAuthState(userId: number): string {
    // In production, you'd encrypt this or use a more secure method
    // For now, we'll use a simple base64 encoding
    const stateData = { userId, timestamp: Date.now() };
    return Buffer.from(JSON.stringify(stateData)).toString('base64');
  }

  /**
   * Extract user ID from OAuth state parameter
   */
  private extractUserIdFromState(req: Request): number | null {
    const state = req.query.state as string;
    if (!state) return null;

    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      // Check if state is not too old (within 10 minutes)
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        return null;
      }
      return stateData.userId;
    } catch (error) {
      this.logger.error('Failed to decode OAuth state:', error);
      return null;
    }
  }


  /**
   * Register new website integration
   * POST /integrations/register-website
   * ✅ Creates external_website type (not wordpress)
   */
  @Post('register-website')
  @Public()
  async registerWebsite(@Body() data: { name: string; url: string; userId?: number }) {
    try {
      this.logger.log(`✅ Registering new EXTERNAL WEBSITE integration: ${data.name}`);

      // Validate input
      if (!data.name) {
        throw new BadRequestException('Website name is required');
      }

      // ✅ Create integration with EXTERNAL_WEBSITE type (not wordpress)
      const integration = await this.integrationsService.createIntegration({
        name: data.name,
        url: data.url,
        provider: IntegrationProvider.EXTERNAL_WEBSITE,
        type: IntegrationType.EXTERNAL_WEBSITE,
        status: IntegrationStatus.ACTIVE,
        user_id: data.userId,
        created_by: data.userId,
      });

      this.logger.log(`Website integration created successfully: ID ${integration.id}`);

      // Return the response with api_key instead of auth_token
      return {
        success: true,
        api_url: process.env.CRM_DOMAIN || process.env.API_URL || 'http://localhost:3002',
        auth_token: integration.auth_token || integration.api_key,
        api_key: integration.api_key || integration.auth_token,
        integration_id: integration.id,
        endpoint_url: integration.endpoint_url,
        slug: integration.slug,
      };
    } catch (error) {
      this.logger.error('Error registering website integration:', error.message);
      this.logger.error('Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Generate API key for website integration
   * POST /integrations/generate-api-key
   */
  @Post('generate-api-key')
  async generateApiKey() {
    const apiKey = this.integrationsService.generateApiKey();
    return { api_key: apiKey };
  }

  /**
   * Extract Meta leadgen change from webhook payload
   */
  private extractMetaLeadChange(data: any) {
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

  /**
   * Transform webhook data based on source
   */
  private transformWebhookData(source: string, data: any, headers: Record<string, string>): AdSourceLeadData {
    switch (source.toLowerCase()) {
      case 'google':
      case 'google-ads':
        return this.transformGoogleAdsData(data);
      case 'meta':
      case 'facebook':
        if (data?.entry) {
          return this.transformMetaData({ ...(this.extractMetaLeadChange(data) || {}), ...data });
        }
        return this.transformMetaData(data);
      case 'website':
        return this.transformWebsiteData(data);
      default:
        // For custom slugs (like test223-1763938222631), treat as website data
        return this.transformWebsiteData(data);
    }
  }

  /**
   * Transform Google Ads webhook data
   */
  private transformGoogleAdsData(data: any): AdSourceLeadData {
    // Check if data is already in simple format (direct API call)
    if (data.full_name || data.email || data.phone) {
      return {
        full_name: data.full_name || data.name,
        phone: data.phone || data.phone_number,
        email: data.email,
        country: data.country,
        city: data.city,
        source: 'google_ads',
        campaign_id: data.campaign_id,
        utm_source: data.utm_source || 'google',
        utm_medium: data.utm_medium || 'cpc',
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        custom_fields: data,
      };
    }

    // Google Ads Lead Form Extensions webhook format
    return {
      full_name: data.user_column_data?.find((col: any) => col.column_id === 'FULL_NAME')?.string_value ||
                `${data.user_column_data?.find((col: any) => col.column_id === 'FIRST_NAME')?.string_value || ''} ${data.user_column_data?.find((col: any) => col.column_id === 'LAST_NAME')?.string_value || ''}`.trim(),
      phone: data.user_column_data?.find((col: any) => col.column_id === 'PHONE_NUMBER')?.string_value,
      email: data.user_column_data?.find((col: any) => col.column_id === 'EMAIL')?.string_value,
      country: data.user_column_data?.find((col: any) => col.column_id === 'COUNTRY')?.string_value,
      city: data.user_column_data?.find((col: any) => col.column_id === 'CITY')?.string_value,
      source: 'google_ads',
      ad_source_id: data.adgroup_id,
      ad_id: data.ad_id,
      form_id: data.form_id,
      lead_id: data.lead_id,
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: data.campaign_name,
      utm_term: data.keyword,
      utm_content: data.adgroup_name,
      custom_fields: data.user_column_data?.reduce((acc: any, col: any) => {
        acc[col.column_id] = col.string_value;
        return acc;
      }, {}),
    };
  }

  /**
   * Transform Meta (Facebook) webhook data
   */
  private transformMetaData(data: any): AdSourceLeadData {
    const change = this.extractMetaLeadChange(data);
    const lead = data.lead || data.value || data;

    const getFieldValue = (name: string) => {
      return lead.field_data?.find((field: any) => field.name === name)?.values?.[0] || lead[name];
    };

    const leadId = lead.id || lead.leadgen_id || change?.leadgen_id;
    const formId = lead.form_id || change?.form_id;
    const adId = lead.ad_id || change?.ad_id || change?.adgroup_id;
    const campaignId = lead.campaign_id || change?.campaign_id;

    const customFields = lead.field_data?.reduce((acc: any, field: any) => {
      acc[field.name] = field.values?.[0];
      return acc;
    }, {}) || lead.custom_fields;

    return {
      full_name: getFieldValue('full_name') || getFieldValue('name'),
      phone: getFieldValue('phone') || getFieldValue('phone_number'),
      email: getFieldValue('email'),
      country: getFieldValue('country'),
      city: getFieldValue('city'),
      source: 'facebook',
      ad_source_id: adId,
      ad_id: adId,
      adset_id: lead.adset_id,
      campaign_id: campaignId,
      form_id: formId,
      lead_id: leadId,
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: lead.campaign_name || campaignId,
      custom_fields: customFields,
    };
  }

  /**
   * Transform website form data
   */
  private transformWebsiteData(data: any): AdSourceLeadData {
    return {
      full_name: data.full_name || data.name,
      phone: data.phone || data.phone_number,
      email: data.email,
      country: data.country,
      city: data.city,
      language: data.language,
      source: 'website',
      campaign_id: data.campaign_id,
      utm_source: data.utm_source || 'website',
      utm_medium: data.utm_medium || 'organic',
      utm_campaign: data.utm_campaign,
      utm_term: data.utm_term,
      utm_content: data.utm_content,
      custom_fields: data,
    };
  }

  /**
   * ✅ Sync leads count for a specific integration
   * POST /integrations/:id/sync-leads-count
   */
  @Post(':id/sync-leads-count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Synchronize leads count for an integration' })
  @ApiOkResponse({ description: 'Leads count synchronized successfully' })
  async syncIntegrationLeadsCount(@Param('id', ParseIntPipe) id: number) {
    const actualCount = await this.integrationsService.syncIntegrationLeadsCount(id);
    return {
      success: true,
      integration_id: id,
      leads_count: actualCount,
      message: 'Leads count synchronized successfully'
    };
  }

  /**
   * ✅ Sync leads count for ALL integrations
   * POST /integrations/sync-all-leads-count
   */
  @Post('sync-all-leads-count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Synchronize leads count for all integrations' })
  @ApiOkResponse({ description: 'All integrations synchronized successfully' })
  async syncAllIntegrationsLeadsCount() {
    const result = await this.integrationsService.syncAllIntegrationsLeadsCount();
    return {
      success: true,
      ...result,
      message: `Synchronized ${result.synced} integrations, ${result.errors} errors`
    };
  }
}
