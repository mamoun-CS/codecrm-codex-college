import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TikTokFormsQueryDto {
  @IsString()
  @IsNotEmpty()
  advertiser_id: string;
}

export class TikTokLeadsQueryDto extends TikTokFormsQueryDto {
  @IsString()
  @IsNotEmpty()
  form_id: string;
}

export interface TikTokStatePayload {
  userId: number;
  timestamp: number;
  nonce: string;
  signature: string;
}
