import 'dotenv/config';
import { env } from './config/env';
import { app } from './app';
import { prisma } from './utils/prisma';

const HOST = env.HOST;
const PORT = env.PORT;

const server = app.listen(PORT, HOST, () => {
  console.log(`TradeJournal API running at http://${HOST}:${PORT}`);
  console.log(`Health:  http://${HOST}:${PORT}/health`);
  console.log(`API:     http://${HOST}:${PORT}/api`);
  console.log(`Env:     ${env.NODE_ENV}`);
});

// Graceful shutdown
function shutdown(signal: string): void {
  console.log(`${signal} received — shutting down gracefully`);
  server.close(() => {
    // Release the pool rather than leaving it to the process teardown: without
    // this every restart leaks a Postgres connection until the server times it
    // out, which matters on a platform that restarts on each deploy.
    void prisma.$disconnect().finally(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

export { server };
