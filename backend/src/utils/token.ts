import crypto from 'crypto';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OPAQUE TOKEN GENERATION AND HASHING
 *
 * WHY SHA-256 AND NOT BCRYPT — this looks wrong at a glance, so read this first.
 *
 * bcrypt is deliberately slow to defend *low-entropy human passwords* against
 * offline brute force. These are not passwords. They are 256-bit values from a
 * CSPRNG, and there is no dictionary, no reuse across sites, and no plausible
 * offline search: an attacker with the hash would need ~2^255 operations, which
 * no work factor improves upon.
 *
 * What bcrypt *would* add is ~250 ms of CPU to **every authenticated EA
 * request**. The MT5 EA syncs every 10 seconds, so that is a permanent load on
 * a single-threaded event loop, in exchange for defending against an attack
 * that entropy has already made impossible. It would also make the lookup
 * unindexable — bcrypt salts each hash, so you cannot query by it; you would
 * have to scan every row and compare one at a time, which is precisely the
 * sequential scan this change exists to remove.
 *
 * SHA-256 is deterministic, so the hash can carry a unique index and the lookup
 * is a single index probe.
 *
 * The rule this follows: hash *high-entropy random tokens* with a fast digest,
 * hash *passwords* with a slow KDF. Passwords in this codebase still use bcrypt
 * at cost 12 (auth.service.ts), which is correct and must stay.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * A new opaque token: 32 random bytes, base64url-encoded (43 chars, 256 bits).
 *
 * Replaces crypto.randomUUID(), which carries only 122 bits — fine in practice,
 * but there is no reason to accept half the entropy for the same storage.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * SHA-256 of a token, hex-encoded. Deterministic by design: the same input
 * always yields the same digest, which is what makes an indexed lookup possible.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Last 4 characters of a raw token, stored for display.
 *
 * Not derivable from the hash, so it has to be persisted separately. Revealing
 * 4 of 43 characters leaves ~232 bits unknown; it exists so a user can tell two
 * keys apart in the UI.
 */
export function tokenLast4(rawToken: string): string {
  return rawToken.slice(-4);
}
