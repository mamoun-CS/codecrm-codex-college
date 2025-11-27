import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './leads.entity';
import { User } from './user.entity';

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  lead_id: number;

  @Column()
  title: string;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ default: 30 })
  duration: number;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  participants: string;

  @Column({ nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.SCHEDULED
  })
  status: MeetingStatus;

  @Column({ nullable: true })
  created_by: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  updated_by: number;

  @Column({ nullable: true })
  meeting_link: string;

  @Column({ default: false })
  reminder_sent: boolean;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;
}
