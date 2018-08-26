import { EventEmitter } from "events";
import { Server as TcpServer, createServer, Socket } from "net";

import { ServerOptions } from "./server-options.model";
import { Connection } from "./connection";
import { logger } from "./logger";
import { loadKcsCode } from "./kcs";

// Represents a TCP server that talks the talk
export class Server extends EventEmitter {
  private tcpServer: TcpServer;

  private kcs: any;

  // Array of files
  private files: any = {};

  constructor(private options: ServerOptions) {
    // We are an event emitter
    super();

    this.kcs = loadKcsCode(options.cgpsPath);

    // Create tcp server that waits for connections coming from the modules
    this.tcpServer = createServer();

    // Binding handlers
    this.tcpServer.on("connection", (tcpConn: Socket) => {
      // Pass options to connection
      let conn = new Connection(tcpConn, this.kcs, {
        tcpDataFormat: options.tcpDataFormat,
        tcpExtraDataFormat: options.tcpExtraDataFormat,
        socketTimeout: options.socketTimeout,
        maxBufferSize: options.maxBufferSize
      });

      // Emit the connection
      this.emit("connection", conn);
    });

    /**
     * TCP Server handlers
     */
    this.tcpServer.on("close", () => {
      logger.info("server: close");
      this.emit("close");
    });
    this.tcpServer.on("listening", () => {
      logger.info("server: listening");
      this.emit("listening");
    });
    this.tcpServer.on("error", (err: Error) => {
      logger.f("error", "server", "error ", {
        error: err
      });
      this.emit("error", err);
    });
  }

  // Node net listen behaviour
  // TODO make transpiler stop complaining about call target mismatch
  listen(...args) {
    this.tcpServer.listen(...args);
  }
}
