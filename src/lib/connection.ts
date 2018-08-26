import { EventEmitter } from "events";
import { Socket } from "net";
import * as uuid from "uuid";

import { logger } from "./logger";
import { ConnectionOptions } from "./connection-options.model";
import { ResponseActionMemberService } from "./response-action-member.service";
import { ResponseActionMember } from "./response-action-member.model";

interface ackCounter {
  parts: number;
  ackedParts: number;
}

interface ackCounterCollection {
  [tsUuid: string]: ackCounter;
}

export class Connection extends EventEmitter {
  // Unique id for each connection, useful for tracking a connection in the log
  public uuid: string;

  // Connection buffer
  private buffer: Buffer;

  // Regexes used to match and extract data
  private tcpDataFormatRegex: RegExp;
  private tcpExtraDataFormatRegex: RegExp;
  private getFileRegex: RegExp;

  // To keep track of the imei
  private imei: number;

  // Single instance for each connection
  private cgps: any;

  // Each event needs to be acked before we can respond to the device with an ack
  private ackCounters: ackCounterCollection = {};

  // Service to set response action members
  private ramService: ResponseActionMemberService;

  constructor(
    public tcpConnection: Socket,
    private kcs: any, // Passed as construction argument because this is dynamically loaded
    private options: ConnectionOptions
  ) {
    // We are an event emitter
    super();

    this.cgps = new this.kcs.CGPS();

    // Constructing the service that sets and checks ->m... actions
    this.ramService = new ResponseActionMemberService(
      this.cgps,
      this.kcs
    );



    // Setting the socket timeout, converting seconds to the socket expected milliseconds
    this.tcpConnection.setTimeout(options.socketTimeout * 1000);

    // Unique identifier for each connection ( good for logging purposes )
    this.uuid = uuid.v4();

    /*
     * Creates a regex from a tcp data string
     * so we can easily extract data from incoming transmissions
     */
    this.tcpDataFormatRegex = new RegExp(
      `^${this.options.tcpDataFormat.replace("%s", "([0-9a-zA-Z|_-]+)")}`
    );

    /*
     * Creates a regex from a tcp extra data string
     * so we can easily extract data from incoming transmissions
     */
    const ds = this.options.tcpExtraDataFormat
      .replace("%s", "([0-9a-zA-Z|_-]+)")
      .replace("%d", "([0-9]+)")
      .replace("%x", "([\u0000-\uffff]+)");

    this.tcpExtraDataFormatRegex = new RegExp(`^${ds}$`);


    this.getFileRegex = new RegExp("^GET \/.{0,4}\\d\\d\\d\.hex\n$");

    /*
     * Initialize tcp handlers
     */

    // handler that handles incoming data
    this.initConnectionHandlers();

    // Log the new connection so we know something happened
    logger.f("info", this.uuid, "connection: New connection ", {
      addr: this.tcpConnection.localAddress,
      port: this.tcpConnection.localPort,
      raddr: this.tcpConnection.remoteAddress,
      rport: this.tcpConnection.remotePort,
      fam: this.tcpConnection.remoteFamily
    });
  }

  public end(data: Buffer) {
    this.tcpConnection.end(data);
  }

  public getResponseActionMemberService() {
    return this.ramService;
  }

  // Add a single response action member
  public addResponseActionMember(
    action: string,
    payload: any,
    extra: any = null
  ) {
    return this.ramService.add(action, payload, extra);
  }

  public applyResponseActionMembers(): ResponseActionMember[] {
    const responseActionMemberResults = this.ramService.applyResponseActionMembers();

    logger.f("debug", this.uuid, "connection: applyResponseActionMembers", {
      results: responseActionMemberResults
    });

    // Try to send the response now
    this.sendResponse();

    // Return the members and their results
    return responseActionMemberResults;
  }

