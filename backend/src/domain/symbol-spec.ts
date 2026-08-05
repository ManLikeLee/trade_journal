/**
 * Instrument contract specifications.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS TABLE IS AN APPROXIMATION.
 *
 * Contract sizes, pip conventions and quote currencies vary between brokers, and
 * a broker may list the same instrument under several symbols with different
 * specifications. A production system reads these from the broker (MT5 exposes
 * them via SymbolInfoDouble/SYMBOL_TRADE_CONTRACT_SIZE) and stores them per
 * account rather than hardcoding a table.
 *
 * The values below cover the common retail FX/CFD conventions and are used only
 * to *estimate* P&L for trades entered by hand. Trades synced from an Expert
 * Advisor carry the broker's own realised P&L, which always takes precedence
 * (see domain/pnl.ts) — so this table never overrides real broker numbers.
 *
 * An unknown symbol returns null. It is never guessed: a wrong contract size is
 * silently wrong by orders of magnitude, which is worse than no estimate at all.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type InstrumentKind = 'FX' | 'METAL' | 'INDEX' | 'CRYPTO';

export interface SymbolSpec {
  /** Canonical symbol, e.g. 'EURUSD' — broker decorations stripped. */
  symbol: string;
  kind: InstrumentKind;
  /** Units of the base instrument in one standard (1.00) lot. */
  contractSize: number;
  /** Price increment of one pip. Informational; P&L uses raw price difference. */
  pipSize: number;
  /** Base instrument — the thing being bought or sold. */
  base: string;
  /** Currency the raw price difference is denominated in. */
  quote: string;
}

// ── FX ────────────────────────────────────────────────────────────────────────
// One standard lot is 100,000 units of the base currency across all retail FX.
// A pip is the 4th decimal place, except for JPY-quoted pairs where it is the 2nd.

const FX_PAIRS = [
  // Majors
  'EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'USDJPY',
  // EUR crosses
  'EURGBP', 'EURJPY', 'EURCHF', 'EURAUD', 'EURNZD', 'EURCAD',
  // GBP crosses
  'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPNZD', 'GBPCAD',
  // AUD / NZD / CAD / CHF crosses
  'AUDJPY', 'AUDCHF', 'AUDNZD', 'AUDCAD',
  'NZDJPY', 'NZDCHF', 'NZDCAD',
  'CADJPY', 'CADCHF', 'CHFJPY',
] as const;

function fxSpec(pair: string): SymbolSpec {
  const base = pair.slice(0, 3);
  const quote = pair.slice(3, 6);
  return {
    symbol: pair,
    kind: 'FX',
    contractSize: 100_000,
    pipSize: quote === 'JPY' ? 0.01 : 0.0001,
    base,
    quote,
  };
}

// ── Non-FX ────────────────────────────────────────────────────────────────────

const OTHER_SPECS: SymbolSpec[] = [
  // Metals — contract size is troy ounces per lot.
  { symbol: 'XAUUSD', kind: 'METAL', contractSize: 100,   pipSize: 0.01,  base: 'XAU', quote: 'USD' },
  { symbol: 'XAGUSD', kind: 'METAL', contractSize: 5_000, pipSize: 0.001, base: 'XAG', quote: 'USD' },

  // Index CFDs — one lot is one contract; P&L is one unit of quote currency per
  // index point. Quote currency is the index's home currency at most brokers,
  // though some list USD-denominated variants under the same name.
  { symbol: 'US30',   kind: 'INDEX', contractSize: 1, pipSize: 0.1, base: 'US30',   quote: 'USD' },
  { symbol: 'US100',  kind: 'INDEX', contractSize: 1, pipSize: 0.1, base: 'US100',  quote: 'USD' },
  { symbol: 'US500',  kind: 'INDEX', contractSize: 1, pipSize: 0.1, base: 'US500',  quote: 'USD' },
  { symbol: 'GER40',  kind: 'INDEX', contractSize: 1, pipSize: 0.1, base: 'GER40',  quote: 'EUR' },
  { symbol: 'UK100',  kind: 'INDEX', contractSize: 1, pipSize: 0.1, base: 'UK100',  quote: 'GBP' },
  { symbol: 'FRA40',  kind: 'INDEX', contractSize: 1, pipSize: 0.1, base: 'FRA40',  quote: 'EUR' },
  { symbol: 'EU50',   kind: 'INDEX', contractSize: 1, pipSize: 0.1, base: 'EU50',   quote: 'EUR' },
  { symbol: 'JP225',  kind: 'INDEX', contractSize: 1, pipSize: 1,   base: 'JP225',  quote: 'JPY' },
  { symbol: 'AUS200', kind: 'INDEX', contractSize: 1, pipSize: 1,   base: 'AUS200', quote: 'AUD' },

  // Crypto CFDs — one lot is one coin.
  { symbol: 'BTCUSD', kind: 'CRYPTO', contractSize: 1, pipSize: 0.01, base: 'BTC', quote: 'USD' },
  { symbol: 'ETHUSD', kind: 'CRYPTO', contractSize: 1, pipSize: 0.01, base: 'ETH', quote: 'USD' },
];

