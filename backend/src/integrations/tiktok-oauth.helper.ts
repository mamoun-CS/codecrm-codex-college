import { createHmac } from 'crypto';

export interface TikTokStatePayload {
  userId: number;
  timestamp: number;
  nonce: string;
  signature: string;
}

export class TikTokOAuthHelper {
  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
    private readonly stateSecret: string,
  ) {}

  buildAuthUrl(userId: number): { url: string; state: string } {
    const state = this.generateState(userId);
    const url = new URL('https://www.tiktok.com/auth/authorize');
    url.searchParams.set('client_key', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'ad_management,business_management,leads');
    url.searchParams.set('state', state);
    return { url: url.toString(), state };
  }

  generateState(userId: number): string {
    const nonce = Math.random().toString(16).slice(2);
    const timestamp = Date.now();
    const signature = this.sign(`${userId}:${timestamp}:${nonce}`);
    const payload: TikTokStatePayload = { userId, timestamp, nonce, signature };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  validateState(state?: string): TikTokStatePayload {
    if (!state) throw new Error('Missing state');
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as TikTokStatePayload;
    const expected = this.sign(`${decoded.userId}:${decoded.timestamp}:${decoded.nonce}`);
    if (expected !== decoded.signature) throw new Error('State mismatch');
    if (Date.now() - decoded.timestamp > 15 * 60 * 1000) throw new Error('State expired');
    return decoded;
  }

  private sign(data: string) {
    return createHmac('sha256', this.stateSecret).update(data).digest('hex');
  }
}
