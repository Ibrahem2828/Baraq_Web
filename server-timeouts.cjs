// Preloaded by the production image: `node --require ./server-timeouts.cjs server.js`.
//
// Node's http.Server gives a whole request five minutes (requestTimeout) to
// arrive. A 17MB textbook over a ~50KB/s connection needs about six, so the
// server dropped it mid-upload and the student saw a network error. Next.js
// creates its server with http.createServer and exposes no setting for this,
// so it is raised here for every server the process creates.
// headersTimeout stays at Node's default (60s): only the body may be slow.
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS preload, run by node before Next */

const http = require("node:http");

const requestTimeoutMs = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 30 * 60 * 1000);
const createServer = http.createServer;

http.createServer = function createServerWithUploadTimeout(...args) {
  const server = createServer.apply(this, args);
  server.requestTimeout = requestTimeoutMs;
  return server;
};

module.exports = { requestTimeoutMs };
