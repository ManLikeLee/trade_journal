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
import { TradeDirection, TradeSource, TradeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ── DTOs ─────────────────────────────────────────────────────
import {
  IsString, IsEnum, IsNumber, IsOptional, IsDateString,
  IsPositive, Min, Max, IsIn,
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
  @ApiProperty({ enum: ['MT4', 'MT5'], required: false })
  @IsOptional() @IsIn(['MT4', 'MT5']) source?: TradeSource;
  @ApiProperty({ required: false }) @IsOptional() @IsString() symbol?: string;
  @ApiProperty({ enum: ['BUY', 'SELL'], required: false }) @IsOptional() @IsEnum(TradeDirection) direction?: TradeDirection;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @IsPositive() lotSize?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() entryPrice?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() exitPrice?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() stopLoss?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() takeProfit?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() openTime?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() closeTime?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() commission?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() swap?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() pnl?: number;
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

    const isClosed = this.isClosedTrade(dto.exitPrice, dto.closeTime);

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
        status: isClosed ? TradeStatus.CLOSED : TradeStatus.OPEN,
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

    const nextExitPrice = dto.exitPrice !== undefined ? dto.exitPrice : this.toNumberOrNull(trade.exitPrice);
    const nextCloseTime = dto.closeTime !== undefined ? dto.closeTime : trade.closeTime;
    const isClosed = this.isClosedTrade(nextExitPrice, nextCloseTime);

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
        status: isClosed ? TradeStatus.CLOSED : TradeStatus.OPEN,
      },
      include: { notes: true, tradeTags: { include: { tag: true } } },
    });
  }

  // ── Delete ────────────────────────────────────────────────
  async remove(userId: string, tradeId: string) {
    await this.findOne(userId, tradeId);
    await this.prisma.trade.delete({ where: { id: tradeId } });
  }

  // ── MT4/MT5 Sync — idempotent create/update by ticket ────
  async syncFromEA(accountId: string, dto: SyncTradeDto) {
    const existing = await this.prisma.trade.findFirst({
      where: { accountId, externalTicket: dto.ticket },
    });

    if (!existing) {
      if (!dto.symbol || !dto.direction || dto.lotSize == null || dto.entryPrice == null || !dto.openTime) {
        throw new BadRequestException(
          'New sync trades require symbol, direction, lotSize, entryPrice, and openTime',
        );
      }

      const source = dto.source ?? TradeSource.MT5;
      const closeTime = this.parseOptionalTradeDate(dto.closeTime);
      const isClosed = this.isClosedTrade(dto.exitPrice, closeTime);
      const computed = this.computeMetrics({
        direction: dto.direction,
        entryPrice: dto.entryPrice,
        exitPrice: dto.exitPrice,
        stopLoss: dto.stopLoss,
        takeProfit: dto.takeProfit,
        lotSize: dto.lotSize,
        commission: dto.commission ?? 0,
        swap: dto.swap ?? 0,
      });
      const pnl = this.resolveSyncedPnl({
        symbol: dto.symbol,
        payloadPnl: dto.pnl,
        computedPnl: computed.pnl,
      });

      const trade = await this.prisma.trade.create({
        data: {
          accountId,
          externalTicket: dto.ticket,
          symbol: dto.symbol.toUpperCase(),
          direction: dto.direction,
          lotSize: new Decimal(dto.lotSize),
          entryPrice: new Decimal(dto.entryPrice),
          exitPrice: dto.exitPrice != null ? new Decimal(dto.exitPrice) : null,
          stopLoss: dto.stopLoss != null ? new Decimal(dto.stopLoss) : null,
          takeProfit: dto.takeProfit != null ? new Decimal(dto.takeProfit) : null,
          openTime: this.parseTradeDate(dto.openTime, 'openTime'),
          closeTime,
          commission: new Decimal(dto.commission ?? 0),
          swap: new Decimal(dto.swap ?? 0),
          pnl,
          riskReward: computed.riskReward,
          status: isClosed ? TradeStatus.CLOSED : TradeStatus.OPEN,
          source,
        },
      });

      return { trade, created: true };
    }

    const mergedDirection = dto.direction ?? existing.direction;
    const mergedEntryPrice = dto.entryPrice ?? Number(existing.entryPrice);
    const mergedLotSize = dto.lotSize ?? Number(existing.lotSize);
    const mergedExitPrice = dto.exitPrice !== undefined ? dto.exitPrice : this.toNumberOrNull(existing.exitPrice);
    const mergedStopLoss = dto.stopLoss !== undefined ? dto.stopLoss : this.toNumberOrNull(existing.stopLoss);
    const mergedTakeProfit = dto.takeProfit !== undefined ? dto.takeProfit : this.toNumberOrNull(existing.takeProfit);
    const mergedCommission = dto.commission !== undefined ? dto.commission : Number(existing.commission);
    const mergedSwap = dto.swap !== undefined ? dto.swap : Number(existing.swap);
    const mergedCloseTime = dto.closeTime != null
      ? this.parseOptionalTradeDate(dto.closeTime)
      : existing.closeTime;
    const isClosed = this.isClosedTrade(mergedExitPrice, mergedCloseTime);
    const source = dto.source ?? existing.source;

    const mergedSymbol = dto.symbol ?? existing.symbol;

    const computed = this.computeMetrics({
      direction: mergedDirection,
      entryPrice: mergedEntryPrice,
      exitPrice: mergedExitPrice,
      stopLoss: mergedStopLoss,
      takeProfit: mergedTakeProfit,
      lotSize: mergedLotSize,
      commission: mergedCommission,
      swap: mergedSwap,
    });
    const pnl = this.resolveSyncedPnl({
      symbol: mergedSymbol,
      payloadPnl: dto.pnl,
      computedPnl: computed.pnl,
      existingPnl: existing.pnl,
    });

    const trade = await this.prisma.trade.update({
      where: { id: existing.id },
      data: {
        symbol: dto.symbol ? dto.symbol.toUpperCase() : undefined,
        direction: dto.direction,
        lotSize: dto.lotSize != null ? new Decimal(dto.lotSize) : undefined,
        entryPrice: dto.entryPrice != null ? new Decimal(dto.entryPrice) : undefined,
        exitPrice: dto.exitPrice != null ? new Decimal(dto.exitPrice) : undefined,
        stopLoss: dto.stopLoss != null ? new Decimal(dto.stopLoss) : undefined,
        takeProfit: dto.takeProfit != null ? new Decimal(dto.takeProfit) : undefined,
        openTime: dto.openTime != null ? this.parseTradeDate(dto.openTime, 'openTime') : undefined,
        closeTime: dto.closeTime != null ? this.parseTradeDate(dto.closeTime, 'closeTime') : undefined,
        commission: dto.commission != null ? new Decimal(dto.commission) : undefined,
        swap: dto.swap != null ? new Decimal(dto.swap) : undefined,
        pnl,
        riskReward: computed.riskReward,
        status: isClosed ? TradeStatus.CLOSED : TradeStatus.OPEN,
        source,
      },
    });

    return { trade, created: false };
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

  private isClosedTrade(exitPrice?: number | null, closeTime?: string | Date | null) {
    return exitPrice != null || closeTime != null;
  }

  private parseOptionalTradeDate(value?: string | null) {
    if (value == null) return null;
    return this.parseTradeDate(value, 'date');
  }

  private parseTradeDate(value: string, fieldName: 'openTime' | 'closeTime' | 'date'): Date {
    const raw = String(value).trim();
    if (!raw) throw new BadRequestException(`Invalid ${fieldName}: empty value`);

    // Accept common MT format: "YYYY.MM.DD HH:MM[:SS]" by normalizing to ISO-like.
    const mtLike = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (mtLike) {
      const [, y, m, d, h, mi, s] = mtLike;
      const normalized = `${y}-${m}-${d}T${h}:${mi}:${s ?? '00'}Z`;
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return direct;

    // Unix timestamp support (seconds or milliseconds) for EA convenience.
    if (/^\d{10,13}$/.test(raw)) {
      const num = Number(raw);
      const ms = raw.length === 13 ? num : num * 1000;
      const parsed = new Date(ms);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    throw new BadRequestException(`Invalid ${fieldName}: ${raw}`);
  }

  private toNumberOrNull(value: Decimal | null | undefined) {
    if (value == null) return null;
    return Number(value);
  }

  private resolveSyncedPnl(params: {
    symbol: string;
    payloadPnl?: number | null;
    computedPnl?: Decimal | null;
    existingPnl?: Decimal | null;
  }) {
    const { symbol, payloadPnl, computedPnl, existingPnl } = params;

    // Prefer broker-realized P&L from MT payload whenever provided.
    if (payloadPnl != null) return new Decimal(payloadPnl);

    // Fallback to local approximation only for likely FX symbols.
    if (this.isLikelyForexSymbol(symbol)) return computedPnl ?? existingPnl ?? null;

    // For non-FX instruments (e.g. BTCUSD CFDs), avoid writing inflated approximations.
    return existingPnl ?? null;
  }

  private isLikelyForexSymbol(symbol: string) {
    const fiat = new Set([
      'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
      'NOK', 'SEK', 'DKK', 'ZAR', 'TRY', 'PLN', 'HUF', 'CZK',
      'MXN', 'SGD', 'HKD', 'CNH',
    ]);

    const letters = symbol.toUpperCase().replace(/[^A-Z]/g, '');
    if (letters.length < 6) return false;
    const base = letters.slice(0, 3);
    const quote = letters.slice(3, 6);
    return fiat.has(base) && fiat.has(quote);
  }

  private async assertAccountOwner(userId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new ForbiddenException('Account not found or access denied');
  }
}
