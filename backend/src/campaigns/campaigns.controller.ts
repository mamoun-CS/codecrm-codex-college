import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  ListCampaignsDto,
  UpdateCampaignDto,
} from './dto/manage-campaign.dto';
import { Campaign } from '../entities/campaigns.entity';
import { GetLeadsDto } from '../leads/dto/get-leads.dto';

const errorResponse = {
  schema: {
    example: {
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
    },
  },
};

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETING)
  @ApiOperation({ summary: 'List campaigns with pagination and filters' })
  @ApiOkResponse({
    description: 'Paginated list of campaigns',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/Campaign' } },
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
  async getCampaigns(
    @Query() query: ListCampaignsDto,
    @Request() req: any,
  ) {
    const campaigns = await this.campaignsService.getCampaigns(query, req.user);
    const page = query.page ?? 1;
    const limit = query.limit ?? (campaigns.length || 25);
    const start = (page - 1) * limit;
    const data = campaigns.slice(start, start + limit);

    return {
      data,
      meta: {
        page,
        limit,
        total: campaigns.length,
        hasNextPage: start + limit < campaigns.length,
      },
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiOkResponse({ type: Campaign })
  async getCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.campaignsService.getCampaign(id, req.user);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETING)
  @ApiOperation({ summary: 'Create a campaign' })
  @ApiCreatedResponse({ type: Campaign })
  @ApiBadRequestResponse(errorResponse)
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @Request() req: any,
  ) {
    return this.campaignsService.createCampaign(dto, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETING)
  @ApiOperation({ summary: 'Update campaign' })
  @ApiOkResponse({ type: Campaign })
  @ApiBadRequestResponse(errorResponse)
  async updateCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
    @Request() req: any,
  ) {
    return this.campaignsService.updateCampaign(id, dto, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiOkResponse({
    description: 'Campaign removed',
    schema: { example: { success: true } },
  })
  async deleteCampaign(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    await this.campaignsService.deleteCampaign(id, req.user);
    return { success: true };
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Get campaign performance stats' })
  async getCampaignStats(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.campaignsService.getCampaignStats(id, req.user);
  }

  @Get(':id/leads')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'List leads for a campaign' })
  async getCampaignLeads(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetLeadsDto,
    @Request() req: any,
  ) {
    return this.campaignsService.getCampaignLeads(id, query, req.user);
  }

  @Post(':id/ad-spend')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETING)
  @ApiOperation({ summary: 'Add ad spend data for a campaign' })
  @ApiCreatedResponse({ description: 'Ad spend data added successfully' })
  async addAdSpend(
    @Param('id', ParseIntPipe) campaignId: number,
    @Body() dto: { date: string; spend: number; currency: string },
    @Request() req: any,
  ) {
    return this.campaignsService.addAdSpend(campaignId, dto, req.user);
  }

  @Get(':id/ad-spend')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES, UserRole.MARKETING)
  @ApiOperation({ summary: 'Get ad spend data for a campaign' })
  async getCampaignAdSpend(
    @Param('id', ParseIntPipe) campaignId: number,
    @Request() req: any,
  ) {
    return this.campaignsService.getCampaignAdSpend(campaignId, req.user);
  }

  @Delete(':campaignId/ad-spend/:spendId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MARKETING)
  @ApiOperation({ summary: 'Delete ad spend entry' })
  async deleteAdSpend(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Param('spendId', ParseIntPipe) spendId: number,
    @Request() req: any,
  ) {
    await this.campaignsService.deleteAdSpend(campaignId, spendId, req.user);
    return { success: true };
  }
}
