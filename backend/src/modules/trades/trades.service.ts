import { Decimal } from '@prisma/client/runtime/library';
import { TradeDirection, TradeStatus } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../utils/errors';
import type { CreateTradeInput, UpdateTradeInput, TradesQuery, CreateNoteInput } from './trades.schema';

// ── Helpers ───────────────────────────────────────────────────

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeMetrics(t: {
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  lotSize: number;
  commission: number;
  swap: number;
  pnl?: number | null;
}) {
  // Prefer explicitly provided PnL
  if (t.pnl != null && Number.isFinite(t.pnl)) {
    return { pnl: new Decimal(t.pnl), riskReward: computeRR(t) };
  }
  return { pnl: null, riskReward: computeRR(t) };
}

function computeRR(t: {
  direction: TradeDirection;
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  exitPrice?: number | null;
}): Decimal | null {
  if (t.entryPrice == null || t.stopLoss == null) return null;
  const rewardTarget = t.takeProfit ?? t.exitPrice;
  if (rewardTarget == null) return null;

  const risk =
    t.direction === TradeDirection.BUY
      ? t.entryPrice - t.stopLoss
      : t.stopLoss - t.entryPrice;
  const reward =
    t.direction === TradeDirection.BUY
      ? rewardTarget - t.entryPrice
      : t.entryPrice - rewardTarget;

  if (risk <= 0) return null;
  const rr = reward / risk;
  return Number.isFinite(rr) ? new Decimal(rr.toFixed(4)) : null;
}

function isClosedTrade(exitPrice?: number | null, closeTime?: Date | string | null): boolean {
  return exitPrice != null || closeTime != null;
}

async function assertAccountOwner(userId: string, accountId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new NotFoundError('Account not found');
  if (account.userId !== userId) throw new ForbiddenError();
  return account;
}

const TRADE_INCLUDE = {
  notes: { orderBy: { createdAt: 'asc' as const } },
  tradeTags: { include: { tag: true } },
} as const;

// ── CRUD ─────────────────────────────────────────────────────

export async function createTrade(userId: string, input: CreateTradeInput) {
  await assertAccountOwner(userId, input.accountId);

  const computed = computeMetrics({
    direction: input.direction as TradeDirection,
    entryPrice: input.entryPrice,
    exitPrice: input.exitPrice,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    lotSize: input.lotSize,
    commission: input.commission ?? 0,
    swap: input.swap ?? 0,
    pnl: input.pnl,
  });

  const isClosed = isClosedTrade(input.exitPrice, input.closeTime);
  const resolvedStatus = input.status
    ? (input.status as TradeStatus)
    : isClosed
    ? TradeStatus.CLOSED
    : TradeStatus.OPEN;

  return prisma.trade.create({
    data: {
      accountId: input.accountId,
      symbol: input.symbol.toUpperCase(),
      direction: input.direction as TradeDirection,
      lotSize: new Decimal(input.lotSize),
      entryPrice: new Decimal(input.entryPrice),
      exitPrice: input.exitPrice != null ? new Decimal(input.exitPrice) : null,
      stopLoss: input.stopLoss != null ? new Decimal(input.stopLoss) : null,
      takeProfit: input.takeProfit != null ? new Decimal(input.takeProfit) : null,
      openTime: new Date(input.openTime),
      closeTime: input.closeTime ? new Date(input.closeTime) : null,
      commission: new Decimal(input.commission ?? 0),
      swap: new Decimal(input.swap ?? 0),
      pnl: computed.pnl,
      riskReward: computed.riskReward,
      status: resolvedStatus,
      source: 'MANUAL',
    },
    include: TRADE_INCLUDE,
  });
}

