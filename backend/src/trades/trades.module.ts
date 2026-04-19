import { Module } from '@nestjs/common';
import { TradesService } from './trades.service';
import { TradesController } from './trades.controller';
import { TradeNotesController } from './trade-notes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [PrismaModule, WebsocketModule],
  providers: [TradesService],
  controllers: [TradesController, TradeNotesController],
  exports: [TradesService],
})
export class TradesModule {}
