'use strict';

const net = require('node:net');

const { LIMITS, reject } = require('../../packages/chatgpt-r4-contracts');

const MAX_UDS_REQUEST_BYTES = LIMITS.maxRequestBytes + 8192;
const MAX_UDS_RESPONSE_BYTES = LIMITS.maxResponseBytes;

function createUdsForwarder({
  socketPath,
  timeoutMs = 2_000,
  maxResponseBytes = MAX_UDS_RESPONSE_BYTES
} = {}) {
  if (typeof socketPath !== 'string' || !socketPath.startsWith('/') || socketPath.includes('\0')) {
    reject('relay_uds_path_invalid');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 30_000) {
    reject('relay_uds_timeout_invalid');
  }
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > MAX_UDS_RESPONSE_BYTES) {
    reject('relay_uds_response_limit_invalid');
  }

  return function forwardToUds(payload, { signal } = {}) {
    const encoded = Buffer.from(`${JSON.stringify(payload)}\n`, 'utf8');
    if (encoded.length > MAX_UDS_REQUEST_BYTES) reject('relay_uds_request_too_large');

    return new Promise((resolve, rejectForward) => {
      let settled = false;
      let bytes = 0;
      const chunks = [];
      const socket = net.createConnection({ path: socketPath });
      const timer = setTimeout(() => fail('relay_uds_timeout'), timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }

      function fail(code, cause) {
        if (settled) return;
        settled = true;
        cleanup();
        socket.destroy();
        rejectForward(Object.assign(new Error(code), { code, cause }));
      }

      function onAbort() {
        fail('relay_cancelled');
      }

      if (signal?.aborted) {
        fail('relay_cancelled');
        return;
      }
      signal?.addEventListener('abort', onAbort, { once: true });
      socket.on('connect', () => socket.write(encoded));
      socket.on('data', chunk => {
        if (settled) return;
        bytes += chunk.length;
        if (bytes > maxResponseBytes) {
          fail('relay_uds_response_too_large');
          return;
        }
        chunks.push(chunk);
      });
      socket.on('end', () => {
        if (settled) return;
        const text = Buffer.concat(chunks, bytes).toString('utf8');
        const newline = text.indexOf('\n');
        if (newline === -1) {
          fail('relay_uds_response_incomplete');
          return;
        }
        if (newline !== text.length - 1 || text.indexOf('\n', newline + 1) !== -1) {
          fail('relay_uds_response_framing_invalid');
          return;
        }
        try {
          const parsed = JSON.parse(text.slice(0, newline));
          settled = true;
          cleanup();
          resolve(parsed);
        } catch (error) {
          fail('relay_uds_response_invalid', error);
        }
      });
      socket.on('error', error => {
        if (!settled) fail('relay_uds_unavailable', error);
      });
    });
  };
}

module.exports = {
  MAX_UDS_REQUEST_BYTES,
  MAX_UDS_RESPONSE_BYTES,
  createUdsForwarder
};
