/**
 * Pure P&L and risk:reward arithmetic.
 *
 * Everything here is Decimal end to end — no Number() conversions — because the
 * database stores money as Decimal(18,2) and prices as Decimal(18,5), and float
 * arithmetic with per-trade rounding drifts over a large trade history.
 *
 * Sign convention for costs: **a cost is a negative number.** That is what MT5
 * reports (DEAL_COMMISSION is negative when charged) and what this project's
 * database already contains. Net P&L therefore *adds* commission and swap.
 */

import { Decimal } from '@prisma/client/runtime/library';
import { getSymbolSpec, type SymbolSpec } from './symbol-spec';

export type DecimalLike = Decimal | number | string;

/** Money is stored as Decimal(18,2). */
const MONEY_DP = 2;
/** riskReward is stored as Decimal(10,4). */
const RR_DP = 4;

export interface PnlTrade {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: DecimalLike;
  exitPrice?: DecimalLike | null;
  lotSize: DecimalLike;
  /** Negative when charged. */
  commission?: DecimalLike | null;
  /** Negative when charged. */
  swap?: DecimalLike | null;
}

export interface RiskRewardTrade {
  direction: 'BUY' | 'SELL';
  entryPrice: DecimalLike;
  stopLoss?: DecimalLike | null;
  takeProfit?: DecimalLike | null;
  exitPrice?: DecimalLike | null;
}

export type PnlFailureReason =
  /** Symbol is not in the contract-specification table. */
  | 'UNKNOWN_SYMBOL'
  /** Trade has no exit price, so there is nothing to realise. */
  | 'NOT_CLOSED'
  /**
   * Gross P&L lands in a currency that is neither the account currency nor
   * convertible from the trade's own price — converting would need a third
   * exchange rate this service does not hold.
   */
  | 'NO_FX_RATE';

export type PnlResult =
  | { ok: true; gross: Decimal; net: Decimal; spec: SymbolSpec }
  | { ok: false; reason: PnlFailureReason; spec: SymbolSpec | null };

export function toDecimal(value: DecimalLike): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

function directionSign(direction: 'BUY' | 'SELL'): number {
  return direction === 'BUY' ? 1 : -1;
}

/**
 * Profit before costs, **in the instrument's quote currency**.
 *
 * A EURUSD move yields USD; a USDJPY move yields JPY. Converting to the account
 * currency is a separate step — see computePnl.
 */
export function grossPnl(trade: PnlTrade, spec: SymbolSpec): Decimal {
  const entry = toDecimal(trade.entryPrice);
  const exit = toDecimal(trade.exitPrice ?? trade.entryPrice);
  const lots = toDecimal(trade.lotSize);

  return exit
    .minus(entry)
    .times(directionSign(trade.direction))
    .times(lots)
    .times(spec.contractSize);
}

/**
 * Convert a quote-currency amount into the account currency.
 *
 * Exact in two cases and refused otherwise:
 *   - quote is already the account currency (EURUSD on a USD account) → unchanged
 *   - base is the account currency (USDJPY on a USD account) → divide by the
 *     trade's own price, which *is* the account/quote rate at that moment
 *
 * Anything else (EURJPY on a USD account, GER40 quoted in EUR on a USD account)
 * needs a rate we do not have. Returning null is deliberate: a plausible-looking
 * wrong figure is worse than none on a tool used to check real profitability.
 */
export function convertToAccountCurrency(
  amountInQuote: Decimal,
  spec: SymbolSpec,
  price: DecimalLike,
  accountCurrency: string,
): Decimal | null {
  const account = accountCurrency.trim().toUpperCase();

  if (spec.quote === account) return amountInQuote;

  if (spec.base === account) {
    const rate = toDecimal(price);
    if (rate.isZero() || rate.isNegative()) return null;
    return amountInQuote.dividedBy(rate);
  }

  return null;
}

/**
 * Profit after costs, in the account currency.
 *
 * Commission and swap are signed and already denominated in the account
 * currency, so they are added: a −7.00 commission reduces the result by 7.00.
 */
export function netPnl(trade: PnlTrade, spec: SymbolSpec, accountCurrency: string): Decimal | null {
  const gross = grossPnl(trade, spec);
  const converted = convertToAccountCurrency(
    gross,
    spec,
    trade.exitPrice ?? trade.entryPrice,
    accountCurrency,
  );
  if (converted === null) return null;

  const commission = toDecimal(trade.commission ?? 0);
  const swap = toDecimal(trade.swap ?? 0);

  return converted.plus(commission).plus(swap).toDecimalPlaces(MONEY_DP);
}

/**
 * Full calculation with a typed reason when it cannot be done.
 * This is what services call; grossPnl/netPnl are exposed for testing and reuse.
 */
export function computePnl(trade: PnlTrade, accountCurrency: string): PnlResult {
  const spec = getSymbolSpec(trade.symbol);
  if (!spec) return { ok: false, reason: 'UNKNOWN_SYMBOL', spec: null };

  if (trade.exitPrice == null) return { ok: false, reason: 'NOT_CLOSED', spec };

  const gross = grossPnl(trade, spec);
  const net = netPnl(trade, spec, accountCurrency);
  if (net === null) return { ok: false, reason: 'NO_FX_RATE', spec };

  return { ok: true, gross: gross.toDecimalPlaces(MONEY_DP), net, spec };
}

/**
 * Planned risk:reward — (entry→target) / (entry→stop).
 *
 * Precedence is `takeProfit ?? exitPrice`, deliberately: R:R is a property of
 * the *plan*, fixed at entry, so it must not change the moment a trade closes.
 * The realised outcome is a different metric (R-multiple) and is not this.
 *
 * Two implementations of this used to disagree — the write path preferred
 * takeProfit, analytics preferred exitPrice, so the same trade reported
 * different values depending on which surface you looked at. This is the single
 * implementation; do not add a second.
 *
 * Returns null when risk is not positive (no stop, or a stop on the wrong side
 * of entry). The result may be negative when falling back to exitPrice on a
 * losing trade; callers that only want planned ratios filter on `> 0`.
 */
export function computeRiskReward(trade: RiskRewardTrade): Decimal | null {
  if (trade.entryPrice == null || trade.stopLoss == null) return null;

  const target = trade.takeProfit ?? trade.exitPrice;
  if (target == null) return null;

  const entry = toDecimal(trade.entryPrice);
  const stop = toDecimal(trade.stopLoss);
  const goal = toDecimal(target);

  const risk = trade.direction === 'BUY' ? entry.minus(stop) : stop.minus(entry);
  if (risk.lessThanOrEqualTo(0)) return null;

  const reward = trade.direction === 'BUY' ? goal.minus(entry) : entry.minus(goal);

  return reward.dividedBy(risk).toDecimalPlaces(RR_DP);
}
