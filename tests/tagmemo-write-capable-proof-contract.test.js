'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  EXACT_APPROVAL_TOKEN,
  OPERATOR_EXECUTION_TOKEN,
  SIDECAR_TARGET,
  buildPersistentTagMemoEnrichmentProofCommand
} = require('../src/tagmemo/persistent-enrichment-proof-command');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-write-capable-proof-contract-cm1615-v1.json'
);

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function sorted(values) {
  return [...values].sort();
}

function collectKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
}

function assertRequiredFields(value, fields, label) {
  for (const field of fields) {
    assert.equal(Object.hasOwn(value, field), true, `${label}:${field}`);
  }
}

function assertHash(value, label) {
  assert.match(value, /^sha256:[a-f0-9]{64}$/i, label);
}

function assertNoForbiddenSurface(value, fixture) {
  const keys = collectKeys(value);
  for (const key of fixture.contract.forbiddenRawPrivateKeys) {
    assert.equal(keys.includes(key), false, key);
  }

  const serialized = JSON.stringify(value);
  for (const fragment of fixture.contract.forbiddenValueFragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
}

function hasForbiddenSurface(value, fixture) {
  const keys = collectKeys(value);
  if (fixture.contract.forbiddenRawPrivateKeys.some(key => keys.includes(key))) return true;

  const serialized = JSON.stringify(value);
  return fixture.contract.forbiddenValueFragments.some(fragment => serialized.includes(fragment));
}

function assertLowDisclosureOutputCandidate(output, fixture, label) {
  assertRequiredFields(output, fixture.contract.requiredOutputCandidateFields, label);
  assert.equal(output.outputSchemaVersion, fixture.contract.outputSchemaVersion, label);
  assert.equal(fixture.contract.allowedFutureStatuses.includes(output.statusCandidate), true, label);
  if (output.reason !== null) {
    assert.equal(fixture.contract.allowedFailureReasons.includes(output.reason), true, label);
  }
  assertHash(output.dryRunPlanHash, `${label}:dryRunPlanHash`);
  assertHash(output.rollbackPlanHash, `${label}:rollbackPlanHash`);
  assertHash(output.cleanupPlanHash, `${label}:cleanupPlanHash`);
  assert.equal(output.redacted, true, label);
  assert.equal(output.lowDisclosure, true, label);
  assert.equal(output.publicMcpResponse, false, label);
  assert.equal(output.providerApiCalls, 0, label);
  assert.equal(output.bearerTokenUse, 0, label);
  assert.equal(output.rawScanRun, false, label);
  assert.equal(output.broadMemoryScanRun, false, label);
  assert.equal(output.publicMcpExpansion, 0, label);
  assert.equal(output.productionReadyClaim, false, label);
  assert.equal(output.releaseReadyClaim, false, label);
  assert.equal(output.cutoverReadyClaim, false, label);
  assert.equal(output.completeV8Claim, false, label);
  assertNoForbiddenSurface(output, fixture);
}

function assertBoundedTagProjection(tag, label) {
  assert.equal(tag.schemaVersion, 'tagmemo-sidecar-tag-record-v1', label);
  assert.match(tag.tagRecordId, /^sidecar-tag:cm1615:[a-z0-9:_-]+$/i, `${label}:tagRecordId`);
  assert.match(tag.memoryId, /^memory:cm1615:[a-z0-9:_-]+$/i, `${label}:memoryId`);
  assert.match(tag.tagId, /^tag:cm1615:[a-z0-9:_-]+$/i, `${label}:tagId`);
  assert.equal(typeof tag.tagLabel, 'string', label);
  assert.equal(Number.isFinite(tag.confidenceScore), true, label);
  assert.equal(tag.confidenceScore >= 0 && tag.confidenceScore <= 1, true, label);
  assertHash(tag.derivedFromProjectionHash, `${label}:derivedFromProjectionHash`);
}

test('CM1615 fixture declares fixture/test-only no-write boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-write-capable-proof-contract-cm1615-v1');
  assert.equal(fixture.boundaries.fixtureOnly, true);
  assert.equal(fixture.boundaries.testOnly, true);
  assert.equal(fixture.boundaries.sourceImplementationStarted, false);
  assert.equal(fixture.boundaries.writeCapableImplementationStarted, false);
  assert.equal(fixture.boundaries.proofExecution, false);
  assert.equal(fixture.boundaries.persistentTagEnrichment, false);
  assert.equal(fixture.boundaries.persistentTagWrite, false);
  assert.equal(fixture.boundaries.persistentTagRecordsWritten, 0);
  assert.equal(fixture.boundaries.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.boundaries.providerApiCalls, 0);
  assert.equal(fixture.boundaries.bearerTokenUse, 0);
  assert.equal(fixture.boundaries.rawScan, false);
  assert.equal(fixture.boundaries.broadMemoryScan, false);
  assert.equal(fixture.boundaries.liveMcpProof, false);
  assert.equal(fixture.boundaries.confirmedMutation, false);
  assert.equal(fixture.boundaries.publicMcpExpansion, false);
  assert.equal(fixture.boundaries.releaseTagDeploy, false);
  assert.equal(fixture.boundaries.productionReleaseCutoverReady, false);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
});

