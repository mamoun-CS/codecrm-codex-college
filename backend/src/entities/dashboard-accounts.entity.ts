import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('dashboard_accounts')
export class DashboardAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  api_key: string;

  @Column({ nullable: true })
  refresh_token: string;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  created_by: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}