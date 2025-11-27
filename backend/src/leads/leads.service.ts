import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, EntityManager, Brackets } from 'typeorm';
import { Lead, LeadSource, LeadStatus } from '../entities/leads.entity';
import { User, UserRole } from '../entities/user.entity';
import { Campaign } from '../entities/campaigns.entity';
import { File, FileType } from '../entities/files.entity';
import { PriceOffer, PriceOfferStatus } from '../entities/price-offers.entity';
import { Meeting, MeetingStatus } from '../entities/meetings.entity';
import { Message, MessageChannel, MessageDirection } from '../entities/messages.entity';
import { TransferLeadDto } from './dto/transfer-lead.dto';
import { LeadNote } from '../entities/lead-notes.entity'; // Import LeadNote instead of Note
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { EventsGateway } from '../events/events.gateway';
import { RecaptchaService } from '../common/recaptcha/recaptcha.service';
import { LeadStatusMapperService } from './lead-status-mapper.service';
import * as nodemailer from 'nodemailer';
import { request as httpsRequest, RequestOptions } from 'node:https';
import { Deal } from '../entities/deals.entity';
import { Activity, ActivityType } from '../entities/activities.entity';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.SALES]: 1,
  [UserRole.MARKETING]: 1,
};

export interface CreateLeadDto {
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  language?: string;
  source?: string;
  campaign_id?: number;
  website_id?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  status?: string;
  owner_user_id?: number | null;
  team_id?: number | null;
}

export interface UpdateLeadDto {
  full_name?: string;
  phone?: string;
  email?: string;
  country?: string;
  language?: string;
  source?: string;
  campaign_id?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  status?: string;
  owner_user_id?: number | null;
  team_id?: number | null;
}

export interface LandingLeadInput {
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  source?: string;
  website_id?: number;
  website_name?: string;
  campaign_id?: number;
  campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  status?: string;
  recaptchaToken?: string;
  userIp?: string;
  form_id?: string;
  lead_id?: string;
  ad_source_id?: string;
  ad_id?: string;
  adset_id?: string;
  advertiser_id?: string;
  custom_fields?: Record<string, any>;
}

