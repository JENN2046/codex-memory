'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  PROVIDER_CHILD_PATH,
  createProductionGovernedReadShimRuntime,
  createVcpQueryEmbeddingProvider,
  runVcpQueryEmbeddingProviderProcess,
  validateLoopbackProviderUrl
} = require(
  '../src/runtime/vcp-native/production-governed-read-shim'
);
const {
  PROVIDER_TASK_KIND,
  runVcpQueryEmbeddingTask
} = require(
  '../src/runtime/vcp-native/production-governed-read-provider-child'
);

function providerTask(overrides = {}) {
  return {
    api_key: 'synthetic-provider-key',
    api_url: 'http://127.0.0.1:3000',
    dimension: 2,
    model: 'synthetic-embedding-model',
    query: 'one bounded query',
    vcp_toolbox_root: '/synthetic/VCPToolBox',
    ...overrides
  };
}

function successfulProviderResponse(vector = [0.25, 0.75]) {
  return {
    accepted: true,
    kind: 'governed_read_provider_result',
    reason_code: null,
    schema_version: 1,
    vector
  };
}

class FakeProviderChild extends EventEmitter {
  constructor({ onKill, onSend } = {}) {
    super();
    this.connected = true;
    this.pid = 4321;
    this.sent = [];
    this.signals = [];
    this.unrefCalled = false;
    this.onKill = onKill;
    this.onSend = onSend;
  }

  send(message, callback) {
    this.sent.push(message);
    this.onSend?.(message);
    callback?.(null);
  }

  kill(signal) {
    this.signals.push(signal);
    this.onKill?.(signal);
    return true;
  }

  disconnect() {
    this.connected = false;
  }

  unref() {
    this.unrefCalled = true;
  }
}

test('provider child performs one exact VCP batch call with child-local console suppression', async () => {
  const calls = [];
  const disclosedProviderLogs = [];
  const originalConsole = {
    debug: console.debug,
    error: console.error,
    info: console.info,
    log: console.log,
    warn: console.warn
  };
  for (const method of Object.keys(originalConsole)) {
    console[method] = value => disclosedProviderLogs.push(value);
  }
  let response;
  try {
    response = await runVcpQueryEmbeddingTask(providerTask(), {
      environment: {},
      loadEmbeddingUtils(root) {
        assert.equal(root, '/synthetic/VCPToolBox');
        return {
          async getEmbeddingsBatch(texts, config) {
            calls.push({ texts, config });
            console.error('synthetic raw provider error');
            console.log('synthetic raw provider response');
            console.warn('synthetic provider warning');
            return [[0.25, 0.75]];
          }
        };
      }
    });
  } finally {
    for (const [method, value] of
      Object.entries(originalConsole)) {
      console[method] = value;
    }
  }
  assert.deepEqual(disclosedProviderLogs, []);
  assert.deepEqual(response, successfulProviderResponse());
  assert.deepEqual(calls, [{
    texts: ['one bounded query'],
    config: {
      apiUrl: 'http://127.0.0.1:3000',
      apiKey: 'synthetic-provider-key',
      model: 'synthetic-embedding-model'
    }
  }]);
});

test('provider child discards raw load and call errors and restores its console', async () => {
  await assert.rejects(
    runVcpQueryEmbeddingTask(providerTask(), {
      environment: {},
      loadEmbeddingUtils() {
        throw new Error(
          'synthetic raw module path and provider configuration'
        );
      }
    }),
    error => (
      error?.code === 'governed_read_provider_runtime_invalid' &&
      !String(error?.message).includes('synthetic raw')
    )
  );

  const originalConsoleError = console.error;
  await assert.rejects(
    runVcpQueryEmbeddingTask(providerTask(), {
      environment: {},
      loadEmbeddingUtils() {
        return {
          async getEmbeddingsBatch() {
            console.error('synthetic raw provider response');
            throw new Error(
              'API Error 500: synthetic raw provider response'
            );
          }
        };
      }
    }),
    error => (
      error?.code === 'governed_read_provider_call_failed' &&
      !String(error?.message).includes('synthetic raw')
    )
  );
  assert.equal(console.error, originalConsoleError);
});

