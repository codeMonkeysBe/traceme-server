import { EventEmitter } from "events";
import { Server as TcpServer, createServer, Socket } from "net";

import { ServerOptions } from "./server-options.model";
import { ConnectionOptions } from "./connection-options.model";
import { Connection } from "./connection";
import { logger } from "./logger";
import { loadKcsCode } from "./kcs";


// Represents a TCP server that talks the talk
export class Server extends EventEmitter {

  private tcpServer: TcpServer;

  private kcs: any;

  constructor(
    private options: ServerOptions
  ) {
    // We are an event emitter
    super();

    this.kcs = loadKcsCode(options.cgpsPath);

    // Create tcp server that waits for connections coming from the modules
    this.tcpServer = createServer();

    this.tcpServer.listen(options.port);

    // Binding handlers
    this.tcpServer.on("connection", (conn: Socket) => {

      // Pass options to connection
      this.emit("connection", new Connection(conn, this.kcs, {
        tcpDataFormat: options.tcpDataFormat,
        tcpExtraDataFormat: options.tcpExtraDataFormat,
        socketTimeout: options.socketTimeout,
        maxBufferWrites: options.maxBufferWrites
      }));

    });

    this.tcpServer.on("close", () => {
      this.emit("close");
    });
    this.tcpServer.on("listening", () => {
      logger.info("server: Server started");
      this.emit("listening");

    });
    this.tcpServer.on("error", (err: Error) => {
      this.emit("error", err);
    });



  }



}
