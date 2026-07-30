'use strict';

const path = require('node:path');
const { fork } = require('node:child_process');

const {
  failureRegistryEntry
} = require('../../../packages/chatgpt-r4-contracts');
const {
  normalizeSelectedDiaryNames,
  validateProjectionPlan
} = require('./production-selected-diary-hydrator');

const DEFAULT_SOURCE_PREFLIGHT_TIMEOUT_MS = 15_000;
const SOURCE_PREFLIGHT_CHILD_PATH = path.join(
  __dirname,
  'governed-read-source-preflight-child.js'
);

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

function exactKeys(value, expected) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index]);
}

function absolutePath(value) {
  return typeof value === 'string' &&
    path.isAbsolute(value) &&
    path.resolve(value) === value &&
    !value.includes('\0');
}

function validatePositiveInteger(value, minimum, maximum, code) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw codedError(code);
  }
  return value;
}

function validateAbortSignal(signal) {
  if (signal === undefined) return;
  if (!signal ||
      typeof signal !== 'object' ||
      typeof signal.aborted !== 'boolean' ||
      typeof signal.addEventListener !== 'function' ||
      typeof signal.removeEventListener !== 'function') {
    throw codedError('source_preflight_abort_signal_invalid');
  }
}

function validateSourcePreflightTask(task) {
  if (!exactKeys(task, [
    'allowed_diary_names',
    'dimension',
    'source_knowledge_base_store_path',
    'source_runtime_root'
  ]) ||
      !absolutePath(task.source_knowledge_base_store_path) ||
      !absolutePath(task.source_runtime_root) ||
      !Number.isInteger(task.dimension) ||
      task.dimension < 1 ||
      task.dimension > 65_536) {
    throw codedError('source_preflight_task_invalid');
  }
  normalizeSelectedDiaryNames(task.allowed_diary_names);
  return task;
}

function canonicalPreflightReason(value) {
  if (typeof value !== 'string') return false;
  try {
    const entry = failureRegistryEntry(value);
    return entry.stage === 'SOURCE_PREFLIGHT' &&
      entry.origin === 'persistent_shim';
  } catch {
    return false;
  }
}

function validateSourcePreflightResponse(response) {
  if (!exactKeys(response, [
    'accepted',
    'kind',
    'projection_plan',
    'reason_code',
    'schema_version'
  ]) ||
      response.kind !== 'governed_read_source_preflight_result' ||
      response.schema_version !== 1 ||
      typeof response.accepted !== 'boolean') {
    throw codedError('source_preflight_response_invalid');
  }
  if (response.accepted === true) {
    if (response.reason_code !== null) {
      throw codedError('source_preflight_response_invalid');
    }
    validateProjectionPlan(response.projection_plan);
  } else if (response.projection_plan !== null ||
      !canonicalPreflightReason(response.reason_code)) {
    throw codedError('source_preflight_response_invalid');
  }
  return response;
}

