const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'smart-standing-authorization-v3-dashboard-recorder-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];
const REQUIRED_RECEIPT_FIELDS = [
  'task_id',
  'lane',
  'envelope_id',
  'action_performed',
  'target_systems',
  'calls_used',
  'files_read',
  'files_written',
  'memory_queries_used',
  'memory_writes_used',
  'dependency_actions_used',
  'validation_run',
  'validation_result',
  'rollback_or_cleanup_available',
  'next_auto_step_allowed',
  'stop_reason'
];

test('v3 dashboard recorder fixture keeps synthetic local boundary', () => {
  assert.equal(fixture.version, 'smart-standing-authorization-v3-dashboard-recorder-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.mcpToolCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableStateMutated, false);
  assert.equal(fixture.configChanged, false);
  assert.equal(fixture.dependencyChanged, false);
  assert.equal(fixture.remoteActionExecuted, false);
});

test('v3 dashboard exposes policy state, lane, budget, receipt, and red gate fields', () => {
  for (const field of [
    'policy_version',
    'project_state',
    'current_task_id',
    'current_lane',
    'envelope_id',
    'budget_limit',
    'budget_used',
    'budget_remaining',
    'receipt_status',
    'last_validation',
    'red_gate_status',
    'next_auto_step_allowed',
    'stop_reason'
  ]) {
    assert.ok(fixture.dashboard.requiredFields.includes(field), `${field} missing`);
  }

  assert.equal(fixture.dashboard.projectState, 'NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED');
  assert.deepEqual(fixture.dashboard.allowedLanes, ['Green', 'Amber', 'Red']);
});

test('v3 dashboard preserves public mcp freeze and forbidden summary flags', () => {
  assert.deepEqual(fixture.dashboard.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);

  for (const [key, value] of Object.entries(fixture.dashboard.forbiddenSummaryFlags)) {
    assert.equal(value, false, `${key} should be false`);
  }
});

test('v3 default envelope keeps budget ceilings and hard false defaults', () => {
  assert.equal(fixture.defaultEnvelope.maxProviderCalls, 3);
  assert.equal(fixture.defaultEnvelope.maxApiCalls, 5);
  assert.equal(fixture.defaultEnvelope.maxMcpToolCalls, 5);
  assert.equal(fixture.defaultEnvelope.maxMemoryWrites, 1);
  assert.equal(fixture.defaultEnvelope.overwriteExistingFilesAllowed, false);
  assert.equal(fixture.defaultEnvelope.secretValueReadAllowed, false);
  assert.equal(fixture.defaultEnvelope.publicMcpExpansionAllowed, false);
  assert.equal(fixture.defaultEnvelope.pushAllowed, false);
  assert.equal(fixture.defaultEnvelope.tagReleaseDeployAllowed, false);
  assert.equal(fixture.defaultEnvelope.destructiveActionAllowed, false);
});

test('v3 recorder defines required receipt fields and storage surfaces', () => {
  assert.deepEqual(fixture.recorder.requiredReceiptFields, REQUIRED_RECEIPT_FIELDS);
  assert.ok(fixture.recorder.storageSurfaces.includes('STATUS.md'));
  assert.ok(fixture.recorder.storageSurfaces.includes('.agent_board/VALIDATION_LOG.md'));
  assert.ok(fixture.recorder.eventTypes.includes('green_no_amber_receipt'));
  assert.ok(fixture.recorder.eventTypes.includes('amber_external_action_receipt'));
  assert.ok(fixture.recorder.eventTypes.includes('red_gate_stop'));
});

test('v3 recorder sample records distinguish green receipt from red stop', () => {
  const byId = new Map(fixture.sampleRecords.map((record) => [record.task_id, record]));
  const green = byId.get('CM-0673');
  const red = byId.get('example-red-stop');

  assert.equal(green.lane, 'Green');
  assert.equal(green.event_type, 'green_no_amber_receipt');
  assert.equal(green.calls_used.provider, 0);
  assert.equal(green.memory_writes_used, 0);
  assert.equal(green.next_auto_step_allowed, true);
  assert.equal(green.stop_reason, 'none');

  assert.equal(red.lane, 'Red');
  assert.equal(red.event_type, 'red_gate_stop');
  assert.equal(red.next_auto_step_allowed, false);
  assert.equal(red.stop_reason, 'red_condition_requires_user_approval');
  assert.equal(red.red_condition, 'public_mcp_expansion');
});

test('v3 dashboard recorder rejects runtime and readiness overclaims', () => {
  for (const forbidden of [
    'RC_READY',
    'runtimeReady=true',
    'public MCP expansion approved',
    'provider call executed',
    'real memory store read',
    'durable write completed',
    'push executed automatically'
  ]) {
    assert.ok(fixture.forbiddenDefaults.includes(forbidden), `${forbidden} missing`);
  }

  assert.ok(fixture.nonClaims.includes('runtime dashboard implemented'));
  assert.ok(fixture.nonClaims.includes('CLI recorder implemented'));
  assert.ok(fixture.nonClaims.includes('readiness achieved'));
});
