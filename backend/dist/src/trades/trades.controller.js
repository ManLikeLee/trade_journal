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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const trades_service_1 = require("./trades.service");
const prisma_service_1 = require("../prisma/prisma.service");
let TradesController = class TradesController {
    constructor(tradesService, prisma) {
        this.tradesService = tradesService;
        this.prisma = prisma;
    }
    create(req, dto) {
        return this.tradesService.create(req.user.id, dto);
    }
    findAll(req, query) {
        return this.tradesService.findAll(req.user.id, query);
    }
    findOne(req, id) {
        return this.tradesService.findOne(req.user.id, id);
    }
    update(req, id, dto) {
        return this.tradesService.update(req.user.id, id, dto);
    }
    remove(req, id) {
        return this.tradesService.remove(req.user.id, id);
    }
    async syncFromEA(apiKey, dto) {
        if (!apiKey)
            throw new common_1.UnauthorizedException('Missing X-Api-Key header');
        const account = await this.prisma.account.findFirst({ where: { apiKey } });
        if (!account)
            throw new common_1.UnauthorizedException('Invalid API key');
        return this.tradesService.syncFromEA(account.id, dto);
    }
};
exports.TradesController = TradesController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Log a trade manually' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, trades_service_1.CreateTradeDto]),
    __metadata("design:returntype", void 0)
], TradesController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List trades with filters & pagination' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, trades_service_1.TradesQueryDto]),
    __metadata("design:returntype", void 0)
], TradesController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get single trade' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TradesController.prototype, "findOne", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update trade (e.g. set exit price)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, trades_service_1.UpdateTradeDto]),
    __metadata("design:returntype", void 0)
], TradesController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete trade' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TradesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Receive trade from MT4/MT5 Expert Advisor' }),
    (0, swagger_1.ApiHeader)({ name: 'X-Api-Key', description: 'Account API key from Settings' }),
    __param(0, (0, common_1.Headers)('x-api-key')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, trades_service_1.SyncTradeDto]),
    __metadata("design:returntype", Promise)
], TradesController.prototype, "syncFromEA", null);
exports.TradesController = TradesController = __decorate([
    (0, swagger_1.ApiTags)('Trades'),
    (0, common_1.Controller)('trades'),
    __metadata("design:paramtypes", [trades_service_1.TradesService,
        prisma_service_1.PrismaService])
], TradesController);
//# sourceMappingURL=trades.controller.js.map