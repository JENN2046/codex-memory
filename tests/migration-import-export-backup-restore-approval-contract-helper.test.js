const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DENIED_SOURCE_TYPES,
  EXPECTED_MANIFEST_VERSION,
  EXPECTED_POLICY_VERSION,
  EXPECTED_SCHEMA_VERSION,
  REQUIRED_APPROVAL_EVIDENCE,
  REQUIRED_APPROVAL_STATE_IDS,
  REQUIRED_FRAMEWORK_STAGE_IDS,
  REQUIRED_SOURCE_EVIDENCE_IDS,
  SAFE_SOURCE_TYPES,
  evaluateMigrationImportExportBackupRestoreApproval,
  normalizeMigrationImportExportBackupRestoreApprovalInput
} = require('../src/core/MigrationImportExportBackupRestoreApprovalContract');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'p58-migration-import-export-backup-restore-approval-boundary-v1.json'
);

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

test('P58 approval helper accepts explicit boundary object while keeping execution blocked', () => {
  const result = evaluateMigrationImportExportBackupRestoreApproval(loadFixture());

  assert.equal(result.schemaVersion, EXPECTED_SCHEMA_VERSION);
  assert.equal(result.sourceMode, 'explicit_input');
  assert.equal(result.status, 'boundary_accepted_approval_execution_still_blocked');
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.acceptedForPlanning, true);
  assert.equal(result.approvalFrameworkReady, false);
  assert.equal(result.approvalExecutionReady, false);
  assert.equal(result.migrationFrameworkReady, false);
  assert.equal(result.importExportFrameworkReady, false);
  assert.equal(result.backupRestoreFrameworkReady, false);
  assert.equal(result.runtimeReady, false);
  assert.equal(result.finalRcMatrixReady, false);
  assert.equal(result.v1RcReady, false);
  assert.deepEqual(result.failClosedReasons, []);
  assert.deepEqual(result.sourceTypes.allowed, SAFE_SOURCE_TYPES);
  assert.deepEqual(result.sourceTypes.denied, DENIED_SOURCE_TYPES);
  assert.equal(result.sourceEvidence.count, REQUIRED_SOURCE_EVIDENCE_IDS.length);
  assert.equal(result.sourceEvidence.exact, true);
  assert.equal(result.frameworkStages.count, REQUIRED_FRAMEWORK_STAGE_IDS.length);
  assert.equal(result.frameworkStages.exact, true);
  assert.equal(result.approvalStates.count, REQUIRED_APPROVAL_STATE_IDS.length);
  assert.equal(result.approvalStates.exact, true);
  assert.equal(result.approvalEvidence.requiredExact, true);
  assert.equal(result.approvalEvidence.unsatisfiedExact, true);
  assert.equal(result.readiness.localBoundaryInventoryReady, true);
  assert.equal(result.readiness.approvalExecutionReady, false);
  assert.equal(result.safety.executesCommands, false);
  assert.equal(result.safety.writesDurableMemory, false);
  assert.equal(result.safety.writesDurableAudit, false);
});

