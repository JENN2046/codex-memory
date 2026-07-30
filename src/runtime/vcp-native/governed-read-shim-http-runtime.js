'use strict';

const http = require('node:http');

const {
  LIMITS,
  validateGovernedReadAttemptWorkingSet
} = require('../../../packages/chatgpt-r4-contracts');

const MAX_HTTP_BODY_BYTES =
  LIMITS.maxRequestBytes + LIMITS.maxResponseBytes + 64 * 1024;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function safeEqual(left, right) {
  const leftBytes = Buffer.from(String(left || ''), 'utf8');
  const rightBytes = Buffer.from(String(right || ''), 'utf8');
  return leftBytes.length === rightBytes.length &&
    require('node:crypto').timingSafeEqual(leftBytes, rightBytes);
}

function readJsonBody(incoming) {
  return new Promise((resolve, rejectRead) => {
    const chunks = [];
    let bytes = 0;
    incoming.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_HTTP_BODY_BYTES) {
        incoming.destroy();
        rejectRead(codedError('governed_read_shim_request_too_large'));
        return;
      }
      chunks.push(chunk);
    });
    incoming.on('end', () => {
      try {
        resolve(JSON.parse(
          Buffer.concat(chunks, bytes).toString('utf8')
        ));
      } catch {
        rejectRead(codedError('governed_read_shim_request_invalid'));
      }
    });
    incoming.on('error', () => {
      rejectRead(codedError('governed_read_shim_request_invalid'));
    });
  });
}

function sendJson(outgoing, status, value) {
  if (outgoing.destroyed || outgoing.headersSent) return;
  const encoded = Buffer.from(JSON.stringify(value), 'utf8');
  if (encoded.length > MAX_HTTP_BODY_BYTES) {
    outgoing.writeHead(500, { 'cache-control': 'no-store' });
    outgoing.end();
    return;
  }
  outgoing.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': encoded.length,
    'cache-control': 'no-store'
  });
  outgoing.end(encoded);
}

function createGovernedReadShimHttpRuntime({
  leaseWorker,
  runtimeBindingDigest
} = {}) {
  if (!leaseWorker ||
      typeof leaseWorker.execute !== 'function' ||
      typeof leaseWorker.snapshot !== 'function' ||
      typeof runtimeBindingDigest !== 'string' ||
      !DIGEST_PATTERN.test(runtimeBindingDigest)) {
    throw codedError('governed_read_shim_runtime_invalid');
  }
  let started = false;
  let acceptedRequests = 0;
  let rejectedRequests = 0;
  const openSockets = new Set();
  const server = http.createServer(async (incoming, outgoing) => {
    const cancellation = new AbortController();
    const abortRequest = () => {
      if (!cancellation.signal.aborted) cancellation.abort();
    };
    const abortClosedResponse = () => {
      if (!outgoing.writableFinished) abortRequest();
    };
    incoming.once('aborted', abortRequest);
    outgoing.once('close', abortClosedResponse);
    try {
      if (incoming.method !== 'POST' ||
          incoming.url !== '/v1/governed-read-attempt' ||
          !safeEqual(
            incoming.headers['x-governed-runtime-binding'],
            runtimeBindingDigest
          )) {
        throw codedError('governed_read_shim_request_rejected');
      }
      const body = await readJsonBody(incoming);
      if (!exactKeys(body, [
        'authorization',
        'limit',
        'query',
        'working_set'
      ])) {
        throw codedError('governed_read_shim_request_invalid');
      }
      validateGovernedReadAttemptWorkingSet(body.working_set);
      const result = await leaseWorker.execute({
        workingSet: body.working_set,
        authorization: body.authorization,
        query: body.query,
        limit: body.limit,
        signal: cancellation.signal
      });
      if (cancellation.signal.aborted) {
        throw codedError('governed_read_shim_request_cancelled');
      }
      acceptedRequests += 1;
      sendJson(outgoing, 200, result);
    } catch {
      rejectedRequests += 1;
      sendJson(outgoing, 400, {
        error: 'governed_read_shim_request_rejected'
      });
    } finally {
      incoming.off('aborted', abortRequest);
      outgoing.off('close', abortClosedResponse);
    }
  });
  server.on('connection', socket => {
    openSockets.add(socket);
    socket.once('close', () => openSockets.delete(socket));
  });
  server.maxHeadersCount = 32;
  server.headersTimeout = 5_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 1_000;
  server.maxRequestsPerSocket = 1;

  return Object.freeze({
    async start() {
      if (started) throw codedError('governed_read_shim_already_started');
      await new Promise((resolve, rejectStart) => {
        const onError = error => {
          server.off('listening', onListening);
          rejectStart(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(0, '127.0.0.1');
      });
      started = true;
      const address = server.address();
      if (!address || typeof address === 'string' ||
          address.address !== '127.0.0.1') {
        throw codedError('governed_read_shim_bind_invalid');
      }
      return Object.freeze({
        endpoint:
          `http://127.0.0.1:${address.port}/v1/governed-read-attempt`
      });
    },
    async stop() {
      if (!started) return;
      for (const socket of openSockets) socket.destroy();
      await new Promise((resolve, rejectStop) => {
        server.close(error => error ? rejectStop(error) : resolve());
      });
      started = false;
    },
    snapshot() {
      return Object.freeze({
        component: 'governed_read_persistent_shim_http',
        started,
        accepted_requests: acceptedRequests,
        rejected_requests: rejectedRequests,
        loopback_only: true,
        durable_request_state_written: false,
        request_bodies_logged: 0,
        response_bodies_logged: 0,
        runtime_binding_disclosed: false,
        lease_worker: leaseWorker.snapshot()
      });
    }
  });
}

module.exports = {
  MAX_HTTP_BODY_BYTES,
  createGovernedReadShimHttpRuntime
};
