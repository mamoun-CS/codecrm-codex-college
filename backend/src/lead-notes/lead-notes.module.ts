import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadNotesService } from './lead-notes.service';
import { LeadNotesController } from './lead-notes.controller';
import { LeadNote } from '../entities/lead-notes.entity';
import { Lead } from '../entities/leads.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LeadNote, Lead])],
  controllers: [LeadNotesController],
  providers: [LeadNotesService],
  exports: [LeadNotesService],
})
export class LeadNotesModule {}
