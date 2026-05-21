const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'src', 'cli', 'scoped-recall-evidence-probe.js');

function cleanProviderEnv(base = {}) {
  return {
    CODEX_MEMORY_EMBEDDING_URL: '',
    CODEX_MEMORY_EMBEDDING_API_KEY: '',
    CODEX_MEMORY_EMBEDDING_MODEL: '',
    CODEX_MEMORY_LOCAL_EMBEDDING_URL: '',
    CODEX_MEMORY_LOCAL_EMBEDDING_API_KEY: '',
    CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: '',
    CODEX_MEMORY_FALLBACK_EMBEDDING_URL: '',
    CODEX_MEMORY_FALLBACK_EMBEDDING_API_KEY: '',
    CODEX_MEMORY_FALLBACK_EMBEDDING_MODEL: '',
    EMBEDDING_API_URL: '',
    EMBEDDING_API_KEY: '',
    EMBEDDING_FALLBACK_API_URL: '',
    EMBEDDING_FALLBACK_API_KEY: '',
    EMBEDDING_FALLBACK_MODEL: '',
    WhitelistEmbeddingModel: '',
    CODEX_MEMORY_RERANK_URL: '',
    CODEX_MEMORY_RERANK_API_KEY: '',
    CODEX_MEMORY_RERANK_MODEL: '',
    ...base
  };
}

function runCli(args = [], env = {}) {
  return childProcess.spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env: { ...process.env, ...cleanProviderEnv(env) },
    encoding: 'utf8'
  });
}

function parseStdout(result) {
  return JSON.parse(result.stdout);
}

test('scoped recall evidence probe defaults to dry-run without mutation or raw values', () => {
  const rawQuery = 'raw-scoped-query-must-not-appear-in-probe-output';
  const rawClient = 'raw-client-id-must-not-appear-in-probe-output';
  const result = runCli(['--json', '--query', rawQuery, '--client-id', rawClient]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.includes(rawQuery), false);
  assert.equal(result.stdout.includes(rawClient), false);
  const payload = parseStdout(result);

  assert.equal(payload.mode, 'scoped-recall-evidence-probe');
  assert.equal(payload.status, 'dry_run');
  assert.equal(payload.decision, 'DRY_RUN_ONLY');
  assert.equal(payload.execute, false);
  assert.equal(payload.mutated, false);
  assert.equal(payload.readsRealMemory, false);
  assert.equal(payload.writesDurableState, false);
  assert.equal(payload.memoryWrites, 0);
  assert.equal(payload.providerCallsPerformed, false);
  assert.equal(payload.publicMcpExpanded, false);
  assert.equal(payload.readinessClaimAllowed, false);
  assert.equal(payload.boundedPlan.includeContent, false);
  assert.deepEqual(payload.boundedPlan.scopeDimensions, ['client_id', 'visibility']);
  assert.equal(payload.boundedPlan.scopeStrict, true);
  assert.equal(payload.boundedPlan.scopeClientIdProvided, true);
  assert.equal(typeof payload.boundedPlan.scopeClientIdSha256, 'string');
  assert.equal(payload.boundedPlan.workspaceScopeAllowed, false);
  assert.equal(payload.scopedRecallBefore.rawWorkspaceIdExposed, false);
});

test('scoped recall evidence probe rejects execute without explicit local-state write allowance', () => {
  const result = runCli(['--json', '--execute']);
  assert.equal(result.status, 2, result.stderr || result.stdout);
  const payload = parseStdout(result);

  assert.equal(payload.status, 'error');
  assert.equal(payload.reason, 'execute_requires_allow_local_state_writes');
  assert.equal(payload.execute, true);
  assert.equal(payload.mutated, false);
  assert.equal(payload.readinessClaimAllowed, false);
});