  // Handle incoming data
  private initConnectionHandlers() {
    this.tcpConnection.on("data", (chunk: Buffer) => {
      logger.f("silly", this.uuid, "connection: Received data", {
        chunk: chunk.toString("ASCII")
      });


      // Start a new buffer if necesarry
      if (typeof this.buffer === "undefined") {
        // Start a new buffer
        this.buffer = chunk;
      } else {
        // Concat to existing buffer
        this.buffer = Buffer.concat(
          [this.buffer, chunk],
          this.buffer.length + chunk.length
        );
      }

      if (this.buffer.length > this.options.maxBufferSize) {
        logger.f(
          "error",
          this.uuid,
          "connection: maxBufferSize exeeded, closing the connection",
          {
            buffer: this.buffer.toString("ASCII")
          }
        );
        // Close up the connection
        delete this.buffer;
        this.tcpConnection.end();
        return;
      }

      logger.f("debug", this.uuid, "connection: total buffer", {
        chunk: this.buffer.toString("ASCII")
      });

      // Match the module data format with the incoming data

      // If matches has results we know we have a regular data string
      const matches = this.buffer
        .toString("ASCII")
        .match(this.tcpDataFormatRegex);
      // If extra matches has results we know we have an extra data string
      const extraMatches = this.buffer
        .toString("ASCII")
        .match(this.tcpExtraDataFormatRegex);
      // Firmware match
      const fileMatches = this.buffer
        .toString("ASCII")
        .match(this.getFileRegex);

      /**
       * When our connection buffer matches a data string WITHOUT extra data
       */
      if (Array.isArray(matches) && matches.length === 2) {
        // We want the datastring itself, which is in match 1
        // the first matching parentheses of the tcpDataFormatRegex
        const match: string = matches[1];

        logger.f("silly", this.uuid, "connection: Matched TCP data format", {
          matches: matches
        });

        // process the received data
        this.processDataString(match);

        // Delete processed data from buffer
        // We assume our buffer is one ended
        // begin -> "9ihjuwdi9qwdjji ....
        // So we delete from the beginning of the buffer
        // until the end of our data format match
        this.buffer = this.buffer.slice(matches[0].length);

        /**
         *  When our connection buffer matches a data string with EXTRA data
         */
      } else if (Array.isArray(extraMatches) && extraMatches.length === 4) {
        // We want the datastring itself, which is in match 1
        // the first matching parentheses of the tcpExtraDataFormat
        const match: string = extraMatches[1];
        const bytesOfData: number = parseInt(extraMatches[2], 10);

        const binaryIndex = this.buffer
          .toString("ascii")
          .indexOf(extraMatches[3]);

        const sliceBuf = Buffer.from(this.buffer);
        const receivedData: Buffer = sliceBuf.slice(
          binaryIndex,
          binaryIndex + bytesOfData
        );

        logger.f(
          "debug",
          this.uuid,
          "connection: Matched TCP extra data format, received upload",
          {
            bytesOfData: bytesOfData,
            bytesCounted: receivedData.length
          }
        );

        this.emit("extraData", {
          uuid: this.uuid, // Always include this one, so the client can correlate with the logs
          imei: this.imei, // Device imei
          data: receivedData
        });

        this.buffer = this.buffer.slice(extraMatches[0].length);

        // processDataString the received data
        this.processDataString(match);
      } else if (Array.isArray(fileMatches)) {
        const request = fileMatches[0].trim();
        const file = this.ramService.getFile(request);
        if(file) {
          this.tcpConnection.write(file);
          this.buffer = undefined;
        }
      }


    });

    this.tcpConnection.on("close", () => {
      logger.f("info", this.uuid, "connection: socket close");
      this.emit("close");
    });
    this.tcpConnection.on("end", () => {
      logger.f(
        "verbose",
        this.uuid,
        "connection: socket end, received fin, returning fin"
      );
      // Return the fin
      this.tcpConnection.end();
      this.emit("end");
    });
    this.tcpConnection.on("timeout", () => {
      this.tcpConnection.end();
      logger.f("info", this.uuid, "connection: socket timeout");
      this.emit("timeout");
    });
    this.tcpConnection.on("error", err => {
      logger.f("error", this.uuid, "connection: tcpConnectionError ", {
        error: err
      });
      this.emit("error", err);
    });
  }

