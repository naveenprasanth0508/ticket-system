const winston = require("winston");
const path = require("path");

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

const transports = [
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: "HH:mm:ss" }),
      devFormat
    ),
  }),
];

// In production / non-test env add rotating file logs
if (process.env.NODE_ENV !== "test") {
  try {
    const DailyRotateFile = require("winston-daily-rotate-file");
    const logsDir = path.join(__dirname, "../logs");

    transports.push(
      new DailyRotateFile({
        filename: `${logsDir}/error-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        level: "error",
        maxSize: "20m",
        maxFiles: "14d",
        format: combine(timestamp(), json()),
      }),
      new DailyRotateFile({
        filename: `${logsDir}/combined-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
        format: combine(timestamp(), json()),
      })
    );
  } catch (_) {
    // winston-daily-rotate-file not available
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports,
});

// Express request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  });
  next();
};

module.exports = logger;
module.exports.requestLogger = requestLogger;
