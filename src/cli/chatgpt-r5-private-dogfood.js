#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');

const { CONTEXT_VISIBILITIES, reject } = require('../../packages/chatgpt-r4-contracts');
const {
  SESSION_ACTIVATION_DEFAULT_TTL_SECONDS,
  SESSION_ACTIVATION_MAX_TTL_SECONDS,
  SESSION_ACTIVATION_MIN_TTL_SECONDS
} = require('../adapters/chatgpt-r4/session-read-activation');
const { callControlSocket } = require('./chatgpt-r4-session-activation');
const {
  DOGFOOD_OBSERVATION_KIND,
  DOGFOOD_OBSERVATION_SCHEMA_VERSION,
  DOGFOOD_TASK_CLASSES,
  MAX_DOGFOOD_PROVIDER_CALLS,
  MAX_DOGFOOD_SESSIONS,
  READ_TOOL_NAMES
} = require('../runtime/chatgpt-r4/private-dogfood-observer');

const RESPONSE_KEYS = Object.freeze([
  'schema_version', 'operation', 'accepted', 'activation_status',
  'remaining_ttl_seconds', 'context_bound', 'read_in_flight',
  'remaining_read_calls', 'default_closed', 'durable_state_written',
  'receipt_digest', 'observation'
].sort());

function parseArguments(argv) {
  const [operation, ...rest] = argv;
  if (!['activate', 'status', 'kill'].includes(operation)) {
    reject('r5a_dogfood_cli_operation_invalid');
  }
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--') || Object.hasOwn(options, token.slice(2))) {
      reject('r5a_dogfood_cli_argument_invalid');
    }
    const name = token.slice(2);
    if (name === 'json') {
      options[name] = true;
      continue;
    }
    if (index + 1 >= rest.length || rest[index + 1].startsWith('--')) {
      reject('r5a_dogfood_cli_argument_invalid');
    }
    options[name] = rest[index + 1];
    index += 1;
  }
  const allowed = operation === 'activate'
    ? ['expected-read-tool', 'json', 'task-class', 'ttl-seconds', 'visibility']
    : operation === 'kill' ? ['json', 'reason'] : ['json'];
  if (Object.keys(options).some(name => !allowed.includes(name))) {
    reject('r5a_dogfood_cli_argument_invalid');
  }
  const taskClass = options['task-class'];
  const expectedReadTool = options['expected-read-tool'];
  if ((taskClass === undefined) !== (expectedReadTool === undefined) &&
      taskClass !== 'memory_irrelevant' && taskClass !== 'scope_missing') {
    reject('r5h_dogfood_cli_task_class_invalid');
  }
  if (taskClass !== undefined &&
      (!DOGFOOD_TASK_CLASSES.includes(taskClass) ||
       (taskClass === 'memory_relevant' && !READ_TOOL_NAMES.includes(expectedReadTool)) ||
       (taskClass !== 'memory_relevant' && expectedReadTool !== undefined))) {
    reject('r5h_dogfood_cli_task_class_invalid');
  }
  const request = {
    schema_version: taskClass === undefined ? 2 : 3,
    operation,
    request_id: `op_${crypto.randomBytes(24).toString('base64url')}`
  };
  if (operation === 'activate') {
    const ttlSeconds = options['ttl-seconds'] === undefined
      ? SESSION_ACTIVATION_DEFAULT_TTL_SECONDS
      : Number(options['ttl-seconds']);
    const visibility = options.visibility || 'project';
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < SESSION_ACTIVATION_MIN_TTL_SECONDS ||
        ttlSeconds > SESSION_ACTIVATION_MAX_TTL_SECONDS ||
        !CONTEXT_VISIBILITIES.includes(visibility)) {
      reject('r5a_dogfood_cli_activation_invalid');
    }
    request.ttl_seconds = ttlSeconds;
    request.requested_visibility = visibility;
    request.observation_kind = DOGFOOD_OBSERVATION_KIND;
    if (taskClass !== undefined) {
      request.task_class = taskClass;
      if (expectedReadTool !== undefined) request.expected_read_tool = expectedReadTool;
    }
  } else if (operation === 'kill') {
    request.reason = options.reason || 'operator_requested';
    if (!['operator_requested', 'emergency_stop', 'verification_complete'].includes(request.reason)) {
      reject('r5a_dogfood_cli_kill_invalid');
    }
  }
  return Object.freeze({ request: Object.freeze(request), json: options.json === true });
}

