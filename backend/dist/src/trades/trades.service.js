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
exports.TradesService = exports.TradesQueryDto = exports.SyncTradeDto = exports.UpdateTradeDto = exports.CreateTradeDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const library_1 = require("@prisma/client/runtime/library");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateTradeDto {
}
exports.CreateTradeDto = CreateTradeDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTradeDto.prototype, "accountId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTradeDto.prototype, "symbol", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['BUY', 'SELL'] }),
    (0, class_validator_1.IsEnum)(client_1.TradeDirection),
    __metadata("design:type", String)
], CreateTradeDto.prototype, "direction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateTradeDto.prototype, "lotSize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateTradeDto.prototype, "entryPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateTradeDto.prototype, "exitPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateTradeDto.prototype, "stopLoss", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateTradeDto.prototype, "takeProfit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTradeDto.prototype, "openTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTradeDto.prototype, "closeTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateTradeDto.prototype, "commission", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateTradeDto.prototype, "swap", void 0);
class UpdateTradeDto {
}
exports.UpdateTradeDto = UpdateTradeDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTradeDto.prototype, "exitPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTradeDto.prototype, "stopLoss", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTradeDto.prototype, "takeProfit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateTradeDto.prototype, "closeTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTradeDto.prototype, "commission", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateTradeDto.prototype, "swap", void 0);
class SyncTradeDto {
}
exports.SyncTradeDto = SyncTradeDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncTradeDto.prototype, "ticket", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['MT4', 'MT5'], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['MT4', 'MT5']),
    __metadata("design:type", String)
], SyncTradeDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncTradeDto.prototype, "symbol", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['BUY', 'SELL'], required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TradeDirection),
    __metadata("design:type", String)
], SyncTradeDto.prototype, "direction", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], SyncTradeDto.prototype, "lotSize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncTradeDto.prototype, "entryPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncTradeDto.prototype, "exitPrice", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncTradeDto.prototype, "stopLoss", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncTradeDto.prototype, "takeProfit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncTradeDto.prototype, "openTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SyncTradeDto.prototype, "closeTime", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncTradeDto.prototype, "commission", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncTradeDto.prototype, "swap", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], SyncTradeDto.prototype, "pnl", void 0);
class TradesQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 50;
        this.sortBy = 'openTime';
        this.order = 'desc';
    }
}
exports.TradesQueryDto = TradesQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TradesQueryDto.prototype, "accountId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TradesQueryDto.prototype, "symbol", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TradeDirection),
    __metadata("design:type", String)
], TradesQueryDto.prototype, "direction", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TradeStatus),
    __metadata("design:type", String)
], TradesQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], TradesQueryDto.prototype, "from", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], TradesQueryDto.prototype, "to", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], TradesQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], TradesQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TradesQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TradesQueryDto.prototype, "order", void 0);
let TradesService = class TradesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        await this.assertAccountOwner(userId, dto.accountId);
        const computed = this.computeMetrics(dto);
        const isClosed = this.isClosedTrade(dto.exitPrice, dto.closeTime);
        return this.prisma.trade.create({
            data: {
                accountId: dto.accountId,
                symbol: dto.symbol.toUpperCase(),
                direction: dto.direction,
                lotSize: new library_1.Decimal(dto.lotSize),
                entryPrice: new library_1.Decimal(dto.entryPrice),
                exitPrice: dto.exitPrice != null ? new library_1.Decimal(dto.exitPrice) : null,
                stopLoss: dto.stopLoss != null ? new library_1.Decimal(dto.stopLoss) : null,
                takeProfit: dto.takeProfit != null ? new library_1.Decimal(dto.takeProfit) : null,
                openTime: new Date(dto.openTime),
                closeTime: dto.closeTime ? new Date(dto.closeTime) : null,
                commission: new library_1.Decimal(dto.commission ?? 0),
                swap: new library_1.Decimal(dto.swap ?? 0),
                pnl: computed.pnl,
                riskReward: computed.riskReward,
                status: isClosed ? client_1.TradeStatus.CLOSED : client_1.TradeStatus.OPEN,
                source: 'MANUAL',
            },
            include: { notes: true, tradeTags: { include: { tag: true } } },
        });
    }
    async findAll(userId, query) {
        const { page = 1, limit = 50, sortBy = 'openTime', order = 'desc', ...filters } = query;
        const userAccounts = await this.prisma.account.findMany({
            where: { userId },
            select: { id: true },
        });
        const accountIds = userAccounts.map((a) => a.id);
        const where = {
            accountId: filters.accountId
                ? (accountIds.includes(filters.accountId) ? filters.accountId : '⊥')
                : { in: accountIds },
        };
        if (filters.symbol)
            where.symbol = { equals: filters.symbol.toUpperCase() };
        if (filters.direction)
            where.direction = filters.direction;
        if (filters.status)
            where.status = filters.status;
        if (filters.from || filters.to) {
            where.openTime = {};
            if (filters.from)
                where.openTime.gte = new Date(filters.from);
            if (filters.to)
                where.openTime.lte = new Date(filters.to);
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
    async findOne(userId, tradeId) {
        const trade = await this.prisma.trade.findUnique({
            where: { id: tradeId },
            include: {
                account: true,
                notes: { orderBy: { createdAt: 'asc' } },
                tradeTags: { include: { tag: true } },
            },
        });
        if (!trade)
            throw new common_1.NotFoundException('Trade not found');
        await this.assertAccountOwner(userId, trade.accountId);
        return trade;
    }
    async update(userId, tradeId, dto) {
        const trade = await this.findOne(userId, tradeId);
        const merged = { ...trade, ...dto };
        const computed = this.computeMetrics(merged);
        const nextExitPrice = dto.exitPrice !== undefined ? dto.exitPrice : this.toNumberOrNull(trade.exitPrice);
        const nextCloseTime = dto.closeTime !== undefined ? dto.closeTime : trade.closeTime;
        const isClosed = this.isClosedTrade(nextExitPrice, nextCloseTime);
        return this.prisma.trade.update({
            where: { id: tradeId },
            data: {
                exitPrice: dto.exitPrice != null ? new library_1.Decimal(dto.exitPrice) : undefined,
                stopLoss: dto.stopLoss != null ? new library_1.Decimal(dto.stopLoss) : undefined,
                takeProfit: dto.takeProfit != null ? new library_1.Decimal(dto.takeProfit) : undefined,
                closeTime: dto.closeTime ? new Date(dto.closeTime) : undefined,
                commission: dto.commission != null ? new library_1.Decimal(dto.commission) : undefined,
                swap: dto.swap != null ? new library_1.Decimal(dto.swap) : undefined,
                pnl: computed.pnl,
                riskReward: computed.riskReward,
                status: isClosed ? client_1.TradeStatus.CLOSED : client_1.TradeStatus.OPEN,
            },
            include: { notes: true, tradeTags: { include: { tag: true } } },
        });
    }
    async remove(userId, tradeId) {
        await this.findOne(userId, tradeId);
        await this.prisma.trade.delete({ where: { id: tradeId } });
    }
    async syncFromEA(accountId, dto) {
        const existing = await this.prisma.trade.findFirst({
            where: { accountId, externalTicket: dto.ticket },
        });
        if (!existing) {
            if (!dto.symbol || !dto.direction || dto.lotSize == null || dto.entryPrice == null || !dto.openTime) {
                throw new common_1.BadRequestException('New sync trades require symbol, direction, lotSize, entryPrice, and openTime');
            }
            const source = dto.source ?? client_1.TradeSource.MT5;
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
                    lotSize: new library_1.Decimal(dto.lotSize),
                    entryPrice: new library_1.Decimal(dto.entryPrice),
                    exitPrice: dto.exitPrice != null ? new library_1.Decimal(dto.exitPrice) : null,
                    stopLoss: dto.stopLoss != null ? new library_1.Decimal(dto.stopLoss) : null,
                    takeProfit: dto.takeProfit != null ? new library_1.Decimal(dto.takeProfit) : null,
                    openTime: this.parseTradeDate(dto.openTime, 'openTime'),
                    closeTime,
                    commission: new library_1.Decimal(dto.commission ?? 0),
                    swap: new library_1.Decimal(dto.swap ?? 0),
                    pnl,
                    riskReward: computed.riskReward,
                    status: isClosed ? client_1.TradeStatus.CLOSED : client_1.TradeStatus.OPEN,
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
                lotSize: dto.lotSize != null ? new library_1.Decimal(dto.lotSize) : undefined,
                entryPrice: dto.entryPrice != null ? new library_1.Decimal(dto.entryPrice) : undefined,
                exitPrice: dto.exitPrice != null ? new library_1.Decimal(dto.exitPrice) : undefined,
                stopLoss: dto.stopLoss != null ? new library_1.Decimal(dto.stopLoss) : undefined,
                takeProfit: dto.takeProfit != null ? new library_1.Decimal(dto.takeProfit) : undefined,
                openTime: dto.openTime != null ? this.parseTradeDate(dto.openTime, 'openTime') : undefined,
                closeTime: dto.closeTime != null ? this.parseTradeDate(dto.closeTime, 'closeTime') : undefined,
                commission: dto.commission != null ? new library_1.Decimal(dto.commission) : undefined,
                swap: dto.swap != null ? new library_1.Decimal(dto.swap) : undefined,
                pnl,
                riskReward: computed.riskReward,
                status: isClosed ? client_1.TradeStatus.CLOSED : client_1.TradeStatus.OPEN,
                source,
            },
        });
        return { trade, created: false };
    }
    computeMetrics(dto) {
        let pnl = null;
        let riskReward = null;
        if (dto.exitPrice != null) {
            const pipValue = dto.lotSize * 10;
            const priceDiff = dto.direction === 'BUY'
                ? dto.exitPrice - dto.entryPrice
                : dto.entryPrice - dto.exitPrice;
            const gross = priceDiff * pipValue * 10000;
            const net = gross - (dto.commission ?? 0) - (dto.swap ?? 0);
            pnl = new library_1.Decimal(net.toFixed(2));
        }
        if (dto.stopLoss != null && dto.takeProfit != null) {
            const risk = Math.abs(dto.entryPrice - dto.stopLoss);
            const reward = Math.abs(dto.takeProfit - dto.entryPrice);
            if (risk > 0)
                riskReward = new library_1.Decimal((reward / risk).toFixed(4));
        }
        return { pnl, riskReward };
    }
    isClosedTrade(exitPrice, closeTime) {
        return exitPrice != null || closeTime != null;
    }
    parseOptionalTradeDate(value) {
        if (value == null)
            return null;
        return this.parseTradeDate(value, 'date');
    }
    parseTradeDate(value, fieldName) {
        const raw = String(value).trim();
        if (!raw)
            throw new common_1.BadRequestException(`Invalid ${fieldName}: empty value`);
        const mtLike = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (mtLike) {
            const [, y, m, d, h, mi, s] = mtLike;
            const normalized = `${y}-${m}-${d}T${h}:${mi}:${s ?? '00'}Z`;
            const parsed = new Date(normalized);
            if (!Number.isNaN(parsed.getTime()))
                return parsed;
        }
        const direct = new Date(raw);
        if (!Number.isNaN(direct.getTime()))
            return direct;
        if (/^\d{10,13}$/.test(raw)) {
            const num = Number(raw);
            const ms = raw.length === 13 ? num : num * 1000;
            const parsed = new Date(ms);
            if (!Number.isNaN(parsed.getTime()))
                return parsed;
        }
        throw new common_1.BadRequestException(`Invalid ${fieldName}: ${raw}`);
    }
    toNumberOrNull(value) {
        if (value == null)
            return null;
        return Number(value);
    }
    resolveSyncedPnl(params) {
        const { symbol, payloadPnl, computedPnl, existingPnl } = params;
        if (payloadPnl != null)
            return new library_1.Decimal(payloadPnl);
        if (this.isLikelyForexSymbol(symbol))
            return computedPnl ?? existingPnl ?? null;
        return existingPnl ?? null;
    }
    isLikelyForexSymbol(symbol) {
        const fiat = new Set([
            'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
            'NOK', 'SEK', 'DKK', 'ZAR', 'TRY', 'PLN', 'HUF', 'CZK',
            'MXN', 'SGD', 'HKD', 'CNH',
        ]);
        const letters = symbol.toUpperCase().replace(/[^A-Z]/g, '');
        if (letters.length < 6)
            return false;
        const base = letters.slice(0, 3);
        const quote = letters.slice(3, 6);
        return fiat.has(base) && fiat.has(quote);
    }
    async assertAccountOwner(userId, accountId) {
        const account = await this.prisma.account.findFirst({
            where: { id: accountId, userId },
        });
        if (!account)
            throw new common_1.ForbiddenException('Account not found or access denied');
    }
};
exports.TradesService = TradesService;
exports.TradesService = TradesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TradesService);
//# sourceMappingURL=trades.service.js.map