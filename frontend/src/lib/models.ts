// Lead Management System - Data Models
// This file contains all TypeScript interfaces and types used throughout the application

// Core Lead Interface
export interface Lead {
  id: number;
  full_name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  language?: string;
  source?: LeadSource;
  status?: LeadStatus;
  substatus?: string;
  created_at: string;
  updated_at?: string;
  campaign_id?: number;
  owner_user_id?: number;
  transfer_to_user_id?: number;
  team_id?: number;

  // Relations
  campaign?: Campaign;
  owner?: User;
  team?: Team;
  transferTo?: User;
  notes?: LeadNote[];
}

// Lead Source Enum
export type LeadSource =
  | 'facebook'
  | 'google'
  | 'tiktok'
  | 'website'
  | 'whatsapp'
  | 'phone'
  | 'landing_page'
  | 'email'
  | 'referral';

// Lead Status Enum
export type LeadStatus =
  | 'new'
  | 'in_progress'
  | 'follow_up'
  | 'not_answering'
  | 'closed'
  | 'won'
  | 'lost';

// Campaign Interface
export interface Campaign {
  id: number;
  name: string;
  description?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

// User Interface
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  team_id?: number;
  country?: string;
  is_active: boolean;
  created_at: string;

  // Relations
  team?: Team;
}

// User Role Enum
export type UserRole =
  | 'admin'
  | 'manager'
  | 'sales'
  | 'marketing'
  | 'viewer';

// Team Interface
export interface Team {
  id: number;
  name: string;
  description?: string;
  manager_id?: number;
  created_at: string;
}

// Task Interface
export interface Task {
  id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: TaskPriority;
  status: TaskStatus;
  lead_id: number;
  assigned_to_user_id?: number;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;

  // Relations
  lead?: Lead;
  assigned_to?: User;
  created_by: User;
}

// Task Priority Enum
export type TaskPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

// Task Status Enum
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelled';

// Lead Note Interface
export interface LeadNote {
  id: number;
  note: string;
  lead_id: number;
  user_id: number;
  created_at: string;

  // Relations
  lead?: Lead;
  user: User;
}

// File Attachment Interface
export interface FileAttachment {
  id: number;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  lead_id: number;
  uploaded_by_user_id: number;
  created_at: string;

  // Relations
  lead?: Lead;
  uploaded_by: User;
}

// Price Offer Interface
export interface PriceOffer {
  id: number;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  status: PriceOfferStatus;
  valid_until?: string;
  lead_id: number;
  created_by_user_id: number;
  created_at: string;
  updated_at: string;

  // Relations
  lead?: Lead;
  created_by: User;
}

// Price Offer Status Enum
export type PriceOfferStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired';

// Meeting Interface
export interface Meeting {
  id: number;
  title: string;
  description?: string;
  date: string;
  duration: number; // minutes
  location?: string;
  meeting_link?: string;
  status: MeetingStatus;
  lead_id: number;
  created_by_user_id: number;
  participants?: string[]; // JSON array of participant names/emails
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  lead?: Lead;
  created_by: User;
}

// Meeting Status Enum
export type MeetingStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

// Email Communication Interface
export interface Email {
  id: number;
  subject: string;
  body: string;
  to_email: string;
  from_email?: string;
  status: EmailStatus;
  sent_at?: string;
  lead_id: number;
  sent_by_user_id: number;
  created_at: string;

  // Relations
  lead?: Lead;
  sent_by: User;
}

// Email Status Enum
export type EmailStatus =
  | 'draft'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed';

// SMS Communication Interface
export interface SMS {
  id: number;
  message: string;
  to_phone: string;
  from_phone?: string;
  status: SMSStatus;
  sent_at?: string;
  lead_id: number;
  sent_by_user_id: number;
  created_at: string;

  // Relations
  lead?: Lead;
  sent_by: User;
}

// SMS Status Enum
export type SMSStatus =
  | 'draft'
  | 'sent'
  | 'delivered'
  | 'failed';

// WhatsApp Message Interface
export interface WhatsAppMessage {
  id: number;
  message: string;
  direction: 'incoming' | 'outgoing';
  status: WhatsAppStatus;
  sent_at?: string;
  lead_id: number;
  sent_by_user_id?: number;
  created_at: string;

  // Relations
  lead?: Lead;
  sent_by?: User;
}

// WhatsApp Status Enum
export type WhatsAppStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

// Phone Call Interface
export interface PhoneCall {
  id: number;
  direction: 'incoming' | 'outgoing';
  duration?: number; // seconds
  status: CallStatus;
  notes?: string;
  recording_url?: string;
  lead_id: number;
  made_by_user_id: number;
  created_at: string;

