import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, Headers,
  UseGuards, HttpCode, HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TradesService, CreateTradeDto, UpdateTradeDto, SyncTradeDto, TradesQueryDto } from './trades.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Trades')
@Controller('trades')
export class TradesController {
  constructor(
    private readonly tradesService: TradesService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Manual CRUD ───────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Log a trade manually' })
  create(@Request() req: any, @Body() dto: CreateTradeDto) {
    return this.tradesService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List trades with filters & pagination' })
  findAll(@Request() req: any, @Query() query: TradesQueryDto) {
    return this.tradesService.findAll(req.user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get single trade' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.tradesService.findOne(req.user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update trade (e.g. set exit price)' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTradeDto) {
    return this.tradesService.update(req.user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete trade' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.tradesService.remove(req.user.id, id);
  }

  // ── MT4/MT5 Sync endpoint ─────────────────────────────────
  // Called by custom Expert Advisor over HTTP POST
  // Authenticated via X-Api-Key header mapped to an Account
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive trade from MT4/MT5 Expert Advisor' })
  @ApiHeader({ name: 'X-Api-Key', description: 'Account API key from Settings' })
  async syncFromEA(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: SyncTradeDto,
  ) {
    if (!apiKey) throw new UnauthorizedException('Missing X-Api-Key header');

    const account = await this.prisma.account.findFirst({ where: { apiKey } });
    if (!account) throw new UnauthorizedException('Invalid API key');

    return this.tradesService.syncFromEA(account.id, dto);
  }
}
