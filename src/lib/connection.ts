import { EventEmitter } from "events";
import { Socket } from "net";
import * as uuid from "uuid";

import { logger } from "./logger";
import { ConnectionOptions } from "./connection-options.model";

export class Connection extends EventEmitter {

  // Unique id for each connection, useful for tracking a connection in the log
  private uuid: string;

  // Connection buffer
  private buffer: Buffer;

  // Keep track of buffer writes
  private bufferWriteCount: number = 0;

  // Regexes used to match and extract data
  private tcpDataFormatRegex: RegExp;
  private tcpExtraDataFormatRegex: RegExp;

  // To keep track of the imei
  private imei: string;

  // Single instance for each connection
  private cgps: any

  private mSets: any = {};

  constructor(
    private tcpConnection: Socket,
    private kcs: any,
    private options: ConnectionOptions
  ) {
    // We are an event emitter
    super();

    this.cgps = new this.kcs.CGPS();

    // Setting the socket timeout, converting seconds to the socket expected milliseconds
    this.tcpConnection.setTimeout(options.socketTimeout*1000);

    // Unique identifier for each connection ( good for logging purposes )
    this.uuid = uuid.v4();

    // Initialize the module data string regexes
    this.initRegexes();

    /*
     * Initialize tcp handlers
     */

    // handler that handles incoming data
    this.initOnDataHandler();
    // When some error occurs on the tcp conn
    this.initOnErrorHandler();
    // On socket fully closed
    this.initOnCloseHandler();
    // When one end sends a FIN packet to close the conn
    this.initOnEndHandler();
    // When the socket timeouts.
    this.initOnTimeoutHandler();

    logger.f('info', this.uuid, "connection: New connection ", {
      addr: this.tcpConnection.localAddress,
      port: this.tcpConnection.localPort,
      raddr: this.tcpConnection.remoteAddress,
      rport: this.tcpConnection.remotePort,
      fam: this.tcpConnection.remoteFamily,
    });



  }

  // On socket fully closed
  private initOnCloseHandler() {
    this.tcpConnection.on("close", () => {
      logger.f("info", this.uuid, "connection: socket close");
    });
  }

  // When other end sends a FIN packet to close the conn
  private initOnEndHandler() {
    this.tcpConnection.on("end", () => {
      logger.f("verbose", this.uuid, "connection: socket end, received fin, returning fin");
      // Return the fin
      this.tcpConnection.end();
    });
  }

  // When the socket timeouts.
  private initOnTimeoutHandler() {
    this.tcpConnection.on("timeout", () => {
      this.tcpConnection.end();
      logger.f("info", this.uuid, "connection: socket timeout");
    });
  }


  // Handle incoming data
  private initOnDataHandler() {

    this.tcpConnection.on("data", (chunk: Buffer) => {

      logger.f("silly", this.uuid, "connection: Received data", {
        chunk: chunk.toString('ASCII')
      });

      if (typeof this.buffer === "undefined") {
        // Start a new buffer
        this.buffer = chunk;
      } else {
        // Concat to existing buffer
        this.buffer = Buffer.concat([this.buffer, chunk], this.buffer.length + chunk.length);
      }

      logger.f("silly", this.uuid, "connection: total buffer", {
        chunk: this.buffer.toString('ASCII'),
        match: this.buffer.toString('ASCII').match(this.tcpExtraDataFormatRegex),
        regx: this.tcpExtraDataFormatRegex
      });


      // Match the module data format with the incoming data
      let matches = this.buffer.toString('ASCII').match(this.tcpDataFormatRegex);
      let extraMatches = this.buffer.toString('ASCII').match(this.tcpExtraDataFormatRegex);

      // to keep the cgps response
      let response = null;

      /**
       * When our connection buffer matches a data string WITHOUT extra data
       */
      if(Array.isArray(matches) && matches.length === 2) {


        // We want the datastring itself, which is in match 1
        let match: string = matches[1];

        logger.f("silly", this.uuid, "connection: Matched TCP data format", {
          matches: matches
        });


        // decode the received data
        response = this.decode(match);

        // Delete processed data from buffer
        // We assume our buffer is one ended
        // begin -> "9ihjuwdi9qwdjji ....
        // So we delete from the beginning of the buffer
        // until the end of our data format match
        this.buffer = this.buffer.slice(matches[0].length);


      /**
       *  When our connection buffer matches a data string WITH extra data
       */
      } else if (Array.isArray(extraMatches) && extraMatches.length === 4) {

        // We want the datastring itself, which is in match 1
        let match: string = extraMatches[1];
        let bytesOfData: number = parseInt(extraMatches[2], 10);

        let binaryIndex = this.buffer.toString('ascii').indexOf(extraMatches[3]);

        let sliceBuf = Buffer.from(this.buffer)
        let receivedData: Buffer = sliceBuf.slice(binaryIndex, binaryIndex+bytesOfData);

        logger.f("debug", this.uuid, "connection: Matched TCP extra data format, received upload", {
          bytesOfData: bytesOfData,
          bytesCounted: receivedData.length
        });

        this.emit('extraData', {
          uuid: this.uuid, // Always include this one, so the client can correlate with the logs
          imei: this.imei, // Device imei
          data: receivedData
        });


        this.buffer = this.buffer.slice(extraMatches[0].length);

        // decode the received data
        response = this.decode(match);


      } else {
        // Buffer didn't match anything

        // Protection against buffer overruns, memory blackouts
        if(this.bufferWriteCount >= this.options.maxBufferWrites) {
          this.bufferWriteCount = 0;
          delete this.buffer;
        }
        this.bufferWriteCount++;

        logger.f("silly", this.uuid, "connection: Incomplete buffer", {
          buffer: this.buffer
        });

      }

      // See if we need to respond
      if(response !== null){
        logger.f("debug", this.uuid, "connection: writing", {
          buffer: response
        });
        // Reply to module with response
        this.tcpConnection.write(response);
      }

    });
  }

