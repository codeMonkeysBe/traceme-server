import { writeFile, readFileSync } from "fs";
import { homedir } from "os";

/*
 * Make sure to swap the comments on the next 2 lines
 */

// import { Server, ServerOptions } from "traceme-server";
import { Server, ServerOptions } from "../";

/**
 * Make sure to set ALL required configuration options
 * currently this means all options must be set
 */
const options: ServerOptions = {
  port: 6700, // The port the server listens on
  tcpDataFormat: "%s\n", // Format as defined in section 60 in the settings app.
  tcpExtraDataFormat: "%s\r%d\r%x\n", // Format as defined in section 60 in the settings app.
  socketTimeout: 120, // How long to keep connections open before sending a FIN
  maxBufferWrites: 40, // Number of buffer writes before a buffer is discarded ( make this small if you don't expect extraTcpData )
  cgpsPath: homedir() + "/lib/cgps78/cgps.js" // Path to the downloaded cgps.js file
};

/**
 * Construct a new server which starts listening immediately
 */
const server = new Server(options);

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
      eventId: context.cgps.CanGetEventID() ?  context.cgps.GetEventID() : null,
      switch: context.cgps.GetSwitch(),
      switchData: context.cgps.GetValidSwitchData(),
      coords: context.cgps.CanGetLatLong() ? `${context.cgps.GetLatitudeFloat()}, ${context.cgps.GetLongitudeFloat()}` : null
    });

  });


});


