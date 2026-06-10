'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { TOOL_DEFINITIONS } = require('../src/core/constants');
const {
  EXACT_APPROVAL_TOKEN,
  OPERATOR_EXECUTION_TOKEN,
  OUTPUT_SCHEMA_VERSION,
  SIDECAR_TARGET,
  buildPersistentTagMemoEnrichmentProofCommand
} = require('../src/tagmemo/persistent-enrichment-proof-command');

const fixturePath = path.join(
  __dirname,
  'fixtures',
  'tagmemo-persistent-enrichment-proof-command-sprint-e-v1.json'
);
const sourcePath = path.join(__dirname, '..', 'src', 'tagmemo', 'persistent-enrichment-proof-command.js');
const scriptPath = path.join(__dirname, '..', 'scripts', 'tagmemo-enrichment-proof.js');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function sorted(values) {
  return [...values].sort();
}

function assertNoForbiddenFragments(value, fragments) {
  const serialized = JSON.stringify(value);
  for (const fragment of fragments) {
    assert.equal(serialized.includes(fragment), false, fragment);
  }
}

function assertBoundaryCounters(output) {
  assert.equal(output.boundaryCounters.providerApiCalls, 0);
  assert.equal(output.boundaryCounters.bearerTokenUse, 0);
  assert.equal(output.boundaryCounters.rawScanRun, false);
  assert.equal(output.boundaryCounters.broadMemoryScanRun, false);
  assert.equal(output.boundaryCounters.secondEffectiveRecordMemoryWrite, 0);
  assert.equal(output.boundaryCounters.confirmedMutation, 0);
  assert.equal(output.boundaryCounters.publicMcpExpansion, 0);
  assert.equal(output.boundaryCounters.persistentTagWrites, 0);
  assert.equal(output.boundaryCounters.productionReadyClaim, false);
  assert.equal(output.boundaryCounters.releaseReadyClaim, false);
  assert.equal(output.boundaryCounters.cutoverReadyClaim, false);
  assert.equal(output.boundaryCounters.completeV8Claim, false);
  assert.equal(output.writeCountExecuted, 0);
  assert.equal(output.persistentTagRecordsWritten, 0);
  assert.equal(output.publicMcpResponse, false);
  assert.equal(output.redacted, true);
  assert.equal(output.lowDisclosure, true);
}

test('CM1604 fixture declares command skeleton no-write boundaries', () => {
  const fixture = loadFixture();

  assert.equal(fixture.schemaVersion, 'tagmemo-persistent-enrichment-proof-command-sprint-e-v1');
  assert.equal(fixture.boundaries.commandSkeletonOnly, true);
  assert.equal(fixture.boundaries.dryRunPlanningOnly, true);
  assert.equal(fixture.boundaries.applyStubFailClosed, true);
  assert.equal(fixture.boundaries.persistentTagEnrichment, false);
  assert.equal(fixture.boundaries.persistentTagWrite, false);
  assert.equal(fixture.boundaries.effectiveRecordMemoryWrites, 0);
  assert.equal(fixture.boundaries.providerApiCalls, 0);
  assert.equal(fixture.boundaries.bearerTokenUse, 0);
  assert.equal(fixture.boundaries.rawScan, false);
  assert.equal(fixture.boundaries.broadMemoryScan, false);
  assert.equal(fixture.boundaries.publicMcpExpansion, false);
  assert.equal(fixture.boundaries.productionReleaseCutoverReady, false);
  assert.equal(fixture.boundaries.completeV8Claimed, false);
});

test('CM1604 command skeleton preserves seven-tool public MCP surface', () => {
  const fixture = loadFixture();

  assert.deepEqual(sorted(TOOL_DEFINITIONS.map(tool => tool.name)), sorted(fixture.expectedPublicTools));
  assert.equal(TOOL_DEFINITIONS.length, 7);
});

