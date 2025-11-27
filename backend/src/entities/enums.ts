export enum LeadSource {
  MANUAL = 'manual',
  META = 'meta',
  TIKTOK = 'tiktok',
  LANDING_PAGE = 'landing_page',
  WORDPRESS = 'wordpress',
  IMPORT = 'import',
  API = 'api'
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
  ARCHIVED = 'archived'
}

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task'
}

export enum MessageChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email'
}

export enum MessageDirection {
  IN = 'in',
  OUT = 'out'
}

export enum FileType {
  CONTRACT = 'contract',
  PROPOSAL = 'proposal',
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  OTHER = 'other'
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PriceOfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum IntegrationProvider {
  FACEBOOK = 'facebook',
  META = 'meta',
  TIKTOK = 'tiktok',
  GOOGLE = 'google',
  WORDPRESS = 'wordpress',
  API = 'api'
}
