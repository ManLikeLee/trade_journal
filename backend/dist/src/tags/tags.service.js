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
exports.TagsService = exports.CreateTagDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const class_validator_1 = require("class-validator");
class CreateTagDto {
}
exports.CreateTagDto = CreateTagDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTagDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^#[0-9A-Fa-f]{6}$/),
    __metadata("design:type", String)
], CreateTagDto.prototype, "color", void 0);
let TagsService = class TagsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(userId) {
        return this.prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } });
    }
    create(userId, dto) {
        return this.prisma.tag.create({
            data: { userId, name: dto.name, color: dto.color ?? '#6366f1' },
        });
    }
    remove(userId, id) {
        return this.prisma.tag.deleteMany({ where: { id, userId } });
    }
    async addToTrade(userId, tradeId, tagId) {
        await this.assertTradeOwner(userId, tradeId);
        return this.prisma.tradeTag.upsert({
            where: { tradeId_tagId: { tradeId, tagId } },
            create: { tradeId, tagId },
            update: {},
        });
    }
    async removeFromTrade(userId, tradeId, tagId) {
        await this.assertTradeOwner(userId, tradeId);
        return this.prisma.tradeTag.deleteMany({ where: { tradeId, tagId } });
    }
    async assertTradeOwner(userId, tradeId) {
        const trade = await this.prisma.trade.findFirst({
            where: { id: tradeId, account: { userId } },
        });
        if (!trade)
            throw new Error('Trade not found or access denied');
    }
};
exports.TagsService = TagsService;
exports.TagsService = TagsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TagsService);
//# sourceMappingURL=tags.service.js.map