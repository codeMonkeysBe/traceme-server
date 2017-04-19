"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const net_1 = require("net");
const connection_1 = require("./connection");
const logger_1 = require("./logger");
const kcs_1 = require("./kcs");
// Represents a TCP server that talks the talk
class Server extends events_1.EventEmitter {
    constructor(options) {
        // We are an event emitter
        super();
        this.options = options;
        this.kcs = kcs_1.loadKcsCode(options.cgpsPath);
        // Create tcp server that waits for connections coming from the modules
        this.tcpServer = net_1.createServer();
        this.tcpServer.listen(options.port);
        // Binding handlers
        this.tcpServer.on("connection", (conn) => {
            // Pass options to connection
            this.emit("connection", new connection_1.Connection(conn, this.kcs, {
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
            logger_1.logger.info("server: Server started");
            this.emit("listening");
        });
        this.tcpServer.on("error", (err) => {
            this.emit("error", err);
        });
    }
}
exports.Server = Server;
//# sourceMappingURL=server.js.map