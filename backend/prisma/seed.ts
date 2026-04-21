import { PrismaClient, TradeDirection, TradeStatus, TradeSource } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'NASDAQ', 'GBPJPY'];
const EMOTIONS = ['CONFIDENT', 'NEUTRAL', 'FOMO', 'DISCIPLINED', 'FEARFUL', 'GREEDY'];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 Seeding database...');

  const reset = process.env.SEED_RESET === 'true';
  if (reset) {
    // Destructive reset is now explicit to avoid accidental data loss.
    await prisma.tradeTag.deleteMany();
    await prisma.tradeNote.deleteMany();
    await prisma.trade.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    console.log('⚠️  SEED_RESET=true: existing data was cleared');
  }

  // Create/update demo user
  const passwordHash = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@tradejournal.app' },
    update: {
      passwordHash,
      name: 'Demo Trader',
      timezone: 'UTC',
    },
    create: {
      email: 'demo@tradejournal.app',
      passwordHash,
      name: 'Demo Trader',
      timezone: 'UTC',
    },
  });
  console.log(`✅ Demo user ready: ${user.email}`);

  // Ensure baseline demo account exists without duplicating
  let account = await prisma.account.findFirst({
    where: { userId: user.id, name: { equals: 'Main Account', mode: 'insensitive' } },
  });
  if (!account) {
    account = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Main Account',
        broker: 'IC Markets',
        accountNumber: '12345678',
        currency: 'USD',
        initialBalance: new Decimal(10000),
        apiKey: 'demo-api-key-' + Date.now(),
      },
    });
    console.log(`✅ Created account: ${account.name}`);
  } else {
    console.log(`✅ Existing account kept: ${account.name}`);
  }

  // Create tags
  const tagData = [
    { name: 'Trend',      color: '#6366f1' },
    { name: 'Breakout',   color: '#10b981' },
    { name: 'Reversal',   color: '#f59e0b' },
    { name: 'News',       color: '#ef4444' },
    { name: 'Scalp',      color: '#8b5cf6' },
    { name: 'Swing',      color: '#06b6d4' },
  ];
  const tags = await Promise.all(
    tagData.map(t => prisma.tag.upsert({
      where: { userId_name: { userId: user.id, name: t.name } },
      update: { color: t.color },
      create: { userId: user.id, ...t },
    }))
  );
  console.log(`✅ Ensured ${tags.length} tags`);

  // Keep existing user data unless explicit reset was requested.
  if (!reset) {
    console.log('ℹ️  Existing trades/accounts were preserved (set SEED_RESET=true to wipe)');
    return;
  }

  // Generate 90 days of trades
  const trades = [];
  const now = new Date();

  for (let i = 89; i >= 0; i--) {
    const dayTradeCount = Math.floor(randomBetween(0, 4));
    for (let j = 0; j < dayTradeCount; j++) {
      const openDate = new Date(now);
      openDate.setDate(openDate.getDate() - i);
      openDate.setHours(Math.floor(randomBetween(7, 18)), Math.floor(randomBetween(0, 59)), 0, 0);

      const symbol = randomFrom(SYMBOLS);
      const direction = Math.random() > 0.5 ? TradeDirection.BUY : TradeDirection.SELL;
      const lotSize = parseFloat(randomBetween(0.01, 0.5).toFixed(2));

      const basePrice = symbol === 'XAUUSD' ? 2000 : symbol === 'USDJPY' ? 150 : symbol === 'NASDAQ' ? 17000 : 1.1;
      const spread = basePrice * 0.0002;
      const entryPrice = parseFloat((basePrice + randomBetween(-0.005, 0.005) * basePrice).toFixed(5));
      const slPips = randomBetween(10, 50) * 0.0001;
      const tpPips = slPips * randomBetween(1, 3);

      const stopLoss   = parseFloat((direction === 'BUY' ? entryPrice - slPips : entryPrice + slPips).toFixed(5));
      const takeProfit = parseFloat((direction === 'BUY' ? entryPrice + tpPips : entryPrice - tpPips).toFixed(5));

      const holdMinutes = randomBetween(5, 480);
      const closeDate = new Date(openDate.getTime() + holdMinutes * 60000);

      // 58% win rate
      const isWin = Math.random() < 0.58;
      const exitPrice = isWin
        ? parseFloat((direction === 'BUY' ? entryPrice + tpPips * 0.85 : entryPrice - tpPips * 0.85).toFixed(5))
        : parseFloat((direction === 'BUY' ? entryPrice - slPips * 0.9 : entryPrice + slPips * 0.9).toFixed(5));

      const commission = parseFloat((lotSize * 7).toFixed(2));
      const swap = parseFloat((Math.random() > 0.7 ? randomBetween(-2, 2) : 0).toFixed(2));

      const pipValue = lotSize * 10;
      const priceDiff = direction === 'BUY'
        ? exitPrice - entryPrice
        : entryPrice - exitPrice;
      const gross = priceDiff * pipValue * 10000;
      const pnl = parseFloat((gross - commission - swap).toFixed(2));

      const risk   = Math.abs(entryPrice - stopLoss);
      const reward = Math.abs(takeProfit - entryPrice);
      const rr = parseFloat((reward / risk).toFixed(4));

      const trade = await prisma.trade.create({
        data: {
          accountId: account.id,
          symbol,
          direction,
          lotSize: new Decimal(lotSize),
          entryPrice: new Decimal(entryPrice),
          exitPrice: new Decimal(exitPrice),
          stopLoss: new Decimal(stopLoss),
          takeProfit: new Decimal(takeProfit),
          openTime: openDate,
          closeTime: closeDate,
          commission: new Decimal(commission),
          swap: new Decimal(swap),
          pnl: new Decimal(pnl),
          riskReward: new Decimal(rr),
          status: TradeStatus.CLOSED,
          source: TradeSource.MANUAL,
        },
      });

      // Add notes to ~40% of trades
      if (Math.random() < 0.4) {
        const emotion = randomFrom(EMOTIONS);
        await prisma.tradeNote.create({
          data: {
            tradeId: trade.id,
            emotion: emotion as any,
            content: getNoteContent(emotion, isWin, symbol),
          },
        });
      }

      // Add tags to ~50% of trades
      if (Math.random() < 0.5) {
        const tag = randomFrom(tags);
        await prisma.tradeTag.create({
          data: { tradeId: trade.id, tagId: tag.id },
        });
      }

      trades.push(trade);
    }
  }

  console.log(`✅ Created ${trades.length} trades over 90 days`);
  console.log('\n🎉 Seed complete!');
  console.log('   Email:    demo@tradejournal.app');
  console.log('   Password: password123');
}

