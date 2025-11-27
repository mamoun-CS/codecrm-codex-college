import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Campaign } from './campaigns.entity';

export enum LeadStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  FOLLOW_UP = 'follow_up',
  NOT_ANSWERING = 'not_answering',
  CLOSED = 'closed',
  WON = 'won',
  LOST = 'lost'
}

/**
 * Standardized Lead Sources
 *
 * These match the IntegrationProvider enum for consistency
 */
export enum LeadSource {
  MANUAL = 'manual',                  // Manually created leads
  META = 'meta',                      // Meta/Facebook Ads (standardized from 'facebook')
  TIKTOK = 'tiktok',                  // TikTok Ads
  GOOGLE = 'google',                  // Google Ads
  LANDING_PAGE = 'landing_page',      // Landing page submissions
  WORDPRESS = 'wordpress',            // WordPress sites
  EXTERNAL_WEBSITE = 'external_website', // External websites
  IMPORT = 'import',                  // Imported leads
  API = 'api'                         // API submissions
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  full_name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  language: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NEW
  })
  status: LeadStatus;

  @Column({ nullable: true })
  substatus: string;

  @Column({
    type: 'enum',
    enum: LeadSource,
    default: LeadSource.MANUAL
  })
  source: LeadSource;

  @Column({ nullable: true })
  campaign_id: number;

  @Column({ nullable: true })
  owner_user_id: number;

  @Column({ nullable: true })
  assigned_to: number;

  @Column({ nullable: true })
  utm_source: string;

  @Column({ nullable: true })
  utm_medium: string;

  @Column({ nullable: true })
  utm_campaign: string;

  @Column({ nullable: true })
  utm_term: string;

  @Column({ nullable: true })
  utm_content: string;

  @Column({ nullable: true })
  external_lead_id: string;

  @Column({ nullable: true })
  source_reference_id: string;

  @Column({ nullable: true })
  advertiser_id: string;

  // ✅ Website/Integration ID - links lead to its source integration
  @Column({ nullable: true })
  website_id: number;

  @Column('jsonb', { default: '{}' })
  custom_fields: Record<string, any>;

  @Column('jsonb', { default: '{}' })
  raw_payload: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  original_created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_email_sent_at: Date;

  @Column({ default: 0 })
  email_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_email_opened_at: Date;

  @ManyToOne(() => Campaign, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_user_id' })
  owner: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;
}