function runSourcePreflightProcess(task, {
  childWorkerPath = SOURCE_PREFLIGHT_CHILD_PATH,
  workerTimeoutMs = DEFAULT_SOURCE_PREFLIGHT_TIMEOUT_MS,
  terminationGraceMs = 2_000,
  forkProcess = fork,
  signal
} = {}) {
  validateSourcePreflightTask(task);
  validatePositiveInteger(
    workerTimeoutMs,
    1,
    60_000,
    'source_preflight_timeout_invalid'
  );
  validatePositiveInteger(
    terminationGraceMs,
    10,
    10_000,
    'source_preflight_termination_grace_invalid'
  );
  validateAbortSignal(signal);

  return new Promise(resolve => {
    let child;
    let message = null;
    let exited = false;
    let settled = false;
    let timeout = null;
    let termination = null;
    let sigtermSent = false;
    let terminationStarted = false;
    let terminationReason = null;
    let cancelled = false;

    function finish(value) {
      if (settled) return;
      settled = true;
      if (timeout !== null) clearTimeout(timeout);
      if (termination !== null) clearTimeout(termination);
      signal?.removeEventListener('abort', onAbort);
      resolve(Object.freeze(value));
    }

    function childHasStarted() {
      return Number.isSafeInteger(child?.pid) && child.pid > 0;
    }

    function finishUnstartedChild({
      cancelledByCaller = false
    } = {}) {
      cancelled = cancelled || cancelledByCaller;
      finish({
        response: null,
        shutdown_complete: true,
        sigterm_sent: false,
        cancelled,
        child_started: false
      });
    }

    function maybeFinish(code) {
      if (!exited) return;
      if (!childHasStarted()) {
        finishUnstartedChild();
        return;
      }
      if (terminationStarted) {
        finish({
          response: null,
          shutdown_complete: true,
          sigterm_sent: sigtermSent,
          cancelled,
          child_started: true,
          termination_reason: terminationReason
        });
        return;
      }
      let validatedResponse = null;
      if (message && code === 0) {
        try {
          validatedResponse =
            validateSourcePreflightResponse(message);
        } catch {}
      }
      finish({
        response: validatedResponse,
        shutdown_complete: true,
        sigterm_sent: sigtermSent,
        cancelled,
        child_started: true,
        ...(validatedResponse === null
          ? { termination_reason: 'child_error' }
          : {})
      });
    }

    function beginTermination({
      cancelledByCaller = false,
      reason = 'child_error'
    } = {}) {
      if (settled || exited || terminationStarted) return;
      cancelled = cancelled || cancelledByCaller;
      if (!childHasStarted()) {
        finishUnstartedChild({ cancelledByCaller });
        return;
      }
      terminationStarted = true;
      terminationReason = cancelledByCaller ? 'cancelled' : reason;
      let signalSent = false;
      try {
        signalSent = child.kill('SIGTERM') === true;
      } catch {}
      sigtermSent = sigtermSent || signalSent;
      termination = setTimeout(() => {
        if (settled || exited) return;
        try {
          if (child.connected) child.disconnect();
        } catch {}
        try {
          child.unref();
        } catch {}
        finish({
          response: null,
          shutdown_complete: false,
          sigterm_sent: sigtermSent,
          cancelled,
          child_started: true,
          termination_reason: terminationReason
        });
      }, terminationGraceMs);
    }

    function onAbort() {
      beginTermination({
        cancelledByCaller: true,
        reason: 'cancelled'
      });
    }

    if (signal?.aborted) {
      finish({
        response: null,
        shutdown_complete: true,
        sigterm_sent: false,
        cancelled: true,
        child_started: false
      });
      return;
    }

    timeout = setTimeout(() => {
      beginTermination({ reason: 'timeout' });
    }, workerTimeoutMs);
    try {
      child = forkProcess(childWorkerPath, [], {
        env: {
          LANG: 'C.UTF-8',
          LC_ALL: 'C.UTF-8',
          TZ: 'UTC'
        },
        execArgv: [],
        serialization: 'advanced',
        stdio: ['ignore', 'ignore', 'ignore', 'ipc']
      });
    } catch {
      finishUnstartedChild();
      return;
    }
    try {
      child.once('message', value => {
        message = value;
      });
      child.once('error', () => {
        beginTermination({ reason: 'child_error' });
      });
      child.once('exit', code => {
        exited = true;
        maybeFinish(code);
      });
    } catch {
      beginTermination({ reason: 'child_error' });
      return;
    }

    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();

    try {
      child.send({
        schema_version: 1,
        kind: 'governed_read_source_preflight_task',
        task
      }, error => {
        if (error) beginTermination({ reason: 'ipc_send_failure' });
      });
    } catch {
      beginTermination({ reason: 'ipc_send_failure' });
    }
  });
}

module.exports = {
  DEFAULT_SOURCE_PREFLIGHT_TIMEOUT_MS,
  SOURCE_PREFLIGHT_CHILD_PATH,
  runSourcePreflightProcess,
  validateSourcePreflightResponse,
  validateSourcePreflightTask
};
