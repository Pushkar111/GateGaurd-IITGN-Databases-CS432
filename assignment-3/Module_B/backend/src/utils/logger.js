// src/utils/logger.js
// Winston logger with console + file transports
// Used for general app logs AND the mutation audit trail

const path = require('path');
const { createLogger, format, transports } = require('winston');
const env = require('../config/env');

const { combine, timestamp, printf, colorize, errors } = format;

// clean single-line log format for file output
const fileFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `[${ts}] [${level.toUpperCase()}] ${stack || message}`;
});

// same but with color for the terminal
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return `${ts} ${level}: ${stack || message}`;
  })
);

const logger = createLogger({
  level: env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    fileFormat
  ),
  transports: [
    // main app log
    new transports.File({
      filename: path.resolve(env.AUDIT_LOG),
      maxsize: 10 * 1024 * 1024, // 10 MB before rotating
      maxFiles: 5,
    }),
    // separate error log
    new transports.File({
      filename: path.resolve('logs/error.log'),
      level: 'error',
    }),
  ],
  exitOnError: false,
});

// add console transport outside of production
if (env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({ format: consoleFormat }));
}

// convenience: log a formatted audit event
logger.audit = function ({ action, user, role, table, recordId, status }) {
  logger.info(
    `[AUDIT] action=${action} user=${user} role=${role} table=${table || '-'} record=${recordId || '-'} status=${status}`
  );
};

module.exports = logger;
