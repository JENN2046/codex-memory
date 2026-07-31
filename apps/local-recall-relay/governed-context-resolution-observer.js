'use strict';

const {
  GOVERNED_CONTEXT_RESOLUTION_EVENT_COMPONENT,
  GOVERNED_CONTEXT_RESOLUTION_LIMITS,
  createContextResolutionTerminalEnvelope,
  reject,
  validateContextResolutionHeader,
  validateContextResolutionStageReceipt,
  validateContextResolutionTerminalEnvelope
} = require('../../packages/chatgpt-r4-contracts');
const {
  GOVERNED_SAFE_CODE_PATTERN
} = require('../../packages/chatgpt-r4-contracts/governed-failure-registry');

function createGovernedContextResolutionObserver({
  clock = () => new Date(),
  maxRetainedResolutions = 256
} = {}) {
  if (typeof clock !== 'function') {
    reject('context_resolution_observer_clock_invalid');
  }
  if (!Number.isInteger(maxRetainedResolutions) ||
      maxRetainedResolutions < 1 || maxRetainedResolutions > 4096) {
    reject('context_resolution_observer_retention_capacity_invalid');
  }

  const resolutions = new Map();
  const counters = {
    resolutions_accepted: 0,
    receipts_accepted: 0,
    terminal_successes: 0,
    terminal_failures: 0,
    terminals_rejected: 0,
    terminals_missing: 0,
    protocol_violations: 0
  };
  let lastViolationCode = null;

  function nowMs() {
    const value = clock();
    const milliseconds = value instanceof Date
      ? value.getTime()
      : new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) {
      reject('context_resolution_observer_clock_invalid');
    }
    return milliseconds;
  }

  function retainedUntil(record, currentMs) {
    return Math.max(
      Date.parse(record.header.deadline_at),
      currentMs + GOVERNED_CONTEXT_RESOLUTION_LIMITS.ttlSeconds * 1000
    );
  }

  function pruneExpired(currentMs) {
    for (const [resolutionRef, record] of resolutions) {
      if ((record.terminal || record.missing) &&
          Number.isFinite(record.purge_after_ms) &&
          record.purge_after_ms <= currentMs) {
        resolutions.delete(resolutionRef);
      }
    }
  }

  function evictOldestClosedResolution() {
    let selectedRef = null;
    let selectedPurgeAfterMs = Number.POSITIVE_INFINITY;
    for (const [resolutionRef, record] of resolutions) {
      if ((!record.terminal && !record.missing) ||
          !Number.isFinite(record.purge_after_ms)) continue;
      if (selectedRef === null ||
          record.purge_after_ms < selectedPurgeAfterMs) {
        selectedRef = resolutionRef;
        selectedPurgeAfterMs = record.purge_after_ms;
      }
    }
    if (selectedRef === null) return false;
    resolutions.delete(selectedRef);
    return true;
  }

  function violation(code) {
    counters.protocol_violations += 1;
    lastViolationCode = typeof code === 'string' &&
      GOVERNED_SAFE_CODE_PATTERN.test(code)
      ? code
      : 'context_resolution_observer_protocol_invalid';
    return false;
  }

  function observe(event) {
    if (!event || typeof event !== 'object' || Array.isArray(event) ||
        event.component !== GOVERNED_CONTEXT_RESOLUTION_EVENT_COMPONENT) {
      return false;
    }
    try {
      const currentMs = nowMs();
      pruneExpired(currentMs);
      if (event.event === 'resolution_accepted') {
        validateContextResolutionHeader(event.header);
        if (resolutions.has(event.header.resolution_ref)) {
          return violation('context_resolution_observer_duplicate_accept');
        }
        if (resolutions.size >= maxRetainedResolutions &&
            !evictOldestClosedResolution()) {
          return violation(
            'context_resolution_observer_retention_capacity_exceeded'
          );
        }
        resolutions.set(event.header.resolution_ref, {
          header: structuredClone(event.header),
          receipts: [],
          terminal: null,
          missing: false,
          purge_after_ms: null
        });
        counters.resolutions_accepted += 1;
        return true;
      }
      if (event.event === 'resolution_receipt_appended') {
        const record = resolutions.get(event.resolution_ref);
        if (!record || record.terminal || record.missing) {
          return violation(
            'context_resolution_observer_receipt_without_active_resolution'
          );
        }
        validateContextResolutionStageReceipt(event.receipt, {
          header: record.header,
          receipts: record.receipts
        });
        const prospectiveReceipts = [...record.receipts, event.receipt];
        if (event.receipt.outcome === 'failed') {
          createContextResolutionTerminalEnvelope({
            header: record.header,
            receipts: prospectiveReceipts,
            outcome: 'failure',
            reasonCode: event.receipt.reason_code,
            evidenceComplete: true,
            failureOrigin: event.receipt.origin
          });
        }
        record.receipts.push(structuredClone(event.receipt));
        counters.receipts_accepted += 1;
        return true;
      }
      if (event.event === 'resolution_terminal_committed') {
        const record = resolutions.get(event.resolution_ref);
        if (!record || record.terminal || record.missing) {
          return violation(
            'context_resolution_observer_terminal_without_active_resolution'
          );
        }
        validateContextResolutionTerminalEnvelope(event.terminal, {
          header: record.header,
          receipts: record.receipts
        });
        record.terminal = structuredClone(event.terminal);
        record.purge_after_ms = retainedUntil(record, currentMs);
        if (event.terminal.outcome === 'success') {
          counters.terminal_successes += 1;
        } else {
          counters.terminal_failures += 1;
        }
        return true;
      }
      if (event.event === 'resolution_terminal_rejected') {
        const record = resolutions.get(event.resolution_ref);
        if (!record?.terminal ||
            event.rejection_code !==
              'context_resolution_terminal_already_committed') {
          return violation(
            'context_resolution_observer_terminal_rejection_invalid'
          );
        }
        counters.terminals_rejected += 1;
        return true;
      }
      if (event.event === 'resolution_terminal_missing') {
        const record = resolutions.get(event.resolution_ref);
        if (!record || record.terminal || record.missing) {
          return violation(
            'context_resolution_observer_terminal_missing_invalid'
          );
        }
        record.missing = true;
        record.purge_after_ms = retainedUntil(record, currentMs);
        counters.terminals_missing += 1;
        return violation('terminal_missing');
      }
      return false;
    } catch (error) {
      return violation(error?.code);
    }
  }

  function snapshot() {
    return Object.freeze({
      schema_version: 1,
      component: 'governed_context_resolution_observer',
      ...counters,
      last_violation_code: lastViolationCode,
      terminals_fabricated: 0,
      resolution_identifiers_retained_in_projection: false,
      context_references_retained: false,
      response_bodies_retained: false,
      provider_counts_inferred: false,
      native_counts_inferred: false,
      raw_memory_retained: false,
      secret_values_retained: false
    });
  }

  return Object.freeze({ observe, snapshot });
}

module.exports = {
  createGovernedContextResolutionObserver
};
