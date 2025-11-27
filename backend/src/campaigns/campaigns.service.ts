/*import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Campaign } from '../entities/campaigns.entity';
import { AdSpend } from '../entities/ad-spend.entity';
import { AdSource } from '../entities/ad-sources.entity';
import { UserRole } from '../entities/user.entity';

export interface CreateCampaignDto {
  ad_source_id: number;
  name: string;
  platform_campaign_id?: string;
}

export interface ImportAdSpendDto {
  campaign_id: number;
  date: string;
  spend: number;
  currency: string;
}

export interface AdSpendReportDto {
  campaign_id?: number;
  date_from?: string;
  date_to?: string;
}

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(AdSpend)
    private adSpendRepository: Repository<AdSpend>,
    @InjectRepository(AdSource)
    private adSourceRepository: Repository<AdSource>,
    private dataSource: DataSource,
  ) {}

  async create(createCampaignDto: CreateCampaignDto, currentUser: any): Promise<Campaign> {
    // Only Admin and Marketing can create campaigns
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin and Marketing users can create campaigns');
    }

    // Verify ad source exists
    const adSource = await this.adSourceRepository.findOne({
      where: { id: createCampaignDto.ad_source_id }
    });

    if (!adSource) {
      throw new NotFoundException('Ad source not found');
    }

    // For Marketing users, they can only create campaigns for their own ad sources
    if (currentUser.role === UserRole.SALES) {
      // In a real implementation, you'd check if the marketing user owns this ad source
      // For now, we'll allow it but you could add ownership logic here
    }

    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      created_by: currentUser.id,
    });

    return this.campaignRepository.save(campaign);
  }

  async findAll(currentUser: any): Promise<Campaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.adSource', 'adSource');

    // Admin sees all campaigns
    if (currentUser.role === UserRole.ADMIN) {
      return query.getMany();
    }

    // Marketing users see campaigns they created
    if (currentUser.role === UserRole.SALES) {
      query.where('campaign.created_by = :userId', { userId: currentUser.id });
      return query.getMany();
    }

    // Managers and Sales see campaigns for reporting purposes
    return query.getMany();
  }

  async findOne(id: number, currentUser: any): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['adSource'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Check permissions
    if (currentUser.role === UserRole.SALES && campaign.created_by !== currentUser.id) {
      throw new ForbiddenException('You can only view your own campaigns');
    }

    return campaign;
  }


  async importAdSpend(importData: ImportAdSpendDto[], currentUser: any): Promise<void> {
    // Only Admin and Marketing can import ad spend
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin and Marketing users can import ad spend');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const spendData of importData) {
        // Verify campaign exists and user has access
        const campaign = await queryRunner.manager.findOne(Campaign, {
          where: { id: spendData.campaign_id }
        });

        if (!campaign) {
          throw new NotFoundException(`Campaign ${spendData.campaign_id} not found`);
        }

        if (currentUser.role === UserRole.SALES && campaign.created_by !== currentUser.id) {
          throw new ForbiddenException(`You can only import spend for your own campaigns`);
        }

        // Check if record already exists for this date/campaign
        const existingSpend = await queryRunner.manager.findOne(AdSpend, {
          where: {
            campaign_id: spendData.campaign_id,
            date: new Date(spendData.date)
          }
        });

        if (existingSpend) {
          // Update existing record
          existingSpend.spend = spendData.spend;
          existingSpend.currency = spendData.currency;
          await queryRunner.manager.save(AdSpend, existingSpend);
        } else {
          // Create new record
          const adSpend = queryRunner.manager.create(AdSpend, spendData);
          await queryRunner.manager.save(AdSpend, adSpend);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

 
  //* Generate cost-per-lead (CPL) and ROI reports
  // * Returns aggregated spend data with lead counts for CPL calculation
   
  async getAdSpendReport(filters: AdSpendReportDto, currentUser: any): Promise<any> {
    let query = this.adSpendRepository.createQueryBuilder('spend')
      .leftJoin('spend.campaign', 'campaign')
      .leftJoin('campaign.adSource', 'adSource')
      .select([
        'campaign.id as campaign_id',
        'campaign.name as campaign_name',
        'adSource.name as ad_source_name',
        'SUM(spend.spend) as total_spend',
        'spend.currency as currency',
        'COUNT(DISTINCT lead.id) as leads_count'
      ])
      .leftJoin('campaign.leads', 'lead')
      .groupBy('campaign.id, campaign.name, adSource.name, spend.currency');

    // Apply filters
    if (filters.campaign_id) {
      query.andWhere('campaign.id = :campaignId', { campaignId: filters.campaign_id });
    }

    if (filters.date_from) {
      query.andWhere('spend.date >= :dateFrom', { dateFrom: filters.date_from });
    }

    if (filters.date_to) {
      query.andWhere('spend.date <= :dateTo', { dateTo: filters.date_to });
    }

    // Apply user permissions
    if (currentUser.role === UserRole.SALES) {
      query.andWhere('campaign.created_by = :userId', { userId: currentUser.id });
    }

    const results = await query.getRawMany();

    // Calculate CPL (Cost Per Lead)
    return results.map(result => ({
      campaign_id: result.campaign_id,
      campaign_name: result.campaign_name,
      ad_source_name: result.ad_source_name,
      total_spend: parseFloat(result.total_spend || 0),
      currency: result.currency,
      leads_count: parseInt(result.leads_count || 0),
      cost_per_lead: result.leads_count > 0 ?
        parseFloat(result.total_spend || 0) / parseInt(result.leads_count) : 0
    }));
  }
}
*/
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Campaign } from '../entities/campaigns.entity';
import { AdSpend } from '../entities/ad-spend.entity';
import { AdSource } from '../entities/ad-sources.entity';
import { User, UserRole } from '../entities/user.entity';
import { RealtimeGateway } from '../events/realtime.gateway';
import { EventsGateway } from '../events/events.gateway';

