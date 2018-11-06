import { runInThisContext } from "vm";
import { readFileSync } from "fs";
import { logger } from "./logger";

/**
 * Declare kcs exports, just like typings do
 */
declare function CGPS(): void;
declare function CGPSsettings(): void;
declare function CGPShelper(): void;

// Runtime code loading of KCS code
export function loadKcsCode(path: string) {
  // Load kcs code text
  let kcsCode = readFileSync(path, "utf8");

  // Execute code in current module context
  // Effectively makes the global variables in the kcs code global to this module.
  runInThisContext(kcsCode, {
    filename: path, // For debug purposes
    displayErrors: true // For debug purposes
  });

  // Return globals as object
  return {
    CGPS: CGPS,
    CGPSsettings: CGPSsettings,
    CGPShelper: CGPShelper
  };
}