function validateObservation(observation) {
  const exactKeys = [
    'schema_version', 'observation_kind', 'sessions_started', 'session_limit',
    'memory_relevant_sessions', 'memory_irrelevant_sessions', 'scope_missing_sessions',
    'unclassified_sessions',
    'sessions_with_any_memory_tool', 'sessions_with_resolve', 'sessions_with_read',
    'resolve_then_read_sessions', 'exact_first_resolution_successes',
    'expected_read_tool_matches', 'terminal_stop_sessions',
    'post_terminal_retry_sessions', 'post_terminal_tool_attempts',
    'resolve_retry_sessions', 'wrong_first_tool_sessions',
    'negative_abstention_sessions', 'unexpected_negative_memory_selection_sessions',
    'read_tool_selection_counts', 'timeout_count', 'emergency_stop_latched', 'provider_calls',
    'provider_call_limit', 'native_invocations', 'local_fallbacks',
    'primary_memory_writes', 'derived_index_writes', 'other_durable_mutations',
    'derived_runtime_mutation_policy', 'derived_runtime_mutation_evidence_count',
    'derived_runtime_mutation_policy_violations',
    'unrestricted_native_searches',
    'durable_observation_state_written', 'request_bodies_logged',
    'response_bodies_logged', 'raw_memory_recorded', 'last_session'
  ].sort();
  const countKeys = [
    'memory_relevant_sessions', 'memory_irrelevant_sessions', 'scope_missing_sessions',
    'unclassified_sessions',
    'sessions_started', 'sessions_with_any_memory_tool', 'sessions_with_resolve',
    'sessions_with_read', 'resolve_then_read_sessions',
    'exact_first_resolution_successes', 'expected_read_tool_matches',
    'terminal_stop_sessions', 'post_terminal_retry_sessions',
    'post_terminal_tool_attempts', 'resolve_retry_sessions',
    'wrong_first_tool_sessions', 'negative_abstention_sessions',
    'unexpected_negative_memory_selection_sessions', 'timeout_count',
    'provider_calls', 'native_invocations', 'local_fallbacks',
    'primary_memory_writes', 'derived_index_writes', 'other_durable_mutations',
    'derived_runtime_mutation_evidence_count', 'derived_runtime_mutation_policy_violations',
    'unrestricted_native_searches'
  ];
  if (!observation || typeof observation !== 'object' || Array.isArray(observation) ||
      Object.keys(observation).sort().some((key, index) => key !== exactKeys[index]) ||
      Object.keys(observation).length !== exactKeys.length ||
      observation.schema_version !== DOGFOOD_OBSERVATION_SCHEMA_VERSION ||
      observation.observation_kind !== DOGFOOD_OBSERVATION_KIND ||
      observation.session_limit !== MAX_DOGFOOD_SESSIONS ||
      observation.provider_call_limit !== MAX_DOGFOOD_PROVIDER_CALLS ||
      observation.derived_runtime_mutation_policy !==
        'isolated_derived_runtime_mutation_v1' ||
      countKeys.some(key => !Number.isInteger(observation[key]) || observation[key] < 0) ||
      observation.sessions_started < 0 || observation.sessions_started > MAX_DOGFOOD_SESSIONS ||
      observation.provider_calls < 0 || observation.provider_calls > MAX_DOGFOOD_PROVIDER_CALLS ||
      observation.sessions_with_any_memory_tool > observation.sessions_started ||
      observation.sessions_with_resolve > observation.sessions_started ||
      observation.sessions_with_read > observation.sessions_started ||
      observation.resolve_then_read_sessions > observation.sessions_started ||
      observation.memory_relevant_sessions + observation.memory_irrelevant_sessions +
        observation.scope_missing_sessions + observation.unclassified_sessions !==
        observation.sessions_started ||
      observation.exact_first_resolution_successes > observation.memory_relevant_sessions ||
      observation.expected_read_tool_matches > observation.exact_first_resolution_successes ||
      observation.terminal_stop_sessions > observation.expected_read_tool_matches ||
      observation.post_terminal_retry_sessions > observation.sessions_started ||
      observation.resolve_retry_sessions > observation.sessions_started ||
      observation.wrong_first_tool_sessions > observation.sessions_started ||
      observation.negative_abstention_sessions >
        observation.memory_irrelevant_sessions + observation.scope_missing_sessions ||
      observation.unexpected_negative_memory_selection_sessions >
        observation.memory_irrelevant_sessions + observation.scope_missing_sessions ||
      observation.timeout_count > observation.sessions_started ||
      !observation.read_tool_selection_counts ||
      typeof observation.read_tool_selection_counts !== 'object' ||
      Array.isArray(observation.read_tool_selection_counts) ||
      Object.keys(observation.read_tool_selection_counts).length !== READ_TOOL_NAMES.length ||
      READ_TOOL_NAMES.some(toolName =>
        !Number.isInteger(observation.read_tool_selection_counts[toolName]) ||
        observation.read_tool_selection_counts[toolName] < 0 ||
        observation.read_tool_selection_counts[toolName] > observation.sessions_started) ||
      observation.derived_runtime_mutation_evidence_count > observation.native_invocations ||
      (observation.derived_index_writes > 0 &&
       observation.derived_runtime_mutation_evidence_count === 0) ||
      typeof observation.emergency_stop_latched !== 'boolean' ||
      observation.durable_observation_state_written !== false ||
      observation.request_bodies_logged !== 0 || observation.response_bodies_logged !== 0 ||
      observation.raw_memory_recorded !== false) {
    reject('r5a_dogfood_cli_observation_invalid');
  }
  validateLastSession(observation.last_session, observation.sessions_started);
  const forbiddenCounterObserved = observation.local_fallbacks !== 0 ||
    observation.primary_memory_writes !== 0 ||
    observation.unrestricted_native_searches !== 0 ||
    observation.derived_runtime_mutation_policy_violations !== 0;
  if (forbiddenCounterObserved &&
      (observation.emergency_stop_latched !== true ||
       observation.last_session?.status !== 'emergency_stopped')) {
    reject('r5a_dogfood_cli_observation_invalid');
  }
  return observation;
}

