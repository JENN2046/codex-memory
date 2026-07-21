'use strict';

const { reject } = require('../../../packages/chatgpt-r4-contracts');

const MAX_DOGFOOD_SESSIONS = 20;
const MAX_DOGFOOD_PROVIDER_CALLS = 25;
const MAX_DOGFOOD_TOOL_EVENTS_PER_SESSION = 4;
const DOGFOOD_OBSERVATION_KIND = 'meaningful_task_unprompted';
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
    if (currentSession()?.status === 'active') reject('r5a_dogfood_session_already_active');
    if (sessions.length >= maxSessions) reject('r5a_dogfood_session_budget_exhausted');
    if (counters.provider_calls >= maxProviderCalls) reject('r5a_dogfood_provider_budget_exhausted');
    return true;
  }

  function beginSession({ observationKind, activationSnapshot } = {}) {
    if (observationKind !== DOGFOOD_OBSERVATION_KIND ||
        activationSnapshot?.activation_status !== 'active') {
      reject('r5a_dogfood_session_begin_invalid');
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
      tool_sequence: [],
      total_latency_ms: 0,
      result_count: 0,
      max_relevance: null,
      timed_out: false,
      error_code: null,
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

  function assertToolEvent(toolName, latencyMs) {
    const session = currentSession();
    if (!session || session.status !== 'active') return null;
    if (!['resolve_memory_context', ...READ_TOOL_NAMES].includes(toolName) ||
        !Number.isInteger(latencyMs) || latencyMs < 0 || latencyMs > 60_000 ||
        session.tool_sequence.length >= MAX_DOGFOOD_TOOL_EVENTS_PER_SESSION) {
      reject('r5a_dogfood_tool_event_invalid');
    }
    return session;
  }

  function addCounters(session, observedCounters) {
    const keys = Object.keys(counters);
    if (!observedCounters || typeof observedCounters !== 'object' || Array.isArray(observedCounters) ||
        Object.keys(observedCounters).length !== keys.length ||
        keys.some(key => !Object.hasOwn(observedCounters, key) ||
          !Number.isInteger(observedCounters[key]) || observedCounters[key] < 0)) {
      reject('r5a_dogfood_counter_shape_invalid');
    }
    if (observedCounters.primary_memory_writes !== 0 ||
        observedCounters.derived_index_writes !== 0 ||
        observedCounters.local_fallbacks !== 0 ||
        observedCounters.unrestricted_native_searches !== 0) {
      reject('r5a_dogfood_forbidden_counter_observed');
    }
    if (counters.provider_calls + observedCounters.provider_calls > maxProviderCalls) {
      reject('r5a_dogfood_provider_budget_exhausted');
    }
    for (const key of keys) {
      session.counters[key] += observedCounters[key];
      counters[key] += observedCounters[key];
    }
  }

  function observeToolResult({
    toolName,
    latencyMs,
    status,
    resultCount = 0,
    relevance = null,
    counters: observedCounters,
    activationSnapshot
  } = {}) {
    const session = assertToolEvent(toolName, latencyMs);
    if (!session) return false;
    if (typeof status !== 'string' || !status || status.length > 40 ||
        !Number.isInteger(resultCount) || resultCount < 0 || resultCount > 5 ||
        (relevance !== null && (!Number.isFinite(relevance) || relevance < 0 || relevance > 1))) {
      reject('r5a_dogfood_tool_result_invalid');
    }
    addCounters(session, observedCounters);
    session.tool_sequence.push(toolName);
    session.total_latency_ms += latencyMs;
    session.result_count = resultCount;
    if (relevance !== null) {
      session.max_relevance = session.max_relevance === null
        ? relevance
        : Math.max(session.max_relevance, relevance);
    }
    syncActivation(activationSnapshot);
    return true;
  }

  function observeToolError({ toolName, latencyMs, errorCode, activationSnapshot } = {}) {
    const session = assertToolEvent(toolName, latencyMs);
    if (!session) return false;
    if (!SAFE_ERROR_CODE_PATTERN.test(errorCode || '')) reject('r5a_dogfood_error_code_invalid');
    session.tool_sequence.push(toolName);
    session.total_latency_ms += latencyMs;
    session.error_code = errorCode;
    session.timed_out = errorCode.includes('timeout');
    syncActivation(activationSnapshot);
    return true;
  }

  function markEmergencyStop({ errorCode } = {}) {
    const session = currentSession();
    if (!session || !['active', 'consumed'].includes(session.status) ||
        !SAFE_ERROR_CODE_PATTERN.test(errorCode || '')) {
      reject('r5a_dogfood_emergency_stop_invalid');
    }
    session.status = 'emergency_stopped';
    session.error_code = errorCode;
    session.ended_at = now().toISOString();
    return true;
  }

  function sessionProjection(session) {
    if (!session) return null;
    return Object.freeze({
      ordinal: session.ordinal,
      status: session.status,
      tool_sequence: Object.freeze([...session.tool_sequence]),
      total_latency_ms: session.total_latency_ms,
      result_count: session.result_count,
      max_relevance: session.max_relevance,
      timed_out: session.timed_out,
      error_code: session.error_code,
      provider_calls: session.counters.provider_calls,
      native_invocations: session.counters.native_invocations
    });
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
    return Object.freeze({
      schema_version: 1,
      observation_kind: DOGFOOD_OBSERVATION_KIND,
      sessions_started: sessions.length,
      session_limit: maxSessions,
      sessions_with_any_memory_tool: sessionsWithAnyTool,
      sessions_with_resolve: sessionsWithResolve,
      sessions_with_read: sessionsWithRead,
      resolve_then_read_sessions: resolveThenRead,
      timeout_count: sessions.filter(session => session.timed_out).length,
      provider_calls: counters.provider_calls,
      provider_call_limit: maxProviderCalls,
      native_invocations: counters.native_invocations,
      local_fallbacks: counters.local_fallbacks,
      primary_memory_writes: counters.primary_memory_writes,
      derived_index_writes: counters.derived_index_writes,
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
  MAX_DOGFOOD_PROVIDER_CALLS,
  MAX_DOGFOOD_SESSIONS,
  MAX_DOGFOOD_TOOL_EVENTS_PER_SESSION,
  createPrivateDogfoodObserver
};
