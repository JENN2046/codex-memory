'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2096RollbackSemanticPacket } = require('../src/core/Cm2096RollbackSemanticPacketContract');

const packet = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', 'phase8_rollback_semantic_execution_packet_cm2096.json'), 'utf8'));

test('CM-2096 accepts exact non-executing append-only tombstone semantic packet', () => {
  const result = evaluateCm2096RollbackSemanticPacket(packet);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.executionAuthorized, false);
  assert.equal(result.rollbackDrillPassed, false);
});

test('CM-2096 rejects marker-only proof, target drift, destructive semantics, or premature authority', () => {
  const drifts = [
    { executionAuthorized: true },
    { rollbackDrillPassed: true },
    { targetBinding: { ...packet.targetBinding, durableRecordSha256: '0'.repeat(64) } },
    { rollbackSemantics: { ...packet.rollbackSemantics, physicalDeleteForbidden: false } },
    { markerAwareVerifyDesign: { ...packet.markerAwareVerifyDesign, implementationFrozen: true } },
    { markerAwareVerifyDesign: { ...packet.markerAwareVerifyDesign, requiredOutcomes: { ...packet.markerAwareVerifyDesign.requiredOutcomes, governedRetrievalReturnsTargetAsEffectiveMemory: true } } }
  ];
  for (const drift of drifts) assert.equal(evaluateCm2096RollbackSemanticPacket({ ...packet, ...drift }).accepted, false);
});
