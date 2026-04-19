import { AnalyticsService, AnalyticsQuery } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    summary(req: any, query: AnalyticsQuery): Promise<{
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
    equityCurve(req: any, query: AnalyticsQuery): Promise<{
        date: string;
        equity: number;
        pnl: number;
    }[]>;
    pnlByDay(req: any, query: AnalyticsQuery): Promise<{
        date: string;
        pnl: number;
    }[]>;
    pnlBySymbol(req: any, query: AnalyticsQuery): Promise<{
        symbol: string;
        pnl: number;
        count: number;
    }[]>;
    distribution(req: any, query: AnalyticsQuery): Promise<Record<string, number>>;
}
