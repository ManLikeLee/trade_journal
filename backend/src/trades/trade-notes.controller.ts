import {
  Controller, Get, Post, Delete,
  Body, Param, Request, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

class CreateNoteDto {
  @IsString() @MinLength(1) content: string;
  @IsOptional() @IsEnum([
    'CONFIDENT','FEARFUL','GREEDY','NEUTRAL',
    'FOMO','DISCIPLINED','REVENGE','ANXIOUS',
  ])
  emotion?: string;
}

@ApiTags('Trade Notes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('trades/:tradeId/notes')
export class TradeNotesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List notes for a trade' })
  async list(@Request() req: any, @Param('tradeId') tradeId: string) {
    await this.assertOwner(req.user.id, tradeId);
    return this.prisma.tradeNote.findMany({
      where: { tradeId },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Add a journal note with optional emotion tag' })
  async create(
    @Request() req: any,
    @Param('tradeId') tradeId: string,
    @Body() dto: CreateNoteDto,
  ) {
    await this.assertOwner(req.user.id, tradeId);
    return this.prisma.tradeNote.create({
      data: { tradeId, content: dto.content, emotion: dto.emotion as any },
    });
  }

  @Delete(':noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a note' })
  async remove(
    @Request() req: any,
    @Param('tradeId') tradeId: string,
    @Param('noteId') noteId: string,
  ) {
    await this.assertOwner(req.user.id, tradeId);
    await this.prisma.tradeNote.deleteMany({ where: { id: noteId, tradeId } });
  }

  private async assertOwner(userId: string, tradeId: string) {
    const trade = await this.prisma.trade.findFirst({
      where: { id: tradeId, account: { userId } },
    });
    if (!trade) throw new Error('Trade not found or access denied');
  }
}
