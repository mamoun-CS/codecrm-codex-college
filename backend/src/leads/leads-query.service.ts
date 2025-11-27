import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Repository, Brackets } from 'typeorm';
import { Lead } from '../entities/leads.entity';
import { UserRole } from '../entities/user.entity';
import { GetLeadsDto } from './dto/get-leads.dto';
import { LeadListItem, PaginatedLeadsResponse } from './dto/paginated-leads.response';

@Injectable()
export class LeadsQueryService {
  private readonly logger = new Logger(LeadsQueryService.name);
  private readonly MAX_LIMIT = 100;

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async getLeads(currentUser: any, query: GetLeadsDto): Promise<PaginatedLeadsResponse> {
    const limit = Math.min(query.limit ?? 25, this.MAX_LIMIT);
    const page = query.page ?? 1;

    const cacheKey = this.buildCacheKey(currentUser?.id, { ...query, limit, page });

    if (query.useCache !== false) {
      const cached = await this.cacheManager.get<PaginatedLeadsResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // FIXED: Removed non-existent columns (platform_source, archived_at, archive_reason, team_id, transfer_to_user_id)
    // These columns don't exist in the actual database schema
    const qb = this.leadRepository
      .createQueryBuilder('lead')
      .select([
        'lead.id',
        'lead.full_name',
        'lead.phone',
        'lead.email',
        'lead.country',
        'lead.city',
        'lead.language',
        'lead.source',
        'lead.status',
        'lead.created_at',
        'lead.updated_at',
        'lead.owner_user_id',
        'lead.campaign_id',
        'lead.assigned_to',
        'owner.id',
        'owner.name',
        'campaign.id',
        'campaign.name',
      ])
      .leftJoinAndSelect('lead.owner', 'owner')
      .leftJoin('owner.team', 'ownerTeam')
      .leftJoinAndSelect('lead.campaign', 'campaign')
      .skip(limit * (page - 1))
      .take(limit);

    const sortColumn = this.resolveSortColumn(query.sortBy);
    const sortDirection = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, sortDirection).addOrderBy('lead.id', 'DESC');

    this.applyRoleFilters(qb, currentUser, query.includeUnassigned ?? true);
    this.applyQueryFilters(qb, query);

    const [leads, total] = await qb.getManyAndCount();
    const payloadLeads = leads.map((lead) => this.mapLeadToListItem(lead));
    const payload: PaginatedLeadsResponse = {
      data: payloadLeads,
      leads: payloadLeads,
      meta: {
        page,
        limit,
        total,
        hasNextPage: page * limit < total,
      },
    };

    if (query.useCache !== false) {
      await this.cacheManager.set(cacheKey, payload, 10_000);
    }

    return payload;
  }

  private applyRoleFilters(qb: ReturnType<Repository<Lead>['createQueryBuilder']>, currentUser: any, includeUnassigned: boolean) {
    if (!currentUser) {
      qb.andWhere('1 = 0');
      return;
    }

    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (currentUser.country) {
      qb.andWhere('lead.country = :country', { country: currentUser.country });
    }

    if (currentUser.role === UserRole.MANAGER) {
      // Managers can see leads owned by users in their team (NOT unassigned leads)
      if (currentUser.team_id) {
        qb.andWhere('owner.team_id = :teamId', { teamId: currentUser.team_id });
      }
      return;
    }

    if ([UserRole.SALES, UserRole.MARKETING].includes(currentUser.role)) {
      // FIXED: Removed reference to transfer_to_user_id (doesn't exist in schema)
      qb.andWhere('lead.owner_user_id = :userId', { userId: currentUser.id });
    }
  }

