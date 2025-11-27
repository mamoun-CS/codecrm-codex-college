import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AdSource } from './ad-sources.entity';
import { User } from './user.entity';

export enum CampaignPlatformType {
  META = 'meta',
  TIKTOK = 'tiktok',
  GOOGLE_ADS = 'google_ads',
  GOOGLE = 'google'
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  ad_source_id: number;

  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  platform_campaign_id: string;

  @Column({ default: true })
  active: boolean;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  budget: number;

  @Column('numeric', { precision: 10, scale: 2, default: 0 })
  cost_per_lead: number;

  @Column({ default: 0 })
  lead_count: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => AdSource, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ad_source_id' })
  adSource: AdSource;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
