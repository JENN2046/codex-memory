const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_APPROVAL_STATE_IDS,
  REQUIRED_LOOP_STAGE_IDS,
  REQUIRED_RUNTIME_EVIDENCE,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  evaluateGovernanceLoopBoundary,
  normalizeGovernanceLoopBoundaryInput
} = require('../src/core/GovernanceLoopBoundaryContract');

const fixturePath = path.join(__dirname, 'fixtures', 'p56-governance-executable-loop-boundary-v1.json');

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
    'providerapikey',
    'set-cookie',
    'token=',
    'password=',
    '.env',
    'https://example.test',
    'a:\\'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
}

test('P56 loop helper accepts explicit boundary object while keeping runtime blocked', () => {
  const result = evaluateGovernanceLoopBoundary(loadFixture());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'boundary_accepted_governance_runtime_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.governanceRuntimeReady, false);
  assert.equal(result.approvalExecutionReady, false);
  assert.equal(result.auditWriterReady, false);
  assert.equal(result.durableWriteReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.equal(result.sourceEvidence.count, REQUIRED_SOURCE_EVIDENCE_IDS.length);
  assert.equal(result.sourceEvidence.exact, true);
  assert.equal(result.loopStages.count, REQUIRED_LOOP_STAGE_IDS.length);
  assert.equal(result.loopStages.exact, true);
  assert.equal(result.approvalStates.count, REQUIRED_APPROVAL_STATE_IDS.length);
  assert.equal(result.approvalStates.exact, true);
  assert.equal(result.readiness.localBoundaryContractReady, true);
  assert.equal(result.readiness.governanceRuntimeReady, false);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.writesDurableAudit, false);
  assert.equal(result.safety.writesDurableMemory, false);
});

test('P56 loop helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeGovernanceLoopBoundaryInput({
    ...loadFixture(),
    authorization: 'authorization: Bearer SHOULD_NOT_PASS',
    raw_workspace_id: 'raw_workspace_id=workspace-raw',
    providerLatency: 123
  });

  assert.equal(normalized.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(normalized.policyVersion, EXPECTED_POLICY_VERSION);
  assert.equal(normalized.manifestVersion, EXPECTED_MANIFEST_VERSION);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'providerLatency'), false);
  assertNoSensitiveSurface(normalized);
});

test('P56 loop helper does not perform fs reads or command execution', () => {
  const input = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P56 helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P56 helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P56 helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P56 helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P56 helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P56 helper');
  };

  try {
    const result = evaluateGovernanceLoopBoundary(input);

    assert.equal(result.acceptedForPlanning, true);
    assert.equal(result.safety.readsFiles, false);
    assert.equal(result.safety.executesCommands, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P56 loop helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', { ...loadFixture(), schemaVersion: 'p56-v999' }, 'schema_version_mismatch'],
    ['policy', { ...loadFixture(), policyVersion: 'p56-policy-v999' }, 'policy_version_mismatch'],
    ['manifest', { ...loadFixture(), manifestVersion: 'p56-manifest-v999' }, 'manifest_version_mismatch']
  ]) {
    const result = evaluateGovernanceLoopBoundary(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P56 loop helper fails closed for missing duplicate or unsafe loop ids', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'missing source',
      { sourceEvidence: fixture.sourceEvidence.slice(1) },
      'non_exact_governance_loop_contract'
    ],
    [
      'duplicate stage',
      { loopStages: [...fixture.loopStages, fixture.loopStages[0]] },
      'duplicate_loop_id'
    ],
    [
      'missing approval',
      { approvalStates: fixture.approvalStates.slice(1) },
      'non_exact_governance_loop_contract'
    ],
    [
      'missing runtime evidence',
      { requiredRuntimeEvidence: fixture.requiredRuntimeEvidence.slice(1) },
      'non_exact_governance_loop_contract'
    ],
    [
      'unknown runtime evidence',
      { requiredRuntimeEvidence: [...REQUIRED_RUNTIME_EVIDENCE.slice(1), 'unknown_runtime_evidence'] },
      'non_exact_governance_loop_contract'
    ]
  ]) {
    const result = evaluateGovernanceLoopBoundary({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P56 loop helper fails closed for execution approval durable write or readiness claims', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'source authority',
      {
        sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
          ? { ...source, executionAuthority: true }
          : source)
      },
      'source_claims_authority'
    ],
    [
      'stage execution',
      {
        loopStages: fixture.loopStages.map((stage, index) => index === 0
          ? { ...stage, canExecute: true }
          : stage)
      },
      'stage_claims_execution'
    ],
    [
      'approval execution',
      {
        approvalStates: fixture.approvalStates.map((state, index) => index === 1
          ? { ...state, executionAllowed: true }
          : state)
      },
      'approval_state_allows_execution'
    ],
    [
      'durable write',
      { durableAuditWritten: true },
      'readiness_overclaim'
    ],
    [
      'safety leak',
      {
        safety: {
          ...fixture.safety,
          writesDurableMemory: true
        }
      },
      'safety_boundary_leaked'
    ],
    [
      'readiness',
      {
        readiness: {
          ...fixture.readiness,
          v1RcReady: true
        }
      },
      'readiness_overclaim'
    ]
  ]) {
    const result = evaluateGovernanceLoopBoundary({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});
