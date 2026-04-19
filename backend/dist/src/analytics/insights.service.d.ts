import { PrismaService } from '../prisma/prisma.service';
export interface Insight {
    id: string;
    type: 'pattern' | 'warning' | 'positive' | 'suggestion';
    title: string;
    description: string;
    metric?: string;
    severity: 'info' | 'warning' | 'success' | 'danger';
}
export declare class InsightsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    generate(userId: string, accountId?: string): Promise<Insight[]>;
    private analyzeEmotions;
    private analyzeDayOfWeek;
    private analyzeHoldTime;
    private analyzeSymbols;
    private analyzeRiskReward;
    private analyzeLotSizing;
    private analyzeConsistency;
    private analyzeStreaks;
    private getClosedTrades;
}
