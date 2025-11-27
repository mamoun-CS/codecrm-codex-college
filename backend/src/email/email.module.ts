import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { Message } from '../entities/messages.entity';
import { Lead } from '../entities/leads.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Lead])],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

