import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  actor_user_id: number;

  @Column()
  entity: string;

  @Column({ nullable: true })
  entity_id: number;

  @Column()
  action: string;

  @Column('json', { nullable: true })
  diff_json: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  at: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_user_id' })
  actor: User;
}
