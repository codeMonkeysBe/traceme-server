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


export { logger };

