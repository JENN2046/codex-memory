'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  GOVERNED_CONTEXT_RESOLUTION_FAILURE_REGISTRY,
  GOVERNED_CONTEXT_RESOLUTION_LIMITS,
  GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES,
  GOVERNED_CONTEXT_RESOLUTION_PROTOCOL,
  appendGovernedContextResolutionStage,
  canonicalJson,
  contextResolutionResponseBindingDigest,
  contextResolutionFailureRegistryEntry,
  createContextResolutionHeader,
  createContextResolutionStageReceipt,
  createContextResolutionTerminalEnvelope,
  createGovernedContextResolutionProtocol,
  createGovernedContextResolutionWorkingSet,
  digestObject,
  projectGovernedContextResolutionPublic,
  projectUnknownGovernedContextResolutionPublic,
  utf8ByteLength,
  validateContextResolutionHeader,
  validateContextResolutionStageReceipt,
  validateContextResolutionTerminalEnvelope,
  validateGovernedContextResolutionProtocol,
  validateGovernedContextResolutionPublicProjection,
  validateToolStructuredContent
} = require('../../packages/chatgpt-r4-contracts');
const {
  createGovernedContextResolutionCoordinator
} = require('../../apps/chatgpt-edge/governed-context-resolution-coordinator');
const {
  createGovernedContextResolutionObserver
} = require('../../apps/local-recall-relay/governed-context-resolution-observer');
const {
  toolDescriptors
} = require('../../apps/chatgpt-edge/candidate-tool-profile');

const NOW_MS = Date.parse('2026-07-31T14:00:00.000Z');

