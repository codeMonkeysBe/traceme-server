import { logger } from "./logger";

export class ResponseActionMember {

  public result: boolean = false;

  constructor(public action: string, public payload: any) {
    logger.debug(`Action member created ${this.action} `);
  }

}
