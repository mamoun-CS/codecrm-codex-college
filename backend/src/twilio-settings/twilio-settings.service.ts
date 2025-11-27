import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwilioSetting } from '../entities/twilio-settings.entity';
import { CreateTwilioSettingsDto } from './dto/create-twilio-settings.dto';
import { UpdateTwilioSettingsDto } from './dto/update-twilio-settings.dto';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioSettingsService {
  constructor(
    @InjectRepository(TwilioSetting)
    private readonly twilioSettingsRepository: Repository<TwilioSetting>,
  ) {}

  async getSettingsForUser(userId: number): Promise<TwilioSetting | null> {
    return this.twilioSettingsRepository.findOne({
      where: { user_id: userId },
    });
  }

  async saveSettings(userId: number, payload: CreateTwilioSettingsDto): Promise<TwilioSetting> {
    const existing = await this.getSettingsForUser(userId);

    if (existing) {
      this.twilioSettingsRepository.merge(existing, payload);
      return this.twilioSettingsRepository.save(existing);
    }

    const entity = this.twilioSettingsRepository.create({
      ...payload,
      user_id: userId,
    });

    return this.twilioSettingsRepository.save(entity);
  }

  async updateSettings(
    id: number,
    userId: number,
    payload: UpdateTwilioSettingsDto,
  ): Promise<TwilioSetting> {
    const existing = await this.twilioSettingsRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!existing) {
      throw new NotFoundException('Twilio settings not found');
    }

    this.twilioSettingsRepository.merge(existing, payload);
    return this.twilioSettingsRepository.save(existing);
  }

  async testConnection(accountSid: string, authToken: string, phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = new Twilio(accountSid, authToken);

      // Try to fetch account info to test connection
      const account = await client.api.accounts(accountSid).fetch();

      return {
        success: true,
        message: `Connection successful. Account: ${account.friendlyName}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  async setupDefaultSettings(userId: number): Promise<TwilioSetting> {
    const defaultSettings: CreateTwilioSettingsDto = {
      account_sid: process.env.TWILIO_ACCOUNT_SID || '',
      auth_token: process.env.TWILIO_AUTH_TOKEN || '',
      phone_number: process.env.TWILIO_PHONE_NUMBER || '',
    };

    return this.saveSettings(userId, defaultSettings);
  }
}
