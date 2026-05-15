import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../utils/prisma';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError } from '../../utils/errors';
import type { RegisterInput, LoginInput } from './auth.schema';

const SALT_ROUNDS = 12;
const REFRESH_TTL_DAYS = 30;

export async function register(input: RegisterInput) {
  const exists = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
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

  return issueTokens(user.id, { email: user.email });
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');

  return issueTokens(user.id, { email: user.email });
}

export async function refresh(rawToken: string) {
  const session = await prisma.session.findUnique({
    where: { refreshToken: rawToken },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired or invalid');
  }
  // Rotate: delete old, issue new
  await prisma.session.delete({ where: { id: session.id } });
  return issueTokens(session.userId, { email: session.user.email });
}

export async function logout(rawToken: string) {
  await prisma.session.deleteMany({ where: { refreshToken: rawToken } });
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

  const session = await prisma.session.create({
    data: {
      userId,
      refreshToken: crypto.randomUUID(),
      expiresAt,
    },
  });

  return { accessToken, refreshToken: session.refreshToken, expiresIn: 900 };
}
