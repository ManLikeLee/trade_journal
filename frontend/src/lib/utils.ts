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

export function pnlClass(value: number) {
  return value >= 0 ? 'text-profit' : 'text-loss';
}

export function pnlBgClass(value: number) {
  return value >= 0 ? 'bg-profit' : 'bg-loss';
}

export function directionColor(direction: 'BUY' | 'SELL') {
  return direction === 'BUY' ? 'text-profit' : 'text-loss';
}
