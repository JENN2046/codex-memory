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
  defineGovernedFailureRegistry,
  governedFailureRegistryEntry
} = require('./governed-failure-registry');

const GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL =
  'governed_runtime_identity_transition.v1';
const GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION = 1;
const GOVERNED_RUNTIME_IDENTITY_TRANSITION_REF_PATTERN =
  /^grit_[A-Za-z0-9_-]{24,96}$/u;
const GOVERNED_RUNTIME_IDENTITY_AUTHORITY_ID_PATTERN =
  /^grauth_[A-Za-z0-9_-]{16,96}$/u;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const GIT_HEAD_PATTERN = /^[a-f0-9]{40}$/u;
const ENDPOINT_ID_PATTERN = /^[a-z][a-z0-9_]{1,63}$/u;
const PROTOCOL_NAME_PATTERN = /^[a-z][a-z0-9_.-]{2,95}$/u;

const GOVERNED_RUNTIME_IDENTITY_TRANSITION_STAGES = Object.freeze([
  'CREATED',
  'AUTHORITY_VERIFIED',
  'SAFE_STOP_VERIFIED',
  'FROM_IDENTITY_VERIFIED',
  'CANDIDATE_MANIFEST_VERIFIED',
  'TRANSITION_PREPARED',
  'TRANSITION_COMMITTED',
  'POST_IDENTITY_VERIFIED',
  'TERMINAL_SUCCESS',
  'TERMINAL_FAILURE'
]);
const GOVERNED_RUNTIME_IDENTITY_TRANSITION_NON_TERMINAL_STAGES =
  Object.freeze(GOVERNED_RUNTIME_IDENTITY_TRANSITION_STAGES.slice(0, -2));

const GOVERNED_RUNTIME_IDENTITY_TRANSITION_ORIGIN_BY_STAGE = Object.freeze({
  CREATED: 'transition_coordinator',
  AUTHORITY_VERIFIED: 'authority_verifier',
  SAFE_STOP_VERIFIED: 'lifecycle_verifier',
  FROM_IDENTITY_VERIFIED: 'identity_store',
  CANDIDATE_MANIFEST_VERIFIED: 'manifest_verifier',
  TRANSITION_PREPARED: 'transition_coordinator',
  TRANSITION_COMMITTED: 'identity_store',
  POST_IDENTITY_VERIFIED: 'transition_coordinator',
  TERMINAL_SUCCESS: 'transition_coordinator',
  TERMINAL_FAILURE: 'transition_coordinator'
});

const GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS = Object.freeze({
  requestBytes: 24 * 1024,
  receiptBytes: 2 * 1024,
  receiptCount: 8,
  terminalBytes: 8 * 1024,
  protocolBytes: 64 * 1024,
  previewBytes: 48 * 1024,
  ttlSeconds: 15 * 60,
  protocolVersionCount: 32
});

function failure(category, stage, origin, {
  fatal = false,
  terminalCandidateAllowed = true
} = {}) {
  return deepFreeze({
    category,
    stage,
    origin,
    fatal,
    terminal_candidate_allowed: terminalCandidateAllowed
  });
}

