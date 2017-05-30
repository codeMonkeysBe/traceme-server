# traceme-server

## Server implementation of a TCP server speaking the TraceME protocol.

### Introduction

**Traceme-server** is a library to quickly spin up a TCP server which can listen for incoming connections coming from gps tracking modules made by the Dutch company KCS BV under the [TraceME brand.](https://trace.me/)

It aims to provide a node-esque way of interacting with the gps modules.

Traceme-server is written in typescript but includes transpiled js sources for use in plain js applications as well.


### Why this ?

To provide a less resource expensive way of connecting large pools of TraceME units to a server in contrast to a traditional thread-per-connection architecture.

### Requirements

 - A machine with node.js, npm, typescript
 - A copy of the cgps.js file from the [developers page on the TraceME website](https://trace.me/index.asp?page=devinfo).

### Installation

```bash
npm install traceme-server [--save]
```

### Getting started


```typescript

import { writeFile, readFileSync } from "fs";

import { Server, ServerOptions } from "./traceme-server";

/**
 * Make sure to set ALL required configuration options
 * currently this means all options must be set
 */
const options: ServerOptions = {
  tcpDataFormat: "%s\n", // Format as defined in section 60 in the settings app.
  tcpExtraDataFormat: "%s\r%d\r%x\n", // Format as defined in section 60 in the settings app.
  socketTimeout: 120, // How long to keep connections open before sending a FIN
  maxBufferWrites: 400, // Number of buffer writes before a buffer is discarded ( make this small if you don't expect extraTcpData )
  cgpsPath: "/path/to/file/cgps.js" // Path to the downloaded cgps.js file
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
  conn.on('event', receivedEvent => {

    // Log received data
    console.log({
      imei: receivedEvent.cgps.GetImei(),
      date: receivedEvent.cgps.GetUtcTimeMySQL(),
      eventId: receivedEvent.cgps.CanGetEventID() ?  receivedEvent.cgps.GetEventID() : null,
      switch: receivedEvent.cgps.GetSwitch(),
      switchData: receivedEvent.cgps.GetValidSwitchData(),
      coords: receivedEvent.cgps.CanGetLatLong() ? `${receivedEvent.cgps.GetLatitudeFloat()}, ${receivedEvent.cgps.GetLongitudeFloat()}` : null
    });

  });


  /**
   * Example writing extra data to disk
   */
  conn.on('extraData', receivedEvent => {
    writeFile("/home/user/file.jpg", receivedEvent.data, 'binary', err => {
      // Handle write finish/error
    });
  });


});

// After this call a socket will be opened on tcp port 6700
server.listen(6700);

```


### Examples

For more examples check out the src/examples directory

To run these examples simply clone this repo, do an npm install and

```bash
npm run simple
npm run moresoon
```


### Development

Create a file in the src directory with the filename 'devServer.ts'. Easiest is to copy one of the examples in src/examples/.

To run:

```bash
npm run dev
```


### Small disclaimer

Me or my company codeMonkeys BVBA are in no way affiliated to KCS BV or the TraceME brand. We just like the technology and support customers working with their products.




