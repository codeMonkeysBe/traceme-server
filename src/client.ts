import * as net from "net";

import * as fs from "fs";

import { logger } from "./lib/logger";


const client = new net.Socket();

/*

const teststring = `357541000234567|OMQyPg0GL3M1SCFu00hOuw0Riu2f0gj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f0wj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f0Mj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f10j0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f1gj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f1wj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f1Mj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f20j0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f2gj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f2wj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f2Mj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f30j0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f3gj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f3wj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f3Mj0000N801EKe06|OMQyPg0GL3M1SCFu00hOuw0Riu2f40j0000N801EKe06\n`;

client.connect(6700, "192.168.1.238", () => {
  client.write(teststring);
});
*/


let startwith = "358278000654321|OMQUuQ00F55g1R45035LMM00mg682g00Jf0O001R0e0R\r12082\r";

let filestream = fs.createReadStream('/home/niki/projects/socketserver/testfile.jpg');

filestream.on('end', () => {
  client.write('\n');
});


filestream.on('data', data => {
  client.write(data);
  logger.debug(data.toString('hex'));
  logger.debug(data.length);
});

client.connect(6700, "192.168.1.238", () => {
  client.write(startwith);
});

client.on("data", data => {
  console.log("Received: " + data);
});

client.on("close", () => {
  console.log("Connection closed");
});