const GOVERNED_RUNTIME_IDENTITY_TRANSITION_FAILURE_REGISTRY =
  defineGovernedFailureRegistry({
    authority_unverified: failure(
      'authorization', 'AUTHORITY_VERIFIED', 'authority_verifier'
    ),
    authority_lineage_mismatch: failure(
      'authorization', 'AUTHORITY_VERIFIED', 'authority_verifier'
    ),
    safe_stop_receipt_invalid: failure(
      'lifecycle', 'SAFE_STOP_VERIFIED', 'lifecycle_verifier'
    ),
    runtime_not_stopped: failure(
      'lifecycle', 'SAFE_STOP_VERIFIED', 'lifecycle_verifier'
    ),
    runtime_not_held: failure(
      'lifecycle', 'SAFE_STOP_VERIFIED', 'lifecycle_verifier'
    ),
    from_identity_changed: failure(
      'identity', 'FROM_IDENTITY_VERIFIED', 'identity_store'
    ),
    from_manifest_changed: failure(
      'identity', 'FROM_IDENTITY_VERIFIED', 'identity_store'
    ),
    candidate_manifest_invalid: failure(
      'candidate', 'CANDIDATE_MANIFEST_VERIFIED', 'manifest_verifier'
    ),
    candidate_manifest_scope_dirty: failure(
      'candidate', 'CANDIDATE_MANIFEST_VERIFIED', 'manifest_verifier'
    ),
    profile_schema_mismatch: failure(
      'binding', 'FROM_IDENTITY_VERIFIED', 'identity_store'
    ),
    endpoint_identity_mismatch: failure(
      'binding', 'FROM_IDENTITY_VERIFIED', 'identity_store'
    ),
    protocol_binding_invalid: failure(
      'binding', 'CANDIDATE_MANIFEST_VERIFIED', 'manifest_verifier'
    ),
    candidate_manifest_changed_after_preview: failure(
      'candidate', 'TRANSITION_COMMITTED', 'manifest_verifier'
    ),
    candidate_scope_changed_after_preview: failure(
      'candidate', 'TRANSITION_COMMITTED', 'manifest_verifier'
    ),
    candidate_protocol_binding_changed_after_preview: failure(
      'binding', 'TRANSITION_COMMITTED', 'manifest_verifier'
    ),
    candidate_revalidation_unavailable: failure(
      'candidate', 'TRANSITION_COMMITTED', 'manifest_verifier'
    ),
    transition_expired: failure(
      'lifecycle', 'TERMINAL_FAILURE', 'transition_coordinator'
    ),
    transition_replayed: failure(
      'replay', 'TERMINAL_FAILURE', 'transition_coordinator'
    ),
    transition_cas_lost: failure(
      'concurrency', 'TRANSITION_COMMITTED', 'identity_store'
    ),
    transition_record_store_unavailable: failure(
      'persistence', 'TERMINAL_FAILURE', 'transition_coordinator'
    ),
    post_identity_mismatch: failure(
      'identity', 'POST_IDENTITY_VERIFIED', 'transition_coordinator',
      { fatal: true }
    ),
    partial_transition_detected: failure(
      'atomicity', 'TRANSITION_COMMITTED', 'identity_store',
      { fatal: true }
    ),
    terminal_missing: failure(
      'protocol', 'TERMINAL_FAILURE', 'observer',
      { terminalCandidateAllowed: false }
    )
  });

