// src/integrations/google-integration.controller.ts
import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { GoogleIntegrationService } from './google-integration.service';
import type { Request, Response } from 'express';

@Controller('integrations/google')
export class GoogleIntegrationController {
  constructor(private readonly googleService: GoogleIntegrationService) {}

  @Get('oauth-url')
  @UseGuards(JwtAuthGuard)
  async getOAuthUrl(@Req() req: Request) {
    const userId = (req.user as any)?.id;
    const url = this.googleService.getOAuthUrl(userId);
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

      await this.googleService.handleCallback(code, state);
      return res.redirect(`${frontendUrl}/integrations-new/callback?status=success`);
    } catch (e) {
      return res.redirect(`${frontendUrl}/integrations-new/callback?status=error&message=${encodeURIComponent(e.message)}`);
    }
  }

  @Get('status')
  @Public()
  async status(@Req() req: Request, @Query('userId') userIdParam?: string) {
    try {
      // Get user ID from request or query parameter
      const user = req.user as any;
      let userId: number | undefined;

      if (userIdParam) {
        // Validate userId if provided as query parameter
        if (isNaN(Number(userIdParam))) {
          return {
            connected: false,
            error: 'User ID must be a number',
          };
        }
        userId = Number(userIdParam);
      } else if (user?.id) {
        userId = user.id;
      }

      if (!userId) {
        return {
          connected: false,
          message: 'No user ID provided',
        };
      }

      return await this.googleService.getStatus(userId);
    } catch (error) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }
}
