const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const {
  createStreamableHttpServer,
  SESSION_HEADER,
  PUBLIC_REQUEST_BLOCKED,
  buildPolicyGateSummary,
  createSessionHardeningConfig,
  getHttpAuthWarning
} = require('../src/adapters/codex-mcp/http');

const NO_TOKEN_OVERVIEW_KEYS = [
  'access',
  'activeMemoryHealth',
  'adapterStatus',
  'cacheHealth',
  'indexHealth',
  'recall',
  'shadowSync',
  'summary'
];

const NO_TOKEN_OVERVIEW_ACCESS_KEYS = [
  'detailFieldsReturned',
  'embeddingFingerprintReturned',
  'memoryLinksReturned',
  'mode',
  'pathsReturned',
  'publicAccess',
  'recallRecentReturned',
  'recentAuditReturned',
  'recentFilesReturned',
  'selectedProjection',
  'selectedProjectionVersion'
];

const HEALTH_ACCESS_KEYS = [
  'bearerTokenRequiredForMcpTools',
  'embeddingFingerprintReturned',
  'filesystemPathsReturned',
  'mode',
  'rawMemoryFieldsReturned',
  'rawStoreFieldsReturned',
  'runtimeDetailLevel',
  'selectedProjection',
  'selectedProjectionVersion',
  'tokenMaterialReturned'
];

const LOW_DISCLOSURE_HEALTH_KEYS = [
  'auth',
  'name',
  'ok',
  'path',
  'protocol',
  'runtimeFreshness',
  'version'
];

const RUNTIME_FRESHNESS_KEYS = [
  'algorithm',
  'sourceFileCount',
  'sourceFingerprint',
  'startedAt'
];

async function withHttpServer(handler, serverOptions = {}, appOverrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    httpPort: 0,
    allowExternalProvider: false,
    ...appOverrides
  });

  await app.initialize();
  const httpServer = createStreamableHttpServer({
    app,
    host: '127.0.0.1',
    port: 0,
    mcpPath: '/mcp/codex-memory',
    ...serverOptions
  });

  const address = await httpServer.listen();

  try {
    await handler({ app, address, httpServer });
  } finally {
    await httpServer.close();
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('HTTP MCP should initialize and return a session header', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'codex-memory-http-test',
            version: '1.0'
          }
        }
      })
    });

    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.ok(response.headers.get(SESSION_HEADER));
    assert.equal(payload.result.serverInfo.name, 'vcp_codex_memory');
    assert.equal(payload.result.protocolVersion, '2025-03-26');
  });
});

test('HTTP MCP should expose health and tools/list', async () => {
  await withHttpServer(async ({ app, address }) => {
    assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);

    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'));
    const healthPayload = await health.json();
    assert.equal(health.status, 200);
    assert.equal(healthPayload.ok, true);
    assert.deepEqual(Object.keys(healthPayload).sort(), LOW_DISCLOSURE_HEALTH_KEYS);
    assert.deepEqual(Object.keys(healthPayload.auth).sort(), ['required']);
    assert.deepEqual(Object.keys(healthPayload.runtimeFreshness).sort(), RUNTIME_FRESHNESS_KEYS);
    assert.equal(healthPayload.auth.required, false);
    const serializedHealth = JSON.stringify(healthPayload);
    assert.doesNotMatch(serializedHealth, /test-token/i);
    assert.doesNotMatch(serializedHealth, /loopback host without a bearer token/i);
    assert.equal(healthPayload.access, undefined);
    assert.equal(healthPayload.sessionHardening, undefined);
    assert.equal(healthPayload.policyGates, undefined);
    assert.equal(healthPayload.runtime, undefined);
    assert.doesNotMatch(serializedHealth, /"embeddingProfile"\s*:/);
    assert.doesNotMatch(serializedHealth, /memoryId/i);
    assert.doesNotMatch(serializedHealth, /auditLogPath/i);
    assert.doesNotMatch(serializedHealth, /processDiaryPath/i);
    assert.doesNotMatch(serializedHealth, /knowledgeDiaryPath/i);
    assert.doesNotMatch(serializedHealth, /candidateCachePath/i);
    assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);

    const tools = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await tools.json();
    assert.equal(payload.result.tools.length, 7);
  });
});

