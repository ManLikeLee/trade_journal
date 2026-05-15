import 'dotenv/config';
import { env } from './config/env';
import { app } from './app';

const HOST = '127.0.0.1';
const PORT = env.PORT;

const server = app.listen(PORT, HOST, () => {
  console.log(`TradeJournal API running at http://${HOST}:${PORT}`);
  console.log(`Health:  http://${HOST}:${PORT}/health`);
  console.log(`API:     http://${HOST}:${PORT}/api`);
  console.log(`Env:     ${env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received — shutting down');
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

export { server };
