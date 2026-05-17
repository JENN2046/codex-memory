const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const {
  BLOCKED_ACTIONS,
  CRITICAL_FAILURE_STATES,
  PUBLIC_MCP_TOOLS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  SAFE_SOURCE_TYPES,
  normalizeEvidenceManifestContract,
  summarizeEvidenceManifestContract
} = require('../src/core/EvidenceManifestContract');

const fixturePath = path.join(__dirname, 'fixtures', 'p41-evidence-manifest-contract-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('P42 helper summarizes explicit P41 evidence manifest fixture input', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const summary = summarizeEvidenceManifestContract(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.schemaVersion, 'p41-evidence-manifest-contract-v1');
  assert.equal(summary.acceptedForPlanning, true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.status, 'blocked');
  assert.equal(summary.localEvidenceReportReady, true);
  assert.equal(summary.runtimeReady, false);
  assert.equal(summary.finalRcMatrixReady, false);
  assert.equal(summary.pushReady, false);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.deployReady, false);
  assert.equal(summary.configSwitchReady, false);
  assert.equal(summary.watchdogReady, false);
  assert.equal(summary.rcReady, false);
  assert.equal(summary.sourceContract.safe, true);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, []);
  assert.equal(summary.sourceEvidence.requiredPresent, true);
  assert.equal(summary.sourceEvidence.safe, true);
  assert.deepEqual(summary.sourceEvidence.missingRequired, []);
  assert.equal(summary.criticalGateSemantics.failureStatesFailClosed, true);
  assert.deepEqual(summary.criticalGateSemantics.unsafeStates, []);
  assert.equal(summary.failClosedCases.requiredPresent, true);
  assert.equal(summary.failClosedCases.safe, true);
  assert.deepEqual(summary.failClosedCases.missingRequired, []);
  assert.deepEqual(summary.publicMcpTools, {
    frozen: true,
    tools: PUBLIC_MCP_TOOLS
  });
  assert.equal(summary.blockedActions.requiredPresent, true);
  assert.deepEqual(summary.blockedActions.missingRequired, []);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.scansDirectories, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(summary.safety.writesDurableAudit, false);
  assert.equal(summary.safety.expandsPublicMcp, false);
  assert.equal(summary.safety.mutatesInput, false);
  assert.equal(JSON.stringify(fixture), before);
});

test('P42 helper normalizes expected manifest fields without arbitrary passthrough', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const normalized = normalizeEvidenceManifestContract({
    ...fixture,
    authorization: 'authorization: Bearer MANIFEST_TOKEN_1234567890',
    raw_workspace_id: 'raw_workspace_id=workspace-manifest-raw',
    productionMemorySnippet: 'raw user memory content',
    rawContent: 'raw recall transcript',
    workspace_id: 'workspace-public-id'
  });

  assert.equal(normalized.fixtureOnly, true);
  assert.equal(normalized.synthetic, true);
  assert.equal(normalized.explicitInputOnly, true);
  assert.equal(normalized.status, 'blocked');
  assert.equal(normalized.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.sourceEvidence.map(source => source.id), REQUIRED_SOURCE_EVIDENCE_IDS);
  assert.deepEqual(Object.keys(normalized.criticalGateSemantics), ['pass', ...CRITICAL_FAILURE_STATES]);
  assert.deepEqual(normalized.failClosedCases.map(entry => entry.id), REQUIRED_FAIL_CLOSED_CASES);
  assert.deepEqual(BLOCKED_ACTIONS.filter(action => !normalized.blockedActions.includes(action)), []);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'productionMemorySnippet'), false);
  assert.equal(Object.hasOwn(normalized, 'rawContent'), false);
  assert.equal(Object.hasOwn(normalized, 'workspace_id'), false);
  assert.equal(JSON.stringify(fixture), before);
});