function getNoteContent(emotion: string, isWin: boolean, symbol: string): string {
  const notes: Record<string, string[]> = {
    CONFIDENT: [
      `Clear ${symbol} setup, all confluences aligned. Entered with conviction.`,
      'Setup was exactly what I was looking for. Executed well.',
      'High probability trade based on structure and momentum.',
    ],
    NEUTRAL: [
      'Standard trade following my plan. No emotional interference.',
      'Mechanical entry based on my rules. Result is what it is.',
      'Followed the checklist. No issues with execution.',
    ],
    FOMO: [
      'Chased the move after missing the initial entry. Bad habit.',
      'Saw others posting profits and jumped in late. Need to be more patient.',
      'Entered because I felt left out. This is not part of my strategy.',
    ],
    DISCIPLINED: [
      'Waited for my exact entry. Did not deviate from the plan.',
      'Respected my stop loss even when it was uncomfortable.',
      'Sized correctly per my risk rules. No exceptions.',
    ],
    FEARFUL: [
      'Moved stop loss closer out of fear. Cost me the trade.',
      'Closed early due to anxiety, missed the full move.',
      'Second-guessed the setup after entering. Need to trust my analysis.',
    ],
    GREEDY: [
      'Moved take profit further and it reversed. Lesson learned.',
      'Added to the position when I should not have.',
      'Did not respect the original TP. Gave back gains.',
    ],
  };

  const pool = notes[emotion] ?? notes.NEUTRAL;
  return randomFrom(pool);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
