import { PrismaService } from '../prisma/prisma.service';
import { TradeDirection, TradeSource, TradeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
export declare class CreateTradeDto {
    accountId: string;
    symbol: string;
    direction: TradeDirection;
    lotSize: number;
    entryPrice: number;
    exitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    openTime: string;
    closeTime?: string;
    commission?: number;
    swap?: number;
}
export declare class UpdateTradeDto {
    exitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    closeTime?: string;
    commission?: number;
    swap?: number;
}
export declare class SyncTradeDto {
    ticket: string;
    source?: TradeSource;
    symbol?: string;
    direction?: TradeDirection;
    lotSize?: number;
    entryPrice?: number;
    exitPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    openTime?: string;
    closeTime?: string;
    commission?: number;
    swap?: number;
    pnl?: number;
}
export declare class TradesQueryDto {
    accountId?: string;
    symbol?: string;
    direction?: TradeDirection;
    status?: TradeStatus;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
}
export declare class TradesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateTradeDto): Promise<{
        tradeTags: ({
            tag: {
                id: string;
                name: string;
                createdAt: Date;
                userId: string;
                color: string;
            };
        } & {
            tradeId: string;
            tagId: string;
        })[];
        notes: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            emotion: import(".prisma/client").$Enums.Emotion | null;
            tradeId: string;
        }[];
    } & {
        symbol: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        externalTicket: string | null;
        direction: import(".prisma/client").$Enums.TradeDirection;
        lotSize: Decimal;
        entryPrice: Decimal;
        exitPrice: Decimal | null;
        stopLoss: Decimal | null;
        takeProfit: Decimal | null;
        openTime: Date;
        closeTime: Date | null;
        pnl: Decimal | null;
        commission: Decimal;
        swap: Decimal;
        riskReward: Decimal | null;
        pips: Decimal | null;
        status: import(".prisma/client").$Enums.TradeStatus;
        source: import(".prisma/client").$Enums.TradeSource;
        accountId: string;
    }>;
    findAll(userId: string, query: TradesQueryDto): Promise<{
        data: ({
            tradeTags: ({
                tag: {
                    id: string;
                    name: string;
                    createdAt: Date;
                    userId: string;
                    color: string;
                };
            } & {
                tradeId: string;
                tagId: string;
            })[];
            notes: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                content: string;
                emotion: import(".prisma/client").$Enums.Emotion | null;
                tradeId: string;
            }[];
        } & {
            symbol: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            externalTicket: string | null;
            direction: import(".prisma/client").$Enums.TradeDirection;
            lotSize: Decimal;
            entryPrice: Decimal;
            exitPrice: Decimal | null;
            stopLoss: Decimal | null;
            takeProfit: Decimal | null;
            openTime: Date;
            closeTime: Date | null;
            pnl: Decimal | null;
            commission: Decimal;
            swap: Decimal;
            riskReward: Decimal | null;
            pips: Decimal | null;
            status: import(".prisma/client").$Enums.TradeStatus;
            source: import(".prisma/client").$Enums.TradeSource;
            accountId: string;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findOne(userId: string, tradeId: string): Promise<{
        account: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            broker: string;
            accountNumber: string | null;
            currency: string;
            initialBalance: Decimal;
            isActive: boolean;
            apiKey: string | null;
        };
        tradeTags: ({
            tag: {
                id: string;
                name: string;
                createdAt: Date;
                userId: string;
                color: string;
            };
        } & {
            tradeId: string;
            tagId: string;
        })[];
        notes: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            emotion: import(".prisma/client").$Enums.Emotion | null;
            tradeId: string;
        }[];
    } & {
        symbol: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        externalTicket: string | null;
        direction: import(".prisma/client").$Enums.TradeDirection;
        lotSize: Decimal;
        entryPrice: Decimal;
        exitPrice: Decimal | null;
        stopLoss: Decimal | null;
        takeProfit: Decimal | null;
        openTime: Date;
        closeTime: Date | null;
        pnl: Decimal | null;
        commission: Decimal;
        swap: Decimal;
        riskReward: Decimal | null;
        pips: Decimal | null;
        status: import(".prisma/client").$Enums.TradeStatus;
        source: import(".prisma/client").$Enums.TradeSource;
        accountId: string;
    }>;
    update(userId: string, tradeId: string, dto: UpdateTradeDto): Promise<{
        tradeTags: ({
            tag: {
                id: string;
                name: string;
                createdAt: Date;
                userId: string;
                color: string;
            };
        } & {
            tradeId: string;
            tagId: string;
        })[];
        notes: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            content: string;
            emotion: import(".prisma/client").$Enums.Emotion | null;
            tradeId: string;
        }[];
    } & {
        symbol: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        externalTicket: string | null;
        direction: import(".prisma/client").$Enums.TradeDirection;
        lotSize: Decimal;
        entryPrice: Decimal;
        exitPrice: Decimal | null;
        stopLoss: Decimal | null;
        takeProfit: Decimal | null;
        openTime: Date;
        closeTime: Date | null;
        pnl: Decimal | null;
        commission: Decimal;
        swap: Decimal;
        riskReward: Decimal | null;
        pips: Decimal | null;
        status: import(".prisma/client").$Enums.TradeStatus;
        source: import(".prisma/client").$Enums.TradeSource;
        accountId: string;
    }>;
    remove(userId: string, tradeId: string): Promise<void>;
    syncFromEA(accountId: string, dto: SyncTradeDto): Promise<{
        trade: {
            symbol: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            externalTicket: string | null;
            direction: import(".prisma/client").$Enums.TradeDirection;
            lotSize: Decimal;
            entryPrice: Decimal;
            exitPrice: Decimal | null;
            stopLoss: Decimal | null;
            takeProfit: Decimal | null;
            openTime: Date;
            closeTime: Date | null;
            pnl: Decimal | null;
            commission: Decimal;
            swap: Decimal;
            riskReward: Decimal | null;
            pips: Decimal | null;
            status: import(".prisma/client").$Enums.TradeStatus;
            source: import(".prisma/client").$Enums.TradeSource;
            accountId: string;
        };
        created: boolean;
    }>;
    private computeMetrics;
    private isClosedTrade;
    private parseOptionalTradeDate;
    private parseTradeDate;
    private toNumberOrNull;
    private resolveSyncedPnl;
    private isLikelyForexSymbol;
    private assertAccountOwner;
}
