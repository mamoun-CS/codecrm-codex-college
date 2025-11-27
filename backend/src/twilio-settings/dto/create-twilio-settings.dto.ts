import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTwilioSettingsDto {
  @IsString()
  @IsNotEmpty()
  account_sid: string;

  @IsString()
  @IsNotEmpty()
  auth_token: string;

  @IsString()
  @IsNotEmpty()
  phone_number: string;
}
