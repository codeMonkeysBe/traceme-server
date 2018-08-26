"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require("winston");
// Setup winston instance
const logger = new (winston.Logger)({
    transports: [
        // Add timestamps to each logger message
        new (winston.transports.Console)({ "timestamp": true })
    ]
});
exports.logger = logger;
logger.level = "debug";
/*
 * Custom logger function, for "standard" logmessage
 */
logger.f = (level, uuid, title, tolog) => {
    logger.log(level, `[${uuid}] [${title}] ${JSON.stringify(tolog)} `);
};
//# sourceMappingURL=logger.js.map