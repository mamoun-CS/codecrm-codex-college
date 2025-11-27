import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '../entities/user.entity';
import { Lead, LeadSource } from '../entities/leads.entity';
import { LeadsService } from './leads.service';
import { LeadsQueryService } from './leads-query.service';
import { GetLeadsDto } from './dto/get-leads.dto';
import {
  CreateLeadDto,
  LeadResponseDto,
  UpdateLeadDto,
} from './dto/create-lead.dto';
import {
  LeadListItem,
  PaginatedLeadsResponse,
} from './dto/paginated-leads.response';
import { TransferLeadDto } from './dto/transfer-lead.dto';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

class MeetingDto {
  @ApiProperty({ example: 'Discovery call' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '2024-04-01T10:00:00.000Z', format: 'date-time' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(5)
  duration?: number;

  @ApiPropertyOptional({ example: 'Zoom' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'john@example.com, jane@example.com' })
  @IsOptional()
  @IsString()
  participants?: string;

  @ApiPropertyOptional({ example: 'Discuss requirements' })
  @IsOptional()
  @IsString()
  notes?: string;
}

const errorResponse = {
  schema: {
    example: {
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
    },
  },
};

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(LeadResponseDto)
@Controller('leads')
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(
    private readonly leadsService: LeadsService,
    private readonly leadsQueryService: LeadsQueryService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({
    summary: 'List leads',
    description:
      'Returns paginated leads with filtering, sorting, and platform metadata.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    description: 'Filter by CRM source',
  })
  @ApiQuery({
    name: 'platform_source',
    required: false,
    description: 'Filter by unified platform source',
  })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at' })
  @ApiQuery({ name: 'sortOrder', required: false, example: 'desc' })
  @ApiOkResponse({
    description: 'Paginated leads',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(LeadResponseDto) },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 25 },
            total: { type: 'number', example: 120 },
            hasNextPage: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse(errorResponse)
  async getLeads(@Query() query: GetLeadsDto, @Request() req: any) {
    const paginated: PaginatedLeadsResponse =
      await this.leadsQueryService.getLeads(req.user, query);

    return {
      data: paginated.data,
      meta: paginated.meta,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Get lead details' })
  @ApiOkResponse({ type: LeadResponseDto })
  @ApiNotFoundResponse({
    schema: {
      example: {
        statusCode: 404,
        message: 'Lead not found',
        error: 'Not Found',
      },
    },
  })
  async getLead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<LeadResponseDto> {
    const lead = await this.leadsService.findOne(id, req.user);
    return this.toLeadResponse(lead);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Create lead' })
  @ApiCreatedResponse({ type: LeadResponseDto })
  @ApiBadRequestResponse(errorResponse)
  async createLead(
    @Body() dto: CreateLeadDto,
    @Request() req: any,
  ): Promise<LeadResponseDto> {
    // DEBUG: Log incoming request
    this.logger.log(`Creating lead with data: ${JSON.stringify(dto)}`);
    try {
      const lead = await this.leadsService.create(dto, req.user);
      return this.toLeadResponse(lead);
    } catch (error) {
      this.logger.error(`Error creating lead: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Update lead' })
  @ApiOkResponse({ type: LeadResponseDto })
  @ApiBadRequestResponse(errorResponse)
  async updateLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeadDto,
    @Request() req: any,
  ): Promise<LeadResponseDto> {
    const lead = await this.leadsService.update(id, dto, req.user);
    return this.toLeadResponse(lead);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Update lead status' })
  @ApiOkResponse({ type: LeadResponseDto })
  @ApiBadRequestResponse(errorResponse)
  async updateLeadStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { status: string; substatus?: string },
    @Request() req: any,
  ): Promise<LeadResponseDto> {
    const lead = await this.leadsService.update(id, dto, req.user);
    return this.toLeadResponse(lead);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete lead' })
  @ApiOkResponse({
    description: 'Lead deleted',
    schema: { example: { success: true } },
  })
  async deleteLead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<{ success: boolean }> {
    await this.leadsService.remove(id, req.user);
    return { success: true };
  }

  @Post('transfer')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Transfer lead ownership' })
  @ApiBody({ type: TransferLeadDto })
  @ApiOkResponse({
    schema: { example: { success: true, leadId: 42, receiverId: 7 } },
  })
  async transferLead(
    @Body() dto: TransferLeadDto,
    @Request() req: any,
  ): Promise<any> {
    return this.leadsService.transferLead(req.user, dto);
  }

  @Get(':id/meetings')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'List meetings for a lead' })
  async getMeetings(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.leadsService.getLeadMeetings(id, req.user);
  }

  @Post(':id/meetings')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Schedule meeting for a lead' })
  async scheduleMeeting(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MeetingDto,
    @Request() req: any,
  ) {
    return this.leadsService.scheduleMeeting(id, dto, req.user);
  }

  @Put(':leadId/meetings/:meetingId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Update meeting details (full update)' })
  async updateMeeting(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: MeetingDto,
    @Request() req: any,
  ) {
    return this.leadsService.updateMeeting(leadId, meetingId, dto, req.user);
  }

  @Patch(':leadId/meetings/:meetingId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Update meeting details (partial update)' })
  async patchMeeting(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: Partial<MeetingDto>,
    @Request() req: any,
  ) {
    return this.leadsService.updateMeeting(leadId, meetingId, dto, req.user);
  }

  @Delete(':leadId/meetings/:meetingId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Delete meeting' })
  async deleteMeeting(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Request() req: any,
  ) {
    await this.leadsService.deleteMeeting(leadId, meetingId, req.user);
    return { success: true };
  }

  @Get(':id/price-offers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'List price offers for a lead' })
  async getPriceOffers(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.leadsService.getLeadPriceOffers(id, req.user);
  }

  @Post(':id/price-offers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Create price offer for a lead' })
  async createPriceOffer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.leadsService.createPriceOffer(id, dto, req.user);
  }

  @Put(':leadId/price-offers/:offerId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Update price offer' })
  async updatePriceOffer(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.leadsService.updatePriceOffer(leadId, offerId, dto, req.user);
  }

  @Delete(':leadId/price-offers/:offerId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Delete price offer' })
  async deletePriceOffer(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Param('offerId', ParseIntPipe) offerId: number,
    @Request() req: any,
  ) {
    await this.leadsService.deletePriceOffer(leadId, offerId, req.user);
    return { success: true };
  }

  @Get(':id/deals-and-offers')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'List combined deals and price offers for a lead' })
  @ApiQuery({ name: 'timeFilter', required: false, description: 'Filter by time: 1day, 1week, 1month' })
  async getDealsAndOffers(
    @Param('id', ParseIntPipe) id: number,
    @Query('timeFilter') timeFilter: string,
    @Request() req: any,
  ) {
    return this.leadsService.getLeadDealsAndOffers(id, req.user, timeFilter);
  }

  @Get(':id/files')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'List files for a lead' })
  async getFiles(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.leadsService.getLeadFiles(id, req.user);
  }

  @Post(':id/files')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file for a lead' })
  async uploadFile(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type?: string },
    @Request() req: any,
  ) {
    return this.leadsService.uploadLeadFile(id, file, body, req.user);
  }

  @Delete(':leadId/files/:fileId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Delete file' })
  async deleteFile(
    @Param('leadId', ParseIntPipe) leadId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Request() req: any,
  ) {
    await this.leadsService.deleteLeadFile(leadId, fileId, req.user);
    return { success: true };
  }

  @Get(':id/tasks')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'List tasks (activities) for a lead' })
  async getTasks(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.leadsService.getLeadTasks(id, req.user);
  }

  @Get(':id/sms')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'List SMS messages for a lead' })
  async getSMS(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.leadsService.getLeadSMS(id, req.user);
  }

  @Get(':id/emails')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'List email messages for a lead' })
  async getEmails(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.leadsService.getLeadEmails(id, req.user);
  }

  @Post('landing-page-submit')
  @Public()
  @ApiOperation({
    summary: 'Collect lead from landing page',
    description: 'Open endpoint that bypasses authentication for forms.',
  })
  async createLeadFromLandingPage(
    @Body() data: any,
    @Req() req: ExpressRequest,
  ) {
    return this.leadsService.createFromLandingPage(
      { ...data, userIp: req.ip },
      { requireRecaptcha: true },
    );
  }

  private toLeadResponse(
    lead: Partial<Lead> | (LeadListItem & Partial<Lead>),
  ): LeadResponseDto {
    const asEntity = lead as Lead;
    const asList = lead as LeadListItem;

    return new LeadResponseDto({
      id: asEntity.id ?? asList.id,
      full_name: asEntity.full_name ?? asList.full_name ?? asList.name,
      phone: asEntity.phone ?? asList.phone ?? undefined,
      email: asEntity.email ?? asList.email ?? undefined,
      country: asEntity.country ?? asList.country ?? undefined,
      city: asEntity.city,
      language: asEntity.language ?? asList.language ?? undefined,
      source: (asEntity.source ??
        asList.source ??
        LeadSource.MANUAL) as LeadSource,
      source_reference_id: asEntity.source_reference_id,
      raw_payload: (asEntity.raw_payload ??
        undefined) as Record<string, any>,
      campaign_id:
        asEntity.campaign_id ??
        asEntity.campaign?.id ??
        asList.campaign?.id ??
        undefined,
      owner_user_id:
        asEntity.owner_user_id ??
        asEntity.owner?.id ??
        asList.owner?.id ??
        asList.owner_user_id ??
        undefined,
      status: asEntity.status ?? asList.status,
      substatus: asEntity.substatus,
      advertiser_id: asEntity.advertiser_id,
      custom_fields: (asEntity.custom_fields ??
        undefined) as Record<string, any>,
      utm_source: asEntity.utm_source,
      utm_medium: asEntity.utm_medium,
      utm_campaign: asEntity.utm_campaign,
      utm_term: asEntity.utm_term,
      utm_content: asEntity.utm_content,
      original_created_at: this.toIso(asEntity.original_created_at),
      created_at:
        this.toIso(asEntity.created_at) ??
        this.toIso(asList.created_at) ??
        new Date().toISOString(),
      updated_at:
        this.toIso(asEntity.updated_at) ??
        this.toIso(asList.updated_at) ??
        this.toIso(asEntity.created_at) ??
        this.toIso(asList.created_at) ??
        new Date().toISOString(),
    });
  }

  private toIso(value?: Date | string | null): string | undefined {
    if (!value) {
      return undefined;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
}
