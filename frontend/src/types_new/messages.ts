import { MessageChannel, MessageDirection } from './enums';

export interface Message {
  id: number;
  lead_id?: number;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string;
  external_id?: string;
  timestamp: string;

  // Relations (forward declaration)
  lead?: {
    id: number;
    full_name: string;
    phone?: string;
    email?: string;
    status: string;
    source: string;
  };
}