test('HTTP MCP bearer-configured no-token health remains low disclosure', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'));
    const healthPayload = await health.json();
    const serializedHealth = JSON.stringify(healthPayload);

    assert.equal(health.status, 200);
    assert.equal(healthPayload.ok, true);
    assert.deepEqual(Object.keys(healthPayload).sort(), LOW_DISCLOSURE_HEALTH_KEYS);
    assert.deepEqual(Object.keys(healthPayload.auth).sort(), ['required']);
    assert.deepEqual(Object.keys(healthPayload.runtimeFreshness).sort(), RUNTIME_FRESHNESS_KEYS);
    assert.equal(healthPayload.auth.required, true);
    assert.equal(healthPayload.access, undefined);
    assert.equal(healthPayload.sessionHardening, undefined);
    assert.equal(healthPayload.policyGates, undefined);
    assert.equal(healthPayload.runtime, undefined);
    assert.doesNotMatch(serializedHealth, /test-token/i);
    assert.doesNotMatch(serializedHealth, /"embeddingProfile"\s*:/);
    assert.doesNotMatch(serializedHealth, /memoryId/i);
    assert.doesNotMatch(serializedHealth, /auditLogPath/i);
    assert.doesNotMatch(serializedHealth, /processDiaryPath/i);
    assert.doesNotMatch(serializedHealth, /knowledgeDiaryPath/i);
    assert.doesNotMatch(serializedHealth, /candidateCachePath/i);
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP no-token loopback warning is explicit and non-loopback remains fail closed', () => {
  const warning = getHttpAuthWarning({ host: '127.0.0.1', bearerToken: '' });

  assert.match(warning, /loopback/i);
  assert.match(warning, /CODEX_MEMORY_HTTP_TOKEN/);
  assert.match(warning, /local development only/i);
  assert.match(warning, /Do not expose this listener beyond this machine/i);
  assert.doesNotMatch(warning, /ready/i);
  assert.doesNotMatch(warning, /safe for production/i);
  assert.equal(getHttpAuthWarning({ host: '127.0.0.1', bearerToken: 'test-token' }), null);
  assert.throws(
    () => getHttpAuthWarning({ host: '0.0.0.0', bearerToken: '' }),
    /CODEX_MEMORY_HTTP_TOKEN is required/
  );
});

test('HTTP MCP policy gate summary is bounded and omits provider, path, and token material', () => {
  const summary = buildPolicyGateSummary({
    config: {
      securityProfile: 'hardened',
      enableSoftReadPolicy: true,
      enableLifecycleReadPolicy: false,
      enableWritePreflight: true,
      allowExternalProvider: false,
      embeddingUrl: 'https://provider.example.test/v1/embeddings',
      embeddingModel: 'private-model',
      httpLogPath: 'C:\\Users\\admin\\.env',
      bearerToken: 'test-token'
    }
  });
  const serialized = JSON.stringify(summary);

  assert.deepEqual(Object.keys(summary).sort(), [
    'externalProviderAllowed',
    'lifecycleReadPolicyEnabled',
    'securityProfile',
    'softReadPolicyEnabled',
    'writePreflightEnabled'
  ]);
  assert.deepEqual(summary, {
    securityProfile: 'hardened',
    softReadPolicyEnabled: true,
    lifecycleReadPolicyEnabled: false,
    writePreflightEnabled: true,
    externalProviderAllowed: false
  });
  assert.doesNotMatch(serialized, /provider\.example/i);
  assert.doesNotMatch(serialized, /private-model/i);
  assert.doesNotMatch(serialized, /C:\\Users/i);
  assert.doesNotMatch(serialized, /test-token/i);
});

