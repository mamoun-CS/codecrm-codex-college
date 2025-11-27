import { PriceOfferStatus } from './enums';

export interface PriceOffer {
  id: number;
  lead_id?: number;
  title: string;
  amount: number;
  currency: string;
  description?: string;
  valid_until?: string;
  status: PriceOfferStatus;
  created_by?: number;
  created_at: string;
  updated_at: string;

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