import * as winston from "winston";

// Setup winston instance
let logger: any = new (winston.Logger)({
    transports: [
      // Add timestamps to each logger message
        new (winston.transports.Console)({"timestamp": true})
    ]
});

logger.level = "error";

/*
 * Custom logger function, for "standard" logmessage
 */
logger.f = (level: string, uuid: string, title: string, tolog) => {
  logger.log(level, `[${uuid}] [${title}] ${JSON.stringify(tolog)} `);
};


export { logger };

