import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * Standardized Integration Providers
 *
 * - META: Facebook/Meta Ads (OAuth-based)
 * - TIKTOK: TikTok Ads (OAuth-based)
 * - GOOGLE: Google Ads (OAuth-based)
 * - WORDPRESS: WordPress sites (API/webhook-based)
 * - EXTERNAL_WEBSITE: External websites/custom integrations (API-based)
 * - API: Generic API integrations
 */
export enum IntegrationProvider {
  META = 'meta',                      // Facebook/Meta Ads (standardized from 'facebook')
  TIKTOK = 'tiktok',                  // TikTok Ads
  GOOGLE = 'google',                  // Google Ads
  WORDPRESS = 'wordpress',            // WordPress sites
  EXTERNAL_WEBSITE = 'external_website', // External websites
  API = 'api'                         // Generic API
}

/**
 * Integration Types
 *
 * - OAUTH: OAuth 2.0 based integrations (Meta, TikTok, Google)
 * - WEBHOOK: Webhook-based integrations
 * - API: API-based integrations
 * - WORDPRESS: WordPress-specific integration
 * - EXTERNAL_WEBSITE: External website integration
 */
export enum IntegrationType {
  OAUTH = 'oauth',                    // OAuth 2.0 (Meta, TikTok, Google)
  WEBHOOK = 'webhook',                // Webhook-based
  API = 'api',                        // API-based
  WORDPRESS = 'wordpress',            // WordPress
  EXTERNAL_WEBSITE = 'external_website' // External website
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  CONNECTED = 'connected'
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'inactive'  // Alias for backward compatibility
}

@Entity('integrations')
export class Integration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 50
  })
  provider: IntegrationProvider;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true, unique: true })
  slug: string;

  @Column({ nullable: true })
  access_token: string;

  @Column({ nullable: true })
  refresh_token: string;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({ nullable: true })
  page_id: string;

  @Column({ nullable: true })
  page_name: string;

  @Column({ nullable: true })
  account_id: string;

  @Column({ nullable: true })
  webhook_url: string;

  @Column('jsonb', { nullable: true })
  webhook_config: any;

  @Column('jsonb', { nullable: true })
  extra: any;

  @Column({ type: 'timestamp', nullable: true })
  connected_at: Date;

  @Column({ nullable: true })
  created_by: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  // Additional fields used by the service (stored in extra JSONB or as virtual fields)
  // These are not in the base schema but needed for backward compatibility

  @Column({ nullable: true })
  user_id: number;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true
  })
  type: IntegrationType;

  // Fields that exist in the database
  @Column({ nullable: true })
  endpoint_url: string;

  @Column({ nullable: true })
  api_key: string;

  @Column({ nullable: true })
  url: string;

  // ✅ Leads count - actual database column for performance
  @Column({ type: 'integer', default: 0 })
  leads_count: number;

  // ✅ Status - actual database column
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'active'
  })
  status: IntegrationStatus;

  // Virtual/computed fields (not in database, stored in extra or computed)
  page_access_token?: string;
  user_access_token?: string;
  scopes?: string[];
  webhook_status?: WebhookStatus;
  auth_token?: string;
  updated_at?: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  user: User;
}

@Entity('tiktok_integrations')
export class TikTokIntegration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  access_token: string;

  @Column({ nullable: true })
  refresh_token: string;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({ nullable: true })
  user_id: number;

  @Column('jsonb', { nullable: true })
  advertiser_ids: string[];

  @Column({ nullable: true })
  app_id: string;

  @Column({ nullable: true })
  secret: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  created_by: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}

@Entity('websites')
export class Website {
 @PrimaryGeneratedColumn()
 id: number;

 @Column()
 name: string;

 @Column({ nullable: true })
 url: string;

 @Column({ nullable: true })
 api_key: string;

 @Column({ nullable: true })
 auth_token: string;

 @Column({ nullable: true })
 endpoint_url: string;

 @Column({ nullable: true })
 created_by: number;

 @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
 created_at: Date;

 @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
 updated_at: Date;

 @ManyToOne(() => User, { onDelete: 'SET NULL' })
 @JoinColumn({ name: 'created_by' })
 creator: User;
}
