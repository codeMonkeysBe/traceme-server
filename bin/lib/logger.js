"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require("winston");
// Setup winston instance
let logger = new (winston.Logger)({
    transports: [
        // Add timestamps to each logger message
        new (winston.transports.Console)({ "timestamp": true })
    ]
});
exports.logger = logger;
// Manually set this when developing
// TODO user friendliness
logger.level = "debug";
/*
 * Custom logger function, for "standard" logmessage
 */
logger.f = (level, uuid, title, tolog) => {
    let logdata = "";
    // Loop over key/values and make newline seperated key/value pairs
    for (let key in tolog) {
        if (typeof tolog[key] !== "undefined") {
            logdata += `${key}: ${JSON.stringify(tolog[key])}
  `;
        }
    }
    // Construct in a string
    let logstring = `${uuid}
  ${title}
  ${Array(title.length + 1).join("-")}
  ${logdata}
`;
    // The actual logging
    logger.log(level, logstring);
};
//# sourceMappingURL=logger.js.map