interface CreateLandingLeadOptions {
  requireRecaptcha?: boolean;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly wassengerApiKey =
    process.env.WASSENGER_API_KEY ??
    '5ee6fe8d25f3167c778b9edbe3869d22b4f5611d579da2f840ca3175bc1a6a3c3962618b1c045325';

  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    @InjectRepository(PriceOffer)
    private priceOfferRepository: Repository<PriceOffer>,
    @InjectRepository(Meeting)
    private meetingRepository: Repository<Meeting>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(LeadNote) // Use LeadNote instead of Note
    private leadNoteRepository: Repository<LeadNote>,
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    private dataSource: DataSource,
    private realtimeGateway: RealtimeGateway,
    private eventsGateway: EventsGateway,
    private readonly recaptchaService: RecaptchaService,
    private readonly statusMapper: LeadStatusMapperService,
  ) {}

  private async loadLeadWithRelations(id: number): Promise<Lead> {
    // FIXED: Removed non-existent relations (owner.team, transferFrom, transferTo)
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['campaign', 'owner', 'assignedTo'],
    });

    if (!lead) {
      throw new NotFoundException('Lead not found after creation');
    }

    return lead;
  }

  private async enforceWebsiteDuplicateWindow(
    manager: EntityManager,
    websiteId?: number,
    phone?: string | null,
    email?: string | null,
  ): Promise<void> {
    // FIXED: website_id column doesn't exist in schema
    // This method is kept for backward compatibility but does nothing
    // Website tracking should be done through source_reference_id or custom_fields
    if (!websiteId || (!phone && !email)) {
      return;
    }

    // Skip duplicate check since website_id doesn't exist
    // Duplicate detection is handled by findDuplicate() method instead
    return;
  }

  private async dispatchLeadCreation(lead: Lead, campaign?: Campaign | null): Promise<void> {
    const resolvedCampaign = campaign ?? lead.campaign ?? null;
    const campaignCountry = resolvedCampaign?.country || lead.country || 'unknown';
    const campaignId = resolvedCampaign?.id ?? lead.campaign_id ?? null;

    this.realtimeGateway.broadcastLeadUpdate(
      lead.id,
      campaignCountry,
      lead,
    );

    this.realtimeGateway.broadcastNewLead(
      campaignId,
      campaignCountry,
      {
        id: lead.id,
        full_name: lead.full_name,
        phone: lead.phone,
        email: lead.email,
        country: lead.country,
        source: lead.source,
        campaign_id: lead.campaign_id,
        status: lead.status,
        created_at: lead.created_at,
      },
    );

    this.realtimeGateway.emitLeadCreated(lead);
    this.eventsGateway.broadcastLeadCreated(lead);
  }

  private buildWelcomeMessage(lead: Lead): string {
    const name = lead.full_name?.split(' ')[0] || 'there';
    return [
      `Hi ${name}, welcome aboard!`,
      'Our team received your details and will reach out shortly.',
      'Reply to this message if you need help in the meantime.',
    ].join(' ');
  }

  private async sendWelcomeMessage(lead: Lead): Promise<'success_via_whatsapp' | 'fallback_via_email'> {
    const messageBody = this.buildWelcomeMessage(lead);
    const hasPhone = Boolean(lead.phone);

    if (hasPhone && this.wassengerApiKey) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          this.logger.log(`WhatsApp welcome message attempt ${attempt}/3 for lead ${lead.id}`);
          await this.sendWhatsAppViaWassenger(lead.phone!, messageBody);
          await this.logOutboundMessage(
            lead.id,
            MessageChannel.WHATSAPP,
            messageBody,
            `wassenger_attempt_${attempt}`,
          );
          this.logger.log(`WhatsApp welcome message delivered for lead ${lead.id}`);
          return 'success_via_whatsapp';
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `WhatsApp welcome attempt ${attempt} failed for lead ${lead.id}: ${errorMessage}`,
          );
          if (attempt < 3) {
            await this.delay(1000);
          }
        }
      }
    } else {
      this.logger.warn(
        `Skipping WhatsApp welcome message for lead ${lead.id} because ${!lead.phone ? 'phone number is missing' : 'Wassenger API key is not configured'}`,
      );
    }

    this.logger.log(`Sending fallback welcome email to lead ${lead.id}`);
    await this.sendFallbackEmail(lead, messageBody);
    this.logger.log(`Fallback welcome email delivered for lead ${lead.id}`);
    await this.logOutboundMessage(lead.id, MessageChannel.EMAIL, messageBody, 'welcome_email');
    return 'fallback_via_email';
  }

  private async sendWhatsAppViaWassenger(phone: string, body: string): Promise<void> {
    if (!this.wassengerApiKey) {
      throw new Error('Wassenger API key is not configured');
    }

    const payload = JSON.stringify({
      phone,
      message: body,
    });

    const options: RequestOptions = {
      hostname: 'api.wassenger.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-wassenger-token': this.wassengerApiKey,
      },
    };

    await new Promise<void>((resolve, reject) => {
      const req = httpsRequest(options, res => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });

        res.on('end', () => {
          const response = Buffer.concat(chunks).toString();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(
              new Error(
                `Wassenger API responded with ${res.statusCode ?? 'unknown'}: ${response || 'No response body'}`,
              ),
            );
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  private async sendFallbackEmail(lead: Lead, body: string): Promise<void> {
    if (!lead.email) {
      throw new Error('Lead email address is not available for fallback messaging');
    }

    const emailUser =
      process.env.WELCOME_EMAIL_USER ||
      process.env.NOTIFICATION_EMAIL_USER ||
      process.env.EMAIL_USER ||
      's11927035@stu.najah.edu';
    const emailPass =
      process.env.WELCOME_EMAIL_PASSWORD ||
      process.env.NOTIFICATION_EMAIL_PASSWORD ||
      process.env.EMAIL_PASSWORD ||
      'hcdy nioh goia mxoa';
    const emailFrom = process.env.WELCOME_EMAIL_FROM || emailUser;
    const emailHost = process.env.WELCOME_EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = Number(process.env.WELCOME_EMAIL_PORT) || 465;

    if (!emailUser || !emailPass) {
      throw new Error('Email credentials are not configured for fallback messaging');
    }

    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: emailFrom,
      to: lead.email,
      subject: 'Welcome to our CRM',
      text: body,
      html: body.replace(/\n/g, '<br>'),
    });
  }

  private async logOutboundMessage(
    leadId: number,
    channel: MessageChannel,
    body: string,
    externalId?: string,
  ): Promise<void> {
    try {
      const message = this.messageRepository.create({
        lead_id: leadId,
        channel,
        direction: MessageDirection.OUTGOING,
        body,
        timestamp: new Date(),
        external_id: externalId,
      });
      await this.messageRepository.save(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to log welcome message for lead ${leadId}: ${errorMessage}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isValidLeadSource(source: string | undefined): boolean {
    if (!source || source.trim() === '') return false;
    return Object.values(LeadSource).includes(source as LeadSource);
  }

  private normalizePhone(phone: string): string {
    if (!phone) return phone;
    return phone.replace(/[\s\-\(\)]/g, '').toLowerCase();
  }

  private normalizeEmail(email: string): string {
    if (!email) return email;
    return email.toLowerCase().trim();
  }

  private normalizeCountry(country: string): string {
    if (!country) return country;
    const countryMap: Record<string, string> = {
      'usa': 'United States',
      'uk': 'United Kingdom',
      'uae': 'United Arab Emirates',
      'palestine': 'Palestine',
      'israel': 'Israel',
    };
    return countryMap[country.toLowerCase()] || country;
  }

  private async findDuplicate(phone?: string, email?: string, country?: string): Promise<Lead | null> {
    if (!phone && !email) return null;

    const normalizedPhone = phone ? this.normalizePhone(phone) : null;
    const normalizedEmail = email ? this.normalizeEmail(email) : null;
    const normalizedCountry = country ? this.normalizeCountry(country) : null;

    const query = this.leadRepository.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.campaign', 'campaign')
      .leftJoinAndSelect('lead.owner', 'owner');

    if (normalizedPhone) {
      query.andWhere('LOWER(REPLACE(REPLACE(REPLACE(lead.phone, \' \', \'\'), \'-\', \'\'), \'(\', \'\')) LIKE :phone', {
        phone: `%${normalizedPhone}%`
      });
    }

    if (normalizedEmail) {
      query.andWhere('LOWER(lead.email) = :email', { email: normalizedEmail });
    }

    if (normalizedCountry) {
      query.andWhere('LOWER(lead.country) = :country', { country: normalizedCountry.toLowerCase() });
    }

    return query.getOne();
  }

  // Notes methods - updated to use LeadNote
  async getLeadNotes(leadId: number, currentUser: any): Promise<{ data: any[] }> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view notes for leads you own');
    }

   const notes = await this.dataSource.getRepository(LeadNote).find({
  where: { lead_id: leadId },
  relations: ['user'],
  order: { created_at: 'DESC' }
});

    return {
      data: notes.map(note => ({
        id: note.id,
        note: note.note,
        created_at: note.created_at,
        user: {
          id: note.user?.id,
          name: note.user?.name || 'Unknown'
        }
      }))
    };
  }

  async addLeadNote(leadId: number, note: string, currentUser: any): Promise<{ data: any }> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only add notes to leads you own');
    }

    const noteEntity = this.leadNoteRepository.create({
      lead_id: leadId,
      note: note,
      user_id: currentUser.id
    });

    const savedNote = await this.leadNoteRepository.save(noteEntity);

    const noteWithUser = await this.leadNoteRepository.findOne({
      where: { id: savedNote.id },
      relations: ['user']
    });

    if (!noteWithUser) {
      throw new NotFoundException('Note not found after creation');
    }

    // Update last interaction date
    await this.updateLastInteractionDate(leadId);

    return {
      data: {
        id: noteWithUser.id,
        note: noteWithUser.note,
        created_at: noteWithUser.created_at,
        user: {
          id: noteWithUser.user?.id,
          name: noteWithUser.user?.name || 'Unknown'
        }
      }
    };
  }

  async create(createLeadDto: CreateLeadDto, currentUser: any): Promise<Lead> {
    // Non-admins cannot assign leads to other users; force ownership to creator
    let dtoWithOwner = { ...createLeadDto };

    // Handle null currentUser (from webhooks/integrations)
    if (currentUser && currentUser.role !== UserRole.ADMIN) {
      dtoWithOwner.owner_user_id = currentUser.id;
    }

    const normalizedDto = {
      ...dtoWithOwner,
      phone: dtoWithOwner.phone ? this.normalizePhone(dtoWithOwner.phone) : dtoWithOwner.phone,
      email: dtoWithOwner.email ? this.normalizeEmail(dtoWithOwner.email) : dtoWithOwner.email,
      country: dtoWithOwner.country ? this.normalizeCountry(dtoWithOwner.country) : dtoWithOwner.country,
      source: this.isValidLeadSource(dtoWithOwner.source) ? dtoWithOwner.source as LeadSource : LeadSource.MANUAL,
      status: this.statusMapper.mapToValidStatus(dtoWithOwner.status),
    };

    const duplicate = await this.findDuplicate(normalizedDto.phone, normalizedDto.email, normalizedDto.country);
    if (duplicate) {
      // Update existing lead: refresh created_at and set status to a valid value
      duplicate.created_at = new Date();
      duplicate.status = this.statusMapper.mapToValidStatus(duplicate.status);
      duplicate.updated_at = new Date();

      const updatedLead = await this.leadRepository.save(duplicate);
      const enrichedLead = await this.findOne(updatedLead.id, currentUser);
      await this.dispatchLeadCreation(enrichedLead, duplicate.campaign);
      return enrichedLead;
    }

    let campaign: Campaign | null = null;
    if (normalizedDto.campaign_id) {
      campaign = await this.campaignRepository.findOne({ where: { id: normalizedDto.campaign_id } });
      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
    }

    let owner: User | null = null;
    if (normalizedDto.owner_user_id) {
      owner = await this.userRepository.findOne({
        where: { id: normalizedDto.owner_user_id },
        relations: ['team']
      });
      if (!owner) {
        throw new NotFoundException('Owner user not found');
      }

      // Only validate permissions if currentUser exists (not from webhook)
      if (currentUser && owner.id !== currentUser.id) {
        const currentRoleLevel = ROLE_HIERARCHY[currentUser.role];
        const ownerRoleLevel = ROLE_HIERARCHY[owner.role];

        if (currentRoleLevel <= ownerRoleLevel) {
          throw new ForbiddenException('Cannot assign lead to user with equal or higher privilege');
        }

        if (currentUser.role === UserRole.MANAGER && owner.team_id !== currentUser.team_id) {
          throw new ForbiddenException('Can only assign leads to team members');
        }
      }
    }

    // FIXED: Removed team_id logic (column doesn't exist in schema)
    // Team association is now handled through owner.team_id relation

    const savedLead = await this.dataSource.transaction(async manager => {
      const repo = manager.getRepository(Lead);

      // Remove team_id (doesn't exist in schema), but keep website_id
      const { team_id, ...validFields } = normalizedDto as any;

      const lead = repo.create(validFields);
      return repo.save(lead);
    });

    const leadEntity = Array.isArray(savedLead) ? savedLead[0] : savedLead;
    const enrichedLead = await this.findOne(leadEntity.id, currentUser);
    await this.dispatchLeadCreation(enrichedLead, campaign);
    try {
      const welcomeStatus = await this.sendWelcomeMessage(enrichedLead);
      this.logger.log(`Welcome workflow completed for lead ${enrichedLead.id}: ${welcomeStatus}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send welcome message for lead ${enrichedLead.id}: ${errorMessage}`);
    }

    return enrichedLead;
  }

  async findAll(currentUser: any, filters?: any): Promise<Lead[]> {
    if (!currentUser?.id) {
      if (currentUser?.userId) {
        currentUser.id = currentUser.userId;
      } else if (currentUser?.sub) {
        currentUser.id = currentUser.sub;
      } else {
        return [];
      }
    }

    try {
      // FIXED: Removed non-existent relations (owner.team, transferFrom, transferTo)
      const query = this.leadRepository.createQueryBuilder('lead')
        .leftJoinAndSelect('lead.campaign', 'campaign')
        .leftJoinAndSelect('lead.owner', 'owner')
        .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
        .orderBy('lead.created_at', 'DESC');

      // Country-based filtering
      if (currentUser.role === UserRole.ADMIN) {
        // Admins can see all countries
      } else if (currentUser.role === UserRole.MANAGER) {
        // Managers can only see leads from their assigned country
        if (currentUser.country) {
          query.andWhere('lead.country = :country', { country: currentUser.country });
        }
      } else if (currentUser.role === UserRole.SALES || currentUser.role === UserRole.SALES) {
        // Sales and Marketing users can only see leads from their assigned country
        if (currentUser.country) {
          query.andWhere('lead.country = :country', { country: currentUser.country });
        }
      }

      if (currentUser.role === UserRole.SALES) {
        query.andWhere('lead.owner_user_id = :userId', { userId: currentUser.id });
      } else if (currentUser.role === UserRole.MARKETING) {
        query.andWhere('lead.owner_user_id = :userId', { userId: currentUser.id });
      } else if (currentUser.role === UserRole.MANAGER && currentUser.team_id) {
        // Managers can see leads owned by users in their team (NOT unassigned leads)
        query.andWhere('owner.team_id = :teamId', { teamId: currentUser.team_id });
      }

      if (filters?.source) {
        query.andWhere('lead.source = :source', { source: filters.source });
      }

      if (filters?.campaign_id) {
        query.andWhere('lead.campaign_id = :campaignId', { campaignId: filters.campaign_id });
      }

      if (filters?.status) {
        query.andWhere('lead.status = :status', { status: filters.status });
      }

      if (filters?.owner_user_id) {
        query.andWhere(
          '(lead.owner_user_id = :ownerId OR lead.transfer_to_user_id = :ownerId)',
          { ownerId: filters.owner_user_id }
        );
      }

      if (filters?.owner) {
        query.andWhere(
          '(owner.name ILIKE :ownerName OR (lead.owner_user_id IS NULL AND :ownerNameLower = \'unassigned\'))',
          {
            ownerName: `%${filters.owner}%`,
            ownerNameLower: filters.owner.toLowerCase()
          }
        );
      }

      if (filters?.date_from) {
        query.andWhere('lead.created_at >= :dateFrom', { dateFrom: filters.date_from });
      }

      if (filters?.date_to) {
        query.andWhere('lead.created_at <= :dateTo', { dateTo: filters.date_to });
      }

      const leads = await query.getMany();
      return leads;

    } catch (error) {
      throw error;
    }
  }

  async findOne(id: number, currentUser: any): Promise<Lead> {
    // FIXED: Removed non-existent relations (transferFrom, transferTo, owner.team)
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['campaign', 'owner', 'assignedTo']
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Skip permission check if currentUser is null (from webhooks/integrations)
    if (currentUser && !this.canEditLead(lead, currentUser)) {
      throw new ForbiddenException('Access denied to this lead');
    }

    return lead;
  }

  async update(id: number, updateLeadDto: UpdateLeadDto, currentUser: any): Promise<Lead> {
    // FIXED: Removed non-existent relation (owner.team)
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['campaign', 'owner', 'assignedTo']
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!this.canEditLead(lead, currentUser)) {
      throw new ForbiddenException('You do not have permission to edit this lead');
    }

    if (updateLeadDto.campaign_id !== undefined && updateLeadDto.campaign_id !== null) {
      if (updateLeadDto.campaign_id === 0) {
        // Invalid campaign_id, set to null
        updateLeadDto.campaign_id = null as any;
      } else {
        const campaign = await this.campaignRepository.findOne({ where: { id: updateLeadDto.campaign_id } });
        if (!campaign) {
          throw new NotFoundException('Campaign not found');
        }
      }
    }

    let newOwner: User | null = null;
    if (updateLeadDto.owner_user_id !== undefined && updateLeadDto.owner_user_id !== null) {
      newOwner = await this.userRepository.findOne({
        where: { id: updateLeadDto.owner_user_id },
        relations: ['team']
      });
      if (!newOwner) {
        throw new NotFoundException('Owner user not found');
      }

      if (!this.canAssignToUser(currentUser, newOwner, lead)) {
        throw new ForbiddenException('You do not have permission to assign leads to this user');
      }
    } else if (updateLeadDto.owner_user_id === null) {
      // Explicitly allow clearing the owner; no further validation needed beyond edit access
      newOwner = null;
    }

    const normalizedDto = {
      ...updateLeadDto,
      phone: updateLeadDto.phone ? this.normalizePhone(updateLeadDto.phone) : updateLeadDto.phone,
      email: updateLeadDto.email ? this.normalizeEmail(updateLeadDto.email) : updateLeadDto.email,
      country: updateLeadDto.country ? this.normalizeCountry(updateLeadDto.country) : updateLeadDto.country,
      status: updateLeadDto.status ? this.statusMapper.mapToValidStatus(updateLeadDto.status) : undefined,
    };

    // FIXED: Remove team_id (non-existent field) but KEEP website_id
    const { team_id, ...updatePayload } = normalizedDto as any;
    const timestamp = new Date();

    // ✅ Track old website_id for count updates (handled by database trigger)
    const oldWebsiteId = lead.website_id;
    const newWebsiteId = updatePayload.website_id;

    await this.leadRepository.update(id, {
      ...updatePayload,
      updated_at: timestamp,
    });
    const updatedLead = await this.findOne(id, currentUser);

    // Broadcast lead update to realtime gateway
    this.realtimeGateway.broadcastLeadUpdate(updatedLead.id, updatedLead.country || 'unknown', updatedLead);

    // Broadcast to events gateway for dashboard auto-refresh
    this.eventsGateway.broadcastLeadUpdated(updatedLead);

    return updatedLead;
  }

  private canEditLead(lead: Lead, currentUser: any): boolean {
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    if (currentUser.role === UserRole.MANAGER) {
      if (!currentUser.team_id) {
        return false;
      }
      return !lead.owner || lead.owner.team_id === currentUser.team_id;
    }

    if (currentUser.role === UserRole.SALES) {
      return lead.owner_user_id === currentUser.id;
    }

    return false;
  }

  private canAssignToUser(currentUser: any, targetUser: any, lead: Lead): boolean {
    if (currentUser.role === UserRole.ADMIN) {
      return true;
    }

    if (targetUser.id === currentUser.id) {
      return true;
    }

    if (lead.owner_user_id === targetUser.id) {
      return true;
    }

    if (currentUser.role === UserRole.MANAGER) {
      return targetUser.team_id === currentUser.team_id;
    }

    return false;
  }

  async remove(id: number, currentUser: any): Promise<void> {
    const lead = await this.findOne(id, currentUser);
    const leadCountry = lead.country;

    await this.dataSource.transaction(async manager => {
      await manager.getRepository(Deal).delete({ lead_id: id });
      await manager.getRepository(PriceOffer).delete({ lead_id: id });
      await manager.getRepository(Meeting).delete({ lead_id: id });
      await manager.getRepository(File).delete({ lead_id: id });
      await manager.getRepository(Message).delete({ lead_id: id });
      await manager.getRepository(LeadNote).delete({ lead_id: id });
      await manager.getRepository(Activity).delete({ lead_id: id });

      await manager.getRepository(Lead).delete({ id });
    });

    // Broadcast lead deletion for dashboard auto-refresh
    this.eventsGateway.broadcastLeadDeleted(id, leadCountry);
  }

  private canAccessLead(lead: Lead, currentUser: any): boolean {
    if (currentUser.role === UserRole.ADMIN) return true;
    if (currentUser.role === UserRole.MANAGER) {
      if (!currentUser.team_id) {
        return false;
      }
      return !lead.owner || lead.owner.team_id === currentUser.team_id;
    }
    if (currentUser.role === UserRole.SALES) {
      return lead.owner_user_id === currentUser.id;
    }
    return false;
  }

  async bulkCreate(leads: CreateLeadDto[], currentUser: any): Promise<Lead[]> {
    const createdLeads: Lead[] = [];
    const errors: string[] = [];

    for (const leadDto of leads) {
      try {
        const lead = await this.create(leadDto, currentUser);
        createdLeads.push(lead);
      } catch (error) {
        errors.push(`Failed to create lead ${leadDto.full_name}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Bulk import completed with errors: ${errors.join('; ')}`);
    }

    return createdLeads;
  }

  async takeOwnership(id: number, currentUser: any): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id },
      relations: ['owner']
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.owner_user_id !== null) {
      throw new ForbiddenException('Lead is already assigned to another user');
    }

    if (currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only sales users can take ownership of leads');
    }

    if (lead.status !== 'new') {
      throw new ForbiddenException('Only new leads can be taken ownership of');
    }

    lead.owner_user_id = currentUser.id;
    lead.updated_at = new Date();
    return this.leadRepository.save(lead);
  }

  async getUnassignedLeads(currentUser: any): Promise<Lead[]> {
    if (currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only sales users can view unassigned leads');
    }

    return this.leadRepository.find({
      where: {
        owner_user_id: IsNull(),
        status: LeadStatus.NEW
      },
      relations: ['campaign'],
      order: { created_at: 'DESC' }
    });
  }

  async getStats(currentUser: any): Promise<{
    total: number;
    bySource: Record<string, number>;
    byStatus: Record<string, number>;
    recent: Lead[];
  }> {
    const leads = await this.findAll(currentUser);

    const stats = {
      total: leads.length,
      bySource: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      recent: leads.slice(0, 10),
    };

    leads.forEach(lead => {
      if (lead.source) {
        stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;
      }
      if (lead.status) {
        stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
      }
    });

    return stats;
  }

  async transferLead(currentUser: any, dto: TransferLeadDto) {
    try {
      // FIXED: Removed non-existent relation (owner.team)
      const lead = await this.leadRepository.findOne({
        where: { id: dto.leadId },
        relations: ['owner', 'assignedTo']
      });

      if (!lead) {
        throw new NotFoundException('Lead not found');
      }

      const receiver = await this.userRepository.findOne({
        where: { id: dto.receiverId, active: true },
        relations: ['team']
      });

      if (!receiver) {
        throw new NotFoundException('Receiver user not found');
      }

      if (receiver.id === currentUser.id) {
        throw new ForbiddenException('You cannot transfer a lead to yourself');
      }

      await this.validateTransferPermission(currentUser, lead, receiver);

      const originalOwnerId = lead.owner_user_id;

      // Transfer lead ownership
      lead.owner_user_id = receiver.id;
      lead.updated_at = new Date();

      const savedLead = await this.leadRepository.save(lead);
      const refreshedLead = await this.findOne(savedLead.id, currentUser);

      // Broadcast lead update
      this.realtimeGateway.broadcastLeadUpdate(
        refreshedLead.id,
        refreshedLead.country || 'unknown',
        refreshedLead,
      );
      this.eventsGateway.broadcastLeadUpdated(refreshedLead);

      const result = {
        message: 'Lead transferred successfully',
        leadId: lead.id,
        fromUser: currentUser.name,
        toUser: receiver.name
      };

      return result;

    } catch (error) {
      throw error;
    }
  }

  private async validateTransferPermission(currentUser: any, lead: any, receiver: any): Promise<void> {
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (currentUser.role === UserRole.MANAGER) {
      const leadTeamId = lead.team_id ?? lead.owner?.team_id ?? null;
      const isTeamLead = leadTeamId !== null ? leadTeamId === currentUser.team_id : lead.owner_user_id === currentUser.id;
      const isOwnLead = lead.owner_user_id === currentUser.id;

      if (!isTeamLead && !isOwnLead) {
        throw new ForbiddenException('You can only transfer leads from your team');
      }

      if (receiver.team_id !== currentUser.team_id) {
        throw new ForbiddenException('You can only transfer leads to users on your team');
      }
      return;
    }

    if (lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only transfer leads assigned to you');
    }

    if (currentUser.role === UserRole.SALES) {
      const allowedRoles = [UserRole.SALES, UserRole.SALES];
      if (!allowedRoles.includes(receiver.role)) {
        throw new ForbiddenException('Sales can only transfer to other sales or marketing users');
      }
    }

    if (currentUser.role === UserRole.SALES) {
      const allowedRoles = [UserRole.SALES, UserRole.SALES];
      if (!allowedRoles.includes(receiver.role)) {
        throw new ForbiddenException('Marketing can only transfer to other marketing or sales users');
      }
    }
  }

  async getLeadFiles(leadId: number, currentUser: any): Promise<{ data: any[] }> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view files for leads you own');
    }

    const files = await this.fileRepository.find({
      where: { lead_id: leadId },
      relations: ['uploadedBy'],
      order: { uploaded_at: 'DESC' }
    });

    return {
      data: files.map(file => ({
        id: file.id,
        name: file.name,
        url: file.url,
        size: file.size,
        type: file.type,
        uploaded_at: file.uploaded_at,
        uploaded_by: file.uploadedBy?.name || 'Unknown'
      }))
    };
  }

  async getLeadPriceOffers(leadId: number, currentUser: any): Promise<{ data: any[] }> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view price offers for leads you own');
    }

    const priceOffers = await this.priceOfferRepository.find({
      where: { lead_id: leadId },
      relations: ['createdBy'],
      order: { created_at: 'DESC' }
    });

    return {
      data: priceOffers.map(offer => ({
        id: offer.id,
        title: offer.title,
        amount: offer.amount,
        currency: offer.currency,
        description: offer.description,
        valid_until: offer.valid_until,
        status: offer.status,
        created_at: offer.created_at,
        created_by: offer.createdBy?.name || 'Unknown'
      }))
    };
  }

  async getLeadDealsAndOffers(leadId: number, currentUser: any, timeFilter?: string): Promise<{ data: any[] }> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view deals and offers for leads you own');
    }

    // Calculate date filter based on timeFilter
    let dateFilter: Date | undefined;
    if (timeFilter) {
      const now = new Date();
      switch (timeFilter) {
        case '1day':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '1week':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '1month':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = undefined;
      }
    }

    // Get deals from deals table
    const dealsQuery = this.dataSource.getRepository(Deal).createQueryBuilder('deal')
      .leftJoinAndSelect('deal.pipeline', 'pipeline')
      .leftJoinAndSelect('deal.stage', 'stage')
      .where('deal.lead_id = :leadId', { leadId });

    if (dateFilter) {
      // For deals, we don't have created_at, so we'll filter by expected_close_date or just show all
      // dealsQuery.andWhere('deal.expected_close_date >= :dateFilter', { dateFilter });
    }

    const deals = await dealsQuery.orderBy('deal.id', 'DESC').getMany();

    // Get price offers from price_offers table
    const priceOffersQuery = this.priceOfferRepository.createQueryBuilder('offer')
      .leftJoinAndSelect('offer.createdBy', 'createdBy')
      .where('offer.leadId = :leadId', { leadId });

    if (dateFilter) {
      priceOffersQuery.andWhere('offer.createdAt >= :dateFilter', { dateFilter });
    }

    const priceOffers = await priceOffersQuery.orderBy('offer.createdAt', 'DESC').getMany();

    // Combine and format the data
    const combinedData = [
      ...deals.map(deal => ({
        id: deal.id,
        type: 'deal',
        title: `Deal - ${deal.pipeline?.name || 'Unknown Pipeline'} (${deal.stage?.name || 'Unknown Stage'})`,
        amount: deal.amount,
        currency: deal.currency,
        status: deal.won ? 'won' : deal.lost_reason ? 'lost' : 'active',
        description: deal.lost_reason ? `Lost: ${deal.lost_reason}` : null,
        created_at: null, // deals don't have created_at in the entity
        expected_close_date: deal.expected_close_date,
        pipeline: deal.pipeline?.name,
        stage: deal.stage?.name,
        created_by: null
      })),
      ...priceOffers.map(offer => ({
        id: offer.id,
        type: 'price_offer',
        title: offer.title,
        amount: offer.amount,
        currency: offer.currency,
        status: offer.status,
        description: offer.description,
        created_at: offer.created_at,
        expected_close_date: null,
        pipeline: null,
        stage: null,
        created_by: offer.createdBy?.name || 'Unknown'
      }))
    ];

    // Sort by amount descending
    combinedData.sort((a, b) => (b.amount || 0) - (a.amount || 0));

    return { data: combinedData };
  }

  async getLeadMeetings(leadId: number, currentUser: any): Promise<{ data: any[] }> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view meetings for leads you own');
    }

    const meetings = await this.meetingRepository.find({
      where: { lead_id: leadId },
      relations: ['createdBy'],
      order: { date: 'ASC' }
    });

    return {
      data: meetings.map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        duration: meeting.duration,
        location: meeting.location,
        participants: meeting.participants,
        notes: meeting.notes,
        status: meeting.status,
        createdAt: meeting.created_at,
        created_by: meeting.createdBy?.name || 'Unknown'
      }))
    };
  }

  async getLeadTasks(leadId: number, currentUser: any): Promise<{ data: any[] }> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view tasks for leads you own');
    }

    // Get activities (tasks) for this lead
    const activities = await this.activityRepository.find({
      where: { lead_id: leadId, type: ActivityType.TASK },
      relations: ['user', 'lead'],
      order: { due_at: 'ASC' }
    });

    // Return raw Activity entities with all fields
    return {
      data: activities
    };
  }

  async getLeadSMS(leadId: number, currentUser: any): Promise<{ data: any[] }> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view SMS for leads you own');
    }

    const messages = await this.messageRepository.find({
      where: {
        lead_id: leadId,
        channel: MessageChannel.SMS
      },
      order: { timestamp: 'DESC' }
    });

    return {
      data: messages.map(msg => ({
        id: msg.id,
        body: msg.body,
        direction: msg.direction,
        timestamp: msg.timestamp,
        external_id: msg.external_id,
        channel: msg.channel
      }))
    };
  }

  async getLeadEmails(leadId: number, currentUser: any): Promise<{ data: any[] }> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view emails for leads you own');
    }

    const messages = await this.messageRepository.find({
      where: {
        lead_id: leadId,
        channel: MessageChannel.EMAIL
      },
      order: { timestamp: 'DESC' }
    });

    return {
      data: messages.map(msg => ({
        id: msg.id,
        body: msg.body,
        direction: msg.direction,
        timestamp: msg.timestamp,
        external_id: msg.external_id,
        channel: msg.channel
      }))
    };
  }

  async uploadLeadFile(leadId: number, file: any, body: any, currentUser: any): Promise<File> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only upload files to leads you own');
    }

    const path = require('path');
    const crypto = require('crypto');

    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
    const relativePath = `uploads/${uniqueFilename}`;

    const fileEntity = this.fileRepository.create({
      lead_id: leadId,
      name: body.name || file.originalname,
      original_name: file.originalname,
      url: `/${relativePath}`,
      file_path: relativePath,
      file_extension: fileExtension.replace('.', ''),
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      mime_type: file.mimetype,
      type: body.type || FileType.OTHER,
      uploaded_by: currentUser.id,
      uploaded_at: new Date()
    });

    const savedFile = await this.fileRepository.save(fileEntity);
    await this.updateLastInteractionDate(leadId);
    return savedFile;
  }

  async deleteLeadFile(leadId: number, fileId: number, currentUser: any): Promise<void> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only delete files from leads you own');
    }

    const file = await this.fileRepository.findOne({ where: { id: fileId, lead_id: leadId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Soft delete
    file.is_deleted = true;
    file.deleted_at = new Date();
    await this.fileRepository.save(file);
    await this.updateLastInteractionDate(leadId);
  }

  async createPriceOffer(leadId: number, dto: any, currentUser: any): Promise<PriceOffer> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only create price offers for leads you own');
    }

    const priceOffer = this.priceOfferRepository.create({
      lead_id: leadId,
      title: dto.title,
      amount: dto.amount,
      currency: dto.currency || 'USD',
      description: dto.description,
      valid_until: dto.valid_until ? new Date(dto.valid_until) : undefined,
      status: PriceOfferStatus.PENDING,
      created_by: currentUser.id
    });

    const savedPriceOffer = await this.priceOfferRepository.save(priceOffer);
    await this.updateLastInteractionDate(leadId);
    return savedPriceOffer;
  }

  async updatePriceOffer(leadId: number, offerId: number, dto: any, currentUser: any): Promise<PriceOffer> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only update price offers for leads you own');
    }

    const offer = await this.priceOfferRepository.findOne({ where: { id: offerId, lead_id: leadId } });
    if (!offer) {
      throw new NotFoundException('Price offer not found');
    }

    if (dto.status) {
      offer.status = dto.status;
    }

    const updatedOffer = await this.priceOfferRepository.save(offer);
    await this.updateLastInteractionDate(leadId);
    return updatedOffer;
  }

  async deletePriceOffer(leadId: number, offerId: number, currentUser: any): Promise<void> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only delete price offers from leads you own');
    }

    const offer = await this.priceOfferRepository.findOne({ where: { id: offerId, lead_id: leadId } });
    if (!offer) {
      throw new NotFoundException('Price offer not found');
    }

    await this.priceOfferRepository.remove(offer);
    await this.updateLastInteractionDate(leadId);
  }
  async scheduleMeeting(leadId: number, dto: any, currentUser: any): Promise<Meeting> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only schedule meetings for leads you own');
    }

    const meeting = this.meetingRepository.create({
      lead_id: leadId,
      title: dto.title,
      date: new Date(dto.date),
      duration: dto.duration || 30,
      location: dto.location,
      participants: dto.participants,
      notes: dto.notes,
      status: MeetingStatus.SCHEDULED,
      created_by: currentUser.id,
    });

    const savedMeeting = await this.meetingRepository.save(meeting);

    await this.updateLastInteractionDate(leadId);
    return savedMeeting;
  }


  async updateMeeting(leadId: number, meetingId: number, dto: any, currentUser: any): Promise<Meeting> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only update meetings for leads you own');
    }

    const meeting = await this.meetingRepository.findOne({ where: { id: meetingId, lead_id: leadId } });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (dto.title !== undefined) {
      meeting.title = dto.title;
    }
    if (dto.date !== undefined) {
      meeting.date = new Date(dto.date);
    }
    if (dto.duration !== undefined) {
      meeting.duration = dto.duration;
    }
    if (dto.location !== undefined) {
      meeting.location = dto.location;
    }
    if (dto.participants !== undefined) {
      meeting.participants = dto.participants;
    }
    if (dto.notes !== undefined) {
      meeting.notes = dto.notes;
    }
    if (dto.status !== undefined) {
      meeting.status = dto.status;
    }

    const updatedMeeting = await this.meetingRepository.save(meeting);
    await this.updateLastInteractionDate(leadId);
    return updatedMeeting;
  }

  async deleteMeeting(leadId: number, meetingId: number, currentUser: any): Promise<void> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only delete meetings from leads you own');
    }

    const meeting = await this.meetingRepository.findOne({ where: { id: meetingId, lead_id: leadId } });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    await this.meetingRepository.remove(meeting);
    await this.updateLastInteractionDate(leadId);
  }

  async sendSMS(leadId: number, message: string, currentUser: any): Promise<Message> {
    if (currentUser.role !== UserRole.ADMIN &&
        currentUser.role !== UserRole.MANAGER &&
        currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin, Manager, and Sales users can send SMS');
    }

    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!lead.phone) {
      throw new ForbiddenException('Lead does not have a phone number');
    }

    if (currentUser.role === UserRole.SALES) {
      if (lead.owner_user_id !== currentUser.id) {
        throw new ForbiddenException('You can only send SMS to leads you own');
      }
    }

    let processedMessage = message;
    if (processedMessage.includes('{{lead.full_name}}')) {
      processedMessage = processedMessage.replace('{{lead.full_name}}', lead.full_name);
    }
    if (processedMessage.includes('{{lead.phone}}')) {
      processedMessage = processedMessage.replace('{{lead.phone}}', lead.phone || '');
    }
    if (processedMessage.includes('{{lead.email}}')) {
      processedMessage = processedMessage.replace('{{lead.email}}', lead.email || '');
    }

    const smsMessage = this.messageRepository.create({
      lead_id: leadId,
      channel: MessageChannel.SMS,
      direction: MessageDirection.OUTGOING,
      body: processedMessage,
      timestamp: new Date(),
      external_id: `sms_${Date.now()}`
    });

    const savedMessage = await this.messageRepository.save(smsMessage);
    await this.updateLastInteractionDate(leadId);
    return savedMessage;
  }

  async createFromLandingPage(
    data: LandingLeadInput,
    options: CreateLandingLeadOptions = {},
  ): Promise<Lead> {
    const requireRecaptcha = options.requireRecaptcha ?? true;

    if (requireRecaptcha) {
      if (!data.recaptchaToken) {
        throw new ForbiddenException('Missing reCAPTCHA verification token');
      }
      const isValid = await this.recaptchaService.verifyToken(data.recaptchaToken, data.userIp);
      if (!isValid) {
        throw new ForbiddenException('reCAPTCHA verification failed');
      }
    }

    const normalizedDto: Partial<Lead> = {
      full_name: data.full_name,
      phone: data.phone ? this.normalizePhone(data.phone) : undefined,
      email: data.email ? this.normalizeEmail(data.email) : undefined,
      country: data.country ? this.normalizeCountry(data.country) : undefined,
      city: data.city,
      language: data.language,
      source: (data.website_name || data.source || 'landing_page') as any,
      campaign_id: data.campaign_id,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign || data.campaign,
      utm_term: data.utm_term,
      utm_content: data.utm_content,
      status: this.statusMapper.mapToValidStatus(data.status) || LeadStatus.NEW,
      advertiser_id: data.advertiser_id,
      website_id: data.website_id, // ✅ Save website_id to link lead to integration
      custom_fields: data.custom_fields,
    };

    let campaign: Campaign | null = null;
    if (normalizedDto.campaign_id) {
      campaign = await this.campaignRepository.findOne({
        where: { id: normalizedDto.campaign_id }
      });
      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }
    }

    if (data.campaign && !normalizedDto.campaign_id) {
      campaign = await this.campaignRepository.findOne({
        where: { name: data.campaign }
      });
      if (campaign) {
        normalizedDto.campaign_id = campaign.id;
      }
    }

    const duplicate = await this.findDuplicate(normalizedDto.phone, normalizedDto.email, normalizedDto.country);
    if (duplicate) {
      // Update existing lead: refresh created_at and set status to in_progress
      duplicate.created_at = new Date();
      duplicate.status = LeadStatus.IN_PROGRESS;

      const updatedLead = await this.leadRepository.save(duplicate);
      const enrichedLead = await this.loadLeadWithRelations(updatedLead.id);
      await this.dispatchLeadCreation(enrichedLead, campaign);
      return enrichedLead;
    }

    const savedLead = await this.dataSource.transaction(async manager => {
      const repo = manager.getRepository(Lead);
      const lead = repo.create(normalizedDto);
      return repo.save(lead);
    });

    const enrichedLead = await this.loadLeadWithRelations(savedLead.id);
    await this.dispatchLeadCreation(enrichedLead, campaign);

    if (campaign) {
      this.realtimeGateway.broadcastLandingPageSubmit(
        campaign.name || data.campaign || 'unknown',
        {
          leadId: enrichedLead.id,
          leadData: {
            full_name: enrichedLead.full_name,
            email: enrichedLead.email,
            phone: enrichedLead.phone,
            country: enrichedLead.country,
          },
          campaign: campaign.name,
          timestamp: new Date().toISOString(),
        }
      );
    }

    return enrichedLead;
  }

 async updateLeadStatus(id: number, data: { status: string; substatus?: string }, currentUser: any): Promise<Lead> {
 // FIXED: Removed non-existent relation (owner.team)
 const lead = await this.leadRepository.findOne({
   where: { id },
   relations: ['campaign', 'owner', 'assignedTo']
 });

   if (!lead) {
     throw new NotFoundException('Lead not found');
   }

   if (!this.canEditLead(lead, currentUser)) {
     throw new ForbiddenException('You do not have permission to update this lead status');
   }

   // Update the status to a valid database value
   lead.status = this.statusMapper.mapToValidStatus(data.status);
   if (data.substatus !== undefined) {
     lead.substatus = data.substatus;
   }
   lead.updated_at = new Date();

   await this.leadRepository.save(lead);
   const refreshedLead = await this.findOne(id, currentUser);

   // Broadcast lead update to realtime gateway
   this.realtimeGateway.broadcastLeadUpdate(
     refreshedLead.id,
     refreshedLead.country || 'unknown',
     refreshedLead,
   );

   // Broadcast to events gateway for dashboard auto-refresh
   this.eventsGateway.broadcastLeadUpdated(refreshedLead);

   return refreshedLead;
 }

 private async updateLastInteractionDate(leadId: number, skipBroadcast = false): Promise<Date> {
   const timestamp = new Date();

   // Note: last_interaction_date field removed from schema
   // This method is kept for backward compatibility but does nothing

   if (!skipBroadcast) {
     // FIXED: Removed non-existent relation (owner.team)
     const refreshedLead = await this.leadRepository.findOne({
       where: { id: leadId },
       relations: ['campaign', 'owner', 'assignedTo']
     });

     if (refreshedLead) {
       this.realtimeGateway.broadcastLeadUpdate(
         refreshedLead.id,
         refreshedLead.country || 'unknown',
         refreshedLead
       );
       this.eventsGateway.broadcastLeadUpdated(refreshedLead);
     }
   }

   return timestamp;
 }
}
