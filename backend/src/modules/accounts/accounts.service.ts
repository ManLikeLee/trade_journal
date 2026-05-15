import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../utils/prisma';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import type { CreateAccountInput, UpdateAccountInput } from './accounts.schema';

export function listAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createAccount(userId: string, input: CreateAccountInput) {
  const name = input.name.trim();
  const broker = input.broker.trim();

  // Upsert by name (case-insensitive) for recovery-friendly behavior
  const existing = await prisma.account.findFirst({
    where: { userId, name: { equals: name, mode: 'insensitive' } },
  });

  if (existing) {
    return prisma.account.update({
      where: { id: existing.id },
      data: {
        broker,
        platform: input.platform ?? existing.platform,
        accountNumber: input.accountNumber ?? existing.accountNumber,
        currency: input.currency ?? existing.currency,
        initialBalance: new Decimal(input.initialBalance ?? Number(existing.initialBalance)),
        isActive: true,
        apiKey: existing.apiKey ?? crypto.randomUUID(),
      },
    });
  }

  return prisma.account.create({
    data: {
      userId,
      name,
      broker,
      platform: input.platform,
      accountNumber: input.accountNumber,
      currency: input.currency ?? 'USD',
      initialBalance: new Decimal(input.initialBalance ?? 0),
      apiKey: crypto.randomUUID(),
    },
  });
}

export async function getAccount(userId: string, id: string) {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) throw new NotFoundError('Account not found');
  if (account.userId !== userId) throw new ForbiddenError();
  return account;
}

export async function updateAccount(userId: string, id: string, input: UpdateAccountInput) {
  await assertOwner(userId, id);
  return prisma.account.update({
    where: { id },
    data: {
      ...input,
      initialBalance: input.initialBalance !== undefined ? new Decimal(input.initialBalance) : undefined,
    },
  });
}

export async function deleteAccount(userId: string, id: string) {
  await assertOwner(userId, id);
  return prisma.account.delete({ where: { id } });
}

export async function regenerateApiKey(userId: string, id: string) {
  await assertOwner(userId, id);
  return prisma.account.update({
    where: { id },
    data: { apiKey: crypto.randomUUID() },
    select: { id: true, apiKey: true },
  });
}

async function assertOwner(userId: string, id: string) {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) throw new NotFoundError('Account not found');
  if (account.userId !== userId) throw new ForbiddenError();
  return account;
}
