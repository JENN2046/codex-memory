'use strict';

const {
  GOVERNED_CONTEXT_RESOLUTION_LIMITS,
  GOVERNED_CONTEXT_RESOLUTION_EVENT_COMPONENT,
  createContextResolutionStageReceipt,
  createContextResolutionTerminalEnvelope,
  createGovernedContextResolutionProtocol,
  createGovernedContextResolutionWorkingSet,
  isGovernedContextResolutionWorkingSetExtension,
  reject,
  validateContextResolutionHeader,
  validateContextResolutionStageReceipt,
  validateContextResolutionTerminalEnvelope,
  validateGovernedContextResolutionProtocol
} = require('../../packages/chatgpt-r4-contracts');

function createGovernedContextResolutionCoordinator({
  clock = () => new Date(),
  maxResolutions = 64,
  maxRetainedResolutions = Math.max(maxResolutions, 256),
  maxReplayTombstones = 4096,
  maxPendingObserverEvents = 256,
  terminalRetentionMs =
    GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds * 1000,
  eventSink
} = {}) {
  if (typeof clock !== 'function') {
    reject('context_resolution_coordinator_clock_invalid');
  }
  if (!Number.isInteger(maxResolutions) ||
      maxResolutions < 1 || maxResolutions > 1024) {
    reject('context_resolution_coordinator_capacity_invalid');
  }
  if (!Number.isInteger(maxRetainedResolutions) ||
      maxRetainedResolutions < maxResolutions ||
      maxRetainedResolutions > 4096) {
    reject('context_resolution_coordinator_retention_capacity_invalid');
  }
  if (!Number.isInteger(maxReplayTombstones) ||
      maxReplayTombstones < maxResolutions ||
      maxReplayTombstones > 65536) {
    reject('context_resolution_coordinator_tombstone_capacity_invalid');
  }
  if (!Number.isInteger(maxPendingObserverEvents) ||
      maxPendingObserverEvents < 1 ||
      maxPendingObserverEvents > 4096) {
    reject('context_resolution_coordinator_observer_queue_invalid');
  }
  if (!Number.isInteger(terminalRetentionMs) ||
      terminalRetentionMs < 10 ||
      terminalRetentionMs >
        GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds * 1000) {
    reject('context_resolution_coordinator_terminal_retention_invalid');
  }
  if (eventSink !== undefined && typeof eventSink !== 'function') {
    reject('context_resolution_coordinator_event_sink_invalid');
  }

  const resolutions = new Map();
  const replayTombstones = new Map();
  let activeResolutions = 0;
  let eventDispatchDepth = 0;
  let eventDeliveryTail = null;
  let pendingObserverEvents = 0;
  let droppedObserverEvents = 0;
  let coordinatorLost = false;

  function nowMs() {
    const value = clock();
    const milliseconds = value instanceof Date
      ? value.getTime()
      : new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) {
      reject('context_resolution_coordinator_clock_invalid');
    }
    return milliseconds;
  }

  function deadlineReached(record) {
    return Date.parse(record.header.deadline_at) <= nowMs();
  }

  function pruneExpiredTerminals(currentMs) {
    for (const [resolutionRef, record] of resolutions) {
      if (record.terminal &&
          Number.isFinite(record.purge_after_ms) &&
          record.purge_after_ms <= currentMs) {
        resolutions.delete(resolutionRef);
      }
    }
  }

  function pruneExpiredReplayTombstones(currentMs) {
    for (const [resolutionRef, expiresAtMs] of replayTombstones) {
      if (expiresAtMs <= currentMs) {
        replayTombstones.delete(resolutionRef);
      }
    }
  }

  function dispatchEvent(message) {
    eventDispatchDepth += 1;
    try {
      return eventSink(message);
    } catch {
      // Observation cannot change coordinator CAS state.
      droppedObserverEvents += 1;
      return undefined;
    } finally {
      eventDispatchDepth -= 1;
    }
  }

  function trackEventDelivery(pending) {
    pendingObserverEvents += 1;
    const tracked = Promise.resolve(pending)
      .catch(() => {
        // A rejected delivery is evidence loss, just like a bounded-queue drop.
        droppedObserverEvents += 1;
      })
      .finally(() => {
        pendingObserverEvents -= 1;
      });
    eventDeliveryTail = tracked;
    tracked.then(() => {
      if (eventDeliveryTail === tracked) eventDeliveryTail = null;
    });
  }

  function emit(event, payload = {}) {
    if (!eventSink) return;
    if (eventDeliveryTail &&
        pendingObserverEvents >= maxPendingObserverEvents) {
      droppedObserverEvents += 1;
      return;
    }
    const message = Object.freeze({
      component: GOVERNED_CONTEXT_RESOLUTION_EVENT_COMPONENT,
      event,
      ...payload
    });
    if (eventDeliveryTail) {
      trackEventDelivery(
        eventDeliveryTail.then(() => dispatchEvent(message))
      );
      return;
    }
    const pending = dispatchEvent(message);
    if (pending && typeof pending.then === 'function') {
      trackEventDelivery(pending);
    }
  }

  function guardMutation(operation) {
    return (...args) => {
      if (eventDispatchDepth > 0) {
        reject('context_resolution_coordinator_reentrant_mutation');
      }
      if (coordinatorLost) {
        reject('context_resolution_coordinator_lost');
      }
      return operation(...args);
    };
  }

  function requireResolution(resolutionRef) {
    const record = resolutions.get(resolutionRef);
    if (!record) reject('context_resolution_not_found');
    return record;
  }

  function acceptResolution(header) {
    if (droppedObserverEvents > 0) {
      reject('context_resolution_observer_delivery_incomplete');
    }
    validateContextResolutionHeader(header);
    const acceptedAtMs = nowMs();
    pruneExpiredTerminals(acceptedAtMs);
    pruneExpiredReplayTombstones(acceptedAtMs);
    if (Date.parse(header.created_at) > acceptedAtMs) {
      reject('context_resolution_created_at_in_future');
    }
    if (Date.parse(header.deadline_at) <= acceptedAtMs) {
      reject('context_resolution_deadline_expired');
    }
    if (resolutions.has(header.resolution_ref) ||
        replayTombstones.has(header.resolution_ref)) {
      reject('context_resolution_ref_replay');
    }
    if (activeResolutions >= maxResolutions) {
      reject('context_resolution_coordinator_capacity_exceeded');
    }
    if (resolutions.size >= maxRetainedResolutions) {
      reject('context_resolution_coordinator_retention_capacity_exceeded');
    }
    if (replayTombstones.size >= maxReplayTombstones) {
      reject('context_resolution_coordinator_tombstone_capacity_exceeded');
    }
    const acceptedHeader = structuredClone(header);
    const created = createContextResolutionStageReceipt({
      header: acceptedHeader,
      receipts: [],
      stage: 'CREATED'
    });
    const record = {
      header: acceptedHeader,
      receipts: [structuredClone(created)],
      terminal: null,
      purge_after_ms: null
    };
    resolutions.set(header.resolution_ref, record);
    replayTombstones.set(
      header.resolution_ref,
      Date.parse(header.deadline_at)
    );
    activeResolutions += 1;
    emit('resolution_accepted', {
      header: structuredClone(acceptedHeader),
      accepted_at_ms: acceptedAtMs
    });
    emit('resolution_receipt_appended', {
      resolution_ref: header.resolution_ref,
      receipt: structuredClone(created)
    });
    return Object.freeze({
      resolution_ref: header.resolution_ref,
      header_digest: created.previous_digest,
      created_receipt_digest: created.receipt_digest
    });
  }

  function appendReceipt(resolutionRef, receipt) {
    const record = requireResolution(resolutionRef);
    if (record.terminal) {
      reject('context_resolution_terminal_already_committed');
    }
    if (deadlineReached(record)) {
      commitCoordinatorFailure(resolutionRef, 'resolution_timeout');
      reject('context_resolution_receipt_after_deadline');
    }
    validateContextResolutionStageReceipt(receipt, {
      header: record.header,
      receipts: record.receipts
    });
    const prospectiveReceipts = [...record.receipts, receipt];
    if (receipt.outcome === 'failed') {
      createContextResolutionTerminalEnvelope({
        header: record.header,
        receipts: prospectiveReceipts,
        outcome: 'failure',
        reasonCode: receipt.reason_code,
        evidenceComplete: true,
        failureOrigin: receipt.origin
      });
    }
    record.receipts.push(structuredClone(receipt));
    emit('resolution_receipt_appended', {
      resolution_ref: resolutionRef,
      receipt: structuredClone(receipt)
    });
    return Object.freeze({
      resolution_ref: resolutionRef,
      sequence: receipt.sequence,
      receipt_digest: receipt.receipt_digest
    });
  }

  function rejectTerminalCandidate(resolutionRef) {
    emit('resolution_terminal_rejected', {
      resolution_ref: resolutionRef,
      rejection_code: 'context_resolution_terminal_already_committed'
    });
    reject('context_resolution_terminal_already_committed');
  }

  function finalizeTerminal(
    resolutionRef,
    record,
    terminal,
    committedAtMs
  ) {
    if (record.terminal) rejectTerminalCandidate(resolutionRef);
    record.terminal = structuredClone(terminal);
    record.purge_after_ms = committedAtMs + terminalRetentionMs;
    activeResolutions -= 1;
    return Object.freeze({
      resolution_ref: resolutionRef,
      outcome: terminal.outcome,
      terminal_digest: terminal.terminal_digest,
      accepted: true
    });
  }

  function emitTerminalCommitted(resolutionRef, terminal) {
    emit('resolution_terminal_committed', {
      resolution_ref: resolutionRef,
      terminal: structuredClone(terminal)
    });
  }

  function acceptTerminalCandidate(
    resolutionRef,
    record,
    terminal,
    { deadlineWins = false } = {}
  ) {
    if (record.terminal) rejectTerminalCandidate(resolutionRef);
    validateContextResolutionTerminalEnvelope(terminal, {
      header: record.header,
      receipts: record.receipts
    });
    const committedAtMs = nowMs();
    if (deadlineWins &&
        Date.parse(record.header.deadline_at) <= committedAtMs) {
      commitCoordinatorFailure(resolutionRef, 'resolution_timeout');
      rejectTerminalCandidate(resolutionRef);
    }
    const acceptance = finalizeTerminal(
      resolutionRef,
      record,
      terminal,
      committedAtMs
    );
    emitTerminalCommitted(resolutionRef, terminal);
    return acceptance;
  }

  function commitCoordinatorFailure(resolutionRef, reasonCode) {
    const record = requireResolution(resolutionRef);
    if (record.terminal) rejectTerminalCandidate(resolutionRef);
    const lastReceipt = record.receipts.at(-1) || null;
    const failedReceipt = lastReceipt?.outcome === 'failed'
      ? lastReceipt
      : null;
    const terminal = createContextResolutionTerminalEnvelope({
      header: record.header,
      receipts: record.receipts,
      outcome: 'failure',
      reasonCode: failedReceipt?.reason_code || reasonCode,
      evidenceComplete: failedReceipt !== null,
      failureOrigin: failedReceipt?.origin || 'edge_broker'
    });
    return acceptTerminalCandidate(resolutionRef, record, terminal);
  }

  function commitTerminal(resolutionRef, terminal) {
    const record = requireResolution(resolutionRef);
    if (record.terminal) rejectTerminalCandidate(resolutionRef);
    if (deadlineReached(record)) {
      commitCoordinatorFailure(resolutionRef, 'resolution_timeout');
      rejectTerminalCandidate(resolutionRef);
    }
    return acceptTerminalCandidate(
      resolutionRef,
      record,
      terminal,
      { deadlineWins: true }
    );
  }

  function commitProtocolCandidate(resolutionRef, candidate) {
    const record = requireResolution(resolutionRef);
    if (record.terminal) rejectTerminalCandidate(resolutionRef);
    if (deadlineReached(record)) {
      commitCoordinatorFailure(resolutionRef, 'resolution_timeout');
      rejectTerminalCandidate(resolutionRef);
    }
    validateGovernedContextResolutionProtocol(candidate);
    const existingWorkingSet = createGovernedContextResolutionWorkingSet({
      header: record.header,
      receipts: record.receipts
    });
    const candidateWorkingSet = createGovernedContextResolutionWorkingSet({
      header: candidate.header,
      receipts: candidate.receipts
    });
    if (!isGovernedContextResolutionWorkingSetExtension(
      existingWorkingSet,
      candidateWorkingSet
    )) {
      reject('context_resolution_candidate_prefix_invalid');
    }
    const acceptedReceipts = [...record.receipts];
    for (const receipt of candidate.receipts.slice(record.receipts.length)) {
      validateContextResolutionStageReceipt(receipt, {
        header: record.header,
        receipts: acceptedReceipts
      });
      acceptedReceipts.push(receipt);
    }
    validateContextResolutionTerminalEnvelope(candidate.terminal, {
      header: record.header,
      receipts: acceptedReceipts
    });
    const committedAtMs = nowMs();
    if (Date.parse(record.header.deadline_at) <= committedAtMs) {
      commitCoordinatorFailure(resolutionRef, 'resolution_timeout');
      rejectTerminalCandidate(resolutionRef);
    }
    const appendedReceipts = candidate.receipts
      .slice(record.receipts.length)
      .map(receipt => structuredClone(receipt));
    record.receipts.push(...appendedReceipts);
    const acceptance = finalizeTerminal(
      resolutionRef,
      record,
      candidate.terminal,
      committedAtMs
    );
    for (const receipt of appendedReceipts) {
      emit('resolution_receipt_appended', {
        resolution_ref: resolutionRef,
        receipt: structuredClone(receipt)
      });
    }
    emitTerminalCommitted(resolutionRef, candidate.terminal);
    return acceptance;
  }

  function timeoutResolution(resolutionRef) {
    return commitCoordinatorFailure(resolutionRef, 'resolution_timeout');
  }

  function cancelResolution(resolutionRef) {
    const record = requireResolution(resolutionRef);
    if (record.terminal) rejectTerminalCandidate(resolutionRef);
    return commitCoordinatorFailure(
      resolutionRef,
      deadlineReached(record) ? 'resolution_timeout' : 'resolution_cancelled'
    );
  }

  function expireDueResolutions() {
    const currentMs = nowMs();
    let committed = 0;
    for (const [resolutionRef, record] of resolutions) {
      if (record.terminal ||
          Date.parse(record.header.deadline_at) > currentMs) continue;
      timeoutResolution(resolutionRef);
      committed += 1;
    }
    return committed;
  }

  function snapshot(resolutionRef) {
    const record = requireResolution(resolutionRef);
    const lastReceipt = record.receipts.at(-1) || null;
    return Object.freeze({
      resolution_ref: resolutionRef,
      receipt_count: record.receipts.length,
      last_stage: lastReceipt?.stage || null,
      terminal_committed: record.terminal !== null,
      terminal_outcome: record.terminal?.outcome || null,
      in_memory_only: true
    });
  }

  function protocol(resolutionRef) {
    const record = requireResolution(resolutionRef);
    if (!record.terminal) reject('context_resolution_terminal_missing');
    return createGovernedContextResolutionProtocol({
      header: record.header,
      receipts: record.receipts,
      terminal: record.terminal
    });
  }

  function workingSet(resolutionRef) {
    const record = requireResolution(resolutionRef);
    if (record.terminal) {
      reject('context_resolution_terminal_already_committed');
    }
    return createGovernedContextResolutionWorkingSet({
      header: record.header,
      receipts: record.receipts
    });
  }

  function reportCoordinatorLoss() {
    coordinatorLost = true;
    let missing = 0;
    for (const [resolutionRef, record] of resolutions) {
      if (record.terminal) continue;
      emit('resolution_terminal_missing', {
        resolution_ref: resolutionRef
      });
      missing += 1;
    }
    resolutions.clear();
    activeResolutions = 0;
    return Object.freeze({
      active_resolutions_lost: missing,
      terminals_fabricated: 0
    });
  }

  function observerDeliverySnapshot() {
    return Object.freeze({
      event_sink_configured: Boolean(eventSink),
      max_pending_events: maxPendingObserverEvents,
      pending_events: pendingObserverEvents,
      dropped_events: droppedObserverEvents,
      delivery_compromised: droppedObserverEvents > 0
    });
  }

  return Object.freeze({
    acceptResolution: guardMutation(acceptResolution),
    appendReceipt: guardMutation(appendReceipt),
    cancelResolution: guardMutation(cancelResolution),
    commitProtocolCandidate: guardMutation(commitProtocolCandidate),
    commitTerminal: guardMutation(commitTerminal),
    expireDueResolutions: guardMutation(expireDueResolutions),
    observerDeliverySnapshot,
    protocol,
    reportCoordinatorLoss: guardMutation(reportCoordinatorLoss),
    snapshot,
    timeoutResolution: guardMutation(timeoutResolution),
    workingSet
  });
}

module.exports = {
  createGovernedContextResolutionCoordinator
};
