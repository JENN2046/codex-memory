'use strict';

const fs = require('node:fs');
const net = require('node:net');

const {
  CONTEXT_VISIBILITIES,
  digestObject,
  reject
} = require('../../../packages/chatgpt-r4-contracts');
const {
  CONTROL_REQUEST_ID_PATTERN,
  SESSION_ACTIVATION_MAX_TTL_SECONDS,
  SESSION_ACTIVATION_MIN_TTL_SECONDS
} = require('../../adapters/chatgpt-r4/session-read-activation');
const { validateSocketAuthority } = require('./governance-uds-server');
const {
  DOGFOOD_OBSERVATION_KIND,
  DOGFOOD_TASK_CLASSES,
  READ_TOOL_NAMES
} = require('./private-dogfood-observer');

const MAX_CONTROL_REQUEST_BYTES = 4096;
const MAX_CONTROL_RESPONSE_BYTES = 8192;
const MAX_CONTROL_CONNECTIONS = 4;
const CONTROL_SOCKET_TIMEOUT_MS = 5000;
const MAX_CONTROL_MUTATIONS = 64;

function createSessionActivationControlServer({
  socketPath,
  activationController,
  dogfoodObserver = null,
  chmodSync = fs.chmodSync,
  statSync = fs.statSync
} = {}) {
  validateSocketAuthority(socketPath, { statSync });
  if (!activationController || typeof activationController.activate !== 'function' ||
      typeof activationController.kill !== 'function' ||
      typeof activationController.snapshot !== 'function') {
    reject('r4_session_control_controller_invalid');
  }
  if (dogfoodObserver !== null &&
      (typeof dogfoodObserver.prepareActivation !== 'function' ||
       typeof dogfoodObserver.beginSession !== 'function' ||
       typeof dogfoodObserver.syncActivation !== 'function' ||
       typeof dogfoodObserver.snapshot !== 'function')) {
    reject('r5a_dogfood_control_observer_invalid');
  }
  let started = false;
  let activeConnections = 0;
  const openSockets = new Set();
  const replayReceipts = new Map();
  const observations = {
    connections: 0,
    accepted_frames: 0,
    rejected_frames: 0,
    replayed_frames: 0,
    activate_commands: 0,
    kill_commands: 0,
    status_commands: 0,
    request_bodies_logged: 0,
    response_bodies_logged: 0
  };

  function handleControlRequest(request) {
    validateControlRequest(request);
    const dogfoodRequest = request.schema_version >= 2;
    if (dogfoodRequest && !dogfoodObserver) reject('r5a_dogfood_control_unavailable');
    if (dogfoodObserver && request.operation === 'activate' && !dogfoodRequest) {
      reject('r5a_dogfood_observation_required');
    }
    const requestDigest = digestObject(request);
    const existing = replayReceipts.get(request.request_id);
    if (existing) {
      if (existing.requestDigest !== requestDigest) reject('r4_session_control_replay_mismatch');
      observations.replayed_frames += 1;
      return existing.response;
    }
    const mutationLimit = request.operation === 'kill'
      ? MAX_CONTROL_MUTATIONS
      : MAX_CONTROL_MUTATIONS - 1;
    if (request.operation !== 'status' && replayReceipts.size >= mutationLimit) {
      reject('r4_session_control_mutation_budget_exhausted');
    }
    let response;
    if (request.operation === 'activate') {
      if (dogfoodRequest) dogfoodObserver.prepareActivation(activationController.snapshot());
      observations.activate_commands += 1;
      response = activationController.activate({
        requestId: request.request_id,
        requestedVisibility: request.requested_visibility,
        ttlSeconds: request.ttl_seconds
      });
      if (dogfoodRequest) {
        try {
          dogfoodObserver.beginSession({
            observationKind: request.observation_kind,
            ...(request.schema_version >= 3 ? {
              taskClass: request.task_class,
              expectedReadTool: request.expected_read_tool || null
            } : {}),
            activationSnapshot: activationController.snapshot()
          });
        } catch (error) {
          activationController.kill({ reason: 'emergency_stop' });
          throw error;
        }
      }
    } else if (request.operation === 'kill') {
      observations.kill_commands += 1;
      response = activationController.kill({ reason: request.reason });
    } else {
      observations.status_commands += 1;
      response = activationController.snapshot();
    }
    if (dogfoodObserver) dogfoodObserver.syncActivation(activationController.snapshot());
    const projected = projectControlResponse(
      request.operation,
      response,
      request.operation === 'status' ? response : activationController.snapshot(),
      dogfoodRequest ? dogfoodObserver.snapshot(activationController.snapshot()) : null,
      request.schema_version
    );
    if (request.operation !== 'status') {
      replayReceipts.set(request.request_id, { requestDigest, response: projected });
    }
    return projected;
  }

  const server = net.createServer(socket => {
    observations.connections += 1;
    if (activeConnections >= MAX_CONTROL_CONNECTIONS) {
      observations.rejected_frames += 1;
      socket.destroy();
      return;
    }
    activeConnections += 1;
    openSockets.add(socket);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      activeConnections -= 1;
      openSockets.delete(socket);
    };
    socket.once('close', release);
    socket.setTimeout(CONTROL_SOCKET_TIMEOUT_MS, () => rejectFrame());
    const chunks = [];
    let bytes = 0;
    let handled = false;

    function rejectFrame() {
      if (handled) return;
      handled = true;
      observations.rejected_frames += 1;
      socket.destroy();
    }

    socket.on('data', chunk => {
      if (handled) return;
      bytes += chunk.length;
      if (bytes > MAX_CONTROL_REQUEST_BYTES) return rejectFrame();
      chunks.push(chunk);
      const frame = Buffer.concat(chunks, bytes);
      const newline = frame.indexOf(0x0a);
      if (newline === -1) return;
      if (newline !== frame.length - 1) return rejectFrame();
      handled = true;
      try {
        const request = JSON.parse(frame.subarray(0, newline).toString('utf8'));
        const response = handleControlRequest(request);
        const encoded = Buffer.from(`${JSON.stringify(response)}\n`, 'utf8');
        if (encoded.length > MAX_CONTROL_RESPONSE_BYTES) throw safeError('r4_session_control_response_too_large');
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
      if (started) reject('r4_session_control_already_started');
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
      return Object.freeze({ started: true, owner_only_socket: true, default_closed: true });
    },
    async stop() {
      if (!started) return;
      activationController.kill({ reason: 'verification_complete' });
      dogfoodObserver?.syncActivation(activationController.snapshot());
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
        max_concurrent_connections: MAX_CONTROL_CONNECTIONS,
        replay_receipt_count: replayReceipts.size,
        durable_control_state_written: false,
        activation: activationController.snapshot(),
        ...(dogfoodObserver ? {
          private_dogfood_observation: dogfoodObserver.snapshot(activationController.snapshot())
        } : {})
      });
    },
    handleControlRequest
  });
}

function validateControlRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    reject('r4_session_control_request_invalid');
  }
  const operation = request.operation;
  if (!['activate', 'kill', 'status'].includes(operation) ||
      ![1, 2, 3].includes(request.schema_version) ||
      !CONTROL_REQUEST_ID_PATTERN.test(request.request_id || '')) {
    reject('r4_session_control_request_invalid');
  }
  const expected = operation === 'activate'
    ? ['schema_version', 'operation', 'request_id', 'requested_visibility', 'ttl_seconds',
        ...(request.schema_version >= 2 ? ['observation_kind'] : []),
        ...(request.schema_version >= 3 ? [
          'task_class',
          ...(request.task_class === 'memory_relevant' ? ['expected_read_tool'] : [])
        ] : [])]
    : operation === 'kill'
      ? ['schema_version', 'operation', 'request_id', 'reason']
      : ['schema_version', 'operation', 'request_id'];
  const actual = Object.keys(request).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    reject('r4_session_control_request_shape_invalid');
  }
  if (operation === 'activate' &&
      (!CONTEXT_VISIBILITIES.includes(request.requested_visibility) ||
       !Number.isInteger(request.ttl_seconds) ||
       request.ttl_seconds < SESSION_ACTIVATION_MIN_TTL_SECONDS ||
       request.ttl_seconds > SESSION_ACTIVATION_MAX_TTL_SECONDS)) {
    reject('r4_session_control_activation_invalid');
  }
  if (request.schema_version >= 2 && operation === 'activate' &&
      request.observation_kind !== DOGFOOD_OBSERVATION_KIND) {
    reject('r5a_dogfood_control_observation_invalid');
  }
  if (request.schema_version >= 3 && operation === 'activate' &&
      (!DOGFOOD_TASK_CLASSES.includes(request.task_class) ||
       (request.task_class === 'memory_relevant' &&
        !READ_TOOL_NAMES.includes(request.expected_read_tool)) ||
       (request.task_class !== 'memory_relevant' &&
        request.expected_read_tool !== undefined))) {
    reject('r5h_dogfood_control_task_class_invalid');
  }
  if (operation === 'kill' &&
      !['operator_requested', 'emergency_stop', 'verification_complete'].includes(request.reason)) {
    reject('r4_session_control_kill_invalid');
  }
  return request;
}

function projectControlResponse(
  operation,
  response,
  postOperationSnapshot = response,
  dogfoodObservation = null,
  schemaVersion = 1
) {
  const snapshot = postOperationSnapshot;
  const value = {
    schema_version: schemaVersion,
    operation,
    accepted: response.accepted !== false,
    activation_status: snapshot?.activation_status || response.status,
    remaining_ttl_seconds: snapshot?.remaining_ttl_seconds ?? null,
    context_bound: snapshot?.context_bound ?? false,
    read_in_flight: snapshot?.read_in_flight ?? false,
    remaining_read_calls: snapshot?.remaining_read_calls ?? response.remaining_read_calls ?? 0,
    default_closed: true,
    durable_state_written: false,
    receipt_digest: response.receipt_digest,
    ...(schemaVersion >= 2 ? { observation: dogfoodObservation } : {})
  };
  if (schemaVersion >= 2 && (!dogfoodObservation ||
      dogfoodObservation.durable_observation_state_written !== false ||
      dogfoodObservation.raw_memory_recorded !== false)) {
    reject('r5a_dogfood_control_observation_invalid');
  }
  if (!/^sha256:[a-f0-9]{64}$/u.test(value.receipt_digest || '')) {
    reject('r4_session_control_receipt_invalid');
  }
  return Object.freeze(value);
}

function safeError(code) {
  return Object.assign(new Error(code), { code });
}

module.exports = {
  CONTROL_SOCKET_TIMEOUT_MS,
  MAX_CONTROL_CONNECTIONS,
  MAX_CONTROL_MUTATIONS,
  MAX_CONTROL_REQUEST_BYTES,
  MAX_CONTROL_RESPONSE_BYTES,
  createSessionActivationControlServer,
  projectControlResponse,
  validateControlRequest
};
