'use strict';

const { reject } = require('../../../packages/chatgpt-r4-contracts');

const MAX_DOGFOOD_SESSIONS = 20;
const MAX_DOGFOOD_PROVIDER_CALLS = 25;
const MAX_DOGFOOD_TOOL_EVENTS_PER_SESSION = 4;
const MAX_DOGFOOD_POST_TERMINAL_ATTEMPTS_PER_SESSION = 4;
const DOGFOOD_OBSERVATION_KIND = 'meaningful_task_unprompted';
const DOGFOOD_OBSERVATION_SCHEMA_VERSION = 2;
const DOGFOOD_TASK_CLASSES = Object.freeze([
  'memory_relevant',
  'memory_irrelevant',
  'scope_missing'
]);
const SAFE_ERROR_CODE_PATTERN = /^[a-z][a-z0-9_]{0,79}$/u;
const READ_TOOL_NAMES = Object.freeze([
  'memory_overview',
  'search_memory',
  'audit_memory',
  'prepare_memory_context'
]);

function createPrivateDogfoodObserver({
  maxSessions = MAX_DOGFOOD_SESSIONS,
  maxProviderCalls = MAX_DOGFOOD_PROVIDER_CALLS,
  clock = () => new Date()
} = {}) {
  if (!Number.isInteger(maxSessions) || maxSessions < 1 || maxSessions > MAX_DOGFOOD_SESSIONS ||
      !Number.isInteger(maxProviderCalls) || maxProviderCalls < 1 ||
      maxProviderCalls > MAX_DOGFOOD_PROVIDER_CALLS || typeof clock !== 'function') {
    reject('r5a_dogfood_observer_invalid');
  }

  const sessions = [];
  let emergencyStopLatched = false;
  let derivedRuntimeMutationEvidenceCount = 0;
  const counters = {
    provider_calls: 0,
    native_invocations: 0,
    local_fallbacks: 0,
    primary_memory_writes: 0,
    derived_index_writes: 0,
    other_durable_mutations: 0,
    unrestricted_native_searches: 0
  };

  function now() {
    const value = clock();
    const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
    if (!Number.isFinite(date.getTime())) reject('r5a_dogfood_clock_invalid');
    return date;
  }

  function currentSession() {
    return sessions.at(-1) || null;
  }

  function syncActivation(activationSnapshot) {
    const session = currentSession();
    if (!session || session.status !== 'active') return;
    const status = activationSnapshot?.activation_status;
    if (!['inactive', 'active', 'consumed', 'killed', 'expired'].includes(status)) {
      reject('r5a_dogfood_activation_snapshot_invalid');
    }
    if (status === 'active') return;
    session.status = status;
    session.ended_at = now().toISOString();
  }

  function prepareActivation(activationSnapshot) {
    syncActivation(activationSnapshot);
    if (emergencyStopLatched) reject('r5a_dogfood_emergency_stop_latched');
    if (currentSession()?.tool_attempt_in_flight === true) {
      reject('r5a_dogfood_tool_attempt_in_flight');
    }
    if (currentSession()?.status === 'active') reject('r5a_dogfood_session_already_active');
    if (sessions.length >= maxSessions) reject('r5a_dogfood_session_budget_exhausted');
    if (counters.provider_calls >= maxProviderCalls) reject('r5a_dogfood_provider_budget_exhausted');
    return true;
  }

  function beginSession({
    observationKind,
    taskClass,
    expectedReadTool = null,
    activationSnapshot
  } = {}) {
    if (emergencyStopLatched) reject('r5a_dogfood_emergency_stop_latched');
    if (currentSession()?.tool_attempt_in_flight === true) {
      reject('r5a_dogfood_tool_attempt_in_flight');
    }
    if (observationKind !== DOGFOOD_OBSERVATION_KIND ||
        activationSnapshot?.activation_status !== 'active') {
      reject('r5a_dogfood_session_begin_invalid');
    }
    const normalizedTaskClass = taskClass === undefined ? 'unclassified' : taskClass;
    if (![...DOGFOOD_TASK_CLASSES, 'unclassified'].includes(normalizedTaskClass) ||
        (normalizedTaskClass === 'memory_relevant' && taskClass !== undefined &&
         !READ_TOOL_NAMES.includes(expectedReadTool)) ||
        (normalizedTaskClass !== 'memory_relevant' && expectedReadTool !== null)) {
      reject('r5h_dogfood_session_classification_invalid');
    }
    if (currentSession()?.status === 'active') reject('r5a_dogfood_session_already_active');
    if (sessions.length >= maxSessions) reject('r5a_dogfood_session_budget_exhausted');
    if (counters.provider_calls >= maxProviderCalls) {
      reject('r5a_dogfood_provider_budget_exhausted');
    }
    const startedAt = now();
    sessions.push({
      ordinal: sessions.length + 1,
      status: 'active',
      started_at: startedAt.toISOString(),
      ended_at: null,
      task_class: normalizedTaskClass,
      expected_read_tool: expectedReadTool,
      tool_sequence: [],
      resolve_attempt_count: 0,
      read_attempt_count: 0,
      post_terminal_attempt_count: 0,
      first_resolve_status: null,
      terminal_read_status: null,
      total_latency_ms: 0,
      result_count: 0,
      max_relevance: null,
      timed_out: false,
      error_code: null,
      tool_attempt_in_flight: false,
      counters: {
        provider_calls: 0,
        native_invocations: 0,
        local_fallbacks: 0,
        primary_memory_writes: 0,
        derived_index_writes: 0,
        other_durable_mutations: 0,
        unrestricted_native_searches: 0
      }
    });
    return snapshot();
  }

  function beginToolAttempt({ toolName } = {}) {
    const session = currentSession();
    if (!session) return null;
    if (!['resolve_memory_context', ...READ_TOOL_NAMES].includes(toolName)) {
      reject('r5a_dogfood_tool_attempt_invalid');
    }
    if (session.status === 'consumed') {
      if (session.tool_attempt_in_flight === true ||
          session.post_terminal_attempt_count >= MAX_DOGFOOD_POST_TERMINAL_ATTEMPTS_PER_SESSION) {
        reject('r5h_dogfood_post_terminal_attempt_budget_exhausted');
      }
      session.post_terminal_attempt_count += 1;
      return null;
    }
    if (session.status !== 'active') return null;
    if (
        session.tool_attempt_in_flight === true ||
        session.tool_sequence.length >= MAX_DOGFOOD_TOOL_EVENTS_PER_SESSION) {
      reject('r5a_dogfood_tool_attempt_invalid');
    }
    session.tool_attempt_in_flight = true;
    return session.ordinal;
  }

  function assertToolEvent(toolName, latencyMs, sessionOrdinal) {
    if (sessionOrdinal === null) return null;
    const session = currentSession();
    if (!session || !Number.isInteger(sessionOrdinal) || session.ordinal !== sessionOrdinal ||
        session.tool_attempt_in_flight !== true ||
        !['active', 'inactive', 'consumed', 'killed', 'expired'].includes(session.status) ||
        !['resolve_memory_context', ...READ_TOOL_NAMES].includes(toolName) ||
        !Number.isInteger(latencyMs) || latencyMs < 0 || latencyMs > 60_000 ||
        session.tool_sequence.length >= MAX_DOGFOOD_TOOL_EVENTS_PER_SESSION) {
      reject('r5a_dogfood_tool_event_invalid');
    }
    return session;
  }

  function resultStatusCategory(toolName, status) {
    const allowed = toolName === 'resolve_memory_context'
      ? ['resolved', 'missing', 'denied', 'expired', 'unavailable', 'error']
      : ['found', 'empty', 'available', 'denied', 'expired', 'unavailable', 'error'];
    return allowed.includes(status) ? status : 'other';
  }

  function recordToolEvent(session, toolName, status) {
    session.tool_sequence.push(toolName);
    if (toolName === 'resolve_memory_context') {
      session.resolve_attempt_count += 1;
      if (session.first_resolve_status === null) {
        session.first_resolve_status = resultStatusCategory(toolName, status);
      }
      return;
    }
    session.read_attempt_count += 1;
    session.terminal_read_status = resultStatusCategory(toolName, status);
  }

  function validateDerivedRuntimeMutationEvidence(observedCounters, evidence) {
    if (observedCounters.native_invocations === 0) {
      return observedCounters.derived_index_writes === 0 &&
        (evidence === null || evidence === undefined)
        ? null
        : 'r5d_derived_runtime_mutation_evidence_invalid';
    }
    const allowedTriggers = ['startup', 'hydration', 'cache', 'vector', 'tag', 'matrix'];
    if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence) ||
        evidence.policy !== 'isolated_derived_runtime_mutation_v1' ||
        evidence.authorized !== true || evidence.isolated_runtime_store !== true ||
        evidence.accounting_final !== false || evidence.policy_violation !== false ||
        evidence.source_partition_mutation !== false ||
        evidence.legacy_partition_accessed !== false ||
        evidence.ambiguous_partition_accessed !== false ||
        evidence.unregistered_partition_accessed !== false ||
        evidence.unrestricted_native_search !== false ||
        evidence.raw_details_disclosed !== false ||
        !Number.isInteger(evidence.cumulative_count) || evidence.cumulative_count < 0 ||
        !Number.isInteger(evidence.receipt_delta) || evidence.receipt_delta < 0 ||
        evidence.receipt_delta !== observedCounters.derived_index_writes ||
        evidence.receipt_delta > evidence.cumulative_count ||
        !Number.isInteger(evidence.active_count) || evidence.active_count < 0 ||
        !Number.isInteger(evidence.completed_count) || evidence.completed_count < 0 ||
        !Number.isInteger(evidence.failed_count) || evidence.failed_count !== 0 ||
        evidence.active_count + evidence.completed_count + evidence.failed_count !==
          evidence.cumulative_count ||
        !Array.isArray(evidence.trigger_categories) ||
        evidence.trigger_categories.some(trigger => !allowedTriggers.includes(trigger)) ||
        (evidence.cumulative_count > 0 && evidence.trigger_categories.length === 0)) {
      return 'r5d_derived_runtime_mutation_evidence_invalid';
    }
    derivedRuntimeMutationEvidenceCount += 1;
    return null;
  }

  function addCounters(session, observedCounters, derivedRuntimeMutationEvidence) {
    const keys = Object.keys(counters);
    if (!observedCounters || typeof observedCounters !== 'object' || Array.isArray(observedCounters) ||
        Object.keys(observedCounters).length !== keys.length ||
        keys.some(key => !Object.hasOwn(observedCounters, key) ||
          !Number.isInteger(observedCounters[key]) || observedCounters[key] < 0)) {
      reject('r5a_dogfood_counter_shape_invalid');
    }
    const providerBudgetExceeded =
      counters.provider_calls + observedCounters.provider_calls > maxProviderCalls;
    const derivedEvidenceViolation = validateDerivedRuntimeMutationEvidence(
      observedCounters,
      derivedRuntimeMutationEvidence
    );
    const forbiddenCounterObserved = observedCounters.primary_memory_writes !== 0 ||
      observedCounters.local_fallbacks !== 0 ||
      observedCounters.unrestricted_native_searches !== 0;
    for (const key of keys) {
      session.counters[key] += observedCounters[key];
      counters[key] += observedCounters[key];
    }
    if (forbiddenCounterObserved) return 'r5a_dogfood_forbidden_counter_observed';
    if (derivedEvidenceViolation) return derivedEvidenceViolation;
    if (providerBudgetExceeded) return 'r5a_dogfood_provider_budget_exhausted';
    return null;
  }

  function observeToolResult({
    toolName,
    latencyMs,
    status,
    resultCount = 0,
    relevance = null,
    counters: observedCounters,
    derivedRuntimeMutationEvidence = null,
    activationSnapshot,
    sessionOrdinal = null
  } = {}) {
    const session = assertToolEvent(toolName, latencyMs, sessionOrdinal);
    if (!session) return false;
    if (typeof status !== 'string' || !status || status.length > 40 ||
        !Number.isInteger(resultCount) || resultCount < 0 || resultCount > 5 ||
        (relevance !== null && (!Number.isFinite(relevance) || relevance < 0 || relevance > 1))) {
      reject('r5a_dogfood_tool_result_invalid');
    }
    const counterViolation = addCounters(
      session,
      observedCounters,
      derivedRuntimeMutationEvidence
    );
    recordToolEvent(session, toolName, status);
    session.tool_attempt_in_flight = false;
    session.total_latency_ms += latencyMs;
    session.result_count = resultCount;
    if (relevance !== null) {
      session.max_relevance = session.max_relevance === null
        ? relevance
        : Math.max(session.max_relevance, relevance);
    }
    syncActivation(activationSnapshot);
    if (counterViolation) reject(counterViolation);
    return true;
  }

  function observeToolError({
    toolName,
    latencyMs,
    errorCode,
    activationSnapshot,
    sessionOrdinal = null
  } = {}) {
    const session = assertToolEvent(toolName, latencyMs, sessionOrdinal);
    if (!session) return false;
    if (!SAFE_ERROR_CODE_PATTERN.test(errorCode || '')) reject('r5a_dogfood_error_code_invalid');
    recordToolEvent(session, toolName, 'error');
    session.tool_attempt_in_flight = false;
    session.total_latency_ms += latencyMs;
    session.error_code = errorCode;
    session.timed_out = errorCode.includes('timeout');
    syncActivation(activationSnapshot);
    return true;
  }

  function markEmergencyStop({ errorCode } = {}) {
    const session = currentSession();
    if (!session || !['active', 'inactive', 'consumed', 'killed', 'expired'].includes(session.status) ||
        !SAFE_ERROR_CODE_PATTERN.test(errorCode || '')) {
      reject('r5a_dogfood_emergency_stop_invalid');
    }
    session.status = 'emergency_stopped';
    session.error_code = errorCode;
    session.ended_at = now().toISOString();
    session.tool_attempt_in_flight = false;
    emergencyStopLatched = true;
    return true;
  }

  function sessionProjection(session) {
    if (!session) return null;
    return Object.freeze({
      ordinal: session.ordinal,
      status: session.status,
      task_class: session.task_class,
      expected_read_tool: session.expected_read_tool,
      tool_sequence: Object.freeze([...session.tool_sequence]),
      resolve_attempt_count: session.resolve_attempt_count,
      read_attempt_count: session.read_attempt_count,
      post_terminal_attempt_count: session.post_terminal_attempt_count,
      first_resolve_status: session.first_resolve_status,
      terminal_read_status: session.terminal_read_status,
      workflow_outcome: workflowOutcome(session),
      total_latency_ms: session.total_latency_ms,
      result_count: session.result_count,
      max_relevance: session.max_relevance,
      timed_out: session.timed_out,
      error_code: session.error_code,
      tool_attempt_in_flight: session.tool_attempt_in_flight,
      provider_calls: session.counters.provider_calls,
      native_invocations: session.counters.native_invocations
    });
  }

  function isExactResolvedOneRead(session) {
    return session.tool_sequence.length === 2 &&
      session.tool_sequence[0] === 'resolve_memory_context' &&
      READ_TOOL_NAMES.includes(session.tool_sequence[1]) &&
      session.resolve_attempt_count === 1 && session.read_attempt_count === 1 &&
      session.first_resolve_status === 'resolved';
  }

  function expectedReadMatched(session) {
    return session.task_class === 'memory_relevant' &&
      isExactResolvedOneRead(session) &&
      session.tool_sequence[1] === session.expected_read_tool;
  }

  function workflowOutcome(session) {
    if (session.tool_sequence.length === 0) {
      return session.status === 'active' ? 'pending' : 'no_tool_selected';
    }
    if (session.tool_sequence[0] !== 'resolve_memory_context') return 'read_without_resolve';
    if (session.resolve_attempt_count > 1) return 'resolve_retried';
    if (session.first_resolve_status !== 'resolved') return 'resolve_failed';
    if (session.read_attempt_count === 0) return 'resolve_only';
    if (session.read_attempt_count > 1) return 'multiple_reads_before_terminal';
    if (!isExactResolvedOneRead(session)) return 'invalid_sequence';
    if (session.post_terminal_attempt_count > 0) return 'post_terminal_retry_attempted';
    return session.expected_read_tool && session.tool_sequence[1] !== session.expected_read_tool
      ? 'unexpected_read_tool'
      : 'resolve_then_one_read';
  }

  function snapshot(activationSnapshot) {
    if (activationSnapshot) syncActivation(activationSnapshot);
    const sessionsWithAnyTool = sessions.filter(session => session.tool_sequence.length > 0).length;
    const sessionsWithResolve = sessions.filter(session =>
      session.tool_sequence.includes('resolve_memory_context')).length;
    const sessionsWithRead = sessions.filter(session =>
      session.tool_sequence.some(toolName => READ_TOOL_NAMES.includes(toolName))).length;
    const resolveThenRead = sessions.filter(session =>
      session.tool_sequence[0] === 'resolve_memory_context' &&
      READ_TOOL_NAMES.includes(session.tool_sequence[1])).length;
    const relevantSessions = sessions.filter(session => session.task_class === 'memory_relevant');
    const negativeSessions = sessions.filter(session =>
      ['memory_irrelevant', 'scope_missing'].includes(session.task_class));
    const readToolSelectionCounts = Object.fromEntries(READ_TOOL_NAMES.map(toolName => [
      toolName,
      sessions.filter(session => session.tool_sequence.includes(toolName)).length
    ]));
    return Object.freeze({
      schema_version: DOGFOOD_OBSERVATION_SCHEMA_VERSION,
      observation_kind: DOGFOOD_OBSERVATION_KIND,
      sessions_started: sessions.length,
      session_limit: maxSessions,
      memory_relevant_sessions: relevantSessions.length,
      memory_irrelevant_sessions: sessions.filter(session =>
        session.task_class === 'memory_irrelevant').length,
      scope_missing_sessions: sessions.filter(session =>
        session.task_class === 'scope_missing').length,
      unclassified_sessions: sessions.filter(session =>
        session.task_class === 'unclassified').length,
      sessions_with_any_memory_tool: sessionsWithAnyTool,
      sessions_with_resolve: sessionsWithResolve,
      sessions_with_read: sessionsWithRead,
      resolve_then_read_sessions: resolveThenRead,
      exact_first_resolution_successes: relevantSessions.filter(session =>
        session.tool_sequence[0] === 'resolve_memory_context' &&
        session.resolve_attempt_count === 1 &&
        session.first_resolve_status === 'resolved').length,
      expected_read_tool_matches: relevantSessions.filter(expectedReadMatched).length,
      terminal_stop_sessions: relevantSessions.filter(session =>
        expectedReadMatched(session) && session.status === 'consumed' &&
        session.post_terminal_attempt_count === 0).length,
      post_terminal_retry_sessions: sessions.filter(session =>
        session.post_terminal_attempt_count > 0).length,
      post_terminal_tool_attempts: sessions.reduce((total, session) =>
        total + session.post_terminal_attempt_count, 0),
      resolve_retry_sessions: sessions.filter(session =>
        session.resolve_attempt_count > 1).length,
      wrong_first_tool_sessions: sessions.filter(session =>
        session.tool_sequence.length > 0 &&
        session.tool_sequence[0] !== 'resolve_memory_context').length,
      negative_abstention_sessions: negativeSessions.filter(session =>
        session.status !== 'active' && session.tool_sequence.length === 0).length,
      unexpected_negative_memory_selection_sessions: negativeSessions.filter(session =>
        session.tool_sequence.length > 0).length,
      read_tool_selection_counts: Object.freeze(readToolSelectionCounts),
      timeout_count: sessions.filter(session => session.timed_out).length,
      emergency_stop_latched: emergencyStopLatched,
      provider_calls: counters.provider_calls,
      provider_call_limit: maxProviderCalls,
      native_invocations: counters.native_invocations,
      local_fallbacks: counters.local_fallbacks,
      primary_memory_writes: counters.primary_memory_writes,
      derived_index_writes: counters.derived_index_writes,
      derived_runtime_mutation_policy: 'isolated_derived_runtime_mutation_v1',
      derived_runtime_mutation_evidence_count: derivedRuntimeMutationEvidenceCount,
      derived_runtime_mutation_policy_violations: emergencyStopLatched &&
        currentSession()?.error_code?.startsWith('r5d_derived_runtime_mutation_')
        ? 1
        : 0,
      other_durable_mutations: counters.other_durable_mutations,
      unrestricted_native_searches: counters.unrestricted_native_searches,
      durable_observation_state_written: false,
      request_bodies_logged: 0,
      response_bodies_logged: 0,
      raw_memory_recorded: false,
      last_session: sessionProjection(currentSession())
    });
  }

  function exportObservation() {
    return Object.freeze({
      ...snapshot(),
      sessions: Object.freeze(sessions.map(session => sessionProjection(session)))
    });
  }

  return Object.freeze({
    prepareActivation,
    beginSession,
    beginToolAttempt,
    observeToolResult,
    observeToolError,
    markEmergencyStop,
    syncActivation,
    snapshot,
    exportObservation
  });
}

module.exports = {
  DOGFOOD_OBSERVATION_KIND,
  DOGFOOD_OBSERVATION_SCHEMA_VERSION,
  DOGFOOD_TASK_CLASSES,
  MAX_DOGFOOD_PROVIDER_CALLS,
  MAX_DOGFOOD_POST_TERMINAL_ATTEMPTS_PER_SESSION,
  MAX_DOGFOOD_SESSIONS,
  MAX_DOGFOOD_TOOL_EVENTS_PER_SESSION,
  READ_TOOL_NAMES,
  createPrivateDogfoodObserver
};
