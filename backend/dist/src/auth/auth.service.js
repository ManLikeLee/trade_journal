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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
const SALT_ROUNDS = 12;
const REFRESH_TTL_DAYS = 30;
let AuthService = class AuthService {
    constructor(prisma, jwt) {
        this.prisma = prisma;
        this.jwt = jwt;
    }
    async register(dto) {
        const exists = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });
        if (exists)
            throw new common_1.ConflictException('Email already in use');
        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                passwordHash,
                name: dto.name,
            },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        return this.issueTokens(user.id, { email: user.email, name: user.name });
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user)
            return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            return null;
        return user;
    }
    async login(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { id: true, email: true, name: true },
        });
        return this.issueTokens(user.id, { email: user.email, name: user.name });
    }
    async refresh(rawRefreshToken) {
        const session = await this.prisma.session.findUnique({
            where: { refreshToken: rawRefreshToken },
            include: { user: true },
        });
        if (!session || session.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Refresh token expired or invalid');
        }
        await this.prisma.session.delete({ where: { id: session.id } });
        return this.issueTokens(session.userId, {
            email: session.user.email,
            name: session.user.name ?? '',
        });
    }
    async logout(refreshToken) {
        await this.prisma.session.deleteMany({ where: { refreshToken } });
    }
    async issueTokens(userId, payload) {
        const accessToken = this.jwt.sign({ sub: userId, ...payload });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);
        const { refreshToken } = await this.prisma.session.create({
            data: {
                userId,
                refreshToken: crypto.randomUUID(),
                expiresAt,
            },
        });
        return { accessToken, refreshToken, expiresIn: 900 };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map