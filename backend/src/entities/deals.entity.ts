import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './leads.entity';
import { Pipeline } from './pipelines.entity';
import { Stage } from './stages.entity';

@Entity('deals')
export class Deal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  lead_id: number;

  @Column({ nullable: true })
  pipeline_id: number;

  @Column({ nullable: true })
  stage_id: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  amount: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ type: 'date', nullable: true })
  expected_close_date: Date;

  @Column({ default: false })
  won: boolean;

  @Column({ nullable: true })
  lost_reason: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date;

  @Column({ nullable: true })
  created_by: number;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => Pipeline, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: Pipeline;

  @ManyToOne(() => Stage, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stage_id' })
  stage: Stage;
}
