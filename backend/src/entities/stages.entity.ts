import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Pipeline } from './pipelines.entity';
import { Deal } from './deals.entity';

@Entity('stages')
export class Stage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  pipeline_id: number;

  @Column()
  name: string;

  @Column()
  "order": number;

  @ManyToOne(() => Pipeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: Pipeline;

  @OneToMany(() => Deal, (deal) => deal.stage)
  deals: Deal[];
}
