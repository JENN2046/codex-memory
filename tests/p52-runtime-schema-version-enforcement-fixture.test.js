const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'p52-runtime-schema-version-enforcement-boundary-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const REQUIRED_VERSION_FIELDS = [
  'schemaVersion',
  'policyVersion',
  'manifestVersion'
];

const REQUIRED_FAIL_CLOSED_CASES = [
  'missing_schema_version',
  'unknown_policy_version',
  'unsupported_manifest_version',
  'duplicate_schema_version',
  'malformed_policy_version',
  'version_mismatch',
  'ambiguous_metadata',
  'unparsable_metadata',
  'stale_version_claim',
  'warning_only_critical_gate',
  'skipped_critical_gate'
];

const REQUIRED_BLOCKED_ACTIONS = [
  'runtime_request_enforcement',
  'runtime_policy_kernel_execution',
  'real_memory_content_read',
  'real_memory_scan',
  'sqlite_migration_apply',
  'import_export_apply',
  'backup_restore',
  'provider_call',
  'public_mcp_expansion',
  'durable_memory_write',
  'durable_audit_write',
  'push_tag_release_deploy'
];

test('P52 runtime schema/version fixture parses as boundary planning only', () => {
  assert.equal(fixture.schemaVersion, 'p52-runtime-schema-version-enforcement-boundary-v1');
  assert.equal(fixture.policyVersion, 'p52-runtime-schema-version-policy-v1');
  assert.equal(fixture.manifestVersion, 'p52-runtime-enforcement-manifest-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P52-T1-runtime-schema-version-enforcement-boundary-plan');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.explicitInputOnly, true);
  assert.equal(fixture.sourceMode, 'committed_fixture');
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
});

test('P52 fixture does not claim runtime enforcement, runtime readiness, or RC readiness', () => {
  assert.equal(fixture.runtimeEnforcementImplemented, false);
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.runtimeReady, false);
  assert.equal(fixture.finalRcMatrixReady, false);
  assert.equal(fixture.rcReady, false);
  assert.equal(fixture.safety.noRuntimePolicyKernel, true);
  assert.equal(fixture.safety.noRealMemoryRead, true);
  assert.equal(fixture.safety.noRuntimeStoreScan, true);
  assert.equal(fixture.safety.noDurableMemoryWrite, true);
  assert.equal(fixture.safety.noDurableAuditWrite, true);
});

test('P52 required version fields are exact and machine-readable', () => {
  assert.deepEqual(fixture.requiredVersionFields, REQUIRED_VERSION_FIELDS);
  assert.equal(fixture.versionContract.defaultAllow, false);
  assert.equal(fixture.versionContract.failurePathExitCode, 1);
  assert.equal(fixture.versionContract.warningOnlyGateAllowed, false);
  assert.equal(fixture.versionContract.criticalSkippedUnknownEqualsFailure, true);
});

test('P52 unknown, missing, unsupported, duplicate, malformed, mismatch, stale, and unparsable metadata deny', () => {
  const contract = fixture.versionContract;

  assert.equal(contract.unknownVersionDisposition, 'deny');
  assert.equal(contract.missingVersionDisposition, 'deny');
  assert.equal(contract.unsupportedVersionDisposition, 'deny');
  assert.equal(contract.duplicateVersionDisposition, 'deny');
  assert.equal(contract.malformedVersionDisposition, 'deny');
  assert.equal(contract.versionMismatchDisposition, 'deny');
  assert.equal(contract.ambiguousMetadataDisposition, 'deny');
  assert.equal(contract.unparsableMetadataDisposition, 'deny');
  assert.equal(contract.staleVersionDisposition, 'deny');
});

test('P52 boundary stages keep fixture, helper, runtime enforcement, and RC report distinct', () => {
  const stages = new Map(fixture.boundaryStages.map(stage => [stage.id, stage]));

  assert.deepEqual([...stages.keys()], [
    'fixture_evidence',
    'explicit_input_helper',
    'runtime_enforcement',
    'rc_evidence_report'
  ]);
  assert.equal(stages.get('fixture_evidence').implementedByThisSlice, true);

  for (const stage of stages.values()) {
    assert.equal(stage.runtimeAuthority, false, stage.id);
    assert.equal(stage.readinessAuthority, false, stage.id);
  }
});

test('P52 fail-closed matrix covers required cases with P52 reason codes', () => {
  const cases = new Map(fixture.failClosedCases.map(entry => [entry.id, entry]));

  for (const id of REQUIRED_FAIL_CLOSED_CASES) {
    const entry = cases.get(id);
    assert.ok(entry, id);
    assert.equal(entry.acceptedForPlanning, false, id);
    assert.equal(entry.machineDecision, 'deny', id);
    assert.ok(entry.reasonCodes.length > 0, id);
    assert.ok(entry.reasonCodes.every(code => code.startsWith('P52_')), id);
  }
});

test('P52 exact version success remains boundary planning only', () => {
  const entry = fixture.failClosedCases.find(item => item.id === 'valid_exact_versions_boundary_planning_only');

  assert.ok(entry);
  assert.equal(entry.acceptedForPlanning, true);
  assert.equal(entry.machineDecision, 'allow_boundary_planning_only');
  assert.equal(entry.runtimeReady, false);
  assert.deepEqual(entry.reasonCodes, ['P52_BOUNDARY_PLANNING_ONLY']);
});

test('P52 blocked actions preserve A5 boundaries', () => {
  for (const action of REQUIRED_BLOCKED_ACTIONS) {
    assert.ok(fixture.blockedActions.includes(action), action);
  }

  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory'
  ]);
});

test('P52 safety flags forbid collection, execution, mutation, provider, config, and remote writes', () => {
  for (const flag of [
    'noImplicitFileDiscovery',
    'noDirectoryScan',
    'noCommandExecution',
    'noServiceStart',
    'noProviderCall',
    'noConfigMutation',
    'noDependencyChange',
    'noPublicMcpExpansion',
    'noRealMemoryRead',
    'noRuntimeStoreScan',
    'noRuntimePolicyKernel',
    'noMigrationApply',
    'noBackupRestore',
    'noDurableMemoryWrite',
    'noDurableAuditWrite',
    'noRemoteWrite'
  ]) {
    assert.equal(fixture.safety[flag], true, flag);
  }
});

test('P52 required wording and forbidden claims block runtime-ready overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('synthetic boundary contract only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('Exact schemaVersion')));
  assert.ok(fixture.requiredWording.some(line => line.includes('fails closed')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not implement runtime enforcement')));
  assert.ok(fixture.forbiddenClaims.includes('P52 implements runtime enforcement'));
  assert.ok(fixture.forbiddenClaims.includes('P52 makes v1.0 RC ready'));
});

test('P52 fixture text does not expose raw secrets, workspace ids, local paths, or provider endpoints', () => {
  assert.doesNotMatch(fixtureText, /authorization\s*:/i);
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /api[_-]?key\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /password\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /token\s*[:=]/i);
  assert.doesNotMatch(fixtureText, /set-cookie/i);
  assert.doesNotMatch(fixtureText, /(^|[^A-Za-z])sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
  assert.doesNotMatch(fixtureText, /[A-Z]:[\\/]/);
  assert.doesNotMatch(fixtureText, /https?:\/\//i);
});

test('P52 fixture read is deterministic and read-only', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
