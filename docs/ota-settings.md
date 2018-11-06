```typescript
import * as fs from "fs";

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
  let otaUploadApplied = false;

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

  conn.on("acked", () => {
    if (otaUploadApplied) {
      const tms = fs.readFileSync("/path/to/settings.tms");
      conn.addResponseActionMember("mSettings", tms);
      const appliedMembers = conn.applyResponseActionMembers();
      if (appliedMembers[0].result) {
        otaUploadApplied = true;
      }
    }
  });
});

server.listen(6700);
```
