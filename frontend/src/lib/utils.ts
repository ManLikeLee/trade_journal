import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDuration, intervalToDuration } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
}

export function formatPnl(value: number) {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function formatTradeDuration(open: string | Date, close?: string | Date | null) {
  if (!close) return '—';
  const dur = intervalToDuration({ start: new Date(open), end: new Date(close) });
  const parts: string[] = [];
  if (dur.days) parts.push(`${dur.days}d`);
  if (dur.hours) parts.push(`${dur.hours}h`);
  if (dur.minutes) parts.push(`${dur.minutes}m`);
  return parts.join(' ') || '<1m';
}

/**
 * Convert an `<input type="datetime-local">` value into a full ISO 8601 timestamp.
 *
 * The input produces offset-less strings like `2026-08-04T16:14`, but the API validates
 * these with `z.string().datetime({ offset: true })` and rejects anything without an
 * offset. The value is interpreted in the browser's local timezone — which is what the
 * user actually typed — and serialised as UTC (`…Z`), a valid ISO 8601 offset form.
 *
 * Returns undefined for blank or unparseable input, so the caller can omit the field.
 */
export function datetimeLocalToIso(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
}

/**
 * Inverse of `datetimeLocalToIso` — render an ISO 8601 timestamp as a local-time value
 * an `<input type="datetime-local">` can display.
 *
 * Formatting uses local getters rather than `toISOString()`, which would show UTC and
 * shift the displayed time for every user outside it.
 *
 * Output is deliberately truncated to whole minutes. `datetime-local` defaults to
 * `step="60"`, so a value carrying seconds is a step mismatch: the browser marks the
 * input invalid and silently refuses to fire submit. Emitting seconds would require
 * `step="1"` on every such input, now and on every one added later. Minute precision is
 * valid under any step, at the cost of dropping sub-minute precision when an existing
 * timestamp is loaded into a form for editing.
 *
 * Returns an empty string for blank or unparseable input.
 */
export function isoToDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function pnlClass(value: number) {
  return value >= 0 ? 'text-profit' : 'text-loss';
}

export function pnlBgClass(value: number) {
  return value >= 0 ? 'bg-profit' : 'bg-loss';
}

export function directionColor(direction: 'BUY' | 'SELL') {
  return direction === 'BUY' ? 'text-profit' : 'text-loss';
}
