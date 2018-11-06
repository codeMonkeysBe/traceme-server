import { logger } from "./logger";

export class ResponseActionMember {
  public result: boolean = false;

  constructor(
    public action: string,
    public payload: any,
    public extra: any = null
  ) {
    logger.debug(`Action member created ${this.action} `);
  }
}
