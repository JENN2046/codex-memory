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
const {
  assertGovernedSafeCode,
  defineGovernedFailureRegistry,
  governedFailureRegistryEntry,
  GOVERNED_SAFE_CODE_PATTERN
} = require('./governed-failure-registry');

const GOVERNED_CONTEXT_RESOLUTION_PROTOCOL =
  'governed_context_resolution.v1';
const GOVERNED_CONTEXT_RESOLUTION_SCHEMA_VERSION = 1;
const GOVERNED_CONTEXT_RESOLUTION_OPERATION = 'resolve_memory_context';
const GOVERNED_CONTEXT_RESOLUTION_COORDINATOR =
  'chatgpt_edge_transient_broker';
const GOVERNED_CONTEXT_RESOLUTION_EVENT_COMPONENT =
  'governed_context_resolution_coordinator';
const GOVERNED_CONTEXT_RESOLUTION_REF_PATTERN =
  /^gcr_[A-Za-z0-9_-]{24,96}$/u;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;

const GOVERNED_CONTEXT_RESOLUTION_STAGES = Object.freeze([
  'CREATED',
  'EDGE_VALIDATED',
  'RELAY_CLAIMED',
  'REGISTRY_RESOLVED',
  'SCOPE_RESOLVED',
  'CONTEXT_ISSUED',
  'RESPONSE_FINALIZED',
  'TERMINAL_SUCCESS',
  'TERMINAL_FAILURE'
]);

const GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES = Object.freeze(
  GOVERNED_CONTEXT_RESOLUTION_STAGES.slice(0, -2)
);
const GOVERNED_CONTEXT_RESOLUTION_TERMINAL_STAGES = Object.freeze(
  GOVERNED_CONTEXT_RESOLUTION_STAGES.slice(-2)
);

const GOVERNED_CONTEXT_RESOLUTION_ORIGIN_BY_STAGE = Object.freeze({
  CREATED: 'edge_broker',
  EDGE_VALIDATED: 'edge_broker',
  RELAY_CLAIMED: 'relay',
  REGISTRY_RESOLVED: 'governance',
  SCOPE_RESOLVED: 'governance',
  CONTEXT_ISSUED: 'governance',
  RESPONSE_FINALIZED: 'relay',
  TERMINAL_SUCCESS: 'edge_broker',
  TERMINAL_FAILURE: 'edge_broker'
});

const GOVERNED_CONTEXT_RESOLUTION_LIMITS = Object.freeze({
  headerBytes: 2 * 1024,
  receiptBytes: 1024,
  receiptCount:
    GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES.length,
  terminalBytes: 4 * 1024,
  protocolBytes: 16 * 1024,
  ttlSeconds: 60
});

const FACT_STAGE = Object.freeze({
  registry_resolved: 'REGISTRY_RESOLVED',
  mapping_resolved: 'REGISTRY_RESOLVED',
  scope_resolved: 'SCOPE_RESOLVED',
  context_ref_issued: 'CONTEXT_ISSUED',
  context_ref_shape_valid: 'CONTEXT_ISSUED',
  context_ref_unexpired: 'CONTEXT_ISSUED',
  context_ref_entered_response: 'RESPONSE_FINALIZED',
  context_ref_delivered: 'RESPONSE_FINALIZED'
});

const COMPLETED_FACTS_BY_STAGE = deepFreeze({
  CREATED: {},
  EDGE_VALIDATED: {},
  RELAY_CLAIMED: {},
  REGISTRY_RESOLVED: {
    registry_resolved: true,
    mapping_resolved: true
  },
  SCOPE_RESOLVED: {
    scope_resolved: true
  },
  CONTEXT_ISSUED: {
    context_ref_issued: true,
    context_ref_shape_valid: true,
    context_ref_unexpired: true
  },
  RESPONSE_FINALIZED: {
    context_ref_entered_response: true,
    context_ref_delivered: true
  }
});

function failure({
  category,
  stage,
  origin,
  terminalCandidateAllowed = true,
  publicResponseStatus = null,
  publicProjectionSafe = false
}) {
  return {
    category,
    stage,
    origin,
    fallback_policy: 'forbidden',
    terminal_candidate_allowed: terminalCandidateAllowed,
    public_response_status: publicResponseStatus,
    public_projection_safe: publicProjectionSafe
  };
}

function validateFailureEntry(entry) {
  assertExactKeys(entry, [
    'category',
    'stage',
    'origin',
    'fallback_policy',
    'terminal_candidate_allowed',
    'public_response_status',
    'public_projection_safe'
  ], 'context_resolution_failure_registry_invalid');
  assertGovernedSafeCode(
    entry.category,
    'context_resolution_failure_registry_invalid'
  );
  if (!GOVERNED_CONTEXT_RESOLUTION_STAGES.includes(entry.stage) ||
      !Object.values(GOVERNED_CONTEXT_RESOLUTION_ORIGIN_BY_STAGE)
        .concat('observer').includes(entry.origin) ||
      entry.fallback_policy !== 'forbidden' ||
      typeof entry.terminal_candidate_allowed !== 'boolean' ||
      ![null, 'denied', 'unavailable'].includes(entry.public_response_status) ||
      typeof entry.public_projection_safe !== 'boolean' ||
      (entry.public_projection_safe && entry.public_response_status === null)) {
    reject('context_resolution_failure_registry_invalid');
  }
  if (entry.stage !== 'TERMINAL_FAILURE' &&
      entry.origin !==
        GOVERNED_CONTEXT_RESOLUTION_ORIGIN_BY_STAGE[entry.stage]) {
    reject('context_resolution_failure_registry_invalid');
  }
}

