const { createLogger, format, transports,     prettyPrint } = require('winston');
const path = require('path')

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.splat(),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack??''}${info.request?('\nRequest '+JSON.stringify(info.request)):''}`)
  ),
  transports: [
    new transports.File({ filename: path.join('logs','error.log'), level: 'error' }),
    new transports.File({ filename: path.join('logs','info.log'), level: 'info' }),
    new transports.Console({format: format.combine(format.colorize(),format.simple())})
  ]
});

module.exports=logger;