const FAILURE_FACTS = Object.freeze({
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

const EXPECTED_PUBLIC_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context:
    'sha256:5e978d8e56d53de05c048bd1273a028ffccc75779916ad9858e86743b4bb8fe5',
  memory_overview:
    'sha256:e4d89bb2c92a82465ecf77bc041a6a07d14eff7fcc1be34441cf39da78adf893',
  search_memory:
    'sha256:fe367042ee3029f616e4f5f96df560f1d51be4fbc568aab69fb787711a479c05',
  audit_memory:
    'sha256:a30070847cee6b1b17fb10fbd74f117d013f65516a933de8d1e034cf69e61414',
  prepare_memory_context:
    'sha256:8e480e2edbca8513015a35e0152455ccdb0ce277eba7e318e7a7b9a9588e5bdf',
  render_memory_scope:
    'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

function safeSuffix(value) {
  return String(value).replace(/[^A-Za-z0-9_-]/gu, '_')
    .padEnd(32, 'x').slice(0, 32);
}

function header(suffix = 'A', {
  nowMs = NOW_MS,
  ttlSeconds = 30,
  resolutionRef
} = {}) {
  return createContextResolutionHeader({
    resolutionRef: resolutionRef || `gcr_${safeSuffix(suffix)}`,
    requestDigest: digestObject(`context-resolution-request-${suffix}`),
    now: new Date(nowMs),
    ttlSeconds
  });
}

function workingSetBefore(value, stage) {
  let workingSet = createGovernedContextResolutionWorkingSet({
    header: value,
    receipts: []
  });
  for (const candidate of GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES) {
    if (candidate === stage) break;
    workingSet = appendGovernedContextResolutionStage(workingSet, {
      stage: candidate
    });
  }
  return workingSet;
}

function successfulProtocol(value = header('success')) {
  let workingSet = createGovernedContextResolutionWorkingSet({
    header: value,
    receipts: []
  });
  for (const stage of GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES) {
    workingSet = appendGovernedContextResolutionStage(workingSet, { stage });
  }
  const terminal = createContextResolutionTerminalEnvelope({
    header: value,
    receipts: workingSet.receipts,
    outcome: 'success',
    evidenceComplete: true
  });
  return createGovernedContextResolutionProtocol({
    header: value,
    receipts: workingSet.receipts,
    terminal
  });
}

function failedProtocol(reasonCode, value = header(reasonCode)) {
  const entry = contextResolutionFailureRegistryEntry(reasonCode);
  assert.notEqual(entry.stage, 'TERMINAL_FAILURE');
  let workingSet = workingSetBefore(value, entry.stage);
  workingSet = appendGovernedContextResolutionStage(workingSet, {
    stage: entry.stage,
    outcome: 'failed',
    reasonCode,
    facts: FAILURE_FACTS[reasonCode]
  });
  const terminal = createContextResolutionTerminalEnvelope({
    header: value,
    receipts: workingSet.receipts,
    outcome: 'failure',
    reasonCode,
    evidenceComplete: true,
    failureOrigin: entry.origin
  });
  return createGovernedContextResolutionProtocol({
    header: value,
    receipts: workingSet.receipts,
    terminal
  });
}

function rehashTerminal(value) {
  const { terminal_digest: ignored, ...base } = value;
  return {
    ...base,
    terminal_digest: digestObject(base)
  };
}

function appendCoordinatorThrough(coordinator, resolutionRef, finalStage) {
  let workingSet = coordinator.workingSet(resolutionRef);
  const finalIndex =
    GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES.indexOf(finalStage);
  for (let index = workingSet.receipts.length;
    index <= finalIndex;
    index += 1) {
    const stage = GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES[index];
    const receipt = createContextResolutionStageReceipt({
      header: workingSet.header,
      receipts: workingSet.receipts,
      stage
    });
    coordinator.appendReceipt(resolutionRef, receipt);
    workingSet = coordinator.workingSet(resolutionRef);
  }
  return workingSet;
}

function commitCoordinatorSuccess(coordinator, value) {
  coordinator.acceptResolution(value);
  const workingSet = appendCoordinatorThrough(
    coordinator,
    value.resolution_ref,
    'RESPONSE_FINALIZED'
  );
  const terminal = createContextResolutionTerminalEnvelope({
    header: value,
    receipts: workingSet.receipts,
    outcome: 'success',
    evidenceComplete: true
  });
  const publicResolution = projectGovernedContextResolutionPublic({
    header: value,
    receipts: workingSet.receipts,
    terminal
  });
  const structuredContentDigest = digestObject({
    context_status: 'resolved',
    resolution: publicResolution
  });
  coordinator.recordResponseVerification(value.resolution_ref, {
    terminal_digest: terminal.terminal_digest,
    public_content_digest: structuredContentDigest,
    relay_binding_digest: contextResolutionResponseBindingDigest({
      requestDigest: value.request_digest,
      resolutionRef: value.resolution_ref,
      terminalDigest: terminal.terminal_digest,
      structuredContentDigest
    }),
    public_resolution: publicResolution
  });
  return coordinator.commitTerminal(value.resolution_ref, terminal);
}

test('ResolutionHeader is immutable, bounded, and distinct from a read attempt', () => {
  const value = header('header');
  assert.equal(value.protocol, GOVERNED_CONTEXT_RESOLUTION_PROTOCOL);
  assert.equal(value.operation, 'resolve_memory_context');
  assert.match(value.resolution_ref, /^gcr_[A-Za-z0-9_-]{24,96}$/u);
  assert.equal(Object.hasOwn(value, 'attempt_ref'), false);
  assert.equal(Object.hasOwn(value, 'state'), false);
  assert.equal(Object.hasOwn(value, 'current_stage'), false);
  assert.ok(
    utf8ByteLength(value) <= GOVERNED_CONTEXT_RESOLUTION_LIMITS.headerBytes
  );
  assert.ok(Object.isFrozen(value));
  assert.throws(() => {
    value.resolution_ref = `gcr_${'Z'.repeat(32)}`;
  }, TypeError);
  assert.equal(validateContextResolutionHeader(value), value);
});

test('complete success proves context issuance and forbids read-attempt or counter claims', () => {
  const protocol = successfulProtocol();
  validateGovernedContextResolutionProtocol(protocol);
  assert.deepEqual(
    protocol.receipts.map(receipt => receipt.stage),
    GOVERNED_CONTEXT_RESOLUTION_NON_TERMINAL_STAGES
  );
  assert.equal(protocol.terminal.outcome, 'success');
  assert.equal(protocol.terminal.last_completed_stage, 'RESPONSE_FINALIZED');
  assert.equal(protocol.terminal.failed_stage, null);
  assert.equal(protocol.terminal.reason_code, null);
  assert.equal(protocol.terminal.failure_category, null);
  assert.equal(protocol.terminal.failure_origin, null);
  assert.equal(protocol.terminal.evidence_complete, true);
  assert.equal(protocol.terminal.mapping_resolved, true);
  assert.equal(protocol.terminal.scope_resolved, true);
  assert.equal(protocol.terminal.context_ref_issued, true);
  assert.equal(protocol.terminal.context_ref_shape_valid, true);
  assert.equal(protocol.terminal.context_ref_unexpired, true);
  assert.equal(protocol.terminal.context_ref_entered_response, true);
  assert.equal(protocol.terminal.context_ref_delivered, true);
  assert.equal(protocol.terminal.read_attempt_created, false);
  for (const forbidden of [
    'attempt_ref', 'counters', 'provider', 'native_invocation',
    'derived_transaction', 'fallback'
  ]) {
    assert.equal(Object.hasOwn(protocol.terminal, forbidden), false);
  }
  assert.ok(
    utf8ByteLength(protocol.terminal) <=
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.terminalBytes
  );
  assert.ok(
    utf8ByteLength(protocol) <=
      GOVERNED_CONTEXT_RESOLUTION_LIMITS.protocolBytes
  );
});

test('every registered stage failure derives one exact canonical terminal', () => {
  for (const [reasonCode, entry] of Object.entries(
    GOVERNED_CONTEXT_RESOLUTION_FAILURE_REGISTRY
  )) {
    if (entry.stage === 'TERMINAL_FAILURE') continue;
    const protocol = failedProtocol(reasonCode);
    assert.equal(protocol.terminal.outcome, 'failure', reasonCode);
    assert.equal(protocol.terminal.failed_stage, entry.stage, reasonCode);
    assert.equal(protocol.terminal.reason_code, reasonCode);
    assert.equal(protocol.terminal.failure_category, entry.category);
    assert.equal(protocol.terminal.failure_origin, entry.origin);
    assert.equal(protocol.terminal.fallback_policy, 'forbidden');
    assert.equal(protocol.terminal.evidence_complete, true);
    assert.equal(protocol.terminal.read_attempt_created, false);
    validateGovernedContextResolutionProtocol(protocol);
  }
});

test('issuance unavailable matches the minimal failure terminal without inventing facts', () => {
  const protocol = failedProtocol('context_issuance_unavailable');
  assert.equal(protocol.terminal.last_completed_stage, 'SCOPE_RESOLVED');
  assert.equal(protocol.terminal.failed_stage, 'CONTEXT_ISSUED');
  assert.equal(protocol.terminal.reason_code, 'context_issuance_unavailable');
  assert.equal(protocol.terminal.failure_category, 'context_issuance_failed');
  assert.equal(protocol.terminal.failure_origin, 'governance');
  assert.equal(protocol.terminal.mapping_resolved, true);
  assert.equal(protocol.terminal.scope_resolved, true);
  assert.equal(protocol.terminal.context_ref_issued, false);
  assert.equal(protocol.terminal.context_ref_shape_valid, null);
  assert.equal(protocol.terminal.context_ref_unexpired, null);
  assert.equal(protocol.terminal.read_attempt_created, false);
});

test('missing issuance evidence remains unknown and never becomes false', () => {
  const genericFailure = failedProtocol('context_issue_result_invalid');
  assert.equal(genericFailure.terminal.context_ref_issued, null);
  assert.equal(genericFailure.terminal.context_ref_shape_valid, null);
  assert.equal(genericFailure.terminal.context_ref_unexpired, null);
  assert.equal(genericFailure.terminal.evidence_complete, true);

  const value = header('timeout-unknown');
  const beforeIssuance = workingSetBefore(value, 'CONTEXT_ISSUED');
  const timeout = createContextResolutionTerminalEnvelope({
    header: value,
    receipts: beforeIssuance.receipts,
    outcome: 'failure',
    reasonCode: 'resolution_timeout',
    evidenceComplete: false,
    failureOrigin: 'edge_broker'
  });
  assert.equal(timeout.context_ref_issued, null);
  assert.equal(timeout.context_ref_shape_valid, null);
  assert.equal(timeout.context_ref_unexpired, null);

  assert.throws(() => createContextResolutionTerminalEnvelope({
    header: value,
    receipts: beforeIssuance.receipts,
    outcome: 'failure',
    reasonCode: 'context_issuance_unavailable',
    evidenceComplete: true,
    failureOrigin: 'governance'
  }), { code: 'context_resolution_terminal_failure_receipt_missing' });

  assert.throws(() => appendGovernedContextResolutionStage(
    beforeIssuance,
    {
      stage: 'CONTEXT_ISSUED',
      outcome: 'failed',
      reasonCode: 'context_issue_result_invalid',
      facts: { context_ref_issued: false }
    }
  ), { code: 'context_resolution_facts_invalid' });
});

test('public resolver projections preserve canonical facts and never invent unknown reasons', () => {
  const success = successfulProtocol(header('public-success'));
  const successProjection = projectGovernedContextResolutionPublic(success);
  assert.deepEqual(successProjection, {
    protocol: GOVERNED_CONTEXT_RESOLUTION_PROTOCOL,
    outcome: 'success',
    last_completed_stage: 'RESPONSE_FINALIZED',
    failed_stage: null,
    reason_code: null,
    failure_category: null,
    failure_origin: null,
    context_ref_issued: true,
    context_ref_entered_response: true,
    context_ref_delivered: true,
    evidence_complete: true
  });
  assert.equal(Object.hasOwn(successProjection, 'resolution_ref'), false);
  assert.equal(Object.hasOwn(successProjection, 'terminal_digest'), false);
  validateGovernedContextResolutionPublicProjection(successProjection);

  const finalized = failedProtocol(
    'context_response_finalization_failed',
    header('public-finalization')
  );
  const finalizedProjection = projectGovernedContextResolutionPublic(finalized);
  assert.equal(finalizedProjection.context_ref_issued, true);
  assert.equal(finalizedProjection.context_ref_entered_response, false);
  assert.equal(finalizedProjection.context_ref_delivered, false);
  assert.equal(finalizedProjection.failed_stage, 'RESPONSE_FINALIZED');
  assert.equal(finalizedProjection.reason_code,
    'context_response_finalization_failed');
  validateGovernedContextResolutionPublicProjection(finalizedProjection);

  const unknown = projectUnknownGovernedContextResolutionPublic();
  assert.deepEqual(unknown, {
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
  validateGovernedContextResolutionPublicProjection(unknown);
  assert.throws(() => validateGovernedContextResolutionPublicProjection({
    ...unknown,
    reason_code: 'context_issuance_unavailable'
  }), { code: 'context_resolution_public_projection_unknown_invalid' });
  assert.throws(() => validateGovernedContextResolutionPublicProjection({
    ...unknown,
    context_ref_entered_response: true
  }), { code: 'context_resolution_public_projection_unknown_invalid' });
  assert.throws(() => validateGovernedContextResolutionPublicProjection({
    ...unknown,
    context_ref_delivered: true
  }), { code: 'context_resolution_public_projection_unknown_invalid' });
  assert.throws(() => validateGovernedContextResolutionPublicProjection({
    ...finalizedProjection,
    context_ref_delivered: true
  }), { code: 'context_resolution_public_projection_delivery_invalid' });

  const requestDigest = digestObject('public-projection-request');
  const structuredContentDigest = digestObject(successProjection);
  const binding = contextResolutionResponseBindingDigest({
    requestDigest,
    resolutionRef: success.header.resolution_ref,
    terminalDigest: success.terminal.terminal_digest,
    structuredContentDigest
  });
  assert.notEqual(binding, contextResolutionResponseBindingDigest({
    requestDigest: digestObject('other-request'),
    resolutionRef: success.header.resolution_ref,
    terminalDigest: success.terminal.terminal_digest,
    structuredContentDigest
  }));
  assert.notEqual(binding, contextResolutionResponseBindingDigest({
    requestDigest,
    resolutionRef: header('other-resolution').resolution_ref,
    terminalDigest: success.terminal.terminal_digest,
    structuredContentDigest
  }));
  assert.notEqual(binding, contextResolutionResponseBindingDigest({
    requestDigest,
    resolutionRef: success.header.resolution_ref,
    terminalDigest: finalized.terminal.terminal_digest,
    structuredContentDigest
  }));
  assert.notEqual(binding, contextResolutionResponseBindingDigest({
    requestDigest,
    resolutionRef: success.header.resolution_ref,
    terminalDigest: success.terminal.terminal_digest,
    structuredContentDigest: digestObject(finalizedProjection)
  }));

  assert.throws(() => validateToolStructuredContent(
    'resolve_memory_context',
    {
      schema_version: 2,
      context_status: 'denied'
    },
    { status: 'denied' }
  ), { code: 'response_structured_content_shape_invalid' });
  assert.throws(() => validateToolStructuredContent(
    'resolve_memory_context',
    {
      schema_version: 1,
      context_status: 'denied'
    },
    { status: 'denied' }
  ), { code: 'response_data_schema_version_invalid' });
});

test('receipts from different resolver requests cannot be spliced', () => {
  const firstHeader = header('splice-A');
  const firstCreated = createContextResolutionStageReceipt({
    header: firstHeader,
    receipts: [],
    stage: 'CREATED'
  });
  const secondHeader = header('splice-B');
  assert.throws(() => validateContextResolutionStageReceipt(firstCreated, {
    header: secondHeader,
    receipts: []
  }), { code: 'context_resolution_ref_mismatch' });

  const sameRefDifferentRequest = header('splice-C', {
    resolutionRef: firstHeader.resolution_ref
  });
  assert.throws(() => validateContextResolutionStageReceipt(firstCreated, {
    header: sameRefDifferentRequest,
    receipts: []
  }), { code: 'context_resolution_receipt_chain_mismatch' });
});

test('receipt validation rejects sequence drift, stage drift, tamper, and oversize', () => {
  const value = header('receipt-attacks');
  const created = createContextResolutionStageReceipt({
    header: value,
    receipts: [],
    stage: 'CREATED'
  });
  const edge = createContextResolutionStageReceipt({
    header: value,
    receipts: [created],
    stage: 'EDGE_VALIDATED'
  });

  const duplicateBase = {
    ...edge,
    sequence: 0
  };
  const duplicate = rehashReceipt(duplicateBase);
  assert.throws(() => validateContextResolutionStageReceipt(duplicate, {
    header: value,
    receipts: [created]
  }), { code: 'context_resolution_receipt_sequence_duplicate' });

  const gap = rehashReceipt({ ...edge, sequence: 2 });
  assert.throws(() => validateContextResolutionStageReceipt(gap, {
    header: value,
    receipts: [created]
  }), { code: 'context_resolution_receipt_sequence_gap' });

  const regression = rehashReceipt({ ...edge, stage: 'CREATED' });
  assert.throws(() => validateContextResolutionStageReceipt(regression, {
    header: value,
    receipts: [created]
  }), { code: 'context_resolution_receipt_stage_regression' });

  assert.throws(() => validateContextResolutionStageReceipt({
    ...edge,
    receipt_digest: digestObject('tampered')
  }, {
    header: value,
    receipts: [created]
  }), { code: 'context_resolution_receipt_digest_invalid' });

  assert.throws(() => validateContextResolutionStageReceipt({
    ...edge,
    origin: 'x'.repeat(1500)
  }, {
    header: value,
    receipts: [created]
  }), { code: 'context_resolution_receipt_too_large' });
});

function rehashReceipt(value) {
  const { receipt_digest: ignored, ...base } = value;
  return {
    ...base,
    receipt_digest: digestObject(base)
  };
}

test('denied cannot become unavailable and coded failures cannot collapse to unknown status', () => {
  const denied = failedProtocol('context_scope_denied');
  assert.equal(denied.terminal.reason_code, 'context_scope_denied');
  assert.equal(denied.terminal.failure_category, 'context_scope_denied');
  assert.equal(Object.hasOwn(denied.terminal, 'status'), false);

  const relabelled = rehashTerminal({
    ...denied.terminal,
    reason_code: 'context_issuance_unavailable',
    failure_category: 'context_issuance_failed',
    failed_stage: 'CONTEXT_ISSUED'
  });
  assert.throws(() => validateContextResolutionTerminalEnvelope(relabelled, {
    header: denied.header,
    receipts: denied.receipts
  }), { code: 'context_resolution_terminal_reason_binding_invalid' });

  const statusOnly = { ...denied.terminal, status: 'unavailable' };
  delete statusOnly.reason_code;
  delete statusOnly.failure_category;
  delete statusOnly.failure_origin;
  assert.throws(() => validateContextResolutionTerminalEnvelope(statusOnly, {
    header: denied.header,
    receipts: denied.receipts
  }), { code: 'context_resolution_terminal_shape_invalid' });

  assert.throws(() => contextResolutionFailureRegistryEntry(
    'context_unknown_failure'
  ), { code: 'context_resolution_reason_unknown' });
  assert.equal(
    GOVERNED_CONTEXT_RESOLUTION_FAILURE_REGISTRY.terminal_missing
      .terminal_candidate_allowed,
    false
  );
});

test('an expired or malformed context ref can form only a failure terminal', () => {
  const expired = failedProtocol('context_ref_expired');
  assert.equal(expired.terminal.outcome, 'failure');
  assert.equal(expired.terminal.context_ref_issued, true);
  assert.equal(expired.terminal.context_ref_shape_valid, true);
  assert.equal(expired.terminal.context_ref_unexpired, false);

  const malformed = failedProtocol('context_ref_invalid');
  assert.equal(malformed.terminal.context_ref_issued, true);
  assert.equal(malformed.terminal.context_ref_shape_valid, false);
  assert.equal(malformed.terminal.context_ref_unexpired, null);

  const beforeContext = workingSetBefore(header('false-success'), 'CONTEXT_ISSUED');
  assert.throws(() => appendGovernedContextResolutionStage(beforeContext, {
    stage: 'CONTEXT_ISSUED',
    outcome: 'completed',
    facts: {
      context_ref_issued: true,
      context_ref_shape_valid: true,
      context_ref_unexpired: false
    }
  }), { code: 'context_resolution_facts_invalid' });

  const success = successfulProtocol(header('mutated-success'));
  const mutated = rehashTerminal({
    ...success.terminal,
    context_ref_unexpired: false
  });
  assert.throws(() => validateContextResolutionTerminalEnvelope(mutated, {
    header: success.header,
    receipts: success.receipts
  }), { code: 'context_resolution_terminal_invalid' });
});

test('resolver terminals and receipts reject provider/native/derived fake counters', () => {
  const success = successfulProtocol(header('fake-counters'));
  const withCounters = rehashTerminal({
    ...success.terminal,
    counters: {
      provider: { started: 0, succeeded: 0, failed: 0 }
    }
  });
  assert.throws(() => validateContextResolutionTerminalEnvelope(withCounters, {
    header: success.header,
    receipts: success.receipts
  }), { code: 'context_resolution_terminal_shape_invalid' });

  const readAttempt = rehashTerminal({
    ...success.terminal,
    read_attempt_created: true
  });
  assert.throws(() => validateContextResolutionTerminalEnvelope(readAttempt, {
    header: success.header,
    receipts: success.receipts
  }), { code: 'context_resolution_read_attempt_forbidden' });

  const beforeRegistry = workingSetBefore(
    header('fake-receipt-counter'),
    'REGISTRY_RESOLVED'
  );
  assert.throws(() => appendGovernedContextResolutionStage(beforeRegistry, {
    stage: 'REGISTRY_RESOLVED',
    facts: {
      registry_resolved: true,
      mapping_resolved: true,
      provider_started: false
    }
  }), { code: 'context_resolution_facts_invalid' });
});

test('Edge CAS is first-terminal-wins and rejects a late success', () => {
  const events = [];
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    eventSink: event => events.push(event)
  });
  const value = header('first-terminal');
  coordinator.acceptResolution(value);
  let workingSet = appendCoordinatorThrough(
    coordinator,
    value.resolution_ref,
    'SCOPE_RESOLVED'
  );
  const failedReceipt = createContextResolutionStageReceipt({
    header: value,
    receipts: workingSet.receipts,
    stage: 'CONTEXT_ISSUED',
    outcome: 'failed',
    reasonCode: 'context_issuance_unavailable',
    facts: { context_ref_issued: false }
  });
  coordinator.appendReceipt(value.resolution_ref, failedReceipt);
  workingSet = coordinator.workingSet(value.resolution_ref);
  const failure = createContextResolutionTerminalEnvelope({
    header: value,
    receipts: workingSet.receipts,
    outcome: 'failure',
    reasonCode: 'context_issuance_unavailable',
    evidenceComplete: true,
    failureOrigin: 'governance'
  });
  coordinator.commitTerminal(value.resolution_ref, failure);

  const lateSuccess = successfulProtocol(value).terminal;
  assert.throws(() => coordinator.commitTerminal(
    value.resolution_ref,
    lateSuccess
  ), { code: 'context_resolution_terminal_already_committed' });
  assert.throws(() => coordinator.appendReceipt(
    value.resolution_ref,
    successfulProtocol(value).receipts.at(-1)
  ), { code: 'context_resolution_terminal_already_committed' });
  assert.equal(
    coordinator.protocol(value.resolution_ref).terminal.outcome,
    'failure'
  );
  assert.equal(
    events.filter(event =>
      event.event === 'resolution_terminal_committed').length,
    1
  );
  assert.equal(
    events.filter(event =>
      event.event === 'resolution_terminal_rejected').length,
    1
  );
});

test('Edge refuses an unverified success terminal without mutating its receipt prefix', () => {
  const events = [];
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    eventSink: event => events.push(event)
  });
  const value = header('unverified-success');
  coordinator.acceptResolution(value);
  const candidate = successfulProtocol(value);
  const before = coordinator.workingSet(value.resolution_ref);

  assert.throws(() => coordinator.commitProtocolCandidate(
    value.resolution_ref,
    candidate
  ), { code: 'context_resolution_response_evidence_missing' });
  assert.deepEqual(
    coordinator.workingSet(value.resolution_ref),
    before
  );
  assert.equal(
    events.some(event => event.event === 'resolution_terminal_committed'),
    false
  );

  const publicResolution = projectGovernedContextResolutionPublic(candidate);
  const publicContentDigest = digestObject({
    context_status: 'resolved',
    resolution: publicResolution
  });
  coordinator.recordResponseVerification(value.resolution_ref, {
    terminal_digest: candidate.terminal.terminal_digest,
    public_content_digest: publicContentDigest,
    relay_binding_digest: contextResolutionResponseBindingDigest({
      requestDigest: value.request_digest,
      resolutionRef: value.resolution_ref,
      terminalDigest: candidate.terminal.terminal_digest,
      structuredContentDigest: publicContentDigest
    }),
    public_resolution: publicResolution
  });
  assert.equal(coordinator.commitProtocolCandidate(
    value.resolution_ref,
    candidate
  ).accepted, true);
});

