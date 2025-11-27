import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Team } from './team.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
  MARKETING = 'marketing'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password_hash: string;

  @Column({
    type: 'varchar',
    default: 'sales'
  })
  role: string;

  @Column({ nullable: true })
  team_id: number;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => Team, (team) => team.users)
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
