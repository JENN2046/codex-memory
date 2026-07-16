'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2094Phase8FinalExecutionReleaseRequest } = require('../src/core/Cm2094Phase8FinalExecutionReleaseRequestContract');
const { sha256Canonical } = require('../src/core/Phase8OneShotNativeWriteExecutionGate');

const root = path.join(__dirname, '..');
const request = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'near-model-memory-plan-pack', 'phase8_final_execution_release_request_cm2094.json'), 'utf8'));

test('CM-2094 requests exact final release while remaining non-executable', () => {
  const result = evaluateCm2094Phase8FinalExecutionReleaseRequest(request);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.finalExecutionReleaseReviewRequested, true);
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.nativeWriteMayExecute, false);
  assert.equal(result.nonceMayBeClaimed, false);
});

test('CM-2094 request independently binds the frozen execution manifest Git object and hashes', () => {
  const raw = execFileSync('git', ['show', `${request.executionPacketCommit}:${request.executionManifestPath}`], { cwd: root });
  const blob = execFileSync('git', ['rev-parse', `${request.executionPacketCommit}:${request.executionManifestPath}`], { cwd: root, encoding: 'utf8' }).trim();
  const manifest = JSON.parse(raw.toString('utf8'));
  const { manifestPayloadSha256, ...payload } = manifest;
  assert.equal(blob, request.executionManifestBlobOid);
  assert.equal(raw.length, request.executionManifestBytes);
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), request.executionManifestSha256);
  assert.equal(sha256Canonical(payload), request.executionManifestPayloadSha256);
  assert.equal(manifestPayloadSha256, request.executionManifestPayloadSha256);
  assert.equal(manifest.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(manifest.executionCounters.authorizationClaims, 0);
});

test('CM-2094 request fails closed on authority, packet, expiry, replay, or effect drift', () => {
  for (const drift of [
    { phase8NativeWriteAuthorizationGranted: true },
    { nativeWriteMayExecuteFromThisRequest: true },
    { executionPacketCommit: '0'.repeat(40) },
    { requestedExpiresAt: '2026-07-10T00:00:00+08:00' },
    { authorizationUseCount: 2 },
    { executionCounters: { ...request.executionCounters, nativeWrites: 1 } }
  ]) {
    const result = evaluateCm2094Phase8FinalExecutionReleaseRequest({ ...request, ...drift });
    assert.equal(result.accepted, false);
    assert.equal(result.nativeWriteMayExecute, false);
    assert.equal(result.nonceMayBeClaimed, false);
  }
});