function validateLastSession(lastSession, sessionsStarted) {
  if (lastSession === null) {
    if (sessionsStarted !== 0) reject('r5a_dogfood_cli_last_session_invalid');
    return null;
  }
  const keys = [
    'ordinal', 'status', 'task_class', 'expected_read_tool', 'tool_sequence',
    'resolve_attempt_count', 'read_attempt_count', 'post_terminal_attempt_count',
    'first_resolve_status', 'terminal_read_status', 'workflow_outcome',
    'total_latency_ms', 'result_count',
    'max_relevance', 'timed_out', 'error_code', 'tool_attempt_in_flight',
    'provider_calls', 'native_invocations'
  ].sort();
  if (!lastSession || typeof lastSession !== 'object' || Array.isArray(lastSession) ||
      Object.keys(lastSession).length !== keys.length ||
      Object.keys(lastSession).sort().some((key, index) => key !== keys[index]) ||
      lastSession.ordinal !== sessionsStarted ||
      !['active', 'inactive', 'consumed', 'killed', 'expired',
        'emergency_stopped'].includes(lastSession.status) ||
      ![...DOGFOOD_TASK_CLASSES, 'unclassified'].includes(lastSession.task_class) ||
      (lastSession.expected_read_tool !== null &&
       !READ_TOOL_NAMES.includes(lastSession.expected_read_tool)) ||
      (lastSession.task_class === 'memory_relevant') !==
        (lastSession.expected_read_tool !== null) ||
      !Array.isArray(lastSession.tool_sequence) || lastSession.tool_sequence.length > 4 ||
      lastSession.tool_sequence.some(toolName => ![
        'resolve_memory_context', 'memory_overview', 'search_memory',
        'audit_memory', 'prepare_memory_context'
      ].includes(toolName)) ||
      !Number.isInteger(lastSession.resolve_attempt_count) ||
      lastSession.resolve_attempt_count < 0 || lastSession.resolve_attempt_count > 4 ||
      !Number.isInteger(lastSession.read_attempt_count) ||
      lastSession.read_attempt_count < 0 || lastSession.read_attempt_count > 4 ||
      lastSession.resolve_attempt_count + lastSession.read_attempt_count !==
        lastSession.tool_sequence.length ||
      !Number.isInteger(lastSession.post_terminal_attempt_count) ||
      lastSession.post_terminal_attempt_count < 0 ||
      lastSession.post_terminal_attempt_count > 4 ||
      (lastSession.first_resolve_status !== null && ![
        'resolved', 'missing', 'denied', 'expired', 'unavailable', 'error', 'other'
      ].includes(lastSession.first_resolve_status)) ||
      (lastSession.terminal_read_status !== null && ![
        'found', 'empty', 'available', 'denied', 'expired', 'unavailable', 'error', 'other'
      ].includes(lastSession.terminal_read_status)) ||
      ![
        'pending', 'no_tool_selected', 'read_without_resolve', 'resolve_retried',
        'resolve_failed', 'resolve_only', 'multiple_reads_before_terminal',
        'invalid_sequence', 'post_terminal_retry_attempted', 'unexpected_read_tool',
        'resolve_then_one_read'
      ].includes(lastSession.workflow_outcome) ||
      !Number.isInteger(lastSession.total_latency_ms) || lastSession.total_latency_ms < 0 ||
      lastSession.total_latency_ms > 240_000 ||
      !Number.isInteger(lastSession.result_count) || lastSession.result_count < 0 ||
      lastSession.result_count > 5 ||
      (lastSession.max_relevance !== null &&
       (!Number.isFinite(lastSession.max_relevance) ||
        lastSession.max_relevance < 0 || lastSession.max_relevance > 1)) ||
      typeof lastSession.timed_out !== 'boolean' ||
      (lastSession.error_code !== null &&
       !/^[a-z][a-z0-9_]{0,79}$/u.test(lastSession.error_code)) ||
      typeof lastSession.tool_attempt_in_flight !== 'boolean' ||
      !Number.isInteger(lastSession.provider_calls) || lastSession.provider_calls < 0 ||
      !Number.isInteger(lastSession.native_invocations) || lastSession.native_invocations < 0) {
    reject('r5a_dogfood_cli_last_session_invalid');
  }
  return lastSession;
}

