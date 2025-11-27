import { Controller, Post, Body, UseGuards, Get, Query, ParseIntPipe, Delete, Param, Patch, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Deals')
@Controller('deals')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Create a deal' })
  async createDeal(
    @Body() data: { lead_id: number; pipeline_id?: number; stage_id?: number; amount: number; currency?: string },
    @Request() req: any,
  ) {
    return this.dealsService.create(data, req.user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Get deals by lead ID' })
  async getDealsByLead(@Query('lead_id', ParseIntPipe) leadId: number) {
    return this.dealsService.findByLeadId(leadId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Get deal by ID' })
  async getDeal(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.dealsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Update deal' })
  async updateDeal(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<{ pipeline_id: number; stage_id: number; amount: number; currency: string; won: boolean; lost_reason: string }>,
    @Request() req: any,
  ) {
    return this.dealsService.update(id, data, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @ApiOperation({ summary: 'Delete deal' })
  async deleteDeal(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.dealsService.remove(id, req.user);
    return { success: true };
  }
}
