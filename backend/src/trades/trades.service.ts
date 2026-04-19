// ============================================================
// trades/trades.service.ts
// Core trade CRUD + MT4/MT5 sync with idempotency
// ============================================================
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TradeDirection, TradeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ── DTOs ─────────────────────────────────────────────────────
import {
  IsString, IsEnum, IsNumber, IsOptional, IsDateString,
  IsPositive, Min, Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTradeDto {
  @ApiProperty() @IsString() accountId: string;
  @ApiProperty() @IsString() symbol: string;
  @ApiProperty({ enum: ['BUY', 'SELL'] }) @IsEnum(TradeDirection) direction: TradeDirection;
  @ApiProperty() @IsNumber() @IsPositive() lotSize: number;
  @ApiProperty() @IsNumber() @IsPositive() entryPrice: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() exitPrice?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() stopLoss?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() takeProfit?: number;
  @ApiProperty() @IsDateString() openTime: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() closeTime?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() commission?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() swap?: number;
}

export class UpdateTradeDto {
  @IsOptional() @IsNumber() exitPrice?: number;
  @IsOptional() @IsNumber() stopLoss?: number;
  @IsOptional() @IsNumber() takeProfit?: number;
  @IsOptional() @IsDateString() closeTime?: string;
  @IsOptional() @IsNumber() commission?: number;
  @IsOptional() @IsNumber() swap?: number;
}

export class SyncTradeDto {
  @ApiProperty() @IsString() ticket: string;       // MT4/MT5 ticket = idempotency key
  @ApiProperty() @IsString() symbol: string;
  @ApiProperty() @IsEnum(TradeDirection) direction: TradeDirection;
  @ApiProperty() @IsNumber() @IsPositive() lotSize: number;
  @ApiProperty() @IsNumber() entryPrice: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() exitPrice?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() stopLoss?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() takeProfit?: number;
  @ApiProperty() @IsDateString() openTime: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() closeTime?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() commission?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() swap?: number;
}

export class TradesQueryDto {
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsString() symbol?: string;
  @IsOptional() @IsEnum(TradeDirection) direction?: TradeDirection;
  @IsOptional() @IsEnum(TradeStatus) status?: TradeStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsNumber() @Min(1) page?: number = 1;
  @IsOptional() @IsNumber() @Min(1) @Max(100) limit?: number = 50;
  @IsOptional() @IsString() sortBy?: string = 'openTime';
  @IsOptional() @IsString() order?: 'asc' | 'desc' = 'desc';
}

// ── Service ───────────────────────────────────────────────────
@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create (manual) ──────────────────────────────────────
  async create(userId: string, dto: CreateTradeDto) {
    await this.assertAccountOwner(userId, dto.accountId);

    const computed = this.computeMetrics(dto);

    return this.prisma.trade.create({
      data: {
        accountId: dto.accountId,
        symbol: dto.symbol.toUpperCase(),
        direction: dto.direction,
        lotSize: new Decimal(dto.lotSize),
        entryPrice: new Decimal(dto.entryPrice),
        exitPrice: dto.exitPrice != null ? new Decimal(dto.exitPrice) : null,
        stopLoss: dto.stopLoss != null ? new Decimal(dto.stopLoss) : null,
        takeProfit: dto.takeProfit != null ? new Decimal(dto.takeProfit) : null,
        openTime: new Date(dto.openTime),
        closeTime: dto.closeTime ? new Date(dto.closeTime) : null,
        commission: new Decimal(dto.commission ?? 0),
        swap: new Decimal(dto.swap ?? 0),
        pnl: computed.pnl,
        riskReward: computed.riskReward,
        status: dto.exitPrice != null ? TradeStatus.CLOSED : TradeStatus.OPEN,
        source: 'MANUAL',
      },
      include: { notes: true, tradeTags: { include: { tag: true } } },
    });
  }

  // ── List with pagination & filtering ─────────────────────
  async findAll(userId: string, query: TradesQueryDto) {
    const { page = 1, limit = 50, sortBy = 'openTime', order = 'desc', ...filters } = query;

    // Get all account IDs this user owns
    const userAccounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = userAccounts.map((a) => a.id);

    const where: any = {
      accountId: filters.accountId
        ? (accountIds.includes(filters.accountId) ? filters.accountId : '⊥')
        : { in: accountIds },
    };

    if (filters.symbol) where.symbol = { equals: filters.symbol.toUpperCase() };
    if (filters.direction) where.direction = filters.direction;
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.openTime = {};
      if (filters.from) where.openTime.gte = new Date(filters.from);
      if (filters.to) where.openTime.lte = new Date(filters.to);
    }

    const [total, items] = await Promise.all([
      this.prisma.trade.count({ where }),
      this.prisma.trade.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
        include: { tradeTags: { include: { tag: true } }, notes: { orderBy: { createdAt: 'asc' } } },
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // ── Get one ───────────────────────────────────────────────
  async findOne(userId: string, tradeId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        account: true,
        notes: { orderBy: { createdAt: 'asc' } },
        tradeTags: { include: { tag: true } },
      },
    });
    if (!trade) throw new NotFoundException('Trade not found');
    await this.assertAccountOwner(userId, trade.accountId);
    return trade;
  }

  // ── Update ────────────────────────────────────────────────
  async update(userId: string, tradeId: string, dto: UpdateTradeDto) {
    const trade = await this.findOne(userId, tradeId);
    const merged = { ...trade, ...dto };
    const computed = this.computeMetrics(merged as any);

    return this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        exitPrice: dto.exitPrice != null ? new Decimal(dto.exitPrice) : undefined,
        stopLoss: dto.stopLoss != null ? new Decimal(dto.stopLoss) : undefined,
        takeProfit: dto.takeProfit != null ? new Decimal(dto.takeProfit) : undefined,
        closeTime: dto.closeTime ? new Date(dto.closeTime) : undefined,
        commission: dto.commission != null ? new Decimal(dto.commission) : undefined,
        swap: dto.swap != null ? new Decimal(dto.swap) : undefined,
        pnl: computed.pnl,
        riskReward: computed.riskReward,
        status: dto.exitPrice != null ? TradeStatus.CLOSED : undefined,
      },
      include: { notes: true, tradeTags: { include: { tag: true } } },
    });
  }

  // ── Delete ────────────────────────────────────────────────
  async remove(userId: string, tradeId: string) {
    await this.findOne(userId, tradeId);
    await this.prisma.trade.delete({ where: { id: tradeId } });
  }

  // ── MT4/MT5 Sync — idempotent upsert ─────────────────────
  async syncFromEA(accountId: string, dto: SyncTradeDto) {
    const computed = this.computeMetrics(dto as any);

    const trade = await this.prisma.trade.upsert({
      where: { externalTicket: dto.ticket },
      create: {
        accountId,
        externalTicket: dto.ticket,
        symbol: dto.symbol.toUpperCase(),
        direction: dto.direction,
        lotSize: new Decimal(dto.lotSize),
        entryPrice: new Decimal(dto.entryPrice),
        exitPrice: dto.exitPrice != null ? new Decimal(dto.exitPrice) : null,
        stopLoss: dto.stopLoss != null ? new Decimal(dto.stopLoss) : null,
        takeProfit: dto.takeProfit != null ? new Decimal(dto.takeProfit) : null,
        openTime: new Date(dto.openTime),
        closeTime: dto.closeTime ? new Date(dto.closeTime) : null,
        commission: new Decimal(dto.commission ?? 0),
        swap: new Decimal(dto.swap ?? 0),
        pnl: computed.pnl,
        riskReward: computed.riskReward,
        status: dto.exitPrice != null ? TradeStatus.CLOSED : TradeStatus.OPEN,
        source: 'MT4',
      },
      update: {
        exitPrice: dto.exitPrice != null ? new Decimal(dto.exitPrice) : undefined,
        closeTime: dto.closeTime ? new Date(dto.closeTime) : undefined,
        commission: dto.commission != null ? new Decimal(dto.commission) : undefined,
        swap: dto.swap != null ? new Decimal(dto.swap) : undefined,
        pnl: computed.pnl,
        riskReward: computed.riskReward,
        status: dto.exitPrice != null ? TradeStatus.CLOSED : TradeStatus.OPEN,
      },
    });

    return { trade, created: !trade.updatedAt || trade.createdAt.getTime() === trade.updatedAt.getTime() };
  }

  // ── Private helpers ───────────────────────────────────────
  private computeMetrics(dto: {
    direction: TradeDirection;
    entryPrice: number;
    exitPrice?: number | null;
    stopLoss?: number | null;
    takeProfit?: number | null;
    lotSize: number;
    commission?: number;
    swap?: number;
  }) {
    let pnl: Decimal | null = null;
    let riskReward: Decimal | null = null;

    if (dto.exitPrice != null) {
      const pipValue = dto.lotSize * 10; // simplified; adjust per symbol
      const priceDiff = dto.direction === 'BUY'
        ? dto.exitPrice - dto.entryPrice
        : dto.entryPrice - dto.exitPrice;
      const gross = priceDiff * pipValue * 10000;
      const net = gross - (dto.commission ?? 0) - (dto.swap ?? 0);
      pnl = new Decimal(net.toFixed(2));
    }

    if (dto.stopLoss != null && dto.takeProfit != null) {
      const risk = Math.abs(dto.entryPrice - dto.stopLoss);
      const reward = Math.abs(dto.takeProfit - dto.entryPrice);
      if (risk > 0) riskReward = new Decimal((reward / risk).toFixed(4));
    }

    return { pnl, riskReward };
  }

  private async assertAccountOwner(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new ForbiddenException('Account not found or access denied');
  }
}
