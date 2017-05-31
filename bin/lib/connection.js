"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const uuid = require("uuid");
const logger_1 = require("./logger");
const response_action_member_service_1 = require("./response-action-member.service");
;
class Connection extends events_1.EventEmitter {
    constructor(tcpConnection, kcs, // Passed as construction argument because this is dynamically loaded
        options) {
        // We are an event emitter
        super();
        this.tcpConnection = tcpConnection;
        this.kcs = kcs;
        this.options = options;
        // Each event needs to be acked before we can respond to the device with an ack
        this.ackCounters = {};
        this.cgps = new this.kcs.CGPS();
        // Constructing the service that sets and checks ->m... actions
        this.responseActionMemberService = new response_action_member_service_1.ResponseActionMemberService(this.cgps, this.kcs);
        // Setting the socket timeout, converting seconds to the socket expected milliseconds
        this.tcpConnection.setTimeout(options.socketTimeout * 1000);
        // Unique identifier for each connection ( good for logging purposes )
        this.uuid = uuid.v4();
        /*
         * Creates a regex from a tcp data string
         * so we can easily extract data from incoming transmissions
         */
        this.tcpDataFormatRegex = new RegExp(`^${this.options.tcpDataFormat.replace('%s', '([0-9a-zA-Z|_-]+)')}`);
        /*
         * Creates a regex from a tcp extra data string
         * so we can easily extract data from incoming transmissions
         */
        let ds = this.options.tcpExtraDataFormat
            .replace('%s', '([0-9a-zA-Z|_-]+)')
            .replace('%d', '([0-9]+)')
            .replace('%x', '([\u0000-\uffff]+)');
        this.tcpExtraDataFormatRegex = new RegExp(`^${ds}$`);
        /*
         * Initialize tcp handlers
         */
        // handler that handles incoming data
        this.initConnectionHandlers();
        // Log the new connection so we know something happened
        logger_1.logger.f('info', this.uuid, "connection: New connection ", {
            addr: this.tcpConnection.localAddress,
            port: this.tcpConnection.localPort,
            raddr: this.tcpConnection.remoteAddress,
            rport: this.tcpConnection.remotePort,
            fam: this.tcpConnection.remoteFamily,
        });
    }
    // Add a single response action member
    addResponseActionMember(action, payload) {
        return this.responseActionMemberService.add(action, payload);
    }
    applyResponseActionMembers() {
        let responseActionMemberResults = this.responseActionMemberService.applyResponseActionMembers();
        logger_1.logger.f("debug", this.uuid, "connection: applyResponseActionMembers", {
            results: responseActionMemberResults,
            cgps: this.cgps
        });
        // Try to send the response now
        this.sendResponse();
        // Return the members and their results
        return responseActionMemberResults;
    }
    // Handle incoming data
    initConnectionHandlers() {
        this.tcpConnection.on("data", (chunk) => {
            logger_1.logger.f("silly", this.uuid, "connection: Received data", {
                chunk: chunk.toString('ASCII')
            });
            // Start a new buffer if necesarry
            if (typeof this.buffer === "undefined") {
                // Start a new buffer
                this.buffer = chunk;
            }
            else {
                // Concat to existing buffer
                this.buffer = Buffer.concat([this.buffer, chunk], this.buffer.length + chunk.length);
            }
            if (this.buffer.length > this.options.maxBufferSize) {
                logger_1.logger.f("error", this.uuid, "connection: maxBufferSize exeeded, closing the connection", {
                    buffer: this.buffer.toString('ASCII')
                });
                // Close up the connection
                delete this.buffer;
                this.tcpConnection.end();
                return;
            }
            logger_1.logger.f("debug", this.uuid, "connection: total buffer", {
                chunk: this.buffer.toString('ASCII')
            });
            // Match the module data format with the incoming data
            // If matches has results we know we have a regular data string
            let matches = this.buffer.toString('ASCII').match(this.tcpDataFormatRegex);
            // If extra matches has results we know we have an extra data string
            let extraMatches = this.buffer.toString('ASCII').match(this.tcpExtraDataFormatRegex);
            /**
             * When our connection buffer matches a data string WITHOUT extra data
             */
            if (Array.isArray(matches) && matches.length === 2) {
                // We want the datastring itself, which is in match 1
                // the first matching parentheses of the tcpDataFormatRegex
                let match = matches[1];
                logger_1.logger.f("silly", this.uuid, "connection: Matched TCP data format", {
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
            }
            else if (Array.isArray(extraMatches) && extraMatches.length === 4) {
                // We want the datastring itself, which is in match 1
                // the first matching parentheses of the tcpExtraDataFormat
                let match = extraMatches[1];
                let bytesOfData = parseInt(extraMatches[2], 10);
                let binaryIndex = this.buffer.toString('ascii').indexOf(extraMatches[3]);
                let sliceBuf = Buffer.from(this.buffer);
                let receivedData = sliceBuf.slice(binaryIndex, binaryIndex + bytesOfData);
                logger_1.logger.f("debug", this.uuid, "connection: Matched TCP extra data format, received upload", {
                    bytesOfData: bytesOfData,
                    bytesCounted: receivedData.length
                });
                this.emit('extraData', {
                    uuid: this.uuid,
                    imei: this.imei,
                    data: receivedData
                });
                this.buffer = this.buffer.slice(extraMatches[0].length);
                // processDataString the received data
                this.processDataString(match);
            }
        });
        this.tcpConnection.on("close", () => {
            logger_1.logger.f("info", this.uuid, "connection: socket close");
            this.emit("close");
        });
        this.tcpConnection.on("end", () => {
            logger_1.logger.f("verbose", this.uuid, "connection: socket end, received fin, returning fin");
            // Return the fin
            this.tcpConnection.end();
            this.emit("end");
        });
        this.tcpConnection.on("timeout", () => {
            this.tcpConnection.end();
            logger_1.logger.f("info", this.uuid, "connection: socket timeout");
            this.emit("timeout");
        });
        this.tcpConnection.on("error", (err) => {
            logger_1.logger.f('error', this.uuid, "connection: tcpConnectionError ", {
                error: err
            });
            this.emit("error", err);
        });
    }
    processDataString(dataString) {
        // Place to store the extracted imei
        let transmittedImei;
        // Extract the imei in match array
        let imeiMatches = dataString.match(/^(\d+)\|/);
        if (imeiMatches && typeof imeiMatches[1] !== "undefined") {
            transmittedImei = imeiMatches[1];
        }
        // Already got the imei
        if (typeof this.imei !== "undefined") {
            // Odd, we shouldn't receive the imei again.
            // Could be that the module didn't receive our first ack yet for omitting the identification
            if (typeof transmittedImei !== "undefined") {
                // Processing as usual but checking the dataString for a imei validation
                if (transmittedImei !== this.imei) {
                    // Very strange, we received a different imei then before.
                    logger_1.logger.f("error", this.uuid, "connection: Extracted imei from transmission did not match imei set on connection", {
                        connectionImei: this.imei,
                        transmittedImei: transmittedImei,
                    });
                    // Kill the connection at once.
                    this.tcpConnection.destroy("imei mismatch on connection");
                }
            }
            else {
                // Make whole module dataString strings
                dataString = dataString.replace(/^\d*\|/, `${this.imei}|`);
            }
        }
        else {
            this.imei = transmittedImei;
            logger_1.logger.f("debug", this.uuid, "connection: Extracted imei from transmission", {
                imei: this.imei
            });
            // Report that we have the imei
            this.emit('imei', this.imei);
        }
        // Makes the module stop sending an imei with each transmission
        this.cgps.mOmitIdentification = true;
        if (!this.cgps.SetHttpData(dataString)) {
            // Faulty
            logger_1.logger.f("error", this.uuid, "connection: Invalid dataString", {
                dataString: dataString,
                error: this.cgps.GetLastError()
            });
            return null;
        }
        let totalParts = this.cgps.GetDataPartCount();
        logger_1.logger.f("debug", this.uuid, "connection: Decoding dataString", {
            dataString: dataString,
            parts: totalParts,
            error: this.cgps.GetLastError()
        });
        // Generate unique ack id for each incoming transmission.
        let tsUuid = uuid.v4();
        this.ackCounters[tsUuid] = {
            parts: totalParts,
            ackedParts: 0
        };
        // Transmission date
        let tsDate = new Date();
        /*
         * Loop over data parts and emit an event for each part
         */
        for (let part = 0; part < totalParts; part++) {
            // try selecting the data part and validate it
            if (!this.cgps.SelectDataPart(part) || !this.cgps.IsValid()) {
                logger_1.logger.f("error", this.uuid, "connection: Invalid data part", {
                    dataString: dataString,
                    imei: this.imei,
                    uuid: tsUuid,
                    time: tsDate.toISOString(),
                    faultyPart: part,
                    error: this.cgps.GetLastError() // The errror message
                });
                continue;
            }
            this.emit('event', {
                cgps: this.cgps,
                imei: this.imei,
                tsUuid: tsUuid,
                tsTime: tsDate.toISOString(),
                totalParts: totalParts,
                currentPart: part // Partnumber of current part
            });
        }
    }
    // Ack an individual event in a transmission
    ack(tsUuid) {
        if (typeof this.ackCounters[tsUuid] === "undefined") {
            logger_1.logger.f('error', this.uuid, "connection: unkown ack ID ", {
                tsUuid: tsUuid
            });
            return;
        }
        this.ackCounters[tsUuid].ackedParts++;
        if (this.ackCounters[tsUuid].ackedParts === this.ackCounters[tsUuid].parts) {
            this.sendResponse(this.ackCounters[tsUuid].ackedParts);
            // Clean up
            delete this.ackCounters[tsUuid];
        }
        // Return true if ack worked
        return true;
    }
    sendResponse(ackedParts = 0) {
        let runningTransmissions = Object.keys(this.ackCounters);
        // Do net send when a transmission is in progress.
        // Response will be send anyway
        if (ackedParts === 0 && runningTransmissions.length !== 0) {
            return false;
        }
        let response = Buffer.from(this.cgps.BuildResponseTCP(ackedParts));
        // See if we need to respond
        if (response !== null) {
            logger_1.logger.f("debug", this.uuid, "connection: sendingResponse", {
                buffer: response,
                bufferString: response.toString('utf-8')
            });
            // Reply to module with response
            this.tcpConnection.write(response);
            // Do this at end of each transmission
            this.cgps.ClearResponseActionMembers();
        }
        return true;
    }
}
exports.Connection = Connection;
//# sourceMappingURL=connection.js.map