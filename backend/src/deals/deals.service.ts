import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal } from '../entities/deals.entity';
import { Lead } from '../entities/leads.entity';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private dealRepository: Repository<Deal>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {}

  async create(data: { lead_id: number; pipeline_id?: number; stage_id?: number; amount: number; currency?: string }, currentUser: any) {
    // Verify lead exists and user has access
    const lead = await this.leadRepository.findOne({ where: { id: data.lead_id } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only create deals for leads you own');
    }

    const deal = this.dealRepository.create({
      lead_id: data.lead_id,
      pipeline_id: data.pipeline_id || 1, // Default pipeline
      stage_id: data.stage_id || 1, // Default stage
      amount: data.amount,
      currency: data.currency || 'USD',
      won: false,
      created_by: currentUser.id,
      created_at: new Date(),
    });

    return this.dealRepository.save(deal);
  }

  async findByLeadId(leadId: number): Promise<Deal[]> {
    return this.dealRepository.find({
      where: { lead_id: leadId },
      relations: ['pipeline', 'stage', 'lead'],
      order: { created_at: 'DESC' }
    });
  }

  async findOne(id: number, currentUser: any): Promise<Deal> {
    const deal = await this.dealRepository.findOne({
      where: { id },
      relations: ['pipeline', 'stage', 'lead'],
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Check access
    if (currentUser.role === UserRole.SALES && deal.lead?.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view deals for leads you own');
    }

    return deal;
  }

  async update(id: number, data: Partial<Deal>, currentUser: any): Promise<Deal> {
    const deal = await this.findOne(id, currentUser);

    Object.assign(deal, data);
    deal.updated_at = new Date();

    return this.dealRepository.save(deal);
  }

  async remove(id: number, currentUser: any): Promise<void> {
    const deal = await this.findOne(id, currentUser);

    // Only admins, managers, and the creator can delete
    if (currentUser.role === UserRole.SALES && deal.created_by !== currentUser.id) {
      throw new ForbiddenException('You can only delete deals you created');
    }

    await this.dealRepository.remove(deal);
  }
}
