import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Deal } from '../entities/deals.entity';
import { Lead } from '../entities/leads.entity';
import { Campaign } from '../entities/campaigns.entity';
import { AdSpend } from '../entities/ad-spend.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(AdSpend)
    private adSpendRepository: Repository<AdSpend>,
  ) {}

  async getAdminDashboard(id: number) {
    // Admin sees all transactions (deals) and leads
    const totalTransactions = await this.dealRepository.count();
    const totalLeads = await this.leadRepository.count();
    const wonDeals = await this.dealRepository.count({ where: { won: true } });

    // Get total ad spend (from ad_spend table) - handle if table doesn't exist
    let totalSpend = 0;
    try {
      const totalSpendResult = await this.adSpendRepository
        .createQueryBuilder('spend')
        .select('SUM(spend.spend)', 'total')
        .getRawOne();
      totalSpend = parseFloat(totalSpendResult?.total || '0');
    } catch (error) {
      // If ad_spend table doesn't exist, default to 0
      console.log('Ad spend table not available, defaulting to 0');
      totalSpend = 0;
    }

    // Calculate cost per lead: total ad spend / total leads (traditional CPL)
    const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(2) : '0.00';

    return {
      dashboardData: {
        totalTransactions,
        totalLeads,
        wonDeals,
        conversionRate: parseFloat(conversionRate),
        costPerLead: Math.round(costPerLead * 100) / 100, // Round to 2 decimal places
        message: 'Admin dashboard - showing all data',
      },
    };
  }

  async getManagerDashboard(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['team']
    });

    if (!user || user.role !== UserRole.MANAGER) {
      throw new Error('Manager not found');
    }

    // Manager sees only data for leads owned by team members
    // Get all user IDs in the manager's team
    const teamUserIds = user.team_id
      ? (await this.userRepository.find({ where: { team_id: user.team_id } })).map(u => u.id)
      : [user.id];

    const totalTransactions = await this.dealRepository
      .createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .where('lead.owner_user_id IN (:...teamUserIds)', { teamUserIds })
      .getCount();

    const totalLeads = await this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.owner_user_id IN (:...teamUserIds)', { teamUserIds })
      .getCount();

    const wonDeals = await this.dealRepository
      .createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .where('lead.owner_user_id IN (:...teamUserIds) AND deal.won = true', { teamUserIds })
      .getCount();

    const conversionRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(2) : '0.00';

    return {
      dashboardData: {
        totalTransactions,
        totalLeads,
        wonDeals,
        conversionRate: parseFloat(conversionRate),
        message: 'Manager dashboard - showing team data only',
      },
    };
  }

  async getMarketingDashboard(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['team']
    });

    if (!user || user.role !== UserRole.MARKETING) {
      throw new Error('Marketing user not found');
    }

    // Marketing sees only data for leads owned by team members
    const teamUserIds = user.team_id
      ? (await this.userRepository.find({ where: { team_id: user.team_id } })).map(u => u.id)
      : [user.id];

    const totalTransactions = await this.dealRepository
      .createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .where('lead.owner_user_id IN (:...teamUserIds)', { teamUserIds })
      .getCount();

    const totalLeads = await this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.owner_user_id IN (:...teamUserIds)', { teamUserIds })
      .getCount();

    const wonDeals = await this.dealRepository
      .createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .where('lead.owner_user_id IN (:...teamUserIds) AND deal.won = true', { teamUserIds })
      .getCount();

    const conversionRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(2) : '0.00';

    return {
      dashboardData: {
        totalTransactions,
        totalLeads,
        wonDeals,
        conversionRate: parseFloat(conversionRate),
        message: 'Marketing dashboard - showing team data only',
      },
    };
  }

  async getSalesDashboard(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['team']
    });

    if (!user || user.role !== UserRole.SALES) {
      throw new Error('Sales user not found');
    }

    // Sales sees only data for leads owned by team members
    const teamUserIds = user.team_id
      ? (await this.userRepository.find({ where: { team_id: user.team_id } })).map(u => u.id)
      : [user.id];

    const totalTransactions = await this.dealRepository
      .createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .where('lead.owner_user_id IN (:...teamUserIds)', { teamUserIds })
      .getCount();

    const totalLeads = await this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.owner_user_id IN (:...teamUserIds)', { teamUserIds })
      .getCount();

    const wonDeals = await this.dealRepository
      .createQueryBuilder('deal')
      .leftJoin('deal.lead', 'lead')
      .where('lead.owner_user_id IN (:...teamUserIds) AND deal.won = true', { teamUserIds })
      .getCount();

    const conversionRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(2) : '0.00';

    return {
      dashboardData: {
        totalTransactions,
        totalLeads,
        wonDeals,
        conversionRate: parseFloat(conversionRate),
        message: 'Sales dashboard - showing team data only',
      },
    };
  }

  async getStaleLeads(currentUser: any, thresholdHours = 4) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const parsedRole = (Object.values(UserRole) as string[]).includes(user.role)
      ? (user.role as UserRole)
      : UserRole.SALES;

    const shouldScopeLeads = ![UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(parsedRole);
    const ownerIds = shouldScopeLeads ? await this.resolveTeamMemberIds(user) : null;

    const thresholdDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    const buildQuery = () => {
      const qb = this.leadRepository.createQueryBuilder('lead');
      qb.where('COALESCE(lead.updated_at, lead.created_at) <= :threshold', { threshold: thresholdDate });
      if (ownerIds && ownerIds.length > 0) {
        qb.andWhere('lead.owner_user_id IN (:...ownerIds)', { ownerIds });
      }
      return qb;
    };

    const count = await buildQuery().getCount();
    const oldestLead = await buildQuery()
      .orderBy('COALESCE(lead.updated_at, lead.created_at)', 'ASC')
      .limit(1)
      .getOne();

    return {
      staleLeadsCount: count,
      thresholdHours,
      oldestLeadUpdatedAt: oldestLead?.updated_at
        ? oldestLead.updated_at.toISOString()
        : oldestLead?.created_at
        ? oldestLead.created_at.toISOString()
        : null,
    };
  }

  private async resolveTeamMemberIds(user: User): Promise<number[]> {
    if (!user.team_id) {
      return [user.id];
    }

    const members = await this.userRepository.find({
      where: { team_id: user.team_id },
      select: ['id'],
    });

    if (!members.length) {
      return [user.id];
    }

    return members.map((member) => member.id);
  }
}
