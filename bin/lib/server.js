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
        // Binding handlers
        this.tcpServer.on("connection", (tcpConn) => {
            // Pass options to connection
            let conn = new connection_1.Connection(tcpConn, this.kcs, {
                tcpDataFormat: options.tcpDataFormat,
                tcpExtraDataFormat: options.tcpExtraDataFormat,
                socketTimeout: options.socketTimeout,
                maxBufferWrites: options.maxBufferWrites
            });
            // Emit the connection
            this.emit("connection", conn);
        });
        /**
         * TCP Server handlers
         */
        this.tcpServer.on("close", () => {
            logger_1.logger.info("server: close");
            this.emit("close");
        });
        this.tcpServer.on("listening", () => {
            logger_1.logger.info("server: listening");
            this.emit("listening");
        });
        this.tcpServer.on("error", (err) => {
            logger_1.logger.f('error', 'server', "error ", {
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
exports.Server = Server;
//# sourceMappingURL=server.js.map