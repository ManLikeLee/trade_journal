"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(userId, query = {}) {
        const trades = await this.getClosedTrades(userId, query);
        const normalized = trades.map((t) => this.normalizeTrade(t));
        const realized = normalized.filter((t) => t.pnl != null);
        if (realized.length === 0)
            return this.emptyStats();
        const wins = realized.filter((t) => t.pnl > 0);
        const losses = realized.filter((t) => t.pnl < 0);
        const totalPnl = realized.reduce((s, t) => s + t.pnl, 0);
        const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
        const grossLossRaw = losses.reduce((s, t) => s + t.pnl, 0);
        const grossLoss = Math.abs(grossLossRaw);
        const decisiveCount = wins.length + losses.length;
        const winRate = decisiveCount > 0 ? wins.length / decisiveCount : 0;
        const avgWin = wins.length ? grossWin / wins.length : 0;
        const avgLoss = losses.length ? grossLoss / losses.length : 0;
        const rawProfitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? grossWin : 0;
        const profitFactor = Number.isFinite(rawProfitFactor) ? rawProfitFactor : 0;
        const expectancy = decisiveCount > 0 ? (grossWin + grossLossRaw) / decisiveCount : 0;
        const rrValues = normalized
            .map((t) => this.resolveRiskReward(t))
            .filter((v) => v != null && Number.isFinite(v) && v > 0);
        const avgRR = rrValues.length ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;
        const curveTrades = realized
            .filter((t) => t.closeTime != null)
            .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());
        const { maxDrawdown, maxDrawdownPct } = this.calcDrawdown(curveTrades.map((t) => t.pnl));
        return {
            totalTrades: realized.length,
            winCount: wins.length,
            lossCount: losses.length,
            winRate: parseFloat((winRate * 100).toFixed(2)),
            totalPnl: parseFloat(totalPnl.toFixed(2)),
            grossWin: parseFloat(grossWin.toFixed(2)),
            grossLoss: parseFloat(grossLoss.toFixed(2)),
            avgWin: parseFloat(avgWin.toFixed(2)),
            avgLoss: parseFloat(avgLoss.toFixed(2)),
            profitFactor: parseFloat(profitFactor.toFixed(3)),
            expectancy: parseFloat(expectancy.toFixed(2)),
            avgRR: parseFloat(avgRR.toFixed(3)),
            maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
            maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(2)),
        };
    }
    async getEquityCurve(userId, query = {}) {
        const trades = await this.getClosedTrades(userId, query);
        const normalized = trades.map((t) => this.normalizeTrade(t));
        const curveTrades = normalized
            .filter((t) => t.pnl != null && t.closeTime != null)
            .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());
        let running = 0;
        const curve = [];
        for (const trade of curveTrades) {
            running += trade.pnl;
            curve.push({
                date: trade.closeTime.toISOString(),
                equity: parseFloat(running.toFixed(2)),
                pnl: parseFloat(trade.pnl.toFixed(2)),
            });
        }
        return curve;
    }
    async getPnlByDay(userId, query = {}) {
        const trades = await this.getClosedTrades(userId, query);
        const normalized = trades.map((t) => this.normalizeTrade(t));
        const realized = normalized
            .filter((t) => t.pnl != null && t.closeTime != null)
            .sort((a, b) => a.closeTime.getTime() - b.closeTime.getTime());
        const map = new Map();
        for (const trade of realized) {
            const day = trade.closeTime.toISOString().slice(0, 10);
            map.set(day, (map.get(day) ?? 0) + trade.pnl);
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }));
    }
    async getPnlBySymbol(userId, query = {}) {
        const trades = await this.getClosedTrades(userId, query);
        const normalized = trades.map((t) => this.normalizeTrade(t));
        const realized = normalized.filter((t) => t.pnl != null);
        const map = new Map();
        for (const trade of realized) {
            const cur = map.get(trade.symbol) ?? { pnl: 0, count: 0 };
            map.set(trade.symbol, { pnl: cur.pnl + trade.pnl, count: cur.count + 1 });
        }
        return Array.from(map.entries())
            .map(([symbol, v]) => ({ symbol, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count }))
            .sort((a, b) => b.pnl - a.pnl);
    }
    async getWinLossDistribution(userId, query = {}) {
        const trades = await this.getClosedTrades(userId, query);
        const normalized = trades.map((t) => this.normalizeTrade(t));
        const realized = normalized.filter((t) => t.pnl != null);
        const buckets = {
            '>50': 0, '10-50': 0, '0-10': 0,
            '-10-0': 0, '-50--10': 0, '<-50': 0,
        };
        for (const trade of realized) {
            const p = trade.pnl;
            if (p > 50)
                buckets['>50']++;
            else if (p > 10)
                buckets['10-50']++;
            else if (p >= 0)
                buckets['0-10']++;
            else if (p >= -10)
                buckets['-10-0']++;
            else if (p >= -50)
                buckets['-50--10']++;
            else
                buckets['<-50']++;
        }
        return buckets;
    }
    async getClosedTrades(userId, query) {
        const userAccounts = await this.prisma.account.findMany({
            where: { userId, ...(query.accountId && { id: query.accountId }) },
            select: { id: true },
        });
        const accountIds = userAccounts.map((a) => a.id);
        const from = this.dateOrNull(query.from);
        const to = this.dateOrNull(query.to);
        return this.prisma.trade.findMany({
            where: {
                accountId: { in: accountIds },
                status: client_1.TradeStatus.CLOSED,
                ...(from || to ? {
                    closeTime: {
                        ...(from && { gte: from }),
                        ...(to && { lte: to }),
                    },
                } : {}),
            },
            orderBy: { closeTime: 'asc' },
        });
    }
    normalizeTrade(trade) {
        return {
            symbol: String(trade.symbol ?? '').toUpperCase(),
            direction: trade.direction,
            entryPrice: this.numOrNull(trade.entryPrice),
            exitPrice: this.numOrNull(trade.exitPrice),
            stopLoss: this.numOrNull(trade.stopLoss),
            takeProfit: this.numOrNull(trade.takeProfit),
            riskReward: this.numOrNull(trade.riskReward),
            pnl: this.numOrNull(trade.pnl),
            closeTime: this.dateOrNull(trade.closeTime),
        };
    }
    resolveRiskReward(trade) {
        if (trade.riskReward != null && Number.isFinite(trade.riskReward) && trade.riskReward > 0) {
            return trade.riskReward;
        }
        if (trade.entryPrice == null || trade.stopLoss == null)
            return null;
        const rewardTarget = trade.exitPrice ?? trade.takeProfit;
        if (rewardTarget == null)
            return null;
        const risk = trade.direction === client_1.TradeDirection.BUY
            ? trade.entryPrice - trade.stopLoss
            : trade.stopLoss - trade.entryPrice;
        const reward = trade.direction === client_1.TradeDirection.BUY
            ? rewardTarget - trade.entryPrice
            : trade.entryPrice - rewardTarget;
        if (!Number.isFinite(risk) || !Number.isFinite(reward) || risk <= 0)
            return null;
        const rr = reward / risk;
        if (!Number.isFinite(rr) || rr <= 0)
            return null;
        return rr;
    }
    calcDrawdown(pnls) {
        let peak = 0;
        let equity = 0;
        let maxDrawdown = 0;
        let maxDrawdownPct = 0;
        for (const pnl of pnls) {
            equity += pnl;
            if (equity > peak)
                peak = equity;
            const dd = peak - equity;
            const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
            if (dd > maxDrawdown) {
                maxDrawdown = dd;
                maxDrawdownPct = ddPct;
            }
        }
        return { maxDrawdown, maxDrawdownPct };
    }
    emptyStats() {
        return {
            totalTrades: 0, winCount: 0, lossCount: 0,
            winRate: 0, totalPnl: 0, grossWin: 0, grossLoss: 0,
            avgWin: 0, avgLoss: 0, profitFactor: 0, expectancy: 0,
            avgRR: 0, maxDrawdown: 0, maxDrawdownPct: 0,
        };
    }
    numOrNull(value) {
        if (value == null)
            return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    dateOrNull(value) {
        if (value == null)
            return null;
        const d = value instanceof Date ? value : new Date(String(value));
        return Number.isNaN(d.getTime()) ? null : d;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map