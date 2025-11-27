import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../entities/leads.entity';
import { User } from '../entities/user.entity';
import { TwilioSettingsService } from '../twilio-settings/twilio-settings.service';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly twilioSettingsService: TwilioSettingsService,
    private configService: ConfigService,
  ) {}

  async initiateCall(
    leadId: number,
    phoneNumber: string,
    leadName: string,
    userId: number
  ) {
    try {
      this.logger.log(
        `Initiating call to ${leadName} (${phoneNumber}) for lead ID ${leadId} by user ${userId}`
      );

      // -----------------------------
      // Verify lead exists
      // -----------------------------
      const lead = await this.leadRepository.findOne({
        where: { id: leadId },
        relations: ['owner'],
      });

      if (!lead) {
        throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
      }

      // -----------------------------
      // Verify user exists
      // -----------------------------
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // -----------------------------
      // Load Twilio settings for user
      // -----------------------------
      const twilioSettings = await this.twilioSettingsService.getSettingsForUser(userId);
      const crmDomain =
        this.configService.get<string>('CRM_DOMAIN') || 'http://localhost:3002';

      if (
        !twilioSettings ||
        !twilioSettings.account_sid ||
        !twilioSettings.auth_token ||
        !twilioSettings.phone_number
      ) {
        throw new HttpException(
          'Please configure your Twilio settings first.',
          HttpStatus.BAD_REQUEST
        );
      }

      const { account_sid: accountSid, auth_token: authToken, phone_number: twilioPhoneNumber } =
        twilioSettings;

      // -----------------------------
      // Prepare Twilio client
      // -----------------------------
      const client = require('twilio')(accountSid, authToken);

      // -----------------------------
      // TwiML URL for voice response
      // -----------------------------
      const twimlUrl = `${crmDomain}/api/calls/twiml/${leadId}`;

      this.logger.log(`📞 Making Twilio call to ${phoneNumber} from ${twilioPhoneNumber}`);
      this.logger.log(`➡️ TwiML URL: ${twimlUrl}`);

      // -----------------------------
      // Create Twilio call
      // -----------------------------
      const call = await client.calls.create({
        url: twimlUrl,
        to: phoneNumber,
        from: twilioPhoneNumber,
        statusCallback: `${crmDomain}/api/calls/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      this.logger.log(`✅ Twilio call initiated successfully: ${call.sid}`);

      // -----------------------------
      // Response
      // -----------------------------
      return {
        call_id: call.sid,
        status: call.status,
        phone_number: phoneNumber,
        lead_name: leadName,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Failed to initiate call: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException('Twilio call error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // -----------------------------------
  // Handle status updates from Twilio
  // -----------------------------------
  async updateCallStatus(callSid: string, status: string) {
    this.logger.log(`Call ${callSid} status updated to: ${status}`);
    // Future: save to DB here
  }

  // -----------------------------------
  // Get call history (future feature)
  // -----------------------------------
  async getCallHistory(leadId: number) {
    return [];
  }
}