test('Observer rejects a success terminal that lacks edge response verification', () => {
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(NOW_MS)
  });
  const protocol = successfulProtocol(header('observer-unverified-success'));
  assert.equal(observer.observe({
    component: 'governed_context_resolution_coordinator',
    event: 'resolution_accepted',
    header: protocol.header,
    accepted_at_ms: NOW_MS
  }), true);
  for (const receipt of protocol.receipts) {
    assert.equal(observer.observe({
      component: 'governed_context_resolution_coordinator',
      event: 'resolution_receipt_appended',
      resolution_ref: protocol.header.resolution_ref,
      receipt
    }), true);
  }
  assert.equal(observer.observe({
    component: 'governed_context_resolution_coordinator',
    event: 'resolution_terminal_committed',
    resolution_ref: protocol.header.resolution_ref,
    terminal: protocol.terminal,
    response_verified: false
  }), false);
  assert.equal(observer.snapshot().terminal_successes, 0);
  assert.equal(
    observer.snapshot().last_violation_code,
    'context_resolution_observer_response_evidence_missing'
  );
});

test('Edge cancellation wins over a later resolver failure candidate', () => {
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS)
  });
  const value = header('cancel-over-failure');
  coordinator.acceptResolution(value);
  coordinator.cancelResolution(value.resolution_ref);
  const lateFailure = failedProtocol(
    'context_issuance_unavailable',
    value
  );
  assert.throws(() => coordinator.commitProtocolCandidate(
    value.resolution_ref,
    lateFailure
  ), { code: 'context_resolution_terminal_already_committed' });
  assert.equal(
    coordinator.protocol(value.resolution_ref).terminal.reason_code,
    'resolution_cancelled'
  );
});

