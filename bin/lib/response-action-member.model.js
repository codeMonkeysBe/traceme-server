"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
class ResponseActionMember {
    constructor(action, payload) {
        this.action = action;
        this.payload = payload;
        this.result = false;
        logger_1.logger.debug(`Action member created ${this.action} `);
    }
}
exports.ResponseActionMember = ResponseActionMember;
//# sourceMappingURL=response-action-member.model.js.map