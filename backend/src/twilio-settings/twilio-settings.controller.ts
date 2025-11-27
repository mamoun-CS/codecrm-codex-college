import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TwilioSettingsService } from './twilio-settings.service';
import { CreateTwilioSettingsDto } from './dto/create-twilio-settings.dto';
import { UpdateTwilioSettingsDto } from './dto/update-twilio-settings.dto';

@Controller('twilio/settings')
@UseGuards(JwtAuthGuard)
export class TwilioSettingsController {
  constructor(private readonly twilioSettingsService: TwilioSettingsService) {}

  @Get('my-settings')
  async getMySettings(@Request() req) {
    const settings = await this.twilioSettingsService.getSettingsForUser(req.user.id);

    if (!settings) {
      throw new NotFoundException('Twilio settings not configured');
    }

    return { success: true, data: settings };
  }

  // Alias for frontend compatibility
  @Get('me')
  async getMe(@Request() req) {
    return this.getMySettings(req);
  }

  @Put('my-settings')
  async updateMySettings(@Body() payload: UpdateTwilioSettingsDto, @Request() req) {
    const existingSettings = await this.twilioSettingsService.getSettingsForUser(req.user.id);

    if (!existingSettings) {
      // Create new settings - need to ensure required fields are present
      if (!payload.account_sid || !payload.auth_token || !payload.phone_number) {
        throw new NotFoundException('All Twilio settings fields are required for initial setup');
      }
      const settings = await this.twilioSettingsService.saveSettings(req.user.id, payload as any);
      return { success: true, data: settings };
    } else {
      // Update existing settings
      const settings = await this.twilioSettingsService.updateSettings(existingSettings.id, req.user.id, payload);
      return { success: true, data: settings };
    }
  }

  @Post('test')
  async testConnection(@Body() payload: { accountSid: string; authToken: string; phoneNumber: string }, @Request() req) {
    const result = await this.twilioSettingsService.testConnection(payload.accountSid, payload.authToken, payload.phoneNumber);
    return { success: true, data: result };
  }

  @Post('setup-default')
  async setupDefault(@Request() req) {
    const settings = await this.twilioSettingsService.setupDefaultSettings(req.user.id);
    return { success: true, data: settings };
  }

  // Legacy endpoints for backward compatibility
  @Get()
  async getSettings(@Request() req) {
    return this.getMySettings(req);
  }

  @Put()
  async updateSettings(@Body() payload: UpdateTwilioSettingsDto, @Request() req) {
    return this.updateMySettings(payload, req);
  }
}