test('Edge coordinator capacity is reusable across cancel, timeout, and success', () => {
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    maxResolutions: 1,
    maxRetainedResolutions: 8
  });
  const cancelled = header('capacity-cancel');
  coordinator.acceptResolution(cancelled);
  coordinator.cancelResolution(cancelled.resolution_ref);

  const timedOut = header('capacity-timeout');
  coordinator.acceptResolution(timedOut);
  coordinator.timeoutResolution(timedOut.resolution_ref);

  const completed = header('capacity-success');
  commitCoordinatorSuccess(coordinator, completed);

  const reusable = header('capacity-reused');
  assert.doesNotThrow(() => coordinator.acceptResolution(reusable));
  assert.equal(
    coordinator.snapshot(reusable.resolution_ref).terminal_committed,
    false
  );
});

test('Edge active capacity remains reusable after more than 64 lifetime resolutions', () => {
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    maxRetainedResolutions: 128
  });

  for (let index = 0; index < 65; index += 1) {
    const value = header(`lifetime-${index}`);
    coordinator.acceptResolution(value);
    coordinator.cancelResolution(value.resolution_ref);
  }

  const reusable = header('lifetime-after-default-capacity');
  assert.doesNotThrow(() => coordinator.acceptResolution(reusable));
  assert.equal(
    coordinator.snapshot(reusable.resolution_ref).terminal_committed,
    false
  );
});