const AUTHORITY_KEYS = Object.freeze([
  'authority_id',
  'authority_lineage_digest',
  'authority_proof_digest'
]);
const RUNTIME_IDENTITY_KEYS = Object.freeze([
  'identity_digest',
  'source_head',
  'manifest_schema',
  'manifest_digest',
  'profile_schema',
  'endpoint_identity',
  'protocol_versions',
  'lineage_digest'
]);
const TO_RUNTIME_KEYS = Object.freeze([
  'source_head',
  'manifest_schema',
  'manifest_digest',
  'profile_schema',
  'endpoint_identity',
  'protocol_versions',
  'candidate_tree_digest'
]);
const PRECONDITION_KEYS = Object.freeze([
  'lifecycle_state',
  'held_stopped',
  'safe_stop_receipt_digest',
  'running_component_count'
]);
const REQUEST_CLOCK_KEYS = Object.freeze([
  'created_at',
  'expires_at',
  'nonce'
]);
const LEGACY_EVIDENCE_KEYS = Object.freeze([
  'safe_stop_receipt_digest',
  'accepted_runtime_identity_digest',
  'accepted_runtime_lineage_digest',
  'accepted_runtime_manifest_digest',
  'current_controller_client_identity_digest',
  'candidate_manifest_digest'
]);
const TRANSITION_REQUEST_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'transition_ref',
  'authority',
  'from_runtime',
  'to_runtime',
  'preconditions',
  'request',
  'legacy_transition_evidence'
]);
const RECEIPT_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'transition_ref',
  'sequence',
  'stage',
  'origin',
  'outcome',
  'previous_digest',
  'evidence_status',
  'evidence_digest',
  'reason_code',
  'receipt_digest'
]);
const TERMINAL_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'transition_ref',
  'terminal_stage',
  'outcome',
  'last_completed_stage',
  'failed_stage',
  'reason_code',
  'failure_category',
  'failure_origin',
  'fatal_inconsistency',
  'evidence_complete',
  'unknown_evidence_stages',
  'receipt_count',
  'last_receipt_digest',
  'new_runtime_identity_digest',
  'controller_binding_digest',
  'runtime_stopped',
  'terminal_digest'
]);
const PREVIEW_KEYS = Object.freeze([
  'schema_version',
  'protocol',
  'request',
  'receipts',
  'request_digest',
  'authority_context_digest',
  'expected_store_version',
  'preview_context_digest'
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
  if (typeof value !== 'string' || value.length > 40 || value.trim() !== value) {
    reject(code);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    reject(code);
  }
  return parsed;
}

function validateProtocolVersions(value, code) {
  if (!isPlainObject(value) ||
      Object.keys(value).length < 1 ||
      Object.keys(value).length >
        GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.protocolVersionCount) {
    reject(code);
  }
  for (const [name, version] of Object.entries(value)) {
    if (!PROTOCOL_NAME_PATTERN.test(name) ||
        (Number.isSafeInteger(version) && version < 1) ||
        (!Number.isSafeInteger(version) &&
          (typeof version !== 'string' ||
            !/^[A-Za-z0-9][A-Za-z0-9_.-]{0,31}$/u.test(version)))) {
      reject(code);
    }
  }
  return value;
}

function validateRuntimeIdentity(value, code = 'transition_runtime_identity_invalid') {
  assertExactKeys(value, RUNTIME_IDENTITY_KEYS, code);
  assertDigest(value.identity_digest, code);
  if (!GIT_HEAD_PATTERN.test(value.source_head || '') ||
      value.manifest_schema !== 1 ||
      !Number.isSafeInteger(value.profile_schema) || value.profile_schema < 1 ||
      !ENDPOINT_ID_PATTERN.test(value.endpoint_identity || '')) {
    reject(code);
  }
  assertDigest(value.manifest_digest, code);
  assertDigest(value.lineage_digest, code);
  validateProtocolVersions(value.protocol_versions, code);
  return value;
}

function validateToRuntime(value) {
  assertExactKeys(value, TO_RUNTIME_KEYS, 'transition_to_runtime_invalid');
  if (!GIT_HEAD_PATTERN.test(value.source_head || '') ||
      value.manifest_schema !== 1 ||
      !Number.isSafeInteger(value.profile_schema) || value.profile_schema < 1 ||
      !ENDPOINT_ID_PATTERN.test(value.endpoint_identity || '')) {
    reject('transition_to_runtime_invalid');
  }
  assertDigest(value.manifest_digest, 'transition_to_runtime_invalid');
  assertDigest(value.candidate_tree_digest, 'transition_to_runtime_invalid');
  validateProtocolVersions(
    value.protocol_versions,
    'transition_to_runtime_invalid'
  );
  return value;
}

function transitionRef(randomBytes = crypto.randomBytes) {
  return `grit_${randomBytes(24).toString('base64url')}`;
}

function createRuntimeIdentityTransitionRequest(input = {}) {
  const now = input.now instanceof Date
    ? new Date(input.now.getTime())
    : new Date(input.now || Date.now());
  if (!Number.isFinite(now.getTime())) reject('transition_clock_invalid');
  const ttlSeconds = input.ttlSeconds ??
    GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.ttlSeconds;
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 ||
      ttlSeconds > GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.ttlSeconds) {
    reject('transition_ttl_invalid');
  }
  const request = {
    schema_version: GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION,
    protocol: GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
    transition_ref: input.transitionRef || transitionRef(input.randomBytes),
    authority: structuredClone(input.authority),
    from_runtime: structuredClone(input.fromRuntime),
    to_runtime: structuredClone(input.toRuntime),
    preconditions: structuredClone(input.preconditions),
    request: {
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      nonce: input.nonce
    },
    legacy_transition_evidence:
      input.legacyTransitionEvidence === undefined
        ? null
        : structuredClone(input.legacyTransitionEvidence)
  };
  validateRuntimeIdentityTransitionRequest(request);
  return deepFreeze(request);
}

