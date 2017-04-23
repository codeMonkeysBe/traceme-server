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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYi9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtQ0FBc0M7QUFDdEMsNkJBQWdFO0FBSWhFLDZDQUEwQztBQUMxQyxxQ0FBa0M7QUFDbEMsK0JBQW9DO0FBR3BDLDhDQUE4QztBQUM5QyxZQUFvQixTQUFRLHFCQUFZO0lBTXRDLFlBQ1UsT0FBc0I7UUFFOUIsMEJBQTBCO1FBQzFCLEtBQUssRUFBRSxDQUFDO1FBSEEsWUFBTyxHQUFQLE9BQU8sQ0FBZTtRQUs5QixJQUFJLENBQUMsR0FBRyxHQUFHLGlCQUFXLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXpDLHVFQUF1RTtRQUN2RSxJQUFJLENBQUMsU0FBUyxHQUFHLGtCQUFZLEVBQUUsQ0FBQztRQUdoQyxtQkFBbUI7UUFDbkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBWTtZQUUzQyw2QkFBNkI7WUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSx1QkFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNyRCxhQUFhLEVBQUUsT0FBTyxDQUFDLGFBQWE7Z0JBQ3BDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxrQkFBa0I7Z0JBQzlDLGFBQWEsRUFBRSxPQUFPLENBQUMsYUFBYTtnQkFDcEMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlO2FBQ3pDLENBQUMsQ0FBQyxDQUFDO1FBRU4sQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUU7WUFDekIsZUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQzdCLGVBQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBVTtZQUNwQyxlQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO2dCQUNwQyxLQUFLLEVBQUUsR0FBRzthQUNYLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQztJQUVELDRCQUE0QjtJQUM1QixtRUFBbUU7SUFDbkUsTUFBTSxDQUFDLEdBQUcsSUFBSTtRQUNaLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDaEMsQ0FBQztDQUVGO0FBdERELHdCQXNEQyJ9