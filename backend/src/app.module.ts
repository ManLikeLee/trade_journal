import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { TradesModule } from './trades/trades.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { WebsocketModule } from './websocket/websocket.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [
    // Rate limiting — 100 req / 60s per IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    TradesModule,
    AnalyticsModule,
    WebsocketModule,
    TagsModule,
  ],
})
export class AppModule {}