function validateRuntimeIdentityTransitionRequest(request) {
  assertExactKeys(
    request,
    TRANSITION_REQUEST_KEYS,
    'transition_request_shape_invalid'
  );
  if (utf8ByteLength(request) >
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.requestBytes) {
    reject('transition_request_too_large');
  }
  if (request.schema_version !==
        GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION ||
      request.protocol !== GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL ||
      typeof request.transition_ref !== 'string' ||
      !GOVERNED_RUNTIME_IDENTITY_TRANSITION_REF_PATTERN.test(
        request.transition_ref
      )) {
    reject('transition_request_contract_invalid');
  }
  assertExactKeys(
    request.authority,
    AUTHORITY_KEYS,
    'transition_authority_invalid'
  );
  if (!GOVERNED_RUNTIME_IDENTITY_AUTHORITY_ID_PATTERN.test(
    request.authority.authority_id || ''
  )) {
    reject('transition_authority_invalid');
  }
  assertDigest(
    request.authority.authority_lineage_digest,
    'transition_authority_invalid'
  );
  assertDigest(
    request.authority.authority_proof_digest,
    'transition_authority_invalid'
  );
  validateRuntimeIdentity(request.from_runtime);
  validateToRuntime(request.to_runtime);
  assertExactKeys(
    request.preconditions,
    PRECONDITION_KEYS,
    'transition_preconditions_invalid'
  );
  if (request.preconditions.lifecycle_state !== 'stopped' ||
      request.preconditions.held_stopped !== true ||
      request.preconditions.running_component_count !== 0) {
    reject('transition_preconditions_invalid');
  }
  assertDigest(
    request.preconditions.safe_stop_receipt_digest,
    'transition_preconditions_invalid'
  );
  assertExactKeys(
    request.request,
    REQUEST_CLOCK_KEYS,
    'transition_request_clock_invalid'
  );
  const createdMs = parseTimestamp(
    request.request.created_at,
    'transition_created_at_invalid'
  );
  const expiresMs = parseTimestamp(
    request.request.expires_at,
    'transition_expires_at_invalid'
  );
  if (expiresMs <= createdMs ||
      expiresMs - createdMs >
        GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.ttlSeconds * 1000 ||
      typeof request.request.nonce !== 'string' ||
      !/^[A-Za-z0-9_-]{24,128}$/u.test(request.request.nonce)) {
    reject('transition_request_clock_invalid');
  }
  if (request.legacy_transition_evidence !== null) {
    assertExactKeys(
      request.legacy_transition_evidence,
      LEGACY_EVIDENCE_KEYS,
      'transition_legacy_evidence_invalid'
    );
    for (const value of Object.values(request.legacy_transition_evidence)) {
      assertDigest(value, 'transition_legacy_evidence_invalid');
    }
  }
  return request;
}

function runtimeIdentityTransitionRequestDigest(request) {
  validateRuntimeIdentityTransitionRequest(request);
  return digestObject(request);
}

function runtimeIdentityTransitionAuthorityContextDigest(request) {
  validateRuntimeIdentityTransitionRequest(request);
  return digestObject({
    protocol: GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
    schema_version: GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION,
    transition_ref: request.transition_ref,
    authority_id: request.authority.authority_id,
    authority_lineage_digest:
      request.authority.authority_lineage_digest,
    request_without_authority_proof: {
      ...structuredClone(request),
      authority: {
        ...structuredClone(request.authority),
        authority_proof_digest: null
      }
    }
  });
}

function transitionFailureRegistryEntry(reasonCode) {
  return governedFailureRegistryEntry(
    GOVERNED_RUNTIME_IDENTITY_TRANSITION_FAILURE_REGISTRY,
    reasonCode,
    {
      invalidReasonCode: 'transition_reason_invalid',
      unknownReasonCode: 'transition_reason_unknown'
    }
  );
}

function nextTransitionStage(receipts) {
  if (receipts.length === 0) {
    return GOVERNED_RUNTIME_IDENTITY_TRANSITION_NON_TERMINAL_STAGES[0];
  }
  const last = receipts.at(-1);
  if (last.outcome === 'failed') reject('transition_receipt_after_failure');
  return GOVERNED_RUNTIME_IDENTITY_TRANSITION_NON_TERMINAL_STAGES[
    last.sequence + 1
  ] || null;
}

