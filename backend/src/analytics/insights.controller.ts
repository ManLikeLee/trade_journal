import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InsightsService } from './insights.service';

@ApiTags('Insights')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('analytics/insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get()
  @ApiOperation({ summary: 'AI-powered rule-based trading insights' })
  getInsights(
    @Request() req: any,
    @Query('accountId') accountId?: string,
  ) {
    return this.insightsService.generate(req.user.id, accountId);
  }
}
