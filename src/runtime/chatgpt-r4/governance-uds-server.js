'use strict';

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const { LIMITS, reject } = require('../../../packages/chatgpt-r4-contracts');

const MAX_REQUEST_BYTES = LIMITS.maxRequestBytes + 8192;
const MAX_RESPONSE_BYTES = LIMITS.maxResponseBytes;
const MAX_CONCURRENT_CONNECTIONS = 32;
const SOCKET_IDLE_TIMEOUT_MS = 30_000;

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
  statSync = fs.statSync
} = {}) {
  validateSocketAuthority(socketPath, { statSync });
  if (!governanceRuntime || typeof governanceRuntime.handle !== 'function') {
    reject('r4_governance_runtime_invalid');
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
    socket.once('close', releaseConnection);
    socket.setTimeout(SOCKET_IDLE_TIMEOUT_MS, () => rejectFrame());
    let bytes = 0;
    const chunks = [];
    let handled = false;

    function rejectFrame() {
      if (handled) return;
      handled = true;
      observations.rejected_frames += 1;
      socket.destroy();
    }

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
        observations.rejected_frames += 1;
        socket.destroy();
        return;
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
          Object.keys(payload).sort().join(',') !== 'relayReceipt,request') {
        observations.rejected_frames += 1;
        socket.destroy();
        return;
      }
      try {
        const result = await governanceRuntime.handle(payload);
        const encoded = Buffer.from(`${JSON.stringify(result)}\n`, 'utf8');
        if (encoded.length > MAX_RESPONSE_BYTES) {
          observations.rejected_frames += 1;
          socket.destroy();
          return;
        }
        observations.accepted_frames += 1;
        socket.end(encoded);
      } catch {
        observations.rejected_frames += 1;
        socket.destroy();
      }
    });
    socket.on('error', () => {});
    socket.on('end', () => {
      if (!handled) rejectFrame();
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
  MAX_REQUEST_BYTES,
  MAX_RESPONSE_BYTES,
  MAX_CONCURRENT_CONNECTIONS,
  SOCKET_IDLE_TIMEOUT_MS,
  createGovernanceUdsServer,
  validateSocketAuthority
};