test('P42 helper does not perform implicit fs reads or command execution', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during evidence manifest helper evaluation');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists check during evidence manifest helper evaluation');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected fs directory scan during evidence manifest helper evaluation');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during evidence manifest helper evaluation');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during evidence manifest helper evaluation');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during evidence manifest helper evaluation');
  };

  try {
    const summary = summarizeEvidenceManifestContract(fixture);

    assert.equal(summary.acceptedForPlanning, true);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P42 helper fails closed for malformed explicit input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeEvidenceManifestContract(malformedInput);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.status, 'blocked');
    assert.equal(summary.localEvidenceReportReady, false);
    assert.equal(summary.runtimeReady, false);
    assert.equal(summary.finalRcMatrixReady, false);
    assert.equal(summary.rcReady, false);
    assert.equal(summary.sourceContract.safe, false);
    assert.equal(summary.sourceEvidence.requiredPresent, false);
    assert.deepEqual(summary.sourceEvidence.missingRequired, REQUIRED_SOURCE_EVIDENCE_IDS);
    assert.equal(summary.criticalGateSemantics.failureStatesFailClosed, false);
    assert.equal(summary.failClosedCases.requiredPresent, false);
    assert.deepEqual(summary.failClosedCases.missingRequired, REQUIRED_FAIL_CLOSED_CASES);
    assert.equal(summary.publicMcpTools.frozen, false);
    assert.equal(summary.blockedActions.requiredPresent, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P42 helper rejects unsupported source types and whitelist redefinition', () => {
  const fixture = loadFixture();
  const summary = summarizeEvidenceManifestContract({
    ...fixture,
    safeSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'real_memory_scan'
    ],
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'live_service'
    ]
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.sourceTypesWhitelisted, false);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, [
    'live_service',
    'real_memory_scan'
  ]);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.callsProviders, false);
});

test('P42 helper rejects warning-only, skipped, unknown, missing, ambiguous, unparsable, or unsupported critical gates', () => {
  const fixture = loadFixture();

  for (const state of CRITICAL_FAILURE_STATES) {
    const summary = summarizeEvidenceManifestContract({
      ...fixture,
      criticalGateSemantics: {
        ...fixture.criticalGateSemantics,
        [state]: state === 'warning_only' ? 'warning' : 'accepted'
      }
    });

    assert.equal(summary.acceptedForPlanning, false, state);
    assert.equal(summary.criticalGateSemantics.failureStatesFailClosed, false, state);
    assert.ok(summary.criticalGateSemantics.unsafeStates.includes(state), state);
  }
});

test('P42 helper rejects readiness, runtime, public MCP, durable, and safety leakage claims', () => {
  const fixture = loadFixture();

  for (const unsafeManifest of [
    { ...fixture, status: 'ready' },
    { ...fixture, decision: 'READY_FOR_V1_0_RC' },
    { ...fixture, runtimeReady: true },
    { ...fixture, finalRcMatrixReady: true },
    { ...fixture, rcReady: true },
    { ...fixture, publicTools: ['record_memory', 'search_memory'] },
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
    },
    {
      ...fixture,
      safety: {
        ...fixture.safety,
        callerFieldsPassthroughAllowed: true
      }
    }
  ]) {
    const summary = summarizeEvidenceManifestContract(unsafeManifest);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.runtimeReady, false);
    assert.equal(summary.finalRcMatrixReady, false);
    assert.equal(summary.rcReady, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
    assert.equal(summary.safety.mutatesDurableState, false);
    assert.equal(summary.safety.expandsPublicMcp, false);
  }
});

