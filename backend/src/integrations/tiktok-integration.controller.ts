import { Body, Controller, Get, Headers, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { TikTokIntegrationService } from './tiktok-integration.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { TikTokFormsQueryDto } from './dto/tiktok.dto';

@Controller('integrations/tiktok')
export class TikTokIntegrationController {
  constructor(private readonly tiktokService: TikTokIntegrationService) {}

  @UseGuards(JwtAuthGuard)
  @Get('oauth-url')
  async getOauthUrl(@Req() req: any) {
    const { url } = this.tiktokService.buildOAuthUrl(req.user.id);
    return { url };
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = (process.env.FRONTEND_URL || process.env.CRM_DOMAIN || 'http://localhost:3000').replace(/\/$/, '');

    try {
      if (error) {
        return res.redirect(`${frontendUrl}/integrations-new/callback?status=error&message=${encodeURIComponent(error)}`);
      }
      if (!code) {
        return res.redirect(`${frontendUrl}/integrations-new/callback?status=error&message=missing_code`);
      }

      await this.tiktokService.handleCallback(code, state);
      return res.redirect(`${frontendUrl}/integrations-new/callback?status=success`);
    } catch (e) {
      return res.redirect(`${frontendUrl}/integrations-new/callback?status=error&message=${encodeURIComponent(e.message)}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async status(@Req() req: any) {
    return this.tiktokService.getStatus(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('advertisers')
  async advertisers(@Req() req: any) {
    return this.tiktokService.listAdvertisers(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('forms')
  async forms(@Req() req: any, @Query() query: TikTokFormsQueryDto) {
    return this.tiktokService.listForms(req.user.id, query);
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Body() payload: any,
    @Headers('x-tiktok-signature') sig?: string,
    @Headers('tt-signature') altSig?: string,
  ) {
    return this.tiktokService.handleWebhook(payload, sig || altSig);
  }
}
