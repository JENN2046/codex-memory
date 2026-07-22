'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const { ZERO_MEMORY_COUNTERS } = require('../../packages/chatgpt-r4-contracts');
const { createSessionReadActivationController } = require(
  '../../src/adapters/chatgpt-r4/session-read-activation'
);
const {
  parseArguments,
  validateObservation,
  validateResponse
} = require('../../src/cli/chatgpt-r5-private-dogfood');
const {
  createPrivateDogfoodObserver,
  DOGFOOD_OBSERVATION_KIND,
  DOGFOOD_OBSERVATION_SCHEMA_VERSION
} = require('../../src/runtime/chatgpt-r4/private-dogfood-observer');
const {
  createSessionActivationControlServer,
  validateControlRequest
} = require('../../src/runtime/chatgpt-r4/session-activation-control-server');

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function observe(observer, toolName, status, activationStatus, options = {}) {
  const sessionOrdinal = observer.beginToolAttempt({ toolName });
  observer.observeToolResult({
    toolName,
    latencyMs: options.latencyMs || 1,
    status,
    resultCount: options.resultCount || 0,
    relevance: options.relevance ?? null,
    counters: ZERO_MEMORY_COUNTERS,
    activationSnapshot: { activation_status: activationStatus },
    sessionOrdinal
  });
}

test('R5-H classifies a correct unprompted one-read workflow and detects a post-terminal retry', () => {
  const observer = createPrivateDogfoodObserver();
  observer.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    taskClass: 'memory_relevant',
    expectedReadTool: 'search_memory',
    activationSnapshot: { activation_status: 'active' }
  });
  observe(observer, 'resolve_memory_context', 'resolved', 'active', { latencyMs: 7 });
  observe(observer, 'search_memory', 'found', 'consumed', {
    latencyMs: 13,
    resultCount: 1,
    relevance: 0.5
  });

  let snapshot = observer.snapshot();
  assert.equal(snapshot.schema_version, DOGFOOD_OBSERVATION_SCHEMA_VERSION);
  assert.equal(snapshot.memory_relevant_sessions, 1);
  assert.equal(snapshot.exact_first_resolution_successes, 1);
  assert.equal(snapshot.expected_read_tool_matches, 1);
  assert.equal(snapshot.terminal_stop_sessions, 1);
  assert.equal(snapshot.post_terminal_retry_sessions, 0);
  assert.equal(snapshot.read_tool_selection_counts.search_memory, 1);
  assert.equal(snapshot.last_session.workflow_outcome, 'resolve_then_one_read');
  assert.equal(snapshot.last_session.total_latency_ms, 20);

  assert.equal(observer.beginToolAttempt({ toolName: 'memory_overview' }), null);
  snapshot = observer.snapshot();
  assert.equal(snapshot.post_terminal_tool_attempts, 1);
  assert.equal(snapshot.post_terminal_retry_sessions, 1);
  assert.equal(snapshot.terminal_stop_sessions, 0);
  assert.equal(snapshot.last_session.workflow_outcome, 'post_terminal_retry_attempted');
  assert.equal(snapshot.provider_calls, 0);
  assert.equal(snapshot.primary_memory_writes, 0);
  assert.equal(snapshot.unrestricted_native_searches, 0);
});

test('R5-H distinguishes negative abstention, wrong first tool, and unexpected read choice', () => {
  const observer = createPrivateDogfoodObserver();
  observer.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    taskClass: 'memory_irrelevant',
    activationSnapshot: { activation_status: 'active' }
  });
  observer.syncActivation({ activation_status: 'killed' });

  observer.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    taskClass: 'scope_missing',
    activationSnapshot: { activation_status: 'active' }
  });
  observe(observer, 'search_memory', 'unavailable', 'active');
  observer.syncActivation({ activation_status: 'killed' });

  observer.beginSession({
    observationKind: DOGFOOD_OBSERVATION_KIND,
    taskClass: 'memory_relevant',
    expectedReadTool: 'audit_memory',
    activationSnapshot: { activation_status: 'active' }
  });
  observe(observer, 'resolve_memory_context', 'resolved', 'active');
  observe(observer, 'memory_overview', 'empty', 'consumed');

  const observation = observer.exportObservation();
  assert.equal(observation.sessions_started, 3);
  assert.equal(observation.memory_irrelevant_sessions, 1);
  assert.equal(observation.scope_missing_sessions, 1);
  assert.equal(observation.negative_abstention_sessions, 1);
  assert.equal(observation.unexpected_negative_memory_selection_sessions, 1);
  assert.equal(observation.wrong_first_tool_sessions, 1);
  assert.equal(observation.expected_read_tool_matches, 0);
  assert.equal(observation.sessions[0].workflow_outcome, 'no_tool_selected');
  assert.equal(observation.sessions[1].workflow_outcome, 'read_without_resolve');
  assert.equal(observation.sessions[2].workflow_outcome, 'unexpected_read_tool');
  assert.equal(JSON.stringify(observation).includes('project-alpha'), false);
  assert.equal(JSON.stringify(observation).includes('query'), false);
});