test('Edge retains a replay tombstone after terminal payload eviction', () => {
  let currentMs = NOW_MS;
  const events = [];
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(currentMs),
    maxResolutions: 1,
    maxRetainedResolutions: 1,
    terminalRetentionMs: 10,
    eventSink: event => events.push(event)
  });
  const value = header('replay-after-terminal-eviction', { ttlSeconds: 1 });
  commitCoordinatorSuccess(coordinator, value);

  currentMs += 10;
  assert.throws(() => coordinator.acceptResolution(value), {
    code: 'context_resolution_ref_replay'
  });
  assert.throws(() => coordinator.snapshot(value.resolution_ref), {
    code: 'context_resolution_not_found'
  });
  assert.equal(events.filter(event =>
    event.event === 'resolution_accepted').length, 1);

  currentMs = Date.parse(value.deadline_at);
  assert.throws(() => coordinator.acceptResolution(value), {
    code: 'context_resolution_deadline_expired'
  });
});

test('Edge reuses retained capacity immediately after terminal closure', () => {
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    maxResolutions: 1,
    maxRetainedResolutions: 1
  });
  const completed = header('retained-capacity-completed');
  commitCoordinatorSuccess(coordinator, completed);

  const reusable = header('retained-capacity-reused');
  assert.doesNotThrow(() => coordinator.acceptResolution(reusable));
  assert.throws(() => coordinator.snapshot(completed.resolution_ref), {
    code: 'context_resolution_not_found'
  });
  assert.throws(() => coordinator.acceptResolution(completed), {
    code: 'context_resolution_ref_replay'
  });
});