test('HTTP MCP bearer health returns full bounded payload with valid token only', async () => {
  await withHttpServer(async ({ app, address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    const healthPayload = await health.json();
    const serializedHealth = JSON.stringify(healthPayload);

    assert.equal(health.status, 200);
    assert.equal(healthPayload.ok, true);
    assert.deepEqual(Object.keys(healthPayload.access).sort(), HEALTH_ACCESS_KEYS);
    assert.equal(healthPayload.access.mode, 'health_full');
    assert.equal(healthPayload.access.selectedProjection, false);
    assert.equal(healthPayload.access.selectedProjectionVersion, 1);
    assert.equal(healthPayload.access.bearerTokenRequiredForMcpTools, true);
    assert.equal(healthPayload.access.tokenMaterialReturned, false);
    assert.equal(healthPayload.access.filesystemPathsReturned, false);
    assert.equal(healthPayload.access.rawStoreFieldsReturned, false);
    assert.equal(healthPayload.access.rawMemoryFieldsReturned, false);
    assert.equal(healthPayload.access.embeddingFingerprintReturned, false);
    assert.equal(healthPayload.access.runtimeDetailLevel, 'bounded');
    assert.equal(healthPayload.auth.required, true);
    assert.equal(healthPayload.auth.warning, null);
    assert.deepEqual(Object.keys(healthPayload.policyGates).sort(), [
      'externalProviderAllowed',
      'lifecycleReadPolicyEnabled',
      'securityProfile',
      'softReadPolicyEnabled',
      'writePreflightEnabled'
    ]);
    assert.equal(healthPayload.policyGates.securityProfile, 'hardened');
    assert.equal(healthPayload.policyGates.softReadPolicyEnabled, true);
    assert.equal(healthPayload.policyGates.lifecycleReadPolicyEnabled, false);
    assert.equal(healthPayload.policyGates.writePreflightEnabled, true);
    assert.equal(healthPayload.policyGates.externalProviderAllowed, false);
    assert.deepEqual(Object.keys(healthPayload.runtime).sort(), ['writeReconcileWorker']);
    assert.deepEqual(Object.keys(healthPayload.runtime.writeReconcileWorker).sort(), [
      'available',
      'dryRun',
      'intervalMs',
      'lastResultSummary',
      'limit',
      'maxRuns',
      'runCount',
      'running',
      'tickInFlight',
      'timerScheduled'
    ]);
    assert.equal(healthPayload.runtime.writeReconcileWorker.available, true);
    assert.equal(healthPayload.runtime.writeReconcileWorker.running, false);
    assert.equal(healthPayload.runtime.writeReconcileWorker.timerScheduled, false);
    assert.equal(healthPayload.runtime.writeReconcileWorker.tickInFlight, false);
    assert.equal(healthPayload.runtime.writeReconcileWorker.runCount, 0);
    assert.equal(healthPayload.runtime.writeReconcileWorker.lastResultSummary, null);
    assert.equal(app.services.memoryWriteReconcileWorker.isRunning(), false);
    assert.doesNotMatch(serializedHealth, /test-token/i);
    assert.doesNotMatch(serializedHealth, /example\.invalid/i);
    assert.doesNotMatch(serializedHealth, /memoryId/i);
    assert.doesNotMatch(serializedHealth, /auditLogPath/i);
  }, { bearerToken: 'test-token' }, {
    securityProfile: 'hardened',
    enableLifecycleReadPolicy: false,
    enableWritePreflight: true,
    allowExternalProvider: false,
    embeddingUrl: 'http://example.invalid',
    embeddingModel: 'private-model'
  });
});

test('HTTP MCP bearer-configured health rejects invalid token before full payload', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer wrong-token'
      }
    });
    const healthPayload = await health.json();

    assert.equal(health.status, 401);
    assert.equal(healthPayload.error, 'Unauthorized');
    assert.equal(healthPayload.runtime, undefined);
    assert.equal(healthPayload.sessionHardening, undefined);
    assert.equal(healthPayload.policyGates, undefined);
    assert.equal(healthPayload.access, undefined);
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP health exposes bounded runtime freshness metadata', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'));
    const healthPayload = await health.json();
    const serializedHealth = JSON.stringify(healthPayload);

    assert.equal(health.status, 200);
    assert.deepEqual(Object.keys(healthPayload.runtimeFreshness).sort(), RUNTIME_FRESHNESS_KEYS);
    assert.equal(healthPayload.runtimeFreshness.algorithm, 'sha256');
    assert.equal(healthPayload.runtimeFreshness.sourceFingerprint, 'abc123');
    assert.equal(healthPayload.runtimeFreshness.sourceFileCount, 7);
    assert.equal(healthPayload.runtimeFreshness.startedAt, '2026-06-09T00:00:00.000Z');
    assert.doesNotMatch(serializedHealth, /Bearer\s+/i);
    assert.doesNotMatch(serializedHealth, /Authorization/i);
    assert.doesNotMatch(serializedHealth, /memoryId/i);
    assert.doesNotMatch(serializedHealth, /auditLogPath/i);
  }, {
    runtimeFreshness: {
      algorithm: 'sha256',
      sourceFingerprint: 'abc123',
      sourceFileCount: 7,
      startedAt: '2026-06-09T00:00:00.000Z'
    }
  });
});

