import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Stage } from './stages.entity';

@Entity('pipelines')
export class Pipeline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Stage, (stage) => stage.pipeline)
  stages: Stage[];
}
