'use strict';

const net = require('node:net');

const { LIMITS, reject } = require('../../packages/chatgpt-r4-contracts');

const MAX_UDS_REQUEST_BYTES = LIMITS.maxRequestBytes + 8192;
const MAX_UDS_RESPONSE_BYTES = LIMITS.maxResponseBytes;
const DEFAULT_UDS_TIMEOUT_MS = 15_000;

function createUdsForwarder({
  socketPath,
  timeoutMs = DEFAULT_UDS_TIMEOUT_MS,
  maxResponseBytes = MAX_UDS_RESPONSE_BYTES,
  verifyUdsListenerOwner = null
} = {}) {
  if (typeof socketPath !== 'string' || !socketPath.startsWith('/') || socketPath.includes('\0')) {
    reject('relay_uds_path_invalid');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60_000) {
    reject('relay_uds_timeout_invalid');
  }
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > MAX_UDS_RESPONSE_BYTES) {
    reject('relay_uds_response_limit_invalid');
  }
  if (verifyUdsListenerOwner !== null &&
      typeof verifyUdsListenerOwner !== 'function') {
    reject('relay_uds_listener_verifier_invalid');
  }

  return function forwardToUds(payload, { signal } = {}) {
    const encoded = Buffer.from(`${JSON.stringify(payload)}\n`, 'utf8');
    if (encoded.length > MAX_UDS_REQUEST_BYTES) reject('relay_uds_request_too_large');

    return new Promise((resolve, rejectForward) => {
      let settled = false;
      let bytes = 0;
      const chunks = [];
      let socket = null;
      let timer = null;

      function cleanup() {
        if (timer !== null) clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }

      function fail(code, cause) {
        if (settled) return;
        settled = true;
        cleanup();
        socket?.destroy();
        rejectForward(Object.assign(new Error(code), { code, cause }));
      }

      function onAbort() {
        fail('relay_cancelled');
      }

      function parseFrame({ endOfStream = false } = {}) {
        if (settled) return;
        const frame = Buffer.concat(chunks, bytes);
        const newline = frame.indexOf(0x0a);
        if (newline === -1) {
          if (endOfStream) fail('relay_uds_response_incomplete');
          return;
        }
        if (newline !== frame.length - 1) {
          fail('relay_uds_response_framing_invalid');
          return;
        }
        try {
          const parsed = JSON.parse(frame.subarray(0, newline).toString('utf8'));
          settled = true;
          cleanup();
          socket.destroy();
          resolve(parsed);
        } catch (error) {
          fail('relay_uds_response_invalid', error);
        }
      }

      if (signal?.aborted) {
        fail('relay_cancelled');
        return;
      }
      if (!listenerOwnerVerified()) {
        fail('relay_uds_listener_identity_mismatch');
        return;
      }
      signal?.addEventListener('abort', onAbort, { once: true });
      try {
        socket = net.createConnection({ path: socketPath });
      } catch (error) {
        fail('relay_uds_unavailable', error);
        return;
      }
      timer = setTimeout(() => fail('relay_uds_timeout'), timeoutMs);
      socket.on('connect', () => {
        if (!listenerOwnerVerified()) {
          fail('relay_uds_listener_identity_mismatch');
          return;
        }
        socket.write(encoded);
      });
      socket.on('data', chunk => {
        if (settled) return;
        bytes += chunk.length;
        if (bytes > maxResponseBytes) {
          fail('relay_uds_response_too_large');
          return;
        }
        chunks.push(chunk);
        parseFrame();
      });
      socket.on('end', () => parseFrame({ endOfStream: true }));
      socket.on('error', error => {
        if (!settled) fail('relay_uds_unavailable', error);
      });

      function listenerOwnerVerified() {
        if (verifyUdsListenerOwner === null) return true;
        try {
          return verifyUdsListenerOwner(socketPath) === true;
        } catch {
          return false;
        }
      }
    });
  };
}

module.exports = {
  DEFAULT_UDS_TIMEOUT_MS,
  MAX_UDS_REQUEST_BYTES,
  MAX_UDS_RESPONSE_BYTES,
  createUdsForwarder
};
