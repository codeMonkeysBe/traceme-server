"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
/*
 * Make sure to swap the comments on the next 2 lines
 */
// import { Server, ServerOptions } from "traceme-server";
const _1 = require("../");
/**
 * Make sure to set ALL required configuration options
 * currently this means all options must be set
 */
const options = {
    tcpDataFormat: "%s\n",
    tcpExtraDataFormat: "%s\r%d\r%x\n",
    socketTimeout: 120,
    maxBufferWrites: 40,
    cgpsPath: os_1.homedir() + "/lib/cgps78/cgps.js" // Path to the downloaded cgps.js file
};
/**
 * Construct a new server which starts listening immediately
 */
const server = new _1.Server(options);
/**
 * On each new connection, this callback executes
 */
server.on("connection", conn => {
    /**
     * Context gives access to
     * cgps: the plain cgps class which can be used to read the retrieved data
     * imei: easy access to the imei of the received data
     * uuid: each connections gets a unique identifier assigned, so it is easy to track connections in logfiles, etc.
     */
    conn.on('event', context => {
        // Log received data
        console.log({
            imei: context.cgps.GetImei(),
            date: context.cgps.GetUtcTimeMySQL(),
            eventId: context.cgps.CanGetEventID() ? context.cgps.GetEventID() : null,
            switch: context.cgps.GetSwitch(),
            switchData: context.cgps.GetValidSwitchData(),
            coords: context.cgps.CanGetLatLong() ? `${context.cgps.GetLatitudeFloat()}, ${context.cgps.GetLongitudeFloat()}` : null
        });
    });
});
server.listen(6700);
//# sourceMappingURL=simple.js.map