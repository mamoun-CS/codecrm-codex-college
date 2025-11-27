import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallsService } from './calls.service';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('initiate')
  async initiateCall(@Body() body: { lead_id: number; phone_number: string; lead_name: string }, @Request() req) {
    try {
      const result = await this.callsService.initiateCall(body.lead_id, body.phone_number, body.lead_name, req.user.id);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
