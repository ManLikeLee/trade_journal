import { z } from 'zod';

/**
 * A full ISO 8601 timestamp with an offset — `2026-08-01T00:00:00.000Z`.
 *
 * Shared by every router that accepts a date, so the wire format cannot drift
 * between endpoints. It lives here rather than in `trades.schema.ts` because
 * analytics needs it too, and a module importing another module's schema would
 * breach the `router → service → schema` boundary.
 *
 * Deliberately strict about the offset. A date-only value like `2026-08-01`
 * parses in JS but carries no timezone, so the same filter would mean different
 * instants for a trader in Tokyo and one in New York — on a product whose
 * analytics are already timezone-naive (M2), that ambiguity is not worth
 * accepting for a convenience nothing currently needs.
 *
 * To support a date-only form later — a date-range picker is likely with M15 —
 * widen this ONE definition, which updates every router at once. Do not add a
 * looser branch to a single endpoint.
 */
export const isoDate = () =>
  z.string().datetime({ offset: true, message: 'Must be a valid ISO 8601 date string' });
