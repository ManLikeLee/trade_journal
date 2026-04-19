import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TradesGateway } from './trades.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    }),
  ],
  providers: [TradesGateway],
  exports: [TradesGateway],
})
export class WebsocketModule {}
