# traceme-server

## TraceME IoT gateway


```typescript
import { Server, ServerOptions, Connection } from "traceme-server";

const config = {
  tcpDataFormat: "%s\n",
  tcpExtraDataFormat: "%s\r%d\r%x\n",
  socketTimeout: 120,
  maxBufferSize: 4096,
  cgpsPath: "/path/to/cgps.js"
};

const server = new Server(config);

server.on("connection", conn => {
  conn.on("event", receivedEvent => {
    if (receivedEvent.cgps.CanGetLatLong()) {
      console.log(
        `imei: ${receivedEvent.imei}`,
        `lat: ${receivedEvent.cgps.GetLatitudeFLoat()}`,
        `long: ${receivedEvent.cgps.GetLongitudeFloat()}`
      );
    }
    conn.ack(receivedEvent.tsUuid);
  });
});


server.listen(6700);
```

### Introduction

**Traceme-server** is an easy to use node.js [TraceME](https://trace.me/) gateway.

### Requirements

 - [Node.js](https://nodejs.org/en/) installed on your system.1
 - A copy of the cgps.js file from the [developers page on the TraceME website](https://trace.me/index.asp?page=devinfo).

### Installation

```bash
npm install traceme-server --save
```

