// ============================================================
// auth/strategies/jwt.strategy.ts
// ============================================================
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'change-me-in-production',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}

// ============================================================
// auth/strategies/local.strategy.ts  
// ============================================================
import { PassportStrategy as PS2 } from '@nestjs/passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalAuthStrategy extends PS2(LocalStrategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }
}

// ============================================================
// auth/guards/jwt-auth.guard.ts
// ============================================================
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// ============================================================
// auth/guards/local-auth.guard.ts
// ============================================================
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
