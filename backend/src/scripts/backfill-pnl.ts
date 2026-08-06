/**
 * Backfill pnl and both risk:reward metrics for closed trades missing them.
 *
 * Targets: status = CLOSED, pnl IS NULL, exit_price IS NOT NULL.
 *
 * Only ever fills nulls — an existing pnl is never overwritten, so a broker's
 * realised figure cannot be replaced by a local estimate. That also makes the
 * script idempotent: a second run finds nothing left to do, because every row it
 * changed now has a non-null pnl, and every row it skipped is skipped again for
 * the same reason.
 *
 * Dry run is the DEFAULT. Pass --apply to write.
 *
 *   npx tsx src/scripts/backfill-pnl.ts                 # report only
 *   npx tsx src/scripts/backfill-pnl.ts --apply         # write
 *   npx tsx src/scripts/backfill-pnl.ts --batch-size=200 --limit=1000
 */

import { Prisma, TradeStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { computePnl, plannedRiskReward, realisedRiskReward, type PnlFailureReason } from '../domain/pnl';

interface Options {
  apply: boolean;
  batchSize: number;
  limit: number | null;
}

function parseArgs(argv: string[]): Options {
  const get = (name: string): string | undefined =>
    argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

  const batchSize = Number(get('batch-size') ?? 500);
  const limitRaw = get('limit');
  const limit = limitRaw === undefined ? null : Number(limitRaw);

  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5000) {
    throw new Error('--batch-size must be an integer between 1 and 5000');
  }
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }

  return { apply: argv.includes('--apply'), batchSize, limit };
}

const num = (v: Prisma.Decimal | null): number | null => (v == null ? null : v.toNumber());

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(72));
  console.log(`backfill-pnl  ${opts.apply ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`);
  console.log(`batch size ${opts.batchSize}${opts.limit ? `, limit ${opts.limit}` : ''}`);
  console.log('─'.repeat(72));

  const where: Prisma.TradeWhereInput = {
    status: TradeStatus.CLOSED,
    pnl: null,
    exitPrice: { not: null },
  };

  const total = await prisma.trade.count({ where });
  console.log(`candidate trades (CLOSED, pnl IS NULL, exit_price NOT NULL): ${total}\n`);

  if (total === 0) {
    console.log('Nothing to do.');
    return;
  }

  let cursor: string | undefined;
  let seen = 0;
  let updated = 0;
  const skipped: Record<PnlFailureReason, number> = {
    UNKNOWN_SYMBOL: 0,
    NO_FX_RATE: 0,
    NOT_CLOSED: 0,
  };
  const skippedSymbols = new Map<string, number>();
  const samples: string[] = [];

  for (;;) {
    const remaining = opts.limit === null ? opts.batchSize : Math.min(opts.batchSize, opts.limit - seen);
    if (remaining <= 0) break;

    const batch = await prisma.trade.findMany({
      where,
      include: { account: { select: { currency: true } } },
      orderBy: { id: 'asc' },
      take: remaining,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;
    seen += batch.length;

    for (const trade of batch) {
      const result = computePnl(
        {
          symbol: trade.symbol,
          direction: trade.direction === 'BUY' ? 'BUY' : 'SELL',
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          lotSize: trade.lotSize,
          commission: trade.commission,
          swap: trade.swap,
        },
        trade.account.currency,
      );

      if (!result.ok) {
        skipped[result.reason]++;
        skippedSymbols.set(trade.symbol, (skippedSymbols.get(trade.symbol) ?? 0) + 1);
        continue;
      }

      // Only fill a metric that is missing; never overwrite one already stored.
      const rrInput = {
        direction: trade.direction === 'BUY' ? ('BUY' as const) : ('SELL' as const),
        entryPrice: trade.entryPrice,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        exitPrice: trade.exitPrice,
      };
      const planned = num(trade.plannedRiskReward) != null ? null : plannedRiskReward(rrInput);
      const realised = num(trade.realisedRiskReward) != null ? null : realisedRiskReward(rrInput);

      if (samples.length < 10) {
        samples.push(
          `  ${trade.symbol.padEnd(12)} ${trade.direction.padEnd(4)} ` +
            `${String(trade.lotSize).padStart(7)} lots  ` +
            `${String(trade.entryPrice)}→${String(trade.exitPrice)}  ` +
            `pnl NULL → ${result.net.toFixed(2)} ${trade.account.currency}` +
            (planned ? `  planned rr → ${planned.toFixed(4)}` : '') +
            (realised ? `  realised rr → ${realised.toFixed(4)}` : ''),
        );
      }

      if (opts.apply) {
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            pnl: result.net,
            ...(planned ? { plannedRiskReward: planned } : {}),
            ...(realised ? { realisedRiskReward: realised } : {}),
          },
        });
      }
      updated++;
    }

    console.log(`  processed ${seen}/${opts.limit ?? total}…`);
  }

  console.log('\nsample of changes:');
  console.log(samples.length ? samples.join('\n') : '  (none)');

  console.log('\n' + '─'.repeat(72));
  console.log(`examined : ${seen}`);
  console.log(`${opts.apply ? 'updated  ' : 'would update'}: ${updated}`);
  console.log(`skipped  : ${seen - updated}`);
  for (const [reason, count] of Object.entries(skipped)) {
    if (count > 0) console.log(`   ${reason}: ${count}`);
  }
  if (skippedSymbols.size) {
    console.log('   symbols skipped:');
    for (const [symbol, count] of [...skippedSymbols].sort((a, b) => b[1] - a[1])) {
      console.log(`     ${symbol} × ${count}`);
    }
  }
  console.log('─'.repeat(72));

  if (!opts.apply && updated > 0) {
    console.log('\nDry run — nothing was written. Re-run with --apply to commit these changes.');
  }
}

main()
  .catch((err) => {
    console.error('backfill-pnl failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
