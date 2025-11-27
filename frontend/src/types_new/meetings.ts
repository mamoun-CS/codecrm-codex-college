import { MeetingStatus } from './enums';

export interface Meeting {
  id: number;
  lead_id?: number;
  title: string;
  date: string;
  duration: number;
  location?: string;
  participants?: string;
  notes?: string;
  status: MeetingStatus;
  created_by?: number;
  created_at: string;

  // Relations (forward declarations)
  lead?: {
    id: number;
    full_name: string;
    phone?: string;
    email?: string;
    status: string;
    source: string;
  };
  createdBy?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}