import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('activity')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('feed')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.SALES)
  getActivityFeed(
    @Request() req,
    @Query('limit') limit?: string
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.activityService.getActivityFeed(req.user, limitNum);
  }

  @Get('recent')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.SALES)
  getRecentActivities(
    @Request() req,
    @Query('hours') hours?: string
  ) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.activityService.getRecentActivities(req.user, hoursNum);
  }

  @Get('entity')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.SALES)
  getActivitiesByEntity(
    @Request() req,
    @Query('entity') entity: string,
    @Query('entityId') entityId?: string
  ) {
    const entityIdNum = entityId ? parseInt(entityId, 10) : undefined;
    return this.activityService.getActivitiesByEntity(req.user, entity, entityIdNum);
  }
}
