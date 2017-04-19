"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vm_1 = require("vm");
const fs_1 = require("fs");
// Runtime code loading of KCS code
function loadKcsCode(path) {
    // Load kcs code text
    let kcsCode = fs_1.readFileSync(path, 'utf8');
    // Execute code in current module context
    // Effectively makes the global variables in the kcs code global to this module.
    vm_1.runInThisContext(kcsCode, {
        filename: path,
        displayErrors: true // For debug purposes
    });
    // Return globals as object
    return {
        CGPS: CGPS,
        CGPSsettings: CGPSsettings,
        CGPShelper: CGPShelper
    };
}
exports.loadKcsCode = loadKcsCode;
;
//# sourceMappingURL=kcs.js.map