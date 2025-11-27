import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { SyncLeadsDto } from '../leads/dto/sync-leads.dto';
import { LeadsService } from '../leads/leads.service';
import { IntegrationsService } from './integrations.service';
import { LeadResponseDto } from '../leads/dto/create-lead.dto';
import { Lead, LeadSource } from '../entities/leads.entity';

@ApiTags('Sync')
@ApiBearerAuth()
@ApiExtraModels(LeadResponseDto)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sync')
export class SyncController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly integrationsService: IntegrationsService,
  ) {}

  @Post('leads')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETING)
  @ApiOperation({ summary: 'Sync normalized leads from external integrations' })
  @ApiCreatedResponse({
    description: 'Leads synced successfully',
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
            processed: { type: 'number', example: 5 },
            integration_id: { type: 'number', nullable: true, example: 3 },
            platform_type: { type: 'string', example: 'meta' },
            batch_id: { type: 'string', example: 'batch_2024_03_21T10_00_00Z' },
            synced_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-03-21T10:00:00.000Z',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid payload',
        error: 'Bad Request',
      },
    },
  })
  async syncLeads(@Body() payload: SyncLeadsDto, @Request() req: any) {
    const integration = payload.integration_id
      ? await this.integrationsService.getIntegrationById(
          payload.integration_id,
        )
      : null;

    const created: LeadResponseDto[] = [];
    for (const leadDto of payload.leads) {
      const lead = await this.leadsService.create(leadDto, req.user);
      created.push(this.toLeadResponse(lead));
    }

    return {
      data: created,
      meta: {
        processed: created.length,
        integration_id: integration?.id ?? null,
        platform_type: payload.platform_type,
        batch_id: payload.batch_id ?? null,
        synced_at: payload.synced_at ?? new Date().toISOString(),
      },
    };
  }

  private toLeadResponse(lead: Lead): LeadResponseDto {
    return new LeadResponseDto({
      id: lead.id,
      full_name: lead.full_name,
      phone: lead.phone ?? undefined,
      email: lead.email ?? undefined,
      country: lead.country ?? undefined,
      city: lead.city ?? undefined,
      language: lead.language ?? undefined,
      source: (lead.source ?? LeadSource.MANUAL) as LeadSource,
      source_reference_id: lead.source_reference_id,
      raw_payload: lead.raw_payload ?? undefined,
      campaign_id: lead.campaign_id ?? undefined,
      owner_user_id: lead.owner_user_id ?? undefined,
      status: lead.status ?? undefined,
      advertiser_id: lead.advertiser_id ?? undefined,
      custom_fields: lead.custom_fields ?? undefined,
      utm_source: lead.utm_source ?? undefined,
      utm_medium: lead.utm_medium ?? undefined,
      utm_campaign: lead.utm_campaign ?? undefined,
      utm_term: lead.utm_term ?? undefined,
      utm_content: lead.utm_content ?? undefined,
      original_created_at: this.toIso(lead.original_created_at),
      created_at: this.toIso(lead.created_at) ?? new Date().toISOString(),
      updated_at: this.toIso(lead.updated_at) ?? new Date().toISOString(),
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
