import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '5000'), 10),
  /**
   * Interface to bind. Defaults to loopback, which is correct for local
   * development and deliberately refuses connections from other machines.
   *
   * A hosting platform that routes traffic into the process — Railway, Render,
   * Fly, a systemd unit behind nginx — requires HOST=0.0.0.0. This was
   * previously hardcoded to 127.0.0.1 in server.ts, which made the process
   * unreachable on every one of those, with no way to override it.
   */
  HOST: optional('HOST', '127.0.0.1'),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '15m'),
  FRONTEND_URL: optional('FRONTEND_URL', 'http://localhost:3000'),
};
