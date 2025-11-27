import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LandingPage } from '../entities/landing-pages.entity';
import { Campaign } from '../entities/campaigns.entity';
import { User, UserRole } from '../entities/user.entity';
import { RealtimeGateway } from '../events/realtime.gateway';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto';



@Injectable()
export class LandingPagesService {
  constructor(
    @InjectRepository(LandingPage)
    private landingPageRepository: Repository<LandingPage>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    private realtimeGateway: RealtimeGateway,
  ) {}

 async create(createLandingPageDto: CreateLandingPageDto, currentUser: any): Promise<LandingPage> {
  if (![UserRole.ADMIN, UserRole.MANAGER].includes(currentUser.role)) {
    throw new ForbiddenException('Only admins and managers can create landing pages');
  }

  let campaign: Campaign | null = null;
  if (createLandingPageDto.campaign_id) {
    campaign = await this.campaignRepository.findOne({
      where: { id: createLandingPageDto.campaign_id },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
  }

  const existingPage = await this.landingPageRepository.findOne({
    where: { slug: createLandingPageDto.slug },
  });
  if (existingPage) {
    throw new ForbiddenException('Landing page with this slug already exists');
  }

  const landingPage: LandingPage = this.landingPageRepository.create({
    ...createLandingPageDto,
    sections: [],
    settings: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      fontFamily: 'Inter, sans-serif',
    },
    active: true,
    created_by: currentUser.id,
  });

  const savedLandingPage = await this.landingPageRepository.save(landingPage);

  this.realtimeGateway.server.to('role:marketing').emit('landing_page:created', {
    landingPage: savedLandingPage,
    campaignId: savedLandingPage.campaign_id ?? null,
  });
  this.realtimeGateway.server.to('role:manager').emit('landing_page:created', {
    landingPage: savedLandingPage,
    campaignId: savedLandingPage.campaign_id ?? null,
  });

  return savedLandingPage;
}


  async findAll(currentUser: any, filters?: { campaign_id?: number }): Promise<LandingPage[]> {
    const query = this.landingPageRepository.createQueryBuilder('landingPage')
      .leftJoinAndSelect('landingPage.campaign', 'campaign')
      .orderBy('landingPage.created_at', 'DESC');

    // Apply country-based filtering for non-admin users
    if (currentUser.role !== UserRole.ADMIN) {
      query.andWhere('campaign.country = :country', { country: currentUser.country });
    }

    if (filters?.campaign_id) {
      query.andWhere('landingPage.campaign_id = :campaignId', { campaignId: filters.campaign_id });
    }

    return query.getMany();
  }

  async findOne(id: number, currentUser: any): Promise<LandingPage> {
    const landingPage = await this.landingPageRepository.findOne({
      where: { id },
      relations: ['campaign']
    });

    if (!landingPage) {
      throw new NotFoundException('Landing page not found');
    }

    // Check access permissions
    if (currentUser.role !== UserRole.ADMIN && landingPage.campaign.country !== currentUser.country) {
      throw new ForbiddenException('Access denied to this landing page');
    }

    return landingPage;
  }

  async findBySlug(slug: string): Promise<LandingPage> {
    const landingPage = await this.landingPageRepository.findOne({
      where: { slug, active: true },
      relations: ['campaign']
    });

    if (!landingPage) {
      throw new NotFoundException('Landing page not found');
    }

    return landingPage;
  }
/*
  async update(id: number, updateLandingPageDto: UpdateLandingPageDto, currentUser: any): Promise<LandingPage> {
    const landingPage = await this.findOne(id, currentUser);

    // Check permissions
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Only admins and managers can update landing pages');
    }

    // Validate campaign if being updated
    if (updateLandingPageDto.campaign_id) {
      const campaign = await this.campaignRepository.findOne({
        where: { id: updateLandingPageDto.campaign_id }
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
    }

    // Check for duplicate slug if slug is being updated
    if (updateLandingPageDto.slug && updateLandingPageDto.slug !== landingPage.slug) {
      const existingPage = await this.landingPageRepository.findOne({
        where: { slug: updateLandingPageDto.slug }
      });

      if (existingPage) {
        throw new ForbiddenException('Landing page with this slug already exists');
      }
    }

    await this.landingPageRepository.update(id, updateLandingPageDto);
    const updated = await this.findOne(id, currentUser);

    // Broadcast real-time update
    this.realtimeGateway.server.to('role:marketing').emit('landing_page:updated', {
      landingPage: updated,
      campaignId: updated.campaign_id
    });
    this.realtimeGateway.server.to('role:manager').emit('landing_page:updated', {
      landingPage: updated,
      campaignId: updated.campaign_id
    });

    return updated;
  }*/
 async update(id: number, updateLandingPageDto: UpdateLandingPageDto, currentUser: any): Promise<LandingPage> {
  const landingPage = await this.findOne(id, currentUser);

  // Check permissions
  if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
    throw new ForbiddenException('Only admins and managers can update landing pages');
  }

  // Validate campaign if being updated
  if (updateLandingPageDto.campaign_id) {
    const campaign = await this.campaignRepository.findOne({
      where: { id: updateLandingPageDto.campaign_id }
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
  }

  // Check for duplicate slug if slug is being updated
  if (updateLandingPageDto.slug && updateLandingPageDto.slug !== landingPage.slug) {
    const existingPage = await this.landingPageRepository.findOne({
      where: { slug: updateLandingPageDto.slug }
    });
    if (existingPage) {
      throw new ForbiddenException('Landing page with this slug already exists');
    }
  }

  // ✅ Merge updates (including sections + settings)
  Object.assign(landingPage, {
    ...updateLandingPageDto,
    updated_at: new Date()
  });

  // Save changes
  const updated = await this.landingPageRepository.save(landingPage);

  // 🔔 Broadcast real-time update
  this.realtimeGateway.server.to('role:marketing').emit('landing_page:updated', {
    landingPage: updated,
    campaignId: updated.campaign_id
  });
  this.realtimeGateway.server.to('role:manager').emit('landing_page:updated', {
    landingPage: updated,
    campaignId: updated.campaign_id
  });

  return updated;
}


  async remove(id: number, currentUser: any): Promise<void> {
    const landingPage = await this.findOne(id, currentUser);

    // Check permissions
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Only admins and managers can delete landing pages');
    }

    await this.landingPageRepository.remove(landingPage);

    // Broadcast real-time update
    this.realtimeGateway.server.to('role:marketing').emit('landing_page:deleted', {
      landingPageId: id,
      campaignId: landingPage.campaign_id
    });
    this.realtimeGateway.server.to('role:manager').emit('landing_page:deleted', {
      landingPageId: id,
      campaignId: landingPage.campaign_id
    });
  }
}
