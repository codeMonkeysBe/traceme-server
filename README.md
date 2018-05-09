# traceme-server: a node.js traceme IoT gateway

### Introduction

**Traceme-server** is an easy to use node.js [TraceME](https://trace.me/) gateway

It aims to provide a node-esque way of interacting with the traceme gps modules.

Traceme-server is written in typescript but includes transpiled js sources for use in plain js applications as well.


### Why this ?

Traceme units ship with an example gateway written in PHP. While fully functional the example gateway doesn't scale well. It requires a thread per connection for fully functional persistent connections. 

This library takes advantage of the fact that node.js works with an event loop for io, enabling the keep alive of tens of thousands concurrent connections on a single server. 


### Requirements

 - A machine with node.js, npm
 - A copy of the cgps.js file from the [developers page on the TraceME website](https://trace.me/index.asp?page=devinfo).

### Installation

```bash
npm install traceme-server [--save]
```

### Getting started


```typescript
import { writeFile, readFileSync } from "fs";
import { homedir } from "os";

import { Server, ServerOptions } from "traceme-server";

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
 * Construct a new server
 */
const server = new Server(options);

/**
 * Fires every time a new incoming connection is made
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
    // We received this
    console.log(receivedEvent);

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

  /**
   * Fired when extra data like a picture is received.
   */
  conn.on("extraData", receivedData => {
    console.log("extraData", receivedData);
  });

  /**
   * You should handle errors.
   */
  conn.on("error", err => {
    console.log("Handling errors", err);
  });

  /**
   *  When a TCP connection is made we don't know who ( or what ) is connecting.
   * The moment a module identifies itself we emit the identifieing imei
   */
  conn.on("imei", imei => {
    console.log("got imei", imei);
  });
});

// Start listening on
server.listen(6700);


```


### Examples

For more examples check out the src/examples directory

To run these examples simply clone this repo, do an npm install and

```bash
npm run simple
```


### Development

Create a file in the src directory with the filename 'devServer.ts'. Easiest is to copy one of the examples in src/examples/.

To run:

```bash
npm run dev
```