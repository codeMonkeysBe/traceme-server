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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2NzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9rY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSwyQkFBc0M7QUFDdEMsMkJBQWtDO0FBV2xDLG1DQUFtQztBQUNuQyxxQkFBNEIsSUFBWTtJQUV0QyxxQkFBcUI7SUFDckIsSUFBSSxPQUFPLEdBQUcsaUJBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFFekMseUNBQXlDO0lBQ3pDLGdGQUFnRjtJQUNoRixxQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7UUFDeEIsUUFBUSxFQUFFLElBQUk7UUFDZCxhQUFhLEVBQUUsSUFBSSxDQUFDLHFCQUFxQjtLQUMxQyxDQUFDLENBQUM7SUFFSCwyQkFBMkI7SUFDM0IsTUFBTSxDQUFDO1FBQ0wsSUFBSSxFQUFFLElBQUk7UUFDVixZQUFZLEVBQUUsWUFBWTtRQUMxQixVQUFVLEVBQUUsVUFBVTtLQUN2QixDQUFDO0FBRUosQ0FBQztBQW5CRCxrQ0FtQkM7QUFBQSxDQUFDIn0=