  private decode(data: string): Buffer {

    this.cgps.ClearResponseActionMembers();

    if(typeof this.imei !== "undefined") {
      // Add imei in data parts
      data = data.replace("|", `${this.imei}|`);
    } else {
      // First time we receive data and we don't have an imei yet
      // So we try to extract the imei
      let imeiData = data.split('|');
      this.imei = imeiData[0];

      logger.f("debug", this.uuid, "connection: Extracted imei", {
        imei: this.imei
      });


      // Makes the module stop sending an imei with each transmission
      this.cgps.mOmitIdentification = true;
    }


    if(!this.cgps.SetHttpData(data)) {
      // Faulty
      logger.f("error", this.uuid, "connection: Invalid data", {
        data: data,
        error: this.cgps.GetLastError()
      });
      return null;
    }

    logger.f("debug", this.uuid, "connection: Decoding data", {
      data: data,
      parts: this.cgps.GetDataPartCount(),
      error: this.cgps.GetLastError()
    });


    /*
     * Loop over data parts and emit an event for each part
     */
    for (let part = 0; part < this.cgps.GetDataPartCount(); part++ ) {
      // try selecting the data part and validate it
      if (!this.cgps.SelectDataPart(part) || !this.cgps.IsValid()) {
        logger.f("error", this.uuid, "connection: Invalid data part", {
          data: data,
          faultyPart: part,
          error: this.cgps.GetLastError()
        });
        continue;
      }
      this.emit('event', {
        cgps: this.cgps, // Expose cgps for decoding user side
        uuid: this.uuid, // Always include this one, so the client can correlate with the logs
        imei: this.imei // Device imei
      });
    }

    // TCP response in binary
    return Buffer.from(this.cgps.BuildResponseTCP(this.cgps.GetDataPartCount()));

  }


  private initOnErrorHandler() {
    this.tcpConnection.on("error", (err) => {
      logger.f('error', this.uuid, "connection: tcpConnectionError ", {
        error: err
      });
    });
  }


  private initRegexes() {

    // Create regexes from module data strings
    this.tcpDataFormatRegex = this.regexFromTcpDataFormat(this.options.tcpDataFormat);
    this.tcpExtraDataFormatRegex = this.regexFromTcpExtraDataFormat(this.options.tcpExtraDataFormat);

  }


  public pushSettings(data: Buffer) {

    if(this.cgps.RequireResponseActionMembersStall()) {
      return false;
    }


    let cgpsSettings = new this.kcs.CGPSsettings();

    // Load settings
    let setRes = cgpsSettings.SetSettingsData(Array.from(data.values()));

    logger.f('error', this.uuid, "connection: pushSettings", {
      crc: cgpsSettings.GetSettingsCRC(),
      error: cgpsSettings.mLastError
    });

    if(!setRes) {
      return false;
    }

    this.cgps.ClearResponseActionMembers();
    this.cgps.mSettings = cgpsSettings.GetSettingsData();

    let response = Buffer.from(this.cgps.BuildResponseTCP(0));
    // See if we need to respond
    if(response !== null){

      logger.f("debug", this.uuid, "connection: pushSettings", {
        buffer: response
      });

      // Reply to module with response
      this.tcpConnection.write(response);

      // Signal that the upload is not stopped by other action members
      // Note that the upload itself wil occur asynchronous;
      return true;
    }

  }


  /*
   * Creates a regex from a tcp data string
   * so we can easily extract data from incoming transmissions
   */
  private regexFromTcpDataFormat(dataString): RegExp {
    return new RegExp(`^${dataString.replace('%s', '([0-9a-zA-Z|_-]+)')}`);
  }

  /*
   * Creates a regex from a tcp extra data string
   * so we can easily extract data from incoming transmissions
   */
  private regexFromTcpExtraDataFormat(dataString): RegExp {
    let ds = dataString.replace('%s', '([0-9a-zA-Z|_-]+)');
    ds = ds.replace('%d', '([0-9]+)')
    ds = ds.replace('%x', '([\u0000-\uffff]+)');
    return new RegExp(`^${ds}$`);
  }


}