export async function listTrades(userId: string, query: TradesQuery) {
  const { page, limit, sortBy, order, ...filters } = query;

  const userAccounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true },
  });
  const accountIds = userAccounts.map((a) => a.id);

  const where: Record<string, unknown> = {
    accountId:
      filters.accountId && accountIds.includes(filters.accountId)
        ? filters.accountId
        : { in: accountIds },
  };

  if (filters.symbol) where.symbol = { equals: filters.symbol.toUpperCase() };
  if (filters.direction) where.direction = filters.direction;
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.openTime = {
      ...(filters.from && { gte: new Date(filters.from) }),
      ...(filters.to && { lte: new Date(filters.to) }),
    };
  }

  const [total, items] = await Promise.all([
    prisma.trade.count({ where }),
    prisma.trade.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
      include: TRADE_INCLUDE,
    }),
  ]);

  return { data: items, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getTrade(userId: string, tradeId: string) {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { account: true, ...TRADE_INCLUDE },
  });
  if (!trade) throw new NotFoundError('Trade not found');
  await assertAccountOwner(userId, trade.accountId);
  return trade;
}

export async function updateTrade(userId: string, tradeId: string, input: UpdateTradeInput) {
  const trade = await getTrade(userId, tradeId);

  const nextExitPrice = input.exitPrice !== undefined ? input.exitPrice : toNum(trade.exitPrice);
  const nextCloseTime = input.closeTime !== undefined ? new Date(input.closeTime) : trade.closeTime;
  const isClosed = isClosedTrade(nextExitPrice, nextCloseTime);

  const mergedPnl = input.pnl !== undefined ? input.pnl : toNum(trade.pnl);
  const computed = computeMetrics({
    direction: trade.direction,
    entryPrice: Number(trade.entryPrice),
    exitPrice: nextExitPrice,
    stopLoss: input.stopLoss !== undefined ? input.stopLoss : toNum(trade.stopLoss),
    takeProfit: input.takeProfit !== undefined ? input.takeProfit : toNum(trade.takeProfit),
    lotSize: Number(trade.lotSize),
    commission: input.commission !== undefined ? input.commission : Number(trade.commission),
    swap: input.swap !== undefined ? input.swap : Number(trade.swap),
    pnl: mergedPnl,
  });

  const resolvedStatus = input.status
    ? (input.status as TradeStatus)
    : isClosed
    ? TradeStatus.CLOSED
    : TradeStatus.OPEN;

  return prisma.trade.update({
    where: { id: tradeId },
    data: {
      exitPrice: input.exitPrice != null ? new Decimal(input.exitPrice) : undefined,
      stopLoss: input.stopLoss != null ? new Decimal(input.stopLoss) : undefined,
      takeProfit: input.takeProfit != null ? new Decimal(input.takeProfit) : undefined,
      closeTime: input.closeTime ? new Date(input.closeTime) : undefined,
      commission: input.commission != null ? new Decimal(input.commission) : undefined,
      swap: input.swap != null ? new Decimal(input.swap) : undefined,
      pnl: computed.pnl,
      riskReward: computed.riskReward,
      status: resolvedStatus,
    },
    include: TRADE_INCLUDE,
  });
}

export async function deleteTrade(userId: string, tradeId: string) {
  await getTrade(userId, tradeId);
  await prisma.trade.delete({ where: { id: tradeId } });
}

// ── Trade Notes ───────────────────────────────────────────────

