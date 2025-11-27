import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { LandingPagesService } from './landing-pages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';

import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto';

@Controller('landing-pages')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class LandingPagesController {
  constructor(private readonly landingPagesService: LandingPagesService) {}

  @Post()
  create(@Body() createLandingPageDto: CreateLandingPageDto, @Request() req: any) {
    return this.landingPagesService.create(createLandingPageDto, req.user);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('campaign_id') campaignId?: string,
  ) {
    const filters = campaignId ? { campaign_id: parseInt(campaignId, 10) } : undefined;
    return this.landingPagesService.findAll(req.user, filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.landingPagesService.findOne(id, req.user);
  }

  // ✅ استعمل PATCH كتحديث جزئي واستمر مرّر req.user
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLandingPageDto: UpdateLandingPageDto,
    @Request() req: any,
  ) {
    return this.landingPagesService.update(id, updateLandingPageDto, req.user);
  }

  // ✅ اختياري: حافظ على PUT لكن خليه يمر بنفس مسار التحقق ويستعمل الـ DTO
  @Put(':id')
  replace(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateLandingPageDto,
    @Request() req: any,
  ) {
    // نفس service.update يتعامل مع جميع الحقول بما فيها sections/settings
    return this.landingPagesService.update(id, body, req.user);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.landingPagesService.remove(id, req.user);
  }

  // -------------------------------
  // 🧩 مسارات الأقسام والإعدادات
  // -------------------------------

  // ترجيع الأقسام للصفحة (يخدم طلب الفرونت إند GET /landing-pages/:id/sections)
  @Get(':id/sections')
  async getSections(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const page = await this.landingPagesService.findOne(id, req.user);
    return page.sections ?? [];
  }

  // حفظ الأقسام بشكل منفصل (اختياري إذا بدك save مستقل)
  @Put(':id/sections')
  async setSections(
    @Param('id', ParseIntPipe) id: number,
    @Body('sections') sections: any[],
    @Request() req: any,
  ) {
    return this.landingPagesService.update(id, { sections } as UpdateLandingPageDto, req.user);
  }

  // ترجيع الإعدادات
  @Get(':id/settings')
  async getSettings(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const page = await this.landingPagesService.findOne(id, req.user);
    return page.settings ?? {};
  }

  // حفظ الإعدادات
  @Put(':id/settings')
  async setSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body('settings') settings: Record<string, any>,
    @Request() req: any,
  ) {
    return this.landingPagesService.update(id, { settings } as UpdateLandingPageDto, req.user);
  }
}

// -------------------------------
// 🌐 Public controller (بدون Auth)
// -------------------------------
@Controller('landing')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PublicLandingPagesController {
  constructor(private readonly landingPagesService: LandingPagesService) {}

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const landingPage = await this.landingPagesService.findBySlug(slug);

    // ⚠️ خيار: امنع عرض صفحات غير مفعّلة للجمهور
    if (!landingPage.active) {
      // ممكن ترجع 404 أو رسالة مناسبة
      // throw new NotFoundException('Landing page not found');
    }

    // رجّع أقسام وإعدادات أيضاً ليتمكن الفرونت إند من البناء الديناميكي
    return {
      id: landingPage.id,
      title: landingPage.title,
      description: landingPage.description,
      content: landingPage.content, // لو لسه محتفظ عليه للتوافق
      sections: landingPage.sections ?? [],
      settings: landingPage.settings ?? {},
      campaign: landingPage.campaign
        ? {
            id: landingPage.campaign.id,
            name: landingPage.campaign.name,
          }
        : null,
    };
  }
}