test('Edge replay tombstone capacity is reusable after delivery grace', () => {
  let currentMs = NOW_MS;
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(currentMs),
    maxResolutions: 1,
    maxRetainedResolutions: 1,
    maxReplayTombstones: 1,
    terminalRetentionMs: 10
  });
  const completed = header('bounded-replay-tombstone', { ttlSeconds: 1 });
  commitCoordinatorSuccess(coordinator, completed);

  currentMs = Date.parse(completed.deadline_at);
  const blocked = header('replay-tombstone-capacity-blocked', {
    nowMs: currentMs
  });
  assert.throws(() => coordinator.acceptResolution(blocked), {
    code: 'context_resolution_coordinator_tombstone_capacity_exceeded'
  });

  currentMs = Date.parse(completed.deadline_at) +
    GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds * 1000;
  const reusable = header('replay-tombstone-capacity-reused', {
    nowMs: currentMs
  });
  assert.doesNotThrow(() => coordinator.acceptResolution(reusable));
});

test('deadline wins over a success candidate validated at the boundary', () => {
  let currentMs = NOW_MS;
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(currentMs)
  });
  const value = header('deadline', { ttlSeconds: 1 });
  coordinator.acceptResolution(value);
  const success = successfulProtocol(value);
  currentMs = Date.parse(value.deadline_at);
  assert.throws(() => coordinator.commitProtocolCandidate(
    value.resolution_ref,
    success
  ), { code: 'context_resolution_terminal_already_committed' });
  const accepted = coordinator.protocol(value.resolution_ref);
  assert.equal(accepted.terminal.outcome, 'failure');
  assert.equal(accepted.terminal.reason_code, 'resolution_timeout');
  assert.equal(accepted.terminal.evidence_complete, false);
  assert.equal(accepted.terminal.context_ref_issued, null);
});

test('Edge preserves a candidate finalized before the deadline while appending its receipt prefix', () => {
  const value = header('candidate-finalization-deadline', { ttlSeconds: 1 });
  const deadlineMs = Date.parse(value.deadline_at);
  let boundaryReads = null;
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => {
      if (boundaryReads === null) return new Date(NOW_MS);
      boundaryReads += 1;
      return new Date(boundaryReads <= 2 ? deadlineMs - 1 : deadlineMs);
    }
  });
  coordinator.acceptResolution(value);
  const candidate = failedProtocol('context_mapping_not_found', value);

  boundaryReads = 0;
  const accepted = coordinator.commitProtocolCandidate(
    value.resolution_ref,
    candidate
  );
  assert.equal(accepted.accepted, true);
  const protocol = coordinator.protocol(value.resolution_ref);
  assert.equal(protocol.terminal.reason_code, 'context_mapping_not_found');
  assert.equal(protocol.receipts.length, candidate.receipts.length);
  assert.equal(coordinator.snapshot(value.resolution_ref).terminal_committed, true);
});

test('deadline wins when failed receipt validation crosses the boundary', () => {
  const value = header('receipt-validation-deadline', { ttlSeconds: 1 });
  const deadlineMs = Date.parse(value.deadline_at);
  let boundaryReads = null;
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(deadlineMs)
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => {
      if (boundaryReads === null) return new Date(NOW_MS);
      boundaryReads += 1;
      return new Date(boundaryReads === 1 ? deadlineMs - 1 : deadlineMs);
    },
    eventSink: event => observer.observe(event)
  });
  coordinator.acceptResolution(value);
  const workingSet = coordinator.workingSet(value.resolution_ref);
  const failedReceipt = createContextResolutionStageReceipt({
    header: value,
    receipts: workingSet.receipts,
    stage: 'EDGE_VALIDATED',
    outcome: 'failed',
    reasonCode: 'resolution_edge_request_invalid'
  });

  boundaryReads = 0;
  assert.throws(() => coordinator.appendReceipt(
    value.resolution_ref,
    failedReceipt
  ), { code: 'context_resolution_receipt_after_deadline' });

  const terminal = coordinator.protocol(value.resolution_ref).terminal;
  assert.equal(terminal.reason_code, 'resolution_timeout');
  assert.equal(terminal.receipt_count, 1);
  assert.equal(observer.snapshot().receipts_accepted, 1);
  assert.equal(observer.snapshot().terminal_failures, 1);
  assert.equal(observer.snapshot().protocol_violations, 0);
});

test('Observer validates the chain and records missing terminal without fabrication', () => {
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(NOW_MS)
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    eventSink: event => observer.observe(event)
  });
  const success = header('observer-success');
  commitCoordinatorSuccess(coordinator, success);
  assert.throws(() => coordinator.commitTerminal(
    success.resolution_ref,
    successfulProtocol(success).terminal
  ), { code: 'context_resolution_terminal_already_committed' });

  const missing = header('observer-missing');
  coordinator.acceptResolution(missing);
  const loss = coordinator.reportCoordinatorLoss();
  assert.deepEqual(loss, {
    active_resolutions_lost: 1,
    terminals_fabricated: 0
  });
  assert.throws(() => coordinator.acceptResolution(missing), {
    code: 'context_resolution_coordinator_lost'
  });
  assert.throws(() => coordinator.acceptResolution(
    header('observer-fresh-after-loss')
  ), { code: 'context_resolution_coordinator_lost' });
  const snapshot = observer.snapshot();
  assert.equal(snapshot.resolutions_accepted, 2);
  assert.equal(snapshot.terminal_successes, 1);
  assert.equal(snapshot.terminal_failures, 0);
  assert.equal(snapshot.terminals_rejected, 1);
  assert.equal(snapshot.terminals_missing, 1);
  assert.equal(snapshot.protocol_violations, 1);
  assert.equal(snapshot.last_violation_code, 'terminal_missing');
  assert.equal(snapshot.terminals_fabricated, 0);
  assert.equal(snapshot.resolution_identifiers_retained_in_projection, false);
  assert.equal(snapshot.context_references_retained, false);
  assert.equal(snapshot.provider_counts_inferred, false);
  assert.equal(snapshot.native_counts_inferred, false);
});

test('Edge preserves Observer event order for a promise-returning sink', async () => {
  let currentMs = NOW_MS;
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(currentMs)
  });
  const delivered = [];
  let releaseAccepted;
  const acceptedBarrier = new Promise(resolve => {
    releaseAccepted = resolve;
  });
  let resolveTerminal;
  const terminalDelivered = new Promise(resolve => {
    resolveTerminal = resolve;
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(currentMs),
    eventSink: async event => {
      if (event.event === 'resolution_accepted') {
        await acceptedBarrier;
      }
      delivered.push(event.event);
      assert.equal(observer.observe(event), true);
      if (event.event === 'resolution_terminal_committed') {
        resolveTerminal();
      }
    }
  });
  const value = header('observer-async-order', { ttlSeconds: 1 });

  commitCoordinatorSuccess(coordinator, value);
  await Promise.resolve();
  assert.deepEqual(delivered, []);
  currentMs = Date.parse(value.deadline_at);
  releaseAccepted();
  await terminalDelivered;

  assert.deepEqual(delivered, [
    'resolution_accepted',
    ...Array(7).fill('resolution_receipt_appended'),
    'resolution_response_verified',
    'resolution_terminal_committed'
  ]);
  const snapshot = observer.snapshot();
  assert.equal(snapshot.resolutions_accepted, 1);
  assert.equal(snapshot.receipts_accepted, 7);
  assert.equal(snapshot.response_verifications_accepted, 1);
  assert.equal(snapshot.terminal_successes, 1);
  assert.equal(snapshot.protocol_violations, 0);
});

