import * as winston from "winston";

// Setup winston instance
const logger: any = new (winston.Logger)({
    transports: [
      // Add timestamps to each logger message
        new (winston.transports.Console)({"timestamp": true})
    ]
});

logger.level = "info";

/*
 * Custom logger function, for "standard" logmessage
 */
logger.f = (level: string, uuid: string, title: string, tolog) => {
  logger.log(level, `[${uuid}] [${title}] ${typeof tolog !== 'undefined' ? JSON.stringify(tolog): ''} `);
};


export { logger };

