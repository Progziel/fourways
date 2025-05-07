const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
require("dotenv").config();
const customFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
  level: 'info', 
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize({ all: true }),
    customFormat
  ),
  transports: [
    new transports.Console(),
  
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.File({ filename: 'logs/error.log', level: 'error' })
  ],
});

// Optionally, in development mode you can add additional transports or modify log levels:
if (process.env.NODE_ENV === 'development') {
  logger.debug('Logging initialized at debug level');
}

module.exports = logger;
