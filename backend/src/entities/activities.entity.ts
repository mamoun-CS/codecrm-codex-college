import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './leads.entity';
import { User } from './user.entity';
import { Campaign } from './campaigns.entity';

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task'
}

export enum LeadTouchpointEvent {
  VIEW = 'view',
  SUBMIT = 'submit'
}

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  lead_id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column({
    type: 'enum',
    enum: ActivityType
  })
  type: ActivityType;

  @Column('text', { nullable: true })
  content: string;

  @Column({ type: 'timestamp', nullable: true })
  due_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  done_at: Date;

  @Column({ default: 'medium' })
  priority: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

@Entity('lead_touchpoints')
export class LeadTouchpoint {
 @PrimaryGeneratedColumn()
 id: number;

 @Column({ nullable: true })
 lead_id: number;

 @Column({ nullable: true })
 campaign_id: number;

 @Column({
   type: 'enum',
   enum: LeadTouchpointEvent
 })
 event_type: LeadTouchpointEvent;

 @Column({ nullable: true })
 campaign_name: string;

 @Column({ nullable: true })
 ip_address: string;

 @Column({ nullable: true })
 country: string;

 @Column({ nullable: true })
 user_agent: string;

 @Column('jsonb', { nullable: true })
 additional_data: Record<string, any>;

 @Column({ type: 'timestamptz', default: () => 'now()' })
 created_at: Date;

 @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
 @JoinColumn({ name: 'lead_id' })
 lead: Lead;

 @ManyToOne(() => Campaign, { onDelete: 'SET NULL' })
 @JoinColumn({ name: 'campaign_id' })
 campaign: Campaign;
}