test('Edge bounds events queued behind a stalled promise-returning sink', async () => {
  const delivered = [];
  let releaseFirst;
  const firstBarrier = new Promise(resolve => {
    releaseFirst = resolve;
  });
  let resolveSecond;
  const secondDelivered = new Promise(resolve => {
    resolveSecond = resolve;
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    maxPendingObserverEvents: 2,
    eventSink: async event => {
      delivered.push(event.event);
      if (delivered.length === 1) await firstBarrier;
      if (delivered.length === 2) resolveSecond();
    }
  });

  commitCoordinatorSuccess(coordinator, header('observer-stalled-queue'));
  await Promise.resolve();
  assert.deepEqual(delivered, ['resolution_accepted']);
  assert.deepEqual(coordinator.observerDeliverySnapshot(), {
    event_sink_configured: true,
    max_pending_events: 2,
    pending_events: 2,
    dropped_events: 8,
    delivery_compromised: true
  });
  assert.throws(() => coordinator.acceptResolution(
    header('observer-admission-after-drop')
  ), { code: 'context_resolution_observer_delivery_incomplete' });

  releaseFirst();
  await secondDelivered;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(delivered, [
    'resolution_accepted',
    'resolution_receipt_appended'
  ]);
  assert.equal(
    coordinator.observerDeliverySnapshot().pending_events,
    0
  );
});

test('Edge fails closed after a promise-returning Observer sink rejects', async () => {
  const delivered = [];
  let resolveTerminal;
  const terminalDelivered = new Promise(resolve => {
    resolveTerminal = resolve;
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    eventSink: async event => {
      delivered.push(event.event);
      if (event.event === 'resolution_accepted') {
        throw new Error('synthetic observer transport rejection');
      }
      if (event.event === 'resolution_terminal_committed') {
        resolveTerminal();
      }
    }
  });

  commitCoordinatorSuccess(coordinator, header('observer-rejected-delivery'));
  await terminalDelivered;
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(delivered, [
    'resolution_accepted',
    ...Array(7).fill('resolution_receipt_appended'),
    'resolution_response_verified',
    'resolution_terminal_committed'
  ]);
  assert.deepEqual(coordinator.observerDeliverySnapshot(), {
    event_sink_configured: true,
    max_pending_events: 256,
    pending_events: 0,
    dropped_events: 1,
    delivery_compromised: true
  });
  assert.throws(() => coordinator.acceptResolution(
    header('observer-admission-after-rejection')
  ), { code: 'context_resolution_observer_delivery_incomplete' });
});

test('Edge treats synchronous Observer false as delivery loss', () => {
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(NOW_MS),
    maxRetainedResolutions: 1
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    maxResolutions: 2,
    eventSink: event => observer.observe(event)
  });

  coordinator.acceptResolution(header('observer-active-capacity-one'));
  coordinator.acceptResolution(header('observer-active-capacity-two'));

  assert.deepEqual(coordinator.observerDeliverySnapshot(), {
    event_sink_configured: true,
    max_pending_events: 256,
    pending_events: 0,
    dropped_events: 2,
    delivery_compromised: true
  });
  assert.throws(() => coordinator.acceptResolution(
    header('observer-admission-after-sync-false')
  ), { code: 'context_resolution_observer_delivery_incomplete' });
});

test('Edge treats promise-resolved Observer false as delivery loss', async () => {
  let resolveTerminal;
  const terminalDelivered = new Promise(resolve => {
    resolveTerminal = resolve;
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    eventSink: async event => {
      if (event.event === 'resolution_terminal_committed') {
        resolveTerminal();
      }
      return event.event !== 'resolution_accepted';
    }
  });

  commitCoordinatorSuccess(coordinator, header('observer-async-false'));
  await terminalDelivered;
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(coordinator.observerDeliverySnapshot(), {
    event_sink_configured: true,
    max_pending_events: 256,
    pending_events: 0,
    dropped_events: 1,
    delivery_compromised: true
  });
  assert.throws(() => coordinator.acceptResolution(
    header('observer-admission-after-async-false')
  ), { code: 'context_resolution_observer_delivery_incomplete' });
});

test('Edge counts a queued synchronous Observer refusal exactly once', async () => {
  let releaseAccepted;
  const acceptedBarrier = new Promise(resolve => {
    releaseAccepted = resolve;
  });
  let resolveReceipt;
  const receiptDelivered = new Promise(resolve => {
    resolveReceipt = resolve;
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    eventSink: event => {
      if (event.event === 'resolution_accepted') return acceptedBarrier;
      resolveReceipt();
      return false;
    }
  });

  coordinator.acceptResolution(header('observer-queued-sync-false'));
  releaseAccepted(true);
  await receiptDelivered;
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(coordinator.observerDeliverySnapshot(), {
    event_sink_configured: true,
    max_pending_events: 256,
    pending_events: 0,
    dropped_events: 1,
    delivery_compromised: true
  });
});

test('Observer reuses capacity after shorter coordinator terminal retention', () => {
  let currentMs = NOW_MS;
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(currentMs),
    maxRetainedResolutions: 1
  });
  const observed = [];
  const delivered = [];
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(currentMs),
    maxResolutions: 1,
    maxRetainedResolutions: 1,
    terminalRetentionMs: 10,
    eventSink: event => {
      delivered.push(event);
      observed.push(observer.observe(event));
    }
  });
  const completed = header('observer-short-coordinator-retention');
  commitCoordinatorSuccess(coordinator, completed);
  const replay = delivered.slice();

  currentMs += 10;
  const reusable = header('observer-capacity-reused');
  commitCoordinatorSuccess(coordinator, reusable);

  assert.equal(observed.every(Boolean), true);
  const beforeReplay = observer.snapshot();
  assert.equal(beforeReplay.resolutions_accepted, 2);
  assert.equal(beforeReplay.receipts_accepted, 14);
  assert.equal(beforeReplay.terminal_successes, 2);
  assert.equal(beforeReplay.protocol_violations, 0);

  assert.equal(replay.every(event => observer.observe(event) === false), true);
  const afterReplay = observer.snapshot();
  assert.equal(afterReplay.resolutions_accepted, 2);
  assert.equal(afterReplay.receipts_accepted, 14);
  assert.equal(afterReplay.terminal_successes, 2);
  assert.equal(afterReplay.protocol_violations, replay.length);
});