  private processDataString(dataString: string): Buffer {
    // Place to store the extracted imei
    let transmittedImei;

    // Extract the imei in match array
    const imeiMatches = dataString.match(/^(\d+)\|/);

    if (imeiMatches && typeof imeiMatches[1] !== "undefined") {
      transmittedImei = this.kcs.CGPShelper.DecompressImei(imeiMatches[1]);
    }

    // Already got the imei
    if (typeof this.imei !== "undefined") {
      // Odd, we shouldn't receive the imei again.
      // Could be that the module didn't receive our first ack yet for omitting the identification
      if (typeof transmittedImei !== "undefined") {
        // Processing as usual but checking the dataString for a imei validation
        if (transmittedImei !== this.imei) {
          // Very strange, we received a different imei then before.
          logger.f(
            "error",
            this.uuid,
            "connection: Extracted imei from transmission did not match imei set on connection",
            {
              connectionImei: this.imei,
              transmittedImei: transmittedImei
            }
          );
          // Kill the connection at once.
          this.tcpConnection.destroy("imei mismatch on connection");
        }
      }
    } else {
      this.imei = transmittedImei;
      logger.f(
        "debug",
        this.uuid,
        "connection: Extracted imei from transmission",
        {
          imei: this.imei
        }
      );

      // Report that we have the imei
      this.emit("imei", this.imei);
    }
    dataString = dataString.replace(/^\d*\|/, `${this.imei}|`);

    // Makes the module stop sending an imei with each transmission
    this.cgps.mOmitIdentification = true;

    if (!this.cgps.SetHttpData(dataString)) {
      // Faulty
      logger.f("error", this.uuid, "connection: Invalid dataString", {
        dataString: dataString,
        error: this.cgps.GetLastError()
      });
      return null;
    }

    const totalParts = this.cgps.GetDataPartCount();

    logger.f("debug", this.uuid, "connection: Decoding dataString", {
      dataString: dataString,
      parts: totalParts,
      error: this.cgps.GetLastError()
    });

    // Generate unique ack id for each incoming transmission.
    const tsUuid = uuid.v4();
    this.ackCounters[tsUuid] = {
      parts: totalParts,
      ackedParts: 0
    };

    // Transmission date
    const tsDate = new Date();

    /*
     * Loop over data parts and emit an event for each part
     */
    for (let part = 0; part < totalParts; part++) {
      // try selecting the data part and validate it
      if (!this.cgps.SelectDataPart(part) || !this.cgps.IsValid()) {
        logger.f("error", this.uuid, "connection: Invalid data part", {
          dataString: dataString,
          imei: this.imei, // Device imei
          uuid: tsUuid, // the transmission uuid
          time: tsDate.toISOString(), // Time the event arrived on server
          faultyPart: part, // Part number
          error: this.cgps.GetLastError() // The errror message
        });
        continue;
      }
      this.emit("event", {
        cgps: this.cgps, // Expose cgps for decoding user side
        imei: this.imei, // Device imei
        tsUuid: tsUuid, // the transmission uuid
        tsTime: tsDate.toISOString(), // Time the event arrived on server
        totalParts: totalParts, // Total number of parts received
        currentPart: part // Partnumber of current part
      });
    }
  }

  // Ack an individual event in a transmission
  public ack(tsUuid: string) {
    if (typeof this.ackCounters[tsUuid] === "undefined") {
      logger.f("error", this.uuid, "connection: unkown ack ID ", {
        tsUuid: tsUuid
      });
      return;
    }

    this.ackCounters[tsUuid].ackedParts++;

    if (
      this.ackCounters[tsUuid].ackedParts === this.ackCounters[tsUuid].parts
    ) {
      logger.f("debug", this.uuid, "tranmission acked", {
        tsUuid: tsUuid
      });

      // Notify connection client that a transmission is fully acked
      this.emit("acked", {
        tsUuid: tsUuid,
        totalParts: this.ackCounters[tsUuid].ackedParts,
        imei: this.imei
      });

      this.sendResponse(this.ackCounters[tsUuid].ackedParts);

      // Clean up
      delete this.ackCounters[tsUuid];
    }

    // Return true if ack worked
    return true;
  }

  private sendResponse(ackedParts: number = 0) {
    const runningTransmissions = Object.keys(this.ackCounters);

    // Do net send response when a transmission is in progress.
    if (ackedParts === 0 && runningTransmissions.length !== 0) {
      return false;
    }

    const response = Buffer.from(this.cgps.BuildResponseTCP(ackedParts));

    // See if we need to respond
    if (response !== null) {
      logger.f("debug", this.uuid, "connection: sendingResponse", {
        buffer: response,
        bufferString: response.toString("utf-8")
      });

      // Reply to module with response
      this.tcpConnection.write(response);

      // Do this at end of each transmission
      this.cgps.ClearResponseActionMembers();
    }

    return true;
  }

}