test('HTTP MCP health should sanitize write reconcile worker last result summary with allowlist', async () => {
  await withHttpServer(async ({ app, address }) => {
    const originalGetStatus = app.services.memoryWriteReconcileWorker.getStatus;
    app.services.memoryWriteReconcileWorker.getStatus = () => ({
      available: true,
      running: false,
      timerScheduled: false,
      tickInFlight: false,
      runCount: '7',
      intervalMs: '1000',
      limit: '3',
      dryRun: false,
      maxRuns: '9',
      lastResultSummary: {
        success: false,
        decision: 'completed_with_failures',
        workerDecision: 'run_once_completed',
        dryRun: false,
        limit: 3,
        scannedTaskCount: 2,
        replayedCount: 1,
        wouldReplayCount: 0,
        clearedCount: 1,
        failedCount: 1,
        skippedCount: 0,
        hasError: true,
        memoryId: 'codex-process-cm1068-raw-memory-id',
        results: [{ memoryId: 'codex-process-cm1068-nested-memory-id' }],
        error: 'cm1068 raw internal error'
      }
    });

    try {
      const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
        headers: {
          Authorization: 'Bearer test-token'
        }
      });
      const payload = await health.json();
      const worker = payload.runtime.writeReconcileWorker;

      assert.equal(health.status, 200);
      assert.equal(worker.runCount, 7);
      assert.equal(worker.intervalMs, 1000);
      assert.equal(worker.limit, 3);
      assert.equal(worker.maxRuns, 9);
      assert.deepEqual(Object.keys(worker.lastResultSummary).sort(), [
        'clearedCount',
        'decision',
        'dryRun',
        'failedCount',
        'hasError',
        'limit',
        'replayedCount',
        'scannedTaskCount',
        'skippedCount',
        'success',
        'workerDecision',
        'wouldReplayCount'
      ]);
      assert.equal(worker.lastResultSummary.failedCount, 1);
      assert.equal(worker.lastResultSummary.hasError, true);
      assert.equal(JSON.stringify(worker).includes('memoryId'), false);
      assert.equal(JSON.stringify(worker).includes('raw internal error'), false);
    } finally {
      app.services.memoryWriteReconcileWorker.getStatus = originalGetStatus;
    }
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP should reject browser-origin no-token POST writes', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://example.invalid',
        'Sec-Fetch-Site': 'cross-site'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error, 'Forbidden');
    assert.equal(payload.status, 'rejected');
    assert.equal(payload.reason, 'blocked');
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /bearer/i);
    assert.doesNotMatch(serialized, /token/i);
    assert.doesNotMatch(serialized, /origin/i);
    assert.doesNotMatch(serialized, /client/i);
  });
});

test('HTTP MCP should reject no-token simple POST content types', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/list',
        params: {}
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error, 'Forbidden');
    assert.equal(payload.status, 'rejected');
    assert.equal(payload.reason, 'blocked');
    const serialized = JSON.stringify(payload);
    assert.doesNotMatch(serialized, /application\/json/i);
    assert.doesNotMatch(serialized, /content-type/i);
    assert.doesNotMatch(serialized, /raw/i);
    assert.doesNotMatch(serialized, /api/i);
  });
});

