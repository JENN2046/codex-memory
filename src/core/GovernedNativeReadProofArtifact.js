'use strict';

const crypto = require('node:crypto');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return value;
}

function validateReceiptChain(receipts, counters) {
  const blockers = [];
  const native = receipts?.native;
  const bridge = receipts?.bridge;
  const context = receipts?.context;
  if (!native || !bridge || !context) return ['receipt_chain_missing'];
  for (const [key, expected] of Object.entries({
    authorization_resolved_before_provider: true,
    diary_allowlist_enforced_before_index_load: true,
    diary_allowlist_enforced_before_vector_search: true,
    result_scope_postcheck_passed: true,
    unscoped_native_search_used: false,
    mapping_reference_bound: true,
    mapping_digest_bound: true,
    raw_diary_names_returned: false
  })) {
    if (native[key] !== expected) blockers.push(`native.${key}`);
  }
  if (!Number.isSafeInteger(native.allowed_diary_count) || native.allowed_diary_count < 1 ||
    native.allowed_diary_count > 8) blockers.push('native.allowed_diary_count');
  const nativeDigest = digest(native);
  if (bridge.native_receipt_digest !== nativeDigest || bridge.accepted !== true) {
    blockers.push('bridge.native_receipt_binding');
  }
  const bridgeDigest = digest(bridge);
  if (context.bridge_receipt_digest !== bridgeDigest) blockers.push('context.bridge_receipt_binding');
  if (context.primary_memory_write_performed !== (counters.primaryMemoryWrites > 0)) {
    blockers.push('context.primary_memory_write_performed');
  }
  if (context.derived_index_write_performed !== (counters.derivedIndexWrites > 0)) {
    blockers.push('context.derived_index_write_performed');
  }
  if (context.other_durable_mutation_performed !== (counters.otherDurableMutations > 0)) {
    blockers.push('context.other_durable_mutation_performed');
  }
  return blockers;
}

async function generateGovernedNativeReadProofArtifact({ invoke, sourceIdentityDigest } = {}) {
  if (typeof invoke !== 'function') throw new Error('proof_actual_invoker_required');
  if (!/^[0-9a-f]{64}$/.test(String(sourceIdentityDigest || ''))) {
    throw new Error('proof_source_identity_digest_required');
  }
  const counters = {
    invocations: 1,
    providerCalls: 0,
    nativeSearchCalls: 0,
    unscopedNativeSearchCalls: 0,
    localFallbackUses: 0,
    primaryMemoryWrites: 0,
    derivedIndexWrites: 0,
    otherDurableMutations: 0
  };
  const events = Object.freeze({
    providerCall: () => { counters.providerCalls += 1; },
    nativeSearch: ({ scoped } = {}) => {
      counters.nativeSearchCalls += 1;
      if (scoped !== true) counters.unscopedNativeSearchCalls += 1;
    },
    localFallback: () => { counters.localFallbackUses += 1; },
    primaryMemoryWrite: () => { counters.primaryMemoryWrites += 1; },
    derivedIndexWrite: () => { counters.derivedIndexWrites += 1; },
    otherDurableMutation: () => { counters.otherDurableMutations += 1; }
  });
  const outcome = await invoke(events);
  if (outcome?.counters !== undefined || outcome?.finalCounters !== undefined) {
    throw new Error('proof_caller_supplied_counters_forbidden');
  }
  const blockers = validateReceiptChain(outcome?.receipts, counters);
  if (counters.unscopedNativeSearchCalls !== 0) blockers.push('unscoped_native_search_observed');
  const runId = crypto.randomUUID();
  const payload = {
    schemaVersion: 1,
    runId,
    sourceIdentityDigest,
    counters,
    receiptChain: outcome?.receipts ? {
      native: digest(outcome.receipts.native),
      bridge: digest(outcome.receipts.bridge),
      context: digest(outcome.receipts.context)
    } : null,
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    runIdUnique: true,
    artifactImmutable: true,
    duplicateRunDetectable: true,
    universallyNonReplayable: false,
    oneTimeAuthorizationUseCount: null,
    rawDisclosure: false,
    readinessClaimed: false
  };
  return deepFreeze({ ...payload, artifactDigest: digest(payload) });
}

function verifyGovernedNativeReadProofArtifact(artifact, { seenRunIds = new Set() } = {}) {
  const blockers = [];
  if (!artifact || artifact.schemaVersion !== 1) blockers.push('artifact_schema');
  const payload = { ...artifact };
  delete payload.artifactDigest;
  if (artifact?.artifactDigest !== digest(payload)) blockers.push('artifact_digest_mismatch');
  if (!/^[0-9a-f]{64}$/.test(String(artifact?.sourceIdentityDigest || ''))) {
    blockers.push('source_identity_digest');
  }
  if (typeof artifact?.runId !== 'string' || artifact.runId.length < 16) blockers.push('run_id');
  if (seenRunIds.has(artifact?.runId)) blockers.push('duplicate_run_id');
  if (artifact?.artifactImmutable !== true || artifact?.duplicateRunDetectable !== true ||
    artifact?.runIdUnique !== true || artifact?.universallyNonReplayable !== false ||
    artifact?.oneTimeAuthorizationUseCount !== null || artifact?.rawDisclosure !== false ||
    artifact?.readinessClaimed !== false) {
    blockers.push('artifact_semantics');
  }
  const counterKeys = [
    'invocations', 'providerCalls', 'nativeSearchCalls', 'unscopedNativeSearchCalls',
    'localFallbackUses', 'primaryMemoryWrites', 'derivedIndexWrites', 'otherDurableMutations'
  ];
  if (!artifact?.counters || Object.keys(artifact.counters).sort().join(',') !== counterKeys.sort().join(',') ||
    counterKeys.some(key => !Number.isSafeInteger(artifact.counters[key]) || artifact.counters[key] < 0)) {
    blockers.push('artifact_counters');
  } else {
    if (artifact.counters.invocations !== 1) blockers.push('artifact_invocation_count');
    if (artifact.counters.unscopedNativeSearchCalls !== 0 &&
      !artifact.blockers?.includes('unscoped_native_search_observed')) {
      blockers.push('artifact_unscoped_search_semantics');
    }
  }
  if (!artifact?.receiptChain || !['native', 'bridge', 'context'].every(key =>
    /^[0-9a-f]{64}$/.test(String(artifact.receiptChain[key] || '')))) {
    blockers.push('artifact_receipt_chain');
  }
  if (!Array.isArray(artifact?.blockers) || artifact.accepted !== (artifact.blockers.length === 0)) {
    blockers.push('artifact_verdict');
  }
  if (artifact?.accepted !== true) blockers.push('proof_verdict_not_accepted');
  if (blockers.length === 0) seenRunIds.add(artifact.runId);
  return { accepted: blockers.length === 0, blockers };
}

module.exports = {
  digest,
  generateGovernedNativeReadProofArtifact,
  validateReceiptChain,
  verifyGovernedNativeReadProofArtifact
};
