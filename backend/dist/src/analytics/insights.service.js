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
exports.InsightsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let InsightsService = class InsightsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generate(userId, accountId) {
        const trades = await this.getClosedTrades(userId, accountId);
        if (trades.length < 5) {
            return [{
                    id: 'not-enough-data',
                    type: 'suggestion',
                    title: 'Keep logging trades',
                    description: `You need at least 5 closed trades for insights. You have ${trades.length} so far.`,
                    severity: 'info',
                }];
        }
        const insights = [];
        insights.push(...this.analyzeEmotions(trades));
        insights.push(...this.analyzeDayOfWeek(trades));
        insights.push(...this.analyzeHoldTime(trades));
        insights.push(...this.analyzeSymbols(trades));
        insights.push(...this.analyzeRiskReward(trades));
        insights.push(...this.analyzeLotSizing(trades));
        insights.push(...this.analyzeConsistency(trades));
        insights.push(...this.analyzeStreaks(trades));
        const order = { danger: 0, warning: 1, success: 2, info: 3 };
        return insights.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 10);
    }
    analyzeEmotions(trades) {
        const insights = [];
        const tradesWithNotes = trades.filter(t => t.notes?.length > 0);
        if (!tradesWithNotes.length)
            return insights;
        const emotionStats = {};
        for (const trade of tradesWithNotes) {
            for (const note of trade.notes) {
                if (!note.emotion)
                    continue;
                if (!emotionStats[note.emotion])
                    emotionStats[note.emotion] = { pnl: [], count: 0 };
                emotionStats[note.emotion].pnl.push(Number(trade.pnl));
                emotionStats[note.emotion].count++;
            }
        }
        for (const [emotion, stats] of Object.entries(emotionStats)) {
            if (stats.count < 3)
                continue;
            const avg = stats.pnl.reduce((s, v) => s + v, 0) / stats.count;
            const wins = stats.pnl.filter(p => p > 0).length;
            const wr = (wins / stats.count) * 100;
            if (emotion === 'FOMO' && avg < 0) {
                insights.push({
                    id: 'fomo-negative',
                    type: 'warning',
                    title: 'FOMO trades are costing you',
                    description: `Your ${stats.count} FOMO-tagged trades average ${avg >= 0 ? '+' : ''}$${avg.toFixed(2)} with only ${wr.toFixed(0)}% win rate. Consider stepping away when you feel FOMO.`,
                    metric: `Avg: $${avg.toFixed(2)}`,
                    severity: 'warning',
                });
            }
            if (emotion === 'REVENGE' && stats.count >= 2) {
                insights.push({
                    id: 'revenge-trading',
                    type: 'warning',
                    title: 'Revenge trading detected',
                    description: `You've tagged ${stats.count} trades as REVENGE. These average $${avg.toFixed(2)}. Revenge trades are rarely profitable — consider a cooling-off rule after a loss.`,
                    metric: `${stats.count} trades`,
                    severity: 'danger',
                });
            }
            if (emotion === 'DISCIPLINED' && avg > 0) {
                insights.push({
                    id: 'disciplined-positive',
                    type: 'positive',
                    title: 'Discipline pays off',
                    description: `Your DISCIPLINED trades average +$${avg.toFixed(2)} with ${wr.toFixed(0)}% win rate. Your best trading happens when you stick to the plan.`,
                    metric: `Avg: +$${avg.toFixed(2)}`,
                    severity: 'success',
                });
            }
        }
        return insights;
    }
    analyzeDayOfWeek(trades) {
        const insights = [];
        const dayStats = {};
        for (const trade of trades) {
            const day = new Date(trade.closeTime).getDay();
            if (!dayStats[day])
                dayStats[day] = { pnl: [], wins: 0 };
            const p = Number(trade.pnl);
            dayStats[day].pnl.push(p);
            if (p > 0)
                dayStats[day].wins++;
        }
        const dayPerf = Object.entries(dayStats)
            .filter(([, s]) => s.pnl.length >= 3)
            .map(([day, s]) => ({
            day: Number(day),
            name: DAY_NAMES[Number(day)],
            avg: s.pnl.reduce((a, b) => a + b, 0) / s.pnl.length,
            wr: (s.wins / s.pnl.length) * 100,
            count: s.pnl.length,
        }));
        if (dayPerf.length < 2)
            return insights;
        const best = dayPerf.reduce((a, b) => a.avg > b.avg ? a : b);
        const worst = dayPerf.reduce((a, b) => a.avg < b.avg ? a : b);
        if (worst.avg < -5) {
            insights.push({
                id: 'worst-day',
                type: 'warning',
                title: `${worst.name}s are your worst trading day`,
                description: `On ${worst.name}s you average $${worst.avg.toFixed(2)} per trade with ${worst.wr.toFixed(0)}% win rate (${worst.count} trades). Consider reducing size or skipping ${worst.name}s.`,
                metric: `Avg: $${worst.avg.toFixed(2)}`,
                severity: 'warning',
            });
        }
        if (best.avg > 0 && best.avg > Math.abs(worst.avg)) {
            insights.push({
                id: 'best-day',
                type: 'positive',
                title: `${best.name}s are your best trading day`,
                description: `You average +$${best.avg.toFixed(2)} on ${best.name}s with ${best.wr.toFixed(0)}% win rate. Your edge is strongest mid-week.`,
                metric: `Avg: +$${best.avg.toFixed(2)}`,
                severity: 'success',
            });
        }
        return insights;
    }
    analyzeHoldTime(trades) {
        const insights = [];
        const tradesWithDuration = trades.filter(t => t.closeTime);
        const buckets = {
            scalp: { trades: [], label: '< 5 min' },
            intra: { trades: [], label: '5 min – 4 h' },
            swing: { trades: [], label: '4 h – 24 h' },
            position: { trades: [], label: '> 24 h' },
        };
        for (const t of tradesWithDuration) {
            const mins = (new Date(t.closeTime).getTime() - new Date(t.openTime).getTime()) / 60_000;
            if (mins < 5)
                buckets.scalp.trades.push(t);
            else if (mins < 240)
                buckets.intra.trades.push(t);
            else if (mins < 1440)
                buckets.swing.trades.push(t);
            else
                buckets.position.trades.push(t);
        }
        const stats = Object.entries(buckets)
            .filter(([, b]) => b.trades.length >= 3)
            .map(([key, b]) => {
            const pnls = b.trades.map(t => Number(t.pnl));
            const avg = pnls.reduce((s, v) => s + v, 0) / pnls.length;
            const wr = (pnls.filter(p => p > 0).length / pnls.length) * 100;
            return { key, label: b.label, avg, wr, count: b.trades.length };
        });
        if (stats.length < 2)
            return insights;
        const best = stats.reduce((a, b) => a.avg > b.avg ? a : b);
        const worst = stats.reduce((a, b) => a.avg < b.avg ? a : b);
        if (best.key !== worst.key) {
            insights.push({
                id: 'hold-time-best',
                type: 'pattern',
                title: `Your edge is in ${best.label} trades`,
                description: `${best.label} trades average +$${best.avg.toFixed(2)} (${best.wr.toFixed(0)}% WR, ${best.count} trades). Consider focusing more on this timeframe.`,
                metric: `+$${best.avg.toFixed(2)} avg`,
                severity: 'success',
            });
        }
        if (worst.avg < -3) {
            insights.push({
                id: 'hold-time-worst',
                type: 'warning',
                title: `Avoid ${worst.label} trades`,
                description: `${worst.label} trades average $${worst.avg.toFixed(2)} — your worst hold-time bucket. Consider eliminating this from your strategy.`,
                metric: `$${worst.avg.toFixed(2)} avg`,
                severity: 'warning',
            });
        }
        return insights;
    }
    analyzeSymbols(trades) {
        const insights = [];
        const symMap = {};
        for (const t of trades) {
            if (!symMap[t.symbol])
                symMap[t.symbol] = [];
            symMap[t.symbol].push(Number(t.pnl));
        }
        const symStats = Object.entries(symMap)
            .filter(([, p]) => p.length >= 5)
            .map(([symbol, pnls]) => {
            const avg = pnls.reduce((s, v) => s + v, 0) / pnls.length;
            const wr = (pnls.filter(p => p > 0).length / pnls.length) * 100;
            return { symbol, avg, wr, count: pnls.length };
        });
        if (!symStats.length)
            return insights;
        const losers = symStats.filter(s => s.avg < -2);
        const winners = symStats.filter(s => s.avg > 2);
        for (const s of losers) {
            insights.push({
                id: `symbol-avoid-${s.symbol}`,
                type: 'warning',
                title: `Consider avoiding ${s.symbol}`,
                description: `Your ${s.count} ${s.symbol} trades average $${s.avg.toFixed(2)} with ${s.wr.toFixed(0)}% win rate. This symbol is dragging your overall P&L.`,
                metric: `Avg: $${s.avg.toFixed(2)}`,
                severity: 'warning',
            });
        }
        const topWinner = winners.sort((a, b) => b.avg - a.avg)[0];
        if (topWinner) {
            insights.push({
                id: `symbol-best-${topWinner.symbol}`,
                type: 'positive',
                title: `${topWinner.symbol} is your best instrument`,
                description: `You average +$${topWinner.avg.toFixed(2)} per trade on ${topWinner.symbol} with ${topWinner.wr.toFixed(0)}% win rate across ${topWinner.count} trades.`,
                metric: `+$${topWinner.avg.toFixed(2)} avg`,
                severity: 'success',
            });
        }
        return insights;
    }
    analyzeRiskReward(trades) {
        const insights = [];
        const withRR = trades.filter(t => t.riskReward != null);
        if (withRR.length < 5)
            return insights;
        const avgRR = withRR.reduce((s, t) => s + Number(t.riskReward), 0) / withRR.length;
        const winRate = trades.filter(t => Number(t.pnl) > 0).length / trades.length;
        const breakevenWR = 1 / (1 + avgRR);
        if (winRate < breakevenWR) {
            insights.push({
                id: 'rr-below-breakeven',
                type: 'warning',
                title: 'Win rate below breakeven for your R:R',
                description: `With avg R:R of 1:${avgRR.toFixed(2)}, you need ${(breakevenWR * 100).toFixed(0)}% win rate to break even. Your actual win rate is ${(winRate * 100).toFixed(0)}%. Improve entries or widen targets.`,
                metric: `Need ${(breakevenWR * 100).toFixed(0)}% WR`,
                severity: 'danger',
            });
        }
        else {
            const margin = ((winRate - breakevenWR) * 100).toFixed(1);
            insights.push({
                id: 'rr-above-breakeven',
                type: 'positive',
                title: 'Your R:R and win rate are aligned',
                description: `With R:R 1:${avgRR.toFixed(2)} and ${(winRate * 100).toFixed(0)}% win rate, you're ${margin}% above breakeven. Positive expectancy confirmed.`,
                metric: `+${margin}% above breakeven`,
                severity: 'success',
            });
        }
        return insights;
    }
    analyzeLotSizing(trades) {
        const insights = [];
        const lots = trades.map(t => Number(t.lotSize));
        const mean = lots.reduce((s, v) => s + v, 0) / lots.length;
        const variance = lots.reduce((s, v) => s + (v - mean) ** 2, 0) / lots.length;
        const stdDev = Math.sqrt(variance);
        const cv = stdDev / mean;
        if (cv > 0.5) {
            insights.push({
                id: 'lot-inconsistency',
                type: 'warning',
                title: 'Inconsistent lot sizing',
                description: `Your lot sizes vary significantly (avg ${mean.toFixed(2)}, std dev ${stdDev.toFixed(2)}). High variability in position sizing increases risk. Consider a fixed % risk-per-trade rule.`,
                metric: `CV: ${(cv * 100).toFixed(0)}%`,
                severity: 'warning',
            });
        }
        return insights;
    }
    analyzeConsistency(trades) {
        const insights = [];
        if (trades.length < 10)
            return insights;
        const half = Math.floor(trades.length / 2);
        const firstHalf = trades.slice(0, half);
        const secondHalf = trades.slice(half);
        const wr1 = firstHalf.filter(t => Number(t.pnl) > 0).length / firstHalf.length;
        const wr2 = secondHalf.filter(t => Number(t.pnl) > 0).length / secondHalf.length;
        const avgPnl1 = firstHalf.reduce((s, t) => s + Number(t.pnl), 0) / firstHalf.length;
        const avgPnl2 = secondHalf.reduce((s, t) => s + Number(t.pnl), 0) / secondHalf.length;
        if (avgPnl2 > avgPnl1 * 1.2) {
            insights.push({
                id: 'improving',
                type: 'positive',
                title: "You're improving over time",
                description: `Your recent average P&L ($${avgPnl2.toFixed(2)}) is ${((avgPnl2 / avgPnl1 - 1) * 100).toFixed(0)}% better than earlier ($${avgPnl1.toFixed(2)}). Keep journaling — it's working.`,
                metric: `+${((avgPnl2 / avgPnl1 - 1) * 100).toFixed(0)}% improvement`,
                severity: 'success',
            });
        }
        else if (avgPnl2 < avgPnl1 * 0.7 && avgPnl1 > 0) {
            insights.push({
                id: 'declining',
                type: 'warning',
                title: 'Recent performance has declined',
                description: `Your recent trades average $${avgPnl2.toFixed(2)} vs $${avgPnl1.toFixed(2)} earlier — a ${Math.abs((avgPnl2 / avgPnl1 - 1) * 100).toFixed(0)}% drop. Review your recent trade notes for patterns.`,
                metric: `${((avgPnl2 / avgPnl1 - 1) * 100).toFixed(0)}% change`,
                severity: 'warning',
            });
        }
        return insights;
    }
    analyzeStreaks(trades) {
        const insights = [];
        let maxLoss = 0, curLoss = 0;
        let maxWin = 0, curWin = 0;
        for (const t of trades) {
            if (Number(t.pnl) > 0) {
                curWin++;
                curLoss = 0;
                maxWin = Math.max(maxWin, curWin);
            }
            else {
                curLoss++;
                curWin = 0;
                maxLoss = Math.max(maxLoss, curLoss);
            }
        }
        if (curLoss >= 3) {
            insights.push({
                id: 'current-losing-streak',
                type: 'warning',
                title: `Current losing streak: ${curLoss} trades`,
                description: `You've lost your last ${curLoss} trades in a row. Consider taking a break, reviewing your entries, or reducing position size until your edge returns.`,
                metric: `${curLoss} consecutive losses`,
                severity: 'danger',
            });
        }
        if (maxLoss >= 5) {
            insights.push({
                id: 'max-losing-streak',
                type: 'suggestion',
                title: `Max losing streak: ${maxLoss} trades`,
                description: `Your worst streak was ${maxLoss} consecutive losses. Consider adding a daily loss limit rule — e.g. stop trading after 3 losses in a day.`,
                metric: `${maxLoss} in a row`,
                severity: 'warning',
            });
        }
        return insights;
    }
    async getClosedTrades(userId, accountId) {
        const accounts = await this.prisma.account.findMany({
            where: { userId, ...(accountId && { id: accountId }) },
            select: { id: true },
        });
        const ids = accounts.map(a => a.id);
        return this.prisma.trade.findMany({
            where: { accountId: { in: ids }, status: client_1.TradeStatus.CLOSED },
            orderBy: { closeTime: 'asc' },
            include: { notes: true },
        });
    }
};
exports.InsightsService = InsightsService;
exports.InsightsService = InsightsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InsightsService);
//# sourceMappingURL=insights.service.js.map