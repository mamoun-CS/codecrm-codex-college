import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, SelectQueryBuilder } from 'typeorm';
import { Lead } from '../entities/leads.entity';
import { Deal } from '../entities/deals.entity';
import { Campaign } from '../entities/campaigns.entity';
import { User, UserRole } from '../entities/user.entity';
import { LeadTouchpoint, LeadTouchpointEvent } from '../entities/activities.entity';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MARKETING]: 3, // Same level as admin
  [UserRole.MANAGER]: 2,
  [UserRole.SALES]: 1,
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
    // @InjectRepository(AdSpend)
    // private adSpendRepository: Repository<AdSpend>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(LeadTouchpoint)
    private landingPageTrackingRepository: Repository<LeadTouchpoint>,
  ) {}

  private isPrivilegedRole(role: UserRole) {
    return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN || role === UserRole.MARKETING;
  }

  private applyLeadFilters(
    query: SelectQueryBuilder<Lead>,
    currentUser: any,
    options: { alias?: string; ownerAlias?: string; includeUnassigned?: boolean } = {}
  ) {
    const alias = options.alias ?? 'lead';
    const ownerAlias = options.ownerAlias ?? 'owner';
    const includeUnassigned = options.includeUnassigned ?? false;

    if (!this.isPrivilegedRole(currentUser.role) && currentUser.country) {
      query.andWhere(`${alias}.country = :country`, { country: currentUser.country });
    }

    if (this.isPrivilegedRole(currentUser.role)) {
      return query;
    }

    if (currentUser.role === UserRole.MANAGER) {
      if (currentUser.team_id) {
        // Managers can see leads owned by users in their team (NOT unassigned leads)
        query.andWhere(`${ownerAlias}.team_id = :teamId`, { teamId: currentUser.team_id });
      } else {
        query.andWhere(`${alias}.owner_user_id = :userId`, { userId: currentUser.id });
      }
    } else {
      query.andWhere(`${alias}.owner_user_id = :userId`, { userId: currentUser.id });
    }

    return query;
  }

  private applyDealFilters(
    query: SelectQueryBuilder<Deal>,
    currentUser: any,
    options: { leadAlias?: string; ownerAlias?: string } = {}
  ) {
    const leadAlias = options.leadAlias ?? 'lead';
    const ownerAlias = options.ownerAlias ?? 'owner';

    if (!this.isPrivilegedRole(currentUser.role) && currentUser.country) {
      query.andWhere(`${leadAlias}.country = :country`, { country: currentUser.country });
    }

    if (this.isPrivilegedRole(currentUser.role)) {
      return query;
    }

    if (currentUser.role === UserRole.MANAGER && currentUser.team_id) {
      // Managers can see deals for leads owned by users in their team (NOT unassigned leads)
      query.andWhere(`${ownerAlias}.team_id = :teamId`, {
        teamId: currentUser.team_id,
      });
    } else {
      query.andWhere(`${leadAlias}.owner_user_id = :userId`, { userId: currentUser.id });
    }

    return query;
  }

  private applyCampaignFilters(
    query: SelectQueryBuilder<any>,
    currentUser: any,
    campaignAlias = 'campaign'
  ) {
    if (currentUser.country) {
      query.andWhere(`(${campaignAlias}.country = :country OR ${campaignAlias}.country IS NULL)`, {
        country: currentUser.country,
      });
    }

    if (this.isPrivilegedRole(currentUser.role)) {
      return query;
    }

    if (currentUser.role === UserRole.MANAGER && currentUser.team_id) {
      query.andWhere(
        `(${campaignAlias}.created_by IN (SELECT id FROM users WHERE team_id = :teamId) OR ${campaignAlias}.created_by IS NULL)`,
        { teamId: currentUser.team_id },
      );
    } else {
      query.andWhere(`${campaignAlias}.created_by = :userId`, { userId: currentUser.id });
    }

    return query;
  }

  // Get dashboard overview metrics
  async getDashboardOverview(currentUser: any, dateRange?: { start: Date; end: Date }) {
    const dateFilter = dateRange ? Between(dateRange.start, dateRange.end) : undefined;

    // Get leads count with role-based filtering
    const leadsQuery = this.leadRepository.createQueryBuilder('lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team');

    this.applyLeadFilters(leadsQuery, currentUser, { includeUnassigned: true });

    if (dateFilter) {
      leadsQuery.andWhere({ created_at: dateFilter });
    }

    const totalLeads = await leadsQuery.getCount();

    // Get deals count
    const dealsQuery = this.dealRepository.createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team');

    this.applyDealFilters(dealsQuery, currentUser, { leadAlias: 'lead', ownerAlias: 'owner' });

    const totalDeals = await dealsQuery.getCount();
    const wonDeals = await dealsQuery.andWhere('deal.won = true').getCount();

    // Get total ad spend - temporarily disabled until ad_spend table is created
    // const spendQuery = this.adSpendRepository.createQueryBuilder('spend')
    //   .leftJoin('spend.campaign', 'campaign')
    //   .leftJoin('campaign.adSource', 'adSource');

    // this.applyCampaignFilters(spendQuery, currentUser);

    // if (dateFilter) {
    //   spendQuery.andWhere({ date: dateFilter });
    // }

    // const totalSpend = await spendQuery
    //   .select('SUM(spend.spend)', 'total')
    //   .getRawOne();

    const totalSpend = { total: '0' }; // Mock data

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? (wonDeals / totalLeads) * 100 : 0;

    // Calculate cost per lead
    const costPerLead = totalLeads > 0 ? parseFloat(totalSpend?.total || '0') / totalLeads : 0;

    return {
      totalLeads,
      totalDeals,
      wonDeals,
      totalSpend: parseFloat(totalSpend?.total || '0'),
      conversionRate: Math.round(conversionRate * 100) / 100,
      costPerLead: Math.round(costPerLead * 100) / 100,
    };
  }

  // Get leads by source breakdown
  async getLeadsBySource(currentUser: any, dateRange?: { start: Date; end: Date }) {
    const query = this.leadRepository.createQueryBuilder('lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .select('lead.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lead.source');

    this.applyLeadFilters(query, currentUser, { includeUnassigned: true });

    if (dateRange) {
      query.andWhere('lead.created_at BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end
      });
    }

    const results = await query.getRawMany();
    return results.map(row => ({
      source: row.source || 'Unknown',
      count: parseInt(row.count),
    }));
  }

  // Get cost per lead by campaign
  async getCostPerLeadByCampaign(currentUser: any, dateRange?: { start: Date; end: Date }) {
    const leadsQuery = this.leadRepository.createQueryBuilder('lead')
      .leftJoin('lead.campaign', 'campaign')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .select('campaign.name', 'campaignName')
      .addSelect('COUNT(*)', 'leadCount')
      .where('lead.campaign_id IS NOT NULL')
      .groupBy('campaign.id, campaign.name');

    this.applyLeadFilters(leadsQuery, currentUser, { includeUnassigned: true });

    if (dateRange) {
      leadsQuery.andWhere('lead.created_at BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end
      });
    }

    const leadsByCampaign = await leadsQuery.getRawMany();

    // const spendQuery = this.adSpendRepository.createQueryBuilder('spend')
    //   .leftJoin('spend.campaign', 'campaign')
    //   .select('campaign.name', 'campaignName')
    //   .addSelect('SUM(spend.spend)', 'totalSpend')
    //   .groupBy('campaign.id, campaign.name');

    // this.applyCampaignFilters(spendQuery, currentUser);

    // this.applyCampaignFilters(spendQuery, currentUser);

    // if (dateRange) {
    //   spendQuery.andWhere('spend.date BETWEEN :start AND :end', {
    //     start: dateRange.start,
    //     end: dateRange.end
    //   });
    // }

    // const spendByCampaign = await spendQuery.getRawMany();

    const spendByCampaign = []; // Mock data

    // Combine data
    const campaignMap = new Map<string, { campaign: string; leads: number; spend: number; costPerLead: number }>();

    leadsByCampaign.forEach(row => {
      campaignMap.set(row.campaignName, {
        campaign: row.campaignName,
        leads: parseInt(row.leadCount),
        spend: 0,
        costPerLead: 0,
      });
    });

    // spendByCampaign.forEach(row => {
    //   const spend = parseFloat(row.totalSpend || '0');
    //   const existing = campaignMap.get(row.campaignName);
    //   if (existing) {
    //     existing.spend = spend;
    //     existing.costPerLead = existing.leads > 0 ? existing.spend / existing.leads : 0;
    //     return;
    //   }
    //   campaignMap.set(row.campaignName, {
    //     campaign: row.campaignName,
    //     leads: 0,
    //     spend,
    //     costPerLead: 0,
    //   });
    // });

    return Array.from(campaignMap.values()).map(item => ({
      ...item,
      costPerLead: Math.round(item.costPerLead * 100) / 100,
    }));
  }

  // Get pipeline conversion rates
  async getPipelineConversion(currentUser: any) {
    // Get all deals with their stages
    const dealsQuery = this.dealRepository.createQueryBuilder('deal')
      .leftJoin('deal.stage', 'stage')
      .leftJoin('deal.lead', 'lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .select('stage.name', 'stageName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('stage.id, stage.name')
      .orderBy('stage.order', 'ASC');

    this.applyDealFilters(dealsQuery, currentUser, { leadAlias: 'lead', ownerAlias: 'owner' });

    const stageCounts = await dealsQuery.getRawMany();

    // Get won deals
    const wonQuery = this.dealRepository.createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .where('deal.won = true');

    this.applyDealFilters(wonQuery, currentUser, { leadAlias: 'lead', ownerAlias: 'owner' });

    const wonCount = await wonQuery.getCount();

    return {
      stages: stageCounts.map(row => ({
        stage: row.stageName,
        count: parseInt(row.count),
      })),
      wonDeals: wonCount,
    };
  }

  // Get team performance
  async getTeamPerformance(currentUser: any, dateRange?: { start: Date; end: Date }) {
    try {
      // Query leads directly and join with users
      const query = this.leadRepository
        .createQueryBuilder('leads')
        .leftJoin('leads.owner', 'user')
        .select([
          'user.id as user_id',
          'user.name as user_name',
          'user.email as user_email',
          'COUNT(leads.id) as leads_count'
        ])
        .where('user.role IN (:...roles)', { roles: ['sales', 'manager'] })
        .groupBy('user.id, user.name, user.email');

      if (dateRange) {
        query.andWhere('leads.created_at BETWEEN :start AND :end', {
          start: dateRange.start,
          end: dateRange.end
        });
      }

      const teamPerformance = await query.getRawMany();

      return teamPerformance.map(user => ({
        user_name: user.user_name,
        user_email: user.user_email,
        leads_count: parseInt(user.leads_count) || 0,
      }));
    } catch (error) {
      console.error('Error in getTeamPerformance:', error);
      // Return empty array as fallback
      return [];
    }
  }

  // Get daily leads trend
  async getLeadsTrend(currentUser: any, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = this.leadRepository.createQueryBuilder('lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .select("DATE(lead.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('lead.created_at >= :startDate', { startDate })
      .groupBy("DATE(lead.created_at)")
      .orderBy("DATE(lead.created_at)", 'ASC');

    this.applyLeadFilters(query, currentUser, { includeUnassigned: true });

    const results = await query.getRawMany();

    return results.map(row => ({
      date: row.date,
      count: parseInt(row.count),
    }));
  }

  // Get campaign ROI
  async getCampaignROI(currentUser: any, dateRange?: { start: Date; end: Date }) {
    const dealsQuery = this.dealRepository.createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .leftJoin('lead.campaign', 'campaign')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .select('campaign.name', 'campaignName')
      .addSelect('SUM(deal.amount)', 'revenue')
      .addSelect('COUNT(deal.id)', 'dealCount')
      .where('deal.won = true')
      .andWhere('deal.amount IS NOT NULL')
      .groupBy('campaign.id, campaign.name');

    this.applyDealFilters(dealsQuery, currentUser, { leadAlias: 'lead', ownerAlias: 'owner' });

    if (dateRange) {
      dealsQuery.andWhere('deal.created_at BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end
      });
    }

    const revenueByCampaign = await dealsQuery.getRawMany();

    // Get spend by campaign - temporarily disabled
    // const spendQuery = this.adSpendRepository.createQueryBuilder('spend')
    //   .leftJoin('spend.campaign', 'campaign')
    //   .select('campaign.name', 'campaignName')
    //   .addSelect('SUM(spend.spend)', 'totalSpend')
    //   .groupBy('campaign.id, campaign.name');

    // if (dateRange) {
    //   spendQuery.andWhere('spend.date BETWEEN :start AND :end', {
    //     start: dateRange.start,
    //     end: dateRange.end
    //   });
    // }

    // const spendByCampaign = await spendQuery.getRawMany();

    const spendByCampaign = []; // Mock data

    // Combine data
    const campaignMap = new Map();

    revenueByCampaign.forEach(row => {
      campaignMap.set(row.campaignName, {
        campaign: row.campaignName,
        revenue: parseFloat(row.revenue || '0'),
        deals: parseInt(row.dealCount),
        spend: 0,
        roi: 0,
      });
    });

    // spendByCampaign.forEach(row => {
    //   const existing = campaignMap.get(row.campaignName);
    //   const spend = parseFloat(row.totalSpend || '0');
    //   if (existing) {
    //     existing.spend = spend;
    //     existing.roi = spend > 0 ? ((existing.revenue - spend) / spend) * 100 : 0;
    //   } else {
    //     campaignMap.set(row.campaignName, {
    //       campaign: row.campaignName,
    //       revenue: 0,
    //       deals: 0,
    //       spend,
    //       roi: 0,
    //     });
    //   }
    // });

    return Array.from(campaignMap.values()).map(item => ({
      ...item,
      roi: Math.round(item.roi * 100) / 100,
    }));
  }

  // Send notification email for new leads
  async sendLeadNotification(data: { leadId: number; email: string; subject: string; message: string }) {
    // This is a placeholder for email notification functionality
    // In a real implementation, you would integrate with an email service like SendGrid, Mailgun, etc.
    console.log('📧 Sending notification email:', {
      to: data.email,
      subject: data.subject,
      message: data.message,
      leadId: data.leadId,
    });

    // For now, just return success
    return {
      success: true,
      message: 'Notification sent successfully',
      leadId: data.leadId,
    };
  }

  // Get leads summary (today, this week, this month)
  async getLeadsSummary(currentUser: any) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's leads
    const todayQuery = this.leadRepository.createQueryBuilder('lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .where('lead.created_at >= :today', { today });

    this.applyLeadFilters(todayQuery, currentUser, { includeUnassigned: true });

    // This week's leads
    const weekQuery = this.leadRepository.createQueryBuilder('lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .where('lead.created_at >= :weekStart', { weekStart });

    this.applyLeadFilters(weekQuery, currentUser, { includeUnassigned: true });

    // This month's leads
    const monthQuery = this.leadRepository.createQueryBuilder('lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .where('lead.created_at >= :monthStart', { monthStart });

    this.applyLeadFilters(monthQuery, currentUser, { includeUnassigned: true });

    const [todayCount, weekCount, monthCount] = await Promise.all([
      todayQuery.getCount(),
      weekQuery.getCount(),
      monthQuery.getCount()
    ]);

    return {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount
    };
  }

  // Get successful leads (converted to customers)
  async getSuccessfulLeads(currentUser: any) {
    const query = this.dealRepository.createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.team', 'team')
      .where('deal.won = true');

    this.applyDealFilters(query, currentUser, { leadAlias: 'lead', ownerAlias: 'owner' });

    const count = await query.getCount();

    return {
      count,
      message: 'Total successful leads converted to customers'
    };
  }

  // Landing page tracking methods
  async trackVisit(data: { campaign?: string; ip?: string; country?: string; userAgent?: string }) {
    const tracking = this.landingPageTrackingRepository.create({
      event_type: LeadTouchpointEvent.VIEW,
      campaign_name: data.campaign,
      ip_address: data.ip,
      country: data.country,
      user_agent: data.userAgent,
    });

    // Try to find campaign by name
    if (data.campaign) {
      const campaign = await this.campaignRepository.findOne({ where: { name: data.campaign } });
      if (campaign) {
        tracking.campaign_id = campaign.id;
      }
    }

    return this.landingPageTrackingRepository.save(tracking);
  }

  async trackSubmit(data: { campaign?: string; leadId?: number; ip?: string; country?: string }) {
    const tracking = this.landingPageTrackingRepository.create({
      event_type: LeadTouchpointEvent.SUBMIT,
      campaign_name: data.campaign,
      ip_address: data.ip,
      country: data.country,
      additional_data: { leadId: data.leadId },
    });

    // Try to find campaign by name
    if (data.campaign) {
      const campaign = await this.campaignRepository.findOne({ where: { name: data.campaign } });
      if (campaign) {
        tracking.campaign_id = campaign.id;
      }
    }

    return this.landingPageTrackingRepository.save(tracking);
  }

  async getLandingPageStats(currentUser: any, campaign?: string, dateRange?: { start: Date; end: Date }) {
    const query = this.landingPageTrackingRepository.createQueryBuilder('tracking')
      .leftJoin('tracking.campaign', 'campaign');

    // Apply campaign filter if specified
    if (campaign) {
      query.andWhere('tracking.campaign_name = :campaign', { campaign });
    }

    // Apply date range filter
    if (dateRange) {
      query.andWhere('tracking.created_at BETWEEN :start AND :end', {
        start: dateRange.start,
        end: dateRange.end
      });
    }

    this.applyCampaignFilters(query, currentUser, 'campaign');

    // Get total visits
    const visitsQuery = query.clone().andWhere('tracking.event_type = :visitType', {
      visitType: LeadTouchpointEvent.VIEW
    });
    const totalVisits = await visitsQuery.getCount();

    // Get total submissions
    const submitsQuery = query.clone().andWhere('tracking.event_type = :submitType', {
      submitType: LeadTouchpointEvent.SUBMIT
    });
    const totalSubmissions = await submitsQuery.getCount();

    // Calculate conversion rate
    const conversionRate = totalVisits > 0 ? (totalSubmissions / totalVisits) * 100 : 0;

    // Get visits by campaign
    const visitsByCampaign = await visitsQuery
      .select('tracking.campaign_name', 'campaign')
      .addSelect('COUNT(*)', 'visits')
      .groupBy('tracking.campaign_name')
      .getRawMany();

    // Get submissions by campaign
    const submissionsByCampaign = await submitsQuery
      .select('tracking.campaign_name', 'campaign')
      .addSelect('COUNT(*)', 'submissions')
      .groupBy('tracking.campaign_name')
      .getRawMany();

    // Combine campaign data
    const campaignStats = visitsByCampaign.map(visit => {
      const submit = submissionsByCampaign.find(s => s.campaign === visit.campaign);
      const visits = parseInt(visit.visits);
      const submissions = submit ? parseInt(submit.submissions) : 0;
      return {
        campaign: visit.campaign || 'Unknown',
        visits,
        submissions,
        conversionRate: visits > 0 ? (submissions / visits) * 100 : 0,
      };
    });

    // Get top countries
    const topCountries = await visitsQuery
      .select('tracking.country', 'country')
      .addSelect('COUNT(*)', 'count')
      .groupBy('tracking.country')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Get recent leads (from submissions)
    const recentLeads = await this.landingPageTrackingRepository.createQueryBuilder('tracking')
      .leftJoin('tracking.campaign', 'campaign')
      .select('tracking.campaign_name', 'campaign')
      .addSelect('tracking.country', 'country')
      .addSelect('tracking.created_at', 'date')
      .addSelect('tracking.additional_data', 'additionalData')
      .where('tracking.event_type = :submitType', { submitType: LeadTouchpointEvent.SUBMIT })
      .orderBy('tracking.created_at', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalVisits,
      totalSubmissions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      campaignStats,
      topCountries: topCountries.map(row => ({
        country: row.country || 'Unknown',
        count: parseInt(row.count),
      })),
      recentLeads: recentLeads.map(row => ({
        campaign: row.campaign || 'Unknown',
        country: row.country || 'Unknown',
        date: row.date,
        leadId: row.additionalData?.leadId,
      })),
    };
  }
}
