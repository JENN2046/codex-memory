const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-memory-lifecycle-proposal-states-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'validate_memory', 'tombstone_memory', 'supersede_memory'];
const REQUIRED_OBJECTS = ['proposal', 'supersession', 'tombstone', 'forget-flow'];
const REQUIRED_EXACT_APPROVAL_TRANSITIONS = [
  'proposal-to-approved-exact',
  'supersession-apply',
  'tombstone-apply',
  'forget-apply'
];
const REQUIRED_BLOCKED_TRANSITIONS = [
  'proposal-direct-apply',
  'forget-direct-delete',
  'tombstone-runtime-claim'
];
const FORBIDDEN_READY_CLAIMS = ['RC_READY', 'runtimeReady=true', 'finalRcMatrixReady=true', 'rcReady=true'];

test('phase f lifecycle fixture keeps synthetic no-runtime boundary', () => {
  assert.equal(fixture.version, 'phase-f-memory-lifecycle-proposal-states-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableMemoryWritten, false);
  assert.equal(fixture.durableAuditWritten, false);
});

test('phase f lifecycle fixture covers proposal supersession tombstone and forget flow', () => {
  const objects = new Set(fixture.transitions.map((transition) => transition.object));
  for (const object of REQUIRED_OBJECTS) {
    assert.ok(objects.has(object), `${object} transition missing`);
  }
});

test('phase f lifecycle exact apply-like transitions require exact approval and audit', () => {
  const byId = new Map(fixture.transitions.map((transition) => [transition.id, transition]));
  for (const id of REQUIRED_EXACT_APPROVAL_TRANSITIONS) {
    const transition = byId.get(id);
    assert.ok(transition, `${id} transition missing`);
    assert.equal(transition.requiresExactApproval, true, `${id} must require exact approval`);
    assert.equal(transition.requiresReviewRecord, true, `${id} must require review record`);
    assert.equal(transition.auditRequiredBeforeApply, true, `${id} must require audit before apply`);
  }
});

test('phase f lifecycle fixture distinguishes review transitions from durable mutations', () => {
  const reviewOnly = fixture.transitions.filter((transition) => transition.to.endsWith('REVIEW_READY') || transition.to === 'PROPOSAL_REJECTED');
  assert.ok(reviewOnly.length >= 4);
  for (const transition of reviewOnly) {
    assert.equal(transition.durableMutation, false, `${transition.id} must stay non-mutating`);
  }

  const durableTransitions = fixture.transitions.filter((transition) => transition.durableMutation);
  assert.deepEqual(durableTransitions.map((transition) => transition.id), [
    'supersession-apply',
    'tombstone-apply',
    'forget-apply'
  ]);
});

test('phase f lifecycle fixture blocks unsafe direct apply and readiness transitions', () => {
  const blockedIds = fixture.blockedTransitions.map((transition) => transition.id);
  assert.deepEqual(blockedIds, REQUIRED_BLOCKED_TRANSITIONS);
  for (const transition of fixture.blockedTransitions) {
    assert.ok(transition.reason, `${transition.id} reason missing`);
  }
});

test('phase f lifecycle fixture rejects readiness and authority overclaims', () => {
  for (const claim of FORBIDDEN_READY_CLAIMS) {
    assert.ok(fixture.forbiddenDefaults.includes(claim), `${claim} missing from forbiddenDefaults`);
  }

  assert.ok(fixture.requiredReviewFields.includes('exactApprovalReference'));
  assert.ok(fixture.forbiddenDefaults.includes('durable memory already written'));
  assert.ok(fixture.forbiddenDefaults.includes('destructive deletion already applied'));
});
