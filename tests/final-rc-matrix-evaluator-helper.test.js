const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

const {
  BLOCKED_ACTIONS,
  FAIL_CLOSED_STATES,
  FAIL_CLOSED_STATUSES,
  PUBLIC_MCP_TOOLS,
  REQUIRED_EVIDENCE_IDS,
  REQUIRED_INPUT_KEYS,
  SAFE_SOURCE_TYPES,
  evaluateFinalRcMatrix,
  evaluateFixtureOnlyFinalRcMatrix,
  normalizeFixtureOnlyFinalRcMatrixInput,
  normalizeFinalRcMatrixEvaluation
} = require('../src/core/FinalRcMatrixEvaluator');

const fixturePath = path.join(__dirname, 'fixtures', 'p45-final-rc-matrix-evaluator-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function assertNoSensitiveSurface(value) {
  const text = JSON.stringify(value).toLowerCase();

  for (const forbidden of [
    'authorization:',
    'bearer ',
    'api_key',
    'raw_workspace_id',
    'token=',
    'password=',
    'a:\\',
    '.env',
    'https://example.test',
    'workspace_id'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
}

test('P45 evaluator summarizes explicit fixture input while staying NOT_READY_BLOCKED', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const evaluation = evaluateFinalRcMatrix(fixture);

  assert.equal(evaluation.sourceMode, 'explicit_input');
  assert.equal(evaluation.schemaVersion, 'p45-final-rc-matrix-evaluator-v1');
  assert.equal(evaluation.status, 'blocked_fail_closed');
  assert.equal(evaluation.decision, 'NOT_READY_BLOCKED');
  assert.equal(evaluation.inputContractAccepted, true);
  assert.equal(evaluation.passed, false);
  assert.equal(evaluation.failClosedReasons.includes('a5_blockers_unresolved'), true);
  assert.equal(evaluation.canClaimFullFinalRcMatrixExecuted, false);
  assert.equal(evaluation.canExecuteRunner, false);
  assert.equal(evaluation.canClaimFinalRcReady, false);
  assert.equal(evaluation.canClaimRuntimeReady, false);
  assert.equal(evaluation.runnerImplemented, false);
  assert.equal(evaluation.runnerExecuted, false);
  assert.equal(evaluation.finalRcMatrixExecuted, false);
  assert.equal(evaluation.fullFinalRcMatrixExecuted, false);
  assert.equal(evaluation.runtimeReady, false);
  assert.equal(evaluation.finalRcMatrixReady, false);
  assert.equal(evaluation.rcReady, false);
  assert.equal(evaluation.manifest.safe, true);
  assert.equal(evaluation.manifest.sourceMode, 'caller_provided');
  assert.equal(evaluation.manifest.evidenceCollectedByEvaluator, false);
  assert.equal(evaluation.manifest.helperExecutedByEvaluator, false);
  assert.equal(evaluation.evidence.requiredPresent, true);
  assert.equal(evaluation.evidence.safe, true);
  assert.deepEqual(evaluation.evidence.missingRequired, []);
  assert.deepEqual(evaluation.evidence.ids, REQUIRED_EVIDENCE_IDS);
  assert.equal(evaluation.a5Blockers.unresolvedCount, 5);
  assert.equal(evaluation.a5Blockers.preservedBlocked, true);
  assert.equal(evaluation.a5Blockers.callerResolutionAccepted, false);
  assert.deepEqual(evaluation.publicMcpTools, {
    frozen: true,
    tools: PUBLIC_MCP_TOOLS
  });
  assert.equal(evaluation.blockedActions.requiredPresent, true);
  assert.deepEqual(evaluation.blockedActions.missingRequired, []);
  assert.equal(evaluation.failClosedStates.requiredPresent, true);
  assert.deepEqual(evaluation.failClosedStates.missingRequired, []);
  assert.equal(evaluation.safety.noSideEffects, true);
  assert.equal(evaluation.safety.readsFiles, false);
  assert.equal(evaluation.safety.executesCommands, false);
  assert.equal(evaluation.safety.callsProviders, false);
  assert.equal(evaluation.safety.readsRealMemory, false);
  assert.equal(evaluation.safety.scansRuntimeStores, false);
  assert.equal(evaluation.safety.writesDurableMemory, false);
  assert.equal(evaluation.safety.expandsPublicMcp, false);
  assert.equal(JSON.stringify(fixture), before);
});

test('P45 evaluator normalizes allowlisted fields without arbitrary passthrough', () => {
  const fixture = loadFixture();
  const normalized = normalizeFinalRcMatrixEvaluation({
    ...fixture,
    authorization: 'authorization: Bearer SHOULD_NOT_PASS_THROUGH',
    raw_workspace_id: 'raw_workspace_id=workspace-raw',
    rawContent: 'raw production memory',
    exitCode: 0,
    cliSummary: {
      decision: 'READY_FOR_V1_0_RC'
    },
    providerLatency: 123
  });

  assert.equal(normalized.fixtureOnly, true);
  assert.equal(normalized.explicitInputOnly, true);
  assert.deepEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.blockedActions, BLOCKED_ACTIONS);
  assert.deepEqual(normalized.failClosedStates, FAIL_CLOSED_STATES);
  assert.deepEqual(normalized.evidence.map(evidence => evidence.id), REQUIRED_EVIDENCE_IDS);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'rawContent'), false);
  assert.equal(Object.hasOwn(normalized, 'exitCode'), false);
  assert.equal(Object.hasOwn(normalized, 'cliSummary'), false);
  assert.equal(Object.hasOwn(normalized, 'providerLatency'), false);
  assert.deepEqual(FAIL_CLOSED_STATUSES, FAIL_CLOSED_STATES);
  assert.deepEqual(REQUIRED_INPUT_KEYS, [
    'manifest',
    'evidence',
    'a5Blockers',
    'publicMcpTools',
    'blockedActions',
    'failClosedStates',
    'safety'
  ]);
  assert.deepEqual(
    normalizeFixtureOnlyFinalRcMatrixInput(fixture),
    normalizeFinalRcMatrixEvaluation(fixture)
  );
  assert.deepEqual(
    evaluateFixtureOnlyFinalRcMatrix(fixture),
    evaluateFinalRcMatrix(fixture)
  );
});

