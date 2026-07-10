'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const {
  CANDIDATE_TAG,
  RELEASE_NOTES_REF,
  RELEASE_NOTES_SHA256,
  TARGET_COMMIT,
  buildCm2083TagApprovalPacket,
  sha256Canonical
} = require('../src/core/Cm2083TagApprovalPacketContract');

function loadPersistedPacket() {
  return JSON.parse(fs.readFileSync(path.join(
    __dirname,
    '..',
    'docs',
    'near-model-memory-plan-pack',
    'tag_approval_packet_cm2083.json'
  ), 'utf8'));
}

test('CM2083 prepares a real hash-bound Tag Approval Packet without approving it', () => {
  const result = buildCm2083TagApprovalPacket();

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.packetPayload.candidate.tag, CANDIDATE_TAG);
  assert.equal(result.packetPayload.candidate.targetCommit, TARGET_COMMIT);
  assert.equal(result.packetPayload.localPolicyGate.policyShapeAccepted, true);
  assert.equal(result.packetPayload.currentDecisions.tagApprovalPacketPassed, false);
  assert.equal(result.packetPayload.requestedDecision.tagApprovalPacketPassed, true);
  assert.equal(result.tagApprovalPacketPreparedForIndependentReview, true);
  assert.equal(result.tagApprovalPacketPassed, false);
  assert.equal(result.tagCreated, false);
  assert.equal(result.tagPushed, false);
  assert.equal(result.packetPayloadSha256, sha256Canonical(result.packetPayload));
});

test('CM2083 release-note bytes and SHA-256 match the packet binding', () => {
  const releaseNotes = fs.readFileSync(path.join(__dirname, '..', RELEASE_NOTES_REF));
  const sha256 = crypto.createHash('sha256').update(releaseNotes).digest('hex');
  const result = buildCm2083TagApprovalPacket();

  assert.equal(releaseNotes.length, result.packetPayload.releaseNotes.bytes);
  assert.equal(sha256, RELEASE_NOTES_SHA256);
  assert.equal(sha256, result.packetPayload.releaseNotes.sha256);
});

test('CM2083 persisted packet matches the generated payload and hash', () => {
  const result = buildCm2083TagApprovalPacket();
  const persisted = loadPersistedPacket();

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.deepEqual(persisted.packetPayload, result.packetPayload);
  assert.equal(persisted.packetPayloadSha256, result.packetPayloadSha256);
  assert.equal(persisted.packetPayloadSha256, sha256Canonical(persisted.packetPayload));
});

test('CM2083 canonical Markdown exposes the exact recursively sorted payload', () => {
  const result = buildCm2083TagApprovalPacket();
  const rendered = fs.readFileSync(path.join(
    __dirname,
    '..',
    'docs',
    'near-model-memory-plan-pack',
    'tag_approval_packet_cm2083_canonical.md'
  ), 'utf8');
  const match = rendered.match(/```json\n([^\n]+)\n```/);

  assert.ok(match, 'canonical JSON block missing');
  assert.deepEqual(JSON.parse(match[1]), result.packetPayload);
  assert.equal(
    crypto.createHash('sha256').update(match[1], 'utf8').digest('hex'),
    result.packetPayloadSha256
  );
});

test('CM2083 packet keeps tag execution and readiness behind separate boundaries', () => {
  const result = buildCm2083TagApprovalPacket();
  const boundaries = result.packetPayload.executionBoundaries;

  assert.equal(boundaries.independentTagApprovalDecisionRequired, true);
  assert.equal(boundaries.packetApprovalDoesNotAuthorizeTagCreation, true);
  assert.equal(boundaries.packetApprovalDoesNotAuthorizeTagPush, true);
  assert.equal(boundaries.separateExactTagCreationAuthorizationRequired, true);
  assert.equal(boundaries.separateExactTagPushAuthorizationRequired, true);
  assert.equal(boundaries.tagCreated, false);
  assert.equal(boundaries.tagPushed, false);
  assert.equal(boundaries.releasePublished, false);
  assert.equal(boundaries.readinessClaimed, false);
  assert.equal(boundaries.fullPlanPackCompletedClaimed, false);
});

test('CM2083 candidate contains no forbidden readiness or full-capability fragments', () => {
  const result = buildCm2083TagApprovalPacket();
  const tag = result.packetPayload.candidate.tag;

  for (const fragment of [
    'production-ready',
    'release-ready',
    'rc-ready',
    'full-capability',
    'production-write',
    'model-memory-complete'
  ]) {
    assert.equal(tag.includes(fragment), false, fragment);
  }
});
