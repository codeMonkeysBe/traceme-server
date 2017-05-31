export interface ServerOptions {
  tcpDataFormat: string;
  tcpExtraDataFormat: string;
  socketTimeout: number; // Socket timeout in seconds
  maxBufferSize: number; // Max buffer size in bytes
  cgpsPath: string;  // Path to the CGPS file location
}


