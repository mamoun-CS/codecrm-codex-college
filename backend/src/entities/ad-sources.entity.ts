import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ad_sources')
export class AdSource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  channel: string;

  @Column()
  account_id: string;

  @Column()
  name: string;
}
