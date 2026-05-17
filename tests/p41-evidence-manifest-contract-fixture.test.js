const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'p41-evidence-manifest-contract-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

test('P41 evidence manifest fixture parses and remains local evidence only', () => {
  assert.equal(fixture.schemaVersion, 'p41-evidence-manifest-contract-v1');
  assert.equal(fixture.phase, 'P41-evidence-manifest-contract');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.explicitInputOnly, true);
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.acceptedForPlanning, true);
});

test('P41 manifest blocks all readiness overclaims', () => {
  for (const field of [
    'runtimeReady',
    'finalRcMatrixReady',
    'pushReady',
    'releaseReady',
    'deployReady',
    'configSwitchReady',
    'watchdogReady',
    'rcReady'
  ]) {
    assert.equal(fixture[field], false, field);
  }
});

test('public MCP tools remain frozen', () => {
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, [
    'record_memory',
    'search_memory',
    'memory_overview'
  ]);
});

test('accepted source types are fully whitelisted', () => {
  const safe = new Set(fixture.safeSourceTypes);

  assert.deepEqual(fixture.unsupportedSourceTypes, []);

  for (const sourceType of fixture.acceptedSourceTypes) {
    assert.equal(safe.has(sourceType), true, `${sourceType} is not whitelisted`);
  }
});

test('source evidence covers P36 through P40 without runtime readiness', () => {
  assert.deepEqual(
    fixture.sourceEvidence.map(source => source.phase),
    ['P36-T1', 'P36-T2', 'P37-T1', 'P38', 'P39', 'P40']
  );

  for (const source of fixture.sourceEvidence) {
    assert.equal(fixture.safeSourceTypes.includes(source.sourceType), true, source.id);
    assert.equal(source.status, 'pass', source.id);
    assert.equal(source.acceptedForPlanning, true, source.id);
    assert.equal(source.runtimeReady, false, source.id);
    assert.match(source.artifact, /^tests\/fixtures\//, source.id);
  }
});

test('critical gate semantics fail closed for non-pass evidence', () => {
  for (const state of [
    'failed',
    'skipped',
    'unknown',
    'warning_only',
    'missing',
    'ambiguous',
    'unparsable',
    'unsupported_source'
  ]) {
    assert.equal(fixture.criticalGateSemantics[state], 'failure', state);
  }
});

test('fail-closed cases reject missing manifest, unsupported source, warning-only, unknown, and readiness claims', () => {
  const casesById = new Map(fixture.failClosedCases.map(entry => [entry.id, entry]));

  for (const id of [
    'missing_manifest',
    'unsupported_source_type',
    'warning_only_critical_gate',
    'unknown_critical_gate',
    'runtime_ready_claim',
    'public_mcp_expansion_claim'
  ]) {
    const entry = casesById.get(id);
    assert.ok(entry, id);
    assert.equal(entry.acceptedForPlanning, false, id);
    assert.equal(entry.nonzeroFailurePath, true, id);
    assert.ok(entry.reasonCodes.every(code => code.startsWith('P41_')), id);
  }

  assert.equal(casesById.get('unsupported_source_type').claimedValue, 'real_memory_scan');
});

test('blocked actions preserve real memory, runtime store, migration, provider, public MCP, durable, and remote boundaries', () => {
  for (const action of [
    'real_memory_content_read',
    'real_memory_preview',
    'real_memory_export',
    'real_memory_import',
    'real_memory_scan',
    'diary_scan',
    'sqlite_scan',
    'vector_index_scan',
    'candidate_cache_scan',
    'recall_audit_scan',
    'sqlite_migration_apply',
    'import_export_apply',
    'backup_restore',
    'provider_call',
    'public_mcp_expansion',
    'durable_memory_write',
    'durable_audit_write',
    'push_tag_release_deploy'
  ]) {
    assert.ok(fixture.blockedActions.includes(action), action);
  }
});

test('safety flags forbid collection, execution, mutation, leakage, and passthrough', () => {
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
    'noMigrationApply',
    'noBackupRestore',
    'noDurableMemoryWrite',
    'noDurableAuditWrite',
    'noRemoteWrite'
  ]) {
    assert.equal(fixture.safety[flag], true, flag);
  }

  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
  assert.equal(fixture.safety.callerFieldsPassthroughAllowed, false);
});

test('required wording and forbidden claims prevent manifest overclaims', () => {
  assert.ok(fixture.requiredWording.some(line => line.includes('synthetic fixture contract only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not mean runtime')));
  assert.ok(fixture.requiredWording.some(line => line.includes('equals failure')));
  assert.ok(fixture.requiredWording.some(line => line.includes('does not collect evidence')));
  assert.ok(fixture.forbiddenClaims.includes('P41 manifest authorizes runtime readiness'));
  assert.ok(fixture.forbiddenClaims.includes('P41 manifest authorizes public MCP expansion'));
  assert.ok(fixture.forbiddenClaims.includes('P41 manifest authorizes real memory scan'));
});

test('fixture text does not expose raw secrets, workspace ids, local paths, or provider endpoints', () => {
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

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
