import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError } from '../../utils/errors';
import type { RegisterInput, LoginInput } from './auth.schema';
import { generateToken, hashToken } from '../../utils/token';

// Deliberately expensive: ~250 ms per hash. Do not lower it — the denial-of-
// service that cost enables is mitigated by rate limiting (middleware/rateLimit.ts),
// not by making password cracking cheaper.
const SALT_ROUNDS = 12;
const REFRESH_TTL_DAYS = 30;

/**
 * A real bcrypt hash at the same cost, compared against when no user matches, so
 * that a failed login takes the same time whether or not the email exists.
 * Computed once at startup (~250 ms) rather than hardcoded, so it stays in step
 * with SALT_ROUNDS. It is not a credential: nothing can authenticate against it.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('login-timing-equaliser', SALT_ROUNDS);

export async function register(input: RegisterInput) {
  const exists = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true }, // existence check only — do not fetch the password hash
  });
  if (exists) throw new ConflictError('Email already in use');

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
    },
    select: { id: true, email: true, name: true },
  });

  return { ...(await issueTokens(user.id, { email: user.email })), user };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  // Both branches must perform one bcrypt comparison.
  //
  // Returning early on an unknown email skipped bcrypt entirely, so "no such
  // user" answered in ~1 ms while "wrong password" took ~250 ms. That gap is
  // trivially measurable and turns the login endpoint into an oracle for which
  // email addresses hold accounts. Comparing against a dummy hash of the same
  // cost keeps the two paths indistinguishable in time.
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !valid) throw new UnauthorizedError('Invalid credentials');

  return { ...(await issueTokens(user.id, { email: user.email })), user };
}

/**
 * Rotate a refresh token.
 *
 * Returns the user alongside the tokens so a page reload — which has no access
 * token, because it is now held in memory only — can restore the session in one
 * round trip instead of refresh-then-fetch-profile.
 */
export async function refresh(rawToken: string) {
  const session = await prisma.session.findUnique({
    // Looked up by hash: the raw token is never stored, so it cannot be read
    // back out of a database dump.
    where: { refreshTokenHash: hashToken(rawToken) },
    // Only the email is used below. `include: { user: true }` pulled the whole
    // user row, password hash included, on every token refresh.
    select: { id: true, userId: true, expiresAt: true, user: { select: { email: true } } },
  });
  if (!session || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired or invalid');
  }
  // Rotate: delete old, issue new
  await prisma.session.delete({ where: { id: session.id } });
  const tokens = await issueTokens(session.userId, { email: session.user.email });
  return { ...tokens, user: await getMe(session.userId) };
}

export async function logout(rawToken: string) {
  await prisma.session.deleteMany({ where: { refreshTokenHash: hashToken(rawToken) } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, timezone: true, createdAt: true },
  });
  if (!user) throw new UnauthorizedError();
  return user;
}

// ── Helpers ──────────────────────────────────────────────────

async function issueTokens(userId: string, payload: Record<string, unknown>) {
  const accessToken = jwt.sign(
    { sub: userId, ...payload },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
  );

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

  // 256 bits from a CSPRNG, up from randomUUID's 122. Only the digest is
  // persisted; the raw value goes to the client's httpOnly cookie and is never
  // recoverable from the database.
  const refreshToken = generateToken();

  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken, expiresIn: 900 };
}
