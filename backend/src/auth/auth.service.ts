import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 12;
const REFRESH_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ── Registration ─────────────────────────────────────────
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return this.issueTokens(user.id, { email: user.email, name: user.name });
  }

  // ── Login ─────────────────────────────────────────────────
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return user;
  }

  async login(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    return this.issueTokens(user.id, { email: user.email, name: user.name });
  }

  // ── Refresh token ─────────────────────────────────────────
  async refresh(rawRefreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: rawRefreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    // Rotate: delete old, issue new
    await this.prisma.session.delete({ where: { id: session.id } });
    return this.issueTokens(session.userId, {
      email: session.user.email,
      name: session.user.name ?? '',
    });
  }

  // ── Logout ────────────────────────────────────────────────
  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({ where: { refreshToken } });
  }

  // ── Helpers ───────────────────────────────────────────────
  private async issueTokens(userId: string, payload: Record<string, unknown>) {
    const accessToken = this.jwt.sign({ sub: userId, ...payload });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TTL_DAYS);

    const { refreshToken } = await this.prisma.session.create({
      data: {
        userId,
        refreshToken: crypto.randomUUID(),
        expiresAt,
      },
    });

    return { accessToken, refreshToken, expiresIn: 900 };
  }
}
