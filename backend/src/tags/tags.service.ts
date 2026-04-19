import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString() name: string;
  @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/) color?: string;
}

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.tag.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  }

  create(userId: string, dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: { userId, name: dto.name, color: dto.color ?? '#6366f1' },
    });
  }

  remove(userId: string, id: string) {
    return this.prisma.tag.deleteMany({ where: { id, userId } });
  }

  async addToTrade(userId: string, tradeId: string, tagId: string) {
    await this.assertTradeOwner(userId, tradeId);
    return this.prisma.tradeTag.upsert({
      where: { tradeId_tagId: { tradeId, tagId } },
      create: { tradeId, tagId },
      update: {},
    });
  }

  async removeFromTrade(userId: string, tradeId: string, tagId: string) {
    await this.assertTradeOwner(userId, tradeId);
    return this.prisma.tradeTag.deleteMany({ where: { tradeId, tagId } });
  }

  private async assertTradeOwner(userId: string, tradeId: string) {
    const trade = await this.prisma.trade.findFirst({
      where: { id: tradeId, account: { userId } },
    });
    if (!trade) throw new Error('Trade not found or access denied');
  }
}