test('production provider wrapper delegates one query to the isolated provider process', async () => {
  const calls = [];
  const cancellation = new AbortController();
  const provider = createVcpQueryEmbeddingProvider({
    vcpToolBoxRoot: '/synthetic/VCPToolBox',
    apiUrl: 'http://127.0.0.1:3000',
    apiKey: 'synthetic-provider-key',
    model: 'synthetic-embedding-model',
    providerTimeoutMs: 1234,
    terminationGraceMs: 321,
    async runProviderProcess(task, options) {
      calls.push({ task, options });
      return {
        response: successfulProviderResponse(),
        shutdown_complete: true,
        sigterm_sent: false,
        cancelled: false,
        child_started: true
      };
    }
  });
  assert.deepEqual(
    await provider({
      query: 'one bounded query',
      dimension: 2,
      signal: cancellation.signal
    }),
    { vector: [0.25, 0.75] }
  );
  assert.deepEqual(calls, [{
    task: providerTask(),
    options: {
      workerTimeoutMs: 1234,
      terminationGraceMs: 321,
      signal: cancellation.signal
    }
  }]);
  assert.equal(
    validateLoopbackProviderUrl('http://127.0.0.1:3000'),
    'http://127.0.0.1:3000'
  );
  assert.throws(
    () => validateLoopbackProviderUrl(
      'https://provider.example/v1'
    ),
    { code: 'governed_read_provider_config_invalid' }
  );
});

test('provider process cancellation terminates only its exact child and waits for exit', async () => {
  const cancellation = new AbortController();
  let forkOptions;
  let child;
  child = new FakeProviderChild({
    onKill() {
      setImmediate(() => {
        child.connected = false;
        child.emit('exit', null, 'SIGTERM');
      });
    }
  });
  const pending = runVcpQueryEmbeddingProviderProcess(
    providerTask(),
    {
      forkProcess(childPath, args, options) {
        assert.equal(childPath, PROVIDER_CHILD_PATH);
        assert.deepEqual(args, []);
        forkOptions = options;
        return child;
      },
      signal: cancellation.signal,
      terminationGraceMs: 50,
      workerTimeoutMs: 1000
    }
  );
  await new Promise(resolve => setImmediate(resolve));
  cancellation.abort();
  const execution = await pending;
  assert.deepEqual(execution, {
    response: null,
    shutdown_complete: true,
    sigterm_sent: true,
    cancelled: true,
    child_started: true,
    termination_reason: 'cancelled'
  });
  assert.deepEqual(child.signals, ['SIGTERM']);
  assert.equal(child.signals.includes('SIGKILL'), false);
  assert.deepEqual(Object.keys(forkOptions.env).sort(), [
    'LANG',
    'LC_ALL',
    'TZ'
  ]);
  assert.deepEqual(forkOptions.execArgv, []);
  assert.deepEqual(forkOptions.stdio, [
    'ignore',
    'ignore',
    'ignore',
    'ipc'
  ]);
  assert.deepEqual(child.sent, [{
    schema_version: 1,
    kind: PROVIDER_TASK_KIND,
    task: providerTask()
  }]);
});

test('provider process timeout terminates its exact child without accepting a late response', async () => {
  let child;
  child = new FakeProviderChild({
    onKill() {
      setImmediate(() => {
        child.emit(
          'message',
          successfulProviderResponse([0.5, 0.5])
        );
        child.connected = false;
        child.emit('exit', null, 'SIGTERM');
      });
    }
  });
  const execution = await runVcpQueryEmbeddingProviderProcess(
    providerTask(),
    {
      forkProcess: () => child,
      terminationGraceMs: 50,
      workerTimeoutMs: 10
    }
  );
  assert.deepEqual(execution, {
    response: null,
    shutdown_complete: true,
    sigterm_sent: true,
    cancelled: false,
    child_started: true,
    termination_reason: 'timeout'
  });
  assert.deepEqual(child.signals, ['SIGTERM']);
});

test('provider process completes a real minimal fork and returns only the bounded vector', async t => {
  const vcpRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'codex-memory-provider-child-')
  );
  t.after(() => {
    fs.rmSync(vcpRoot, { recursive: true, force: true });
  });
  fs.writeFileSync(
    path.join(vcpRoot, 'EmbeddingUtils.js'),
    [
      "'use strict';",
      'module.exports = {',
      '  async getEmbeddingsBatch(texts, config) {',
      "    if (texts.length !== 1 || config.model !== 'synthetic-embedding-model') throw new Error('invalid fixture call');",
      '    return [[0.25, 0.75]];',
      '  }',
      '};',
      ''
    ].join('\n'),
    'utf8'
  );
  const execution = await runVcpQueryEmbeddingProviderProcess(
    providerTask({ vcp_toolbox_root: vcpRoot }),
    {
      terminationGraceMs: 100,
      workerTimeoutMs: 2000
    }
  );
  assert.deepEqual(execution, {
    response: successfulProviderResponse(),
    shutdown_complete: true,
    sigterm_sent: false,
    cancelled: false,
    child_started: true
  });
});

