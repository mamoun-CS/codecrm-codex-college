import { Controller, Get, Query, Req, Res, UseGuards, Post, Body, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { FacebookIntegrationService } from './facebook-integration.service';
import type { Request, Response } from 'express';

@Controller('integrations/meta')
export class FacebookIntegrationController {
  constructor(private readonly facebookService: FacebookIntegrationService) {}

  @Get('oauth-url')
  @UseGuards(JwtAuthGuard)
  async getOAuthUrl(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    const url = this.facebookService.getOAuthUrl(userId);
    return { url };
  }

  @Get('callback')
  @Public()
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response
  ) {
    const frontendUrl = (process.env.FRONTEND_URL || process.env.CRM_DOMAIN || 'http://localhost:3000').replace(/\/$/, '');

    try {
      if (error) {
        return res.redirect(`${frontendUrl}/integrations-new/callback?status=error&message=${encodeURIComponent(error)}`);
      }
      if (!code) {
        return res.redirect(`${frontendUrl}/integrations-new/callback?status=error&message=missing_code`);
      }

      await this.facebookService.handleCallback(code, state);
      return res.redirect(`${frontendUrl}/integrations-new/callback?status=success`);
    } catch (e) {
      return res.redirect(`${frontendUrl}/integrations-new/callback?status=error&message=${encodeURIComponent(e.message)}`);
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    return this.facebookService.getStatus(userId);
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async accounts(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    return this.facebookService.getAdAccounts(userId);
  }

  @Get('forms')
  @UseGuards(JwtAuthGuard)
  async forms(@Query('account_id') accountId: string, @Req() req: Request) {
    if (!accountId) {
      return [];
    }
    const userId = (req.user as any)?.id;
    return this.facebookService.getForms(accountId, userId);
  }

  @Get('import-leads')
  @UseGuards(JwtAuthGuard)
  async importLeads(@Query('form_id') formId: string, @Req() req: Request) {
    if (!formId) {
      throw new BadRequestException('form_id is required');
    }
    const userId = (req.user as any)?.id;
    return this.facebookService.importLeads(formId, userId);
  }

  @Get('webhook')
  @Public()
  verifyWebhook(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    return this.facebookService.verifyWebhook(mode, token, challenge);
  }

  @Post('webhook')
  @Public()
  async handleWebhook(@Body() payload: any) {
    return this.facebookService.handleWebhook(payload);
  }
}