function createRuntimeIdentityTransitionReceipt({
  request,
  receipts = [],
  stage,
  outcome = 'completed',
  evidenceStatus = 'verified',
  evidenceDigest,
  reasonCode = null
} = {}) {
  validateRuntimeIdentityTransitionReceiptChain(request, receipts);
  const expectedStage = nextTransitionStage(receipts);
  if (expectedStage === null) reject('transition_receipt_after_finalization');
  const selectedStage = stage || expectedStage;
  const failureEntry = outcome === 'failed'
    ? transitionFailureRegistryEntry(reasonCode)
    : null;
  const base = {
    schema_version: GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION,
    protocol: GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
    transition_ref: request.transition_ref,
    sequence: receipts.length,
    stage: selectedStage,
    origin: failureEntry?.origin ||
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_ORIGIN_BY_STAGE[selectedStage],
    outcome,
    previous_digest: receipts.length === 0
      ? runtimeIdentityTransitionRequestDigest(request)
      : receipts.at(-1).receipt_digest,
    evidence_status: evidenceStatus,
    evidence_digest: evidenceDigest ?? null,
    reason_code: reasonCode
  };
  const receipt = {
    ...base,
    receipt_digest: digestObject(base)
  };
  validateRuntimeIdentityTransitionReceipt(receipt, { request, receipts });
  return deepFreeze(receipt);
}

function validateRuntimeIdentityTransitionReceipt(
  receipt,
  { request, receipts = [] } = {}
) {
  validateRuntimeIdentityTransitionRequest(request);
  assertExactKeys(receipt, RECEIPT_KEYS, 'transition_receipt_shape_invalid');
  if (utf8ByteLength(receipt) >
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.receiptBytes) {
    reject('transition_receipt_too_large');
  }
  if (receipts.length >=
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.receiptCount) {
    reject('transition_receipt_count_exceeded');
  }
  if (receipt.schema_version !==
        GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION ||
      receipt.protocol !== GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL ||
      receipt.transition_ref !== request.transition_ref ||
      !Number.isSafeInteger(receipt.sequence) || receipt.sequence < 0) {
    reject('transition_receipt_contract_invalid');
  }
  if (receipt.sequence !== receipts.length) {
    reject(receipt.sequence < receipts.length
      ? 'transition_receipt_sequence_duplicate'
      : 'transition_receipt_sequence_gap');
  }
  const expectedStage = nextTransitionStage(receipts);
  if (receipt.stage !== expectedStage) {
    const actual =
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_NON_TERMINAL_STAGES.indexOf(
        receipt.stage
      );
    const expected =
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_NON_TERMINAL_STAGES.indexOf(
        expectedStage
      );
    reject(actual < expected
      ? 'transition_receipt_stage_regression'
      : 'transition_receipt_stage_gap');
  }
  const expectedOrigin = receipt.outcome === 'failed'
    ? transitionFailureRegistryEntry(receipt.reason_code).origin
    : GOVERNED_RUNTIME_IDENTITY_TRANSITION_ORIGIN_BY_STAGE[receipt.stage];
  if (receipt.origin !== expectedOrigin) {
    reject('transition_receipt_origin_invalid');
  }
  const previousDigest = receipts.length === 0
    ? runtimeIdentityTransitionRequestDigest(request)
    : receipts.at(-1).receipt_digest;
  if (receipt.previous_digest !== previousDigest) {
    reject('transition_receipt_chain_mismatch');
  }
  if (!['completed', 'failed'].includes(receipt.outcome) ||
      !['verified', 'unknown'].includes(receipt.evidence_status)) {
    reject('transition_receipt_outcome_invalid');
  }
  if (receipt.evidence_status === 'verified') {
    assertDigest(receipt.evidence_digest, 'transition_receipt_evidence_invalid');
  } else if (receipt.evidence_digest !== null) {
    reject('transition_receipt_evidence_invalid');
  }
  if (receipt.outcome === 'completed') {
    if (receipt.evidence_status !== 'verified' || receipt.reason_code !== null) {
      reject('transition_receipt_reason_invalid');
    }
  } else {
    const failureEntry = transitionFailureRegistryEntry(receipt.reason_code);
    if (failureEntry.stage !== receipt.stage ||
        failureEntry.origin !== receipt.origin) {
      reject('transition_receipt_reason_binding_invalid');
    }
  }
  assertDigest(receipt.receipt_digest, 'transition_receipt_digest_invalid');
  const { receipt_digest: ignored, ...base } = receipt;
  if (receipt.receipt_digest !== digestObject(base)) {
    reject('transition_receipt_digest_invalid');
  }
  return receipt;
}