function validateResponse(response, operation) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    reject('r5a_dogfood_cli_response_invalid');
  }
  const actual = Object.keys(response).sort();
  if (actual.length !== RESPONSE_KEYS.length ||
      actual.some((key, index) => key !== RESPONSE_KEYS[index]) ||
      ![2, 3].includes(response.schema_version) || response.operation !== operation ||
      response.accepted !== true || response.default_closed !== true ||
      response.durable_state_written !== false ||
      !/^sha256:[a-f0-9]{64}$/u.test(response.receipt_digest || '')) {
    reject('r5a_dogfood_cli_response_invalid');
  }
  validateObservation(response.observation);
  return response;
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  const socketPath = process.env.CODEX_MEMORY_R4_SESSION_CONTROL_UDS_PATH;
  const response = await callControlSocket(socketPath, parsed.request, {
    validate: validateResponse
  });
  const output = parsed.json
    ? JSON.stringify(response)
    : `${response.operation}: ${response.activation_status}; sessions=${response.observation.sessions_started}`;
  process.stdout.write(`${output}\n`);
}

if (require.main === module) {
  main().catch(error => {
    const code = typeof error?.code === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(error.code)
      ? error.code
      : 'r5a_dogfood_cli_failed';
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  parseArguments,
  validateLastSession,
  validateObservation,
  validateResponse
};
