import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController, ActivitiesController } from './messages.controller';
import { Message } from '../entities/messages.entity';
import { Activity } from '../entities/activities.entity';
import { Lead } from '../entities/leads.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Activity, Lead])],
  controllers: [MessagesController, ActivitiesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
