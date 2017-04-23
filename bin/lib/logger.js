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
logger.level = "error";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9sb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtQ0FBbUM7QUFFbkMseUJBQXlCO0FBQ3pCLElBQUksTUFBTSxHQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkMsVUFBVSxFQUFFO1FBQ1Ysd0NBQXdDO1FBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUMsV0FBVyxFQUFFLElBQUksRUFBQyxDQUFDO0tBQ3hEO0NBQ0osQ0FBQyxDQUFDO0FBK0JNLHdCQUFNO0FBN0JmLE1BQU0sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO0FBRXZCOztHQUVHO0FBQ0gsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQWEsRUFBRSxJQUFZLEVBQUUsS0FBYSxFQUFFLEtBQUs7SUFFM0QsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBQ2pCLGtFQUFrRTtJQUNsRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3RCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDdEMsT0FBTyxJQUFJLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQ25ELENBQUM7UUFDQSxDQUFDO0lBQ0gsQ0FBQztJQUVELHdCQUF3QjtJQUN4QixJQUFJLFNBQVMsR0FBRyxHQUFHLElBQUk7SUFDckIsS0FBSztJQUNMLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDakMsT0FBTztDQUNWLENBQUM7SUFFQSxxQkFBcUI7SUFDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFFL0IsQ0FBQyxDQUFDIn0=