test('HTTP MCP should fail fast when non-loopback host has no bearer token', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-auth-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  try {
    assert.throws(() => createStreamableHttpServer({
      app,
      host: '0.0.0.0',
      port: 0,
      mcpPath: '/mcp/codex-memory',
      bearerToken: ''
    }), /CODEX_MEMORY_HTTP_TOKEN is required/);
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('HTTP MCP should allow non-loopback host when bearer token is configured', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-http-auth-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  try {
    const httpServer = createStreamableHttpServer({
      app,
      host: '0.0.0.0',
      port: 0,
      mcpPath: '/mcp/codex-memory',
      bearerToken: 'test-token'
    });
    assert.equal(httpServer.authWarning, null);
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('HTTP MCP should reject no-token mutation tool calls', async () => {
  await withHttpServer(async ({ address }) => {
    const mutationCalls = [
      {
        name: 'record_memory',
        arguments: {
          target: 'process',
          title: 'HTTP no-token mutation',
          content: 'Type: checkpoint\nblocked no-token mutation',
          evidence: 'http no-token mutation contract test',
          validated: true,
          reusable: false,
          sensitivity: 'none'
        }
      },
      {
        name: 'validate_memory',
        arguments: {
          memoryId: 'future-public-mutation-tool',
          decision: 'reject'
        }
      }
    ];

    for (const [index, params] of mutationCalls.entries()) {
      const response = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 5 + index,
          method: 'tools/call',
          params
        })
      });
      const payload = await response.json();

      assert.equal(response.status, 403);
      assert.equal(payload.jsonrpc, '2.0');
      assert.equal(payload.id, 5 + index);
      assert.equal(payload.error.code, -32001);
      assert.equal(payload.error.message, 'Forbidden');
      assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
      assert.equal(payload.error.data.status, 'rejected');
      assert.equal(payload.error.data.reason, 'blocked');
    }

    const responseWithoutId = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: mutationCalls[0]
      })
    });
    const payloadWithoutId = await responseWithoutId.json();

    assert.equal(responseWithoutId.status, 403);
    assert.equal(payloadWithoutId.jsonrpc, '2.0');
    assert.equal(payloadWithoutId.id, null);
    assert.equal(payloadWithoutId.error.code, -32001);
    assert.equal(payloadWithoutId.error.message, 'Forbidden');
    assert.equal(payloadWithoutId.error.data.code, PUBLIC_REQUEST_BLOCKED);
    assert.equal(payloadWithoutId.error.data.status, 'rejected');
    assert.equal(payloadWithoutId.error.data.reason, 'blocked');
  });
});

test('HTTP MCP no-token search_memory should be rejected', async () => {
  await withHttpServer(async ({ app, address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'no-token search',
            target: 'process',
            limit: 3,
            include_content: false
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.jsonrpc, '2.0');
    assert.equal(payload.id, 7);
    assert.equal(payload.error.code, -32001);
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
    assert.equal(payload.error.data.status, 'rejected');
    assert.equal(payload.error.data.reason, 'blocked');
  });
});

test('HTTP MCP no-token search_memory should not call external embedding when cache is disabled', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'no-token search blocked',
            target: 'process',
            limit: 3,
            include_content: false
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error.code, -32001);
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
  }, {}, { enableEmbeddingCache: false });
});

test('HTTP MCP no-token search_memory should not call external rerank provider', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'no-token search blocked',
            target: 'process',
            limit: 3,
            include_content: false
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error.code, -32001);
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
  });
});

test('HTTP MCP no-token search_memory should reject include_content raw reads', async () => {
  await withHttpServer(async ({ address }) => {
    const response = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'search_memory',
          arguments: {
            query: 'no-token raw content read should be rejected',
            target: 'process',
            limit: 3,
            include_content: true
          }
        }
      })
    });
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.jsonrpc, '2.0');
    assert.equal(payload.id, 10);
    assert.equal(payload.error.code, -32001);
    assert.equal(payload.error.message, 'Forbidden');
    assert.equal(payload.error.data.code, PUBLIC_REQUEST_BLOCKED);
    assert.equal(payload.error.data.status, 'rejected');
    assert.equal(payload.error.data.reason, 'blocked');
  });
});

