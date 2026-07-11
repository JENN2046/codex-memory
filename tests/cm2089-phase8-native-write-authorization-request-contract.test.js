'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {evaluateCm2089Phase8NativeWriteAuthorizationRequest, sha256Canonical, PAYLOAD_SHA256} = require('../src/core/Cm2089Phase8NativeWriteAuthorizationRequestContract');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'near-model-memory-plan-pack', name), 'utf8'));
}
function input() {
  return {request: load('phase8_native_write_authorization_request_cm2089.json'), payload: load('phase8_native_write_proof_record_cm2089.json')};
}

test('CM2089 accepts the exact non-executing Phase 8 native write authorization request', () => {
  const value = input();
  const result = evaluateCm2089Phase8NativeWriteAuthorizationRequest(value);
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.authorizationRequestPrepared, true);
  assert.equal(result.phase8NativeWriteAuthorizationGranted, false);
  assert.equal(result.nativeWriteExecuted, false);
  assert.equal(result.rollbackOrCompensationExecuted, false);
  assert.equal(sha256Canonical(value.payload), PAYLOAD_SHA256);
});

test('CM2089 fails closed on runtime checkout payload or scope drift', () => {
  const value = input();
  value.request.executionBinding.runtimeSourceCommit = '0'.repeat(40);
  value.payload.title = 'drift';
  value.request.approvalScope.scopeId = 'other-scope';
  const result = evaluateCm2089Phase8NativeWriteAuthorizationRequest(value);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('executionBinding.runtimeSourceCommit'));
  assert.ok(result.blockers.includes('payload.canonicalSha256'));
  assert.ok(result.blockers.includes('approvalScope.scopeId'));
});

test('CM2089 rejects stale runtime fallback or expanded write counts', () => {
  const value = input();
  value.request.executionBinding.staleLoadedRuntimeAllowed = true;
  value.request.writeAction.localFallbackWriteAllowed = true;
  value.request.writeAction.maxNativeWrites = 2;
  const result = evaluateCm2089Phase8NativeWriteAuthorizationRequest(value);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('executionBinding.staleLoadedRuntimeAllowed'));
  assert.ok(result.blockers.includes('writeAction.localFallbackWriteAllowed'));
  assert.ok(result.blockers.includes('writeAction.maxNativeWrites'));
});

test('CM2089 keeps compensation separate and rejects hidden second writes', () => {
  const value = input();
  value.request.rollbackOrCompensation.maxOperations = 1;
  value.request.rollbackOrCompensation.authorizedByThisRequest = true;
  value.request.rollbackOrCompensation.compensationCountsAsNativeWrite = false;
  const result = evaluateCm2089Phase8NativeWriteAuthorizationRequest(value);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('rollbackOrCompensation.maxOperations'));
  assert.ok(result.blockers.includes('rollbackOrCompensation.authorizedByThisRequest'));
  assert.ok(result.blockers.includes('rollbackOrCompensation.compensationCountsAsNativeWrite'));
});

test('CM2089 rejects authorization smuggling execution counters or readiness', () => {
  const value = input();
  value.request.phase8NativeWriteAuthorizationGranted = true;
  value.request.currentExecutionCounters.nativeWrites = 1;
  value.request.forbidden.readinessClaim = true;
  const result = evaluateCm2089Phase8NativeWriteAuthorizationRequest(value);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('request.authorizationState'));
  assert.ok(result.blockers.includes('currentExecutionCounters.nativeWrites'));
  assert.ok(result.blockers.includes('forbidden.readinessClaim'));
});

test('CM2089 rejects missing explicit forbidden counter or receipt fields', () => {
  const value = input();
  delete value.request.forbidden.defaultMcpExpansion;
  delete value.request.currentExecutionCounters.verifyOperations;
  delete value.request.receiptRequirements.auditReceipt;
  const result = evaluateCm2089Phase8NativeWriteAuthorizationRequest(value);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('forbidden.defaultMcpExpansion'));
  assert.ok(result.blockers.includes('currentExecutionCounters.verifyOperations'));
  assert.ok(result.blockers.includes('receiptRequirements.auditReceipt'));
});
