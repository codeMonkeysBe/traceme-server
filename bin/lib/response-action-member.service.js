"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const response_action_member_model_1 = require("./response-action-member.model");
class ResponseActionMemberService {
    constructor(cgps, kcs) {
        this.cgps = cgps;
        this.kcs = kcs;
        this.responseActionMembers = [];
    }
    add(action, payload, extra = null) {
        this.responseActionMembers.push(new response_action_member_model_1.ResponseActionMember(action, payload, extra));
    }
    applyResponseActionMembers() {
        // Loop over response members to apply
        let responseActionMemberResults = this.responseActionMembers.map((responseActionMember) => {
            return this.applyResponseActionMember(responseActionMember);
        });
        // Clear the member list
        this.responseActionMembers = [];
        return responseActionMemberResults;
    }
    // Apply a single response action member
    applyResponseActionMember(responseActionMember) {
        // Check if we can continue
        if (!this.cgps.RequireResponseActionMembersStall()) {
            // If we have a special function to process this type, let the function do it
            if (typeof this[responseActionMember.action] === "function") {
                responseActionMember.result = this[responseActionMember.action](responseActionMember.payload);
                // Does this response action member exist on the cgps instance, fill in manually
            }
            else if (typeof this.cgps[responseActionMember.action] !== "undefined") {
                // Binary load
                if (Buffer.isBuffer(responseActionMember.payload)) {
                    this.cgps[responseActionMember.action] = Array.from(responseActionMember.payload.values());
                }
                else {
                    // Non binary load
                    this.cgps[responseActionMember.action] = responseActionMember.payload;
                }
                responseActionMember.result = true;
            }
            logger_1.logger.debug("Applying" + responseActionMember.action);
        }
        return responseActionMember;
    }
    // TODO implement
    firmware(version) {
        // Some sanity checks
        if (!(Number.isInteger(version) && version > 200 && version < 600)) {
            return false;
        }
    }
    mSettings(data) {
        let cgpsSettings = new this.kcs.CGPSsettings();
        // Load settings
        let setRes = cgpsSettings.SetSettingsData(Array.from(data.values()));
        if (!setRes) {
            return false;
        }
        this.cgps.mSettings = cgpsSettings.GetSettingsData();
        return true;
    }
}
exports.ResponseActionMemberService = ResponseActionMemberService;
//# sourceMappingURL=response-action-member.service.js.map