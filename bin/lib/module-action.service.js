"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
class ModuleActionService {
    constructor(kcs) {
        this.kcs = kcs;
    }
    addAction() {
    }
    execute() {
        let actionResults = actions.map(action, ModuleAction => {
            return action;
        });
        logger_1.logger.debug(actionResults);
    }
    firmware(version) {
        // Some sanity checks
        if (!(Number.isInteger(version) && version > 200 && version < 600)) {
            logger_1.logger.f('notice', this.uuid, "connection.pushFirmware:", {
                error: "firmware version should be a number",
                version: version
            });
            return false;
        }
    }
    settings(data) {
        if (!this.canSetM()) {
            // Can't proceed
            return false;
        }
        let cgpsSettings = new this.kcs.CGPSsettings();
        // Load settings
        let setRes = cgpsSettings.SetSettingsData(Array.from(data.values()));
        logger_1.logger.f('debug', this.uuid, "connection: pushSettings", {
            crc: cgpsSettings.GetSettingsCRC(),
            error: cgpsSettings.mLastError
        });
        if (!setRes) {
            return false;
        }
        this.cgps.mSettings = cgpsSettings.GetSettingsData();
        // Try to send the response now
        this.sendResponse();
        return true;
    }
    mActionID(actionId) {
        if (this.canSetM()) {
            this.cgps.mActionID = actionId;
            return true;
        }
    }
}
exports.ModuleActionService = ModuleActionService;
//# sourceMappingURL=module-action.service.js.map