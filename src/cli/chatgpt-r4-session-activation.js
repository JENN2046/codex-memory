#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const {
  CONTEXT_VISIBILITIES,
  reject
} = require('../../packages/chatgpt-r4-contracts');
const {
  SESSION_ACTIVATION_DEFAULT_TTL_SECONDS,
  SESSION_ACTIVATION_MAX_TTL_SECONDS,
  SESSION_ACTIVATION_MIN_TTL_SECONDS
} = require('../adapters/chatgpt-r4/session-read-activation');

const MAX_RESPONSE_BYTES = 8192;
const RESPONSE_TIMEOUT_MS = 5000;

function parseArguments(argv) {
  const [operation, ...rest] = argv;
  if (!['activate', 'status', 'kill'].includes(operation)) reject('r4_session_cli_operation_invalid');
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--') || Object.hasOwn(options, token.slice(2))) {
      reject('r4_session_cli_argument_invalid');
    }
    const name = token.slice(2);
    if (name === 'json') {
      options[name] = true;
      continue;
    }
    if (index + 1 >= rest.length || rest[index + 1].startsWith('--')) {
      reject('r4_session_cli_argument_invalid');
    }
    options[name] = rest[index + 1];
    index += 1;
  }
  const allowed = operation === 'activate'
    ? ['json', 'ttl-seconds', 'visibility']
    : operation === 'kill' ? ['json', 'reason'] : ['json'];
  if (Object.keys(options).some(name => !allowed.includes(name))) {
    reject('r4_session_cli_argument_invalid');
  }
  const request = {
    schema_version: 1,
    operation,
    request_id: `op_${crypto.randomBytes(24).toString('base64url')}`
  };
  if (operation === 'activate') {
    const ttlSeconds = options['ttl-seconds'] === undefined
      ? SESSION_ACTIVATION_DEFAULT_TTL_SECONDS
      : Number(options['ttl-seconds']);
    const visibility = options.visibility || 'task_start_context';
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < SESSION_ACTIVATION_MIN_TTL_SECONDS ||
        ttlSeconds > SESSION_ACTIVATION_MAX_TTL_SECONDS || !CONTEXT_VISIBILITIES.includes(visibility)) {
      reject('r4_session_cli_activation_invalid');
    }
    request.ttl_seconds = ttlSeconds;
    request.requested_visibility = visibility;
  } else if (operation === 'kill') {
    request.reason = options.reason || 'operator_requested';
    if (!['operator_requested', 'emergency_stop', 'verification_complete'].includes(request.reason)) {
      reject('r4_session_cli_kill_invalid');
    }
  }
  return Object.freeze({ request: Object.freeze(request), json: options.json === true });
}

function validateSocket(socketPath, { statSync = fs.statSync } = {}) {
  if (typeof socketPath !== 'string' || !path.isAbsolute(socketPath) || socketPath.length > 512) {
    reject('r4_session_cli_socket_invalid');
  }
  let stat;
  try {
    stat = statSync(socketPath);
  } catch {
    reject('r4_session_cli_socket_unavailable');
  }
  const currentUid = typeof process.getuid === 'function' ? process.getuid() : null;
  if (!stat.isSocket() || (stat.mode & 0o077) !== 0 ||
      (currentUid !== null && stat.uid !== currentUid)) {
    reject('r4_session_cli_socket_security_invalid');
  }
  return socketPath;
}

async function callControlSocket(socketPath, request, {
  connect = net.createConnection,
  validate = validateResponse
} = {}) {
  if (typeof validate !== 'function') reject('r4_session_cli_validator_invalid');
  validateSocket(socketPath);
  return await new Promise((resolve, rejectCall) => {
    const socket = connect({ path: socketPath });
    const chunks = [];
    let bytes = 0;
    let settled = false;
    const finish = (error, response) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) rejectCall(error);
      else resolve(response);
    };
    socket.setTimeout(RESPONSE_TIMEOUT_MS, () => finish(safeError('r4_session_cli_timeout')));
    socket.once('connect', () => socket.write(`${JSON.stringify(request)}\n`));
    socket.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_RESPONSE_BYTES) return finish(safeError('r4_session_cli_response_too_large'));
      chunks.push(chunk);
      const frame = Buffer.concat(chunks, bytes);
      const newline = frame.indexOf(0x0a);
      if (newline === -1) return;
      if (newline !== frame.length - 1) return finish(safeError('r4_session_cli_response_invalid'));
      try {
        const response = JSON.parse(frame.subarray(0, newline).toString('utf8'));
        validate(response, request.operation);
        finish(null, response);
      } catch (error) {
        finish(error?.code ? error : safeError('r4_session_cli_response_invalid'));
      }
    });
    socket.once('error', () => finish(safeError('r4_session_cli_connection_failed')));
    socket.once('end', () => {
      if (!settled) finish(safeError('r4_session_cli_response_missing'));
    });
  });
}

function validateResponse(response, operation) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    reject('r4_session_cli_response_invalid');
  }
  const keys = [
    'schema_version', 'operation', 'accepted', 'activation_status',
    'remaining_ttl_seconds', 'context_bound', 'read_in_flight',
    'remaining_read_calls', 'default_closed', 'durable_state_written',
    'receipt_digest'
  ].sort();
  const actual = Object.keys(response).sort();
  if (actual.length !== keys.length || actual.some((key, index) => key !== keys[index]) ||
      response.schema_version !== 1 || response.operation !== operation ||
      response.accepted !== true || response.default_closed !== true ||
      response.durable_state_written !== false ||
      !/^sha256:[a-f0-9]{64}$/u.test(response.receipt_digest || '')) {
    reject('r4_session_cli_response_invalid');
  }
  return response;
}

function safeError(code) {
  return Object.assign(new Error(code), { code });
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  const socketPath = process.env.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH;
  const response = await callControlSocket(socketPath, parsed.request);
  const output = parsed.json
    ? JSON.stringify(response)
    : `${response.operation}: ${response.activation_status}`;
  process.stdout.write(`${output}\n`);
}

if (require.main === module) {
  main().catch(error => {
    const code = typeof error?.code === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(error.code)
      ? error.code
      : 'r4_session_cli_failed';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  MAX_RESPONSE_BYTES,
  RESPONSE_TIMEOUT_MS,
  callControlSocket,
  parseArguments,
  validateResponse,
  validateSocket
};
