'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DERIVED_RUNTIME_MUTATION_POLICY,
  createDerivedRuntimeMutationLifecycle
} = require('../src/core/DerivedRuntimeMutationLifecycle');

const AUTHORIZATION = Object.freeze({
  accepted: true,
  allowedDiaryCount: 1,
  mappingReferenceBound: true,
  mappingDigestBound: true
});

test('derived runtime lifecycle accounts authorized isolated sync and async events', async () => {
  const lifecycle = createDerivedRuntimeMutationLifecycle({
    enabled: true,
    isolatedRuntimeStore: true
  });
  lifecycle.bindAuthorization(AUTHORIZATION);
  assert.equal(lifecycle.track('startup', () => 'ready'), 'ready');
  await lifecycle.track('matrix', async () => true);

  const interim = lifecycle.projection({ consume: true });
  assert.equal(interim.derivedRuntimeMutationPolicy, DERIVED_RUNTIME_MUTATION_POLICY);
  assert.equal(interim.derivedRuntimeMutationAccountingFinal, false);
  assert.equal(interim.derivedRuntimeMutationCumulativeCount, 2);
  assert.equal(interim.derivedRuntimeMutationReceiptDelta, 2);
  assert.equal(interim.derivedRuntimeMutationCompletedCount, 2);
  assert.equal(interim.derivedRuntimeMutationZeroClaimed, false);
  assert.deepEqual(interim.derivedRuntimeMutationTriggerCategories, ['matrix', 'startup']);

  const final = await lifecycle.drain();
  assert.equal(final.derivedRuntimeMutationAccountingFinal, true);
  assert.equal(final.derivedRuntimeMutationBackgroundTasksDrained, true);
  assert.equal(final.derivedRuntimeMutationReceiptDelta, 0);
  assert.equal(final.derivedRuntimeMutationZeroClaimed, false);
});

test('derived runtime lifecycle fails closed without authorization or isolation', () => {
  assert.throws(() => createDerivedRuntimeMutationLifecycle({
    enabled: true,
    isolatedRuntimeStore: false
  }), { code: 'derived_runtime_mutation_isolation_required' });

  const lifecycle = createDerivedRuntimeMutationLifecycle({
    enabled: true,
    isolatedRuntimeStore: true
  });
  assert.throws(() => lifecycle.track('cache', () => true), {
    code: 'derived_runtime_mutation_authorization_required'
  });
});

test('derived runtime lifecycle rejects unknown triggers and premature final receipts', () => {
  const lifecycle = createDerivedRuntimeMutationLifecycle({
    enabled: true,
    isolatedRuntimeStore: true
  });
  lifecycle.bindAuthorization(AUTHORIZATION);
  assert.throws(() => lifecycle.track('source_partition', () => true), {
    code: 'derived_runtime_mutation_trigger_forbidden'
  });

  const second = createDerivedRuntimeMutationLifecycle({
    enabled: true,
    isolatedRuntimeStore: true
  });
  second.bindAuthorization(AUTHORIZATION);
  assert.throws(() => second.projection({ final: true }), {
    code: 'derived_runtime_mutation_final_receipt_before_drain'
  });
});

test('disabled lifecycle does not claim authorization or mutation', async () => {
  const lifecycle = createDerivedRuntimeMutationLifecycle();
  assert.equal(lifecycle.track('not_checked_when_disabled', () => 7), 7);
  const final = await lifecycle.drain();
  assert.equal(final.derivedRuntimeMutationPolicy, 'disabled');
  assert.equal(final.derivedRuntimeMutationAuthorized, false);
  assert.equal(final.derivedRuntimeMutationCumulativeCount, 0);
  assert.equal(final.derivedRuntimeMutationZeroClaimed, true);
});

test('shutdown drain waits for an in-flight derived task before final accounting', async () => {
  const lifecycle = createDerivedRuntimeMutationLifecycle({
    enabled: true,
    isolatedRuntimeStore: true
  });
  lifecycle.bindAuthorization(AUTHORIZATION);
  let release;
  const pending = lifecycle.track('matrix', () => new Promise(resolve => {
    release = resolve;
  }));
  const drain = lifecycle.drain({ timeoutMs: 1000, pollMs: 1 });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(lifecycle.projection().derivedRuntimeMutationActiveCount, 1);
  release(true);
  await pending;
  const final = await drain;
  assert.equal(final.derivedRuntimeMutationAccountingFinal, true);
  assert.equal(final.derivedRuntimeMutationActiveCount, 0);
  assert.equal(final.derivedRuntimeMutationCompletedCount, 1);
});
