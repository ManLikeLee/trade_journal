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
exports.TradeNotesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
class CreateNoteDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], CreateNoteDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)([
        'CONFIDENT', 'FEARFUL', 'GREEDY', 'NEUTRAL',
        'FOMO', 'DISCIPLINED', 'REVENGE', 'ANXIOUS',
    ]),
    __metadata("design:type", String)
], CreateNoteDto.prototype, "emotion", void 0);
let TradeNotesController = class TradeNotesController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(req, tradeId) {
        await this.assertOwner(req.user.id, tradeId);
        return this.prisma.tradeNote.findMany({
            where: { tradeId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async create(req, tradeId, dto) {
        await this.assertOwner(req.user.id, tradeId);
        return this.prisma.tradeNote.create({
            data: { tradeId, content: dto.content, emotion: dto.emotion },
        });
    }
    async remove(req, tradeId, noteId) {
        await this.assertOwner(req.user.id, tradeId);
        await this.prisma.tradeNote.deleteMany({ where: { id: noteId, tradeId } });
    }
    async assertOwner(userId, tradeId) {
        const trade = await this.prisma.trade.findFirst({
            where: { id: tradeId, account: { userId } },
        });
        if (!trade)
            throw new Error('Trade not found or access denied');
    }
};
exports.TradeNotesController = TradeNotesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List notes for a trade' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('tradeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TradeNotesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add a journal note with optional emotion tag' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('tradeId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, CreateNoteDto]),
    __metadata("design:returntype", Promise)
], TradeNotesController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':noteId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a note' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('tradeId')),
    __param(2, (0, common_1.Param)('noteId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], TradeNotesController.prototype, "remove", null);
exports.TradeNotesController = TradeNotesController = __decorate([
    (0, swagger_1.ApiTags)('Trade Notes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('trades/:tradeId/notes'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TradeNotesController);
//# sourceMappingURL=trade-notes.controller.js.map