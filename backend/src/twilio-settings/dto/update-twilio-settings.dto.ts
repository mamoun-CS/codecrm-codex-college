import { PartialType } from '@nestjs/mapped-types';
import { CreateTwilioSettingsDto } from './create-twilio-settings.dto';

export class UpdateTwilioSettingsDto extends PartialType(CreateTwilioSettingsDto) {}
