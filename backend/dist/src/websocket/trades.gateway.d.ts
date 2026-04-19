import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
export declare class TradesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwt;
    server: Server;
    private readonly logger;
    private userSockets;
    constructor(jwt: JwtService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    emitTradeCreated(userId: string, trade: any): void;
    emitTradeUpdated(userId: string, trade: any): void;
    emitTradeDeleted(userId: string, tradeId: string): void;
    emitAnalyticsRefresh(userId: string): void;
    handleSubscribe(client: Socket, accountId: string): {
        event: string;
        data: string;
    };
}
