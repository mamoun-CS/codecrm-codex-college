import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { AuditLog } from '../entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