test('HTTP MCP no-token memory_overview should return selected safe overview without full overview execution', async () => {
  await withHttpServer(async ({ app, address }) => {
    const originalGetOverview = app.services.overviewService.getOverview;
    app.services.overviewService.getOverview = async () => {
      throw new Error('no-token memory_overview must use selected overview projection');
    };

    try {
      const response = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/call',
          params: {
            name: 'memory_overview',
            arguments: {
              limit: 3
            }
          }
        })
      });
      const payload = await response.json();
      const overview = payload.result.structuredContent;
      const serialized = JSON.stringify(overview);

      assert.equal(response.status, 200);
      assert.equal(payload.jsonrpc, '2.0');
      assert.equal(payload.id, 11);
      assert.equal(payload.result.isError, false);
      assert.equal(overview.access.mode, 'public_selected_overview');
      assert.equal(overview.access.selectedProjection, true);
      assert.equal(overview.access.selectedProjectionVersion, 2);
      assert.deepEqual(Object.keys(overview).sort(), NO_TOKEN_OVERVIEW_KEYS);
      assert.deepEqual(Object.keys(overview.access).sort(), NO_TOKEN_OVERVIEW_ACCESS_KEYS);
      assert.equal(overview.access.publicAccess, 'blocked');
      assert.equal(overview.access.pathsReturned, false);
      assert.equal(overview.access.embeddingFingerprintReturned, false);
      assert.equal(overview.access.recentAuditReturned, false);
      assert.equal(overview.access.recentFilesReturned, false);
      assert.equal(overview.access.memoryLinksReturned, false);
      assert.equal(overview.access.recallRecentReturned, false);
      assert.equal(overview.access.detailFieldsReturned, false);
      assert.equal(overview.summary.latestAcceptedAt, undefined);
      assert.equal(overview.summary.latestRejectedAt, undefined);
      assert.equal(overview.shadowSync.available, true);
      assert.doesNotMatch(serialized, /bearer/i);
      assert.doesNotMatch(serialized, /token/i);
      assert.doesNotMatch(serialized, /raw/i);
      assert.doesNotMatch(serialized, /lifecycle/i);
      assert.doesNotMatch(serialized, /mutation/i);
      assert.doesNotMatch(serialized, /provider/i);
      assert.doesNotMatch(serialized, /api/i);
      assert.doesNotMatch(serialized, /client/i);
      assert.doesNotMatch(serialized, /"paths"\s*:/);
      assert.doesNotMatch(serialized, /"latestAcceptedAt"\s*:/);
      assert.doesNotMatch(serialized, /"latestRejectedAt"\s*:/);
      assert.doesNotMatch(serialized, /"recentAudit"\s*:/);
      assert.doesNotMatch(serialized, /"recentFiles"\s*:/);
      assert.doesNotMatch(serialized, /"memoryLinks"\s*:/);
      assert.doesNotMatch(serialized, /"recent"\s*:/);
      assert.doesNotMatch(serialized, /"memoryId"\s*:/);
      assert.doesNotMatch(serialized, /"title"\s*:/);
      assert.doesNotMatch(serialized, /"filePath"\s*:/);
      assert.doesNotMatch(serialized, /"sourceFile"\s*:/);
      assert.doesNotMatch(serialized, /"embeddingFingerprint"\s*:/);
    } finally {
      app.services.overviewService.getOverview = originalGetOverview;
    }
  });
});

