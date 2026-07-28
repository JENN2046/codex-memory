'use strict';

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const {
  projectLowDisclosureRelayObservation
} = require('./low-disclosure-observer');

const MAX_SNAPSHOT_REQUEST_BYTES = 128;
const MAX_SNAPSHOT_RESPONSE_BYTES = 4096;
const MAX_SNAPSHOT_CONNECTIONS = 4;
const SNAPSHOT_SOCKET_TIMEOUT_MS = 5000;
const MAX_SNAPSHOT_SOCKET_PATH_BYTES = 100;
const SNAPSHOT_REQUEST_KEYS = Object.freeze(['operation', 'schema_version']);

function createObserverSnapshotUdsServer({
  socketPath,
  readObservation,
  chmodSync = fs.chmodSync,
  lstatSync = fs.lstatSync,
  realpathSync = fs.realpathSync,
  statSync = fs.statSync
} = {}) {
  if (typeof readObservation !== 'function') {
    throw safeError('relay_observer_snapshot_reader_invalid');
  }
  validateOwnerOnlySnapshotSocketPath(socketPath, {
    realpathSync,
    statSync
  });
  let started = false;
  let activeConnections = 0;
  const openSockets = new Set();
  const observations = {
    connections: 0,
    accepted_frames: 0,
    rejected_frames: 0,
    request_bodies_logged: 0,
    response_bodies_logged: 0
  };

  const server = net.createServer(socket => {
    observations.connections += 1;
    if (activeConnections >= MAX_SNAPSHOT_CONNECTIONS) {
      observations.rejected_frames += 1;
      socket.destroy();
      return;
    }
    activeConnections += 1;
    openSockets.add(socket);
    let released = false;
    let handled = false;
    let bytes = 0;
    const chunks = [];

    function release() {
      if (released) return;
      released = true;
      activeConnections -= 1;
      openSockets.delete(socket);
    }

    function rejectFrame() {
      if (handled) return;
      handled = true;
      observations.rejected_frames += 1;
      socket.destroy();
    }

    socket.once('close', release);
    socket.setTimeout(SNAPSHOT_SOCKET_TIMEOUT_MS, rejectFrame);
    socket.on('data', chunk => {
      if (handled) return;
      bytes += chunk.length;
      if (bytes > MAX_SNAPSHOT_REQUEST_BYTES) return rejectFrame();
      chunks.push(chunk);
      const frame = Buffer.concat(chunks, bytes);
      const newline = frame.indexOf(0x0a);
      if (newline === -1) return;
      if (newline !== frame.length - 1) return rejectFrame();
      handled = true;
      try {
        const request = JSON.parse(frame.subarray(0, newline).toString('utf8'));
        validateSnapshotRequest(request);
        const observation = projectLowDisclosureRelayObservation(readObservation());
        const response = Object.freeze({
          schema_version: 1,
          operation: 'snapshot',
          observation
        });
        const encoded = Buffer.from(`${JSON.stringify(response)}\n`, 'utf8');
        if (encoded.length > MAX_SNAPSHOT_RESPONSE_BYTES) {
          throw safeError('relay_observer_snapshot_response_too_large');
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
      if (started) throw safeError('relay_observer_snapshot_already_started');
      const authority = validateOwnerOnlySnapshotSocketPath(socketPath, {
        realpathSync,
        statSync
      });
      let listening = false;
      try {
        await new Promise((resolve, rejectStart) => {
          const onError = () => {
            server.off('listening', onListening);
            rejectStart(safeError('relay_observer_snapshot_start_failed'));
          };
          const onListening = () => {
            server.off('error', onError);
            resolve();
          };
          server.once('error', onError);
          server.once('listening', onListening);
          server.listen(socketPath);
        });
        listening = true;
        chmodSync(socketPath, 0o600);
        validateBoundSnapshotSocket(authority, {
          lstatSync,
          realpathSync,
          statSync
        });
      } catch (error) {
        for (const socket of openSockets) socket.destroy();
        if (listening) {
          await new Promise(resolve => server.close(() => resolve()));
        }
        throw safeError(
          typeof error?.code === 'string' && error.code.startsWith('relay_observer_snapshot_')
            ? error.code
            : 'relay_observer_snapshot_start_failed'
        );
      }
      started = true;
      return Object.freeze({
        started: true,
        owner_only_socket: true,
        read_only: true
      });
    },
    async stop() {
      if (!started) return;
      for (const socket of openSockets) socket.destroy();
      try {
        await new Promise((resolve, rejectStop) => {
          server.close(error => error ? rejectStop(error) : resolve());
        });
      } catch {
        throw safeError('relay_observer_snapshot_stop_failed');
      } finally {
        started = false;
      }
    },
    snapshot() {
      return Object.freeze({
        started,
        ...observations,
        active_connections: activeConnections,
        max_concurrent_connections: MAX_SNAPSHOT_CONNECTIONS,
        owner_only_socket: true,
        read_only: true,
        durable_state_written: false,
        request_bodies_logged: 0,
        response_bodies_logged: 0
      });
    }
  });
}

function validateSnapshotRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw safeError('relay_observer_snapshot_request_invalid');
  }
  const actualKeys = Object.keys(request).sort();
  const expectedKeys = [...SNAPSHOT_REQUEST_KEYS].sort();
  if (actualKeys.length !== expectedKeys.length ||
      actualKeys.some((key, index) => key !== expectedKeys[index]) ||
      request.schema_version !== 1 ||
      request.operation !== 'snapshot') {
    throw safeError('relay_observer_snapshot_request_invalid');
  }
  return request;
}

function validateOwnerOnlySnapshotSocketPath(value, {
  realpathSync = fs.realpathSync,
  statSync = fs.statSync
} = {}) {
  if (typeof value !== 'string' ||
      !path.isAbsolute(value) ||
      path.resolve(value) !== value ||
      value.includes('\0') ||
      Buffer.byteLength(value, 'utf8') > MAX_SNAPSHOT_SOCKET_PATH_BYTES) {
    throw safeError('relay_observer_snapshot_socket_path_invalid');
  }
  const parentPath = path.dirname(value);
  let resolvedParent;
  let parentStat;
  try {
    resolvedParent = realpathSync(parentPath);
    parentStat = statSync(resolvedParent);
  } catch {
    throw safeError('relay_observer_snapshot_parent_unavailable');
  }
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (resolvedParent !== parentPath ||
      !Number.isInteger(currentUid) ||
      !parentStat.isDirectory() ||
      (parentStat.mode & 0o077) !== 0 ||
      parentStat.uid !== currentUid) {
    throw safeError('relay_observer_snapshot_parent_security_invalid');
  }
  return Object.freeze({
    socketPath: value,
    parentPath,
    parentDevice: parentStat.dev,
    parentInode: parentStat.ino,
    ownerUid: currentUid
  });
}

function validateBoundSnapshotSocket(authority, {
  lstatSync = fs.lstatSync,
  realpathSync = fs.realpathSync,
  statSync = fs.statSync
} = {}) {
  let boundParentPath;
  let parentStat;
  let socketStat;
  try {
    boundParentPath = realpathSync(authority.parentPath);
    parentStat = statSync(boundParentPath);
    socketStat = lstatSync(authority.socketPath);
  } catch {
    throw safeError('relay_observer_snapshot_socket_security_invalid');
  }
  if (boundParentPath !== authority.parentPath ||
      !parentStat.isDirectory() ||
      (parentStat.mode & 0o077) !== 0 ||
      parentStat.uid !== authority.ownerUid ||
      parentStat.dev !== authority.parentDevice ||
      parentStat.ino !== authority.parentInode ||
      !socketStat.isSocket() ||
      socketStat.uid !== authority.ownerUid ||
      (socketStat.mode & 0o777) !== 0o600) {
    throw safeError('relay_observer_snapshot_socket_security_invalid');
  }
  return true;
}

function safeError(code) {
  return Object.assign(new Error(code), { code });
}

module.exports = {
  MAX_SNAPSHOT_CONNECTIONS,
  MAX_SNAPSHOT_REQUEST_BYTES,
  MAX_SNAPSHOT_RESPONSE_BYTES,
  MAX_SNAPSHOT_SOCKET_PATH_BYTES,
  SNAPSHOT_SOCKET_TIMEOUT_MS,
  createObserverSnapshotUdsServer,
  validateBoundSnapshotSocket,
  validateOwnerOnlySnapshotSocketPath,
  validateSnapshotRequest
};
