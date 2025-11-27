import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  score?: number;
  action?: string;
}

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(private readonly configService: ConfigService) {}

  async verifyToken(token: string, userIp?: string): Promise<boolean> {
    if (!token) {
      return false;
    }

    const secret = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    if (!secret) {
      this.logger.error('RECAPTCHA_SECRET_KEY is not configured');
      throw new InternalServerErrorException('reCAPTCHA is not configured');
    }

    try {
      const params = new URLSearchParams({
        secret,
        response: token,
      });

      if (userIp) {
        params.append('remoteip', userIp);
      }

      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const payload = (await response.json()) as RecaptchaResponse;
      if (!payload.success) {
        this.logger.warn(`reCAPTCHA verification failed: ${payload['error-codes']?.join(', ') ?? 'unknown error'}`);
      }
      return payload.success;
    } catch (error) {
      this.logger.error('Failed to verify reCAPTCHA token', error as Error);
      throw new InternalServerErrorException('Unable to verify reCAPTCHA token');
    }
  }
}