export interface CreateCampaignDto {
  ad_source_id: number;
  name: string;
  platform_campaign_id?: string;
}

export interface ImportAdSpendDto {
  campaign_id: number;
  date: string;
  spend: number;
  currency: string;
}

export interface AdSpendReportDto {
  campaign_id?: number;
  date_from?: string;
  date_to?: string;
}

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(AdSpend)
    private adSpendRepository: Repository<AdSpend>,
    @InjectRepository(AdSource)
    private adSourceRepository: Repository<AdSource>,
    private dataSource: DataSource,
    private realtimeGateway: RealtimeGateway,
    private eventsGateway: EventsGateway,
  ) {}

  async createCampaign(createCampaignDto: CreateCampaignDto, currentUser: any): Promise<Campaign> {
    return this.create(createCampaignDto, currentUser);
  }

  async create(createCampaignDto: CreateCampaignDto, currentUser: any): Promise<Campaign> {
    // Only Admin and Marketing can create campaigns
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin and Marketing users can create campaigns');
    }

    // Verify ad source exists
    const adSource = await this.adSourceRepository.findOne({
      where: { id: createCampaignDto.ad_source_id }
    });

    if (!adSource) {
      throw new NotFoundException('Ad source not found');
    }

    const campaign = this.campaignRepository.create({
      ...createCampaignDto,
      created_by: currentUser.id,
      country: currentUser.country, // Assign country from current user
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    // Broadcast real-time update to realtime gateway
    this.realtimeGateway.server.to('role:marketing').emit('campaign:created', {
      campaignId: savedCampaign.id,
      campaignName: savedCampaign.name,
      adSourceId: savedCampaign.ad_source_id,
      createdBy: savedCampaign.created_by,
      country: savedCampaign.country
    });
    this.realtimeGateway.server.to('role:manager').emit('campaign:created', {
      campaignId: savedCampaign.id,
      campaignName: savedCampaign.name,
      adSourceId: savedCampaign.ad_source_id,
      createdBy: savedCampaign.created_by,
      country: savedCampaign.country
    });

    // Broadcast to events gateway for dashboard auto-refresh
    this.eventsGateway.broadcastCampaignCreated(savedCampaign);

    return savedCampaign;
  }

  async getCampaigns(query: any, currentUser: any): Promise<Campaign[]> {
    return this.findAll(currentUser);
  }

  async findAll(currentUser: any): Promise<Campaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.adSource', 'adSource')
      .leftJoinAndSelect('campaign.creator', 'creator');

    // Country-based filtering
    if (currentUser.role === UserRole.ADMIN) {
      // Admins can see all campaigns
      return query.getMany();
    }

    // Marketing users see campaigns they created
    if (currentUser.role === UserRole.SALES) {
      query.where('campaign.created_by = :userId', { userId: currentUser.id });
      // Marketing users can only see campaigns from their assigned country
      if (currentUser.country) {
        query.andWhere('campaign.country = :country', { country: currentUser.country });
      }
      return query.getMany();
    }

    // Managers and Sales see campaigns for reporting purposes
    // They can only see campaigns from their assigned country
    if (currentUser.country) {
      query.andWhere('campaign.country = :country', { country: currentUser.country });
    }
    return query.getMany();
  }

  async getCampaign(id: number, currentUser: any): Promise<Campaign> {
    return this.findOne(id, currentUser);
  }

  async findOne(id: number, currentUser: any): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['adSource', 'creator'],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // Check permissions
    if (currentUser.role === UserRole.SALES && campaign.created_by !== currentUser.id) {
      throw new ForbiddenException('You can only view your own campaigns');
    }

    return campaign;
  }

  async updateCampaign(id: number, updateCampaignDto: Partial<CreateCampaignDto>, currentUser: any): Promise<Campaign> {
    return this.update(id, updateCampaignDto, currentUser);
  }

  async update(id: number, updateCampaignDto: Partial<CreateCampaignDto>, currentUser: any): Promise<Campaign> {
    const campaign = await this.findOne(id, currentUser);

    // Check permissions
    if (currentUser.role === UserRole.SALES && campaign.created_by !== currentUser.id) {
      throw new ForbiddenException('You can only update your own campaigns');
    }

    // Verify ad source exists if updating
    if (updateCampaignDto.ad_source_id) {
      const adSource = await this.adSourceRepository.findOne({
        where: { id: updateCampaignDto.ad_source_id }
      });

      if (!adSource) {
        throw new NotFoundException('Ad source not found');
      }
    }

    await this.campaignRepository.update(id, updateCampaignDto);
    const updatedCampaign = await this.findOne(id, currentUser);

    // Broadcast real-time update to realtime gateway
    this.realtimeGateway.server.to('role:marketing').emit('campaign:updated', {
      campaignId: updatedCampaign.id,
      campaignName: updatedCampaign.name,
      adSourceId: updatedCampaign.ad_source_id,
      createdBy: updatedCampaign.created_by,
      country: updatedCampaign.country
    });
    this.realtimeGateway.server.to('role:manager').emit('campaign:updated', {
      campaignId: updatedCampaign.id,
      campaignName: updatedCampaign.name,
      adSourceId: updatedCampaign.ad_source_id,
      createdBy: updatedCampaign.created_by,
      country: updatedCampaign.country
    });

    // Broadcast to events gateway for dashboard auto-refresh
    this.eventsGateway.broadcastCampaignUpdated(updatedCampaign);

    return updatedCampaign;
  }

  async deleteCampaign(id: number, currentUser: any): Promise<void> {
    return this.remove(id, currentUser);
  }

  async remove(id: number, currentUser: any): Promise<void> {
    const campaign = await this.findOne(id, currentUser);
    const campaignCountry = campaign.country;

    // Check permissions
    if (currentUser.role === UserRole.SALES && campaign.created_by !== currentUser.id) {
      throw new ForbiddenException('You can only delete your own campaigns');
    }

    await this.campaignRepository.remove(campaign);

    // Broadcast real-time update to realtime gateway
    this.realtimeGateway.server.to('role:marketing').emit('campaign:deleted', {
      campaignId: id,
      deletedBy: currentUser.id
    });
    this.realtimeGateway.server.to('role:manager').emit('campaign:deleted', {
      campaignId: id,
      deletedBy: currentUser.id
    });

    // Broadcast to events gateway for dashboard auto-refresh
    this.eventsGateway.broadcastCampaignDeleted(id, campaignCountry);
  }

  /**
   * Import ad spend data via CSV or API
   */
  async importAdSpend(importData: ImportAdSpendDto[], currentUser: any): Promise<void> {
    // Only Admin and Marketing can import ad spend
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin and Marketing users can import ad spend');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const spendData of importData) {
        // Verify campaign exists and user has access
        const campaign = await queryRunner.manager.findOne(Campaign, {
          where: { id: spendData.campaign_id }
        });

        if (!campaign) {
          throw new NotFoundException(`Campaign ${spendData.campaign_id} not found`);
        }

        if (currentUser.role === UserRole.SALES && campaign.created_by !== currentUser.id) {
          throw new ForbiddenException(`You can only import spend for your own campaigns`);
        }

        // Check if record already exists for this date/campaign
        const existingSpend = await queryRunner.manager.findOne(AdSpend, {
          where: {
            campaign_id: spendData.campaign_id,
            date: new Date(spendData.date)
          }
        });

        if (existingSpend) {
          // Update existing record
          existingSpend.spend = spendData.spend;
          existingSpend.currency = spendData.currency;
          await queryRunner.manager.save(AdSpend, existingSpend);
        } else {
          // Create new record
          const adSpend = queryRunner.manager.create(AdSpend, {
            ...spendData,
            date: new Date(spendData.date)
          });
          await queryRunner.manager.save(AdSpend, adSpend);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
    * Generate cost-per-lead (CPL) and ROI reports
    */
   async getAdSpendReport(filters: AdSpendReportDto, currentUser: any): Promise<any> {
     let query = this.adSpendRepository.createQueryBuilder('spend')
       .leftJoin('spend.campaign', 'campaign')
       .leftJoin('campaign.adSource', 'adSource')
       .leftJoin('campaign.leads', 'lead')
       .select([
         'campaign.id as campaign_id',
         'campaign.name as campaign_name',
         'adSource.name as ad_source_name',
         'SUM(spend.spend) as total_spend',
         'spend.currency as currency',
         'COUNT(lead.id) as leads_count'
       ])
       .groupBy('campaign.id, campaign.name, adSource.name, spend.currency');

     // Apply filters
     if (filters.campaign_id) {
       query.andWhere('campaign.id = :campaignId', { campaignId: filters.campaign_id });
     }

     if (filters.date_from) {
       query.andWhere('spend.date >= :dateFrom', { dateFrom: filters.date_from });
     }

     if (filters.date_to) {
       query.andWhere('spend.date <= :dateTo', { dateTo: filters.date_to });
     }

     // Apply user permissions
     if (currentUser.role === UserRole.SALES) {
       query.andWhere('campaign.created_by = :userId', { userId: currentUser.id });
     }

     const results = await query.getRawMany();

     // Calculate CPL (Cost Per Lead)
     return results.map(result => ({
       campaign_id: result.campaign_id,
       campaign_name: result.campaign_name,
       ad_source_name: result.ad_source_name,
       total_spend: parseFloat(result.total_spend || 0),
       currency: result.currency,
       leads_count: parseInt(result.leads_count || 0),
       cost_per_lead: result.leads_count > 0 ?
         parseFloat(result.total_spend || 0) / parseInt(result.leads_count) : 0
     }));
   }

  async getCampaignStats(id: number, currentUser: any): Promise<any> {
    // TODO: Implement campaign statistics
    return { message: 'Campaign stats not implemented yet' };
  }

  async getCampaignLeads(id: number, query: any, currentUser: any): Promise<any> {
    // TODO: Implement campaign leads retrieval
    return { message: 'Campaign leads not implemented yet' };
  }

  async addAdSpend(campaignId: number, dto: { date: string; spend: number; currency: string }, currentUser: any): Promise<AdSpend> {
    // Check permissions
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER && currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin, Manager, and Marketing users can add ad spend');
    }

    // Verify campaign exists and user has access
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (currentUser.role === UserRole.SALES && campaign.created_by !== currentUser.id) {
      throw new ForbiddenException('You can only add spend to your own campaigns');
    }

    // Check if record already exists for this date/campaign
    const existingSpend = await this.adSpendRepository.findOne({
      where: {
        campaign_id: campaignId,
        date: new Date(dto.date)
      }
    });

    if (existingSpend) {
      // Update existing record
      existingSpend.spend = dto.spend;
      existingSpend.currency = dto.currency;
      return this.adSpendRepository.save(existingSpend);
    } else {
      // Create new record
      const adSpend = this.adSpendRepository.create({
        campaign_id: campaignId,
        date: new Date(dto.date),
        spend: dto.spend,
        currency: dto.currency
      });
      return this.adSpendRepository.save(adSpend);
    }
  }

  async getCampaignAdSpend(campaignId: number, currentUser: any): Promise<AdSpend[]> {
    // Check permissions
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER && currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin, Manager, and Marketing users can view ad spend');
    }

    // Verify campaign exists and user has access
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (currentUser.role === UserRole.SALES && campaign.created_by !== currentUser.id) {
      throw new ForbiddenException('You can only view spend for your own campaigns');
    }

    return this.adSpendRepository.find({
      where: { campaign_id: campaignId },
      order: { date: 'DESC' }
    });
  }

  async deleteAdSpend(campaignId: number, spendId: number, currentUser: any): Promise<void> {
    // Check permissions
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER && currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin, Manager, and Marketing users can delete ad spend');
    }

    // Verify campaign exists and user has access
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (currentUser.role === UserRole.SALES && campaign.created_by !== currentUser.id) {
      throw new ForbiddenException('You can only delete spend from your own campaigns');
    }

    // Find and delete the ad spend record
    const adSpend = await this.adSpendRepository.findOne({
      where: { id: spendId, campaign_id: campaignId }
    });

    if (!adSpend) {
      throw new NotFoundException('Ad spend record not found');
    }

    await this.adSpendRepository.remove(adSpend);
  }
}