const GOVERNED_CONTEXT_RESOLUTION_FAILURE_REGISTRY =
  defineGovernedFailureRegistry({
    resolution_edge_request_invalid: failure({
      category: 'validation',
      stage: 'EDGE_VALIDATED',
      origin: 'edge_broker',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    resolution_relay_claim_failed: failure({
      category: 'transport',
      stage: 'RELAY_CLAIMED',
      origin: 'relay',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_registry_unavailable: failure({
      category: 'context_registry_failed',
      stage: 'REGISTRY_RESOLVED',
      origin: 'governance',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_scope_preflight_denied: failure({
      category: 'context_scope_denied',
      stage: 'REGISTRY_RESOLVED',
      origin: 'governance',
      publicResponseStatus: 'denied',
      publicProjectionSafe: true
    }),
    context_issuance_preflight_unavailable: failure({
      category: 'context_issuance_failed',
      stage: 'REGISTRY_RESOLVED',
      origin: 'governance',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_mapping_not_found: failure({
      category: 'context_mapping_failed',
      stage: 'REGISTRY_RESOLVED',
      origin: 'governance',
      publicResponseStatus: 'denied',
      publicProjectionSafe: true
    }),
    context_scope_denied: failure({
      category: 'context_scope_denied',
      stage: 'SCOPE_RESOLVED',
      origin: 'governance',
      publicResponseStatus: 'denied',
      publicProjectionSafe: true
    }),
    context_scope_unavailable: failure({
      category: 'context_scope_failed',
      stage: 'SCOPE_RESOLVED',
      origin: 'governance',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_issuance_unavailable: failure({
      category: 'context_issuance_failed',
      stage: 'CONTEXT_ISSUED',
      origin: 'governance',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_issuance_denied: failure({
      category: 'context_issuance_failed',
      stage: 'CONTEXT_ISSUED',
      origin: 'governance',
      publicResponseStatus: 'denied',
      publicProjectionSafe: true
    }),
    context_issuance_failed: failure({
      category: 'context_issuance_failed',
      stage: 'CONTEXT_ISSUED',
      origin: 'governance',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_issue_result_invalid: failure({
      category: 'context_issuance_failed',
      stage: 'CONTEXT_ISSUED',
      origin: 'governance',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_ref_invalid: failure({
      category: 'context_issuance_failed',
      stage: 'CONTEXT_ISSUED',
      origin: 'governance',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_ref_expired: failure({
      category: 'context_issuance_failed',
      stage: 'CONTEXT_ISSUED',
      origin: 'governance',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_response_projection_invalid: failure({
      category: 'context_response_failed',
      stage: 'RESPONSE_FINALIZED',
      origin: 'relay',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    context_response_finalization_failed: failure({
      category: 'context_response_failed',
      stage: 'RESPONSE_FINALIZED',
      origin: 'relay',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    resolution_timeout: failure({
      category: 'timeout',
      stage: 'TERMINAL_FAILURE',
      origin: 'edge_broker',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    resolution_cancelled: failure({
      category: 'cancelled',
      stage: 'TERMINAL_FAILURE',
      origin: 'edge_broker',
      publicResponseStatus: 'unavailable',
      publicProjectionSafe: true
    }),
    terminal_missing: failure({
      category: 'protocol',
      stage: 'TERMINAL_FAILURE',
      origin: 'observer',
      terminalCandidateAllowed: false
    })
  }, {
    validateEntry: validateFailureEntry,
    invalidRegistryCode: 'context_resolution_failure_registry_invalid'
  });

const FAILED_FACTS_BY_REASON = deepFreeze({
  resolution_edge_request_invalid: {},
  resolution_relay_claim_failed: {},
  context_registry_unavailable: {
    registry_resolved: false
  },
  context_scope_preflight_denied: {
    registry_resolved: false
  },
  context_issuance_preflight_unavailable: {
    registry_resolved: false
  },
  context_mapping_not_found: {
    registry_resolved: true,
    mapping_resolved: false
  },
  context_scope_denied: {
    scope_resolved: false
  },
  context_scope_unavailable: {},
  context_issuance_unavailable: {
    context_ref_issued: false
  },
  context_issuance_denied: {
    context_ref_issued: false
  },
  context_issuance_failed: {},
  context_issue_result_invalid: {},
  context_ref_invalid: {
    context_ref_issued: true,
    context_ref_shape_valid: false
  },
  context_ref_expired: {
    context_ref_issued: true,
    context_ref_shape_valid: true,
    context_ref_unexpired: false
  },
  context_response_projection_invalid: {
    context_ref_entered_response: false,
    context_ref_delivered: false
  },
  context_response_finalization_failed: {
    context_ref_entered_response: false,
    context_ref_delivered: false
  }
});

const HEADER_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'resolution_ref',
  'operation',
  'request_digest',
  'created_at',
  'deadline_at',
  'coordinator'
]);
const RECEIPT_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'resolution_ref',
  'sequence',
  'stage',
  'origin',
  'outcome',
  'previous_digest',
  'facts',
  'reason_code',
  'receipt_digest'
]);
const TERMINAL_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'resolution_ref',
  'terminal_stage',
  'outcome',
  'last_completed_stage',
  'failed_stage',
  'reason_code',
  'failure_category',
  'failure_origin',
  'fallback_policy',
  'evidence_complete',
  'mapping_resolved',
  'scope_resolved',
  'context_ref_issued',
  'context_ref_shape_valid',
  'context_ref_unexpired',
  'context_ref_entered_response',
  'context_ref_delivered',
  'read_attempt_created',
  'receipt_count',
  'last_receipt_digest',
  'terminal_digest'
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

function parseTimestamp(value, code) {
  if (typeof value !== 'string' || value.length > 40 ||
      value.trim() !== value) reject(code);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    reject(code);
  }
  return parsed;
}

function contextResolutionRef(randomBytes = crypto.randomBytes) {
  return `gcr_${randomBytes(24).toString('base64url')}`;
}

function createContextResolutionHeader({
  resolutionRef,
  requestDigest,
  now = new Date(),
  ttlSeconds,
  deadlineAt,
  randomBytes
} = {}) {
  const createdAt = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  if (!Number.isFinite(createdAt.getTime())) {
    reject('context_resolution_header_clock_invalid');
  }
  if (ttlSeconds !== undefined && deadlineAt !== undefined) {
    reject('context_resolution_header_ttl_invalid');
  }
  let deadlineMs;
  if (deadlineAt !== undefined) {
    deadlineMs = parseTimestamp(
      deadlineAt,
      'context_resolution_deadline_at_invalid'
    );
  } else {
    const selectedTtlSeconds = ttlSeconds ??
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds;
    if (!Number.isInteger(selectedTtlSeconds) ||
        selectedTtlSeconds < 1 ||
        selectedTtlSeconds >
          GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds) {
      reject('context_resolution_header_ttl_invalid');
    }
    deadlineMs = createdAt.getTime() + selectedTtlSeconds * 1000;
  }
  const header = {
    schema_version: GOVERNED_CONTEXT_RESOLUTION_SCHEMA_VERSION,
    protocol: GOVERNED_CONTEXT_RESOLUTION_PROTOCOL,
    resolution_ref: resolutionRef || contextResolutionRef(randomBytes),
    operation: GOVERNED_CONTEXT_RESOLUTION_OPERATION,
    request_digest: requestDigest,
    created_at: createdAt.toISOString(),
    deadline_at: new Date(deadlineMs).toISOString(),
    coordinator: GOVERNED_CONTEXT_RESOLUTION_COORDINATOR
  };
  validateContextResolutionHeader(header);
  return deepFreeze(header);
}

function validateContextResolutionHeader(header) {
  assertExactKeys(
    header,
    HEADER_KEYS,
    'context_resolution_header_shape_invalid'
  );
  if (utf8ByteLength(header) >
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.headerBytes) {
    reject('context_resolution_header_too_large');
  }
  if (header.schema_version !==
        GOVERNED_CONTEXT_RESOLUTION_SCHEMA_VERSION ||
      header.protocol !== GOVERNED_CONTEXT_RESOLUTION_PROTOCOL ||
      header.operation !== GOVERNED_CONTEXT_RESOLUTION_OPERATION ||
      header.coordinator !== GOVERNED_CONTEXT_RESOLUTION_COORDINATOR) {
    reject('context_resolution_header_contract_invalid');
  }
  if (typeof header.resolution_ref !== 'string' ||
      !GOVERNED_CONTEXT_RESOLUTION_REF_PATTERN.test(
        header.resolution_ref
      )) {
    reject('context_resolution_ref_invalid');
  }
  assertDigest(
    header.request_digest,
    'context_resolution_request_digest_invalid'
  );
  const createdMs = parseTimestamp(
    header.created_at,
    'context_resolution_created_at_invalid'
  );
  const deadlineMs = parseTimestamp(
    header.deadline_at,
    'context_resolution_deadline_at_invalid'
  );
  if (deadlineMs <= createdMs ||
      deadlineMs - createdMs >
        GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds * 1000) {
    reject('context_resolution_header_ttl_invalid');
  }
  return header;
}

function contextResolutionFailureRegistryEntry(reasonCode) {
  return governedFailureRegistryEntry(
    GOVERNED_CONTEXT_RESOLUTION_FAILURE_REGISTRY,
    reasonCode,
    {
      invalidReasonCode: 'context_resolution_reason_invalid',
      unknownReasonCode: 'context_resolution_reason_unknown'
    }
  );
}

function contextResolutionFailureFacts(reasonCode) {
  contextResolutionFailureRegistryEntry(reasonCode);
  return structuredClone(FAILED_FACTS_BY_REASON[reasonCode]);
}

function nextReceiptStage(receipts) {
  if (receipts.length === 0) {
    return GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES[0];
  }
  const last = receipts.at(-1);
  if (last.outcome === 'failed') {
    reject('context_resolution_receipt_after_failure');
  }
  return GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES[
    last.sequence + 1
  ] || null;
}

function validateReceiptFacts({ stage, outcome, reasonCode, facts }) {
  if (!isPlainObject(facts)) reject('context_resolution_facts_invalid');
  for (const [name, value] of Object.entries(facts)) {
    if (FACT_STAGE[name] !== stage || typeof value !== 'boolean') {
      reject('context_resolution_facts_invalid');
    }
  }
  const expected = outcome === 'completed'
    ? COMPLETED_FACTS_BY_STAGE[stage]
    : FAILED_FACTS_BY_REASON[reasonCode];
  if (!expected || canonicalJson(facts) !== canonicalJson(expected)) {
    reject('context_resolution_facts_invalid');
  }
  return facts;
}

function createContextResolutionStageReceipt({
  header,
  receipts = [],
  stage,
  origin,
  outcome = 'completed',
  facts,
  reasonCode = null
} = {}) {
  validateContextResolutionReceiptChain(header, receipts);
  const expectedStage = nextReceiptStage(receipts);
  if (expectedStage === null) {
    reject('context_resolution_receipt_after_finalization');
  }
  const selectedStage = stage || expectedStage;
  const selectedOrigin = origin ||
    GOVERNED_CONTEXT_RESOLUTION_ORIGIN_BY_STAGE[selectedStage];
  const selectedFacts = facts === undefined
    ? (outcome === 'completed'
      ? COMPLETED_FACTS_BY_STAGE[selectedStage]
      : FAILED_FACTS_BY_REASON[reasonCode])
    : facts;
  const previousDigest = receipts.length === 0
    ? digestObject(header)
    : receipts.at(-1).receipt_digest;
  const base = {
    schema_version: GOVERNED_CONTEXT_RESOLUTION_SCHEMA_VERSION,
    protocol: GOVERNED_CONTEXT_RESOLUTION_PROTOCOL,
    resolution_ref: header.resolution_ref,
    sequence: receipts.length,
    stage: selectedStage,
    origin: selectedOrigin,
    outcome,
    previous_digest: previousDigest,
    facts: structuredClone(selectedFacts),
    reason_code: reasonCode
  };
  const receipt = {
    ...base,
    receipt_digest: digestObject(base)
  };
  validateContextResolutionStageReceipt(receipt, { header, receipts });
  return deepFreeze(receipt);
}

function validateContextResolutionStageReceipt(
  receipt,
  { header, receipts = [] } = {}
) {
  validateContextResolutionHeader(header);
  assertExactKeys(
    receipt,
    RECEIPT_KEYS,
    'context_resolution_receipt_shape_invalid'
  );
  if (utf8ByteLength(receipt) >
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.receiptBytes) {
    reject('context_resolution_receipt_too_large');
  }
  if (receipts.length >=
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.receiptCount) {
    reject('context_resolution_receipt_count_exceeded');
  }
  if (receipt.schema_version !==
        GOVERNED_CONTEXT_RESOLUTION_SCHEMA_VERSION ||
      receipt.protocol !== GOVERNED_CONTEXT_RESOLUTION_PROTOCOL) {
    reject('context_resolution_receipt_contract_invalid');
  }
  if (receipt.resolution_ref !== header.resolution_ref) {
    reject('context_resolution_ref_mismatch');
  }
  if (!Number.isSafeInteger(receipt.sequence) || receipt.sequence < 0) {
    reject('context_resolution_receipt_sequence_invalid');
  }
  if (receipt.sequence < receipts.length) {
    reject('context_resolution_receipt_sequence_duplicate');
  }
  if (receipt.sequence > receipts.length) {
    reject('context_resolution_receipt_sequence_gap');
  }
  const expectedStage = nextReceiptStage(receipts);
  const actualStageIndex =
    GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES.indexOf(receipt.stage);
  const expectedStageIndex =
    GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES.indexOf(expectedStage);
  if (actualStageIndex < 0) {
    reject('context_resolution_receipt_stage_invalid');
  }
  if (actualStageIndex < expectedStageIndex) {
    reject('context_resolution_receipt_stage_regression');
  }
  if (actualStageIndex > expectedStageIndex) {
    reject('context_resolution_receipt_stage_gap');
  }
  if (receipt.origin !==
      GOVERNED_CONTEXT_RESOLUTION_ORIGIN_BY_STAGE[receipt.stage]) {
    reject('context_resolution_receipt_origin_invalid');
  }
  const expectedPrevious = receipts.length === 0
    ? digestObject(header)
    : receipts.at(-1).receipt_digest;
  if (receipt.previous_digest !== expectedPrevious) {
    reject('context_resolution_receipt_chain_mismatch');
  }
  if (!['completed', 'failed'].includes(receipt.outcome)) {
    reject('context_resolution_receipt_outcome_invalid');
  }
  if (receipt.outcome === 'completed') {
    if (receipt.reason_code !== null) {
      reject('context_resolution_receipt_reason_invalid');
    }
  } else {
    const entry = contextResolutionFailureRegistryEntry(
      receipt.reason_code
    );
    if (entry.stage !== receipt.stage || entry.origin !== receipt.origin ||
        entry.terminal_candidate_allowed !== true) {
      reject('context_resolution_receipt_reason_binding_invalid');
    }
  }
  validateReceiptFacts({
    stage: receipt.stage,
    outcome: receipt.outcome,
    reasonCode: receipt.reason_code,
    facts: receipt.facts
  });
  assertDigest(
    receipt.receipt_digest,
    'context_resolution_receipt_digest_invalid'
  );
  const { receipt_digest: ignored, ...base } = receipt;
  if (receipt.receipt_digest !== digestObject(base)) {
    reject('context_resolution_receipt_digest_invalid');
  }
  return receipt;
}

function validateContextResolutionReceiptChain(header, receipts) {
  validateContextResolutionHeader(header);
  if (!Array.isArray(receipts) ||
      receipts.length > GOVERNED_CONTEXT_RESOLUTION_LIMITS.receiptCount) {
    reject('context_resolution_receipt_chain_invalid');
  }
  const accepted = [];
  for (const receipt of receipts) {
    validateContextResolutionStageReceipt(receipt, {
      header,
      receipts: accepted
    });
    accepted.push(receipt);
  }
  return receipts;
}

function createGovernedContextResolutionWorkingSet({
  header,
  receipts = []
} = {}) {
  validateContextResolutionHeader(header);
  validateContextResolutionReceiptChain(header, receipts);
  const workingSet = {
    header: structuredClone(header),
    receipts: structuredClone(receipts)
  };
  if (utf8ByteLength(workingSet) >
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.protocolBytes) {
    reject('context_resolution_working_set_too_large');
  }
  return deepFreeze(workingSet);
}

function validateGovernedContextResolutionWorkingSet(workingSet) {
  assertExactKeys(
    workingSet,
    ['header', 'receipts'],
    'context_resolution_working_set_shape_invalid'
  );
  if (utf8ByteLength(workingSet) >
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.protocolBytes) {
    reject('context_resolution_working_set_too_large');
  }
  validateContextResolutionHeader(workingSet.header);
  validateContextResolutionReceiptChain(
    workingSet.header,
    workingSet.receipts
  );
  return workingSet;
}

function appendGovernedContextResolutionStage(workingSet, input = {}) {
  validateGovernedContextResolutionWorkingSet(workingSet);
  const receipt = createContextResolutionStageReceipt({
    ...input,
    header: workingSet.header,
    receipts: workingSet.receipts
  });
  return createGovernedContextResolutionWorkingSet({
    header: workingSet.header,
    receipts: [...workingSet.receipts, receipt]
  });
}

function isGovernedContextResolutionWorkingSetExtension(prefix, candidate) {
  validateGovernedContextResolutionWorkingSet(prefix);
  validateGovernedContextResolutionWorkingSet(candidate);
  if (canonicalJson(prefix.header) !== canonicalJson(candidate.header) ||
      candidate.receipts.length < prefix.receipts.length) {
    return false;
  }
  return prefix.receipts.every((receipt, index) =>
    canonicalJson(receipt) === canonicalJson(candidate.receipts[index])
  );
}

function deriveResolutionFacts(receipts) {
  const facts = {
    mapping_resolved: null,
    scope_resolved: null,
    context_ref_issued: null,
    context_ref_shape_valid: null,
    context_ref_unexpired: null,
    context_ref_entered_response: null,
    context_ref_delivered: null
  };
  for (const receipt of receipts) {
    for (const [name, value] of Object.entries(receipt.facts)) {
      if (Object.hasOwn(facts, name)) facts[name] = value;
    }
  }
  if (facts.mapping_resolved === false &&
      [facts.scope_resolved, facts.context_ref_issued,
        facts.context_ref_shape_valid, facts.context_ref_unexpired,
        facts.context_ref_entered_response,
        facts.context_ref_delivered]
        .some(value => value !== null)) {
    reject('context_resolution_terminal_facts_invalid');
  }
  if (facts.scope_resolved === false &&
      [facts.context_ref_issued, facts.context_ref_shape_valid,
        facts.context_ref_unexpired, facts.context_ref_entered_response,
        facts.context_ref_delivered]
        .some(value => value !== null)) {
    reject('context_resolution_terminal_facts_invalid');
  }
  if (facts.context_ref_issued !== true &&
      [facts.context_ref_shape_valid, facts.context_ref_unexpired,
        facts.context_ref_entered_response,
        facts.context_ref_delivered]
        .some(value => value !== null)) {
    reject('context_resolution_terminal_facts_invalid');
  }
  if (facts.context_ref_shape_valid !== true &&
      facts.context_ref_unexpired !== null) {
    reject('context_resolution_terminal_facts_invalid');
  }
  if (facts.context_ref_entered_response !== null &&
      (facts.context_ref_issued !== true ||
       facts.context_ref_shape_valid !== true ||
       facts.context_ref_unexpired !== true)) {
    reject('context_resolution_terminal_facts_invalid');
  }
  if (facts.context_ref_delivered !== null &&
      (facts.context_ref_issued !== true ||
       facts.context_ref_shape_valid !== true ||
       facts.context_ref_unexpired !== true ||
       (facts.context_ref_delivered === true &&
        facts.context_ref_entered_response !== true))) {
    reject('context_resolution_terminal_facts_invalid');
  }
  return facts;
}

function deriveContextResolutionTerminal({
  header,
  receipts,
  outcome,
  reasonCode,
  evidenceComplete,
  failureOrigin
}) {
  validateContextResolutionReceiptChain(header, receipts);
  if (!['success', 'failure'].includes(outcome) ||
      typeof evidenceComplete !== 'boolean') {
    reject('context_resolution_terminal_outcome_invalid');
  }
  const lastReceipt = receipts.at(-1) || null;
  const failedReceipt = lastReceipt?.outcome === 'failed' ? lastReceipt : null;
  const lastCompleted = [...receipts].reverse()
    .find(receipt => receipt.outcome === 'completed') || null;
  let failureEntry = null;
  let failedStage = null;
  if (outcome === 'success') {
    if (reasonCode !== null && reasonCode !== undefined) {
      reject('context_resolution_terminal_reason_invalid');
    }
    if (failureOrigin !== null && failureOrigin !== undefined) {
      reject('context_resolution_terminal_origin_invalid');
    }
    if (evidenceComplete !== true ||
        receipts.length !==
          GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES.length ||
        lastReceipt?.stage !== 'RESPONSE_FINALIZED' ||
        receipts.some(receipt => receipt.outcome !== 'completed')) {
      reject('context_resolution_success_chain_incomplete');
    }
  } else {
    failureEntry = contextResolutionFailureRegistryEntry(reasonCode);
    if (failureEntry.terminal_candidate_allowed !== true) {
      reject('context_resolution_terminal_reason_forbidden');
    }
    if (failedReceipt) {
      if (failedReceipt.reason_code !== reasonCode ||
          failureEntry.stage !== failedReceipt.stage ||
          failureEntry.origin !== failedReceipt.origin) {
        reject('context_resolution_terminal_reason_binding_invalid');
      }
      if (failureOrigin !== undefined && failureOrigin !== null &&
          failureOrigin !== failedReceipt.origin) {
        reject('context_resolution_terminal_origin_invalid');
      }
      if (evidenceComplete !== true) {
        reject('context_resolution_stage_failure_evidence_incomplete');
      }
      failedStage = failedReceipt.stage;
    } else {
      if (failureEntry.stage !== 'TERMINAL_FAILURE') {
        reject('context_resolution_terminal_failure_receipt_missing');
      }
      if (failureOrigin !== failureEntry.origin) {
        reject('context_resolution_terminal_origin_invalid');
      }
      if (evidenceComplete !== false) {
        reject('context_resolution_coordinator_failure_evidence_invalid');
      }
      failedStage = 'TERMINAL_FAILURE';
    }
  }
  const facts = deriveResolutionFacts(receipts);
  if (outcome === 'success' &&
      Object.values(facts).some(value => value !== true)) {
    reject('context_resolution_success_facts_incomplete');
  }
  return {
    schema_version: GOVERNED_CONTEXT_RESOLUTION_SCHEMA_VERSION,
    protocol: GOVERNED_CONTEXT_RESOLUTION_PROTOCOL,
    resolution_ref: header.resolution_ref,
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
    ...facts,
    read_attempt_created: false,
    receipt_count: receipts.length,
    last_receipt_digest: lastReceipt?.receipt_digest || digestObject(header)
  };
}

function createContextResolutionTerminalEnvelope({
  header,
  receipts = [],
  outcome,
  reasonCode = null,
  evidenceComplete,
  failureOrigin = null
} = {}) {
  const base = deriveContextResolutionTerminal({
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
  if (utf8ByteLength(terminal) >
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.terminalBytes) {
    reject('context_resolution_terminal_too_large');
  }
  return deepFreeze(terminal);
}

function contextResolutionPublicResponseStatus(terminal) {
  if (!isPlainObject(terminal) ||
      !['success', 'failure'].includes(terminal.outcome)) {
    reject('context_resolution_public_terminal_invalid');
  }
  if (terminal.outcome === 'success') return 'ok';
  const entry = contextResolutionFailureRegistryEntry(terminal.reason_code);
  if (terminal.failure_category !== entry.category ||
      terminal.failure_origin !== entry.origin ||
      entry.public_projection_safe !== true ||
      entry.public_response_status === null) {
    reject('context_resolution_public_terminal_invalid');
  }
  return entry.public_response_status;
}

function projectGovernedContextResolutionPublic(protocol) {
  validateGovernedContextResolutionProtocol(protocol);
  const terminal = protocol.terminal;
  contextResolutionPublicResponseStatus(terminal);
  return deepFreeze({
    protocol: terminal.protocol,
    outcome: terminal.outcome,
    last_completed_stage: terminal.last_completed_stage,
    failed_stage: terminal.failed_stage,
    reason_code: terminal.reason_code,
    failure_category: terminal.failure_category,
    failure_origin: terminal.failure_origin,
    context_ref_issued: terminal.context_ref_issued,
    context_ref_entered_response: terminal.context_ref_entered_response,
    context_ref_delivered: terminal.context_ref_delivered,
    evidence_complete: terminal.evidence_complete
  });
}

function projectUnknownGovernedContextResolutionPublic() {
  return deepFreeze({
    protocol: GOVERNED_CONTEXT_RESOLUTION_PROTOCOL,
    outcome: 'failure',
    last_completed_stage: null,
    failed_stage: null,
    reason_code: null,
    failure_category: null,
    failure_origin: null,
    context_ref_issued: null,
    context_ref_entered_response: null,
    context_ref_delivered: null,
    evidence_complete: false
  });
}

function validateGovernedContextResolutionPublicProjection(projection) {
  assertExactKeys(projection, [
    'protocol',
    'outcome',
    'last_completed_stage',
    'failed_stage',
    'reason_code',
    'failure_category',
    'failure_origin',
    'context_ref_issued',
    'context_ref_entered_response',
    'context_ref_delivered',
    'evidence_complete'
  ], 'context_resolution_public_projection_shape_invalid');
  if (projection.protocol !== GOVERNED_CONTEXT_RESOLUTION_PROTOCOL ||
      !['success', 'failure'].includes(projection.outcome) ||
      ![null, ...GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES]
        .includes(projection.last_completed_stage) ||
      ![null, ...GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES,
        'TERMINAL_FAILURE'].includes(projection.failed_stage) ||
      ![null, true, false].includes(projection.context_ref_issued) ||
      ![null, true, false].includes(projection.context_ref_entered_response) ||
      ![null, true, false].includes(projection.context_ref_delivered) ||
      typeof projection.evidence_complete !== 'boolean') {
    reject('context_resolution_public_projection_invalid');
  }
  const nullableSafeCode = value => value === null ||
    (typeof value === 'string' && GOVERNED_SAFE_CODE_PATTERN.test(value));
  if (!nullableSafeCode(projection.reason_code) ||
      !nullableSafeCode(projection.failure_category) ||
      (projection.failure_origin !== null &&
       !Object.values(GOVERNED_CONTEXT_RESOLUTION_ORIGIN_BY_STAGE)
         .includes(projection.failure_origin))) {
    reject('context_resolution_public_projection_invalid');
  }
  if (projection.outcome === 'success') {
    if (projection.last_completed_stage !== 'RESPONSE_FINALIZED' ||
        projection.failed_stage !== null ||
        projection.reason_code !== null ||
        projection.failure_category !== null ||
        projection.failure_origin !== null ||
        projection.context_ref_issued !== true ||
        projection.context_ref_entered_response !== true ||
        projection.context_ref_delivered !== true ||
        projection.evidence_complete !== true) {
      reject('context_resolution_public_projection_invalid');
    }
    return projection;
  }
  if (projection.evidence_complete === false) {
    if (projection.reason_code !== null ||
        projection.failure_category !== null ||
        projection.failure_origin !== null ||
        projection.context_ref_entered_response === true ||
        projection.context_ref_delivered === true) {
      reject('context_resolution_public_projection_unknown_invalid');
    }
    return projection;
  }
  if (projection.reason_code === null) {
    reject('context_resolution_public_projection_invalid');
  }
  const entry = contextResolutionFailureRegistryEntry(projection.reason_code);
  if (entry.public_projection_safe !== true ||
      entry.public_response_status === null ||
      projection.failure_category !== entry.category ||
      projection.failure_origin !== entry.origin ||
      projection.failed_stage !== entry.stage) {
    reject('context_resolution_public_projection_invalid');
  }
  if (projection.context_ref_delivered === true ||
      (projection.context_ref_delivered === false &&
       projection.context_ref_issued !== true)) {
    reject('context_resolution_public_projection_delivery_invalid');
  }
  if (projection.context_ref_entered_response !== null &&
      projection.context_ref_issued !== true) {
    reject('context_resolution_public_projection_delivery_invalid');
  }
  if (projection.context_ref_delivered === true &&
      projection.context_ref_entered_response !== true) {
    reject('context_resolution_public_projection_delivery_invalid');
  }
  if (projection.reason_code === 'context_response_finalization_failed' ||
      projection.reason_code === 'context_response_projection_invalid') {
    if (projection.context_ref_issued !== true ||
        projection.context_ref_entered_response !== false ||
        projection.context_ref_delivered !== false) {
      reject('context_resolution_public_projection_delivery_invalid');
    }
  }
  return projection;
}

function contextResolutionResponseBindingDigest({
  requestDigest,
  resolutionRef,
  terminalDigest,
  structuredContentDigest
} = {}) {
  assertDigest(requestDigest, 'context_resolution_response_binding_invalid');
  if (typeof resolutionRef !== 'string' ||
      !GOVERNED_CONTEXT_RESOLUTION_REF_PATTERN.test(resolutionRef)) {
    reject('context_resolution_response_binding_invalid');
  }
  assertDigest(terminalDigest, 'context_resolution_response_binding_invalid');
  assertDigest(
    structuredContentDigest,
    'context_resolution_response_binding_invalid'
  );
  return digestObject({
    protocol: GOVERNED_CONTEXT_RESOLUTION_PROTOCOL,
    request_digest: requestDigest,
    resolution_ref: resolutionRef,
    terminal_digest: terminalDigest,
    structured_content_digest: structuredContentDigest
  });
}

function validateContextResolutionTerminalEnvelope(
  terminal,
  { header, receipts = [] } = {}
) {
  assertExactKeys(
    terminal,
    TERMINAL_KEYS,
    'context_resolution_terminal_shape_invalid'
  );
  if (utf8ByteLength(terminal) >
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.terminalBytes) {
    reject('context_resolution_terminal_too_large');
  }
  if (terminal.resolution_ref !== header?.resolution_ref) {
    reject('context_resolution_ref_mismatch');
  }
  if (terminal.read_attempt_created !== false) {
    reject('context_resolution_read_attempt_forbidden');
  }
  assertDigest(
    terminal.terminal_digest,
    'context_resolution_terminal_digest_invalid'
  );
  const expected = createContextResolutionTerminalEnvelope({
    header,
    receipts,
    outcome: terminal.outcome,
    reasonCode: terminal.reason_code,
    evidenceComplete: terminal.evidence_complete,
    failureOrigin: terminal.failure_origin
  });
  if (canonicalJson(terminal) !== canonicalJson(expected)) {
    reject('context_resolution_terminal_invalid');
  }
  return terminal;
}

function createGovernedContextResolutionProtocol({
  header,
  receipts,
  terminal
} = {}) {
  validateContextResolutionHeader(header);
  validateContextResolutionReceiptChain(header, receipts);
  validateContextResolutionTerminalEnvelope(terminal, { header, receipts });
  const protocol = {
    header: structuredClone(header),
    receipts: structuredClone(receipts),
    terminal: structuredClone(terminal)
  };
  if (utf8ByteLength(protocol) >
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.protocolBytes) {
    reject('context_resolution_protocol_too_large');
  }
  return deepFreeze(protocol);
}

function validateGovernedContextResolutionProtocol(protocol) {
  assertExactKeys(
    protocol,
    ['header', 'receipts', 'terminal'],
    'context_resolution_protocol_shape_invalid'
  );
  if (utf8ByteLength(protocol) >
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.protocolBytes) {
    reject('context_resolution_protocol_too_large');
  }
  validateContextResolutionHeader(protocol.header);
  validateContextResolutionReceiptChain(
    protocol.header,
    protocol.receipts
  );
  validateContextResolutionTerminalEnvelope(protocol.terminal, {
    header: protocol.header,
    receipts: protocol.receipts
  });
  return protocol;
}

function contextResolutionDeadlineBudgetMs(
  header,
  { now = new Date(), marginMs = 0 } = {}
) {
  validateContextResolutionHeader(header);
  const current = now instanceof Date
    ? new Date(now.getTime())
    : new Date(now);
  if (!Number.isFinite(current.getTime())) {
    reject('context_resolution_deadline_clock_invalid');
  }
  if (!Number.isInteger(marginMs) || marginMs < 0 || marginMs > 10_000) {
    reject('context_resolution_deadline_margin_invalid');
  }
  const remainingMs = Date.parse(header.deadline_at) - current.getTime();
  if (remainingMs <= 0) return 0;
  return Math.min(
    remainingMs + marginMs,
    GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds * 1000 + marginMs
  );
}

module.exports = {
  GOVERNED_CONTEXT_RESOLUTION_COORDINATOR,
  GOVERNED_CONTEXT_RESOLUTION_EVENT_COMPONENT,
  GOVERNED_CONTEXT_RESOLUTION_FAILURE_REGISTRY,
  GOVERNED_CONTEXT_RESOLUTION_LIMITS,
  GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES,
  GOVERNED_CONTEXT_RESOLUTION_OPERATION,
  GOVERNED_CONTEXT_RESOLUTION_ORIGIN_BY_STAGE,
  GOVERNED_CONTEXT_RESOLUTION_PROTOCOL,
  GOVERNED_CONTEXT_RESOLUTION_REF_PATTERN,
  GOVERNED_CONTEXT_RESOLUTION_SCHEMA_VERSION,
  GOVERNED_CONTEXT_RESOLUTION_STAGES,
  GOVERNED_CONTEXT_RESOLUTION_TERMINAL_STAGES,
  appendGovernedContextResolutionStage,
  contextResolutionDeadlineBudgetMs,
  contextResolutionPublicResponseStatus,
  contextResolutionResponseBindingDigest,
  contextResolutionFailureFacts,
  contextResolutionFailureRegistryEntry,
  contextResolutionRef,
  createContextResolutionHeader,
  createContextResolutionStageReceipt,
  createContextResolutionTerminalEnvelope,
  createGovernedContextResolutionProtocol,
  createGovernedContextResolutionWorkingSet,
  isGovernedContextResolutionWorkingSetExtension,
  projectGovernedContextResolutionPublic,
  projectUnknownGovernedContextResolutionPublic,
  validateContextResolutionHeader,
  validateContextResolutionReceiptChain,
  validateContextResolutionStageReceipt,
  validateContextResolutionTerminalEnvelope,
  validateGovernedContextResolutionPublicProjection,
  validateGovernedContextResolutionProtocol,
  validateGovernedContextResolutionWorkingSet
};