test('scoped recall evidence probe executes bounded local scoped audit probe without content output', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-scoped-recall-probe-'));
  const rawQuery = 'execute-scoped-raw-query-must-not-appear-in-probe-output';
  const rawClient = 'execute-client-id-must-not-appear-in-probe-output';

  try {
    const result = runCli([
      '--json',
      '--execute',
      '--allow-local-state-writes',
      '--query',
      rawQuery,
      '--client-id',
      rawClient,
      '--visibility',
      'private',
      '--limit',
      '1'
    ], {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_DATA_DIR: path.join(tempBasePath, 'data'),
      CODEX_MEMORY_LOGS_DIR: path.join(tempBasePath, 'logs'),
      CODEX_MEMORY_DIARY_PATH: path.join(tempBasePath, 'dailynote')
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stdout.includes(rawQuery), false);
    assert.equal(result.stdout.includes(rawClient), false);
    const payload = parseStdout(result);

    assert.equal(payload.status, 'executed');
    assert.equal(payload.decision, 'LOCAL_SCOPED_RECALL_AUDIT_EVIDENCE_COLLECTED_NOT_READY');
    assert.equal(payload.execute, true);
    assert.equal(payload.mutated, true);
    assert.equal(payload.readsRealMemory, true);
    assert.equal(payload.writesDurableState, true);
    assert.equal(payload.durableRecallAuditWrite, true);
    assert.equal(payload.memoryWrites, 0);
    assert.equal(payload.realMemoryReadQueryCount, 1);
    assert.equal(payload.providerCallsPerformed, false);
    assert.equal(payload.publicMcpExpanded, false);
    assert.equal(payload.readinessClaimAllowed, false);
    assert.equal(payload.searchSummary.contentReturned, false);
    assert.equal(payload.searchSummary.rawQueryReturned, false);
    assert.equal(payload.searchSummary.rawMemoryContentReturned, false);
    assert.equal(payload.searchSummary.rawScopeValuesReturned, false);
    assert.equal(payload.scopedRecallAfter.status, 'ok');
    assert.equal(payload.scopedRecallAfter.evidenceState, 'recent_strict_scoped_recall');
    assert.equal(payload.scopedRecallAfter.recentScopedRecallCount, 1);
    assert.equal(payload.scopedRecallAfter.recentStrictScopedRecallCount, 1);
    assert.equal(payload.scopedRecallAfter.rawWorkspaceIdExposed, false);
    assert.equal(payload.scopedRecallAfter.readinessClaimAllowed, false);
    assert.deepEqual(payload.scopedRecallAfter.scopeDimensionBreakdown, {
      client_id: 1,
      visibility: 1
    });
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('scoped recall evidence probe fails closed when provider config is present', async () => {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-scoped-recall-provider-'));

  try {
    const result = runCli([
      '--json',
      '--execute',
      '--allow-local-state-writes'
    ], {
      CODEX_MEMORY_BASE_PATH: tempBasePath,
      CODEX_MEMORY_LOCAL_EMBEDDING_URL: 'http://127.0.0.1:9999/v1',
      CODEX_MEMORY_LOCAL_EMBEDDING_MODEL: 'bge-m3-local'
    });

    assert.equal(result.status, 2, result.stderr || result.stdout);
    const payload = parseStdout(result);
    assert.equal(payload.status, 'error');
    assert.equal(payload.reason, 'external_provider_configuration_detected_fail_closed');
    assert.equal(payload.mutated, false);
    assert.equal(payload.readinessClaimAllowed, false);
    assert.equal(payload.boundedPlan.externalEmbeddingConfigured, true);
  } finally {
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
});

test('scoped recall evidence probe rejects side-effectful, workspace, and unknown flags', () => {
  for (const flag of ['--include-content', '--record-memory', '--provider', '--workspace-id', '--readiness-claim', '--definitely-unknown']) {
    const result = runCli(['--json', flag]);
    assert.equal(result.status, 2, `${flag} should be rejected`);
    const payload = parseStdout(result);
    assert.equal(payload.status, 'error');
    assert.equal(payload.rejectedFlag, flag);
    assert.equal(payload.readinessClaimAllowed, false);
  }
});
