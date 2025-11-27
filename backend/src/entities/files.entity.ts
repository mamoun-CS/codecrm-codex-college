import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './leads.entity';
import { User } from './user.entity';

export enum FileType {
  CONTRACT = 'contract',
  PROPOSAL = 'proposal',
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  OTHER = 'other'
}

@Entity('files')
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  lead_id: number;

  @Column({ nullable: true })
  uploaded_by: number;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  file_path: string;

  @Column({ nullable: true })
  original_name: string;

  @Column({ nullable: true })
  file_extension: string;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true })
  mime_type: string;

  @Column({
    type: 'enum',
    enum: FileType,
    default: FileType.OTHER
  })
  type: FileType;

  @Column({ default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  uploaded_at: Date;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;
}
