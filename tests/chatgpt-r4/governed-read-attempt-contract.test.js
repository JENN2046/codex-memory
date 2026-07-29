'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  GOVERNED_READ_ATTEMPT_FAILURE_REGISTRY,
  GOVERNED_READ_ATTEMPT_LIMITS,
  GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES,
  GOVERNED_READ_ATTEMPT_PROTOCOL,
  canonicalJson,
  createAttemptHeader,
  createGovernedReadAttemptProtocol,
  createStageReceipt,
  createTerminalEnvelope,
  digestObject,
  projectGovernedReadAttemptOwner,
  projectGovernedReadAttemptPublic,
  validateAttemptHeader,
  validateGovernedReadAttemptProtocol,
  validateStageReceipt,
  validateTerminalEnvelope,
  utf8ByteLength
} = require('../../packages/chatgpt-r4-contracts');
const {
  createGovernedReadAttemptCoordinator
} = require('../../apps/chatgpt-edge/transient-request-broker');
const {
  createGovernedReadAttemptObserver
} = require('../../apps/local-recall-relay/governed-read-attempt-observer');

const NOW = new Date('2026-07-30T00:00:00.000Z');

function header(suffix = 'A') {
  return createAttemptHeader({
    attemptRef: `grat_${suffix.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject(`request-${suffix}`),
    contextBindingDigest: digestObject(`context-${suffix}`),
    now: NOW,
    ttlSeconds: 30
  });
}

function successFacts(stage) {
  if (stage === 'BRIDGE_DELEGATED') {
    return { fallback: { attempts: 0 } };
  }
  if (stage === 'NATIVE_DISPATCHED') {
    return { native_invocation: { started: 1 } };
  }
  if (stage === 'SOURCE_PREFLIGHT') {
    return {
      primary_memory: {
        write_attempts: 0,
        writes_committed: 0
      }
    };
  }
  if (stage === 'PROVIDER_EMBEDDING') {
    return {
      provider: {
        started: 1,
        succeeded: 1,
        failed: 0
      }
    };
  }
  if (stage === 'HYDRATION') {
    return {
      derived_transaction: {
        started: 1,
        committed: 1,
        rolled_back: 0
      }
    };
  }
  if (stage === 'VECTOR_SEARCH') {
    return {
      native_invocation: {
        succeeded: 1,
        failed: 0
      }
    };
  }
  return {};
}

function completedReceipts(value, factsByStage = {}) {
  const receipts = [];
  for (const stage of GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES) {
    receipts.push(createStageReceipt({
      header: value,
      receipts,
      stage,
      counterFacts: Object.hasOwn(factsByStage, stage)
        ? factsByStage[stage]
        : successFacts(stage)
    }));
  }
  return receipts;
}

function appendThrough(value, finalStage, {
  outcome = 'completed',
  reasonCode = null,
  finalCounterFacts = {}
} = {}) {
  const receipts = [];
  for (const stage of GOVERNED_READ_ATTEMPT_NON_TERMINAL_STAGES) {
    const final = stage === finalStage;
    receipts.push(createStageReceipt({
      header: value,
      receipts,
      stage,
      outcome: final ? outcome : 'completed',
      reasonCode: final ? reasonCode : null,
      counterFacts: final ? finalCounterFacts : successFacts(stage)
    }));
    if (final) break;
  }
  return receipts;
}

test('AttemptHeader is immutable, bounded, and contains no mutable state identity', () => {
  const value = header();
  assert.equal(Object.isFrozen(value), true);
  assert.equal(value.protocol, GOVERNED_READ_ATTEMPT_PROTOCOL);
  assert.equal(value.attempt_ref.startsWith('grat_'), true);
  assert.equal(Object.hasOwn(value, 'state'), false);
  assert.equal(Object.hasOwn(value, 'current_stage'), false);
  assert.equal(Object.hasOwn(value, 'request_id'), false);
  assert.equal(Object.hasOwn(value, 'claim_token'), false);
  assert.equal(
    utf8ByteLength(value) <= GOVERNED_READ_ATTEMPT_LIMITS.headerBytes,
    true
  );
  assert.doesNotThrow(() => validateAttemptHeader(value));
  assert.throws(() => createAttemptHeader({
    attemptRef: `grat_${'R'.repeat(32)}`,
    toolName: 'resolve_memory_context',
    requestDigest: digestObject('resolve-request'),
    contextBindingDigest: digestObject('resolve-context'),
    now: NOW
  }), { code: 'attempt_tool_invalid' });
  assert.throws(() => validateAttemptHeader({
    ...value,
    current_stage: 'CREATED'
  }), { code: 'attempt_header_shape_invalid' });
});

test('complete success derives one bounded terminal and public/owner projections', () => {
  const value = header('B');
  const receipts = completedReceipts(value);
  const terminal = createTerminalEnvelope({
    header: value,
    receipts,
    outcome: 'success',
    evidenceComplete: true
  });
  const protocol = createGovernedReadAttemptProtocol({
    header: value,
    receipts,
    terminal
  });
  assert.doesNotThrow(() => validateGovernedReadAttemptProtocol(protocol));
  assert.equal(receipts.length, 13);
  assert.equal(terminal.terminal_stage, 'TERMINAL_SUCCESS');
  assert.equal(terminal.last_completed_stage, 'RESPONSE_FINALIZATION');
  assert.equal(terminal.failed_stage, null);
  assert.deepEqual(terminal.counters, {
    provider: { started: 1, succeeded: 1, failed: 0 },
    native_invocation: { started: 1, succeeded: 1, failed: 0 },
    primary_memory: { write_attempts: 0, writes_committed: 0 },
    derived_transaction: { started: 1, committed: 1, rolled_back: 0 },
    fallback: { attempts: 0 }
  });
  assert.equal(
    utf8ByteLength(terminal) <= GOVERNED_READ_ATTEMPT_LIMITS.terminalBytes,
    true
  );
  assert.equal(
    utf8ByteLength(protocol) <= GOVERNED_READ_ATTEMPT_LIMITS.protocolBytes,
    true
  );
  const publicProjection = projectGovernedReadAttemptPublic(protocol);
  assert.equal(publicProjection.protocol, GOVERNED_READ_ATTEMPT_PROTOCOL);
  assert.equal(publicProjection.outcome, 'success');
  assert.deepEqual(publicProjection.counters, terminal.counters);
  assert.deepEqual(Object.keys(publicProjection).sort(), [
    'attempt_ref',
    'counters',
    'evidence_complete',
    'failed_stage',
    'failure_category',
    'last_completed_stage',
    'outcome',
    'protocol',
    'reason_code'
  ]);
  const ownerProjection = projectGovernedReadAttemptOwner(protocol);
  assert.equal(ownerProjection.raw_memory_returned, false);
  assert.equal(ownerProjection.provider_response_returned, false);
  assert.equal(ownerProjection.secret_values_returned, false);
});

test('receipt validation rejects attempt mismatch, sequence gaps/duplicates, and stage regression', () => {
  const value = header('C');
  const created = createStageReceipt({
    header: value,
    stage: 'CREATED'
  });
  const edgeValidated = createStageReceipt({
    header: value,
    receipts: [created],
    stage: 'EDGE_VALIDATED'
  });

  assert.throws(() => validateStageReceipt({
    ...edgeValidated,
    attempt_ref: `grat_${'Z'.repeat(32)}`
  }, {
    header: value,
    receipts: [created]
  }), { code: 'attempt_ref_mismatch' });
  assert.throws(() => validateStageReceipt({
    ...edgeValidated,
    sequence: 2
  }, {
    header: value,
    receipts: [created]
  }), { code: 'attempt_receipt_sequence_gap' });
  assert.throws(() => validateStageReceipt({
    ...edgeValidated,
    sequence: 0
  }, {
    header: value,
    receipts: [created]
  }), { code: 'attempt_receipt_sequence_duplicate' });
  assert.throws(() => validateStageReceipt({
    ...edgeValidated,
    stage: 'CREATED'
  }, {
    header: value,
    receipts: [created]
  }), { code: 'attempt_receipt_stage_regression' });
});

test('receipt validation rejects unknown reasons, tampering, and oversize records', () => {
  const value = header('D');
  const created = createStageReceipt({ header: value, stage: 'CREATED' });
  assert.throws(() => createStageReceipt({
    header: value,
    receipts: [created],
    stage: 'EDGE_VALIDATED',
    outcome: 'failed',
    reasonCode: 'not_registered'
  }), { code: 'attempt_reason_unknown' });

  const edgeValidated = createStageReceipt({
    header: value,
    receipts: [created],
    stage: 'EDGE_VALIDATED'
  });
  assert.throws(() => validateStageReceipt({
    ...edgeValidated,
    receipt_digest: digestObject('tampered')
  }, {
    header: value,
    receipts: [created]
  }), { code: 'attempt_receipt_digest_invalid' });
  assert.throws(() => validateStageReceipt({
    ...edgeValidated,
    outcome: 'failed',
    reason_code: `a${'b'.repeat(2000)}`
  }, {
    header: value,
    receipts: [created]
  }), { code: 'attempt_receipt_too_large' });
});

test('registry may-have-occurred policy permits unknown but never invents provider counts', () => {
  const value = header('E');
  const receipts = appendThrough(value, 'PROVIDER_EMBEDDING', {
    outcome: 'failed',
    reasonCode: 'provider_embedding_failed',
    finalCounterFacts: {}
  });
  const terminal = createTerminalEnvelope({
    header: value,
    receipts,
    outcome: 'failure',
    reasonCode: 'provider_embedding_failed',
    evidenceComplete: false
  });
  assert.equal(
    GOVERNED_READ_ATTEMPT_FAILURE_REGISTRY.provider_embedding_failed
      .provider_may_have_occurred,
    true
  );
  assert.deepEqual(terminal.counters.provider, {
    started: null,
    succeeded: null,
    failed: null
  });
  assert.equal(terminal.reason_code, 'provider_embedding_failed');
  assert.equal(terminal.failure_category, 'provider');
  assert.equal(terminal.fallback_policy, 'forbidden');
});

test('pre-provider failure requires receipt evidence instead of inferred provider zero', () => {
  const value = header('F');
  const missingEvidence = appendThrough(value, 'SOURCE_PREFLIGHT', {
    outcome: 'failed',
    reasonCode: 'source_preflight_failed',
    finalCounterFacts: {
      native_invocation: { succeeded: 0, failed: 1 },
      primary_memory: { write_attempts: 0, writes_committed: 0 }
    }
  });
  assert.equal(
    GOVERNED_READ_ATTEMPT_FAILURE_REGISTRY.source_preflight_failed
      .provider_may_have_occurred,
    false
  );
  assert.throws(() => createTerminalEnvelope({
    header: value,
    receipts: missingEvidence,
    outcome: 'failure',
    reasonCode: 'source_preflight_failed',
    evidenceComplete: false
  }), { code: 'attempt_counter_evidence_incomplete' });

  const evidenced = appendThrough(value, 'SOURCE_PREFLIGHT', {
    outcome: 'failed',
    reasonCode: 'source_preflight_failed',
    finalCounterFacts: {
      provider: { started: 0, succeeded: 0, failed: 0 },
      native_invocation: { succeeded: 0, failed: 1 },
      primary_memory: { write_attempts: 0, writes_committed: 0 }
    }
  });
  const terminal = createTerminalEnvelope({
    header: value,
    receipts: evidenced,
    outcome: 'failure',
    reasonCode: 'source_preflight_failed',
    evidenceComplete: false
  });
  assert.deepEqual(terminal.counters.provider, {
    started: 0,
    succeeded: 0,
    failed: 0
  });
});

test('counter reconciliation rejects provider duplication, primary writes, fallback, and invalid hydration tuples', () => {
  const mutations = [
    ['PROVIDER_EMBEDDING', {
      provider: { started: 2, succeeded: 2, failed: 0 }
    }, 'attempt_counter_reconciliation_invalid'],
    ['SOURCE_PREFLIGHT', {
      primary_memory: { write_attempts: 1, writes_committed: 0 }
    }, 'attempt_primary_write_forbidden'],
    ['BRIDGE_DELEGATED', {
      fallback: { attempts: 1 }
    }, 'attempt_fallback_forbidden'],
    ['HYDRATION', {
      derived_transaction: { started: 1, committed: 1, rolled_back: 1 }
    }, 'attempt_derived_transaction_invalid']
  ];
  for (const [stage, facts, code] of mutations) {
    const value = header(stage[0]);
    const receipts = completedReceipts(value, { [stage]: facts });
    assert.throws(() => createTerminalEnvelope({
      header: value,
      receipts,
      outcome: 'success',
      evidenceComplete: true
    }), { code });
  }
});

test('Edge terminal CAS is first-terminal-wins for timeout against late completion', () => {
  const value = header('G');
  const observer = createGovernedReadAttemptObserver();
  const coordinator = createGovernedReadAttemptCoordinator({
    clock: () => NOW,
    eventSink: observer.observe
  });
  coordinator.acceptAttempt(value);
  const receipts = completedReceipts(value);
  for (const receipt of receipts.slice(1)) {
    coordinator.appendReceipt(value.attempt_ref, receipt);
  }
  const success = createTerminalEnvelope({
    header: value,
    receipts,
    outcome: 'success',
    evidenceComplete: true
  });
  const first = coordinator.timeoutAttempt(value.attempt_ref);
  assert.equal(first.outcome, 'failure');
  assert.throws(
    () => coordinator.commitTerminal(value.attempt_ref, success),
    { code: 'attempt_terminal_already_committed' }
  );
  const protocol = coordinator.protocol(value.attempt_ref);
  assert.equal(protocol.terminal.reason_code, 'attempt_timeout');
  assert.equal(protocol.terminal.evidence_complete, false);
  assert.deepEqual(observer.snapshot(), {
    schema_version: 1,
    component: 'governed_read_attempt_observer',
    attempts_accepted: 1,
    receipts_accepted: 13,
    terminal_successes: 0,
    terminal_failures: 1,
    terminals_rejected: 1,
    terminals_missing: 0,
    protocol_violations: 0,
    last_violation_code: null,
    provider_counts_inferred: false,
    native_counts_inferred: false,
    terminals_fabricated: 0,
    attempt_identifiers_retained_in_projection: false,
    response_bodies_retained: false,
    raw_memory_retained: false,
    secret_values_retained: false
  });
});

test('Edge cancel terminal also rejects every later candidate without revalidation', () => {
  const value = header('H');
  const coordinator = createGovernedReadAttemptCoordinator({ clock: () => NOW });
  coordinator.acceptAttempt(value);
  assert.equal(coordinator.cancelAttempt(value.attempt_ref).outcome, 'failure');
  assert.throws(
    () => coordinator.commitTerminal(value.attempt_ref, {}),
    { code: 'attempt_terminal_already_committed' }
  );
  assert.equal(
    coordinator.protocol(value.attempt_ref).terminal.reason_code,
    'attempt_cancelled'
  );
});

test('coordinator loss records terminal_missing and never fabricates a terminal', () => {
  const value = header('I');
  const observer = createGovernedReadAttemptObserver();
  const coordinator = createGovernedReadAttemptCoordinator({
    clock: () => NOW,
    eventSink: observer.observe
  });
  coordinator.acceptAttempt(value);
  const loss = coordinator.reportCoordinatorLoss();
  assert.deepEqual(loss, {
    active_attempts_lost: 1,
    terminals_fabricated: 0
  });
  const snapshot = observer.snapshot();
  assert.equal(snapshot.terminals_missing, 1);
  assert.equal(snapshot.protocol_violations, 1);
  assert.equal(snapshot.last_violation_code, 'terminal_missing');
  assert.equal(snapshot.terminals_fabricated, 0);
  assert.throws(
    () => coordinator.protocol(value.attempt_ref),
    { code: 'attempt_not_found' }
  );
  const created = createStageReceipt({ header: value, stage: 'CREATED' });
  assert.throws(() => createTerminalEnvelope({
    header: value,
    receipts: [created],
    outcome: 'failure',
    reasonCode: 'terminal_missing',
    evidenceComplete: false,
    failureOrigin: 'observer'
  }), { code: 'attempt_terminal_reason_forbidden' });
});

test('Observer independently rejects a tampered receipt chain without exposing identifiers', () => {
  const value = header('J');
  const observer = createGovernedReadAttemptObserver();
  assert.equal(observer.observe({
    component: 'transient_edge_broker',
    event: 'attempt_accepted',
    header: value
  }), true);
  const created = createStageReceipt({ header: value, stage: 'CREATED' });
  assert.equal(observer.observe({
    component: 'transient_edge_broker',
    event: 'attempt_receipt_appended',
    attempt_ref: value.attempt_ref,
    receipt: {
      ...created,
      receipt_digest: digestObject('observer-tamper')
    }
  }), false);
  const snapshot = observer.snapshot();
  assert.equal(snapshot.protocol_violations, 1);
  assert.equal(snapshot.last_violation_code, 'attempt_receipt_digest_invalid');
  assert.equal(canonicalJson(snapshot).includes(value.attempt_ref), false);
});

test('terminal validation rejects digest tampering and duplicate terminal state in protocol objects', () => {
  const value = header('K');
  const receipts = completedReceipts(value);
  const terminal = createTerminalEnvelope({
    header: value,
    receipts,
    outcome: 'success',
    evidenceComplete: true
  });
  assert.throws(() => validateTerminalEnvelope({
    ...terminal,
    terminal_digest: digestObject('terminal-tamper')
  }, {
    header: value,
    receipts
  }), { code: 'attempt_terminal_invalid' });
  assert.throws(() => validateGovernedReadAttemptProtocol({
    header: value,
    receipts,
    terminal: [terminal, terminal]
  }), { code: 'attempt_terminal_shape_invalid' });
});
