import { PrismaService } from '../prisma/prisma.service';
export interface AnalyticsQuery {
    accountId?: string;
    from?: string;
    to?: string;
}
export declare class AnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(userId: string, query?: AnalyticsQuery): Promise<{
        totalTrades: number;
        winCount: number;
        lossCount: number;
        winRate: number;
        totalPnl: number;
        grossWin: number;
        grossLoss: number;
        avgWin: number;
        avgLoss: number;
        profitFactor: number;
        expectancy: number;
        avgRR: number;
        maxDrawdown: number;
        maxDrawdownPct: number;
    }>;
    getEquityCurve(userId: string, query?: AnalyticsQuery): Promise<{
        date: string;
        equity: number;
        pnl: number;
    }[]>;
    getPnlByDay(userId: string, query?: AnalyticsQuery): Promise<{
        date: string;
        pnl: number;
    }[]>;
    getPnlBySymbol(userId: string, query?: AnalyticsQuery): Promise<{
        symbol: string;
        pnl: number;
        count: number;
    }[]>;
    getWinLossDistribution(userId: string, query?: AnalyticsQuery): Promise<Record<string, number>>;
    private getClosedTrades;
    private normalizeTrade;
    private resolveRiskReward;
    private calcDrawdown;
    private emptyStats;
    private numOrNull;
    private dateOrNull;
}
