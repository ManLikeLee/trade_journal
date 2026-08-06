import { Decimal } from '@prisma/client/runtime/library';
import type { Account } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import type { CreateAccountInput, UpdateAccountInput } from './accounts.schema';
import { generateToken, hashToken, tokenLast4 } from '../../utils/token';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * API KEY EXPOSURE POLICY
 *
 * `accounts.api_key` grants write access to the user's entire trade ledger. It
 * is returned in exactly two responses — the create and the regenerate calls,
 * which are the moments the user asked for it. Every other response carries a
 * mask (`hasApiKey`, `apiKeyLast4`) instead.
 *
 * It previously came back from `GET /api/accounts` for every account, and from
 * `GET /api/trades/:id` via `include: { account: true }` — so fetching a single
 * trade leaked the credential.
 *
 * Enforced by types, not by discipline: every function here returns
 * `PublicAccount`, which has no `apiKey` field. Only `createAccount` and
 * `regenerateApiKey` return `AccountWithSecret`. Do not widen those.
 *
 * The key is still stored in plaintext at rest — hashing it is task C9.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface PublicAccount {
  id: string;
  userId: string;
  name: string;
  broker: string;
  platform: string | null;
  accountNumber: string | null;
  currency: string;
  initialBalance: Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Whether a key exists, without revealing it. */
  hasApiKey: boolean;
  /** Last 4 characters, enough to tell two keys apart. Null when none exists. */
  apiKeyLast4: string | null;
}

/** Only ever returned by createAccount and regenerateApiKey. */
export interface AccountWithSecret extends PublicAccount {
  apiKey: string | null;
}

/**
 * Strips the key material and exposes only the mask. The single exit point for
 * an account row.
 *
 * `apiKeyLast4` is now read from its own column rather than sliced off the raw
 * key: the raw key is no longer stored, so it cannot be derived here.
 */
function toPublicAccount(account: Account): PublicAccount {
  const { apiKeyHash: _apiKeyHash, apiKeyLast4, ...rest } = account;
  return {
    ...rest,
    hasApiKey: Boolean(account.apiKeyHash),
    apiKeyLast4: apiKeyLast4 ?? null,
  };
}

/**
 * Reveal-once shape: the mask plus the raw key, which exists only in memory for
 * the duration of the create/regenerate response and is never persisted.
 */
function toAccountWithSecret(account: Account, rawApiKey: string | null): AccountWithSecret {
  return { ...toPublicAccount(account), apiKey: rawApiKey };
}

export async function listAccounts(userId: string): Promise<PublicAccount[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return accounts.map(toPublicAccount);
}

export async function createAccount(
  userId: string,
  input: CreateAccountInput,
): Promise<AccountWithSecret> {
  const name = input.name.trim();
  const broker = input.broker.trim();

  // Upsert by name (case-insensitive) for recovery-friendly behavior
  const existing = await prisma.account.findFirst({
    where: { userId, name: { equals: name, mode: 'insensitive' } },
  });

  if (existing) {
    // An existing account keeps its key. The raw value is not recoverable from
    // the stored hash, so a fresh one is issued when none was set.
    const rawApiKey = existing.apiKeyHash ? null : generateToken();
    const updated = await prisma.account.update({
      where: { id: existing.id },
      data: {
        broker,
        platform: input.platform ?? existing.platform,
        accountNumber: input.accountNumber ?? existing.accountNumber,
        currency: input.currency ?? existing.currency,
        initialBalance: new Decimal(input.initialBalance ?? Number(existing.initialBalance)),
        isActive: true,
        ...(rawApiKey
          ? { apiKeyHash: hashToken(rawApiKey), apiKeyLast4: tokenLast4(rawApiKey) }
          : {}),
      },
    });
    // null when the account already had a key: it cannot be re-revealed.
    return toAccountWithSecret(updated, rawApiKey);
  }

  const rawApiKey = generateToken();
  const created = await prisma.account.create({
    data: {
      userId,
      name,
      broker,
      platform: input.platform,
      accountNumber: input.accountNumber,
      currency: input.currency ?? 'USD',
      initialBalance: new Decimal(input.initialBalance ?? 0),
      apiKeyHash: hashToken(rawApiKey),
      apiKeyLast4: tokenLast4(rawApiKey),
    },
  });
  return toAccountWithSecret(created, rawApiKey);
}

export async function getAccount(userId: string, id: string): Promise<PublicAccount> {
  return toPublicAccount(await assertOwner(userId, id));
}

export async function updateAccount(
  userId: string,
  id: string,
  input: UpdateAccountInput,
): Promise<PublicAccount> {
  await assertOwner(userId, id);
  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...input,
      initialBalance: input.initialBalance !== undefined ? new Decimal(input.initialBalance) : undefined,
    },
  });
  return toPublicAccount(updated);
}

export async function deleteAccount(userId: string, id: string): Promise<void> {
  await assertOwner(userId, id);
  await prisma.account.delete({ where: { id } });
}

/**
 * Rotates the key and returns it. One of only two responses that carry the raw
 * key — the user explicitly asked for a new one, and this is their sole chance
 * to copy it.
 */
export async function regenerateApiKey(userId: string, id: string): Promise<AccountWithSecret> {
  await assertOwner(userId, id);
  const rawApiKey = generateToken();
  const updated = await prisma.account.update({
    where: { id },
    data: { apiKeyHash: hashToken(rawApiKey), apiKeyLast4: tokenLast4(rawApiKey) },
  });
  return toAccountWithSecret(updated, rawApiKey);
}

async function assertOwner(userId: string, id: string) {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) throw new NotFoundError('Account not found');
  if (account.userId !== userId) throw new ForbiddenError();
  return account;
}
