export interface ServerOptions {
  tcpDataFormat: string;
  tcpExtraDataFormat: string;
  socketTimeout: number; // Socket timeout in seconds
  maxBufferWrites: number; // Max buffer writes with no pattern match on the contents
  cgpsPath: string;  // Path to the CGPS file location
}


