const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'p36-scope-a5-boundary-contract-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];

const REQUIRED_SCOPE_METADATA = [
  'client',
  'project',
  'workspace',
  'memory_kind',
  'governance_record_kind',
  'source'
];

const REQUIRED_A5_DENY_LIST = [
  'real_memory_content_read',
  'real_memory_preview',
  'real_memory_export',
  'real_memory_import',
  'real_memory_scan',
  'sqlite_migration_apply',
  'backup',
  'restore',
  'provider_call',
  'model_call',
  'public_mcp_tool_expansion',
  'public_mcp_schema_expansion',
  'env_or_secret_edit',
  'watchdog_install_or_config_switch',
  'dependency_change',
  'durable_memory_write',
  'durable_audit_write',
  'push_tag_release_deploy'
];

test('P36-T1 boundary fixture parses and locks top-level state', () => {
  assert.equal(fixture.schemaVersion, 'p36-scope-a5-boundary-contract-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P36-T1-scope-a5-boundary-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.sourceMode, 'committed_fixture');
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
});

test('P36-T1 fixture keeps runtime, policy kernel, public MCP, and real memory access blocked', () => {
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.policyKernelImplemented, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.realMemoryContentRead, false);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.safety.noRuntimePolicyKernel, true);
  assert.equal(fixture.safety.noCommandExecution, true);
  assert.equal(fixture.safety.noDurableMemoryWrite, true);
  assert.equal(fixture.safety.noDurableAuditWrite, true);
  assert.equal(fixture.safety.noRealMemoryContentRead, true);
});

test('P36-T1 fixture freezes public MCP tools', () => {
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, PUBLIC_MCP_TOOLS);
});

test('P36-T1 scope contract fails closed instead of defaulting unknown metadata to global', () => {
  assert.deepEqual(fixture.scopeContract.requiredMetadata, REQUIRED_SCOPE_METADATA);
  assert.equal(fixture.scopeContract.denyByDefault, true);
  assert.equal(fixture.scopeContract.defaultToGlobalAllowed, false);
  assert.equal(fixture.scopeContract.unknownMetadataDisposition, 'deny');
  assert.equal(fixture.scopeContract.missingMetadataDisposition, 'deny');
  assert.equal(fixture.scopeContract.ambiguousMetadataDisposition, 'deny');
  assert.equal(fixture.scopeContract.unparsableMetadataDisposition, 'deny');
});

test('P36-T1 governance namespaces are isolated from normal user recall namespaces', () => {
  assert.deepEqual(fixture.scopeContract.normalUserRecallNamespaces, [
    'user_memory',
    'project_memory',
    'task_memory'
  ]);
  assert.deepEqual(fixture.scopeContract.governanceNamespaces, [
    'governance_records',
    'validation_transcripts',
    'redaction_samples',
    'policy_decisions'
  ]);
  assert.equal(fixture.scopeContract.governanceNamespacesEnterNormalRecall, false);
});

test('P36-T1 risk labels preserve A5 hard-stop fallback for unknown risk', () => {
  const labels = new Map(fixture.riskLabels.map(label => [label.id, label]));

  assert.ok(labels.has('A4-local-safe'));
  assert.ok(labels.has('A4.8-guarded'));
  assert.ok(labels.has('A5-hard-stop'));
  assert.equal(fixture.unknownRiskLabelDisposition, 'A5-hard-stop');
  assert.equal(labels.get('A5-hard-stop').allowsFixtureOnlyWork, false);
  assert.equal(labels.get('A5-hard-stop').allowsDryRunOnlyWork, false);
  assert.equal(labels.get('A5-hard-stop').allowsRealMemoryContentRead, false);
  assert.equal(labels.get('A5-hard-stop').allowsPublicMcpExpansion, false);
});

test('P36-T1 A5 deny list covers real data, public MCP, provider, config, dependency, and remote operations', () => {
  for (const blockedAction of REQUIRED_A5_DENY_LIST) {
    assert.ok(fixture.a5DenyList.includes(blockedAction), blockedAction);
  }
});

test('P36-T1 fail-closed cases reject unsafe metadata, dry-run, gate, and namespace claims', () => {
  const casesById = new Map(fixture.failClosedCases.map(entry => [entry.id, entry]));

  for (const id of [
    'unknown_scope_metadata',
    'missing_scope_metadata',
    'ambiguous_scope_metadata',
    'unparsable_scope_metadata',
    'unknown_risk_label',
    'critical_gate_skipped',
    'warning_only_gate',
    'dry_run_real_memory_content_read',
    'public_mcp_expansion_attempt',
    'governance_record_normal_recall_namespace'
  ]) {
    const entry = casesById.get(id);
    assert.ok(entry, id);
    assert.equal(entry.acceptedForPlanning, false, id);
    assert.match(entry.decision, /deny|A5-hard-stop/, id);
    assert.match(entry.reasonCode, /^P36_/, id);
  }
});

test('P36-T1 safety flags preserve fixture-only and dry-run-only boundaries', () => {
  for (const flag of [
    'noPublicMcpExpansion',
    'noRealMemoryPreview',
    'noRealMemoryExport',
    'noRealMemoryImport',
    'noRealMemoryScan',
    'noMigrationApply',
    'noBackupRestore',
    'noProviderCall',
    'noServiceStart',
    'noConfigMutation',
    'noDependencyChange',
    'noRemoteWrite'
  ]) {
    assert.equal(fixture.safety[flag], true, flag);
  }

  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.structureLeakageApproved, false);
});

test('P36-T1 required wording prevents runtime-ready and readiness overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('synthetic fixture contract only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('must fail closed')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not authorize touching real memory content')));
  assert.ok(fixture.requiredWording.some(line => line.includes('Public MCP tools remain frozen')));
  assert.ok(fixture.requiredWording.some(line => line.includes('must not enter normal user recall namespaces')));
  assert.ok(fixture.requiredWording.some(line => line.includes('local evidence report only')));
  assert.ok(fixture.forbiddenClaims.includes('fixture passing means runtime-ready'));
  assert.ok(fixture.forbiddenClaims.includes('unknown scope defaults to global'));
  assert.ok(fixture.forbiddenClaims.includes('readiness implies mainline cutover'));
});

test('P36-T1 fixture text does not expose raw secrets, workspace ids, local paths, or provider endpoints', () => {
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

test('P36-T1 reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
