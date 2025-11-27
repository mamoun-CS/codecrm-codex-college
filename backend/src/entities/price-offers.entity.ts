import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './leads.entity';
import { User } from './user.entity';

export enum PriceOfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

@Entity('price_offers')
export class PriceOffer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  lead_id: number;

  @Column()
  title: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  valid_until: Date;

  @Column({
    type: 'enum',
    enum: PriceOfferStatus,
    default: PriceOfferStatus.PENDING
  })
  status: PriceOfferStatus;

  @Column({ nullable: true })
  created_by: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;
}
