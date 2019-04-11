"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const traceme_server_1 = require("traceme-server");
const logger_1 = require("./logger");
const redis_store_1 = require("./redis.store");
class Child {
    constructor(config) {
        logger_1.logger.debug(`Child forked with pid ${process.pid}`);
        // Create a new traceme server
        this.server = new traceme_server_1.Server(config.tracemeOptions);
        // Initialize a new store for redis access
        this.store = new redis_store_1.RedisStore(config.redisPort);
        // Init connection handlers to the traceme server
        this.initConnectionHandler();
        // Start listening on port x
        this.server.listen(config.port);
        // On interaction from parent process
        process.on("message", msg => {
            logger_1.logger.debug("message from parent: " + msg);
        });
    }
    initConnectionHandler() {
        /**
         * On new connections
         */
        this.server.on("connection", conn => {
            const ramService = conn.getResponseActionMemberService();
            logger_1.logger.debug("connection on " + process.pid);
            /**
             * Add connection to redis, for real time tracking
             */
            this.store.addConnection({
                uuid: conn.uuid,
                remoteIp: conn.tcpConnection.remoteAddress,
                remotePort: conn.tcpConnection.remotePort,
                localIp: conn.tcpConnection.localAddress,
                localPort: conn.tcpConnection.localPort
            });
            ramService.registerCustomResponseGenerator("m32BitFlashTable", payload => {
                const version = ramService.getFreeDownloadSlot();
                // Add the file to the list of downloads
                ramService.addDownloadFile(payload, version);
                // End the connection with the instruction to download file with version xxx
                conn.end(Buffer.from(`\r\n*A#H${version}#\r\n`));
                // Return true to the response action member service to flag that this
                // Action was applied successfully
                return true;
            });
            /**
             * When the imei of a device is known
             */
            conn.on("imei", imei => {
                this.store.addConnectionImei(conn.uuid, imei);
            });
            conn.on("acked", ack => {
                // Everything is acked, transmission is complete. We push the transmission to the q
                this.store.pushTransmissionQ(ack.tsUuid, ack.imei, ack.totalParts);
                this.applyResponseActionMembers(ack.imei, conn);
            });
            /**
             * Event fired on each event we receive
             */
            conn.on("event", receivedEvent => {
                let storeEvent = {
                    dataString: receivedEvent.cgps.GetHttpData(),
                    connUuid: conn.uuid,
                    tsUuid: receivedEvent.tsUuid,
                    tsTime: receivedEvent.tsTime,
                    imei: receivedEvent.imei // Imei
                };
                /**
                 * Push each received event to the redis queue, to be processed in another process.
                 */
                this.store
                    .pushEvent(storeEvent)
                    .then(() => {
                    // Ack that we received this event to the socket server
                    conn.ack(receivedEvent.tsUuid);
                    logger_1.logger.f("info", receivedEvent.tsUuid, "event stored", storeEvent);
                })
                    .catch(err => {
                    logger_1.logger.f("error", receivedEvent.tsUuid, "Something went wrong storing event", {
                        err: err
                    });
                });
            });
            /**
             * Connection handlers
             */
            conn.on("timeout", () => {
                logger_1.logger.info(`Connection timeout: ${conn.uuid}`);
                this.store.removeConnection(conn.uuid);
            });
            conn.on("error", () => {
                logger_1.logger.info(`Connection error: ${conn.uuid}`);
                this.store.removeConnection(conn.uuid);
            });
            conn.on("close", () => {
                logger_1.logger.info(`Connection closed: ${conn.uuid}`);
                this.store.removeConnection(conn.uuid);
            });
            conn.on("end", () => {
                logger_1.logger.info(`Connection ended: ${conn.uuid}`);
                // A connection end is followed by a close or timeout, and those already remove the connection
                // this.store.removeConnection(conn.uuid);
            });
        });
    }
    applyResponseActionMembers(imei, conn) {
        // Checking for action response members ( mSettings, mActionID, etc ... )
        this.store.getResponseActionMembers(imei).then(responseActionMembers => {
            // No need to process when we don't have response action members
            if (responseActionMembers.length === 0) {
                return;
            }
            // Iterate over members to set
            responseActionMembers.forEach((responseActionMember) => {
                let payload = null;
                switch (responseActionMember.type) {
                    case "boolean":
                        payload = responseActionMember.payload == 1 ? true : false;
                        break;
                    case "base64":
                        payload = Buffer.from(responseActionMember.payload, "base64");
                        break;
                    case "number":
                        payload = responseActionMember.payload;
                        break;
                }
                // If payload is sucess, we can send. If not already sent ofcourse
                if (payload !== null &&
                    typeof responseActionMember.processed === "undefined") {
                    conn.addResponseActionMember(responseActionMember.action, payload, responseActionMember.extra);
                }
            });
            // Try to execute
            let appliedMembers = conn.applyResponseActionMembers();
            // Check results and cleanup if success
            appliedMembers.forEach(appliedMember => {
                if (appliedMember.result) {
                    logger_1.logger.f("debug", conn.uuid, "applyResponseActionMember result", {
                        appliedMember: appliedMember
                    });
                    if (typeof appliedMember.extra.cleanup !== "undefined" &&
                        appliedMember.extra.cleanup) {
                        this.store.cleanupResponseActionMembers(imei, appliedMember);
                    }
                    else {
                        this.store.markResponseActionMemberForCleanup(imei, appliedMember);
                    }
                }
            });
        });
    }
}
exports.Child = Child;
//# sourceMappingURL=simple.js.map