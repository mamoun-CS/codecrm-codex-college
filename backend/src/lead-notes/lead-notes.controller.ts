import { Controller, Get, Post, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { LeadNotesService } from './lead-notes.service';
import type { CreateLeadNoteDto } from './lead-notes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('leads/:leadId/notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadNotesController {
  constructor(private readonly leadNotesService: LeadNotesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.SALES)
  findAllByLead(@Param('leadId', ParseIntPipe) leadId: number, @Request() req) {
    return this.leadNotesService.findAllByLead(leadId, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.SALES)
  create(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Body() createLeadNoteDto: CreateLeadNoteDto,
    @Request() req
  ) {
    return this.leadNotesService.create(leadId, createLeadNoteDto, req.user);
  }
}
