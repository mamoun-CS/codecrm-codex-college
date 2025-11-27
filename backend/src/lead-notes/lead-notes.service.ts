import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadNote } from '../entities/lead-notes.entity';
import { Lead } from '../entities/leads.entity';
import { User, UserRole } from '../entities/user.entity';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.SALES]: 1,
  [UserRole.MARKETING]: 1,
};


export interface CreateLeadNoteDto {
  note: string;
}

@Injectable()
export class LeadNotesService {
  constructor(
    @InjectRepository(LeadNote)
    private leadNoteRepository: Repository<LeadNote>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {}

  async findAllByLead(leadId: number, currentUser: any): Promise<LeadNote[]> {
    // First check if user can access this lead
    const lead = await this.leadRepository.findOne({
      where: { id: leadId },
      relations: ['owner', 'campaign', 'assignedTo']
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check permissions
    if (!this.canAccessLead(lead, currentUser)) {
      throw new ForbiddenException('Access denied to this lead');
    }

    // Get all notes for this lead with user information
    return this.leadNoteRepository.find({
      where: { lead_id: leadId },
      relations: ['user'],
      order: { created_at: 'DESC' }
    });
  }

  async create(leadId: number, createLeadNoteDto: CreateLeadNoteDto, currentUser: any): Promise<LeadNote> {
    // First check if user can access this lead
    const lead = await this.leadRepository.findOne({
      where: { id: leadId },
      relations: ['owner', 'campaign', 'assignedTo']
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check permissions
    if (!this.canAccessLead(lead, currentUser)) {
      throw new ForbiddenException('Access denied to this lead');
    }

    // Validate note content
    if (!createLeadNoteDto.note || createLeadNoteDto.note.trim().length === 0) {
      throw new ForbiddenException('Note cannot be empty');
    }

    // Create the note
    const note = this.leadNoteRepository.create({
      lead_id: leadId,
      user_id: currentUser.id,
      note: createLeadNoteDto.note.trim(),
    });

    return this.leadNoteRepository.save(note);
  }

  private canAccessLead(lead: Lead, currentUser: any): boolean {
    // Admin can access all leads
    if (currentUser.role === UserRole.ADMIN) return true;
    
    // Manager can access leads from their team
    if (currentUser.role === UserRole.MANAGER) {
      if (!currentUser.team_id) {
        return false;
      }
      // Check if lead owner is in the same team
      return !lead.owner || lead.owner.team_id === currentUser.team_id;
    }

    // Sales can access leads they own
    if (currentUser.role === UserRole.SALES) {
      return lead.owner_user_id === currentUser.id;
    }

    // Marketing can access leads they own
    if (currentUser.role === UserRole.MARKETING) {
      return lead.owner_user_id === currentUser.id;
    }
    
    return false;
  }
}
