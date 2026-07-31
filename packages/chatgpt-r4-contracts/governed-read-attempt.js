'use strict';

const crypto = require('node:crypto');
const {
  canonicalJson,
  deepFreeze,
  digestObject,
  isPlainObject,
  utf8ByteLength
} = require('./canonical');
const { reject } = require('./errors');

const GOVERNED_READ_ATTEMPT_PROTOCOL = 'governed_read_attempt.v1';
const GOVERNED_READ_ATTEMPT_SCHEMA_VERSION = 1;
const GOVERNED_READ_ATTEMPT_COORDINATOR = 'chatgpt_edge_transient_broker';
const GOVERNED_READ_ATTEMPT_REF_PATTERN = /^grat_[A-Za-z0-9_-]{24,96}$/u;
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,79}$/u;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;

const GOVERNED_READ_ATTEMPT_STAGES = Object.freeze([
  'CREATED',
  'EDGE_VALIDATED',
  'RELAY_CLAIMED',
  'AUTHORIZED',
  'BRIDGE_DELEGATED',
  'NATIVE_DISPATCHED',
  'SOURCE_PREFLIGHT',
  'PROVIDER_EMBEDDING',
  'HYDRATION',
  'INDEX_RECOVERY',
  'VECTOR_SEARCH',
  'SCOPE_POSTCHECK',
  'RESPONSE_FINALIZATION',
  'TERMINAL_SUCCESS',
  'TERMINAL_FAILURE'
]);

const GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES = Object.freeze(
  GOVERNED_READ_ATTEMPT_STAGES.slice(0, -2)
);
const GOVERNED_READ_ATTEMPT_TERMINAL_STAGES = Object.freeze(
  GOVERNED_READ_ATTEMPT_STAGES.slice(-2)
);

const GOVERNED_READ_ATTEMPT_ORIGIN_BY_STAGE = Object.freeze({
  CREATED: 'edge_broker',
  EDGE_VALIDATED: 'edge_broker',
  RELAY_CLAIMED: 'relay',
  AUTHORIZED: 'governance',
  BRIDGE_DELEGATED: 'bridge',
  NATIVE_DISPATCHED: 'persistent_shim',
  SOURCE_PREFLIGHT: 'persistent_shim',
  PROVIDER_EMBEDDING: 'provider_wrapper',
  HYDRATION: 'lease_worker',
  INDEX_RECOVERY: 'lease_worker',
  VECTOR_SEARCH: 'lease_worker',
  SCOPE_POSTCHECK: 'scope_checker',
  RESPONSE_FINALIZATION: 'relay',
  TERMINAL_SUCCESS: 'edge_broker',
  TERMINAL_FAILURE: 'edge_broker'
});

const GOVERNED_READ_ATTEMPT_READ_TOOLS = Object.freeze([
  'memory_overview',
  'search_memory',
  'audit_memory',
  'prepare_memory_context'
]);

const GOVERNED_READ_ATTEMPT_LIMITS = Object.freeze({
  headerBytes: 2 * 1024,
  receiptBytes: 1024,
  receiptCount: 16,
  terminalBytes: 4 * 1024,
  protocolBytes: 24 * 1024,
  ttlSeconds: 60,
  counterValue: 1_000_000
});

const GOVERNED_READ_ATTEMPT_COUNTER_FIELDS = deepFreeze({
  provider: ['started', 'succeeded', 'failed'],
  native_invocation: ['started', 'succeeded', 'failed'],
  primary_memory: ['write_attempts', 'writes_committed'],
  derived_transaction: ['started', 'committed', 'rolled_back'],
  fallback: ['attempts']
});

const GOVERNED_READ_ATTEMPT_COUNTER_ORIGINS = deepFreeze({
  provider: ['provider_wrapper'],
  native_invocation: ['persistent_shim', 'lease_worker'],
  primary_memory: ['persistent_shim', 'lease_worker'],
  derived_transaction: ['lease_worker'],
  fallback: ['bridge']
});

const ALL_COUNTER_GROUPS = Object.freeze(
  Object.keys(GOVERNED_READ_ATTEMPT_COUNTER_FIELDS)
);
const SINGLE_OPERATION_COUNTER_TRIPLES = deepFreeze([
  [0, 0, 0],
  [1, 1, 0],
  [1, 0, 1]
]);

function failure({
  category,
  stage,
  origin,
  providerMayHaveOccurred,
  nativeMayHaveOccurred,
  unknownCounterGroups = [],
  terminalCandidateAllowed = true
}) {
  return deepFreeze({
    category,
    stage,
    origin,
    fallback_policy: 'forbidden',
    provider_may_have_occurred: providerMayHaveOccurred,
    native_may_have_occurred: nativeMayHaveOccurred,
    unknown_counter_groups: [...unknownCounterGroups],
    terminal_candidate_allowed: terminalCandidateAllowed
  });
}