test('CM1604 command skeleton produces deterministic redacted plans for fixture cases', () => {
  const fixture = loadFixture();

  for (const testCase of fixture.cases) {
    const options = {
      mode: testCase.mode,
      maxWriteCount: testCase.maxWriteCount,
      approvalToken: testCase.approvalToken,
      operatorExecutionToken: testCase.operatorExecutionToken
    };
    const first = buildPersistentTagMemoEnrichmentProofCommand(testCase.input, options);
    const second = buildPersistentTagMemoEnrichmentProofCommand(testCase.input, options);

    assert.deepEqual(first, second, testCase.id);
    assert.equal(first.schemaVersion, OUTPUT_SCHEMA_VERSION);
    assert.equal(first.sidecarTarget, SIDECAR_TARGET);
    assert.equal(first.status, testCase.expected.status, testCase.id);
    assert.equal(first.reason, testCase.expected.reason, testCase.id);
    assert.equal(first.writeCountExecuted, testCase.expected.writeCountExecuted, testCase.id);
    assert.equal(first.persistentTagRecordsWritten, testCase.expected.persistentTagRecordsWritten, testCase.id);
    if (Object.hasOwn(testCase.expected, 'writeCountLimit')) {
      assert.equal(first.writeCountLimit, testCase.expected.writeCountLimit, testCase.id);
    }
    if (Object.hasOwn(testCase.expected, 'writeCountRequested')) {
      assert.equal(first.writeCountRequested, testCase.expected.writeCountRequested, testCase.id);
    }
    if (Object.hasOwn(testCase.expected, 'approvalStringExactMatch')) {
      assert.equal(first.approvalStringExactMatch, testCase.expected.approvalStringExactMatch, testCase.id);
    }
    if (Object.hasOwn(testCase.expected, 'operatorExecutionTokenExactMatch')) {
      assert.equal(
        first.operatorExecutionTokenExactMatch,
        testCase.expected.operatorExecutionTokenExactMatch,
        testCase.id
      );
    }
    if (Object.hasOwn(testCase.expected, 'skeletonGuardTokenExactMatch')) {
      assert.equal(
        first.skeletonGuardTokenExactMatch,
        testCase.expected.skeletonGuardTokenExactMatch,
        testCase.id
      );
    }
    if (Object.hasOwn(testCase.expected, 'tombstoneSyncState')) {
      assert.equal(first.tombstoneSyncState, testCase.expected.tombstoneSyncState, testCase.id);
    }
    assertBoundaryCounters(first);
    assertNoForbiddenFragments(first, fixture.forbiddenFragments);
  }
});

test('CM1608 apply with dual token is gated and still writes nothing', () => {
  const fixture = loadFixture();
  const testCase = fixture.cases.find(item => item.id === 'apply-dual-token-gated-no-write');
  const output = buildPersistentTagMemoEnrichmentProofCommand(testCase.input, {
    mode: 'apply',
    maxWriteCount: 1,
    approvalToken: EXACT_APPROVAL_TOKEN,
    operatorExecutionToken: OPERATOR_EXECUTION_TOKEN
  });

  assert.equal(output.approvalStringExactMatch, true);
  assert.equal(output.operatorExecutionTokenExactMatch, true);
  assert.equal(output.skeletonGuardTokenExactMatch, true);
  assert.equal(output.status, 'gated');
  assert.equal(output.reason, 'ready_for_proof_no_write');
  assert.equal(output.writeCountRequested, 1);
  assert.equal(output.writeCountExecuted, 0);
  assert.equal(output.persistentTagRecordsWritten, 0);
  assert.equal(output.boundaryCounters.confirmedMutation, 0);
});

test('CM1604 source avoids production persistence, provider, and record_memory paths', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  assert.equal(source.includes("require('node:fs')"), false);
  assert.equal(source.includes('MemoryWriteService'), false);
  assert.equal(/require\(['"].*storage/.test(source), false);
  assert.equal(/require\(['"].*sqlite/i.test(source), false);
  assert.equal(/new\s+\w*(?:Store|Database|Client)\b/.test(source), false);
  assert.equal(source.includes('record_memory'), false);
  assert.equal(source.includes('fetch('), false);
  assert.equal(source.includes('axios'), false);
});

test('CM1604 CLI skeleton reads only bounded fixture input and emits redacted JSON', () => {
  const result = spawnSync(process.execPath, [
    scriptPath,
    '--mode',
    'dry-run',
    '--case',
    'valid-active-dry-run-plan',
    '--max-write-count',
    '1'
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, 'planned');
  assert.equal(output.sidecarTarget, SIDECAR_TARGET);
  assertBoundaryCounters(output);
  assertNoForbiddenFragments(output, loadFixture().forbiddenFragments);
});

test('CM1608 CLI accepts separate operator and skeleton guard tokens without writing', () => {
  const result = spawnSync(process.execPath, [
    scriptPath,
    '--mode',
    'apply',
    '--case',
    'valid-active-dry-run-plan',
    '--max-write-count',
    '1',
    '--operator-approval-placeholder',
    '--approval-placeholder'
  ], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, 'gated');
  assert.equal(output.reason, 'ready_for_proof_no_write');
  assert.equal(output.approvalStringExactMatch, true);
  assert.equal(output.operatorExecutionTokenExactMatch, true);
  assert.equal(output.skeletonGuardTokenExactMatch, true);
  assertBoundaryCounters(output);
});

test('CM1604 fixture test does not rewrite its fixture file', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');
  loadFixture();
  const after = fs.readFileSync(fixturePath, 'utf8');

  assert.equal(after, before);
});