function validateRuntimeIdentityTransitionReceiptChain(request, receipts) {
  validateRuntimeIdentityTransitionRequest(request);
  if (!Array.isArray(receipts) || receipts.length >
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.receiptCount) {
    reject('transition_receipt_chain_invalid');
  }
  const accepted = [];
  for (const receipt of receipts) {
    validateRuntimeIdentityTransitionReceipt(receipt, {
      request,
      receipts: accepted
    });
    accepted.push(receipt);
  }
  return receipts;
}

function appendRuntimeIdentityTransitionStage(workingSet, input = {}) {
  assertExactKeys(
    workingSet,
    ['request', 'receipts'],
    'transition_working_set_invalid'
  );
  validateRuntimeIdentityTransitionReceiptChain(
    workingSet.request,
    workingSet.receipts
  );
  const receipt = createRuntimeIdentityTransitionReceipt({
    ...input,
    request: workingSet.request,
    receipts: workingSet.receipts
  });
  return deepFreeze({
    request: structuredClone(workingSet.request),
    receipts: [...structuredClone(workingSet.receipts), receipt]
  });
}

function deriveRuntimeIdentityTransitionTerminal({
  request,
  receipts,
  outcome,
  reasonCode = null,
  newRuntimeIdentityDigest = null,
  controllerBindingDigest = null,
  runtimeStopped = null
} = {}) {
  validateRuntimeIdentityTransitionReceiptChain(request, receipts);
  if (!['success', 'failure'].includes(outcome)) {
    reject('transition_terminal_outcome_invalid');
  }
  const last = receipts.at(-1) || null;
  const lastCompleted = [...receipts].reverse()
    .find(receipt => receipt.outcome === 'completed') || null;
  const failed = last?.outcome === 'failed' ? last : null;
  let failureEntry = null;
  if (outcome === 'success') {
    if (receipts.length !==
          GOVERNED_RUNTIME_IDENTITY_TRANSITION_NON_TERMINAL_STAGES.length ||
        receipts.some(receipt => receipt.outcome !== 'completed') ||
        last?.stage !== 'POST_IDENTITY_VERIFIED' ||
        reasonCode !== null || runtimeStopped !== true) {
      reject('transition_success_chain_incomplete');
    }
    assertDigest(
      newRuntimeIdentityDigest,
      'transition_terminal_identity_invalid'
    );
    assertDigest(
      controllerBindingDigest,
      'transition_terminal_binding_invalid'
    );
  } else {
    failureEntry = transitionFailureRegistryEntry(reasonCode);
    if (failureEntry.terminal_candidate_allowed !== true) {
      reject('transition_terminal_reason_forbidden');
    }
    if (failed) {
      if (failed.reason_code !== reasonCode ||
          failureEntry.stage !== failed.stage ||
          failureEntry.origin !== failed.origin) {
        reject('transition_terminal_reason_binding_invalid');
      }
    } else if (failureEntry.stage !== 'TERMINAL_FAILURE') {
      reject('transition_terminal_failure_receipt_missing');
    }
    if (newRuntimeIdentityDigest !== null ||
        controllerBindingDigest !== null ||
        ![true, false, null].includes(runtimeStopped)) {
      reject('transition_terminal_failure_projection_invalid');
    }
  }
  const unknownStages = receipts
    .filter(receipt => receipt.evidence_status === 'unknown')
    .map(receipt => receipt.stage);
  return {
    schema_version: GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION,
    protocol: GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
    transition_ref: request.transition_ref,
    terminal_stage: outcome === 'success'
      ? 'TERMINAL_SUCCESS'
      : 'TERMINAL_FAILURE',
    outcome,
    last_completed_stage: lastCompleted?.stage || null,
    failed_stage: outcome === 'failure'
      ? (failed?.stage || 'TERMINAL_FAILURE')
      : null,
    reason_code: outcome === 'failure' ? reasonCode : null,
    failure_category: failureEntry?.category || null,
    failure_origin: failureEntry?.origin || null,
    fatal_inconsistency: failureEntry?.fatal === true,
    evidence_complete: unknownStages.length === 0,
    unknown_evidence_stages: unknownStages,
    receipt_count: receipts.length,
    last_receipt_digest: last?.receipt_digest ||
      runtimeIdentityTransitionRequestDigest(request),
    new_runtime_identity_digest: newRuntimeIdentityDigest,
    controller_binding_digest: controllerBindingDigest,
    runtime_stopped: runtimeStopped
  };
}

