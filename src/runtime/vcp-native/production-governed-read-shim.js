'use strict';

const { fork } = require('node:child_process');
const path = require('node:path');

const {
  createProductionSelectedDiarySourceProjection
} = require('./production-selected-diary-hydrator');
const {
  DEFAULT_PROVIDER_TIMEOUT_MS,
  createGovernedReadLeaseWorker,
  validateAbortSignal
} = require('./governed-read-lease-worker');
const {
  createGovernedReadShimHttpRuntime
} = require('./governed-read-shim-http-runtime');
const {
  PROVIDER_TASK_KIND,
  validateProviderResponse,
  validateProviderTask
} = require('./production-governed-read-provider-child');

const DEFAULT_PROVIDER_TERMINATION_GRACE_MS = 1_000;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const MODEL_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/u;
const PROVIDER_CHILD_PATH = path.join(
  __dirname,
  'production-governed-read-provider-child.js'
);

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

function validatePositiveInteger(value, minimum, maximum, code) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw codedError(code);
  }
  return value;
}

function validateLoopbackProviderUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw codedError('governed_read_provider_config_invalid');
  }
  if (parsed.protocol !== 'http:' ||
      parsed.hostname !== '127.0.0.1' ||
      !parsed.port ||
      parsed.pathname !== '/' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash) {
    throw codedError('governed_read_provider_config_invalid');
  }
  return parsed.origin;
}

function runVcpQueryEmbeddingProviderProcess(task, {
  childWorkerPath = PROVIDER_CHILD_PATH,
  workerTimeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
  terminationGraceMs =
    DEFAULT_PROVIDER_TERMINATION_GRACE_MS,
  forkProcess = fork,
  signal
} = {}) {
  validateProviderTask(task);
  validatePositiveInteger(
    workerTimeoutMs,
    10,
    60_000,
    'governed_read_provider_timeout_invalid'
  );
  validatePositiveInteger(
    terminationGraceMs,
    10,
    10_000,
    'governed_read_provider_termination_grace_invalid'
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
          validatedResponse = validateProviderResponse(message);
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
        // The governed-read child policy permits no escalation beyond the
        // exact SIGTERM above. Keep an unproven child referenced and IPC-bound
        // so it cannot become an invisible orphan after cleanup latches closed.
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
        kind: PROVIDER_TASK_KIND,
        task
      }, error => {
        if (error) {
          beginTermination({ reason: 'ipc_send_failure' });
        }
      });
    } catch {
      beginTermination({ reason: 'ipc_send_failure' });
    }
  });
}

