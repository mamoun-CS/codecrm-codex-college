import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File, FileType } from '../entities/files.entity';
import { Lead } from '../entities/leads.entity';
import { UserRole } from '../entities/user.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class FileUploadService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ];

  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {
    this.ensureUploadDirExists();
  }

  private async ensureUploadDirExists() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadLeadFile(
    leadId: number,
    file: Express.Multer.File,
    fileType: FileType,
    currentUser: any,
  ): Promise<File> {
    // Validate lead exists and user has access
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only upload files to leads you own');
    }

    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
    const filePath = path.join(this.uploadDir, uniqueFilename);
    const relativePath = `uploads/${uniqueFilename}`;

    // Save file to disk
    await fs.writeFile(filePath, file.buffer);

    // Create database record
    const fileEntity = this.fileRepository.create({
      lead_id: leadId,
      uploaded_by: currentUser.id,
      name: file.originalname,
      original_name: file.originalname,
      url: `/${relativePath}`,
      file_path: relativePath,
      file_extension: fileExtension.replace('.', ''),
      size: file.size.toString(),
      mime_type: file.mimetype,
      type: fileType || FileType.OTHER,
    });

    return await this.fileRepository.save(fileEntity);
  }

  async getLeadFiles(leadId: number, currentUser: any): Promise<File[]> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only view files for leads you own');
    }

    return await this.fileRepository.find({
      where: { lead_id: leadId, is_deleted: false },
      relations: ['uploadedBy'],
      order: { uploaded_at: 'DESC' },
    });
  }

  async deleteFile(leadId: number, fileId: number, currentUser: any): Promise<void> {
    const lead = await this.leadRepository.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (currentUser.role === UserRole.SALES && lead.owner_user_id !== currentUser.id) {
      throw new ForbiddenException('You can only delete files from leads you own');
    }

    const file = await this.fileRepository.findOne({
      where: { id: fileId, lead_id: leadId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Soft delete
    file.is_deleted = true;
    file.deleted_at = new Date();
    await this.fileRepository.save(file);

    // Optionally delete physical file
    try {
      const filePath = path.join(process.cwd(), file.file_path);
      await fs.unlink(filePath);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to delete physical file:', error);
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }
  }
}

