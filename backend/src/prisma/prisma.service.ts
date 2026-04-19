import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function normalizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    const dbName = parsed.pathname.replace(/^\//, '');

    // Some environments inject `tradejournal.public` as the DB name.
    // Prisma expects DB `tradejournal` with `schema=public`.
    if (dbName.endsWith('.public')) {
      parsed.pathname = `/${dbName.slice(0, -'.public'.length)}`;
      if (!parsed.searchParams.get('schema')) {
        parsed.searchParams.set('schema', 'public');
      }
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const rawDbUrl = process.env.DATABASE_URL;
    const normalizedDbUrl = normalizeDatabaseUrl(rawDbUrl);
    if (rawDbUrl && normalizedDbUrl && rawDbUrl !== normalizedDbUrl) {
      // eslint-disable-next-line no-console
      console.warn('[PrismaService] Normalized DATABASE_URL from *.public to ?schema=public');
    }

    super({
      ...(normalizedDbUrl ? { datasources: { db: { url: normalizedDbUrl } } } : {}),
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