test('HTTP MCP bearer-configured missing-token tools/call should keep no-token contract', async () => {
  await withHttpServer(async ({ app, address }) => {
    const originalGetOverview = app.services.overviewService.getOverview;
    app.services.overviewService.getOverview = async () => {
      throw new Error('missing-token memory_overview must use selected overview projection');
    };

    try {
      const overviewResponse = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 111,
          method: 'tools/call',
          params: {
            name: 'memory_overview',
            arguments: {}
          }
        })
      });
      const overviewPayload = await overviewResponse.json();
      const overview = overviewPayload.result.structuredContent;

      assert.equal(overviewResponse.status, 200);
      assert.equal(overviewPayload.result.isError, false);
      assert.equal(overview.access.mode, 'public_selected_overview');
      assert.equal(overview.access.selectedProjection, true);
      assert.equal(overview.access.selectedProjectionVersion, 2);
      assert.doesNotMatch(JSON.stringify(overview), /bearer|token|raw|lifecycle|mutation|provider|api|client/i);

      const recordResponse = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 112,
          method: 'tools/call',
          params: {
            name: 'record_memory',
            arguments: {
              target: 'process',
              title: 'missing-token blocked mutation',
              content: 'blocked',
              evidence: 'missing-token regression',
              validated: true,
              reusable: false,
              sensitivity: 'none'
            }
          }
        })
      });
      const recordPayload = await recordResponse.json();

      assert.equal(recordResponse.status, 403);
      assert.equal(recordPayload.error.data.code, PUBLIC_REQUEST_BLOCKED);
      assert.doesNotMatch(JSON.stringify(recordPayload), /bearer|token|raw|lifecycle|mutation|provider|api|client/i);

      const searchResponse = await fetch(address.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 113,
          method: 'tools/call',
          params: {
            name: 'search_memory',
            arguments: {
              query: 'missing-token blocked search',
              target: 'process',
              limit: 3
            }
          }
        })
      });
      const searchPayload = await searchResponse.json();

      assert.equal(searchResponse.status, 403);
      assert.equal(searchPayload.error.data.code, PUBLIC_REQUEST_BLOCKED);
      assert.doesNotMatch(JSON.stringify(searchPayload), /bearer|token|raw|lifecycle|mutation|provider|api|client/i);
    } finally {
      app.services.overviewService.getOverview = originalGetOverview;
    }
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP should execute authenticated memory_overview through bounded projection by default', async () => {
  await withHttpServer(async ({ address }) => {
    const initResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      })
    });
    const sessionId = initResponse.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const overview = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
        [SESSION_HEADER]: sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'memory_overview',
          arguments: {
            limit: 3
          }
        }
      })
    });
    const payload = await overview.json();
    const structured = payload.result.structuredContent;
    const serialized = JSON.stringify(structured);

    assert.equal(overview.status, 200);
    assert.equal(payload.jsonrpc, '2.0');
    assert.equal(payload.id, 12);
    assert.equal(payload.result.isError, false);
    assert.equal(structured.access.mode, 'authenticated_bounded_overview');
    assert.equal(structured.access.selectedProjection, true);
    assert.equal(structured.access.selectedProjectionVersion, 2);
    assert.equal(structured.access.publicAccess, 'bounded');
    assert.equal(structured.access.pathsReturned, false);
    assert.equal(structured.access.embeddingFingerprintReturned, false);
    assert.equal(structured.access.recentAuditReturned, false);
    assert.equal(structured.access.recentFilesReturned, false);
    assert.equal(structured.access.memoryLinksReturned, false);
    assert.equal(structured.access.recallRecentReturned, false);
    assert.equal(structured.access.detailFieldsReturned, false);
    assert.deepEqual(Object.keys(structured).sort(), NO_TOKEN_OVERVIEW_KEYS);
    assert.deepEqual(Object.keys(structured.access).sort(), NO_TOKEN_OVERVIEW_ACCESS_KEYS);
    assert.equal(structured.shadowSync.available, true);
    assert.equal(structured.paths, undefined);
    assert.equal(structured.recentAudit, undefined);
    assert.equal(structured.memoryLinks, undefined);
    assert.equal(structured.recentFiles, undefined);
    assert.equal(structured.embeddingProfile, undefined);
    assert.doesNotMatch(serialized, /test-token/i);
    assert.doesNotMatch(serialized, /"paths"\s*:/);
    assert.doesNotMatch(serialized, /"recentAudit"\s*:/);
    assert.doesNotMatch(serialized, /"recentFiles"\s*:/);
    assert.doesNotMatch(serialized, /"memoryLinks"\s*:/);
    assert.doesNotMatch(serialized, /"recent"\s*:/);
    assert.doesNotMatch(serialized, /"memoryId"\s*:/);
    assert.doesNotMatch(serialized, /"title"\s*:/);
    assert.doesNotMatch(serialized, /"filePath"\s*:/);
    assert.doesNotMatch(serialized, /"sourceFile"\s*:/);
    assert.doesNotMatch(serialized, /"embeddingFingerprint"\s*:/);
    assert.doesNotMatch(serialized, /"auditLogPath"\s*:/);
    assert.doesNotMatch(serialized, /"providerEndpoint"\s*:/);
    assert.doesNotMatch(serialized, /Authorization/i);
    assert.doesNotMatch(serialized, /Bearer\s+/i);
  }, { bearerToken: 'test-token' });
});

test('HTTP MCP should execute record_memory through authorized tools/call', async () => {
  await withHttpServer(async ({ address }) => {
    const initResponse = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
      })
    });
    const sessionId = initResponse.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const record = await fetch(address.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
        [SESSION_HEADER]: sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'record_memory',
          arguments: {
            target: 'process',
            title: 'HTTP checkpoint',
            content: 'Type: checkpoint\nvia http server',
            evidence: 'http contract test',
            validated: true,
            reusable: false,
            sensitivity: 'none'
          }
        }
      })
    });
    const payload = await record.json();
    assert.equal(record.status, 200);
    assert.equal(payload.result.structuredContent.decision, 'accepted');
    assert.equal(payload.result.structuredContent.agentAlias, 'Codex');
  }, { bearerToken: 'test-token' });
});
test('HTTP MCP session hardening should expose invalid env fallback warnings', async () => {
  const hardening = createSessionHardeningConfig({
    CODEX_MEMORY_HTTP_SESSION_TTL_MS: 'not-a-number',
    CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS: '-1',
    CODEX_MEMORY_HTTP_MAX_SESSIONS: '999',
    CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION: '0',
    CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '1'
  });

  assert.equal(hardening.absoluteTtlMs, 30 * 60 * 1000);
  assert.equal(hardening.idleTtlMs, 10 * 60 * 1000);
  assert.equal(hardening.maxSessions, 64);
  assert.equal(hardening.maxStreamsPerSession, 8);
  assert.equal(hardening.cleanupIntervalMs, 60 * 1000);
  assert.deepEqual(hardening.warnings.map(warning => warning.key), [
    'CODEX_MEMORY_HTTP_SESSION_TTL_MS',
    'CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS',
    'CODEX_MEMORY_HTTP_MAX_SESSIONS',
    'CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION',
    'CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS'
  ]);
  assert.equal(hardening.warnings.some(warning => Object.hasOwn(warning, 'raw')), false);
});

