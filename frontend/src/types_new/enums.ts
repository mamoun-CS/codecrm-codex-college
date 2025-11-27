// Enums for the new CRM schema

export enum LeadSource {
  MANUAL = 'manual',
  META = 'meta',
  TIKTOK = 'tiktok',
  GOOGLE_ADS = 'google_ads',
  LANDING_PAGE = 'landing_page',
  WORDPRESS = 'wordpress',
  API = 'api',
  IMPORT = 'import'
}

export enum LeadStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  FOLLOW_UP = 'follow_up',
  NOT_ANSWERING = 'not_answering',
  CLOSED = 'closed',
  WON = 'won',
  LOST = 'lost'
}

export enum LeadPlatformSource {
  MANUAL = 'manual',
  META = 'meta',
  TIKTOK = 'tiktok',
  GOOGLE_ADS = 'google_ads',
  LANDING_PAGE = 'landing_page',
  WORDPRESS = 'wordpress'
}

export enum ActivityType {
  CALL = 'call',
  MESSAGE = 'message',
  MEETING = 'meeting',
  NOTE = 'note'
}

export enum LeadTouchpointEvent {
  VIEW = 'view',
  SUBMIT = 'submit'
}

export enum MessageChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
  CALL = 'call'
}

export enum MessageDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing'
}

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  OTHER = 'other'
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  DONE = 'done',
  CANCELLED = 'cancelled'
}

export enum PriceOfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

export enum CampaignPlatformType {
  META = 'meta',
  TIKTOK = 'tiktok',
  GOOGLE_ADS = 'google_ads',
  GOOGLE = 'google'
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
  MARKETING = 'marketing'
}

export enum IntegrationProvider {
  META = 'meta',
  FACEBOOK = 'facebook',
  TIKTOK = 'tiktok',
  WORDPRESS = 'wordpress',
  EXTERNAL_WEBSITE = 'external_website',
  GOOGLE_ADS = 'google_ads',
  CUSTOM = 'custom'
}

export enum IntegrationType {
  OAUTH = 'oauth',
  API_KEY = 'api_key',
  WEBHOOK = 'webhook',
  EXTERNAL_WEBSITE = 'external_website',
  WORDPRESS = 'wordpress'
}

export enum IntegrationStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  INACTIVE = 'inactive'
}

export enum WebhookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error'
}

export enum IntegrationPlatformType {
  SOCIAL = 'social',
  ADS = 'ads',
  CMS = 'cms',
  META = 'meta'
}