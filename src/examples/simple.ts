import { writeFile, readFileSync } from "fs";
import { homedir } from "os";

/*
 * Make sure to swap the comments on the next 2 lines
 */

// import { Server, ServerOptions } from "traceme-server";
import { Server, ServerOptions, logger } from "../";

logger.level = "debug";

/**
 * Make sure to set ALL required configuration options
 * currently this means all options must be set
 */
const options: ServerOptions = {
  tcpDataFormat: "%s\n", // Format as defined in section 60 in the settings app.
  tcpExtraDataFormat: "%s\r%d\r%x\n", // Format as defined in section 60 in the settings app.
  socketTimeout: 120, // How long to keep connections open before sending a FIN
  maxBufferSize: 4096, // In Bytes. The maximum amount of memory a buffer may contain. Keep this in mind when setting max badge size in section 60 of the settings app
  cgpsPath: homedir() + "/lib/cgps78/cgps-debug.js" // Path to the downloaded cgps.js file
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
   * receivedEvent gives access to
   * imei  : easy access to the imei of the received data
   * cgps  : the plain cgps class which can be used to read the retrieved data
   * uuid  : each connections gets a unique identifier assigned, so it is easy to track connections in logfiles, etc.
   * tsUuid: each transmission has an unique identifier assigned.
   */
  conn.on("event", receivedEvent => {
    // Log received data
    console.log(
      "\n\n",
      {
        imei: receivedEvent.cgps.GetImei(),
        tsUuid: receivedEvent.tsUuid,
        date: receivedEvent.cgps.GetUtcTimeMySQL(),
        eventId: receivedEvent.cgps.CanGetEventID()
          ? receivedEvent.cgps.GetEventID()
          : null,
        switch: receivedEvent.cgps.GetSwitch(),
        switchData: receivedEvent.cgps.GetValidSwitchData(),
        httpData: receivedEvent.cgps.GetHttpData(),
        coords: receivedEvent.cgps.CanGetLatLong()
          ? `${receivedEvent.cgps.GetLatitudeFloat()}, ${receivedEvent.cgps.GetLongitudeFloat()}`
          : null,
        dataBytes: receivedEvent.cgps.CanGetPortData()
          ? receivedEvent.cgps.GetPortDataBytes()
          : null
      },
      "\n\n"
    );

    /**
     * This is IMPORTANT
     *
     * Every event we receive needs to be acknowledged to the connection by calling the conn.ack(tsUuid) method
     * when the connection receives an ack for each event in the transmission,
     * it sends an ack back to the module which in turn removes the transmission data from internal storage.
     *
     */
    conn.ack(receivedEvent.tsUuid);
  });

  conn.on("extraData", receivedData => {
    console.log("extraData", receivedData);
  });

  /**
   * You should
   */
  conn.on("error", err => {
    console.log("Handling errors", err);
  });

  conn.on("imei", imei => {
    console.log("got imei", imei);
  });
});

// Start listening on a certain port
server.listen(6700);


