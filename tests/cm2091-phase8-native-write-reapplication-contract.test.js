'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCm2091Phase8NativeWriteReapplication } = require('../src/core/Cm2091Phase8NativeWriteReapplicationContract');

const root = path.join(__dirname, '..');
const load = name => JSON.parse(fs.readFileSync(path.join(root, 'docs', 'near-model-memory-plan-pack', name), 'utf8'));
const input = () => ({request: load('phase8_native_write_reapplication_cm2091.json'), context: load('phase8_execution_context_cm2091.json'), allowlist: load('phase8_execution_allowlist_cm2091.json'), payload: load('phase8_native_write_proof_record_cm2089.json')});

test('CM2091 accepts exact machine-enforced reapplication without execution', () => {
  const result = evaluateCm2091Phase8NativeWriteReapplication(input());
  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.oneShotMachineEnforced, true);
  assert.equal(result.authorizationGranted, false);
  assert.equal(result.nativeWriteExecuted, false);
});

test('CM2091 binds runtime tree and payload blob in the same source commit', () => {
  const value = input();
  const tree = execFileSync('git', ['show', '-s', '--format=%T', value.request.runtimeSourceCommit], {cwd: root, encoding: 'utf8'}).trim();
  const blob = execFileSync('git', ['rev-parse', `${value.request.payloadSourceCommit}:docs/near-model-memory-plan-pack/phase8_native_write_proof_record_cm2089.json`], {cwd: root, encoding: 'utf8'}).trim();
  assert.equal(tree, value.request.runtimeSourceTree);
  assert.equal(blob, value.request.payloadBlobOid);
});

test('CM2091 fails closed on context allowlist durable bytes or counts drift', () => {
  const value = input();
  value.context.innerNativeTransport = 'unknown';
  value.allowlist.maxNativeWrites = 2;
  value.payload.content = 'drift';
  value.request.executionCounters.authorizationClaims = 1;
  const result = evaluateCm2091Phase8NativeWriteReapplication(value);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('context.canonicalSha256'));
  assert.ok(result.blockers.includes('allowlist.canonicalSha256'));
  assert.ok(result.blockers.includes('payload.canonicalSha256'));
  assert.ok(result.blockers.includes('durableRecord.binding'));
  assert.ok(result.blockers.includes('executionCounters.authorizationClaims'));
});
