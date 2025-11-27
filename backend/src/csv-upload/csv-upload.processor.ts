import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import csv from 'csv-parser';
import { AdSpend } from '../entities/ad-spend.entity';
import { Campaign } from '../entities/campaigns.entity';
import { Lead, LeadSource, LeadStatus } from '../entities/leads.entity';

interface CsvJobPayload {
  file: string;
  filename: string;
  mimetype: string;
  userId: number;
}

interface SpendRow {
  Date: string;
  Campaign: string;
  Spend: string;
  Currency: string;
}

interface LeadRow {
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  source?: string;
  campaign_name?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

@Injectable()
@Processor('csv-upload')
export class CsvUploadProcessor extends WorkerHost {
  private readonly logger = new Logger(CsvUploadProcessor.name);

  constructor(
    @InjectRepository(AdSpend)
    private readonly adSpendRepository: Repository<AdSpend>,
    @InjectRepository(Campaign)
    private readonly campaignRepository: Repository<Campaign>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {
    super();
  }

  async process(job: Job<CsvJobPayload>) {
    if (job.name === 'process-spend') {
      this.logger.log(`Processing spend CSV from job ${job.id}`);
      const buffer = Buffer.from(job.data.file, 'base64');
      return this.processSpendBuffer(buffer, job);
    }

    if (job.name === 'process-leads') {
      this.logger.log(`Processing leads CSV from job ${job.id}`);
      const buffer = Buffer.from(job.data.file, 'base64');
      return this.processLeadsBuffer(buffer, job);
    }

    this.logger.warn(`Unknown job ${job.name}`);
    return null;
  }

  async processInline(jobName: string, payload: CsvJobPayload) {
    const stubJob = {
      id: `inline-${Date.now()}`,
      name: jobName,
      data: payload,
      updateProgress: async () => undefined,
    } as unknown as Job<CsvJobPayload>;

    return this.process(stubJob);
  }

  private async processSpendBuffer(buffer: Buffer, job: Job) {
    const rows = await this.parseCsv<SpendRow>(buffer);
    const errors: string[] = [];
    let processed = 0;
    let imported = 0;
    let matchedCampaigns = 0;

    const campaigns = await this.campaignRepository.find();
    const campaignMap = new Map<string, Campaign>();
    campaigns.forEach(campaign => {
      campaignMap.set(campaign.name.toLowerCase(), campaign);
    });

    for (const row of rows) {
      processed++;
      await job.updateProgress((processed / rows.length) * 100);

      try {
        if (!row.Date || !row.Campaign || !row.Spend || !row.Currency) {
          errors.push(`Row ${processed}: Missing required fields`);
          continue;
        }

        const date = new Date(row.Date);
        if (Number.isNaN(date.getTime())) {
          errors.push(`Row ${processed}: Invalid date format: ${row.Date}`);
          continue;
        }

        const spend = parseFloat(row.Spend);
        if (Number.isNaN(spend) || spend < 0) {
          errors.push(`Row ${processed}: Invalid spend amount: ${row.Spend}`);
          continue;
        }

        const campaignName = row.Campaign.trim().toLowerCase();
        const campaign = campaignMap.get(campaignName);

        if (!campaign) {
          errors.push(`Row ${processed}: Campaign not found: ${row.Campaign}`);
          continue;
        }

        matchedCampaigns++;

        const existingSpend = await this.adSpendRepository.findOne({
          where: {
            campaign_id: campaign.id,
            date,
          },
        });

        if (existingSpend) {
          existingSpend.spend = spend;
          existingSpend.currency = row.Currency;
          await this.adSpendRepository.save(existingSpend);
        } else {
          const adSpend = this.adSpendRepository.create({
            campaign_id: campaign.id,
            date,
            spend,
            currency: row.Currency,
          });
          await this.adSpendRepository.save(adSpend);
        }

        imported++;
      } catch (error: any) {
        errors.push(`Row ${processed}: ${error.message}`);
      }
    }

    return {
      processed,
      imported,
      matchedCampaigns,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async processLeadsBuffer(buffer: Buffer, job: Job) {
    const rows = await this.parseCsv<LeadRow>(buffer);
    const errors: string[] = [];
    const duplicates: string[] = [];
    let processed = 0;
    let imported = 0;

    const campaigns = await this.campaignRepository.find();
    const campaignMap = new Map<string, Campaign>();
    campaigns.forEach(campaign => campaignMap.set(campaign.name.toLowerCase(), campaign));

    for (const row of rows) {
      processed++;
      await job.updateProgress((processed / rows.length) * 100);

      try {
        if (!row.full_name || (!row.email && !row.phone)) {
          errors.push(`Row ${processed}: Missing required fields (full_name and at least email or phone)`);
          continue;
        }

        let existingByEmail: Lead | null = null;
        let existingByPhone: Lead | null = null;

        if (row.email) {
          existingByEmail = await this.leadRepository.findOne({
            where: { email: row.email.trim().toLowerCase() },
          });
        }

        if (row.phone) {
          existingByPhone = await this.leadRepository.findOne({
            where: { phone: row.phone.trim() },
          });
        }

        if (existingByEmail) {
          duplicates.push(`Row ${processed}: Email already exists - ${row.email} (lead ${existingByEmail.full_name})`);
        }

        if (existingByPhone) {
          duplicates.push(`Row ${processed}: Phone already exists - ${row.phone} (lead ${existingByPhone.full_name})`);
        }

        let campaignId: number | null = null;
        if (row.campaign_name) {
          const campaign = campaignMap.get(row.campaign_name.trim().toLowerCase());
          if (campaign) {
            campaignId = campaign.id;
          }
        }

        const lead = this.leadRepository.create({
          full_name: row.full_name.trim(),
          phone: row.phone?.trim(),
          email: row.email?.trim().toLowerCase(),
          country: row.country?.trim(),
          city: row.city?.trim(),
          language: row.language?.trim(),
          source: this.normalizeLeadSource(row.source),
          campaign_id: campaignId ?? undefined,
          utm_source: row.utm_source?.trim(),
          utm_medium: row.utm_medium?.trim(),
          utm_campaign: row.utm_campaign?.trim(),
          utm_term: row.utm_term?.trim(),
          utm_content: row.utm_content?.trim(),
          status: LeadStatus.NEW,
        });

        await this.leadRepository.save(lead);
        imported++;
      } catch (error: any) {
        errors.push(`Row ${processed}: ${error.message}`);
      }
    }

    return {
      processed,
      imported,
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async parseCsv<T>(buffer: Buffer): Promise<T[]> {
    const rows: T[] = [];
    const stream = Readable.from(buffer);

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data: T) => rows.push(data))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });

    return rows;
  }

  private normalizeLeadSource(source?: string): LeadSource {
    if (!source) {
      return LeadSource.MANUAL;
    }

    const normalized = source.trim().toLowerCase();
    switch (normalized) {
      case 'meta':
      case 'facebook':
      case 'fb':
        return LeadSource.META;
      case 'tiktok':
        return LeadSource.TIKTOK;
      case 'landing':
      case 'landing_page':
      case 'landingpage':
        return LeadSource.LANDING_PAGE;
      case 'wordpress':
      case 'wp':
        return LeadSource.WORDPRESS;
      case 'import':
        return LeadSource.IMPORT;
      case 'api':
        return LeadSource.API;
      case 'manual':
      default:
        return LeadSource.MANUAL;
    }
  }
}
