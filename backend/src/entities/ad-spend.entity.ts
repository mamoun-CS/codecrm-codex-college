import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Campaign } from './campaigns.entity';

@Entity('ad_spend')
export class AdSpend {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  campaign_id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column('numeric', { precision: 10, scale: 2 })
  spend: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;
}
