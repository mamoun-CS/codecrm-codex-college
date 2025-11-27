import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @OneToMany(() => User, (user) => user.team)
  users: User[];
}
