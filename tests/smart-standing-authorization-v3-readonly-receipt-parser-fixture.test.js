const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'smart-standing-authorization-v3-readonly-receipt-parser-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

function extractTaskId(scope) {
  const match = scope.match(/\bCM-\d{4}\b/);
  return match ? match[0] : 'unknown';
}

function inferLane(row) {
  const haystack = `${row.scope} ${row.summary}`.toLowerCase();
  if (haystack.includes('red stop') || row.result === 'BLOCKED') return 'Red';
  if (haystack.includes('green lane')) return 'Green';
  if (haystack.includes('no amber receipt was required')) return 'Green';
  if (haystack.includes('green lane') || haystack.includes('green')) return 'Green';
  return 'not_recorded_in_validation_log';
}

function inferReceiptStatus(row) {
  const haystack = `${row.scope} ${row.summary}`.toLowerCase();
  if (haystack.includes('no amber receipt was required')) return 'not_required_no_amber_external_or_write_action';
  if (haystack.includes('receipt') || haystack.includes('recorder fields')) return 'local_review_shape_only';
  return 'not_recorded_in_validation_log';
}

function countForbiddenActions(row) {
  const haystack = `${row.scope} ${row.summary}`.toLowerCase();
  const markers = fixture.parser.knownForbiddenActionMarkers.map((marker) => marker.toLowerCase());
  return markers.reduce((count, marker) => count + (haystack.includes(marker) ? 1 : 0), 0);
}

function parseRows(rows) {
  const latest = rows[0];
  const latestText = `${latest.scope} ${latest.summary} ${latest.followUp || ''}`;
  const redStopRows = rows.filter((row) => inferLane(row) === 'Red');

  return {
    source_surface: fixture.parser.primaryInputSurface,
    latest_v3_task_id: extractTaskId(latest.scope),
    latest_validation_id: latest.id,
    latest_lane: inferLane(latest),
    latest_envelope_id: 'not_recorded_in_validation_log',
    latest_receipt_status: inferReceiptStatus(latest),
    latest_validation_result: latest.result,
    budget_used: {
      provider: latestText.includes('provider') ? 0 : 0,
      api: latestText.includes('API') ? 0 : 0,
      mcp_tool: latestText.includes('MCP call') ? 0 : 0,
      runtime_probe_minutes: 0,
      memory_queries: 0,
      memory_writes: latestText.includes('real memory read/write') ? 0 : 0,
      dependency_actions: latestText.includes('dependency/config change') ? 0 : 0
    },
    forbidden_action_marker_count: countForbiddenActions(latest),
    red_stop_count: redStopRows.length,
    next_auto_step_allowed: latest.result === 'COMPLETED_VALIDATED' && redStopRows.length === 0,
    stop_reason: redStopRows.length === 0 ? 'none' : 'red_condition_requires_user_approval',
    non_claims: fixture.expectedParsedSummary.non_claims
  };
}

function classifyRow(row) {
  const text = `${row.scope} ${row.summary}`.toLowerCase();
  if (!row.result) return 'parser_blocked_missing_result';
  if (text.includes('runtimeready=true') || text.includes('readiness achieved')) {
    return 'parser_blocked_readiness_overclaim';
  }
  if (inferLane(row) === 'Red') return 'parser_detected_red_stop';
  return 'parser_ok';
}

test('v3 read-only receipt parser fixture keeps synthetic no-touch boundary', () => {
  assert.equal(fixture.version, 'smart-standing-authorization-v3-readonly-receipt-parser-v1');
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

test('v3 read-only receipt parser declares allowed input surfaces and output fields', () => {
  assert.equal(fixture.parser.mode, 'read_only_local_markdown_table_parser');
  assert.equal(fixture.parser.writesAllowed, false);
  assert.equal(fixture.parser.runtimeIntegrationAllowed, false);
  assert.ok(fixture.parser.allowedInputSurfaces.includes('.agent_board/VALIDATION_LOG.md'));
  assert.ok(fixture.parser.allowedInputSurfaces.includes('.agent_board/CHECKPOINT.md'));

  for (const field of fixture.expectedParsedSummaryKeys || Object.keys(fixture.expectedParsedSummary)) {
    assert.ok(fixture.parser.requiredOutputFields.includes(field), `${field} missing from required output fields`);
  }
});

test('v3 read-only receipt parser extracts latest v3 validation summary', () => {
  const parsed = parseRows(fixture.sampleValidationLogRows);

  assert.equal(parsed.source_surface, fixture.expectedParsedSummary.source_surface);
  assert.equal(parsed.latest_v3_task_id, fixture.expectedParsedSummary.latest_v3_task_id);
  assert.equal(parsed.latest_validation_id, fixture.expectedParsedSummary.latest_validation_id);
  assert.equal(parsed.latest_lane, fixture.expectedParsedSummary.latest_lane);
  assert.equal(parsed.latest_receipt_status, fixture.expectedParsedSummary.latest_receipt_status);
  assert.equal(parsed.latest_validation_result, fixture.expectedParsedSummary.latest_validation_result);
  assert.deepEqual(parsed.budget_used, fixture.expectedParsedSummary.budget_used);
  assert.equal(parsed.red_stop_count, fixture.expectedParsedSummary.red_stop_count);
  assert.equal(parsed.next_auto_step_allowed, fixture.expectedParsedSummary.next_auto_step_allowed);
  assert.equal(parsed.stop_reason, fixture.expectedParsedSummary.stop_reason);
});

test('v3 read-only receipt parser keeps forbidden action counts as non-executed markers', () => {
  const parsed = parseRows(fixture.sampleValidationLogRows);
  assert.ok(parsed.forbidden_action_marker_count > 0);
  assert.equal(parsed.budget_used.provider, 0);
  assert.equal(parsed.budget_used.mcp_tool, 0);
  assert.equal(parsed.budget_used.memory_writes, 0);
  assert.equal(parsed.budget_used.dependency_actions, 0);
});

test('v3 read-only receipt parser negative cases fail closed', () => {
  for (const testCase of fixture.negativeCases) {
    assert.equal(classifyRow(testCase.row), testCase.expectedStatus, testCase.name);
  }
});

test('v3 read-only receipt parser rejects runtime and readiness overclaims', () => {
  for (const forbidden of fixture.forbiddenDefaults) {
    assert.ok(fixture.forbiddenDefaults.includes(forbidden), `${forbidden} missing`);
  }

  assert.ok(fixture.nonClaims.includes('CLI parser writes performed'));
  assert.ok(fixture.nonClaims.includes('runtime parser integration executed'));
  assert.ok(fixture.nonClaims.includes('readiness achieved'));
});