test('R5-H task classification is owner-only, versioned, and fail closed', () => {
  const positive = parseArguments([
    'activate', '--visibility', 'project', '--ttl-seconds', '300',
    '--task-class', 'memory_relevant', '--expected-read-tool', 'prepare_memory_context', '--json'
  ]);
  assert.equal(positive.request.schema_version, 3);
  assert.equal(positive.request.task_class, 'memory_relevant');
  assert.equal(positive.request.expected_read_tool, 'prepare_memory_context');
  assert.doesNotThrow(() => validateControlRequest(positive.request));

  const negative = parseArguments([
    'activate', '--visibility', 'project', '--task-class', 'scope_missing', '--json'
  ]);
  assert.equal(negative.request.schema_version, 3);
  assert.equal(negative.request.task_class, 'scope_missing');
  assert.equal(negative.request.expected_read_tool, undefined);
  assert.doesNotThrow(() => validateControlRequest(negative.request));

  const legacy = parseArguments(['activate', '--visibility', 'project', '--json']);
  assert.equal(legacy.request.schema_version, 2);

  assert.throws(() => parseArguments([
    'activate', '--task-class', 'memory_relevant', '--json'
  ]), { code: 'r5h_dogfood_cli_task_class_invalid' });
  assert.throws(() => parseArguments([
    'activate', '--task-class', 'memory_irrelevant',
    '--expected-read-tool', 'search_memory', '--json'
  ]), { code: 'r5h_dogfood_cli_task_class_invalid' });
  assert.throws(() => validateControlRequest({
    ...positive.request,
    task_class: 'scope_missing'
  }), { code: 'r4_session_control_request_shape_invalid' });
});

test('R5-H schema-3 control response remains low disclosure and passes the owner CLI validator', () => {
  const observer = createPrivateDogfoodObserver();
  const controller = createSessionReadActivationController({
    expectedPrincipalFingerprint: sha256('r5h-owner'),
    selectedProjectAlias: 'project-alpha'
  });
  const server = createSessionActivationControlServer({
    socketPath: '/tmp/codex-memory-r5h-not-started.sock',
    activationController: controller,
    dogfoodObserver: observer,
    statSync() {
      return { isDirectory: () => true, uid: process.getuid(), mode: 0o40700 };
    }
  });
  const request = {
    schema_version: 3,
    operation: 'activate',
    request_id: 'op_r5h_control_activate_0000001',
    requested_visibility: 'project',
    ttl_seconds: 30,
    observation_kind: DOGFOOD_OBSERVATION_KIND,
    task_class: 'memory_relevant',
    expected_read_tool: 'search_memory'
  };
  const response = server.handleControlRequest(request);
  assert.equal(response.schema_version, 3);
  assert.equal(response.observation.schema_version, DOGFOOD_OBSERVATION_SCHEMA_VERSION);
  assert.equal(response.observation.last_session.task_class, 'memory_relevant');
  assert.doesNotThrow(() => validateResponse(response, 'activate'));
  assert.doesNotThrow(() => validateObservation(response.observation));
  const serialized = JSON.stringify(response);
  assert.doesNotMatch(serialized, /project-alpha|r5h-owner|"query"|"prompt"/iu);
  assert.equal(response.observation.raw_memory_recorded, false);

  assert.throws(() => validateObservation({
    ...response.observation,
    raw_prompt: 'forbidden'
  }), { code: 'r5a_dogfood_cli_observation_invalid' });
});
