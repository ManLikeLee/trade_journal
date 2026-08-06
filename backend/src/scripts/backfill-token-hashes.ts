/**
 * One-time backfill: populate refresh_token_hash, api_key_hash and
 * api_key_last4 from the raw columns they replaced.
 *
 * This is what made C9 non-breaking. The hash of an unchanged raw value is the
 * same value it always would have been, so:
 *
 *   - Every API key already configured in a running Expert Advisor keeps
 *     working. Nothing has to be re-copied into MT5.
 *   - Every browser session stays signed in. The refresh cookie still holds the
 *     same raw token; only the server's way of finding it changed.
 *
 * Deliberately written against raw SQL rather than the Prisma client: the
 * columns it reads no longer exist in the schema, so a typed query would not
 * compile. It remains here because migration 20260806010000 refuses to drop
 * those columns until this has run — anyone restoring a pre-C9 backup needs it.
 *
 * On an already-migrated database it detects the missing columns and exits.
 * Idempotent, and dry run by DEFAULT — pass --apply to write.
 *
 *   npx tsx src/scripts/backfill-token-hashes.ts
 *   npx tsx src/scripts/backfill-token-hashes.ts --apply
 */

import { prisma } from '../utils/prisma';
import { hashToken, tokenLast4 } from '../utils/token';

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT count(*) AS n FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}`;
  return Number(rows[0]?.n ?? 0) > 0;
}

async function main() {
  const apply = process.argv.includes('--apply');

  console.log('─'.repeat(68));
  console.log(`backfill-token-hashes  ${apply ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`);
  console.log('─'.repeat(68));

  const hasRawSession = await columnExists('sessions', 'refresh_token');
  const hasRawAccount = await columnExists('accounts', 'api_key');

  if (!hasRawSession && !hasRawAccount) {
    console.log('\nRaw token columns are already gone — this database is fully migrated.');
    console.log('Nothing to do.');
    return;
  }

  let sessionsDone = 0;
  if (hasRawSession) {
    const rows = await prisma.$queryRaw<Array<{ id: string; refresh_token: string }>>`
      SELECT id, refresh_token FROM sessions
      WHERE refresh_token IS NOT NULL AND refresh_token_hash IS NULL`;
    console.log(`\nsessions needing a hash: ${rows.length}`);
    for (const row of rows) {
      if (apply) {
        await prisma.$executeRaw`
          UPDATE sessions SET refresh_token_hash = ${hashToken(row.refresh_token)}
          WHERE id = ${row.id}`;
      }
      sessionsDone++;
    }
    console.log(`  ${apply ? 'hashed' : 'would hash'}: ${sessionsDone}`);
  }

  let accountsDone = 0;
  if (hasRawAccount) {
    const rows = await prisma.$queryRaw<Array<{ id: string; name: string; api_key: string }>>`
      SELECT id, name, api_key FROM accounts
      WHERE api_key IS NOT NULL AND api_key_hash IS NULL`;
    console.log(`\naccounts needing a hash: ${rows.length}`);
    for (const row of rows) {
      if (apply) {
        await prisma.$executeRaw`
          UPDATE accounts
          SET api_key_hash = ${hashToken(row.api_key)}, api_key_last4 = ${tokenLast4(row.api_key)}
          WHERE id = ${row.id}`;
      }
      console.log(`  ${row.name}: …${tokenLast4(row.api_key)}`);
      accountsDone++;
    }
    console.log(`  ${apply ? 'hashed' : 'would hash'}: ${accountsDone}`);
  }

  console.log('\n' + '─'.repeat(68));
  console.log(`sessions: ${sessionsDone}   accounts: ${accountsDone}`);
  if (!apply && sessionsDone + accountsDone > 0) {
    console.log('\nDry run — nothing written. Re-run with --apply.');
  }
  console.log('─'.repeat(68));
}

main()
  .catch((err) => {
    console.error('backfill-token-hashes failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