test('stalled provider process never mutes the persistent Shim console', async () => {
  const originalConsole = {
    debug: console.debug,
    error: console.error,
    info: console.info,
    log: console.log,
    warn: console.warn
  };
  const cancellation = new AbortController();
  const provider = createVcpQueryEmbeddingProvider({
    vcpToolBoxRoot: '/synthetic/VCPToolBox',
    apiUrl: 'http://127.0.0.1:3000',
    apiKey: 'synthetic-provider-key',
    model: 'synthetic-embedding-model',
    runProviderProcess(_task, { signal }) {
      return new Promise(resolve => {
        signal.addEventListener('abort', () => {
          resolve({
            response: null,
            shutdown_complete: true,
            sigterm_sent: true,
            cancelled: true,
            child_started: true,
            termination_reason: 'cancelled'
          });
        }, { once: true });
      });
    }
  });
  const pending = provider({
    query: 'one bounded query',
    dimension: 2,
    signal: cancellation.signal
  });
  for (const [method, value] of Object.entries(originalConsole)) {
    assert.equal(console[method], value);
  }
  cancellation.abort();
  await assert.rejects(
    pending,
    { code: 'governed_read_provider_cancelled' }
  );
  for (const [method, value] of Object.entries(originalConsole)) {
    assert.equal(console[method], value);
  }
});

test('unproven provider child shutdown outranks cancellation and remains fail closed', async () => {
  const cancellation = new AbortController();
  const provider = createVcpQueryEmbeddingProvider({
    vcpToolBoxRoot: '/synthetic/VCPToolBox',
    apiUrl: 'http://127.0.0.1:3000',
    apiKey: 'synthetic-provider-key',
    model: 'synthetic-embedding-model',
    runProviderProcess(_task, { signal }) {
      return new Promise(resolve => {
        signal.addEventListener('abort', () => {
          resolve({
            response: null,
            shutdown_complete: false,
            sigterm_sent: true,
            cancelled: true,
            child_started: true,
            termination_reason: 'cancelled'
          });
        }, { once: true });
      });
    }
  });
  const pending = provider({
    query: 'one bounded query',
    dimension: 2,
    signal: cancellation.signal
  });
  cancellation.abort();
  await assert.rejects(
    pending,
    { code: 'governed_read_provider_shutdown_incomplete' }
  );
});

test('production governed-read Shim composes projection, isolated provider, lease worker, and bound HTTP runtime', () => {
  const captured = {};
  const runtime = { marker: 'runtime' };
  const runProviderProcess = async () => ({
    response: successfulProviderResponse(),
    shutdown_complete: true,
    sigterm_sent: false,
    cancelled: false,
    child_started: true
  });
  const result = createProductionGovernedReadShimRuntime({
    runtimeBindingDigest: `sha256:${'ab'.repeat(32)}`,
    host: '127.0.0.1',
    port: 7616,
    leaseRoot: '/synthetic/runtime/governed-read-leases',
    vcpToolBoxRoot: '/synthetic/VCPToolBox',
    sourceKnowledgeBaseStorePath:
      '/synthetic/VCPToolBox/VectorStore',
    knowledgeBaseRootPath:
      '/synthetic/VCPToolBox/dailynote',
    dimension: 2,
    providerTimeoutMs: 1234,
    providerTerminationGraceMs: 321,
    provider: {
      apiUrl: 'http://127.0.0.1:3000',
      apiKey: 'synthetic-provider-key',
      model: 'synthetic-embedding-model'
    },
    runProviderProcess,
    createSourceProjection(options) {
      captured.projection = options;
      return {
        preflight() {},
        preflightRequiresProcessIsolation: true
      };
    },
    createLeaseWorker(options) {
      captured.worker = options;
      return {
        async execute() {},
        snapshot() {
          return {};
        }
      };
    },
    createHttpRuntime(options) {
      captured.http = options;
      return runtime;
    }
  });
  assert.equal(result, runtime);
  assert.deepEqual(captured.projection, {
    sourceKnowledgeBaseStorePath:
      '/synthetic/VCPToolBox/VectorStore',
    vcpToolBoxRoot: '/synthetic/VCPToolBox'
  });
  assert.equal(captured.worker.dimension, 2);
  assert.equal(captured.worker.providerTimeoutMs, 1234);
  assert.equal(
    captured.worker.leaseRoot,
    '/synthetic/runtime/governed-read-leases'
  );
  assert.equal(
    captured.worker.sourceRuntimeRoot,
    '/synthetic/VCPToolBox'
  );
  assert.equal(
    typeof captured.worker.providerWrapper,
    'function'
  );
  assert.equal(captured.http.host, '127.0.0.1');
  assert.equal(captured.http.port, 7616);
  assert.equal(
    captured.http.runtimeBindingDigest,
    `sha256:${'ab'.repeat(32)}`
  );
});