const GOVERNED_READ_ATTEMPT_FAILURE_REGISTRY = deepFreeze({
  edge_request_invalid: failure({
    category: 'validation',
    stage: 'EDGE_VALIDATED',
    origin: 'edge_broker',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: false,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  relay_claim_failed: failure({
    category: 'transport',
    stage: 'RELAY_CLAIMED',
    origin: 'relay',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: false,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  governance_denied: failure({
    category: 'authorization',
    stage: 'AUTHORIZED',
    origin: 'governance',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: false,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  bridge_delegation_failed: failure({
    category: 'bridge',
    stage: 'BRIDGE_DELEGATED',
    origin: 'bridge',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  native_attempt_busy: failure({
    category: 'concurrency',
    stage: 'NATIVE_DISPATCHED',
    origin: 'persistent_shim',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: false,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  native_dispatch_failed: failure({
    category: 'native_runtime',
    stage: 'NATIVE_DISPATCHED',
    origin: 'persistent_shim',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  source_preflight_failed: failure({
    category: 'source_validation',
    stage: 'SOURCE_PREFLIGHT',
    origin: 'persistent_shim',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  source_identity_invalid: failure({
    category: 'source_validation',
    stage: 'SOURCE_PREFLIGHT',
    origin: 'persistent_shim',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  source_schema_invalid: failure({
    category: 'source_validation',
    stage: 'SOURCE_PREFLIGHT',
    origin: 'persistent_shim',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  source_scope_invalid: failure({
    category: 'scope',
    stage: 'SOURCE_PREFLIGHT',
    origin: 'persistent_shim',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  source_budget_exceeded: failure({
    category: 'budget',
    stage: 'SOURCE_PREFLIGHT',
    origin: 'persistent_shim',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  source_vector_invalid: failure({
    category: 'source_validation',
    stage: 'SOURCE_PREFLIGHT',
    origin: 'persistent_shim',
    providerMayHaveOccurred: false,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  provider_embedding_failed: failure({
    category: 'provider',
    stage: 'PROVIDER_EMBEDDING',
    origin: 'provider_wrapper',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  source_snapshot_changed_after_preflight: failure({
    category: 'source_consistency',
    stage: 'HYDRATION',
    origin: 'lease_worker',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  hydration_failed: failure({
    category: 'derived_runtime',
    stage: 'HYDRATION',
    origin: 'lease_worker',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  index_recovery_failed: failure({
    category: 'derived_runtime',
    stage: 'INDEX_RECOVERY',
    origin: 'lease_worker',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  vector_search_failed: failure({
    category: 'native_runtime',
    stage: 'VECTOR_SEARCH',
    origin: 'lease_worker',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  scope_postcheck_failed: failure({
    category: 'scope',
    stage: 'SCOPE_POSTCHECK',
    origin: 'scope_checker',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  response_finalization_failed: failure({
    category: 'response',
    stage: 'RESPONSE_FINALIZATION',
    origin: 'relay',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  attempt_timeout: failure({
    category: 'timeout',
    stage: 'TERMINAL_FAILURE',
    origin: 'edge_broker',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  attempt_cancelled: failure({
    category: 'cancelled',
    stage: 'TERMINAL_FAILURE',
    origin: 'edge_broker',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  worker_execution_terminated: failure({
    category: 'native_runtime',
    stage: 'TERMINAL_FAILURE',
    origin: 'lease_worker',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  worker_shutdown_incomplete: failure({
    category: 'cleanup',
    stage: 'TERMINAL_FAILURE',
    origin: 'lease_worker',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS
  }),
  terminal_missing: failure({
    category: 'protocol',
    stage: 'TERMINAL_FAILURE',
    origin: 'observer',
    providerMayHaveOccurred: true,
    nativeMayHaveOccurred: true,
    unknownCounterGroups: ALL_COUNTER_GROUPS,
    terminalCandidateAllowed: false
  })
});

const HEADER_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'attempt_ref',
  'tool_name',
  'request_digest',
  'context_binding_digest',
  'created_at',
  'deadline_at',
  'coordinator'
]);
const RECEIPT_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'attempt_ref',
  'sequence',
  'stage',
  'origin',
  'outcome',
  'previous_digest',
  'counter_facts',
  'reason_code',
  'receipt_digest'
]);
const TERMINAL_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'attempt_ref',
  'terminal_stage',
  'outcome',
  'last_completed_stage',
  'failed_stage',
  'reason_code',
  'failure_category',
  'failure_origin',
  'fallback_policy',
  'evidence_complete',
  'counters',
  'receipt_count',
  'last_receipt_digest',
  'terminal_digest'
]);
const WORKING_SET_KEYS = Object.freeze([
  'header',
  'receipts'
]);
const PUBLIC_PROJECTION_KEYS = Object.freeze([
  'protocol',
  'attempt_ref',
  'outcome',
  'last_completed_stage',
  'failed_stage',
  'reason_code',
  'failure_category',
  'evidence_complete',
  'counters'
]);

function assertExactKeys(value, expected, code) {
  if (!isPlainObject(value)) reject(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length ||
      actual.some((key, index) => key !== wanted[index])) {
    reject(code);
  }
}

function assertDigest(value, code) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) reject(code);
}

function assertSafeCode(value, code) {
  if (typeof value !== 'string' || !SAFE_CODE_PATTERN.test(value)) reject(code);
}

function parseTimestamp(value, code) {
  if (typeof value !== 'string' || value.length > 40 ||
      value.trim() !== value) reject(code);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    reject(code);
  }
  return parsed;
}

function attemptRef(randomBytes = crypto.randomBytes) {
  return `grat_${randomBytes(24).toString('base64url')}`;
}

function createAttemptHeader({
  attemptRef: providedAttemptRef,
  toolName,
  requestDigest,
  contextBindingDigest,
  now = new Date(),
  ttlSeconds,
  deadlineAt,
  randomBytes
} = {}) {
  const createdAt = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  if (!Number.isFinite(createdAt.getTime())) reject('attempt_header_clock_invalid');
  if (ttlSeconds !== undefined && deadlineAt !== undefined) {
    reject('attempt_header_ttl_invalid');
  }
  let deadlineMs;
  if (deadlineAt !== undefined) {
    deadlineMs = parseTimestamp(
      deadlineAt,
      'attempt_deadline_at_invalid'
    );
  } else {
    const selectedTtlSeconds = ttlSeconds ??
      GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds;
    if (!Number.isInteger(selectedTtlSeconds) ||
        selectedTtlSeconds < 1 ||
        selectedTtlSeconds >
          GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds) {
      reject('attempt_header_ttl_invalid');
    }
    deadlineMs =
      createdAt.getTime() + selectedTtlSeconds * 1000;
  }
  const header = {
    schema_version: GOVERNED_READ_ATTEMPT_SCHEMA_VERSION,
    protocol: GOVERNED_READ_ATTEMPT_PROTOCOL,
    attempt_ref: providedAttemptRef || attemptRefFromRandom(randomBytes),
    tool_name: toolName,
    request_digest: requestDigest,
    context_binding_digest: contextBindingDigest,
    created_at: createdAt.toISOString(),
    deadline_at: new Date(deadlineMs).toISOString(),
    coordinator: GOVERNED_READ_ATTEMPT_COORDINATOR
  };
  validateAttemptHeader(header);
  return deepFreeze(header);
}

function attemptRefFromRandom(randomBytes) {
  return attemptRef(randomBytes || crypto.randomBytes);
}

function validateAttemptHeader(header) {
  assertExactKeys(header, HEADER_KEYS, 'attempt_header_shape_invalid');
  if (utf8ByteLength(header) > GOVERNED_READ_ATTEMPT_LIMITS.headerBytes) {
    reject('attempt_header_too_large');
  }
  if (header.schema_version !== GOVERNED_READ_ATTEMPT_SCHEMA_VERSION ||
      header.protocol !== GOVERNED_READ_ATTEMPT_PROTOCOL ||
      header.coordinator !== GOVERNED_READ_ATTEMPT_COORDINATOR) {
    reject('attempt_header_contract_invalid');
  }
  if (typeof header.attempt_ref !== 'string' ||
      !GOVERNED_READ_ATTEMPT_REF_PATTERN.test(header.attempt_ref)) {
    reject('attempt_ref_invalid');
  }
  if (!GOVERNED_READ_ATTEMPT_READ_TOOLS.includes(header.tool_name)) {
    reject('attempt_tool_invalid');
  }
  assertDigest(header.request_digest, 'attempt_request_digest_invalid');
  assertDigest(header.context_binding_digest, 'attempt_context_digest_invalid');
  const createdMs = parseTimestamp(header.created_at, 'attempt_created_at_invalid');
  const deadlineMs = parseTimestamp(header.deadline_at, 'attempt_deadline_at_invalid');
  if (deadlineMs <= createdMs ||
      deadlineMs - createdMs > GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds * 1000) {
    reject('attempt_header_ttl_invalid');
  }
  return header;
}

function governedReadAttemptDeadlineBudgetMs(
  header,
  {
    now = new Date(),
    marginMs = 0
  } = {}
) {
  validateAttemptHeader(header);
  const current = now instanceof Date
    ? new Date(now.getTime())
    : new Date(now);
  if (!Number.isFinite(current.getTime())) {
    reject('attempt_deadline_clock_invalid');
  }
  if (!Number.isInteger(marginMs) ||
      marginMs < 0 ||
      marginMs > 10_000) {
    reject('attempt_deadline_margin_invalid');
  }
  const remainingMs =
    Date.parse(header.deadline_at) - current.getTime();
  if (remainingMs <= 0) return 0;
  return Math.min(
    remainingMs + marginMs,
    GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds * 1000 + marginMs
  );
}

function failureRegistryEntry(reasonCode) {
  assertSafeCode(reasonCode, 'attempt_reason_invalid');
  if (!Object.hasOwn(GOVERNED_READ_ATTEMPT_FAILURE_REGISTRY, reasonCode)) {
    reject('attempt_reason_unknown');
  }
  return GOVERNED_READ_ATTEMPT_FAILURE_REGISTRY[reasonCode];
}

function validateGovernedReadTerminalFailureCandidate(value) {
  assertExactKeys(
    value,
    ['reason_code', 'failure_origin'],
    'attempt_terminal_failure_candidate_invalid'
  );
  const entry = failureRegistryEntry(value.reason_code);
  if (entry.stage !== 'TERMINAL_FAILURE' ||
      entry.terminal_candidate_allowed !== true ||
      value.failure_origin !== entry.origin) {
    reject('attempt_terminal_failure_candidate_invalid');
  }
  return value;
}

function validateCounterFacts(
  counterFacts,
  origin,
  stage = null,
  outcome = null
) {
  if (!isPlainObject(counterFacts)) reject('attempt_counter_facts_invalid');
  for (const [group, fields] of Object.entries(counterFacts)) {
    if (!Object.hasOwn(GOVERNED_READ_ATTEMPT_COUNTER_FIELDS, group) ||
        !isPlainObject(fields) || Object.keys(fields).length === 0) {
      reject('attempt_counter_facts_invalid');
    }
    const allowed = GOVERNED_READ_ATTEMPT_COUNTER_FIELDS[group];
    const ownerOrigin = GOVERNED_READ_ATTEMPT_COUNTER_ORIGINS[group]
      .includes(origin);
    const stageIndex =
      GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES.indexOf(stage);
    const zeroPreDispatchAttestation = outcome === 'failed' && (
      (
        group === 'provider' &&
        stageIndex >= 0 &&
        stageIndex <
          GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES.indexOf('PROVIDER_EMBEDDING') &&
        Object.keys(fields).length === allowed.length &&
        Object.values(fields).every(value => value === 0)
      ) || (
        group === 'native_invocation' &&
        stageIndex >= 0 &&
        stageIndex <
          GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES.indexOf('NATIVE_DISPATCHED') &&
        Object.keys(fields).length === allowed.length &&
        Object.values(fields).every(value => value === 0)
      )
    );
    if (!ownerOrigin && !zeroPreDispatchAttestation) {
      reject('attempt_counter_facts_origin_invalid');
    }
    for (const [field, value] of Object.entries(fields)) {
      if (!allowed.includes(field) || !Number.isSafeInteger(value) || value < 0 ||
          value > GOVERNED_READ_ATTEMPT_LIMITS.counterValue) {
        reject('attempt_counter_facts_invalid');
      }
    }
  }
  return counterFacts;
}

function nextReceiptStage(receipts) {
  if (receipts.length === 0) return GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES[0];
  const last = receipts.at(-1);
  if (last.outcome === 'failed') reject('attempt_receipt_after_failure');
  return GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES[last.sequence + 1] || null;
}

function createStageReceipt({
  header,
  receipts = [],
  stage,
  origin,
  outcome = 'completed',
  counterFacts = {},
  reasonCode = null
} = {}) {
  validateAttemptReceiptChain(header, receipts);
  const expectedStage = nextReceiptStage(receipts);
  if (expectedStage === null) reject('attempt_receipt_after_finalization');
  const selectedStage = stage || expectedStage;
  const selectedOrigin = origin || GOVERNED_READ_ATTEMPT_ORIGIN_BY_STAGE[selectedStage];
  const previousDigest = receipts.length === 0
    ? digestObject(header)
    : receipts.at(-1).receipt_digest;
  const base = {
    schema_version: GOVERNED_READ_ATTEMPT_SCHEMA_VERSION,
    protocol: GOVERNED_READ_ATTEMPT_PROTOCOL,
    attempt_ref: header.attempt_ref,
    sequence: receipts.length,
    stage: selectedStage,
    origin: selectedOrigin,
    outcome,
    previous_digest: previousDigest,
    counter_facts: structuredClone(counterFacts),
    reason_code: reasonCode
  };
  const receipt = {
    ...base,
    receipt_digest: digestObject(base)
  };
  validateStageReceipt(receipt, { header, receipts });
  return deepFreeze(receipt);
}

function validateStageReceipt(receipt, { header, receipts = [] } = {}) {
  validateAttemptHeader(header);
  assertExactKeys(receipt, RECEIPT_KEYS, 'attempt_receipt_shape_invalid');
  if (utf8ByteLength(receipt) > GOVERNED_READ_ATTEMPT_LIMITS.receiptBytes) {
    reject('attempt_receipt_too_large');
  }
  if (receipts.length >= GOVERNED_READ_ATTEMPT_LIMITS.receiptCount) {
    reject('attempt_receipt_count_exceeded');
  }
  if (receipt.schema_version !== GOVERNED_READ_ATTEMPT_SCHEMA_VERSION ||
      receipt.protocol !== GOVERNED_READ_ATTEMPT_PROTOCOL) {
    reject('attempt_receipt_contract_invalid');
  }
  if (receipt.attempt_ref !== header.attempt_ref) reject('attempt_ref_mismatch');
  if (!Number.isSafeInteger(receipt.sequence) || receipt.sequence < 0) {
    reject('attempt_receipt_sequence_invalid');
  }
  if (receipt.sequence < receipts.length) reject('attempt_receipt_sequence_duplicate');
  if (receipt.sequence > receipts.length) reject('attempt_receipt_sequence_gap');
  const expectedStage = nextReceiptStage(receipts);
  const actualStageIndex =
    GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES.indexOf(receipt.stage);
  const expectedStageIndex =
    GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES.indexOf(expectedStage);
  if (actualStageIndex < 0) reject('attempt_receipt_stage_invalid');
  if (actualStageIndex < expectedStageIndex) reject('attempt_receipt_stage_regression');
  if (actualStageIndex > expectedStageIndex) reject('attempt_receipt_stage_gap');
  const expectedOrigin = GOVERNED_READ_ATTEMPT_ORIGIN_BY_STAGE[receipt.stage];
  if (receipt.origin !== expectedOrigin) reject('attempt_receipt_origin_invalid');
  const expectedPrevious = receipts.length === 0
    ? digestObject(header)
    : receipts.at(-1).receipt_digest;
  if (receipt.previous_digest !== expectedPrevious) {
    reject('attempt_receipt_chain_mismatch');
  }
  if (!['completed', 'failed'].includes(receipt.outcome)) {
    reject('attempt_receipt_outcome_invalid');
  }
  validateCounterFacts(
    receipt.counter_facts,
    receipt.origin,
    receipt.stage,
    receipt.outcome
  );
  if (receipt.outcome === 'completed') {
    if (receipt.reason_code !== null) reject('attempt_receipt_reason_invalid');
  } else {
    const entry = failureRegistryEntry(receipt.reason_code);
    if (entry.stage !== receipt.stage || entry.origin !== receipt.origin) {
      reject('attempt_receipt_reason_binding_invalid');
    }
  }
  assertDigest(receipt.receipt_digest, 'attempt_receipt_digest_invalid');
  const { receipt_digest: ignored, ...base } = receipt;
  if (receipt.receipt_digest !== digestObject(base)) {
    reject('attempt_receipt_digest_invalid');
  }
  return receipt;
}

function validateAttemptReceiptChain(header, receipts) {
  validateAttemptHeader(header);
  if (!Array.isArray(receipts) ||
      receipts.length > GOVERNED_READ_ATTEMPT_LIMITS.receiptCount) {
    reject('attempt_receipt_chain_invalid');
  }
  const accepted = [];
  for (const receipt of receipts) {
    validateStageReceipt(receipt, { header, receipts: accepted });
    accepted.push(receipt);
  }
  return receipts;
}

function createGovernedReadAttemptWorkingSet({
  header,
  receipts = []
} = {}) {
  validateAttemptHeader(header);
  validateAttemptReceiptChain(header, receipts);
  const workingSet = {
    header: structuredClone(header),
    receipts: structuredClone(receipts)
  };
  if (utf8ByteLength(workingSet) >
      GOVERNED_READ_ATTEMPT_LIMITS.protocolBytes) {
    reject('attempt_working_set_too_large');
  }
  return deepFreeze(workingSet);
}

function validateGovernedReadAttemptWorkingSet(workingSet) {
  assertExactKeys(
    workingSet,
    WORKING_SET_KEYS,
    'attempt_working_set_shape_invalid'
  );
  if (utf8ByteLength(workingSet) >
      GOVERNED_READ_ATTEMPT_LIMITS.protocolBytes) {
    reject('attempt_working_set_too_large');
  }
  validateAttemptHeader(workingSet.header);
  validateAttemptReceiptChain(workingSet.header, workingSet.receipts);
  return workingSet;
}

function isGovernedReadAttemptWorkingSetExtension(prefix, candidate) {
  validateGovernedReadAttemptWorkingSet(prefix);
  validateGovernedReadAttemptWorkingSet(candidate);
  if (canonicalJson(prefix.header) !== canonicalJson(candidate.header) ||
      candidate.receipts.length < prefix.receipts.length) {
    return false;
  }
  return prefix.receipts.every((receipt, index) =>
    canonicalJson(receipt) === canonicalJson(candidate.receipts[index])
  );
}

function governedReadAttemptResponseBindingDigest({
  requestDigest,
  terminalDigest
} = {}) {
  assertDigest(
    requestDigest,
    'attempt_response_request_digest_invalid'
  );
  assertDigest(
    terminalDigest,
    'attempt_response_terminal_digest_invalid'
  );
  return digestObject({
    protocol: GOVERNED_READ_ATTEMPT_PROTOCOL,
    request_digest: requestDigest,
    terminal_digest: terminalDigest
  });
}

function appendGovernedReadAttemptStage(workingSet, input = {}) {
  validateGovernedReadAttemptWorkingSet(workingSet);
  const receipt = createStageReceipt({
    ...input,
    header: workingSet.header,
    receipts: workingSet.receipts
  });
  return createGovernedReadAttemptWorkingSet({
    header: workingSet.header,
    receipts: [...workingSet.receipts, receipt]
  });
}

function emptyCounters() {
  return Object.fromEntries(Object.entries(GOVERNED_READ_ATTEMPT_COUNTER_FIELDS)
    .map(([group, fields]) => [
      group,
      Object.fromEntries(fields.map(field => [field, null]))
    ]));
}

function aggregateAttemptCounters(receipts) {
  const counters = emptyCounters();
  for (const receipt of receipts) {
    for (const [group, fields] of Object.entries(receipt.counter_facts)) {
      for (const [field, value] of Object.entries(fields)) {
        counters[group][field] = counters[group][field] === null
          ? value
          : counters[group][field] + value;
      }
    }
  }
  return deepFreeze(counters);
}

function validateTerminalCounterShape(counters) {
  assertExactKeys(
    counters,
    Object.keys(GOVERNED_READ_ATTEMPT_COUNTER_FIELDS),
    'attempt_terminal_counters_invalid'
  );
  for (const [group, fields] of Object.entries(
    GOVERNED_READ_ATTEMPT_COUNTER_FIELDS
  )) {
    assertExactKeys(counters[group], fields, 'attempt_terminal_counters_invalid');
    for (const field of fields) {
      const value = counters[group][field];
      if (value !== null && (!Number.isSafeInteger(value) || value < 0 ||
          value > GOVERNED_READ_ATTEMPT_LIMITS.counterValue)) {
        reject('attempt_terminal_counters_invalid');
      }
    }
  }
}

function groupHasUnknown(counters, group) {
  return Object.values(counters[group]).some(value => value === null);
}

function matchesKnownCounterTriple(value, fields) {
  return SINGLE_OPERATION_COUNTER_TRIPLES.some(triple =>
    fields.every((field, index) =>
      value[field] === null || value[field] === triple[index]
    )
  );
}

function validateAttemptCounterRelationships(counters, { outcome = null } = {}) {
  validateTerminalCounterShape(counters);
  for (const group of ['provider', 'native_invocation']) {
    const value = counters[group];
    if (!matchesKnownCounterTriple(
      value,
      ['started', 'succeeded', 'failed']
    )) {
      reject('attempt_counter_reconciliation_invalid');
    }
    if (outcome === 'success' &&
        value.failed !== null &&
        value.failed !== 0) {
      reject('attempt_success_counter_invalid');
    }
  }
  const primary = counters.primary_memory;
  for (const value of [primary.write_attempts, primary.writes_committed]) {
    if (value !== null && value !== 0) reject('attempt_primary_write_forbidden');
  }
  const fallbackAttempts = counters.fallback.attempts;
  if (fallbackAttempts !== null && fallbackAttempts !== 0) {
    reject('attempt_fallback_forbidden');
  }
  const derived = counters.derived_transaction;
  if (!matchesKnownCounterTriple(
    derived,
    ['started', 'committed', 'rolled_back']
  )) {
    reject('attempt_derived_transaction_invalid');
  }
  return counters;
}

function validateAttemptCounters(counters, {
  outcome,
  evidenceComplete,
  failureEntry = null
} = {}) {
  validateAttemptCounterRelationships(counters, { outcome });
  for (const group of ALL_COUNTER_GROUPS) {
    if (!groupHasUnknown(counters, group)) continue;
    const registryAllowsUnknown = group === 'provider'
      ? failureEntry?.provider_may_have_occurred === true
      : group === 'native_invocation'
        ? failureEntry?.native_may_have_occurred === true
        : failureEntry?.unknown_counter_groups.includes(group) === true;
    if (evidenceComplete || !registryAllowsUnknown) {
      reject('attempt_counter_evidence_incomplete');
    }
  }
  if (outcome === 'success' && evidenceComplete !== true) {
    reject('attempt_success_evidence_incomplete');
  }
  return counters;
}

function deriveTerminal({
  header,
  receipts,
  outcome,
  reasonCode,
  evidenceComplete,
  failureOrigin
}) {
  validateAttemptReceiptChain(header, receipts);
  if (!['success', 'failure'].includes(outcome) ||
      typeof evidenceComplete !== 'boolean') {
    reject('attempt_terminal_outcome_invalid');
  }
  const lastReceipt = receipts.at(-1) || null;
  const failedReceipt = lastReceipt?.outcome === 'failed' ? lastReceipt : null;
  const lastCompleted = [...receipts].reverse()
    .find(receipt => receipt.outcome === 'completed') || null;
  let failureEntry = null;
  let failedStage = null;
  if (outcome === 'success') {
    if (reasonCode !== null && reasonCode !== undefined) {
      reject('attempt_terminal_reason_invalid');
    }
    if (failureOrigin !== null && failureOrigin !== undefined) {
      reject('attempt_terminal_origin_invalid');
    }
    if (receipts.length !== GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES.length ||
        lastReceipt?.stage !== 'RESPONSE_FINALIZATION' ||
        receipts.some(receipt => receipt.outcome !== 'completed')) {
      reject('attempt_success_chain_incomplete');
    }
  } else {
    failureEntry = failureRegistryEntry(reasonCode);
    if (failureEntry.terminal_candidate_allowed !== true) {
      reject('attempt_terminal_reason_forbidden');
    }
    if (failedReceipt) {
      if (failedReceipt.reason_code !== reasonCode ||
          failureEntry.stage !== failedReceipt.stage ||
          failureEntry.origin !== failedReceipt.origin) {
        reject('attempt_terminal_reason_binding_invalid');
      }
      if (failureOrigin !== undefined && failureOrigin !== null &&
          failureOrigin !== failedReceipt.origin) {
        reject('attempt_terminal_origin_invalid');
      }
      failedStage = failedReceipt.stage;
    } else {
      if (failureEntry.stage !== 'TERMINAL_FAILURE') {
        reject('attempt_terminal_failure_receipt_missing');
      }
      if (failureOrigin !== failureEntry.origin) {
        reject('attempt_terminal_origin_invalid');
      }
      failedStage = 'TERMINAL_FAILURE';
    }
  }
  const counters = aggregateAttemptCounters(receipts);
  validateAttemptCounters(counters, {
    outcome,
    evidenceComplete,
    failureEntry
  });
  return {
    schema_version: GOVERNED_READ_ATTEMPT_SCHEMA_VERSION,
    protocol: GOVERNED_READ_ATTEMPT_PROTOCOL,
    attempt_ref: header.attempt_ref,
    terminal_stage: outcome === 'success'
      ? 'TERMINAL_SUCCESS'
      : 'TERMINAL_FAILURE',
    outcome,
    last_completed_stage: lastCompleted?.stage || null,
    failed_stage: failedStage,
    reason_code: outcome === 'failure' ? reasonCode : null,
    failure_category: failureEntry?.category || null,
    failure_origin: outcome === 'failure'
      ? (failedReceipt?.origin || failureEntry.origin)
      : null,
    fallback_policy: failureEntry?.fallback_policy || 'forbidden',
    evidence_complete: evidenceComplete,
    counters,
    receipt_count: receipts.length,
    last_receipt_digest: lastReceipt?.receipt_digest || digestObject(header)
  };
}

function createTerminalEnvelope({
  header,
  receipts = [],
  outcome,
  reasonCode = null,
  evidenceComplete,
  failureOrigin = null
} = {}) {
  const base = deriveTerminal({
    header,
    receipts,
    outcome,
    reasonCode,
    evidenceComplete,
    failureOrigin
  });
  const terminal = {
    ...base,
    terminal_digest: digestObject(base)
  };
  if (utf8ByteLength(terminal) > GOVERNED_READ_ATTEMPT_LIMITS.terminalBytes) {
    reject('attempt_terminal_too_large');
  }
  return deepFreeze(terminal);
}

function validateTerminalEnvelope(terminal, { header, receipts = [] } = {}) {
  assertExactKeys(terminal, TERMINAL_KEYS, 'attempt_terminal_shape_invalid');
  if (utf8ByteLength(terminal) > GOVERNED_READ_ATTEMPT_LIMITS.terminalBytes) {
    reject('attempt_terminal_too_large');
  }
  if (terminal.attempt_ref !== header?.attempt_ref) reject('attempt_ref_mismatch');
  assertDigest(terminal.terminal_digest, 'attempt_terminal_digest_invalid');
  const expected = createTerminalEnvelope({
    header,
    receipts,
    outcome: terminal.outcome,
    reasonCode: terminal.reason_code,
    evidenceComplete: terminal.evidence_complete,
    failureOrigin: terminal.failure_origin
  });
  if (canonicalJson(terminal) !== canonicalJson(expected)) {
    reject('attempt_terminal_invalid');
  }
  return terminal;
}

function createGovernedReadAttemptProtocol({ header, receipts, terminal }) {
  validateAttemptHeader(header);
  validateAttemptReceiptChain(header, receipts);
  validateTerminalEnvelope(terminal, { header, receipts });
  const protocol = {
    header: structuredClone(header),
    receipts: structuredClone(receipts),
    terminal: structuredClone(terminal)
  };
  if (utf8ByteLength(protocol) > GOVERNED_READ_ATTEMPT_LIMITS.protocolBytes) {
    reject('attempt_protocol_too_large');
  }
  return deepFreeze(protocol);
}

function validateGovernedReadAttemptProtocol(protocol) {
  assertExactKeys(protocol, ['header', 'receipts', 'terminal'], 'attempt_protocol_shape_invalid');
  if (utf8ByteLength(protocol) > GOVERNED_READ_ATTEMPT_LIMITS.protocolBytes) {
    reject('attempt_protocol_too_large');
  }
  validateAttemptHeader(protocol.header);
  validateAttemptReceiptChain(protocol.header, protocol.receipts);
  validateTerminalEnvelope(protocol.terminal, {
    header: protocol.header,
    receipts: protocol.receipts
  });
  return protocol;
}

function projectGovernedReadAttemptOwner(protocol) {
  validateGovernedReadAttemptProtocol(protocol);
  return deepFreeze(structuredClone({
    schema_version: GOVERNED_READ_ATTEMPT_SCHEMA_VERSION,
    protocol: GOVERNED_READ_ATTEMPT_PROTOCOL,
    header: protocol.header,
    receipts: protocol.receipts,
    terminal: protocol.terminal,
    raw_memory_returned: false,
    provider_response_returned: false,
    secret_values_returned: false
  }));
}

function projectGovernedReadAttemptPublic(protocol) {
  validateGovernedReadAttemptProtocol(protocol);
  const terminal = protocol.terminal;
  const projection = {
    protocol: GOVERNED_READ_ATTEMPT_PROTOCOL,
    attempt_ref: terminal.attempt_ref,
    outcome: terminal.outcome,
    last_completed_stage: terminal.last_completed_stage,
    failed_stage: terminal.failed_stage,
    reason_code: terminal.reason_code,
    failure_category: terminal.failure_category,
    evidence_complete: terminal.evidence_complete,
    counters: terminal.counters
  };
  validateGovernedReadAttemptPublicProjection(projection);
  return deepFreeze(structuredClone(projection));
}

function validateGovernedReadAttemptPublicProjection(projection) {
  assertExactKeys(
    projection,
    PUBLIC_PROJECTION_KEYS,
    'attempt_public_projection_shape_invalid'
  );
  if (projection.protocol !== GOVERNED_READ_ATTEMPT_PROTOCOL ||
      typeof projection.attempt_ref !== 'string' ||
      !GOVERNED_READ_ATTEMPT_REF_PATTERN.test(projection.attempt_ref) ||
      !['success', 'failure'].includes(projection.outcome) ||
      typeof projection.evidence_complete !== 'boolean') {
    reject('attempt_public_projection_invalid');
  }
  if (projection.last_completed_stage !== null &&
      !GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES.includes(
        projection.last_completed_stage
      )) {
    reject('attempt_public_projection_invalid');
  }
  let failureEntry = null;
  if (projection.outcome === 'success') {
    if (projection.last_completed_stage !== 'RESPONSE_FINALIZATION' ||
        projection.failed_stage !== null ||
        projection.reason_code !== null ||
        projection.failure_category !== null ||
        projection.evidence_complete !== true) {
      reject('attempt_public_projection_invalid');
    }
  } else {
    failureEntry = failureRegistryEntry(projection.reason_code);
    const expectedFailedStage = failureEntry.stage === 'TERMINAL_FAILURE'
      ? 'TERMINAL_FAILURE'
      : failureEntry.stage;
    if (projection.failed_stage !== expectedFailedStage ||
        projection.failure_category !== failureEntry.category) {
      reject('attempt_public_projection_invalid');
    }
    if (projection.last_completed_stage !== null &&
        expectedFailedStage !== 'TERMINAL_FAILURE' &&
        GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES.indexOf(
          projection.last_completed_stage
        ) >= GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES.indexOf(
          expectedFailedStage
        )) {
      reject('attempt_public_projection_invalid');
    }
  }
  validateAttemptCounters(projection.counters, {
    outcome: projection.outcome,
    evidenceComplete: projection.evidence_complete,
    failureEntry
  });
  return projection;
}

module.exports = {
  ALL_COUNTER_GROUPS,
  GOVERNED_READ_ATTEMPT_COORDINATOR,
  GOVERNED_READ_ATTEMPT_COUNTER_FIELDS,
  GOVERNED_READ_ATTEMPT_COUNTER_ORIGINS,
  GOVERNED_READ_ATTEMPT_FAILURE_REGISTRY,
  GOVERNED_READ_ATTEMPT_LIMITS,
  GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES,
  GOVERNED_READ_ATTEMPT_ORIGIN_BY_STAGE,
  GOVERNED_READ_ATTEMPT_PROTOCOL,
  GOVERNED_READ_ATTEMPT_READ_TOOLS,
  GOVERNED_READ_ATTEMPT_REF_PATTERN,
  GOVERNED_READ_ATTEMPT_SCHEMA_VERSION,
  GOVERNED_READ_ATTEMPT_STAGES,
  GOVERNED_READ_ATTEMPT_TERMINAL_STAGES,
  aggregateAttemptCounters,
  appendGovernedReadAttemptStage,
  attemptRef,
  createAttemptHeader,
  createGovernedReadAttemptProtocol,
  createGovernedReadAttemptWorkingSet,
  createStageReceipt,
  createTerminalEnvelope,
  failureRegistryEntry,
  governedReadAttemptDeadlineBudgetMs,
  governedReadAttemptResponseBindingDigest,
  isGovernedReadAttemptWorkingSetExtension,
  projectGovernedReadAttemptOwner,
  projectGovernedReadAttemptPublic,
  validateAttemptCounterRelationships,
  validateAttemptCounters,
  validateAttemptHeader,
  validateCounterFacts,
  validateGovernedReadAttemptProtocol,
  validateGovernedReadAttemptPublicProjection,
  validateGovernedReadTerminalFailureCandidate,
  validateGovernedReadAttemptWorkingSet,
  validateAttemptReceiptChain,
  validateStageReceipt,
  validateTerminalEnvelope
};
