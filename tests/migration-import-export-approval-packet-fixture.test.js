const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'migration-import-export-approval-packet-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = [
  'record_memory',
  'search_memory',
  'memory_overview',
  'audit_memory'
];

const REQUIRED_APPROVAL_PACKETS = [
  'realMemoryPreview',
  'export',
  'import',
  'sqliteMigrationApply',
  'importExportApply',
  'backupCreation',
  'restoreOverwrite',
  'durableReportWrite',
  'packageScriptWiring',
  'publicMcpExpansion',
  'providerModelCall',
  'serviceStartup',
  'remoteReleaseAction'
];

const FORBIDDEN_SAFETY_FLAGS = [
  'realMemoryPreview',
  'realMemoryScan',
  'realMemoryExport',
  'realMemoryImport',
  'sqliteMigrationApply',
  'importExportApply',
  'backupCreated',
  'restorePerformed',
  'restoreOverwrite',
  'durableWrites',
  'providerCalls',
  'serviceStarted',
  'packageChanged',
  'configChanged',
  'publicMcpExpanded',
  'push',
  'pushed',
  'tag',
  'release',
  'deploy',
  'rawSecretExposed',
  'rawWorkspaceIdExposed'
];

test('fixture parses and locks the v1 approval packet shape', () => {
  assert.equal(fixture.schema, 'codex-memory.migration-import-export-approval-packet.v1');
  assert.equal(fixture.phase, 'P27.1-migration-import-export-approval-packet-fixture-shape');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.mode, 'fixture-only');
  assert.equal(fixture.nextStep, 'review-approval-packet-before-any-non-fixture-action');
});

test('approval packet remains blocked before explicit approval', () => {
  assert.equal(fixture.status, 'blocked');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(fixture.executionApproved, false);
});

test('fixture declares no side effects', () => {
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.providerCalls, 0);
  assert.equal(fixture.realMemoryScanned, false);
});

test('public MCP contract remains frozen to three tools', () => {
  assert.deepEqual(fixture.publicMcpTools, PUBLIC_MCP_TOOLS);
});

test('all future approval packets are blocked pending explicit approval', () => {
  assert.deepEqual(
    Object.keys(fixture.packets).sort(),
    [...REQUIRED_APPROVAL_PACKETS].sort()
  );

  for (const packetName of REQUIRED_APPROVAL_PACKETS) {
    const packet = fixture.packets[packetName];

    assert.equal(packet.status, 'BLOCKED_PENDING_APPROVAL', packetName);
    assert.equal(packet.requiresExplicitApproval, true, packetName);
    assert.ok(packet.requiredFields.length >= 3, `${packetName} must list required fields`);
  }
});

test('required approvals cover every P27 hard-stop action family', () => {
  assert.deepEqual(fixture.requiredApprovals, [
    'real_memory_preview_or_scan',
    'real_memory_export',
    'real_memory_import',
    'sqlite_migration_apply',
    'import_export_apply',
    'backup_creation',
    'restore_overwrite_live_state',
    'durable_report_write',
    'package_script_wiring',
    'public_mcp_expansion',
    'provider_model_call',
    'service_startup',
    'config_mutation',
    'push_tag_release_deploy'
  ]);
});

test('packet aliases preserve the P27 document sections', () => {
  assert.deepEqual(Object.keys(fixture.approvalPackets), [
    'realMemoryPreview',
    'export',
    'import',
    'backupRestore',
    'rollbackPartialFailure'
  ]);
});

test('safety flags forbid real mutation, provider, service, and remote actions', () => {
  for (const flag of FORBIDDEN_SAFETY_FLAGS) {
    assert.equal(fixture.safetyFlags[flag], false, `${flag} must remain forbidden`);
  }
});

test('required wording preserves approval-packet boundary', () => {
  assert.ok(fixture.requiredWording.includes('P27 is an approval packet, not an execution phase.'));
  assert.ok(fixture.requiredWording.some(line => line.includes('fixture-only')));
  assert.ok(fixture.requiredWording.some(line => line.includes('blocked pending explicit approval')));
});

test('forbidden claims stay explicit so docs do not overclaim readiness', () => {
  assert.ok(fixture.forbiddenClaims.includes('real migration/import-export readiness is validated'));
  assert.ok(fixture.forbiddenClaims.includes('backup/restore is verified'));
  assert.ok(fixture.forbiddenClaims.includes('provider validation passed'));
});

test('fixture text does not expose raw secrets', () => {
  assert.equal(/fixture-raw-secret|password\s*[=:]|api[_-]?key\s*[=:]|bearer\s+|token\s*[=:]/i.test(fixtureText), false);
});

test('fixture text does not expose raw workspace paths or ids', () => {
  assert.equal(/[A-Z]:[\\/]/.test(fixtureText), false);
  assert.equal(/\\\\/.test(fixtureText), false);
  assert.equal(/raw_workspace_id|workspace-[a-z0-9-]{8,}/i.test(fixtureText), false);
});

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
