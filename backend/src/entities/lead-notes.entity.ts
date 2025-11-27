import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './leads.entity';
import { User } from './user.entity';

@Entity('lead_notes')
export class LeadNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  lead_id: number;

  @Column({ nullable: true })
  user_id: number;

  @Column('text')
  note: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
