// server.js
// Entry point - start the HTTP server
// Handles graceful shutdown on SIGTERM/SIGINT

require('./src/config/env'); // validate env vars before anything else

const app    = require('./src/app');
const env    = require('./src/config/env');
const logger = require('./src/utils/logger');
const { pool } = require('./src/config/db');
const authModel = require('./src/models/auth.model');

const server = app.listen(env.PORT, () => {
  logger.info(`GateGuard API running on port ${env.PORT} (${env.NODE_ENV})`);
  logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
  
  // Clean up expired OTPs and blacklisted tokens every hour
  setInterval(async () => {
    try {
      const otpDeleted = await authModel.deleteExpiredOTPs();
      const blacklistDeleted = await authModel.cleanExpiredBlacklist();
      if (otpDeleted > 0 || blacklistDeleted > 0) {
        logger.info(`[cleanup] Removed ${otpDeleted} expired OTPs, ${blacklistDeleted} blacklisted tokens`);
      }
    } catch (err) {
      logger.error(`[cleanup] Error during hourly cleanup: ${err.message}`);
    }
  }, 60 * 60 * 1000);
});

// graceful shutdown so DB connections close cleanly
async function shutdown(signal) {
  logger.info(`${signal} received - shutting down gracefully...`);
  server.close(async () => {
    try {
      await pool.end();
      logger.info('PostgreSQL pool closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing PostgreSQL pool:', err.message);
      process.exit(1);
    }
  });

  // force exit after 10 seconds if graceful shutdown hasn't completed
  setTimeout(() => {
    logger.warn('Graceful shutdown timed out - forcing exit');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});
