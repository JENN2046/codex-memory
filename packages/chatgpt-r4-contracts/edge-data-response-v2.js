'use strict';

const {
  CHATGPT_EDGE_DATA_SCHEMA_VERSION
} = require('./constants');
const {
  deepFreeze,
  isPlainObject
} = require('./canonical');
const { reject } = require('./errors');
const {
  aggregateAttemptCounters,
  GOVERNED_READ_ATTEMPT_READ_TOOLS,
  failureRegistryEntry,
  projectGovernedReadAttemptPublic,
  validateGovernedReadAttemptProtocol,
  validateGovernedReadAttemptPublicProjection,
  validateGovernedReadAttemptWorkingSet
} = require('./governed-read-attempt');

function governedReadTerminalResponseStatus(terminal) {
  if (!isPlainObject(terminal) ||
      !['success', 'failure'].includes(terminal.outcome)) {
    reject('attempt_terminal_response_status_invalid');
  }
  if (terminal.outcome === 'success') {
    if (terminal.reason_code !== null ||
        terminal.failure_category !== null) {
      reject('attempt_terminal_response_status_invalid');
    }
    return 'ok';
  }
  const failure = failureRegistryEntry(terminal.reason_code);
  if (terminal.failure_category !== failure.category) {
    reject('attempt_terminal_response_status_invalid');
  }
  return failure.category === 'authorization'
    ? 'denied'
    : 'unavailable';
}

function validateGovernedReadResponseStatus(status, terminal) {
  if (status !== governedReadTerminalResponseStatus(terminal)) {
    reject('relay_attempt_response_terminal_mismatch');
  }
  return terminal;
}

function createChatGptEdgeDataResponseV2({
  toolName,
  structuredContent,
  governedReadAttempt = null
} = {}) {
  if (!isPlainObject(structuredContent)) {
    reject('response_structured_content_shape_invalid');
  }
  if (Object.hasOwn(structuredContent, 'schema_version') ||
      Object.hasOwn(structuredContent, 'attempt')) {
    reject('response_structured_content_shape_invalid');
  }
  if (toolName === 'resolve_memory_context') {
    if (governedReadAttempt !== null) {
      reject('edge_data_response_attempt_forbidden');
    }
    return deepFreeze({
      schema_version: CHATGPT_EDGE_DATA_SCHEMA_VERSION,
      ...structuredClone(structuredContent)
    });
  }
  if (!GOVERNED_READ_ATTEMPT_READ_TOOLS.includes(toolName) ||
      governedReadAttempt === null) {
    reject('edge_data_response_attempt_required');
  }
  validateGovernedReadAttemptProtocol(governedReadAttempt);
  if (governedReadAttempt.header.tool_name !== toolName) {
    reject('edge_data_response_attempt_binding_invalid');
  }
  return deepFreeze({
    schema_version: CHATGPT_EDGE_DATA_SCHEMA_VERSION,
    ...structuredClone(structuredContent),
    attempt: projectGovernedReadAttemptPublic(governedReadAttempt)
  });
}

function createGovernedReadFailureLegacyContent(toolName, terminal) {
  const status = governedReadTerminalResponseStatus(terminal);
  if (status === 'ok') {
    reject('edge_data_response_failure_expected');
  }
  if (toolName === 'search_memory') {
    return deepFreeze({
      status,
      result_count: 0,
      results: []
    });
  }
  const kind = {
    memory_overview: 'overview',
    audit_memory: 'audit',
    prepare_memory_context: 'context'
  }[toolName];
  if (!kind) reject('edge_data_response_attempt_binding_invalid');
  return deepFreeze({
    status,
    kind,
    item_count: 0
  });
}

function projectLegacyCountersFromGovernedReadAttempt(protocol) {
  validateGovernedReadAttemptProtocol(protocol);
  return projectLegacyCounters(
    protocol.terminal.counters
  );
}

function projectLegacyCountersFromGovernedReadAttemptWorkingSet(
  workingSet
) {
  validateGovernedReadAttemptWorkingSet(workingSet);
  return projectLegacyCounters(
    aggregateAttemptCounters(workingSet.receipts)
  );
}

function projectLegacyCountersFromGovernedReadAttemptPublic(
  projection
) {
  validateGovernedReadAttemptPublicProjection(projection);
  return projectLegacyCounters(projection.counters);
}

function projectLegacyCounters(counters) {
  return deepFreeze({
    provider_calls: counters.provider.started,
    native_invocations: counters.native_invocation.started,
    local_fallbacks: counters.fallback.attempts,
    primary_memory_writes: counters.primary_memory.write_attempts,
    derived_index_writes: counters.derived_transaction.started,
    other_durable_mutations: 0,
    unrestricted_native_searches: 0
  });
}

function validateLegacyInvocationCountersAgainstAttemptTerminal(
  invocation,
  terminal
) {
  if (!isPlainObject(invocation) || !isPlainObject(terminal?.counters)) {
    reject('relay_attempt_counter_mismatch');
  }
  const mappings = [
    ['provider_calls', terminal.counters.provider?.started],
    ['native_invocations', terminal.counters.native_invocation?.started],
    ['local_fallbacks', terminal.counters.fallback?.attempts],
    ['primary_memory_writes',
      terminal.counters.primary_memory?.write_attempts],
    ['derived_index_writes',
      terminal.counters.derived_transaction?.started]
  ];
  for (const [field, terminalValue] of mappings) {
    if (invocation[field] !== terminalValue) {
      reject('relay_attempt_counter_mismatch');
    }
  }
  if (invocation.other_durable_mutations !== 0 ||
      invocation.unrestricted_native_searches !== 0) {
    reject('relay_attempt_counter_mismatch');
  }
  return invocation;
}

function validateLegacyResponseCountersAgainstAttemptPublic(
  counters,
  projection
) {
  if (!isPlainObject(counters)) {
    reject('relay_attempt_counter_mismatch');
  }
  const expected =
    projectLegacyCountersFromGovernedReadAttemptPublic(projection);
  const actualKeys = Object.keys(counters).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (actualKeys.length !== expectedKeys.length ||
      actualKeys.some((key, index) => key !== expectedKeys[index]) ||
      expectedKeys.some(key => counters[key] !== expected[key])) {
    reject('relay_attempt_counter_mismatch');
  }
  return counters;
}

module.exports = {
  createChatGptEdgeDataResponseV2,
  createGovernedReadFailureLegacyContent,
  governedReadTerminalResponseStatus,
  projectLegacyCountersFromGovernedReadAttempt,
  projectLegacyCountersFromGovernedReadAttemptPublic,
  projectLegacyCountersFromGovernedReadAttemptWorkingSet,
  validateGovernedReadResponseStatus,
  validateLegacyInvocationCountersAgainstAttemptTerminal,
  validateLegacyResponseCountersAgainstAttemptPublic
};
