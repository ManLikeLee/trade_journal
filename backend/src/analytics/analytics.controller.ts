import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService, AnalyticsQuery } from './analytics.service';

@ApiTags('Analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Core stats — win rate, PnL, expectancy, drawdown' })
  summary(@Request() req: any, @Query() query: AnalyticsQuery) {
    return this.analyticsService.getSummary(req.user.id, query);
  }

  @Get('equity-curve')
  @ApiOperation({ summary: 'Running equity curve data points' })
  equityCurve(@Request() req: any, @Query() query: AnalyticsQuery) {
    return this.analyticsService.getEquityCurve(req.user.id, query);
  }

  @Get('pnl-by-day')
  @ApiOperation({ summary: 'PnL aggregated by calendar day' })
  pnlByDay(@Request() req: any, @Query() query: AnalyticsQuery) {
    return this.analyticsService.getPnlByDay(req.user.id, query);
  }

  @Get('pnl-by-symbol')
  @ApiOperation({ summary: 'PnL breakdown per instrument' })
  pnlBySymbol(@Request() req: any, @Query() query: AnalyticsQuery) {
    return this.analyticsService.getPnlBySymbol(req.user.id, query);
  }

  @Get('win-loss-distribution')
  @ApiOperation({ summary: 'PnL bucketed into win/loss bands' })
  distribution(@Request() req: any, @Query() query: AnalyticsQuery) {
    return this.analyticsService.getWinLossDistribution(req.user.id, query);
  }
}
