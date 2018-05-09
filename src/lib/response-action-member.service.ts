import { logger } from "./logger";

import { ResponseActionMember } from "./response-action-member.model";

export class ResponseActionMemberService {

  private responseActionMembers: ResponseActionMember[] = [];

  constructor(
    private cgps: any,
    private kcs: any, // Passed as construction argument because this is dynamically loaded
  ){
  }

  public add(action: string, payload: any, extra: any = null): void {
    this.responseActionMembers.push(new ResponseActionMember(action, payload, extra));
  }

  public applyResponseActionMembers(): ResponseActionMember[] {
    // Loop over response members to apply
    const responseActionMemberResults = this.responseActionMembers.map((responseActionMember: ResponseActionMember) => {
      return this.applyResponseActionMember(responseActionMember);
    });

    // Clear the member list
    this.responseActionMembers = [];

    return responseActionMemberResults;
  }


  // Apply a single response action member
  private applyResponseActionMember(responseActionMember: ResponseActionMember): ResponseActionMember {

    // Check if we can continue
    if(!this.cgps.RequireResponseActionMembersStall()) {

      // If we have a special function to process this type, let the function do it
      if(typeof this[responseActionMember.action] === "function") {

        responseActionMember.result = this[responseActionMember.action](responseActionMember.payload);

      // Does this response action member exist on the cgps instance, fill in manually
      } else if(typeof this.cgps[responseActionMember.action] !== "undefined") {

        // Binary load
        if(Buffer.isBuffer(responseActionMember.payload)) {
          this.cgps[responseActionMember.action] = Array.from(responseActionMember.payload.values())
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


  // TODO implement
  public firmware(version: number) {
    // Some sanity checks
    if(!(Number.isInteger(version) && version > 200 && version < 600)) {
      return false;
    }

  }


  public mSettings(data: Buffer) {

    const cgpsSettings = new this.kcs.CGPSsettings();

    // Load settings
    const setRes = cgpsSettings.SetSettingsData(Array.from(data.values()));

    if(!setRes) {
      return false;
    }

    this.cgps.mSettings = cgpsSettings.GetSettingsData();

    return true;

  }


}
