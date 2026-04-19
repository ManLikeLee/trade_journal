import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateAccountDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() broker: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() accountNumber?: string;
  @ApiProperty({ default: 'USD' }) @IsOptional() @IsString() currency?: string;
  @ApiProperty({ default: 0 }) @IsOptional() @IsNumber() @Min(0) initialBalance?: number;
}

export class UpdateAccountDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() broker?: string;
  @IsOptional() @IsString() accountNumber?: string;
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        broker: dto.broker,
        accountNumber: dto.accountNumber,
        currency: dto.currency ?? 'USD',
        initialBalance: new Decimal(dto.initialBalance ?? 0),
        apiKey: crypto.randomUUID(),
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.assertOwner(userId, id);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  async regenApiKey(userId: string, id: string) {
    await this.assertOwner(userId, id);
    return this.prisma.account.update({
      where: { id },
      data: { apiKey: crypto.randomUUID() },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    return this.prisma.account.delete({ where: { id } });
  }

  private async assertOwner(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException();
    if (account.userId !== userId) throw new ForbiddenException();
    return account;
  }
}