export async function listNotes(userId: string, tradeId: string) {
  await assertTradeOwner(userId, tradeId);
  return prisma.tradeNote.findMany({
    where: { tradeId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createNote(userId: string, tradeId: string, input: CreateNoteInput) {
  await assertTradeOwner(userId, tradeId);
  return prisma.tradeNote.create({
    data: {
      tradeId,
      content: input.content,
      emotion: input.emotion as never,
      mistake: input.mistake,
      lesson: input.lesson,
    },
  });
}

export async function deleteNote(userId: string, tradeId: string, noteId: string) {
  await assertTradeOwner(userId, tradeId);
  const note = await prisma.tradeNote.findFirst({ where: { id: noteId, tradeId } });
  if (!note) throw new NotFoundError('Note not found');
  await prisma.tradeNote.delete({ where: { id: noteId } });
}

async function assertTradeOwner(userId: string, tradeId: string) {
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, account: { userId } },
  });
  if (!trade) throw new NotFoundError('Trade not found or access denied');
  return trade;
}

// ── MT Sync (used by mt-sync module) ─────────────────────────

export interface SyncTradeInput {
  ticket: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  lotSize: number;
  entryPrice: number;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  openTime: string;
  closeTime?: string | null;
  pnl?: number | null;
  commission?: number;
  swap?: number;
  status: 'OPEN' | 'CLOSED';
  source: 'MT4' | 'MT5';
}

export async function syncTrade(accountId: string, input: SyncTradeInput) {
  const existing = await prisma.trade.findFirst({
    where: { accountId, externalTicket: input.ticket },
  });

  const closeTime = input.closeTime ? new Date(input.closeTime) : null;
  const isClosed = isClosedTrade(input.exitPrice, closeTime) || input.status === 'CLOSED';

  const pnl =
    input.pnl != null && Number.isFinite(input.pnl) ? new Decimal(input.pnl) : null;

  const computed = computeMetrics({
    direction: input.direction as TradeDirection,
    entryPrice: input.entryPrice,
    exitPrice: input.exitPrice,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    lotSize: input.lotSize,
    commission: input.commission ?? 0,
    swap: input.swap ?? 0,
    pnl: input.pnl,
  });

  if (!existing) {
    const trade = await prisma.trade.create({
      data: {
        accountId,
        externalTicket: input.ticket,
        symbol: input.symbol.toUpperCase(),
        direction: input.direction as TradeDirection,
        lotSize: new Decimal(input.lotSize),
        entryPrice: new Decimal(input.entryPrice),
        exitPrice: input.exitPrice != null ? new Decimal(input.exitPrice) : null,
        stopLoss: input.stopLoss != null ? new Decimal(input.stopLoss) : null,
        takeProfit: input.takeProfit != null ? new Decimal(input.takeProfit) : null,
        openTime: new Date(input.openTime),
        closeTime,
        commission: new Decimal(input.commission ?? 0),
        swap: new Decimal(input.swap ?? 0),
        pnl: pnl ?? computed.pnl,
        riskReward: computed.riskReward,
        status: isClosed ? TradeStatus.CLOSED : TradeStatus.OPEN,
        source: input.source,
      },
    });
    return { trade, action: 'created' as const };
  }

  // Update — preserve notes; only update price/status fields
  const trade = await prisma.trade.update({
    where: { id: existing.id },
    data: {
      symbol: input.symbol.toUpperCase(),
      direction: input.direction as TradeDirection,
      lotSize: new Decimal(input.lotSize),
      entryPrice: new Decimal(input.entryPrice),
      exitPrice: input.exitPrice != null ? new Decimal(input.exitPrice) : existing.exitPrice,
      stopLoss: input.stopLoss != null ? new Decimal(input.stopLoss) : existing.stopLoss,
      takeProfit: input.takeProfit != null ? new Decimal(input.takeProfit) : existing.takeProfit,
      closeTime: closeTime ?? existing.closeTime,
      commission: new Decimal(input.commission ?? Number(existing.commission)),
      swap: new Decimal(input.swap ?? Number(existing.swap)),
      pnl: pnl ?? computed.pnl ?? existing.pnl,
      riskReward: computed.riskReward ?? existing.riskReward,
      status: isClosed ? TradeStatus.CLOSED : existing.status,
      source: input.source,
    },
  });
  return { trade, action: 'updated' as const };
}

// Validate accountId ownership from apiKey (called by mt-sync router)
export async function getAccountByApiKey(apiKey: string) {
  if (!apiKey) return null;
  return prisma.account.findFirst({ where: { apiKey } });
}
