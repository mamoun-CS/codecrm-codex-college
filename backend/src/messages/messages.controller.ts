import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * POST /api/messages/send → send WhatsApp/SMS/Email messages.
   * n8n should send data in this format:
   * {
   *   "lead_id": 101,
   *   "channel": "whatsapp",
   *   "direction": "out",
   *   "body": "Hello {{lead.full_name}}, thank you for registering!"
   * }
   */
  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  sendMessage(@Body() sendMessageDto: any, @Request() req) {
    return this.messagesService.sendMessage(sendMessageDto, req.user);
  }

  @Get('lead/:leadId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  getMessagesByLead(@Param('leadId') leadId: string, @Request() req) {
    return this.messagesService.getMessagesByLead(+leadId, req.user);
  }

  @Get('lead/:leadId/emails')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  getLeadEmails(@Param('leadId') leadId: string, @Request() req) {
    return this.messagesService.getLeadEmails(+leadId, req.user);
  }

  @Get('lead/:leadId/sms')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  getLeadSMS(@Param('leadId') leadId: string, @Request() req) {
    return this.messagesService.getLeadSMS(+leadId, req.user);
  }

  /**
   * POST /api/messages/send-email → send email to lead
   */
  @Post('send-email')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  sendEmail(@Body() sendEmailDto: any, @Request() req) {
    return this.messagesService.sendEmail(sendEmailDto, req.user);
  }
}

@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivitiesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * POST /api/activities → create tasks/calls/meetings with reminders.
   * n8n should send data in this format:
   * {
   *   "lead_id": 101,
   *   "type": "task",
   *   "content": "Follow up in 24h",
   *   "due_at": "2025-10-05T10:00:00Z",
   *   "user_id": 5
   * }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  createActivity(@Body() createActivityDto: any, @Request() req) {
    return this.messagesService.createActivity(createActivityDto, req.user);
  }

  @Get('lead/:leadId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  getActivitiesByLead(@Param('leadId') leadId: string, @Request() req) {
    return this.messagesService.getActivitiesByLead(+leadId, req.user);
  }

  @Put(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  updateActivityStatus(
    @Param('id') id: string,
    @Body('done') done: boolean,
    @Request() req
  ) {
    return this.messagesService.updateActivityStatus(+id, done, req.user);
  }

  @Get('pending')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  getPendingActivities(@Request() req) {
    return this.messagesService.getPendingActivities(req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  deleteActivity(@Param('id') id: string, @Request() req) {
    return this.messagesService.deleteActivity(+id, req.user);
  }
}
