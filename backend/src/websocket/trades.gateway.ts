// ============================================================
// websocket/trades.gateway.ts
// Real-time trade updates via Socket.io
// ============================================================
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true },
  namespace: '/ws',
})
export class TradesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TradesGateway.name);

  // userId → Set of socket IDs
  private userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwt.verify(token) as { sub: string };
      client.data.userId = payload.sub;

      // Track socket → user mapping
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      // Join personal room
      client.join(`user:${payload.sub}`);
      this.logger.log(`Client ${client.id} connected (user ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.get(userId)?.delete(client.id);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // ── Emit helpers (called by TradesService) ────────────────
  emitTradeCreated(userId: string, trade: any) {
    this.server.to(`user:${userId}`).emit('trade:created', trade);
  }

  emitTradeUpdated(userId: string, trade: any) {
    this.server.to(`user:${userId}`).emit('trade:updated', trade);
  }

  emitTradeDeleted(userId: string, tradeId: string) {
    this.server.to(`user:${userId}`).emit('trade:deleted', { id: tradeId });
  }

  emitAnalyticsRefresh(userId: string) {
    this.server.to(`user:${userId}`).emit('analytics:refresh');
  }

  // ── Client can subscribe to specific account room ─────────
  @SubscribeMessage('subscribe:account')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() accountId: string,
  ) {
    client.join(`account:${accountId}`);
    return { event: 'subscribed', data: accountId };
  }
}
