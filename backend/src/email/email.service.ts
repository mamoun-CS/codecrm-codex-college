import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Message, MessageChannel, MessageDirection } from '../entities/messages.entity';
import { Lead } from '../entities/leads.entity';

export interface SendEmailDto {
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
  leadId?: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };

    this.transporter = nodemailer.createTransport(config);
    this.logger.log('Email transporter initialized');
  }

  async sendEmail(dto: SendEmailDto): Promise<Message> {
    try {
      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
        to: dto.to,
        subject: dto.subject,
        html: dto.body,
        cc: dto.cc?.join(', '),
        bcc: dto.bcc?.join(', '),
        attachments: dto.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Save email to database
      const message = this.messageRepository.create({
        lead_id: dto.leadId,
        channel: MessageChannel.EMAIL,
        direction: MessageDirection.OUT,
        body: dto.body,
        subject: dto.subject,
        from_email: process.env.SMTP_FROM_EMAIL,
        to_email: dto.to,
        cc_emails: dto.cc?.join(', '),
        bcc_emails: dto.bcc?.join(', '),
        external_id: info.messageId,
        email_status: 'sent',
        timestamp: new Date(),
      });

      const savedMessage = await this.messageRepository.save(message);

      // Update lead email tracking
      if (dto.leadId) {
        await this.updateLeadEmailTracking(dto.leadId);
      }

      this.logger.log(`Email sent successfully to ${dto.to}`);
      return savedMessage;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      
      // Save failed email attempt
      const failedMessage = this.messageRepository.create({
        lead_id: dto.leadId,
        channel: MessageChannel.EMAIL,
        direction: MessageDirection.OUT,
        body: dto.body,
        subject: dto.subject,
        to_email: dto.to,
        email_status: 'failed',
        error_message: error.message,
        timestamp: new Date(),
      });

      await this.messageRepository.save(failedMessage);
      throw error;
    }
  }

  async sendLeadEmail(leadId: number, subject: string, body: string): Promise<Message> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    
    if (!lead || !lead.email) {
      throw new Error('Lead not found or has no email address');
    }

    return this.sendEmail({
      to: lead.email,
      subject,
      body,
      leadId,
    });
  }

  async updateLeadEmailTracking(leadId: number): Promise<void> {
    await this.leadRepository.update(leadId, {
      last_email_sent_at: new Date(),
      email_count: () => 'email_count + 1',
    });
  }

  async trackEmailOpen(messageId: number): Promise<void> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    
    if (message) {
      message.opened_at = new Date();
      message.email_status = 'opened';
      await this.messageRepository.save(message);

      // Update lead tracking
      if (message.lead_id) {
        await this.leadRepository.update(message.lead_id, {
          last_email_opened_at: new Date(),
        });
      }
    }
  }

  async trackEmailClick(messageId: number): Promise<void> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    
    if (message) {
      message.clicked_at = new Date();
      message.email_status = 'clicked';
      await this.messageRepository.save(message);
    }
  }
}