test('P58 approval helper normalizes allowlisted fields without arbitrary passthrough', () => {
  const normalized = normalizeMigrationImportExportBackupRestoreApprovalInput({
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

test('P58 approval helper does not perform fs reads or command execution', () => {
  const input = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P58 helper');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists during P58 helper');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P58 helper');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P58 helper');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P58 helper');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P58 helper');
  };

  try {
    const result = evaluateMigrationImportExportBackupRestoreApproval(input);

    assert.equal(result.acceptedForPlanning, true);
    assert.equal(result.safety.readsFiles, false);
    assert.equal(result.safety.scansDirectories, false);
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

test('P58 approval helper fails closed for malformed or version drift', () => {
  for (const [label, input, reason] of [
    ['malformed', null, 'malformed_input'],
    ['schema', { ...loadFixture(), schemaVersion: 'p58-v999' }, 'schema_version_mismatch'],
    ['policy', { ...loadFixture(), policyVersion: 'p58-policy-v999' }, 'policy_version_mismatch'],
    ['manifest', { ...loadFixture(), manifestVersion: 'p58-manifest-v999' }, 'manifest_version_mismatch']
  ]) {
    const result = evaluateMigrationImportExportBackupRestoreApproval(input);

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P58 approval helper fails closed for missing duplicate or unknown required sets', () => {
  const fixture = loadFixture();

  for (const [label, patch, reason] of [
    [
      'missing source evidence',
      { sourceEvidence: fixture.sourceEvidence.slice(1) },
      'non_exact_approval_framework_contract'
    ],
    [
      'duplicate stage',
      { frameworkStages: [...fixture.frameworkStages, fixture.frameworkStages[0]] },
      'duplicate_approval_framework_id'
    ],
    [
      'missing approval state',
      { approvalStates: fixture.approvalStates.slice(1) },
      'non_exact_approval_framework_contract'
    ],
    [
      'unknown approval evidence',
      { requiredApprovalEvidence: [...REQUIRED_APPROVAL_EVIDENCE.slice(1), 'unknown_approval_evidence'] },
      'non_exact_approval_framework_contract'
    ],
    [
      'extra denied source',
      { deniedSourceTypes: [...fixture.deniedSourceTypes, 'unknown_source'] },
      'non_exact_approval_framework_contract'
    ]
  ]) {
    const result = evaluateMigrationImportExportBackupRestoreApproval({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
  }
});

test('P58 approval helper fails closed for execution approval durable write or readiness claims', () => {
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
        frameworkStages: fixture.frameworkStages.map((stage, index) => index === 0
          ? { ...stage, executionAllowed: true }
          : stage)
      },
      'stage_allows_execution_or_unscoped_input'
    ],
    [
      'source-scope accepts real data',
      {
        frameworkStages: fixture.frameworkStages.map((stage, index) => index === 0
          ? { ...stage, acceptedSources: ['synthetic_fixture', 'real_memory_content'] }
          : stage)
      },
      'stage_allows_execution_or_unscoped_input'
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
      'migration apply',
      { migrationApplied: true },
      'readiness_overclaim'
    ],
    [
      'backup created',
      { backupCreated: true },
      'readiness_overclaim'
    ],
    [
      'safety leak',
      {
        safety: {
          ...fixture.safety,
          scansRuntimeStores: true
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
    const result = evaluateMigrationImportExportBackupRestoreApproval({
      ...fixture,
      ...patch
    });

    assert.equal(result.status, 'blocked_fail_closed', label);
    assert.equal(result.acceptedForPlanning, false, label);
    assert.equal(result.failClosedReasons.includes(reason), true, label);
    assert.equal(result.v1RcReady, false, label);
  }
});

test('P58 approval helper redacts sensitive normalized output and source summaries', () => {
  const fixture = loadFixture();
  const normalized = normalizeMigrationImportExportBackupRestoreApprovalInput({
    ...fixture,
    deniedSourceTypes: [
      ...fixture.deniedSourceTypes.slice(1),
      'authorization: Bearer DENIED_SOURCE_TOKEN_1234567890'
    ],
    requiredApprovalEvidence: [
      ...fixture.requiredApprovalEvidence,
      'api_key=APPROVAL_API_KEY_1234567890'
    ],
    sourceEvidence: fixture.sourceEvidence.map((source, index) => index === 0
      ? {
          ...source,
          id: 'p27_migration_import_export_approval_packet_contract authorization: Bearer SOURCE_TOKEN_1234567890',
          artifactRefs: [
            ...source.artifactRefs,
            'A:\\secret\\.env',
            'https://example.test/path'
          ]
        }
      : source)
  });
  const result = evaluateMigrationImportExportBackupRestoreApproval(normalized);

  assertNoSensitiveSurface(normalized);
  assertNoSensitiveSurface(result);
  assert.equal(result.acceptedForPlanning, false);
  assert.equal(result.decision, 'NOT_READY_BLOCKED');
  assert.equal(result.sourceTypes.deniedExact, false);
});