  // Relations
  lead?: Lead;
  made_by: User;
}

// Call Status Enum
export type CallStatus =
  | 'completed'
  | 'missed'
  | 'voicemail'
  | 'failed';

// Advanced Filters Interface
export interface AdvancedFilters {
  source: string;
  campaign: string;
  status: string;
  owner: string;
  language: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  search: string;
}

// Pagination Interface
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API Response Interface
export interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: Pagination;
}

// Bulk Operation Interfaces
export interface BulkEditData {
  status?: LeadStatus;
  owner_user_id?: number;
  campaign_id?: number;
}

export interface BulkOperationResult {
  success: boolean;
  updated: number;
  failed: number;
  errors?: string[];
}

// Kanban Board Interfaces
export interface KanbanColumn {
  id: LeadStatus;
  title: string;
  color: string;
  count: number;
}

export interface KanbanCard {
  id: number;
  lead: Lead;
  isSelected: boolean;
  priority: 'low' | 'medium' | 'high';
}

// Timeline Event Interface
export interface TimelineEvent {
  id: string;
  type: 'lead_created' | 'status_changed' | 'note_added' | 'task_created' | 'file_uploaded' | 'email_sent' | 'sms_sent' | 'meeting_scheduled' | 'price_offer_created';
  title: string;
  description: string;
  timestamp: string;
  user?: User;
  metadata?: Record<string, any>;
}

// Export Options Interface
export interface ExportOptions {
  format: 'csv' | 'excel';
  filters?: AdvancedFilters;
  fields?: string[];
  includeNotes?: boolean;
  includeTasks?: boolean;
}

// Landing Page Builder Interfaces
export interface LandingPage {
  id: number;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  sections: LandingPageSection[];
  settings: LandingPageSettings;
  created_at: string;
  updated_at: string;
}

export interface LandingPageSection {
  id: string;
  type: LandingPageSectionType;
  order: number;
  content: Record<string, any>;
  styles: Record<string, any>;
}

export type LandingPageSectionType =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'pricing'
  | 'contact_form'
  | 'faq'
  | 'footer';

export interface LandingPageSettings {
  title: string;
  description?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  customCSS?: string;
  seoTitle?: string;
  seoDescription?: string;
  favicon?: string;
}

// WordPress Integration Interfaces
export interface WordPressSite {
  id: number;
  name: string;
  url: string;
  apiKey: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  created_at: string;
}

export interface WordPressForm {
  id: number;
  wordpress_site_id: number;
  form_id: string;
  name: string;
  fields_mapping: Record<string, string>;
  status: 'active' | 'inactive';
  created_at: string;
}

// Analytics Interfaces
export interface LeadAnalytics {
  totalLeads: number;
  conversionRate: number;
  averageDealSize: number;
  leadsBySource: Record<LeadSource, number>;
  leadsByStatus: Record<LeadStatus, number>;
  pipelineValue: number;
  topCampaigns: Array<{
    campaign: Campaign;
    leads: number;
    conversion: number;
  }>;
}

// Notification Interfaces
export interface Notification {
  id: number;
  type: 'task_due' | 'lead_assigned' | 'meeting_reminder' | 'follow_up_needed';
  title: string;
  message: string;
  user_id: number;
  is_read: boolean;
  data?: Record<string, any>;
  created_at: string;
}

// Permission Interfaces
export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface RolePermission {
  role: UserRole;
  permissions: Permission[];
}

// Form Validation Interfaces
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// API Error Interface
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// WebSocket Event Interfaces (for real-time updates)
export interface WebSocketEvent {
  type: 'lead_updated' | 'task_created' | 'notification_received';
  payload: any;
  timestamp: string;
}

// Search Interfaces
export interface SearchResult {
  type: 'lead' | 'task' | 'note' | 'file';
  id: number;
  title: string;
  description?: string;
  url: string;
  relevance: number;
}

export interface SearchFilters {
  types?: Array<'lead' | 'task' | 'note' | 'file'>;
  dateRange?: {
    start: string;
    end: string;
  };
  userId?: number;
  status?: string;
}

// Integration Status Interface
export interface IntegrationStatus {
  wordpress: boolean;
  emailProvider: boolean;
  smsProvider: boolean;
  whatsappApi: boolean;
  calendarSync: boolean;
}

// System Health Interface
export interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  integrations: IntegrationStatus;
  lastBackup?: string;
  uptime: number;
}
