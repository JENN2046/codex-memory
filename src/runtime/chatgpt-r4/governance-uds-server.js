'use strict';

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const {
  GOVERNED_READ_ATTEMPT_LIMITS,
  LIMITS,
  governedReadAttemptDeadlineBudgetMs,
  reject
} = require('../../../packages/chatgpt-r4-contracts');

const MAX_REQUEST_BYTES = LIMITS.maxRequestBytes +
  GOVERNED_READ_ATTEMPT_LIMITS.protocolBytes + 8192;
const MAX_RESPONSE_BYTES = LIMITS.maxResponseBytes +
  GOVERNED_READ_ATTEMPT_LIMITS.protocolBytes;
const MAX_CONCURRENT_CONNECTIONS = 32;
const SOCKET_IDLE_TIMEOUT_MS = 30_000;
const GOVERNANCE_UDS_ATTEMPT_DEADLINE_MARGIN_MS = 2_000;

function validateSocketAuthority(socketPath, { statSync = fs.statSync } = {}) {
  if (typeof socketPath !== 'string' || !path.isAbsolute(socketPath) ||
      socketPath.includes('\0') || socketPath.length > 512) reject('r4_governance_uds_path_invalid');
  let parent;
  try {
    parent = statSync(path.dirname(socketPath));
  } catch {
    reject('r4_governance_uds_parent_unavailable');
  }
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (!parent.isDirectory() || (parent.mode & 0o077) !== 0 ||
      (currentUid !== null && parent.uid !== currentUid)) {
    reject('r4_governance_uds_parent_security_invalid');
  }
  return socketPath;
}

function createGovernanceUdsServer({
  socketPath,
  governanceRuntime,
  chmodSync = fs.chmodSync,
  statSync = fs.statSync,
  socketIdleTimeoutMs = SOCKET_IDLE_TIMEOUT_MS,
  attemptDeadlineMarginMs =
    GOVERNANCE_UDS_ATTEMPT_DEADLINE_MARGIN_MS,
  clock = () => new Date()
} = {}) {
  validateSocketAuthority(socketPath, { statSync });
  if (!governanceRuntime || typeof governanceRuntime.handle !== 'function') {
    reject('r4_governance_runtime_invalid');
  }
  if (!Number.isInteger(socketIdleTimeoutMs) ||
      socketIdleTimeoutMs < 10 ||
      socketIdleTimeoutMs > 60_000 ||
      !Number.isInteger(attemptDeadlineMarginMs) ||
      attemptDeadlineMarginMs < 0 ||
      attemptDeadlineMarginMs > 10_000 ||
      typeof clock !== 'function') {
    reject('r4_governance_uds_timeout_invalid');
  }
  const observations = {
    connections: 0,
    accepted_frames: 0,
    rejected_frames: 0,
    request_bodies_logged: 0,
    response_bodies_logged: 0
  };
  let started = false;
  let activeConnections = 0;
  const openSockets = new Set();

  const server = net.createServer(socket => {
    observations.connections += 1;
    if (activeConnections >= MAX_CONCURRENT_CONNECTIONS) {
      observations.rejected_frames += 1;
      socket.destroy();
      return;
    }
    activeConnections += 1;
    openSockets.add(socket);
    let connectionReleased = false;
    const releaseConnection = () => {
      if (connectionReleased) return;
      connectionReleased = true;
      activeConnections -= 1;
      openSockets.delete(socket);
    };
    let bytes = 0;
    const chunks = [];
    let handled = false;
    let settled = false;
    let processingAbortController = null;
    let attemptDeadlineTimer = null;

    function clearAttemptDeadlineTimer() {
      if (attemptDeadlineTimer === null) return;
      clearTimeout(attemptDeadlineTimer);
      attemptDeadlineTimer = null;
    }

    function rejectFrame({ destroy = true } = {}) {
      if (settled) return;
      settled = true;
      handled = true;
      clearAttemptDeadlineTimer();
      if (processingAbortController !== null &&
          !processingAbortController.signal.aborted) {
        processingAbortController.abort();
      }
      observations.rejected_frames += 1;
      if (destroy) socket.destroy();
    }

    socket.once('close', () => {
      releaseConnection();
      rejectFrame({ destroy: false });
    });
    socket.setTimeout(socketIdleTimeoutMs, () => rejectFrame());
    socket.on('data', async chunk => {
      if (handled) return;
      bytes += chunk.length;
      if (bytes > MAX_REQUEST_BYTES) return rejectFrame();
      chunks.push(chunk);
      const frame = Buffer.concat(chunks, bytes);
      const newline = frame.indexOf(0x0a);
      if (newline === -1) return;
      if (newline !== frame.length - 1) return rejectFrame();
      handled = true;
      let payload;
      try {
        payload = JSON.parse(frame.subarray(0, newline).toString('utf8'));
      } catch {
        return rejectFrame();
      }
      const payloadKeys = payload && typeof payload === 'object' &&
        !Array.isArray(payload)
        ? Object.keys(payload).sort().join(',')
        : '';
      if (payloadKeys !== 'relayReceipt,request' &&
          payloadKeys !==
            'governedReadAttempt,relayReceipt,request') {
        return rejectFrame();
      }
      if (payload.governedReadAttempt) {
        let governedTimeoutMs;
        try {
          governedTimeoutMs =
            governedReadAttemptDeadlineBudgetMs(
              payload.governedReadAttempt.header,
              {
                now: clock(),
                marginMs: attemptDeadlineMarginMs
              }
            );
        } catch {
          return rejectFrame();
        }
        if (governedTimeoutMs === 0) {
          return rejectFrame();
        }
        socket.setTimeout(0);
        attemptDeadlineTimer = setTimeout(
          () => rejectFrame(),
          governedTimeoutMs
        );
        attemptDeadlineTimer.unref?.();
      }
      processingAbortController = new AbortController();
      try {
        const result = await governanceRuntime.handle(payload, {
          signal: processingAbortController.signal
        });
        if (settled) return;
        const encoded = Buffer.from(`${JSON.stringify(result)}\n`, 'utf8');
        if (encoded.length > MAX_RESPONSE_BYTES) {
          return rejectFrame();
        }
        settled = true;
        processingAbortController = null;
        clearAttemptDeadlineTimer();
        socket.setTimeout(0);
        observations.accepted_frames += 1;
        socket.end(encoded);
      } catch {
        rejectFrame();
      }
    });
    socket.on('error', () => {});
    socket.on('end', () => {
      if (!settled) rejectFrame();
    });
  });

  return Object.freeze({
    async start() {
      if (started) reject('r4_governance_uds_already_started');
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
        server.listen(socketPath);
      });
      try {
        chmodSync(socketPath, 0o600);
      } catch (error) {
        for (const socket of openSockets) socket.destroy();
        await new Promise(resolve => server.close(() => resolve()));
        throw error;
      }
      started = true;
      return Object.freeze({ started: true, owner_only_socket: true });
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
        started,
        ...observations,
        active_connections: activeConnections,
        max_concurrent_connections: MAX_CONCURRENT_CONNECTIONS,
        request_bodies_logged: 0,
        response_bodies_logged: 0,
        durable_request_state_written: false
      });
    }
  });
}

module.exports = {
  GOVERNANCE_UDS_ATTEMPT_DEADLINE_MARGIN_MS,
  MAX_REQUEST_BYTES,
  MAX_RESPONSE_BYTES,
  MAX_CONCURRENT_CONNECTIONS,
  SOCKET_IDLE_TIMEOUT_MS,
  createGovernanceUdsServer,
  validateSocketAuthority
};