test('CM1615 contract preserves seven-tool public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 9);
});

test('CM1615 future write-capable cases are bounded and low disclosure', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    const input = testCase.input;
    const output = testCase.expectedOutputCandidate;

    assert.equal(input.inputSchemaVersion, fixture.contract.inputSchemaVersion, testCase.id);
    assert.equal(input.mode, 'apply', testCase.id);
    assert.equal(input.operatorExecutionTokenExactMatch, true, testCase.id);
    assert.equal(input.skeletonGuardTokenExactMatch, true, testCase.id);
    assert.equal(input.maxWriteCount, 1, testCase.id);
    assert.equal(input.writeCountRequested, 1, testCase.id);
    assert.equal(input.sidecarTarget, fixture.sidecarTarget, testCase.id);
    assertHash(input.expectedDryRunPlanHash, `${testCase.id}:expectedDryRunPlanHash`);
    assertHash(input.actualDryRunPlanHash, `${testCase.id}:actualDryRunPlanHash`);
    assertBoundedTagProjection(input.boundedTagProjection, testCase.id);
    assertLowDisclosureOutputCandidate(output, fixture, testCase.id);

    if (testCase.category === 'future_success_candidate') {
      assert.equal(input.explicitWriteCapableProofFlag, true, testCase.id);
      assert.equal(input.expectedDryRunPlanHash, input.actualDryRunPlanHash, testCase.id);
      assert.equal(input.tombstoneSyncState, 'active', testCase.id);
      assert.equal(output.statusCandidate, 'applied', testCase.id);
      assert.equal(output.writeCountExecutedCandidate, fixture.contract.oneWriteToken, testCase.id);
      assert.equal(output.persistentTagRecordsWrittenCandidate, fixture.contract.oneWriteToken, testCase.id);
      assert.equal(hasForbiddenSurface(input, fixture), false, testCase.id);
    } else {
      assert.notEqual(output.statusCandidate, 'applied', testCase.id);
      assert.equal(output.writeCountExecutedCandidate, fixture.contract.zeroWriteToken, testCase.id);
      assert.equal(output.persistentTagRecordsWrittenCandidate, fixture.contract.zeroWriteToken, testCase.id);
    }
  }
});

test('CM1615 fail-closed contract covers missing flag, hash drift, tombstone suppression, and forbidden input', () => {
  const fixture = loadFixture();
  const byId = new Map(fixture.cases.map(testCase => [testCase.id, testCase]));

  assert.equal(
    byId.get('future-missing-write-capable-flag-fail-closed').expectedOutputCandidate.reason,
    'missing_write_capable_proof_flag'
  );
  assert.equal(
    byId.get('future-dry-run-plan-hash-mismatch-fail-closed').expectedOutputCandidate.reason,
    'dry_run_plan_hash_mismatch'
  );
  assert.equal(
    byId.get('future-tombstone-suppressed-zero-write').expectedOutputCandidate.reason,
    'tombstone_sync_suppressed'
  );
  assert.equal(
    byId.get('future-forbidden-raw-provider-token-rejected').expectedOutputCandidate.reason,
    'forbidden_raw_private_field'
  );
  assert.equal(
    hasForbiddenSurface(byId.get('future-forbidden-raw-provider-token-rejected').input, fixture),
    true
  );
  assertNoForbiddenSurface(
    byId.get('future-forbidden-raw-provider-token-rejected').expectedOutputCandidate,
    fixture
  );
});

test('CM1615 current command compatibility remains dual-token gated no-write', () => {
  const fixture = loadFixture();
  const compatibility = fixture.currentNoWriteCompatibility;
  const output = buildPersistentTagMemoEnrichmentProofCommand(compatibility.commandInput, {
    mode: compatibility.mode,
    maxWriteCount: compatibility.maxWriteCount,
    approvalToken: EXACT_APPROVAL_TOKEN,
    operatorExecutionToken: OPERATOR_EXECUTION_TOKEN
  });

  assert.equal(output.sidecarTarget, SIDECAR_TARGET);
  assert.equal(output.status, compatibility.expectedCurrentStatus);
  assert.equal(output.reason, compatibility.expectedCurrentReason);
  assert.equal(output.approvalStringExactMatch, true);
  assert.equal(output.operatorExecutionTokenExactMatch, true);
  assert.equal(output.skeletonGuardTokenExactMatch, true);
  assert.equal(output.writeCountRequested, 1);
  assert.equal(output.writeCountExecuted, compatibility.expectedCurrentWrites);
  assert.equal(output.persistentTagRecordsWritten, compatibility.expectedCurrentWrites);
  assert.equal(output.boundaryCounters.persistentTagWrites, 0);
  assert.equal(output.boundaryCounters.confirmedMutation, 0);
  assert.equal(output.boundaryCounters.publicMcpExpansion, 0);
});

test('CM1615 fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
