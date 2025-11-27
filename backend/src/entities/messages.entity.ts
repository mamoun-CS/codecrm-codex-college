import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './leads.entity';

export enum MessageChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email'
}

export enum MessageDirection {
  IN = 'in',
  OUT = 'out',
  OUTGOING = 'out',  // Alias for backward compatibility
  INCOMING = 'in'    // Alias for backward compatibility
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  lead_id: number;

  @Column({
    type: 'enum',
    enum: MessageChannel
  })
  channel: MessageChannel;

  @Column({
    type: 'enum',
    enum: MessageDirection
  })
  direction: MessageDirection;

  @Column('text')
  body: string;

  @Column({ nullable: true })
  external_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  // Email-specific fields
  @Column({ nullable: true })
  subject: string;

  @Column({ nullable: true })
  from_email: string;

  @Column({ nullable: true })
  to_email: string;

  @Column({ type: 'text', nullable: true })
  cc_emails: string;

  @Column({ type: 'text', nullable: true })
  bcc_emails: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: any;

  @Column({ nullable: true })
  email_status: string;

  @Column({ type: 'timestamp', nullable: true })
  opened_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  clicked_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  bounced_at: Date;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @ManyToOne(() => Lead, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;
}
