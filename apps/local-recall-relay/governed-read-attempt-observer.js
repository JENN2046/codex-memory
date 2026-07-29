'use strict';

const {
  GOVERNED_READ_ATTEMPT_LIMITS,
  aggregateAttemptCounters,
  createTerminalEnvelope,
  reject,
  validateAttemptCounterRelationships,
  validateAttemptHeader,
  validateStageReceipt,
  validateTerminalEnvelope
} = require('../../packages/chatgpt-r4-contracts');

const SAFE_CODE = /^[a-z][a-z0-9_]{0,79}$/u;

function createGovernedReadAttemptObserver({
  clock = () => new Date(),
  maxRetainedAttempts = 256
} = {}) {
  if (typeof clock !== 'function') reject('attempt_observer_clock_invalid');
  if (!Number.isInteger(maxRetainedAttempts) ||
      maxRetainedAttempts < 1 ||
      maxRetainedAttempts > 4096) {
    reject('attempt_observer_retention_capacity_invalid');
  }
  const attempts = new Map();
  const counters = {
    attempts_accepted: 0,
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
    if (!Number.isFinite(milliseconds)) reject('attempt_observer_clock_invalid');
    return milliseconds;
  }

  function pruneExpiredAttempts(currentMs) {
    for (const [attemptRef, record] of attempts) {
      if ((record.terminal || record.missing) &&
          Number.isFinite(record.purge_after_ms) &&
          record.purge_after_ms <= currentMs) {
        attempts.delete(attemptRef);
      }
    }
  }

  function retainedUntil(record, currentMs) {
    return Math.max(
      Date.parse(record.header.deadline_at),
      currentMs + GOVERNED_READ_ATTEMPT_LIMITS.ttlSeconds * 1000
    );
  }

  function violation(code) {
    counters.protocol_violations += 1;
    lastViolationCode = typeof code === 'string' && SAFE_CODE.test(code)
      ? code
      : 'attempt_observer_protocol_invalid';
    return false;
  }

  function observe(event) {
    if (!event || typeof event !== 'object' || Array.isArray(event) ||
        event.component !== 'transient_edge_broker') {
      return false;
    }
    try {
      const currentMs = nowMs();
      pruneExpiredAttempts(currentMs);
      if (event.event === 'attempt_accepted') {
        validateAttemptHeader(event.header);
        if (attempts.has(event.header.attempt_ref)) {
          return violation('attempt_observer_duplicate_accept');
        }
        if (attempts.size >= maxRetainedAttempts) {
          return violation('attempt_observer_retention_capacity_exceeded');
        }
        attempts.set(event.header.attempt_ref, {
          header: structuredClone(event.header),
          receipts: [],
          terminal: null,
          missing: false,
          purge_after_ms: null
        });
        counters.attempts_accepted += 1;
        return true;
      }
      if (event.event === 'attempt_receipt_appended') {
        const record = attempts.get(event.attempt_ref);
        if (!record || record.terminal || record.missing) {
          return violation('attempt_observer_receipt_without_active_attempt');
        }
        validateStageReceipt(event.receipt, {
          header: record.header,
          receipts: record.receipts
        });
        const prospectiveReceipts = [
          ...record.receipts,
          event.receipt
        ];
        validateAttemptCounterRelationships(
          aggregateAttemptCounters(prospectiveReceipts)
        );
        if (event.receipt.outcome === 'failed') {
          createTerminalEnvelope({
            header: record.header,
            receipts: prospectiveReceipts,
            outcome: 'failure',
            reasonCode: event.receipt.reason_code,
            evidenceComplete: false,
            failureOrigin: event.receipt.origin
          });
        }
        record.receipts.push(structuredClone(event.receipt));
        counters.receipts_accepted += 1;
        return true;
      }
      if (event.event === 'attempt_terminal_committed') {
        const record = attempts.get(event.attempt_ref);
        if (!record || record.terminal || record.missing) {
          return violation('attempt_observer_terminal_without_active_attempt');
        }
        validateTerminalEnvelope(event.terminal, {
          header: record.header,
          receipts: record.receipts
        });
        const purgeAfterMs = retainedUntil(record, currentMs);
        record.terminal = structuredClone(event.terminal);
        record.purge_after_ms = purgeAfterMs;
        if (event.terminal.outcome === 'success') counters.terminal_successes += 1;
        else counters.terminal_failures += 1;
        return true;
      }
      if (event.event === 'attempt_terminal_rejected') {
        const record = attempts.get(event.attempt_ref);
        if (!record?.terminal ||
            event.rejection_code !== 'attempt_terminal_already_committed') {
          return violation('attempt_observer_terminal_rejection_invalid');
        }
        counters.terminals_rejected += 1;
        return true;
      }
      if (event.event === 'attempt_terminal_missing') {
        const record = attempts.get(event.attempt_ref);
        if (!record || record.terminal || record.missing) {
          return violation('attempt_observer_terminal_missing_invalid');
        }
        record.purge_after_ms = retainedUntil(record, currentMs);
        record.missing = true;
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
      component: 'governed_read_attempt_observer',
      ...counters,
      last_violation_code: lastViolationCode,
      provider_counts_inferred: false,
      native_counts_inferred: false,
      terminals_fabricated: 0,
      attempt_identifiers_retained_in_projection: false,
      response_bodies_retained: false,
      raw_memory_retained: false,
      secret_values_retained: false
    });
  }

  return Object.freeze({ observe, snapshot });
}

module.exports = {
  createGovernedReadAttemptObserver
};
