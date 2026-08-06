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
 * ─────────────────────────────────────────────────────────────────────────────
 * RISK:REWARD — TWO METRICS, NOT ONE FIELD
 *
 * There used to be a single `riskReward` resolved with `takeProfit ?? exitPrice`
 * on the write path and `exitPrice ?? takeProfit` on the read path, so the same
 * trade reported different values depending on which surface observed it.
 *
 * Picking one precedence does not fix that, it only hides it: under EITHER
 * ordering the column silently means different things per row. With
 * `takeProfit` first, a trade with a target reports the plan while one without
 * reports the outcome. With `exitPrice` first, a closed trade reports the
 * outcome while an open one reports the plan. One column, two metrics, no way
 * for a caller to tell which it is holding.
 *
 * So they are two named fields. Each is null when its inputs are absent, and
 * neither ever falls back to the other:
 *
 *   plannedRiskReward   (entry→takeProfit) / (entry→stopLoss)
 *                       Fixed when the trade is opened. Null without a target.
 *                       This is what a trader means by "I take 1:3 setups".
 *
 *   realisedRiskReward  (entry→exitPrice) / (entry→stopLoss)
 *                       What actually happened, in units of the risk taken.
 *                       Null while the trade is open. Negative on a loss.
 *
 * Both require a stop: without one there is no risk denominator, and a ratio
 * against an unknown risk is meaningless rather than infinite.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function riskDistance(trade: RiskRewardTrade): Decimal | null {
  if (trade.entryPrice == null || trade.stopLoss == null) return null;
  const entry = toDecimal(trade.entryPrice);
  const stop = toDecimal(trade.stopLoss);
  const risk = trade.direction === 'BUY' ? entry.minus(stop) : stop.minus(entry);
  // A stop on the wrong side of entry is not a risk of zero, it is nonsense.
  return risk.lessThanOrEqualTo(0) ? null : risk;
}

function ratioAgainstRisk(trade: RiskRewardTrade, target: DecimalLike): Decimal | null {
  const risk = riskDistance(trade);
  if (risk === null) return null;

  const entry = toDecimal(trade.entryPrice);
  const goal = toDecimal(target);
  const reward = trade.direction === 'BUY' ? goal.minus(entry) : entry.minus(goal);

  return reward.dividedBy(risk).toDecimalPlaces(RR_DP);
}

/** Planned R:R, fixed at entry. Null without both a stop and a target. */
export function plannedRiskReward(trade: RiskRewardTrade): Decimal | null {
  if (trade.takeProfit == null) return null;
  return ratioAgainstRisk(trade, trade.takeProfit);
}

/** Realised R:R — the outcome in units of risk taken. Null while open. */
export function realisedRiskReward(trade: RiskRewardTrade): Decimal | null {
  if (trade.exitPrice == null) return null;
  return ratioAgainstRisk(trade, trade.exitPrice);
}
