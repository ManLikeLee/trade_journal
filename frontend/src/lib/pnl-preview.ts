/**
 * Live P&L preview for the trade forms.
 *
 * The contract-specification *data* comes from the backend
 * (GET /api/symbol-specs), so there is no second copy of the table to drift.
 * Only the formula is repeated here, and only so the preview updates as you type
 * without a request per keystroke.
 *
 * This is an estimate for display. The figure that gets stored is always the one
 * the backend computes on write — see backend/src/domain/pnl.ts, which is the
 * authority and uses Decimal arithmetic rather than the JS numbers used here.
 */

export type InstrumentKind = 'FX' | 'METAL' | 'INDEX' | 'CRYPTO';

export interface SymbolSpec {
  symbol: string;
  kind: InstrumentKind;
  contractSize: number;
  pipSize: number;
  base: string;
  quote: string;
}

export interface SymbolSpecPayload {
  specs: SymbolSpec[];
  aliases: Record<string, string>;
  trailingSuffixes: string[];
}

export type PreviewFailure =
  | 'INCOMPLETE'      // not enough input yet — show nothing, not an error
  | 'UNKNOWN_SYMBOL'
  | 'NO_FX_RATE';

export type PreviewResult =
  | { ok: true; gross: number; net: number; spec: SymbolSpec }
  | { ok: false; reason: PreviewFailure };

export interface PreviewInput {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number | string | null | undefined;
  exitPrice: number | string | null | undefined;
  lotSize: number | string | null | undefined;
  /** Negative when charged, matching the backend and MT5. */
  commission?: number | string | null;
  swap?: number | string | null;
}

function toNum(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Mirrors normaliseSymbol in backend/src/domain/symbol-spec.ts. */
export function resolveSpec(raw: string, payload: SymbolSpecPayload | undefined): SymbolSpec | null {
  if (!payload || !raw) return null;

  const byName = new Map(payload.specs.map((s) => [s.symbol, s]));
  const base = raw.trim().toUpperCase().split(/[._#\-/\s]/)[0] ?? '';

  const direct = byName.get(base) ?? byName.get(payload.aliases[base] ?? '');
  if (direct) return direct;

  for (const suffix of payload.trailingSuffixes) {
    if (base.length > suffix.length && base.endsWith(suffix)) {
      const stripped = base.slice(0, -suffix.length);
      const hit = byName.get(stripped) ?? byName.get(payload.aliases[stripped] ?? '');
      if (hit) return hit;
    }
  }

  return null;
}

export function previewPnl(
  input: PreviewInput,
  payload: SymbolSpecPayload | undefined,
  accountCurrency: string | undefined,
): PreviewResult {
  const entry = toNum(input.entryPrice);
  const exit = toNum(input.exitPrice);
  const lots = toNum(input.lotSize);

  if (entry === null || exit === null || lots === null || !input.symbol) {
    return { ok: false, reason: 'INCOMPLETE' };
  }

  const spec = resolveSpec(input.symbol, payload);
  if (!spec) return { ok: false, reason: 'UNKNOWN_SYMBOL' };

  const sign = input.direction === 'BUY' ? 1 : -1;
  const gross = (exit - entry) * sign * lots * spec.contractSize;

  const account = (accountCurrency ?? 'USD').trim().toUpperCase();
  let converted: number;
  if (spec.quote === account) {
    converted = gross;
  } else if (spec.base === account && exit > 0) {
    converted = gross / exit;
  } else {
    return { ok: false, reason: 'NO_FX_RATE' };
  }

  const net = converted + (toNum(input.commission) ?? 0) + (toNum(input.swap) ?? 0);

  return { ok: true, gross, net: Math.round(net * 100) / 100, spec };
}
