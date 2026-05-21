const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const fixturePath = path.join(__dirname, 'fixtures', 'phase-f-fixture-drift-changelog-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const REQUIRED_ENTRIES = ['CM-0673', 'CM-0674', 'CM-0675', 'CM-0676', 'CM-0677'];
const REQUIRED_VALIDATIONS = ['CMV-0797', 'CMV-0798', 'CMV-0799', 'CMV-0800', 'CMV-0801'];
const REQUIRED_PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview'];

test('phase f fixture drift changelog keeps synthetic no-runtime boundary', () => {
  assert.equal(fixture.version, 'phase-f-fixture-drift-changelog-v1');
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
  assert.equal(fixture.evidenceClass, 'synthetic_fixture_only');
  assert.equal(fixture.runtimeExecuted, false);
  assert.equal(fixture.providerCalled, false);
  assert.equal(fixture.mcpToolCalled, false);
  assert.equal(fixture.realMemoryStoreRead, false);
  assert.equal(fixture.durableStateMutated, false);
  assert.deepEqual(fixture.publicMcpTools, REQUIRED_PUBLIC_MCP_TOOLS);
});

test('phase f fixture drift changelog records exact recent cm and validation ids', () => {
  assert.deepEqual(fixture.entries.map((entry) => entry.cmId), REQUIRED_ENTRIES);
  assert.deepEqual(fixture.entries.map((entry) => entry.validationId), REQUIRED_VALIDATIONS);
  assert.equal(new Set(fixture.entries.map((entry) => entry.packId)).size, fixture.entries.length);
});

test('phase f fixture drift changelog entries contain required artifact and validation fields', () => {
  for (const entry of fixture.entries) {
    for (const field of fixture.requiredEntryFields) {
      assert.ok(Object.hasOwn(entry, field), `${entry.cmId} missing ${field}`);
    }

    assert.equal(entry.changeType, 'added');
    assert.ok(entry.docs.length > 0, `${entry.cmId} docs empty`);
    assert.ok(entry.fixtures.length > 0, `${entry.cmId} fixtures empty`);
    assert.ok(entry.tests.length > 0, `${entry.cmId} tests empty`);
    assert.match(entry.targetedValidation, /^\d+\/\d+$/);
    assert.match(entry.combinedValidation, /^\d+\/\d+$/);
    assert.equal(entry.lane, 'Green');
  }
});

test('phase f fixture drift changelog records v3 receipt statuses without overclaiming runtime', () => {
  const byId = new Map(fixture.entries.map((entry) => [entry.cmId, entry]));
  assert.equal(byId.get('CM-0673').receiptStatus, 'not_required_no_amber_external_or_write_action');
  assert.equal(byId.get('CM-0674').receiptStatus, 'local_review_shape_only');
  assert.equal(byId.get('CM-0675').receiptStatus, 'parser_contract_only');
  assert.equal(byId.get('CM-0676').receiptStatus, 'fixture_changelog_only');
  assert.equal(byId.get('CM-0677').receiptStatus, 'receipt_rollup_only');

  for (const entry of fixture.entries) {
    assert.ok(entry.nonClaims.length > 0, `${entry.cmId} nonClaims empty`);
  }
});

test('phase f fixture drift changelog blocks release and readiness interpretations', () => {
  for (const action of ['release note claim', 'tag', 'push', 'provider call', 'real memory scan', 'public MCP expansion', 'readiness claim']) {
    assert.ok(fixture.blockedActions.includes(action), `${action} missing`);
  }

  for (const forbidden of ['RC_READY', 'runtimeReady=true', 'public MCP expansion approved', 'push executed automatically']) {
    assert.ok(fixture.forbiddenDefaults.includes(forbidden), `${forbidden} missing`);
  }
});
