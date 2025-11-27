import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { Deal } from '../entities/deals.entity';
import { Pipeline } from '../entities/pipelines.entity';
import { Stage } from '../entities/stages.entity';
import { Lead } from '../entities/leads.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Deal, Pipeline, Stage, Lead])],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
