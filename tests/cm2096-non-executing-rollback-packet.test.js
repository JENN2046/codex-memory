'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  prepareCm2096FrozenRollbackExecution,
  executeCm2096Rollback
} = require('../src/core/Cm2096NonExecutingFrozenRollbackExecutor');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'phase8_rollback_execution_packet_cm2096_v2.json'), 'utf8'));
const runtimeFacts = { clean: true, commit: packet.implementationCommit, tree: packet.implementationTree };

test('CM-2096 frozen packet passes preparation while retaining zero execution authority', () => {
  const result = prepareCm2096FrozenRollbackExecution(packet, runtimeFacts);
  assert.equal(result.packetAccepted, true, result.blockers.join(', '));
  assert.equal(result.readyForFutureAuthorizationReview, true);
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.tombstoneMemoryMayExecute, false);
  assert.equal(result.verifyMayExecute, false);
  assert.equal(result.nativeActionCount, 0);
  assert.equal(result.rollbackDrillPassed, false);
});

test('CM-2096 frozen executor cannot execute without a future exact decision', () => {
  assert.throws(() => executeCm2096Rollback(), /cm2096_tombstone_execution_not_authorized/);
});

test('CM-2096 preparation fails closed on runtime, target, marker, authority, or limits drift', () => {
  for (const [candidate, facts] of [
    [packet, { ...runtimeFacts, clean: false }],
    [{ ...packet, targetMemoryIdRef: 'vcp-kb-other' }, runtimeFacts],
    [{ ...packet, durableMarkerSha256: '0'.repeat(64) }, runtimeFacts],
    [{ ...packet, executionAuthorized: true }, runtimeFacts],
    [{ ...packet, maxRetries: 1 }, runtimeFacts],
    [{ ...packet, maxSupersedeOperations: 1 }, runtimeFacts],
    [{ ...packet, maxCompensationOperations: 1 }, runtimeFacts]
  ]) assert.equal(prepareCm2096FrozenRollbackExecution(candidate, facts).packetAccepted, false);
});