function createRuntimeIdentityTransitionTerminal(input = {}) {
  const base = deriveRuntimeIdentityTransitionTerminal(input);
  const terminal = {
    ...base,
    terminal_digest: digestObject(base)
  };
  if (utf8ByteLength(terminal) >
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.terminalBytes) {
    reject('transition_terminal_too_large');
  }
  return deepFreeze(terminal);
}

function validateRuntimeIdentityTransitionTerminal(
  terminal,
  { request, receipts = [] } = {}
) {
  assertExactKeys(terminal, TERMINAL_KEYS, 'transition_terminal_shape_invalid');
  assertDigest(terminal.terminal_digest, 'transition_terminal_digest_invalid');
  const expected = createRuntimeIdentityTransitionTerminal({
    request,
    receipts,
    outcome: terminal.outcome,
    reasonCode: terminal.reason_code,
    newRuntimeIdentityDigest: terminal.new_runtime_identity_digest,
    controllerBindingDigest: terminal.controller_binding_digest,
    runtimeStopped: terminal.runtime_stopped
  });
  if (canonicalJson(terminal) !== canonicalJson(expected)) {
    reject('transition_terminal_invalid');
  }
  return terminal;
}

function createGovernedRuntimeIdentityTransitionProtocol({
  request,
  receipts,
  terminal
} = {}) {
  validateRuntimeIdentityTransitionRequest(request);
  validateRuntimeIdentityTransitionReceiptChain(request, receipts);
  validateRuntimeIdentityTransitionTerminal(terminal, { request, receipts });
  const protocol = {
    request: structuredClone(request),
    receipts: structuredClone(receipts),
    terminal: structuredClone(terminal)
  };
  if (utf8ByteLength(protocol) >
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.protocolBytes) {
    reject('transition_protocol_too_large');
  }
  return deepFreeze(protocol);
}

function validateGovernedRuntimeIdentityTransitionProtocol(protocol) {
  assertExactKeys(
    protocol,
    ['request', 'receipts', 'terminal'],
    'transition_protocol_shape_invalid'
  );
  if (utf8ByteLength(protocol) >
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.protocolBytes) {
    reject('transition_protocol_too_large');
  }
  validateRuntimeIdentityTransitionRequest(protocol.request);
  validateRuntimeIdentityTransitionReceiptChain(
    protocol.request,
    protocol.receipts
  );
  validateRuntimeIdentityTransitionTerminal(protocol.terminal, {
    request: protocol.request,
    receipts: protocol.receipts
  });
  return protocol;
}

function runtimeIdentityTransitionPreviewContextDigest({
  request,
  receipts,
  requestDigest,
  authorityContextDigest,
  expectedStoreVersion
} = {}) {
  validateRuntimeIdentityTransitionReceiptChain(request, receipts);
  assertDigest(requestDigest, 'transition_preview_request_digest_invalid');
  assertDigest(
    authorityContextDigest,
    'transition_preview_authority_context_invalid'
  );
  if (requestDigest !== runtimeIdentityTransitionRequestDigest(request) ||
      authorityContextDigest !==
        runtimeIdentityTransitionAuthorityContextDigest(request) ||
      !Number.isSafeInteger(expectedStoreVersion) || expectedStoreVersion < 0) {
    reject('transition_preview_context_invalid');
  }
  return digestObject({
    protocol: GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
    request_digest: requestDigest,
    authority_context_digest: authorityContextDigest,
    expected_store_version: expectedStoreVersion,
    receipt_digests: receipts.map(receipt => receipt.receipt_digest)
  });
}

function createRuntimeIdentityTransitionPreview({
  request,
  receipts,
  expectedStoreVersion
} = {}) {
  validateRuntimeIdentityTransitionReceiptChain(request, receipts);
  if (receipts.at(-1)?.stage !== 'TRANSITION_PREPARED' ||
      receipts.some(receipt => receipt.outcome !== 'completed')) {
    reject('transition_preview_chain_invalid');
  }
  const requestDigest = runtimeIdentityTransitionRequestDigest(request);
  const authorityContextDigest =
    runtimeIdentityTransitionAuthorityContextDigest(request);
  const base = {
    schema_version: GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION,
    protocol: GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
    request: structuredClone(request),
    receipts: structuredClone(receipts),
    request_digest: requestDigest,
    authority_context_digest: authorityContextDigest,
    expected_store_version: expectedStoreVersion
  };
  const preview = {
    ...base,
    preview_context_digest: runtimeIdentityTransitionPreviewContextDigest({
      request,
      receipts,
      requestDigest,
      authorityContextDigest,
      expectedStoreVersion
    })
  };
  if (utf8ByteLength(preview) >
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.previewBytes) {
    reject('transition_preview_too_large');
  }
  return deepFreeze(preview);
}

