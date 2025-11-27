
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageChannel, MessageDirection } from '../entities/messages.entity';
import { Activity, ActivityType } from '../entities/activities.entity';
import { Lead } from '../entities/leads.entity';
import { UserRole } from '../entities/user.entity';
import * as nodemailer from 'nodemailer';

export interface SendMessageDto {
  lead_id: number;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string;
  external_id?: string;
}

export interface SendEmailDto {
  lead_id: number;
  subject: string;
  body: string;
}

export interface CreateActivityDto {
  lead_id: number;
  type: ActivityType;
  content: string;
  due_at?: string;
  user_id: number;
  priority?: string;
  completed?: boolean;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {}

  /**
   * Send WhatsApp/SMS/Email messages
   * n8n should send data in this format:
   * {
   *   "lead_id": 101,
   *   "channel": "whatsapp",
   *   "direction": "out",
   *   "body": "Hello {{lead.full_name}}, thank you for registering!"
   * }
   */
  async sendMessage(sendMessageDto: SendMessageDto, currentUser: any): Promise<Message> {
    // Only Admin, Manager, and Sales can send messages
    if (currentUser.role !== UserRole.ADMIN &&
        currentUser.role !== UserRole.MANAGER &&
        currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin, Manager, and Sales users can send messages');
    }

    // Verify lead exists
    const lead = await this.leadRepository.findOne({
      where: { id: sendMessageDto.lead_id }
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check permissions based on role
    if (currentUser.role === UserRole.SALES) {
      // Sales can only message leads they own
      if (lead.owner_user_id !== currentUser.id) {
        throw new ForbiddenException('You can only send messages to leads you own');
      }
    } else if (currentUser.role === UserRole.MANAGER) {
      // Manager can message leads owned by their team
      // This would need team logic - for now allowing all
    }

    // Process template variables in message body
    let processedBody = sendMessageDto.body;
    if (processedBody.includes('{{lead.full_name}}')) {
      processedBody = processedBody.replace('{{lead.full_name}}', lead.full_name);
    }
    if (processedBody.includes('{{lead.phone}}')) {
      processedBody = processedBody.replace('{{lead.phone}}', lead.phone || '');
    }
    if (processedBody.includes('{{lead.email}}')) {
      processedBody = processedBody.replace('{{lead.email}}', lead.email || '');
    }

    const message = this.messageRepository.create({
      ...sendMessageDto,
      body: processedBody,
      timestamp: new Date(),
    });

    return this.messageRepository.save(message);
  }

  /**
   * Create tasks/calls/meetings with reminders
   * n8n should send data in this format:
   * {
   *   "lead_id": 101,
   *   "type": "task",
   *   "content": "Follow up in 24h",
   *   "due_at": "2025-10-05T10:00:00Z",
   *   "user_id": 5
   * }
   */
  async createActivity(createActivityDto: CreateActivityDto, currentUser: any): Promise<Activity> {
    // Only Admin, Manager, and Sales can create activities
    if (currentUser.role !== UserRole.ADMIN &&
        currentUser.role !== UserRole.MANAGER &&
        currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin, Manager, and Sales users can create activities');
    }

    // Verify lead exists
    const lead = await this.leadRepository.findOne({
      where: { id: createActivityDto.lead_id }
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check permissions based on role
    if (currentUser.role === UserRole.SALES) {
      // Sales can only create activities for leads they own
      if (lead.owner_user_id !== currentUser.id) {
        throw new ForbiddenException('You can only create activities for leads you own');
      }
    } else if (currentUser.role === UserRole.MANAGER) {
      // Manager can create activities for team leads
      // This would need team logic - for now allowing all
    }

    const activity = this.activityRepository.create({
      ...createActivityDto,
      due_at: createActivityDto.due_at ? new Date(createActivityDto.due_at) : undefined,
    });

    return this.activityRepository.save(activity);
  }

  async getMessagesByLead(leadId: number, currentUser: any): Promise<Message[]> {
    // Verify user has access to this lead
    const lead = await this.leadRepository.findOne({
      where: { id: leadId }
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check permissions
    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view messages for leads you own');
    }

    return this.messageRepository.find({
      where: { lead_id: leadId },
      order: { timestamp: 'ASC' }
    });
  }

  async getActivitiesByLead(leadId: number, currentUser: any): Promise<Activity[]> {
    // Verify user has access to this lead
    const lead = await this.leadRepository.findOne({
      where: { id: leadId }
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check permissions
    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view activities for leads you own');
    }

    return this.activityRepository.find({
      where: { lead_id: leadId },
      relations: ['user'],
      order: { due_at: 'ASC' }
    });
  }

  async updateActivityStatus(id: number, done: boolean, currentUser: any): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['lead']
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check permissions
    if (currentUser.role === UserRole.SALES && activity.lead?.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only update activities for leads you own');
    }

    // Update activity status
    const updateData: any = {
      completed: done
    };

    if (done) {
      updateData.done_at = new Date();
      updateData.completed_at = new Date();
    }

    await this.activityRepository.update(id, updateData);

    // Return updated activity
    const updatedActivity = await this.activityRepository.findOne({
      where: { id },
      relations: ['lead', 'user']
    });

    if (!updatedActivity) {
      throw new NotFoundException('Activity not found after update');
    }

    return updatedActivity;
  }

  async deleteActivity(id: number, currentUser: any): Promise<void> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: ['lead']
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    // Check permissions
    if (currentUser.role === UserRole.SALES && activity.lead?.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only delete activities for leads you own');
    }

    await this.activityRepository.delete(id);
  }

  async getPendingActivities(currentUser: any): Promise<Activity[]> {
    let whereCondition: any = { done_at: null };

    if (currentUser.role === UserRole.SALES) {
      // Sales see only their assigned activities
      whereCondition.user_id = currentUser.id;
    } else if (currentUser.role === UserRole.MANAGER) {
      // Manager would see team activities - simplified for now
      // In real implementation, you'd join with leads and check team ownership
    }

    return this.activityRepository.find({
      where: whereCondition,
      relations: ['lead', 'user'],
      order: { due_at: 'ASC' }
    });
  }

  /**
   * Send email using Gmail SMTP
   */
  async sendEmail(sendEmailDto: SendEmailDto, currentUser: any): Promise<{ success: boolean; message: string }> {
    // Only Admin, Manager, and Sales can send emails
    if (currentUser.role !== UserRole.ADMIN &&
        currentUser.role !== UserRole.MANAGER &&
        currentUser.role !== UserRole.SALES) {
      throw new ForbiddenException('Only Admin, Manager, and Sales users can send emails');
    }

    // Verify lead exists and has email
    const lead = await this.leadRepository.findOne({
      where: { id: sendEmailDto.lead_id }
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (!lead.email) {
      throw new ForbiddenException('Lead does not have an email address');
    }

    // Check permissions based on role
    if (currentUser.role === UserRole.SALES) {
      // Sales can only email leads they own
      if (lead.owner_user_id !== currentUser.id) {
        throw new ForbiddenException('You can only send emails to leads you own');
      }
    } else if (currentUser.role === UserRole.MANAGER) {
      // Manager can email leads owned by their team
      // This would need team logic - for now allowing all
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 's11927035@stu.najah.edu',
        pass: 'hcdy nioh goia mxoa'
      }
    });

    // Process template variables in email body
    let processedBody = sendEmailDto.body;
    if (processedBody.includes('{{lead.full_name}}')) {
      processedBody = processedBody.replace(/\{\{lead\.full_name\}\}/g, lead.full_name);
    }
    if (processedBody.includes('{{lead.phone}}')) {
      processedBody = processedBody.replace(/\{\{lead\.phone\}\}/g, lead.phone || '');
    }
    if (processedBody.includes('{{lead.email}}')) {
      processedBody = processedBody.replace(/\{\{lead\.email\}\}/g, lead.email || '');
    }

    // Send email
    try {
      const mailOptions = {
        from: 's11927035@stu.najah.edu',
        to: lead.email,
        subject: sendEmailDto.subject,
        text: processedBody,
        html: processedBody.replace(/\n/g, '<br>')
      };

      await transporter.sendMail(mailOptions);

      // Save email to messages table
      const message = this.messageRepository.create({
        lead_id: sendEmailDto.lead_id,
        channel: MessageChannel.EMAIL,
        direction: MessageDirection.OUTGOING,
        body: processedBody,
        timestamp: new Date(),
        external_id: `email_${Date.now()}`
      });

      await this.messageRepository.save(message);

      return {
        success: true,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('Email sending failed:', error);

      // Save failed email attempt
      const message = this.messageRepository.create({
        lead_id: sendEmailDto.lead_id,
        channel: MessageChannel.EMAIL,
        direction: MessageDirection.OUTGOING,
        body: processedBody,
        timestamp: new Date(),
        external_id: `email_failed_${Date.now()}`
      });

      await this.messageRepository.save(message);

      throw new Error(`Failed to send email: ${error.message}`);
    }
   }

  async getLeadEmails(leadId: number, currentUser: any): Promise<Message[]> {
    // Verify user has access to this lead
    const lead = await this.leadRepository.findOne({
      where: { id: leadId }
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check permissions
    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view emails for leads you own');
    }

    return this.messageRepository.find({
      where: {
        lead_id: leadId,
        channel: MessageChannel.EMAIL
      },
      order: { timestamp: 'DESC' }
    });
  }

  async getLeadSMS(leadId: number, currentUser: any): Promise<Message[]> {
    // Verify user has access to this lead
    const lead = await this.leadRepository.findOne({
      where: { id: leadId }
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Check permissions
    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view SMS for leads you own');
    }

    return this.messageRepository.find({
      where: {
        lead_id: leadId,
        channel: MessageChannel.SMS
      },
      order: { timestamp: 'DESC' }
    });
  }
}
