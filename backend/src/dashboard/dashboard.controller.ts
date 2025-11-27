import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin/:id')
  @Roles(UserRole.ADMIN)
  getAdminDashboard(@Param('id') id: string) {
    return this.dashboardService.getAdminDashboard(+id);
  }

  @Get('manager/:id')
  @Roles(UserRole.MANAGER)
  getManagerDashboard(@Param('id') id: string) {
    return this.dashboardService.getManagerDashboard(+id);
  }

  @Get('marketing/:id')
  @Roles(UserRole.SALES)
  getMarketingDashboard(@Param('id') id: string) {
    return this.dashboardService.getMarketingDashboard(+id);
  }

  @Get('sales/:id')
  @Roles(UserRole.SALES)
  getSalesDashboard(@Param('id') id: string) {
    return this.dashboardService.getSalesDashboard(+id);
  }

  @Get('stale-leads')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETING, UserRole.SALES)
  getStaleLeads(@Request() req: any) {
    return this.dashboardService.getStaleLeads(req.user);
  }
}