test('P45 evaluator does not perform implicit fs reads, directory scans, or command execution', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P45 evaluator');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists check during P45 evaluator');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P45 evaluator');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P45 evaluator');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P45 evaluator');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P45 evaluator');
  };

  try {
    const evaluation = evaluateFinalRcMatrix(fixture);

    assert.equal(evaluation.inputContractAccepted, true);
    assert.equal(evaluation.safety.readsFiles, false);
    assert.equal(evaluation.safety.executesCommands, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P45 evaluator does not import helpers, runtime stores, providers, or network modules', () => {
  const fixture = loadFixture();
  const originalLoad = Module._load;
  const originalFetch = globalThis.fetch;
  const blockedLoads = [
    'node:fs',
    'fs',
    'node:child_process',
    'child_process',
    'node:http',
    'http',
    'node:https',
    'https',
    './EvidenceManifestContract',
    './RecallMigrationIsolationContract',
    './ValidationAggregatorService',
    './FinalRcValidationMatrixManifest',
    '../storage/',
    './storage/',
    '../recall/',
    './recall/',
    '../adapters/',
    './Provider'
  ];

  Module._load = function patchedLoad(request, parent, isMain) {
    if (blockedLoads.some(blocked => request.includes(blocked))) {
      throw new Error(`unexpected P45 evaluator load: ${request}`);
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  globalThis.fetch = () => {
    throw new Error('unexpected P45 evaluator fetch');
  };

  try {
    const evaluation = evaluateFinalRcMatrix(fixture);

    assert.equal(evaluation.inputContractAccepted, true);
    assert.equal(evaluation.safety.callsProviders, false);
    assert.equal(evaluation.safety.scansRuntimeStores, false);
  } finally {
    Module._load = originalLoad;
    globalThis.fetch = originalFetch;
  }
});

test('P45 evaluator fails closed for malformed, missing manifest, or missing evidence input', () => {
  for (const badInput of [
    null,
    [],
    'not an object',
    {
      ...loadFixture(),
      manifest: {
        present: false
      }
    },
    {
      ...loadFixture(),
      evidence: []
    },
    {
      ...loadFixture(),
      evidence: loadFixture().evidence.filter(evidence => evidence.id !== 'p44_validation_aggregator_evidence_map')
    },
    {
      ...loadFixture(),
      evidence: undefined,
      evidenceSources: REQUIRED_EVIDENCE_IDS.map(id => ({
        id,
        path: `fixtures/${id}.json`
      }))
    }
  ]) {
    const evaluation = evaluateFinalRcMatrix(badInput);

    assert.match(evaluation.status, /fail_closed$/);
    assert.equal(evaluation.decision, 'NOT_READY_BLOCKED');
    assert.equal(evaluation.inputContractAccepted, false);
    assert.equal(evaluation.passed, false);
    assert.equal(evaluation.canClaimFullFinalRcMatrixExecuted, false);
    assert.equal(evaluation.canClaimFinalRcReady, false);
    assert.equal(evaluation.runtimeReady, false);
    assert.equal(evaluation.finalRcMatrixReady, false);
    assert.equal(evaluation.rcReady, false);
  }
});

test('P45 evaluator fails closed for warning-only, unknown, skipped, failed, blocked, or unsupported evidence', () => {
  const fixture = loadFixture();

  for (const status of FAIL_CLOSED_STATES) {
    const evaluation = evaluateFinalRcMatrix({
      ...fixture,
      evidence: fixture.evidence.map((evidence, index) => index === 0
        ? {
            ...evidence,
            status
          }
        : evidence
      )
    });

    assert.equal(evaluation.inputContractAccepted, false, status);
    assert.equal(evaluation.failClosedReasons.includes('critical_evidence_not_passed'), true, status);
    assert.equal(evaluation.evidence.unsafeCriticalIds.includes('p36_scope_a5_boundary'), true, status);
    assert.equal(evaluation.canClaimFinalRcReady, false, status);
  }
});

test('P45 evaluator rejects unsupported source type and runtime-observed evidence', () => {
  const fixture = loadFixture();
  const evaluation = evaluateFinalRcMatrix({
    ...fixture,
    evidence: fixture.evidence.map((evidence, index) => index === 0
      ? {
          ...evidence,
          sourceType: 'live_runtime_scan',
          observedFromRuntime: true
        }
      : evidence
    )
  });

  assert.equal(evaluation.inputContractAccepted, false);
  assert.equal(evaluation.evidence.safe, false);
  assert.deepEqual(evaluation.evidence.unsupportedSourceTypes, ['live_runtime_scan']);
  assert.equal(evaluation.failClosedReasons.includes('unsupported_source_type'), true);
  assert.equal(evaluation.safety.readsFiles, false);
  assert.equal(evaluation.safety.executesCommands, false);
});

test('P45 evaluator fails closed for readiness, execution, public MCP, safety, or A5 bypass claims', () => {
  const fixture = loadFixture();

  for (const unsafeInput of [
    { ...fixture, decision: 'READY_FOR_V1_0_RC' },
    { ...fixture, runtimeReady: true },
    { ...fixture, finalRcMatrixReady: true },
    { ...fixture, fullFinalRcMatrixExecuted: true },
    { ...fixture, rcReady: true },
    { ...fixture, publicMcpTools: ['record_memory', 'search_memory'] },
    { ...fixture, publicMcpTools: ['search_memory', 'record_memory', 'memory_overview'] },
    { ...fixture, publicMcpTools: ['record_memory', 'search_memory', 'memory_overview', 'memory_admin'] },
    { ...fixture, publicMcpTools: ['record_memory', 'search_memory', 'memory_overview', 'authorization: Bearer PUBLIC_TOOL_TOKEN_1234567890'] },
    { ...fixture, blockedActions: fixture.blockedActions.filter(action => action !== 'provider_call') },
    { ...fixture, failClosedStates: fixture.failClosedStates.filter(state => state !== 'warning_only') },
    {
      ...fixture,
      a5Blockers: fixture.a5Blockers.map(blocker => ({
        ...blocker,
        status: 'resolved',
        unresolved: false
      }))
    },
    {
      ...fixture,
      safety: {
        ...fixture.safety,
        noCommandExecution: false
      }
    },
    {
      ...fixture,
      safety: {
        ...fixture.safety,
        rawSecretExposed: true
      }
    }
  ]) {
    const evaluation = evaluateFinalRcMatrix(unsafeInput);

    assert.equal(evaluation.status, 'blocked_fail_closed');
    assert.equal(evaluation.passed, false);
    assert.equal(evaluation.canClaimFullFinalRcMatrixExecuted, false);
    assert.equal(evaluation.canClaimFinalRcReady, false);
    assert.equal(evaluation.canClaimRuntimeReady, false);
    assert.equal(evaluation.runnerExecuted, false);
    assert.equal(evaluation.finalRcMatrixExecuted, false);
    assert.equal(evaluation.fullFinalRcMatrixExecuted, false);
    assert.equal(evaluation.runtimeReady, false);
    assert.equal(evaluation.rcReady, false);
  }

  const a5BypassEvaluation = evaluateFinalRcMatrix({
    ...fixture,
    a5Blockers: fixture.a5Blockers.map(blocker => ({
      ...blocker,
      status: 'resolved',
      unresolved: false
    }))
  });

  assert.equal(a5BypassEvaluation.inputContractAccepted, false);
  assert.equal(a5BypassEvaluation.failClosedReasons.includes('a5_blocker_bypass_rejected'), true);
});

test('P45 evaluator redacts sensitive strings and does not leak unsupported source text', () => {
  const fixture = loadFixture();
  const normalized = normalizeFinalRcMatrixEvaluation({
    ...fixture,
    evidence: fixture.evidence.map((evidence, index) => index === 0
      ? {
          ...evidence,
          id: 'authorization: Bearer EVALUATOR_TOKEN_1234567890',
          sourceType: 'api_key=EVALUATOR_API_KEY_1234567890',
          status: 'passed token=EVALUATOR_STATUS_TOKEN_1234567890',
          artifact: 'A:\\secret\\.env https://example.test workspace_id=workspace-public-id',
          raw_workspace_id: 'raw_workspace_id=workspace-raw'
        }
      : evidence
    ),
    publicMcpTools: [
      ...fixture.publicMcpTools,
      'authorization: Bearer PUBLIC_TOOL_TOKEN_1234567890',
      'A:\\secret\\.env',
      'https://example.test/path'
    ],
    blockedActions: [
      ...fixture.blockedActions,
      'raw_workspace_id=workspace-raw'
    ],
    failClosedStates: [
      ...fixture.failClosedStates,
      'password=EVALUATOR_PASSWORD_1234567890'
    ],
    requiredWording: [
      ...fixture.requiredWording,
      'password=EVALUATOR_PASSWORD_1234567890'
    ]
  });
  const evaluation = evaluateFinalRcMatrix(normalized);

  assertNoSensitiveSurface(normalized);
  assertNoSensitiveSurface(evaluation);
  assert.equal(evaluation.inputContractAccepted, false);
  assert.equal(evaluation.evidence.unsupportedSourceTypes.every(sourceType =>
    sourceType === '<redacted>' || sourceType.includes('<redacted>')
  ), true);
  assert.equal(evaluation.decision, 'NOT_READY_BLOCKED');
});

test('P45 evaluator safe source whitelist stays aligned with fixture source types', () => {
  const fixture = loadFixture();
  const fixtureSourceTypes = [...new Set(fixture.evidence.map(evidence => evidence.sourceType))].sort();

  assert.deepEqual(fixtureSourceTypes, [
    'committed_fixture',
    'committed_test',
    'local_validation_summary'
  ]);
  for (const sourceType of fixtureSourceTypes) {
    assert.equal(SAFE_SOURCE_TYPES.includes(sourceType), true, sourceType);
  }
});