function createVcpQueryEmbeddingProvider({
  vcpToolBoxRoot,
  apiUrl,
  apiKey,
  model,
  providerTimeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
  terminationGraceMs =
    DEFAULT_PROVIDER_TERMINATION_GRACE_MS,
  runProviderProcess =
    runVcpQueryEmbeddingProviderProcess
} = {}) {
  if (typeof vcpToolBoxRoot !== 'string' ||
      !path.isAbsolute(vcpToolBoxRoot) ||
      path.resolve(vcpToolBoxRoot) !== vcpToolBoxRoot ||
      typeof apiKey !== 'string' ||
      apiKey.length < 1 ||
      apiKey.length > 4096 ||
      apiKey.trim() !== apiKey ||
      /[\r\n\0]/u.test(apiKey) ||
      !MODEL_PATTERN.test(model || '') ||
      typeof runProviderProcess !== 'function') {
    throw codedError('governed_read_provider_config_invalid');
  }
  const endpoint = validateLoopbackProviderUrl(apiUrl);
  validatePositiveInteger(
    providerTimeoutMs,
    10,
    60_000,
    'governed_read_provider_config_invalid'
  );
  validatePositiveInteger(
    terminationGraceMs,
    10,
    10_000,
    'governed_read_provider_config_invalid'
  );
  return async function embedQuery({
    query,
    dimension,
    signal
  } = {}) {
    if (signal?.aborted) {
      throw codedError('governed_read_provider_cancelled');
    }
    let execution;
    try {
      const task = validateProviderTask({
        api_key: apiKey,
        api_url: endpoint,
        dimension,
        model,
        query,
        vcp_toolbox_root: vcpToolBoxRoot
      });
      execution = await runProviderProcess(task, {
        workerTimeoutMs: providerTimeoutMs,
        terminationGraceMs,
        signal
      });
    } catch (error) {
      if (error?.code ===
          'governed_read_provider_shutdown_incomplete') {
        throw error;
      }
      throw codedError(
        signal?.aborted
          ? 'governed_read_provider_cancelled'
          : 'governed_read_provider_call_failed'
      );
    }
    if (execution?.shutdown_complete !== true) {
      throw codedError(
        'governed_read_provider_shutdown_incomplete'
      );
    }
    if (signal?.aborted || execution.cancelled === true) {
      throw codedError('governed_read_provider_cancelled');
    }
    if (execution.child_started !== true ||
        execution.sigterm_sent !== false ||
        execution.termination_reason !== undefined ||
        execution.response === null) {
      throw codedError('governed_read_provider_call_failed');
    }
    const response = validateProviderResponse(execution.response);
    if (response.accepted !== true) {
      throw codedError(response.reason_code);
    }
    return Object.freeze({ vector: [...response.vector] });
  };
}

function createProductionGovernedReadShimRuntime({
  runtimeBindingDigest,
  host = '127.0.0.1',
  port,
  leaseRoot,
  vcpToolBoxRoot,
  sourceKnowledgeBaseStorePath,
  knowledgeBaseRootPath,
  dimension,
  provider,
  createSourceProjection =
    createProductionSelectedDiarySourceProjection,
  createLeaseWorker = createGovernedReadLeaseWorker,
  createHttpRuntime = createGovernedReadShimHttpRuntime,
  providerTimeoutMs = DEFAULT_PROVIDER_TIMEOUT_MS,
  providerTerminationGraceMs =
    DEFAULT_PROVIDER_TERMINATION_GRACE_MS,
  runProviderProcess
} = {}) {
  if (!DIGEST_PATTERN.test(runtimeBindingDigest || '') ||
      typeof createSourceProjection !== 'function' ||
      typeof createLeaseWorker !== 'function' ||
      typeof createHttpRuntime !== 'function' ||
      !provider ||
      typeof provider !== 'object' ||
      Array.isArray(provider)) {
    throw codedError(
      'production_governed_read_shim_config_invalid'
    );
  }
  const sourceProjection = createSourceProjection({
    sourceKnowledgeBaseStorePath,
    vcpToolBoxRoot
  });
  const providerWrapper = createVcpQueryEmbeddingProvider({
    vcpToolBoxRoot,
    apiUrl: provider.apiUrl,
    apiKey: provider.apiKey,
    model: provider.model,
    providerTimeoutMs,
    terminationGraceMs: providerTerminationGraceMs,
    runProviderProcess
  });
  const leaseWorker = createLeaseWorker({
    sourceProjection,
    providerWrapper,
    dimension,
    leaseRoot,
    vcpCodeRoot: vcpToolBoxRoot,
    sourceRuntimeRoot: vcpToolBoxRoot,
    sourceKnowledgeBaseStorePath,
    knowledgeBaseRootPath,
    providerTimeoutMs
  });
  return createHttpRuntime({
    leaseWorker,
    runtimeBindingDigest,
    host,
    port
  });
}

module.exports = {
  DEFAULT_PROVIDER_TERMINATION_GRACE_MS,
  PROVIDER_CHILD_PATH,
  createProductionGovernedReadShimRuntime,
  createVcpQueryEmbeddingProvider,
  runVcpQueryEmbeddingProviderProcess,
  validateLoopbackProviderUrl
};