test('Observer tombstone validates terminal rejection after record eviction', () => {
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(NOW_MS),
    maxRetainedResolutions: 1
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(NOW_MS),
    eventSink: event => observer.observe(event)
  });
  const evicted = header('observer-evicted-terminal');
  const replacement = header('observer-terminal-replacement');

  commitCoordinatorSuccess(coordinator, evicted);
  commitCoordinatorSuccess(coordinator, replacement);
  assert.throws(() => coordinator.commitTerminal(
    evicted.resolution_ref,
    successfulProtocol(evicted).terminal
  ), { code: 'context_resolution_terminal_already_committed' });

  const snapshot = observer.snapshot();
  assert.equal(snapshot.terminals_rejected, 1);
  assert.equal(snapshot.protocol_violations, 0);
  assert.deepEqual(coordinator.observerDeliverySnapshot(), {
    event_sink_configured: true,
    max_pending_events: 256,
    pending_events: 0,
    dropped_events: 0,
    delivery_compromised: false
  });
  assert.doesNotThrow(() => coordinator.acceptResolution(
    header('observer-admission-after-evicted-terminal-rejection')
  ));
});

test('paired replay tombstone capacity is reused after the same grace', () => {
  let currentMs = NOW_MS;
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(currentMs),
    maxRetainedResolutions: 1,
    maxReplayTombstones: 1
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(currentMs),
    maxResolutions: 1,
    maxRetainedResolutions: 1,
    maxReplayTombstones: 1,
    terminalRetentionMs: 10,
    eventSink: event => observer.observe(event)
  });
  const completed = header('observer-bounded-tombstone', { ttlSeconds: 1 });
  commitCoordinatorSuccess(coordinator, completed);

  currentMs = Date.parse(completed.deadline_at);
  const blocked = header('observer-tombstone-capacity-blocked', {
    nowMs: currentMs
  });
  assert.throws(() => coordinator.acceptResolution(blocked), {
    code: 'context_resolution_coordinator_tombstone_capacity_exceeded'
  });
  assert.equal(observer.snapshot().protocol_violations, 0);

  currentMs +=
    GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds * 1000;
  const reusable = header('observer-tombstone-capacity-reused', {
    nowMs: currentMs
  });
  assert.doesNotThrow(() => coordinator.acceptResolution(reusable));
  const snapshot = observer.snapshot();
  assert.equal(snapshot.resolutions_accepted, 2);
  assert.equal(snapshot.protocol_violations, 0);
  assert.equal(
    coordinator.observerDeliverySnapshot().delivery_compromised,
    false
  );
});

test('Observer prunes expired tombstones before terminal rejection replay', () => {
  let currentMs = NOW_MS;
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(currentMs),
    maxRetainedResolutions: 1,
    maxReplayTombstones: 1
  });
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(currentMs),
    eventSink: event => observer.observe(event)
  });
  const completed = header('observer-expired-rejection', { ttlSeconds: 1 });
  commitCoordinatorSuccess(coordinator, completed);

  currentMs = Date.parse(completed.deadline_at) +
    GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds * 1000;
  assert.equal(observer.observe({
    component: 'governed_context_resolution_coordinator',
    event: 'resolution_terminal_rejected',
    resolution_ref: completed.resolution_ref,
    rejection_code: 'context_resolution_terminal_already_committed'
  }), false);
  const snapshot = observer.snapshot();
  assert.equal(snapshot.terminals_rejected, 0);
  assert.equal(snapshot.protocol_violations, 1);
  assert.equal(
    snapshot.last_violation_code,
    'context_resolution_observer_terminal_rejection_invalid'
  );
});

test('Observer rejects a tampered receipt independently', () => {
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(NOW_MS)
  });
  const value = header('observer-tamper');
  assert.equal(observer.observe({
    component: 'governed_context_resolution_coordinator',
    event: 'resolution_accepted',
    header: value,
    accepted_at_ms: NOW_MS
  }), true);
  const created = createContextResolutionStageReceipt({
    header: value,
    receipts: [],
    stage: 'CREATED'
  });
  assert.equal(observer.observe({
    component: 'governed_context_resolution_coordinator',
    event: 'resolution_receipt_appended',
    resolution_ref: value.resolution_ref,
    receipt: {
      ...created,
      receipt_digest: digestObject('tampered-observer-receipt')
    }
  }), false);
  const snapshot = observer.snapshot();
  assert.equal(snapshot.receipts_accepted, 0);
  assert.equal(snapshot.protocol_violations, 1);
  assert.equal(
    snapshot.last_violation_code,
    'context_resolution_receipt_digest_invalid'
  );
  assert.equal(snapshot.terminals_fabricated, 0);
});

test('resolver terminal projection updates only the public resolve output schema', () => {
  const repositoryRoot = path.resolve(__dirname, '../..');
  for (const relativePath of [
    'apps/chatgpt-edge/transient-request-broker.js',
    'apps/local-recall-relay/relay-processor.js',
    'src/adapters/chatgpt-r4/governance-adapter.js'
  ]) {
    const source = fs.readFileSync(
      path.join(repositoryRoot, relativePath),
      'utf8'
    );
    assert.match(
      source,
      /ContextResolution/u,
      relativePath
    );
  }
  assert.deepEqual(
    Object.keys(toolDescriptors),
    Object.keys(EXPECTED_PUBLIC_SCHEMA_DIGESTS)
  );
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), EXPECTED_PUBLIC_SCHEMA_DIGESTS[name], name);
  }
});

test('canonical protocol round-trip remains exact and rejects terminal tamper', () => {
  const protocol = successfulProtocol(header('round-trip'));
  const roundTrip = JSON.parse(canonicalJson(protocol));
  assert.equal(validateGovernedContextResolutionProtocol(roundTrip), roundTrip);
  const tampered = structuredClone(roundTrip);
  tampered.terminal.context_ref_issued = false;
  tampered.terminal.terminal_digest = digestObject(
    Object.fromEntries(Object.entries(tampered.terminal)
      .filter(([key]) => key !== 'terminal_digest'))
  );
  assert.throws(() => validateGovernedContextResolutionProtocol(tampered), {
    code: 'context_resolution_terminal_invalid'
  });
});
