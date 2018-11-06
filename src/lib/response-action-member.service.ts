import { logger } from "./logger";

import { ResponseActionMember } from "./response-action-member.model";

const files = {};

export class ResponseActionMemberService {
  private responseActionMembers: ResponseActionMember[] = [];
  private files: any;
  private customResponseGenerators: any[] = [];

  // Stall the members apply until next apply round.
  private stall = false;

  constructor(
    private cgps: any,
    private kcs: any // Passed as construction argument because this is dynamically loaded
  ) {
    this.files = files;
  }

  public add(action: string, payload: any, extra: any = null): void {
    this.responseActionMembers.push(
      new ResponseActionMember(action, payload, extra)
    );
  }

  // Add a custom response action generator that will be called whenever the given action is found.
  // Enables us to hook into the responseActionMembers mechanism
  public registerCustomResponseGenerator(
    action: string,
    responseGenerator: Function
  ) {
    this.customResponseGenerators[action] = responseGenerator;
  }

  public applyResponseActionMembers(): ResponseActionMember[] {
    // Loop over response members to apply
    const responseActionMemberResults = this.responseActionMembers.map(
      (responseActionMember: ResponseActionMember) => {
        return this.applyResponseActionMember(responseActionMember);
      }
    );

    if (this.stall) {
      this.stall = false;
    }

    // Clear the member list
    this.responseActionMembers = [];

    return responseActionMemberResults;
  }

  // Apply a single response action member
  private applyResponseActionMember(
    responseActionMember: ResponseActionMember
  ): ResponseActionMember {
    // Check if we can continue
    if (!this.cgps.RequireResponseActionMembersStall() && !this.stall) {
      // If we have a special function to process this type, let the function do it
      if (typeof this[responseActionMember.action] === "function") {
        responseActionMember.result = this[responseActionMember.action](
          responseActionMember.payload,
          responseActionMember.extra
        );
      } else if (
        typeof this.customResponseGenerators[responseActionMember.action] ===
        "function"
      ) {
        responseActionMember.result = this.customResponseGenerators[
          responseActionMember.action
        ](responseActionMember.payload, responseActionMember.extra);
        this.stall = true;
      } else if (
        typeof this.cgps[responseActionMember.action] !== "undefined"
      ) {
        // Does this response action member exist on the cgps instance, fill in manually
        // Binary load
        if (Buffer.isBuffer(responseActionMember.payload)) {
          this.cgps[responseActionMember.action] = Array.from(
            responseActionMember.payload.values()
          );
        } else {
          // Non binary load
          this.cgps[responseActionMember.action] = responseActionMember.payload;
        }
        responseActionMember.result = true;
      }
      logger.debug("Applying" + responseActionMember.action);
    }

    return responseActionMember;
  }

  public addFirmwareFile(payload: Buffer, version: number) {
    this.addFile(payload, `r9fw${version}.hex`);
  }

  public addDownloadFile(payload: Buffer, version: number) {
    this.addFile(payload, `dwnl${version}.hex`);
  }

  public getFreeDownloadSlot() {
    for (let version = 100; version < 1000; version++) {
      if (typeof files[`dwnl${version}.hex`] === "undefined") {
        return version;
      }
    }
  }

  public addFile(payload, name) {
    this.files[`GET /${name}`] = payload;
  }

  public getFile(filename: string) {
    if (typeof this.files[filename] !== "undefined") {
      const file = this.files[filename];
      // Remove slot
      delete this.files[filename];
      return file;
    }
    return false;
  }

  /**
   * m[Type}]' handlers
   */

  public mFirmware(payload: Buffer, extra) {
    this.cgps.mFirmware = extra.version;
    // Keeping the file for the next connection
    this.addFirmwareFile(payload, extra.version);
    return true;
  }

  public mSettings(data: Buffer) {
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
