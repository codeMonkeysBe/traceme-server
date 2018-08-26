"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const response_action_member_model_1 = require("./response-action-member.model");
const files = {};
class ResponseActionMemberService {
    constructor(cgps, kcs) {
        this.cgps = cgps;
        this.kcs = kcs;
        this.responseActionMembers = [];
        this.customResponseGenerators = [];
        // Stall the members apply until next apply round.
        this.stall = false;
        this.files = files;
    }
    add(action, payload, extra = null) {
        this.responseActionMembers.push(new response_action_member_model_1.ResponseActionMember(action, payload, extra));
    }
    addFirmwareFile(payload, version) {
        this.addFile(`r9fw${version}.hex`, payload);
    }
    ;
    addFile(payload, name) {
        this.files[`GET /${name}`] = payload;
    }
    ;
    registerCustomResponseGenerator(action, responseGenerator) {
        this.customResponseGenerators[action] = responseGenerator;
    }
    applyResponseActionMembers() {
        // Loop over response members to apply
        const responseActionMemberResults = this.responseActionMembers.map((responseActionMember) => {
            return this.applyResponseActionMember(responseActionMember);
        });
        if (this.stall) {
            this.stall = false;
        }
        // Clear the member list
        this.responseActionMembers = [];
        return responseActionMemberResults;
    }
    // Apply a single response action member
    applyResponseActionMember(responseActionMember) {
        // Check if we can continue
        if (!this.cgps.RequireResponseActionMembersStall() && !this.stall) {
            // If we have a special function to process this type, let the function do it
            if (typeof this[responseActionMember.action] === "function") {
                responseActionMember.result = this[responseActionMember.action](responseActionMember.payload, responseActionMember.extra);
            }
            else if (typeof this.customResponseGenerators[responseActionMember.action] === "function") {
                responseActionMember.result = this.customResponseGenerators[responseActionMember.action](responseActionMember.payload, responseActionMember.extra);
                this.stall = true;
            }
            else if (typeof this.cgps[responseActionMember.action] !== "undefined") {
                // Does this response action member exist on the cgps instance, fill in manually
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
    mFirmware(payload, extra) {
        this.cgps.mFirmware = extra.version;
        // Keeping the file for the next connection
        this.addFirmwareFile(payload, extra.version);
        return true;
    }
    getFile(filename) {
        if (typeof this.files[filename] !== "undefined") {
            return this.files[filename];
        }
        return false;
    }
    mSettings(data) {
        const cgpsSettings = new this.kcs.CGPSsettings();
        // Load settings
        const setRes = cgpsSettings.SetSettingsData(Array.from(data.values()));
        if (!setRes) {
            return false;
        }
        this.cgps.mSettings = cgpsSettings.GetSettingsData();
        return true;
    }
}
exports.ResponseActionMemberService = ResponseActionMemberService;
//# sourceMappingURL=response-action-member.service.js.map