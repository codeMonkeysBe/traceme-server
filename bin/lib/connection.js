"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const uuid = require("uuid");
const logger_1 = require("./logger");
class Connection extends events_1.EventEmitter {
    constructor(tcpConnection, kcs, options) {
        // We are an event emitter
        super();
        this.tcpConnection = tcpConnection;
        this.kcs = kcs;
        this.options = options;
        // Keep track of buffer writes
        this.bufferWriteCount = 0;
        this.cgps = new this.kcs.CGPS();
        // Setting the socket timeout, converting seconds to the socket expected milliseconds
        this.tcpConnection.setTimeout(options.socketTimeout * 1000);
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
        logger_1.logger.f('info', this.uuid, "connection: New connection ", {
            addr: this.tcpConnection.localAddress,
            port: this.tcpConnection.localPort,
            raddr: this.tcpConnection.remoteAddress,
            rport: this.tcpConnection.remotePort,
            fam: this.tcpConnection.remoteFamily,
        });
    }
    // On socket fully closed
    initOnCloseHandler() {
        this.tcpConnection.on("close", () => {
            logger_1.logger.f("info", this.uuid, "connection: socket close");
        });
        this.emit("close");
    }
    // When other end sends a FIN packet to close the conn
    initOnEndHandler() {
        this.tcpConnection.on("end", () => {
            logger_1.logger.f("verbose", this.uuid, "connection: socket end, received fin, returning fin");
            // Return the fin
            this.tcpConnection.end();
        });
        this.emit("end");
    }
    // When the socket timeouts.
    initOnTimeoutHandler() {
        this.tcpConnection.on("timeout", () => {
            this.tcpConnection.end();
            logger_1.logger.f("info", this.uuid, "connection: socket timeout");
        });
        this.emit("timeout");
    }
    // Handle incoming data
    initOnDataHandler() {
        this.tcpConnection.on("data", (chunk) => {
            logger_1.logger.f("silly", this.uuid, "connection: Received data", {
                chunk: chunk.toString('ASCII')
            });
            if (typeof this.buffer === "undefined") {
                // Start a new buffer
                this.buffer = chunk;
            }
            else {
                // Concat to existing buffer
                this.buffer = Buffer.concat([this.buffer, chunk], this.buffer.length + chunk.length);
            }
            logger_1.logger.f("silly", this.uuid, "connection: total buffer", {
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
            if (Array.isArray(matches) && matches.length === 2) {
                // We want the datastring itself, which is in match 1
                let match = matches[1];
                logger_1.logger.f("silly", this.uuid, "connection: Matched TCP data format", {
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
            }
            else if (Array.isArray(extraMatches) && extraMatches.length === 4) {
                // We want the datastring itself, which is in match 1
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
                // decode the received data
                response = this.decode(match);
            }
            else {
                // Buffer didn't match anything
                // Protection against buffer overruns, memory blackouts
                if (this.bufferWriteCount >= this.options.maxBufferWrites) {
                    this.bufferWriteCount = 0;
                    delete this.buffer;
                }
                this.bufferWriteCount++;
                logger_1.logger.f("silly", this.uuid, "connection: Incomplete buffer", {
                    buffer: this.buffer
                });
            }
            // See if we need to respond
            if (response !== null) {
                logger_1.logger.f("debug", this.uuid, "connection: writing", {
                    buffer: response
                });
                // Reply to module with response
                this.tcpConnection.write(response);
            }
        });
    }
    decode(data) {
        this.cgps.ClearResponseActionMembers();
        if (typeof this.imei !== "undefined") {
            // Add imei in data parts
            data = data.replace("|", `${this.imei}|`);
        }
        else {
            // First time we receive data and we don't have an imei yet
            // So we try to extract the imei
            let imeiData = data.split('|');
            this.imei = imeiData[0];
            logger_1.logger.f("debug", this.uuid, "connection: Extracted imei", {
                imei: this.imei
            });
            // Makes the module stop sending an imei with each transmission
            this.cgps.mOmitIdentification = true;
        }
        if (!this.cgps.SetHttpData(data)) {
            // Faulty
            logger_1.logger.f("error", this.uuid, "connection: Invalid data", {
                data: data,
                error: this.cgps.GetLastError()
            });
            return null;
        }
        logger_1.logger.f("debug", this.uuid, "connection: Decoding data", {
            data: data,
            parts: this.cgps.GetDataPartCount(),
            error: this.cgps.GetLastError()
        });
        /*
         * Loop over data parts and emit an event for each part
         */
        for (let part = 0; part < this.cgps.GetDataPartCount(); part++) {
            // try selecting the data part and validate it
            if (!this.cgps.SelectDataPart(part) || !this.cgps.IsValid()) {
                logger_1.logger.f("error", this.uuid, "connection: Invalid data part", {
                    data: data,
                    faultyPart: part,
                    error: this.cgps.GetLastError()
                });
                continue;
            }
            this.emit('event', {
                cgps: this.cgps,
                uuid: this.uuid,
                imei: this.imei // Device imei
            });
        }
        // TCP response in binary
        return Buffer.from(this.cgps.BuildResponseTCP(this.cgps.GetDataPartCount()));
    }
    initOnErrorHandler() {
        this.tcpConnection.on("error", (err) => {
            logger_1.logger.f('error', this.uuid, "connection: tcpConnectionError ", {
                error: err
            });
            this.emit("error", err);
        });
    }
    initRegexes() {
        // Create regexes from module data strings
        this.tcpDataFormatRegex = this.regexFromTcpDataFormat(this.options.tcpDataFormat);
        this.tcpExtraDataFormatRegex = this.regexFromTcpExtraDataFormat(this.options.tcpExtraDataFormat);
    }
    pushSettings(data) {
        if (this.cgps.RequireResponseActionMembersStall()) {
            return false;
        }
        let cgpsSettings = new this.kcs.CGPSsettings();
        // Load settings
        let setRes = cgpsSettings.SetSettingsData(Array.from(data.values()));
        logger_1.logger.f('debug', this.uuid, "connection: pushSettings", {
            crc: cgpsSettings.GetSettingsCRC(),
            error: cgpsSettings.mLastError
        });
        if (!setRes) {
            return false;
        }
        this.cgps.ClearResponseActionMembers();
        this.cgps.mSettings = cgpsSettings.GetSettingsData();
        let response = Buffer.from(this.cgps.BuildResponseTCP(0));
        // See if we need to respond
        if (response !== null) {
            logger_1.logger.f("debug", this.uuid, "connection: pushSettings", {
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
    regexFromTcpDataFormat(dataString) {
        return new RegExp(`^${dataString.replace('%s', '([0-9a-zA-Z|_-]+)')}`);
    }
    /*
     * Creates a regex from a tcp extra data string
     * so we can easily extract data from incoming transmissions
     */
    regexFromTcpExtraDataFormat(dataString) {
        let ds = dataString.replace('%s', '([0-9a-zA-Z|_-]+)');
        ds = ds.replace('%d', '([0-9]+)');
        ds = ds.replace('%x', '([\u0000-\uffff]+)');
        return new RegExp(`^${ds}$`);
    }
}
exports.Connection = Connection;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ubmVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWIvY29ubmVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLG1DQUFzQztBQUV0Qyw2QkFBNkI7QUFFN0IscUNBQWtDO0FBR2xDLGdCQUF3QixTQUFRLHFCQUFZO0lBcUIxQyxZQUNVLGFBQXFCLEVBQ3JCLEdBQVEsRUFDUixPQUEwQjtRQUVsQywwQkFBMEI7UUFDMUIsS0FBSyxFQUFFLENBQUM7UUFMQSxrQkFBYSxHQUFiLGFBQWEsQ0FBUTtRQUNyQixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsWUFBTyxHQUFQLE9BQU8sQ0FBbUI7UUFoQnBDLDhCQUE4QjtRQUN0QixxQkFBZ0IsR0FBVyxDQUFDLENBQUM7UUFvQm5DLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRWhDLHFGQUFxRjtRQUNyRixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsYUFBYSxHQUFDLElBQUksQ0FBQyxDQUFDO1FBRTFELHNFQUFzRTtRQUN0RSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUV0Qiw0Q0FBNEM7UUFDNUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRW5COztXQUVHO1FBRUgscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLHlDQUF5QztRQUN6QyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztRQUMxQix5QkFBeUI7UUFDekIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDMUIsb0RBQW9EO1FBQ3BELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3hCLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUU1QixlQUFNLENBQUMsQ0FBQyxDQUFD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