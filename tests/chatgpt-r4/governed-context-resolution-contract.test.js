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
  contextResolutionFailureRegistryEntry,
  createContextResolutionHeader,
  createContextResolutionStageReceipt,
  createContextResolutionTerminalEnvelope,
  createGovernedContextResolutionProtocol,
  createGovernedContextResolutionWorkingSet,
  digestObject,
  utf8ByteLength,
  validateContextResolutionHeader,
  validateContextResolutionStageReceipt,
  validateContextResolutionTerminalEnvelope,
  validateGovernedContextResolutionProtocol
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
  context_mapping_not_found: {
    registry_resolved: true,
    mapping_resolved: false
  },
  context_scope_denied: {
    scope_resolved: false
  },
  context_issuance_unavailable: {
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
  context_response_projection_invalid: {},
  context_response_finalization_failed: {}
});

const EXPECTED_PUBLIC_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context:
    'sha256:cb9ac038e2d3565307c1733cc48757fe60bd5f527c7ede8ee844a21e1abf53e5',
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

test('Edge replay tombstone capacity is reusable after immutable deadlines', () => {
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

  currentMs += 10;
  const waiting = header('replay-tombstone-capacity-reused');
  assert.throws(() => coordinator.acceptResolution(waiting), {
    code: 'context_resolution_coordinator_tombstone_capacity_exceeded'
  });

  currentMs = Date.parse(completed.deadline_at);
  assert.doesNotThrow(() => coordinator.acceptResolution(waiting));
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
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(NOW_MS)
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
    clock: () => new Date(NOW_MS),
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
  const value = header('observer-async-order');

  commitCoordinatorSuccess(coordinator, value);
  await Promise.resolve();
  assert.deepEqual(delivered, []);
  releaseAccepted();
  await terminalDelivered;

  assert.deepEqual(delivered, [
    'resolution_accepted',
    ...Array(7).fill('resolution_receipt_appended'),
    'resolution_terminal_committed'
  ]);
  const snapshot = observer.snapshot();
  assert.equal(snapshot.resolutions_accepted, 1);
  assert.equal(snapshot.receipts_accepted, 7);
  assert.equal(snapshot.terminal_successes, 1);
  assert.equal(snapshot.protocol_violations, 0);
});

test('Observer reuses capacity after shorter coordinator terminal retention', () => {
  let currentMs = NOW_MS;
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(currentMs),
    maxRetainedResolutions: 1
  });
  const observed = [];
  const coordinator = createGovernedContextResolutionCoordinator({
    clock: () => new Date(currentMs),
    maxResolutions: 1,
    maxRetainedResolutions: 1,
    terminalRetentionMs: 10,
    eventSink: event => observed.push(observer.observe(event))
  });
  const completed = header('observer-short-coordinator-retention');
  commitCoordinatorSuccess(coordinator, completed);

  currentMs += 10;
  const reusable = header('observer-capacity-reused');
  assert.doesNotThrow(() => coordinator.acceptResolution(reusable));

  assert.equal(observed.every(Boolean), true);
  const snapshot = observer.snapshot();
  assert.equal(snapshot.resolutions_accepted, 2);
  assert.equal(snapshot.receipts_accepted, 8);
  assert.equal(snapshot.terminal_successes, 1);
  assert.equal(snapshot.protocol_violations, 0);
});

test('Observer rejects a tampered receipt independently', () => {
  const observer = createGovernedContextResolutionObserver({
    clock: () => new Date(NOW_MS)
  });
  const value = header('observer-tamper');
  assert.equal(observer.observe({
    component: 'governed_context_resolution_coordinator',
    event: 'resolution_accepted',
    header: value
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

test('dormant contract leaves live resolver imports and public v2 schemas unchanged', () => {
  const repositoryRoot = path.resolve(__dirname, '../..');
  const liveFiles = [
    'apps/chatgpt-edge/index.js',
    'apps/chatgpt-edge/transient-request-broker.js',
    'apps/local-recall-relay/index.js',
    'apps/local-recall-relay/relay-processor.js',
    'src/adapters/chatgpt-r4/governance-adapter.js',
    'src/adapters/chatgpt-r4/governed-read-v2-runtime.js'
  ];
  for (const relativePath of liveFiles) {
    const source = fs.readFileSync(
      path.join(repositoryRoot, relativePath),
      'utf8'
    );
    assert.doesNotMatch(
      source,
      /governed-context-resolution/u,
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
