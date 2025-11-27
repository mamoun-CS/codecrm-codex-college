import { Controller, Post, Body, Param, ParseIntPipe, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { SendEmailDto } from './email.service';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Email')
@Controller('api/email')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Send email' })
  async sendEmail(@Body() dto: SendEmailDto) {
    const message = await this.emailService.sendEmail(dto);
    return {
      success: true,
      messageId: message.id,
      externalId: message.external_id,
    };
  }

  @Post('lead/:leadId/send')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Send email to lead' })
  async sendLeadEmail(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Body() dto: { subject: string; body: string },
  ) {
    const message = await this.emailService.sendLeadEmail(leadId, dto.subject, dto.body);
    return {
      success: true,
      messageId: message.id,
    };
  }

  @Get('track/open/:messageId')
  @ApiOperation({ summary: 'Track email open (pixel endpoint)' })
  async trackOpen(@Param('messageId', ParseIntPipe) messageId: number) {
    await this.emailService.trackEmailOpen(messageId);
    // Return 1x1 transparent pixel
    return Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );
  }

  @Get('track/click/:messageId')
  @ApiOperation({ summary: 'Track email click' })
  async trackClick(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Query('url') url: string,
  ) {
    await this.emailService.trackEmailClick(messageId);
    // Redirect to original URL
    return { redirect: url };
  }
}

