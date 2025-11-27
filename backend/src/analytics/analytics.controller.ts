import { Controller, Get, Query, UseGuards, Request, Post, Body, UseInterceptors } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { UserScopedCacheInterceptor } from '../common/interceptors/user-cache.interceptor';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(30)
  getDashboardOverview(
    @Request() req,
    @Query() query: { startDate?: string; endDate?: string }
  ) {
    const dateRange = query.startDate && query.endDate ? {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    } : undefined;

    return this.analyticsService.getDashboardOverview(req.user, dateRange);
  }

  @Get('leads-by-source')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(60)
  getLeadsBySource(
    @Request() req,
    @Query() query: { startDate?: string; endDate?: string }
  ) {
    const dateRange = query.startDate && query.endDate ? {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    } : undefined;

    return this.analyticsService.getLeadsBySource(req.user, dateRange);
  }

  @Get('cost-per-lead')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(60)
  getCostPerLeadByCampaign(
    @Request() req,
    @Query() query: { startDate?: string; endDate?: string }
  ) {
    const dateRange = query.startDate && query.endDate ? {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    } : undefined;

    return this.analyticsService.getCostPerLeadByCampaign(req.user, dateRange);
  }

  @Get('pipeline-conversion')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(45)
  getPipelineConversion(@Request() req) {
    return this.analyticsService.getPipelineConversion(req.user);
  }

  @Get('team-performance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(45)
  getTeamPerformance(
    @Request() req,
    @Query() query: { startDate?: string; endDate?: string }
  ) {
    const dateRange = query.startDate && query.endDate ? {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    } : undefined;

    return this.analyticsService.getTeamPerformance(req.user, dateRange);
  }

  @Get('leads-trend')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(30)
  getLeadsTrend(
    @Request() req,
    @Query('days') days: string = '30'
  ) {
    return this.analyticsService.getLeadsTrend(req.user, parseInt(days));
  }

  @Get('campaign-roi')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(60)
  getCampaignROI(
    @Request() req,
    @Query() query: { startDate?: string; endDate?: string }
  ) {
    const dateRange = query.startDate && query.endDate ? {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    } : undefined;

    return this.analyticsService.getCampaignROI(req.user, dateRange);
  }

  @Get('leads-summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(45)
  getLeadsSummary(@Request() req) {
    return this.analyticsService.getLeadsSummary(req.user);
  }

  @Get('successful-leads')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(45)
  getSuccessfulLeads(@Request() req) {
    return this.analyticsService.getSuccessfulLeads(req.user);
  }

  // Landing page tracking endpoints
  @Post('tracking/visit')
  async trackVisit(@Body() body: { campaign?: string; ip?: string; country?: string }) {
    return this.analyticsService.trackVisit(body);
  }

  @Post('tracking/submit')
  async trackSubmit(@Body() body: { campaign?: string; leadId?: number; ip?: string; country?: string }) {
    return this.analyticsService.trackSubmit(body);
  }

  @Get('landing-page-stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(UserScopedCacheInterceptor)
  @CacheTTL(60)
  getLandingPageStats(
    @Request() req,
    @Query() query: { campaign?: string; startDate?: string; endDate?: string }
  ) {
    const dateRange = query.startDate && query.endDate ? {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    } : undefined;

    return this.analyticsService.getLandingPageStats(req.user, query.campaign, dateRange);
  }

  @Post('send-notification')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  async sendLeadNotification(@Body() body: { leadId: number; email: string; subject: string; message: string }) {
    return this.analyticsService.sendLeadNotification(body);
  }
}
