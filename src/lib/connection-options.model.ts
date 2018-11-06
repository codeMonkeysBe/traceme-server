export interface ConnectionOptions {
  tcpDataFormat: string;
  tcpExtraDataFormat: string;
  socketTimeout: number; // Socket timeout in seconds
  maxBufferSize: number; // // Max buffer size in bytes
}
