const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'smart-standing-authorization-v3-receipt-rollup-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview'];
const REQUIRED_TASK_IDS = ['CM-0673', 'CM-0674', 'CM-0675', 'CM-0676'];
const REQUIRED_VALIDATION_IDS = ['CMV-0797', 'CMV-0798', 'CMV-0799', 'CMV-0800'];
const REQUIRED_BUDGET_KEYS = [
  'provider',
  'api',
  'mcp_tool',
  'runtime_probe_minutes',
  'real_memory_read_queries',
  'memory_writes',
  'dependency_actions'
];

test('v3 receipt rollup keeps synthetic no-touch boundary', () => {
  assert.equal(fixture.version, 'smart-standing-authorization-v3-receipt-rollup-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.apiCalled, false);
  assert.equal(fixture.mcpToolCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableStateMutated, false);
  assert.equal(fixture.configChanged, false);
  assert.equal(fixture.dependencyChanged, false);
  assert.equal(fixture.remoteActionExecuted, false);
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
});

test('v3 receipt rollup records exact task and validation id sequence', () => {
  assert.deepEqual(fixture.rollup.sourceTaskIds, REQUIRED_TASK_IDS);
  assert.deepEqual(fixture.rollup.sourceValidationIds, REQUIRED_VALIDATION_IDS);
  assert.deepEqual(fixture.receiptRows.map((row) => row.task_id), REQUIRED_TASK_IDS);
  assert.deepEqual(fixture.receiptRows.map((row) => row.validation_id), REQUIRED_VALIDATION_IDS);
});

test('v3 receipt rollup rows contain required receipt fields', () => {
  for (const row of fixture.receiptRows) {
    for (const field of fixture.rollup.requiredRollupFields) {
      assert.ok(Object.prototype.hasOwnProperty.call(row, field), `${row.task_id} missing ${field}`);
    }

    assert.equal(row.lane, 'Green');
    assert.match(row.envelope_id, /^V3-GREEN-CM-\d{4}$/);
    assert.equal(row.validation_result, 'COMPLETED_VALIDATED');
    assert.equal(row.next_auto_step_allowed, true);
    assert.equal(row.stop_reason, 'none');
    assert.ok(Array.isArray(row.non_claims));
    assert.ok(row.non_claims.length > 0);
  }
});

test('v3 receipt rollup aggregate budget usage stays zero for green no-amber work', () => {
  for (const key of REQUIRED_BUDGET_KEYS) {
    assert.equal(fixture.aggregateBudgetUsed[key], 0, `aggregate ${key} should be zero`);
  }

  for (const row of fixture.receiptRows) {
    for (const key of REQUIRED_BUDGET_KEYS) {
      assert.equal(row.budget_used[key], 0, `${row.task_id} ${key} should be zero`);
    }
  }
});

test('v3 receipt rollup preserves red gate boundaries and next step scope', () => {
  assert.equal(fixture.redGateSummary.red_stop_count, 0);
  assert.equal(fixture.redGateSummary.next_auto_step_allowed, true);
  assert.equal(fixture.redGateSummary.stop_reason, 'none');
  assert.ok(fixture.redGateSummary.red_lane_required_for.includes('push'));
  assert.ok(fixture.redGateSummary.red_lane_required_for.includes('public MCP expansion'));
  assert.ok(fixture.redGateSummary.red_lane_required_for.includes('readiness claim'));
  assert.match(fixture.redGateSummary.next_auto_step_scope, /Green docs\/fixture\/test\/board/);
});

test('v3 receipt rollup rejects amber, runtime, remote, and readiness overclaims', () => {
  assert.ok(fixture.blockedActions.includes('Amber external action without receipt'));
  assert.ok(fixture.blockedActions.includes('provider call'));
  assert.ok(fixture.blockedActions.includes('real memory write'));
  assert.ok(fixture.blockedActions.includes('public MCP expansion'));
  assert.ok(fixture.blockedActions.includes('readiness claim'));

  assert.ok(fixture.nonClaims.includes('runtime receipt recorder implemented'));
  assert.ok(fixture.nonClaims.includes('CLI receipt rollup writes performed'));
  assert.ok(fixture.nonClaims.includes('live Amber action executed'));
  assert.ok(fixture.nonClaims.includes('readiness achieved'));

  for (const forbidden of fixture.forbiddenDefaults) {
    assert.ok(fixture.forbiddenDefaults.includes(forbidden), `${forbidden} missing`);
  }
});
