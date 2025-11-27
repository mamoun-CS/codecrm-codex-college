import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('twilio_settings')
export class TwilioSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  account_sid: string;

  @Column()
  auth_token: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ nullable: true })
  webhook_url: string;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  user_id: number;

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