test('HTTP MCP session hardening should reject max sessions plus one with 429', async () => {
  await withHttpServer(async ({ address }) => {
    const first = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });
    assert.equal(first.status, 200);
    assert.ok(first.headers.get(SESSION_HEADER));

    const second = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: {} })
    });
    const payload = await second.json();
    assert.equal(second.status, 429);
    assert.equal(payload.error, 'session_limit_exceeded');
    assert.equal(payload.code, 'HTTP_SESSION_LIMIT_EXCEEDED');
    assert.equal(payload.meta.limitType, 'sessions');
    assert.equal(payload.meta.limit, 1);
    assert.equal(JSON.stringify(payload).includes('Bearer'), false);
  }, {
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_SESSIONS: '1',
      CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '10000'
    }
  });
});

test('HTTP MCP session hardening cleanup after expiry should allow new sessions', async () => {
  let currentTime = 0;
  await withHttpServer(async ({ address, httpServer }) => {
    const first = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    });
    assert.equal(first.status, 200);

    currentTime = 6 * 60 * 1000;
    httpServer.cleanupExpiredSessions();

    const second = await fetch(address.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'initialize', params: {} })
    });
    assert.equal(second.status, 200);
    assert.ok(second.headers.get(SESSION_HEADER));
  }, {
    sessionClock: () => currentTime,
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_SESSIONS: '1',
      CODEX_MEMORY_HTTP_SESSION_TTL_MS: String(5 * 60 * 1000),
      CODEX_MEMORY_HTTP_SESSION_IDLE_TTL_MS: String(2 * 60 * 1000),
      CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '10000'
    }
  });
});

test('HTTP MCP session hardening should reject max streams plus one and allow after close', async () => {
  await withHttpServer(async ({ address }) => {
    const first = await fetch(address.url);
    assert.equal(first.status, 200);
    const sessionId = first.headers.get(SESSION_HEADER);
    assert.ok(sessionId);

    const second = await fetch(address.url, { headers: { [SESSION_HEADER]: sessionId } });
    const payload = await second.json();
    assert.equal(second.status, 429);
    assert.equal(payload.error, 'session_stream_limit_exceeded');
    assert.equal(payload.code, 'HTTP_SESSION_STREAM_LIMIT_EXCEEDED');
    assert.equal(payload.meta.limitType, 'streams_per_session');
    assert.equal(payload.meta.limit, 1);

    first.body.cancel();
    await new Promise(resolve => setTimeout(resolve, 10));

    const third = await fetch(address.url, { headers: { [SESSION_HEADER]: sessionId } });
    assert.equal(third.status, 200);
    third.body.cancel();
  }, {
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_STREAMS_PER_SESSION: '1',
      CODEX_MEMORY_HTTP_SESSION_CLEANUP_INTERVAL_MS: '10000'
    }
  });
});

test('HTTP MCP session hardening should expose sanitized warning metadata on health', async () => {
  await withHttpServer(async ({ address }) => {
    const health = await fetch(address.url.replace('/mcp/codex-memory', '/health'), {
      headers: {
        Authorization: 'Bearer test-token'
      }
    });
    const payload = await health.json();
    assert.equal(health.status, 200);
    assert.equal(payload.sessionHardening.maxSessions, 64);
    assert.equal(payload.sessionHardening.warnings[0].key, 'CODEX_MEMORY_HTTP_MAX_SESSIONS');
    assert.equal(Object.hasOwn(payload.sessionHardening.warnings[0], 'raw'), false);
  }, {
    bearerToken: 'test-token',
    sessionHardeningEnv: {
      CODEX_MEMORY_HTTP_MAX_SESSIONS: '999'
    }
  });
});
