import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../entities/user.entity';
import { Team } from '../entities/team.entity';
import { Lead } from '../entities/leads.entity';
import { DashboardAccount } from '../entities/dashboard-accounts.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Team, Lead, DashboardAccount]), EventsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
