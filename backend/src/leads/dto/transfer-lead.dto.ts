import { IsInt, IsOptional, IsString } from 'class-validator';

export class TransferLeadDto {
  @IsInt()
  leadId: number;

  @IsInt()
  receiverId: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
