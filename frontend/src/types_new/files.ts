import { FileType } from './enums';

export interface File {
  id: number;
  lead_id?: number;
  uploaded_by?: number;
  name: string;
  url: string;
  size?: string;
  mime_type?: string;
  type: FileType;
  uploaded_at: string;

  // Relations (forward declarations)
  lead?: {
    id: number;
    full_name: string;
    phone?: string;
    email?: string;
    status: string;
    source: string;
  };
  uploadedBy?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}