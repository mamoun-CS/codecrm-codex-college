import { Injectable, Logger } from '@nestjs/common';
import { LeadStatus } from '../entities/leads.entity';

@Injectable()
export class LeadStatusMapperService {
  private readonly logger = new Logger(LeadStatusMapperService.name);

  // Valid database enum values based on the current schema
  private readonly VALID_DB_STATUSES = [
    'new',
    'in_progress',
    'follow_up',
    'not_answering',
    'closed',
    'won',
    'lost'
  ] as const;

  // Mapping from application status values to database enum values
  private readonly statusMap: Map<string, LeadStatus> = new Map([
    // Map common application statuses to valid DB values
    ['contacted', LeadStatus.IN_PROGRESS],
    ['interested', LeadStatus.IN_PROGRESS],
    ['qualified', LeadStatus.FOLLOW_UP],
    ['proposal', LeadStatus.FOLLOW_UP],
    ['negotiation', LeadStatus.FOLLOW_UP],
    ['archived', LeadStatus.CLOSED],
    ['closed_won', LeadStatus.WON],
    ['closed_lost', LeadStatus.LOST],
    ['meeting_scheduled', LeadStatus.FOLLOW_UP],
    ['proposal_sent', LeadStatus.FOLLOW_UP],
    // Ensure all valid enum values map to themselves
    ['new', LeadStatus.NEW],
    ['in_progress', LeadStatus.IN_PROGRESS],
    ['follow_up', LeadStatus.FOLLOW_UP],
    ['not_answering', LeadStatus.NOT_ANSWERING],
    ['closed', LeadStatus.CLOSED],
    ['won', LeadStatus.WON],
    ['lost', LeadStatus.LOST],
  ]);

  /**
   * Maps any status string to a valid database enum value
   * @param status - The status value to map
   * @returns A valid LeadStatus enum value
   */
  mapToValidStatus(status: string | LeadStatus | undefined): LeadStatus {
    if (!status) {
      this.logger.warn('Empty status provided, defaulting to NEW');
      return LeadStatus.NEW;
    }

    const statusStr = status.toString().toLowerCase();

    // If it's already a valid enum value, return it
    if (this.VALID_DB_STATUSES.includes(statusStr as any)) {
      return statusStr as LeadStatus;
    }

    // Try to map it
    const mapped = this.statusMap.get(statusStr);
    if (mapped) {
      this.logger.debug(`Mapped status '${status}' to '${mapped}'`);
      return mapped;
    }

    // Fallback to IN_PROGRESS for unknown statuses
    this.logger.warn(`Unknown status '${status}' mapped to IN_PROGRESS`);
    return LeadStatus.IN_PROGRESS;
  }

  /**
   * Validates if a status is valid for the database
   * @param status - The status to validate
   * @returns true if valid, false otherwise
   */
  isValidStatus(status: string | LeadStatus): boolean {
    const statusStr = status.toString().toLowerCase();
    return this.VALID_DB_STATUSES.includes(statusStr as any);
  }

  /**
   * Gets all valid database status values
   * @returns Array of valid status strings
   */
  getValidStatuses(): readonly string[] {
    return this.VALID_DB_STATUSES;
  }

  /**
   * Maps a status for database insertion/update
   * @param status - The status to prepare for DB
   * @returns The mapped status as a string
   */
  prepareForDatabase(status: string | LeadStatus | undefined): string {
    return this.mapToValidStatus(status);
  }
}