/** Broker names for the same instrument, mapped to the canonical symbol above. */
const ALIASES: Record<string, string> = {
  NAS100: 'US100', NDX100: 'US100', USTEC: 'US100', NAS: 'US100',
  SPX500: 'US500', SP500: 'US500', US500CASH: 'US500',
  DOW30: 'US30', DJ30: 'US30', WS30: 'US30',
  DAX40: 'GER40', DE40: 'GER40', GER30: 'GER40', DAX: 'GER40',
  UK100CASH: 'UK100', FTSE100: 'UK100',
  GOLD: 'XAUUSD', SILVER: 'XAGUSD',
  BITCOIN: 'BTCUSD', BTCUSDT: 'BTCUSD', ETHUSDT: 'ETHUSD',
};

const SPECS: ReadonlyMap<string, SymbolSpec> = new Map(
  [...FX_PAIRS.map(fxSpec), ...OTHER_SPECS].map((s) => [s.symbol, s]),
);

/** Trailing broker suffixes seen on otherwise-standard symbols (EURUSDm, XAUUSDc). */
const TRAILING_SUFFIXES = ['MICRO', 'PRO', 'ECN', 'RAW', 'STP', 'M', 'C', 'I', 'Z', 'S'];

/**
 * Reduce a broker symbol to its canonical form.
 * 'ger40.cash' -> 'GER40', 'EURUSD.pro' -> 'EURUSD', 'NAS100' -> 'US100'
 */
export function normaliseSymbol(raw: string): string {
  // Everything from the first decoration onwards is a broker suffix:
  // '.cash', '.pro', '_i', '#', '-ECN'
  let s = raw.trim().toUpperCase().split(/[._#\-/\s]/)[0] ?? '';

  if (SPECS.has(s)) return s;
  if (ALIASES[s]) return ALIASES[s];

  // Try stripping a trailing account-type suffix: 'EURUSDM' -> 'EURUSD'
  for (const suffix of TRAILING_SUFFIXES) {
    if (s.length > suffix.length && s.endsWith(suffix)) {
      const stripped = s.slice(0, -suffix.length);
      if (SPECS.has(stripped)) return stripped;
      if (ALIASES[stripped]) return ALIASES[stripped];
    }
  }

  return s;
}

/**
 * Contract specification for a symbol, or null when it is not in the table.
 * Callers must treat null as "cannot estimate" — never as a default.
 */
export function getSymbolSpec(raw: string): SymbolSpec | null {
  return SPECS.get(normaliseSymbol(raw)) ?? null;
}

/** Every known specification. Served by GET /api/symbol-specs for the UI preview. */
export function listSymbolSpecs(): SymbolSpec[] {
  return [...SPECS.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/**
 * The full lookup table as served to clients: specifications plus the alias and
 * suffix rules needed to resolve a broker symbol. Sent as data so the frontend
 * preview resolves symbols exactly as the backend does, rather than keeping a
 * second copy of the table that would drift.
 */
export function symbolSpecPayload() {
  return {
    specs: listSymbolSpecs(),
    aliases: ALIASES,
    trailingSuffixes: TRAILING_SUFFIXES,
  };
}
