'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const assert = require('node:assert/strict');
const { runCm2113Runtime } = require('../src/cli/cm2113-vcptoolbox-owner-native-proof-runtime');
const { runCm2113ProofController, waitForClose } = require('../src/cli/cm2113-vcptoolbox-owner-native-proof');
const {
  decisionAccepted,
  runCm2113OwnerRuntimeBootstrap
} = require('../src/cli/cm2113-vcptoolbox-owner-runtime-bootstrap');

const bootstrapDecision = JSON.parse(fs.readFileSync(path.join(
  __dirname,
  '../docs/near-model-memory-plan-pack/phase8_vcptoolbox_owner_runtime_bootstrap_decision_cm2113.json'
), 'utf8'));
const FROZEN_REVIEW_TIME = new Date('2026-07-12T12:00:00+08:00');

test('CM-2113 runtime and controller require all three frozen Git commits before effects', async () => {
  await assert.rejects(runCm2113Runtime(null, null, null), /git_commit_argument_required/);
  await assert.rejects(runCm2113ProofController(null, null, null), /git_commit_argument_required/);
  await assert.rejects(runCm2113OwnerRuntimeBootstrap(null), /decision_commit_required/);
});

test('CM-2113 controller waits for stdio close rather than process exit', async () => {
  const child = new EventEmitter();
  let settled = false;
  const result = waitForClose(child).then(value => {
    settled = true;
    return value;
  });
  child.emit('exit', 0, null);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  child.emit('close', 0, null);
  assert.deepEqual(await result, { code: 0, signal: null });
});

test('CM-2113 bootstrap decision rejects nested non-claim expansion', () => {
  assert.equal(decisionAccepted(bootstrapDecision, FROZEN_REVIEW_TIME), true);
  const drifted = structuredClone(bootstrapDecision);
  drifted.nonClaims.productionReady = true;
  assert.equal(decisionAccepted(drifted, FROZEN_REVIEW_TIME), false);
});

test('CM-2113 bootstrap decision rejects an approval that is not effective yet', () => {
  const drifted = structuredClone(bootstrapDecision);
  drifted.approvedAt = '2098-07-12T12:00:01+08:00';
  drifted.expiresAt = '2099-07-12T13:00:00+08:00';
  assert.equal(decisionAccepted(drifted, new Date('2098-07-12T12:00:00+08:00')), false);
});

test('CM-2113 frozen runtime uses process stdio plus local HTTP owner gateway and never primaryWriteOnly shim mode', () => {
  const runtimeSource = fs.readFileSync(path.join(__dirname, '../src/cli/cm2113-vcptoolbox-owner-native-proof-runtime.js'), 'utf8');
  const controllerSource = fs.readFileSync(path.join(__dirname, '../src/cli/cm2113-vcptoolbox-owner-native-proof.js'), 'utf8');
  assert.match(runtimeSource, /createStdioServer/);
  assert.match(runtimeSource, /input:\s*process\.stdin/);
  assert.match(runtimeSource, /output:\s*process\.stdout/);
  assert.match(runtimeSource, /createVcpToolBoxDailyNoteOwnerRuntimeAdapter/);
  assert.match(runtimeSource, /createGovernedMcpVcpNativeVcpToolBoxMcpShimServer/);
  assert.match(runtimeSource, /expectedBearerToken/);
  assert.match(runtimeSource, /validateCm2113VcpToolBoxOwnerNativeProofPacket/);
  assert.doesNotMatch(runtimeSource, /primaryWriteOnly:\s*true/);
  assert.match(controllerSource, /processBoundary:\s*true/);
  assert.match(controllerSource, /executeCm2113RecordMemoryStdioSequence/);
  assert.doesNotMatch(controllerSource, /app\.callTool/);
  assert.doesNotMatch(controllerSource, /env:\s*\{\s*\.\.\.process\.env/);
});

test('CM-2113 isolated runtime exposes only record_memory and preserves zero provider/retry/rollback boundaries', () => {
  const runtimeSource = fs.readFileSync(path.join(__dirname, '../src/cli/cm2113-vcptoolbox-owner-native-proof-runtime.js'), 'utf8');
  assert.match(runtimeSource, /mcpPublicToolNames:\s*\['record_memory'\]/);
  assert.match(runtimeSource, /allowExternalProvider:\s*false/);
  assert.match(runtimeSource, /governedMcpVcpNativeReadDelegationMode:\s*'off'/);
  assert.match(runtimeSource, /rollbackOrCompensationPerformed:\s*false/);
  assert.match(runtimeSource, /phase8Completed:\s*false/);
  assert.match(runtimeSource, /readinessClaimed:\s*false/);
});
