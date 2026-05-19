const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-memory-governance-proposal-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview'];
const REQUIRED_OBJECTS = [
  'memory_proposal',
  'supersession_record',
  'tombstone_record',
  'forget_request',
  'governance_review'
];
const REQUIRED_STATES = [
  'DRAFT_NOT_APPROVED',
  'REVIEW_READY_NOT_APPROVED',
  'APPROVED_FOR_EXACT_ACTION',
  'APPLIED_WITH_AUDIT',
  'REJECTED',
  'SUPERSEDED',
  'TOMBSTONED',
  'FORGET_REQUESTED',
  'FORGET_APPLIED_WITH_AUDIT'
];
const APPLY_STATES = ['APPROVED_FOR_EXACT_ACTION', 'APPLIED_WITH_AUDIT', 'FORGET_APPLIED_WITH_AUDIT'];
const FORBIDDEN_READY_CLAIMS = ['RC_READY', 'runtimeReady=true', 'finalRcMatrixReady=true', 'rcReady=true'];

test('phase f memory governance fixture keeps proposal-only safety flags', () => {
  assert.equal(fixture.version, 'phase-f-memory-governance-proposal-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
  assert.equal(fixture.durableMemoryWritten, false);
  assert.equal(fixture.durableAuditWritten, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.providerCalled, false);
});

test('phase f memory governance fixture has exact object and state contract', () => {
  assert.deepEqual(fixture.objects.map((object) => object.id), REQUIRED_OBJECTS);
  assert.deepEqual(fixture.states, REQUIRED_STATES);
});

test('phase f memory governance objects require exact approval before apply boundaries', () => {
  for (const object of fixture.objects) {
    assert.ok(object.purpose, `${object.id} purpose missing`);
    assert.ok(object.applyBoundary, `${object.id} applyBoundary missing`);
    assert.equal(object.requiresExactApproval, true, `${object.id} should require exact approval`);
    assert.equal(object.defaultDurableMutation, false, `${object.id} should not default to durable mutation`);
    assert.equal(APPLY_STATES.includes(object.defaultState), false, `${object.id} defaultState must not be an apply state`);
  }
});

test('phase f memory governance fixture records approval requirements', () => {
  assert.deepEqual(fixture.approvalRequirements, [
    'exactTargetObjectId',
    'exactAction',
    'exactScope',
    'exactAllowedCommandPathOrNoCommandMarker',
    'durableWriteYesNo',
    'realStoreReadYesNo',
    'destructiveDeletionYesNo',
    'auditRequirement',
    'forbiddenSideEffects'
  ]);
});

test('phase f memory governance fixture rejects readiness and authority overclaims', () => {
  for (const claim of FORBIDDEN_READY_CLAIMS) {
    assert.ok(fixture.forbiddenDefaults.includes(claim), `${claim} missing from forbiddenDefaults`);
  }

  assert.ok(fixture.forbiddenDefaults.includes('approval already granted'));
  assert.ok(fixture.forbiddenDefaults.includes('durable memory already written'));
  assert.ok(fixture.forbiddenDefaults.includes('destructive deletion already applied'));
});