test('P42 helper requires P36-P40 source evidence, fail-closed cases, and blocked actions', () => {
  const fixture = loadFixture();
  const summary = summarizeEvidenceManifestContract({
    ...fixture,
    sourceEvidence: fixture.sourceEvidence.filter(source => source.id !== 'p40_local_readiness_report'),
    failClosedCases: fixture.failClosedCases
      .filter(failClosedCase => failClosedCase.id !== 'unsupported_source_type'),
    blockedActions: fixture.blockedActions.filter(action => action !== 'recall_audit_scan')
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceEvidence.requiredPresent, false);
  assert.deepEqual(summary.sourceEvidence.missingRequired, ['p40_local_readiness_report']);
  assert.equal(summary.failClosedCases.requiredPresent, false);
  assert.deepEqual(summary.failClosedCases.missingRequired, ['unsupported_source_type']);
  assert.equal(summary.blockedActions.requiredPresent, false);
  assert.deepEqual(summary.blockedActions.missingRequired, ['recall_audit_scan']);
});

test('P42 helper rejects schema drift and non-exact required sets', () => {
  const fixture = loadFixture();

  for (const unsafeManifest of [
    { ...fixture, schemaVersion: 'unsupported-schema' },
    { ...fixture, sourceEvidence: [...fixture.sourceEvidence, fixture.sourceEvidence[0]] },
    { ...fixture, failClosedCases: [...fixture.failClosedCases, fixture.failClosedCases[0]] },
    { ...fixture, blockedActions: [...fixture.blockedActions, 'unexpected_action'] }
  ]) {
    const summary = summarizeEvidenceManifestContract(unsafeManifest);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.localEvidenceReportReady, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.runtimeReady, false);
    assert.equal(summary.rcReady, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P42 helper rejects unsafe source evidence and warning-only fail-closed cases', () => {
  const fixture = loadFixture();
  const summary = summarizeEvidenceManifestContract({
    ...fixture,
    sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
      ? {
          ...source,
          sourceType: 'real_memory_scan',
          runtimeReady: true
        }
      : source
    ),
    failClosedCases: fixture.failClosedCases.map((failClosedCase, index) => index === 0
      ? {
          ...failClosedCase,
          acceptedForPlanning: true,
          nonzeroFailurePath: false
        }
      : failClosedCase
    )
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceEvidence.safe, false);
  assert.equal(summary.failClosedCases.safe, false);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
});

test('P42 helper redacts sensitive normalized output, unsupported source types, and summary tokens', () => {
  const fixture = loadFixture();
  const normalized = normalizeEvidenceManifestContract({
    ...fixture,
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'authorization: Bearer MANIFEST_TOKEN_1234567890'
    ],
    unsupportedSourceTypes: [
      'api_key=MANIFEST_API_KEY_1234567890',
      'providerapikey=MANIFEST_PROVIDER_API_KEY_1234567890',
      'token=MANIFEST_SUMMARY_TOKEN_1234567890',
      'raw_workspace_id=workspace-manifest-raw'
    ],
    requiredWording: [
      ...fixture.requiredWording,
      'authorization: Bearer WORDING_TOKEN_1234567890',
      'api_key=WORDING_API_KEY_1234567890'
    ],
    sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
      ? {
          ...source,
          authorization: 'authorization: Bearer SOURCE_TOKEN_1234567890',
          api_key: 'api_key=SOURCE_API_KEY_1234567890',
          raw_workspace_id: 'raw_workspace_id=workspace-source-raw',
          artifact: 'tests/fixtures/p36.json authorization: Bearer ARTIFACT_TOKEN_1234567890 A:\\secret\\.env https://example.test workspace_id=workspace-public-id'
        }
      : source
    ),
    failClosedCases: fixture.failClosedCases.map((failClosedCase, index) => index === 0
      ? {
          ...failClosedCase,
          claimedValue: 'api_key=CLAIM_API_KEY_1234567890',
          reasonCodes: [
            ...failClosedCase.reasonCodes,
            'token=REASON_TOKEN_1234567890'
          ]
        }
      : failClosedCase
    )
  });
  const summary = summarizeEvidenceManifestContract(normalized);
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'bearer',
    'api_key',
    'raw_workspace_id',
    'authorization: bearer',
    'manifest_token_1234567890',
    'manifest_api_key_1234567890',
    'manifest_provider_api_key_1234567890',
    'manifest_summary_token_1234567890',
    'wording_token_1234567890',
    'wording_api_key_1234567890',
    'source_token_1234567890',
    'source_api_key_1234567890',
    'workspace-source-raw',
    'artifact_token_1234567890',
    'a:\\',
    '.env',
    'https://example.test',
    'workspace_id',
    'workspace-public-id',
    'claim_api_key_1234567890',
    'reason_token_1234567890'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false, forbidden);
    assert.equal(summaryText.includes(forbidden), false, forbidden);
  }

  assert.equal(Object.hasOwn(normalized.sourceEvidence[0], 'authorization'), false);
  assert.equal(Object.hasOwn(normalized.sourceEvidence[0], 'api_key'), false);
  assert.equal(Object.hasOwn(normalized.sourceEvidence[0], 'raw_workspace_id'), false);
  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.unsupportedSourceTypes.every(sourceType =>
    sourceType === '<redacted>' || sourceType.includes('<redacted>')
  ), true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.deepEqual(summary.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
});
