import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Campaign } from './campaigns.entity';

@Entity('landing_pages')
export class LandingPage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  slug: string;

  @Column('text', { nullable: true })
  content: string;

  @Column({ nullable: true })
  template: string;

  @Column('jsonb', { default: '{}' })
  settings: Record<string, any>;

  @Column('jsonb', { default: '[]' })
  sections: any[];

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  campaign_id: number;

  @Column({ nullable: true })
  created_by: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => Campaign, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;
}