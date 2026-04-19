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
        if (trades.length === 0)
            return this.emptyStats();
        const wins = trades.filter((t) => Number(t.pnl) > 0);
        const losses = trades.filter((t) => Number(t.pnl) <= 0);
        const totalPnl = trades.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
        const grossWin = wins.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
        const grossLoss = Math.abs(losses.reduce((s, t) => s + Number(t.pnl ?? 0), 0));
        const winRate = wins.length / trades.length;
        const avgWin = wins.length ? grossWin / wins.length : 0;
        const avgLoss = losses.length ? grossLoss / losses.length : 0;
        const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
        const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
        const rrValues = trades.filter((t) => t.riskReward != null).map((t) => Number(t.riskReward));
        const avgRR = rrValues.length ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;
        const { maxDrawdown, maxDrawdownPct } = this.calcDrawdown(trades);
        return {
            totalTrades: trades.length,
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
        const account = await this.getAccountBalance(userId, query.accountId);
        let running = account?.initialBalance ? Number(account.initialBalance) : 10000;
        const curve = [];
        for (const trade of trades) {
            running += Number(trade.pnl ?? 0);
            curve.push({
                date: trade.closeTime.toISOString(),
                equity: parseFloat(running.toFixed(2)),
                pnl: parseFloat(Number(trade.pnl ?? 0).toFixed(2)),
            });
        }
        return curve;
    }
    async getPnlByDay(userId, query = {}) {
        const trades = await this.getClosedTrades(userId, query);
        const map = new Map();
        for (const trade of trades) {
            const day = trade.closeTime.toISOString().slice(0, 10);
            map.set(day, (map.get(day) ?? 0) + Number(trade.pnl ?? 0));
        }
        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, pnl]) => ({ date, pnl: parseFloat(pnl.toFixed(2)) }));
    }
    async getPnlBySymbol(userId, query = {}) {
        const trades = await this.getClosedTrades(userId, query);
        const map = new Map();
        for (const trade of trades) {
            const cur = map.get(trade.symbol) ?? { pnl: 0, count: 0 };
            map.set(trade.symbol, { pnl: cur.pnl + Number(trade.pnl ?? 0), count: cur.count + 1 });
        }
        return Array.from(map.entries())
            .map(([symbol, v]) => ({ symbol, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count }))
            .sort((a, b) => b.pnl - a.pnl);
    }
    async getWinLossDistribution(userId, query = {}) {
        const trades = await this.getClosedTrades(userId, query);
        const buckets = {
            '>50': 0, '10-50': 0, '0-10': 0,
            '-10-0': 0, '-50--10': 0, '<-50': 0,
        };
        for (const trade of trades) {
            const p = Number(trade.pnl ?? 0);
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
        return this.prisma.trade.findMany({
            where: {
                accountId: { in: accountIds },
                status: client_1.TradeStatus.CLOSED,
                ...(query.from || query.to ? {
                    closeTime: {
                        ...(query.from && { gte: new Date(query.from) }),
                        ...(query.to && { lte: new Date(query.to) }),
                    },
                } : {}),
            },
            orderBy: { closeTime: 'asc' },
        });
    }
    async getAccountBalance(userId, accountId) {
        return this.prisma.account.findFirst({
            where: { userId, ...(accountId && { id: accountId }) },
        });
    }
    calcDrawdown(trades) {
        let peak = 0, trough = 0, equity = 0;
        let maxDrawdown = 0, maxDrawdownPct = 0;
        for (const trade of trades) {
            equity += Number(trade.pnl ?? 0);
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
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map