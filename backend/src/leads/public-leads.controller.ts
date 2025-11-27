import { Controller, Post, Body, Req } from '@nestjs/common';
import { LeadsService } from './leads.service';
import type { Request } from 'express';

@Controller('leads')
export class PublicLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('landing-page-submit')
  async createLeadFromLandingPage(
    @Body() data: any,
    @Req() req: Request,
  ) {
    try {
      return await this.leadsService.createFromLandingPage({ ...data, userIp: req.ip });
    } catch (error) {
      console.error('Landing page submission error:', error);
      throw error;
    }
  }
}
