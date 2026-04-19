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
var TradesGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradesGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
let TradesGateway = TradesGateway_1 = class TradesGateway {
    constructor(jwt) {
        this.jwt = jwt;
        this.logger = new common_1.Logger(TradesGateway_1.name);
        this.userSockets = new Map();
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ??
                client.handshake.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = this.jwt.verify(token);
            client.data.userId = payload.sub;
            if (!this.userSockets.has(payload.sub)) {
                this.userSockets.set(payload.sub, new Set());
            }
            this.userSockets.get(payload.sub).add(client.id);
            client.join(`user:${payload.sub}`);
            this.logger.log(`Client ${client.id} connected (user ${payload.sub})`);
        }
        catch {
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const userId = client.data.userId;
        if (userId) {
            this.userSockets.get(userId)?.delete(client.id);
            if (this.userSockets.get(userId)?.size === 0) {
                this.userSockets.delete(userId);
            }
        }
        this.logger.log(`Client ${client.id} disconnected`);
    }
    emitTradeCreated(userId, trade) {
        this.server.to(`user:${userId}`).emit('trade:created', trade);
    }
    emitTradeUpdated(userId, trade) {
        this.server.to(`user:${userId}`).emit('trade:updated', trade);
    }
    emitTradeDeleted(userId, tradeId) {
        this.server.to(`user:${userId}`).emit('trade:deleted', { id: tradeId });
    }
    emitAnalyticsRefresh(userId) {
        this.server.to(`user:${userId}`).emit('analytics:refresh');
    }
    handleSubscribe(client, accountId) {
        client.join(`account:${accountId}`);
        return { event: 'subscribed', data: accountId };
    }
};
exports.TradesGateway = TradesGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TradesGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:account'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], TradesGateway.prototype, "handleSubscribe", null);
exports.TradesGateway = TradesGateway = TradesGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true },
        namespace: '/ws',
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], TradesGateway);
//# sourceMappingURL=trades.gateway.js.map