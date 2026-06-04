const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const cliPath = path.join('src', 'cli', 'controlled-write-dry-run.js');
const fixturePath = path.join(__dirname, 'fixtures', 'controlled-write-dry-run-v1.json');

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 30000
  });
}

function parseJsonResult(result) {
  return JSON.parse(result.stdout);
}

test('controlled write dry-run fixture parses', () => {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  assert.equal(fixture.schemaVersion, 'controlled-write-dry-run-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.noDatabase, true);
  assert.equal(fixture.noDiaryWrite, true);
  assert.equal(fixture.noVectorWrite, true);
  assert.equal(fixture.noAuditLogWrite, true);
  assert.equal(fixture.operations.length, 7);
});

test('controlled write dry-run reports all operations without mutation', () => {
  const result = runCli(['--json']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.status, 'ok');
  assert.equal(report.phase, 'P12.3-controlled-write-dry-run-cli-prototypes');
  assert.equal(report.mutated, false);
  assert.equal(report.fixtureOnly, true);
  assert.equal(report.noDatabase, true);
  assert.equal(report.noDiaryWrite, true);
  assert.equal(report.noVectorWrite, true);
  assert.equal(report.noAuditLogWrite, true);
  assert.equal(report.noDurableMemoryWrite, true);
  assert.equal(report.noMcpPublicToolExpansion, true);
  assert.equal(report.publicToolsFrozen, true);
  assert.deepEqual(report.publicTools, ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory']);
  assert.equal(report.operationCount, 7);
  assert.deepEqual(report.operations.map(operation => operation.toolName).sort(), [
    'audit_memory',
    'checkpoint_memory',
    'forget_memory',
    'handoff_memory',
    'supersede_memory',
    'update_memory',
    'validate_memory'
  ]);
  for (const operation of report.operations) {
    assert.equal(operation.toolCandidate, operation.toolName);
    assert.equal(operation.dryRun, true, `${operation.toolName} is not dry-run`);
    assert.equal(operation.mutated, false, `${operation.toolName} mutated`);
    assert.equal(operation.wouldMutate, false, `${operation.toolName} would mutate`);
    assert.equal(operation.requiresDryRunFirst, true, `${operation.toolName} must require dry-run first`);
    assert.equal(operation.safety.noDatabase, true, `${operation.toolName} touched DB boundary`);
    assert.equal(operation.safety.noDiaryWrite, true, `${operation.toolName} touched diary boundary`);
    assert.equal(operation.safety.noVectorWrite, true, `${operation.toolName} touched vector boundary`);
    assert.equal(operation.safety.noAuditLogWrite, true, `${operation.toolName} touched audit log boundary`);
    assert.equal(operation.safety.noDurableMemoryWrite, true, `${operation.toolName} touched memory boundary`);
  }
});

test('controlled write dry-run can filter by candidate tool', () => {
  const result = runCli(['--json', '--tool', 'forget_memory']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  assert.equal(report.status, 'ok');
  assert.equal(report.operationCount, 1);
  assert.equal(report.operations[0].toolName, 'forget_memory');
  assert.equal(report.operations[0].eventType, 'memory_forget');
  assert.equal(report.operations[0].operation, 'memory_forget');
  assert.equal(report.operations[0].toolCandidate, 'forget_memory');
  assert.equal(report.operations[0].wouldMutate, false);
  assert.equal(report.operations[0].defaultAction, 'tombstone');
  assert.equal(report.operations[0].hardDeleteAllowed, false);
  assert.ok(report.operations[0].forbiddenActions.includes('hard_delete_by_default'));
});

test('controlled write dry-run audit previews include required fields and policy flags', () => {
  const result = runCli(['--json', '--tool', 'update_memory']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  const operation = report.operations[0];
  const preview = operation.auditEventPreview;

  assert.equal(operation.noSilentOverwrite, true);
  assert.equal(operation.wouldRequireAuditEvent, true);
  assert.equal(operation.wouldRequirePreviousSnapshot, true);
  assert.equal(operation.wouldRequireDiffSummary, true);
  assert.equal(preview.event_type, 'memory_update');
  assert.equal(preview.tool_name, 'update_memory');
  assert.equal(preview.redaction_applied, true);
  assert.equal(preview.lifecycle_policy_applied, true);
  assert.equal(preview.scope_policy_applied, true);
  assert.equal(preview.diff_summary, '<required-diff-summary>');
  assert.equal(preview.previous_snapshot_ref, '<required-previous-snapshot-ref>');
  for (const field of operation.requiredAuditFields) {
    assert.ok(Object.hasOwn(preview, field), `missing audit preview field: ${field}`);
  }
});

test('controlled write dry-run reports operation-specific safety rules', () => {
  const supersede = parseJsonResult(runCli(['--json', '--tool', 'supersede_memory'])).operations[0];
  assert.equal(supersede.requiresBidirectionalLinks, true);
  assert.equal(supersede.wouldRequireLifecycleTransition, true);

  const validate = parseJsonResult(runCli(['--json', '--tool', 'validate_memory'])).operations[0];
  assert.deepEqual(validate.forbiddenLifecycleTransitions, [
    { from: 'rejected', to: 'active' },
    { from: 'tombstoned', to: 'active' }
  ]);

  const checkpoint = parseJsonResult(runCli(['--json', '--tool', 'checkpoint_memory'])).operations[0];
  assert.equal(checkpoint.wouldRequireEvidence, true);
  assert.equal(checkpoint.wouldRequireScopePolicy, true);
  assert.ok(checkpoint.forbiddenActions.includes('bypass_secret_scanner'));

  const handoff = parseJsonResult(runCli(['--json', '--tool', 'handoff_memory'])).operations[0];
  assert.equal(handoff.wouldRequireEvidence, true);
  assert.equal(handoff.wouldRequireScopePolicy, true);
  assert.ok(handoff.forbiddenActions.includes('bypass_secret_scanner'));
});

test('controlled write dry-run keeps audit_memory read-only', () => {
  const result = runCli(['--json', '--tool', 'audit_memory']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  const report = parseJsonResult(result);
  const operation = report.operations[0];
  assert.equal(operation.toolCandidate, 'audit_memory');
  assert.equal(operation.operation, 'memory_audit_read');
  assert.equal(operation.readOnly, true);
  assert.equal(operation.mutationCapable, false);
  assert.equal(operation.wouldRequireAuditEvent, false);
  assert.equal(operation.auditEventPreview, null);
  assert.ok(operation.forbiddenActions.includes('mutate_from_audit_memory'));
});

test('controlled write dry-run rejects confirm/apply/write/mutate flags', () => {
  for (const flag of ['--confirm', '--apply', '--write', '--mutate']) {
    const result = runCli(['--json', flag]);

    assert.equal(result.status, 1, `${flag} should fail`);
    const report = parseJsonResult(result);
    assert.equal(report.status, 'error');
    assert.equal(report.mutated, false);
    assert.equal(report.rejectedFlag, flag);
    assert.match(report.error, /not supported/);
  }
});

test('controlled write dry-run rejects unknown candidate tools', () => {
  const result = runCli(['--json', '--tool', 'delete_memory']);

  assert.equal(result.status, 1);
  const report = parseJsonResult(result);
  assert.equal(report.status, 'error');
  assert.equal(report.mutated, false);
  assert.equal(report.requestedTool, 'delete_memory');
  assert.ok(report.knownTools.includes('forget_memory'));
  assert.ok(report.knownTools.includes('audit_memory'));
});

test('controlled write dry-run emits readable text output', () => {
  const result = runCli(['--tool', 'checkpoint_memory']);

  assert.equal(result.status, 0, result.stderr || 'non-zero exit');
  assert.match(result.stdout, /status: ok/);
  assert.match(result.stdout, /mutated: false/);
  assert.match(result.stdout, /operation: checkpoint_memory/);
  assert.match(result.stdout, /dryRun=true/);
});
