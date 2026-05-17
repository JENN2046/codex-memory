const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  PUBLIC_MCP_TOOLS,
  REJECTED_ACTIONS,
  REQUIRED_BLOCKERS,
  REQUIRED_REJECTION_DEFAULTS,
  normalizeFinalRcValidationMatrixManifest,
  summarizeFinalRcValidationMatrixManifest
} = require('../src/core/FinalRcValidationMatrixManifest');

const fixturePath = path.join(__dirname, 'fixtures', 'final-rc-validation-matrix-runner-safe-scope-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('P30.2 manifest helper summarizes explicit fixture input without side effects', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const summary = summarizeFinalRcValidationMatrixManifest(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.schemaVersion, 'final-rc-validation-matrix-runner-safe-scope-v1');
  assert.equal(summary.acceptedForPlanning, true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.canExecuteRunner, false);
  assert.equal(summary.canClaimFinalRcReady, false);
  assert.equal(summary.runnerImplemented, false);
  assert.equal(summary.runnerExecuted, false);
  assert.equal(summary.finalRcMatrixExecuted, false);
  assert.equal(summary.blockedDecisionPreserved, true);
  assert.equal(summary.runnerClaimsBlocked, true);
  assert.equal(summary.sourceContract.safe, true);
  assert.deepEqual(summary.publicMcpTools, {
    frozen: true,
    tools: PUBLIC_MCP_TOOLS
  });
  assert.equal(summary.blockers.requiredPresent, true);
  assert.deepEqual(summary.blockers.missingRequired, []);
  assert.equal(summary.rejectionDefaults.failClosed, true);
  assert.deepEqual(summary.rejectionDefaults.missingRequired, []);
  assert.equal(summary.rejectedActions.coversUnsafeActions, true);
  assert.deepEqual(summary.rejectedActions.missingRequired, []);
  assert.equal(summary.safety.mutated, false);
  assert.equal(summary.safety.mutatesInput, false);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.providerCalls, 0);
  assert.equal(summary.safety.durableMemoryTouched, false);
  assert.equal(summary.safety.realMemoryScanned, false);
  assert.equal(summary.safety.publicMcpExpanded, false);
  assert.equal(JSON.stringify(fixture), before);
});

test('P30.2 manifest helper normalizes the safe manifest contract without mutating input', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const normalized = normalizeFinalRcValidationMatrixManifest(fixture);

  assert.equal(normalized.fixtureOnly, true);
  assert.equal(normalized.synthetic, true);
  assert.equal(normalized.sourceContract.mode, 'explicit_safe_inputs_only');
  assert.deepEqual(normalized.publicMcpTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.requiredRejectionDefaults, REQUIRED_REJECTION_DEFAULTS);
  assert.deepEqual(normalized.rejectedActions, REJECTED_ACTIONS);
  assert.deepEqual(
    normalized.blockers.map(blocker => blocker.id),
    REQUIRED_BLOCKERS
  );
  assert.equal(JSON.stringify(fixture), before);
});

test('P30.2 manifest helper does not perform implicit fixture reads', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P30 manifest helper evaluation');
  };

  try {
    const summary = summarizeFinalRcValidationMatrixManifest(fixture);

    assert.equal(summary.acceptedForPlanning, true);
    assert.equal(summary.safety.readsFiles, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
});

test('P30.2 manifest helper fails closed for malformed explicit input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeFinalRcValidationMatrixManifest(malformedInput);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.canExecuteRunner, false);
    assert.equal(summary.canClaimFinalRcReady, false);
    assert.equal(summary.sourceContract.safe, false);
    assert.equal(summary.publicMcpTools.frozen, false);
    assert.equal(summary.blockers.requiredPresent, false);
    assert.equal(summary.rejectionDefaults.failClosed, false);
    assert.equal(summary.rejectedActions.coversUnsafeActions, false);
    assert.equal(summary.safety.mutated, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P30.2 manifest helper rejects side-effectful or live-source evidence contracts', () => {
  const fixture = loadFixture();
  const unsafeManifest = {
    ...fixture,
    sourceContract: {
      ...fixture.sourceContract,
      acceptedSourceTypes: [
        ...fixture.sourceContract.acceptedSourceTypes,
        'live_service'
      ],
      readsFiles: true,
      executesCommands: true
    },
    safety: {
      ...fixture.safety,
      providerCalls: 1,
      serviceStarted: true
    }
  };
  const summary = summarizeFinalRcValidationMatrixManifest(unsafeManifest);

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.providerCalls, 1);
  assert.equal(summary.safety.serviceStarted, true);
  assert.equal(summary.canExecuteRunner, false);
  assert.equal(summary.canClaimFinalRcReady, false);
});

test('P30.2 manifest helper rejects runner execution or readiness claims', () => {
  const fixture = loadFixture();

  for (const unsafeManifest of [
    {
      ...fixture,
      runnerImplemented: true
    },
    {
      ...fixture,
      runnerExecuted: true
    },
    {
      ...fixture,
      finalRcMatrixExecuted: true
    },
    {
      ...fixture,
      decision: 'READY'
    }
  ]) {
    const summary = summarizeFinalRcValidationMatrixManifest(unsafeManifest);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.canExecuteRunner, false);
    assert.equal(summary.canClaimFinalRcReady, false);
  }
});

test('P30.2 manifest helper keeps runtime, A5, and public MCP blockers visible', () => {
  const summary = summarizeFinalRcValidationMatrixManifest(loadFixture());

  assert.ok(summary.matrixGroups.runtimeRequired.includes('schemaVersionRuntimeEnforcement'));
  assert.ok(summary.matrixGroups.runtimeRequired.includes('finalRcMatrixRunnerImplementation'));
  assert.ok(summary.matrixGroups.a5Gated.includes('providerExecution'));
  assert.ok(summary.matrixGroups.a5Gated.includes('pushTagReleaseDeploy'));
  assert.ok(summary.blockers.ids.includes('a5-actions-blocked'));
  assert.equal(summary.publicMcpTools.frozen, true);
  assert.deepEqual(summary.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
});
