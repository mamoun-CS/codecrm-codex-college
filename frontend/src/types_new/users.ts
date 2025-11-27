import { UserRole } from './enums';

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  team_id?: number;
  active: boolean;
  created_at: string;

  // Relations
  team?: Team;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  created_at: string;

  // Relations
  users?: User[];
}