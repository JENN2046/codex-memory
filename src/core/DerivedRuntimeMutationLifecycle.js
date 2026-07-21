'use strict';

const DERIVED_RUNTIME_MUTATION_POLICY = 'isolated_derived_runtime_mutation_v1';
const DERIVED_RUNTIME_MUTATION_ACCOUNTING_MODE = 'lifecycle_event_v1';
const MAX_DERIVED_RUNTIME_MUTATIONS_PER_READ_RECEIPT = 64;
const ALLOWED_DERIVED_RUNTIME_MUTATION_TRIGGERS = Object.freeze(new Set([
  'startup',
  'hydration',
  'cache',
  'vector',
  'tag',
  'matrix'
]));

function policyError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function isPromiseLike(value) {
  return value && typeof value.then === 'function';
}

function createDerivedRuntimeMutationLifecycle({
  enabled = false,
  isolatedRuntimeStore = false
} = {}) {
  if (enabled === true && isolatedRuntimeStore !== true) {
    throw policyError('derived_runtime_mutation_isolation_required');
  }

  let authorizationBound = false;
  let authorizationEpoch = 0;
  let finalized = false;
  let policyViolation = false;
  let cumulativeCount = 0;
  let completedCount = 0;
  let failedCount = 0;
  let receiptCursor = 0;
  let sequence = 0;
  const active = new Map();
  const triggerCategories = new Set();

  function latch(code) {
    policyViolation = true;
    throw policyError(code);
  }

  function bindAuthorization(binding = {}) {
    if (enabled !== true) return false;
    if (finalized) latch('derived_runtime_mutation_lifecycle_finalized');
    if (binding.accepted !== true ||
        binding.mappingReferenceBound !== true ||
        binding.mappingDigestBound !== true ||
        !Number.isInteger(binding.allowedDiaryCount) ||
        binding.allowedDiaryCount < 1 || binding.allowedDiaryCount > 8) {
      latch('derived_runtime_mutation_authorization_invalid');
    }
    authorizationBound = true;
    authorizationEpoch += 1;
    return true;
  }

  function begin(trigger) {
    if (enabled !== true) return null;
    if (policyViolation) {
      throw policyError('derived_runtime_mutation_policy_latched');
    }
    if (finalized) latch('derived_runtime_mutation_lifecycle_finalized');
    if (!authorizationBound) latch('derived_runtime_mutation_authorization_required');
    if (!ALLOWED_DERIVED_RUNTIME_MUTATION_TRIGGERS.has(trigger)) {
      latch('derived_runtime_mutation_trigger_forbidden');
    }
    if (
      cumulativeCount - receiptCursor >=
      MAX_DERIVED_RUNTIME_MUTATIONS_PER_READ_RECEIPT
    ) {
      latch('derived_runtime_mutation_budget_exhausted');
    }
    const handle = Object.freeze({
      id: ++sequence,
      trigger,
      authorizationEpoch
    });
    active.set(handle.id, handle);
    triggerCategories.add(trigger);
    cumulativeCount += 1;
    return handle;
  }

  function settle(handle, failed) {
    if (handle === null && enabled !== true) return;
    const current = handle && active.get(handle.id);
    if (!current || current !== handle) latch('derived_runtime_mutation_handle_invalid');
    active.delete(handle.id);
    if (failed) failedCount += 1;
    else completedCount += 1;
  }

  function track(trigger, operation) {
    if (typeof operation !== 'function') {
      latch('derived_runtime_mutation_operation_invalid');
    }
    if (enabled !== true) return operation();
    const handle = begin(trigger);
    let result;
    try {
      result = operation();
    } catch (error) {
      settle(handle, true);
      throw error;
    }
    if (!isPromiseLike(result)) {
      settle(handle, false);
      return result;
    }
    return Promise.resolve(result).then(
      value => {
        settle(handle, false);
        return value;
      },
      error => {
        settle(handle, true);
        throw error;
      }
    );
  }

  function projection({ consume = false, final = false } = {}) {
    if (final && (!finalized || active.size !== 0)) {
      latch('derived_runtime_mutation_final_receipt_before_drain');
    }
    const receiptDelta = cumulativeCount - receiptCursor;
    if (consume) receiptCursor = cumulativeCount;
    return Object.freeze({
      derivedRuntimeMutationPolicy: enabled
        ? DERIVED_RUNTIME_MUTATION_POLICY
        : 'disabled',
      derivedRuntimeMutationAccountingMode: enabled
        ? DERIVED_RUNTIME_MUTATION_ACCOUNTING_MODE
        : 'not_applicable',
      derivedRuntimeMutationAuthorized: enabled && authorizationBound && !policyViolation,
      derivedRuntimeMutationAccountingFinal: final === true,
      derivedRuntimeMutationBackgroundTasksDrained: final === true && active.size === 0,
      derivedRuntimeMutationCumulativeCount: enabled ? cumulativeCount : 0,
      derivedRuntimeMutationReceiptDelta: enabled ? receiptDelta : 0,
      derivedRuntimeMutationActiveCount: enabled ? active.size : 0,
      derivedRuntimeMutationCompletedCount: enabled ? completedCount : 0,
      derivedRuntimeMutationFailedCount: enabled ? failedCount : 0,
      derivedRuntimeMutationTriggerCategories: enabled
        ? Object.freeze([...triggerCategories].sort())
        : Object.freeze([]),
      derivedRuntimeMutationZeroClaimed: final === true && cumulativeCount === 0,
      derivedRuntimeMutationPolicyViolation: policyViolation,
      memoryWritePerformed: false,
      primaryMemoryStoreWritePerformed: false,
      derivedIndexWritePerformed: enabled && cumulativeCount > 0,
      durableWritePerformed: enabled && cumulativeCount > 0,
      durableWriteScope: enabled && cumulativeCount > 0 ? 'isolated_derived_index' : null,
      sourcePartitionMutationPerformed: false,
      legacyPartitionAccessed: false,
      ambiguousPartitionAccessed: false,
      unregisteredPartitionAccessed: false,
      unscopedNativeSearchUsed: false,
      rawDiaryNamesReturned: false,
      rawMemoryContentDisclosed: false,
      secretMaterialDisclosed: false,
      derivedRuntimeMutationRawDetailsDisclosed: false
    });
  }

  async function waitForIdle({ timeoutMs = 5000, pollMs = 10 } = {}) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000 ||
        !Number.isInteger(pollMs) || pollMs < 1 || pollMs > 1000) {
      latch('derived_runtime_mutation_drain_options_invalid');
    }
    const deadline = Date.now() + timeoutMs;
    while (active.size > 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, pollMs));
    }
    if (active.size > 0) latch('derived_runtime_mutation_shutdown_drain_timeout');
    return true;
  }

  async function drain(options = {}) {
    await waitForIdle(options);
    finalized = true;
    return projection({ consume: true, final: true });
  }

  return Object.freeze({
    bindAuthorization,
    begin,
    complete: handle => settle(handle, false),
    fail: handle => settle(handle, true),
    track,
    projection,
    waitForIdle,
    drain
  });
}

module.exports = {
  ALLOWED_DERIVED_RUNTIME_MUTATION_TRIGGERS,
  DERIVED_RUNTIME_MUTATION_ACCOUNTING_MODE,
  DERIVED_RUNTIME_MUTATION_POLICY,
  MAX_DERIVED_RUNTIME_MUTATIONS_PER_READ_RECEIPT,
  createDerivedRuntimeMutationLifecycle
};
