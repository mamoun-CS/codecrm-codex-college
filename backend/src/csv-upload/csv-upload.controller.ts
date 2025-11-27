import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';
import { CsvUploadService } from './csv-upload.service';

@Controller('csv-upload')
@UseGuards(JwtAuthGuard)
export class CsvUploadController {
  constructor(private readonly csvUploadService: CsvUploadService) {}

  @Post('spend-data')
  @UseInterceptors(FileInterceptor('csvFile'))
  async uploadSpendData(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    // Only admins can upload CSV data
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can upload CSV data');
    }

    if (!file) {
      throw new ForbiddenException('No file uploaded');
    }

    return this.csvUploadService.processSpendDataCSV(file, req.user);
  }

  @Post('leads')
  @UseInterceptors(FileInterceptor('csvFile'))
  async uploadLeads(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    // Only admins can upload CSV data
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can upload CSV data');
    }

    if (!file) {
      throw new ForbiddenException('No file uploaded');
    }

    return this.csvUploadService.processLeadsCSV(file, req.user);
  }
}
