import { TradesService, CreateTradeDto, UpdateTradeDto, SyncTradeDto, TradesQueryDto } from './trades.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class TradesController {
    private readonly tradesService;
    private readonly prisma;
    constructor(tradesService: TradesService, prisma: PrismaService);
    create(req: any, dto: CreateTradeDto): Promise<{
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
        lotSize: import("@prisma/client/runtime/library").Decimal;
        entryPrice: import("@prisma/client/runtime/library").Decimal;
        exitPrice: import("@prisma/client/runtime/library").Decimal | null;
        stopLoss: import("@prisma/client/runtime/library").Decimal | null;
        takeProfit: import("@prisma/client/runtime/library").Decimal | null;
        openTime: Date;
        closeTime: Date | null;
        pnl: import("@prisma/client/runtime/library").Decimal | null;
        commission: import("@prisma/client/runtime/library").Decimal;
        swap: import("@prisma/client/runtime/library").Decimal;
        riskReward: import("@prisma/client/runtime/library").Decimal | null;
        pips: import("@prisma/client/runtime/library").Decimal | null;
        status: import(".prisma/client").$Enums.TradeStatus;
        source: import(".prisma/client").$Enums.TradeSource;
        accountId: string;
    }>;
    findAll(req: any, query: TradesQueryDto): Promise<{
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
            lotSize: import("@prisma/client/runtime/library").Decimal;
            entryPrice: import("@prisma/client/runtime/library").Decimal;
            exitPrice: import("@prisma/client/runtime/library").Decimal | null;
            stopLoss: import("@prisma/client/runtime/library").Decimal | null;
            takeProfit: import("@prisma/client/runtime/library").Decimal | null;
            openTime: Date;
            closeTime: Date | null;
            pnl: import("@prisma/client/runtime/library").Decimal | null;
            commission: import("@prisma/client/runtime/library").Decimal;
            swap: import("@prisma/client/runtime/library").Decimal;
            riskReward: import("@prisma/client/runtime/library").Decimal | null;
            pips: import("@prisma/client/runtime/library").Decimal | null;
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
    findOne(req: any, id: string): Promise<{
        account: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            broker: string;
            accountNumber: string | null;
            currency: string;
            initialBalance: import("@prisma/client/runtime/library").Decimal;
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
        lotSize: import("@prisma/client/runtime/library").Decimal;
        entryPrice: import("@prisma/client/runtime/library").Decimal;
        exitPrice: import("@prisma/client/runtime/library").Decimal | null;
        stopLoss: import("@prisma/client/runtime/library").Decimal | null;
        takeProfit: import("@prisma/client/runtime/library").Decimal | null;
        openTime: Date;
        closeTime: Date | null;
        pnl: import("@prisma/client/runtime/library").Decimal | null;
        commission: import("@prisma/client/runtime/library").Decimal;
        swap: import("@prisma/client/runtime/library").Decimal;
        riskReward: import("@prisma/client/runtime/library").Decimal | null;
        pips: import("@prisma/client/runtime/library").Decimal | null;
        status: import(".prisma/client").$Enums.TradeStatus;
        source: import(".prisma/client").$Enums.TradeSource;
        accountId: string;
    }>;
    update(req: any, id: string, dto: UpdateTradeDto): Promise<{
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
        lotSize: import("@prisma/client/runtime/library").Decimal;
        entryPrice: import("@prisma/client/runtime/library").Decimal;
        exitPrice: import("@prisma/client/runtime/library").Decimal | null;
        stopLoss: import("@prisma/client/runtime/library").Decimal | null;
        takeProfit: import("@prisma/client/runtime/library").Decimal | null;
        openTime: Date;
        closeTime: Date | null;
        pnl: import("@prisma/client/runtime/library").Decimal | null;
        commission: import("@prisma/client/runtime/library").Decimal;
        swap: import("@prisma/client/runtime/library").Decimal;
        riskReward: import("@prisma/client/runtime/library").Decimal | null;
        pips: import("@prisma/client/runtime/library").Decimal | null;
        status: import(".prisma/client").$Enums.TradeStatus;
        source: import(".prisma/client").$Enums.TradeSource;
        accountId: string;
    }>;
    remove(req: any, id: string): Promise<void>;
    syncFromEA(apiKey: string, dto: SyncTradeDto): Promise<{
        trade: {
            symbol: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            externalTicket: string | null;
            direction: import(".prisma/client").$Enums.TradeDirection;
            lotSize: import("@prisma/client/runtime/library").Decimal;
            entryPrice: import("@prisma/client/runtime/library").Decimal;
            exitPrice: import("@prisma/client/runtime/library").Decimal | null;
            stopLoss: import("@prisma/client/runtime/library").Decimal | null;
            takeProfit: import("@prisma/client/runtime/library").Decimal | null;
            openTime: Date;
            closeTime: Date | null;
            pnl: import("@prisma/client/runtime/library").Decimal | null;
            commission: import("@prisma/client/runtime/library").Decimal;
            swap: import("@prisma/client/runtime/library").Decimal;
            riskReward: import("@prisma/client/runtime/library").Decimal | null;
            pips: import("@prisma/client/runtime/library").Decimal | null;
            status: import(".prisma/client").$Enums.TradeStatus;
            source: import(".prisma/client").$Enums.TradeSource;
            accountId: string;
        };
        created: boolean;
    }>;
}