  private applyQueryFilters(qb: ReturnType<Repository<Lead>['createQueryBuilder']>, filters: GetLeadsDto) {
    if (filters.status) {
      qb.andWhere('lead.status = :status', { status: filters.status });
    }

    if (filters.source) {
      qb.andWhere('lead.source = :source', { source: filters.source });
    }

    // FIXED: Removed platform_source filter (column doesn't exist)
    // Platform source is now consolidated into the 'source' field
    if (filters.platform_source) {
      // Map platform_source to source for backward compatibility
      qb.andWhere('lead.source = :source', { source: filters.platform_source });
    }

    if (filters.campaign_id) {
      qb.andWhere('lead.campaign_id = :campaignId', { campaignId: filters.campaign_id });
    }

    if (filters.owner_user_id) {
      // FIXED: Removed reference to transfer_to_user_id (doesn't exist in schema)
      qb.andWhere('lead.owner_user_id = :owner', { owner: filters.owner_user_id });
    }

    if (filters.owner) {
      const ownerFilter = filters.owner.toLowerCase();
      if (ownerFilter === 'unassigned') {
        qb.andWhere('lead.owner_user_id IS NULL');
      } else {
        qb.andWhere('owner.name ILIKE :ownerName', { ownerName: `%${filters.owner}%` });
      }
    }

    if (filters.language) {
      qb.andWhere('lead.language = :language', { language: filters.language });
    }

    if (filters.country) {
      qb.andWhere('lead.country = :countryFilter', { countryFilter: filters.country });
    }

    const dateFrom = this.resolveDate(filters.startDate || filters.start_date);
    if (dateFrom) {
      qb.andWhere('lead.created_at >= :dateFrom', { dateFrom });
    }

    const dateTo = this.resolveDate(filters.endDate || filters.end_date);
    if (dateTo) {
      qb.andWhere('lead.created_at <= :dateTo', { dateTo });
    }

    if (filters.email) {
      qb.andWhere('lead.email ILIKE :email', { email: `%${filters.email}%` });
    }

    if (filters.phone) {
      qb.andWhere('lead.phone ILIKE :phone', { phone: `%${filters.phone}%` });
    }

    if (filters.full_name) {
      qb.andWhere('lead.full_name ILIKE :fullName', { fullName: `%${filters.full_name}%` });
    }

    if (filters.search) {
      qb.andWhere(
        new Brackets((where) => {
          where.where('lead.full_name ILIKE :search', { search: `%${filters.search}%` });
          where.orWhere('lead.email ILIKE :search', { search: `%${filters.search}%` });
          where.orWhere('lead.phone ILIKE :search', { search: `%${filters.search}%` });
        }),
      );
    }
  }

  private resolveDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const resolved = new Date(value);
    return Number.isNaN(resolved.getTime()) ? undefined : resolved;
  }

  private buildCacheKey(userId: number | undefined, filters: Record<string, unknown>) {
    return `leads:${userId ?? 'anonymous'}:${JSON.stringify(filters)}`;
  }

  private resolveSortColumn(sortBy?: string) {
    switch (sortBy) {
      case 'status':
        return 'lead.status';
      case 'full_name':
      case 'name':
        return 'lead.full_name';
      default:
        return 'lead.created_at';
    }
  }

  private mapLeadToListItem(
    lead: Lead & {
      owner?: { id: number; name: string | null } | null;
      campaign?: { id: number; name: string | null } | null;
    },
  ): LeadListItem {
    return {
      id: lead.id,
      name: lead.full_name,
      full_name: lead.full_name,
      phone: lead.phone ?? undefined,
      email: lead.email ?? undefined,
      country: lead.country ?? undefined,
      language: lead.language ?? undefined,
      source: lead.source ?? undefined,
      status: lead.status,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      owner_user_id: lead.owner_user_id ?? undefined,
      campaign: lead.campaign
        ? {
            id: lead.campaign.id,
            name: lead.campaign.name ?? undefined,
          }
        : undefined,
      owner: lead.owner
        ? {
            id: lead.owner.id,
            name: lead.owner.name ?? undefined,
          }
        : undefined,
    };
  }
}