function validateRuntimeIdentityTransitionPreview(preview) {
  assertExactKeys(preview, PREVIEW_KEYS, 'transition_preview_shape_invalid');
  if (utf8ByteLength(preview) >
      GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS.previewBytes) {
    reject('transition_preview_too_large');
  }
  const expected = createRuntimeIdentityTransitionPreview({
    request: preview.request,
    receipts: preview.receipts,
    expectedStoreVersion: preview.expected_store_version
  });
  if (canonicalJson(preview) !== canonicalJson(expected)) {
    reject('transition_preview_invalid');
  }
  return preview;
}

function deriveTransitionRuntimeLineageDigest({ fromRuntime, toRuntime, transitionRef: ref }) {
  validateRuntimeIdentity(fromRuntime);
  validateToRuntime(toRuntime);
  if (!GOVERNED_RUNTIME_IDENTITY_TRANSITION_REF_PATTERN.test(ref || '')) {
    reject('transition_ref_invalid');
  }
  return digestObject({
    protocol: GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
    previous_lineage_digest: fromRuntime.lineage_digest,
    transition_ref: ref,
    from_identity_digest: fromRuntime.identity_digest,
    to_source_head: toRuntime.source_head,
    to_manifest_digest: toRuntime.manifest_digest,
    endpoint_identity: toRuntime.endpoint_identity,
    profile_schema: toRuntime.profile_schema
  });
}

function createTransitionRuntimeIdentity({ fromRuntime, toRuntime, transitionRef: ref }) {
  const lineageDigest = deriveTransitionRuntimeLineageDigest({
    fromRuntime,
    toRuntime,
    transitionRef: ref
  });
  const base = {
    source_head: toRuntime.source_head,
    manifest_schema: toRuntime.manifest_schema,
    manifest_digest: toRuntime.manifest_digest,
    profile_schema: toRuntime.profile_schema,
    endpoint_identity: toRuntime.endpoint_identity,
    protocol_versions: structuredClone(toRuntime.protocol_versions),
    lineage_digest: lineageDigest
  };
  const identity = {
    identity_digest: digestObject({
      protocol: GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
      identity: base
    }),
    ...base
  };
  validateRuntimeIdentity(identity);
  return deepFreeze(identity);
}

module.exports = {
  GOVERNED_RUNTIME_IDENTITY_AUTHORITY_ID_PATTERN,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_FAILURE_REGISTRY,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_LIMITS,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_NON_TERMINAL_STAGES,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_ORIGIN_BY_STAGE,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_PROTOCOL,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_REF_PATTERN,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_SCHEMA_VERSION,
  GOVERNED_RUNTIME_IDENTITY_TRANSITION_STAGES,
  appendRuntimeIdentityTransitionStage,
  createGovernedRuntimeIdentityTransitionProtocol,
  createRuntimeIdentityTransitionPreview,
  createRuntimeIdentityTransitionReceipt,
  createRuntimeIdentityTransitionRequest,
  createRuntimeIdentityTransitionTerminal,
  createTransitionRuntimeIdentity,
  deriveTransitionRuntimeLineageDigest,
  runtimeIdentityTransitionAuthorityContextDigest,
  runtimeIdentityTransitionPreviewContextDigest,
  runtimeIdentityTransitionRequestDigest,
  transitionFailureRegistryEntry,
  transitionRef,
  validateGovernedRuntimeIdentityTransitionProtocol,
  validateRuntimeIdentity,
  validateRuntimeIdentityTransitionPreview,
  validateRuntimeIdentityTransitionReceipt,
  validateRuntimeIdentityTransitionReceiptChain,
  validateRuntimeIdentityTransitionRequest,
  validateRuntimeIdentityTransitionTerminal,
  validateToRuntime
};
