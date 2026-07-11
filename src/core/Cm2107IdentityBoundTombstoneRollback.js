'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  IDENTITY_CANONICAL_BYTES,
  IDENTITY_CANONICAL_SHA256,
  IDENTITY_FILENAME,
  STORE_IDENTITY,
  STORE_ROOT_BINDING_CANONICAL_SHA256,
  expectedIdentityBytes
} = require('./Cm2102IdentityBoundRollbackLifecycleFoundation');
const {
  createMutationMarkdown
} = require('./GovernedMcpVcpNativeVcpToolBoxMcpShim');
const {
  ALLOWED_SCOPE,
  EXPECTED: RECORD_EXPECTED,
  evaluateRecordWriteReceipt
} = require('./Cm2106IdentityBoundSyntheticRecordWrite');
const { sha256Canonical } = require('./Phase8OneShotNativeWriteExecutionGate');

const PACKET_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_tombstone_execution_packet_cm2107.json';
const DECISION_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_tombstone_final_release_cm2107.json';
const RECORD_RECEIPT_PATH =
  'docs/near-model-memory-plan-pack/phase8_identity_bound_synthetic_record_execution_receipt_cm2106_r1.json';

const RECORD_RECEIPT_BINDING = Object.freeze({
  commit: '45d007ffbe3bdf07fcc51bac46de3f6eaf114ea6',
  tree: '893bf74a2f7182ad00f937e4a207152e1b59d2c4',
  blobOid: 'f9fad0507b3da5f8977171b09301dcd5f4dc10f3',
  bytes: 3525,
  sha256: '9484991bc56340fb884d4532fa5ff6ea0c2973311626b7425c40dfe6dad507df'
});

const EXPECTED = Object.freeze({
  decisionReference: 'CM-2107-SELF-IDENTITY-BOUND-TOMBSTONE-F1ACA618',
  payloadCanonicalBytes: 348,
  payloadCanonicalSha256: 'e51b81a1cd7dd0475822a8838258c87c69da4be5165cac5ee52b5ce03d56ad42',
  durableMarkerBytes: 524,
  durableMarkerSha256: 'f1aca618da2a51646c6b956270169556dfa142a482547003e000031e1c666a2d',
  markerMemoryIdRef: 'vcp-kb-f1aca618da2a5164',
  nonce: 'cm2107-identity-bound-tombstone-001',
  receiptId: 'cm2107-identity-bound-tombstone-receipt-001',
  registryReference: 'cm2107-identity-bound-tombstone-registry-001',
  runtimeTargetReference: 'cm2107-identity-bound-vcptoolbox-native-target',
  appStateReference: 'cm2107-identity-bound-tombstone-app-state-001',
  derivedRuntimeStoreReference: 'cm2107-identity-bound-tombstone-derived-store-001',
  scopeFingerprint: RECORD_EXPECTED.scopeFingerprint,
  rollbackPlanReference: 'cm2107-append-only-logical-tombstone-drill'
});

const REGISTRY_ROOT_IDENTITY = Object.freeze({
  registryRootInstanceId: 'cm2093-phase8-governance-root-instance-001',
  registryRootReference: 'codex-memory-phase8-governance-root',
  registryRootReinitializationAllowed: false,
  registryRootReplacementAllowed: false
});

const REGISTRY_IDENTITY = Object.freeze({
  authorizationRegistryReference: EXPECTED.registryReference,
  registryStorageRole: 'durable-local-governance-state',
  registryReinitializationAllowed: false,
  registryDeletionAllowed: false
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function buildTombstonePayload() {
  return Object.freeze({
    memory_id: RECORD_EXPECTED.memoryIdRef,
    reason: 'CM-2107 append-only rollback drill for CM-2106 R1 identity-bound synthetic record',
    evidence: `CM-2106 R1 receipt ${RECORD_RECEIPT_BINDING.commit}; durable SHA-256 ${RECORD_EXPECTED.durableRecordSha256}`,
    tombstone_reason: 'identity_bound_synthetic_rollback_drill'
  });
}

function serializeDurableMarker(payload = buildTombstonePayload()) {
  const expectedPayload = buildTombstonePayload();
  if (JSON.stringify(payload) !== JSON.stringify(expectedPayload)) {
    throw new Error('cm2107_tombstone_payload_binding_mismatch');
  }
  const markdown = createMutationMarkdown('tombstone_memory', payload);
  const bytes = Buffer.from(markdown, 'utf8');
  if (Buffer.byteLength(JSON.stringify(
    Object.fromEntries(Object.keys(payload).sort().map(key => [key, payload[key]]))
  ), 'utf8') !== EXPECTED.payloadCanonicalBytes ||
      sha256Canonical(payload) !== EXPECTED.payloadCanonicalSha256 ||
      bytes.length !== EXPECTED.durableMarkerBytes ||
      sha256(bytes) !== EXPECTED.durableMarkerSha256) {
    throw new Error('cm2107_tombstone_marker_binding_mismatch');
  }
  return {
    payload,
    markdown,
    bytes,
    markerMemoryIdRef: EXPECTED.markerMemoryIdRef,
    targetMemoryIdRef: RECORD_EXPECTED.memoryIdRef
  };
}

function expectedAllowlist() {
  return {
    nativeWriteTools: ['tombstone_memory'],
    nativeWriteActions: ['live_bridge_tombstone_memory_proof'],
    maxTombstoneWrites: 1,
    nativeReadTools: [],
    nativeReadAllowed: false,
    verifySurface: 'cm2107_marker_aware_lifecycle_projection',
    verifyTool: 'audit_memory',
    verifyAuditFamily: 'governance',
    verifyWindow: 10,
    selectedFieldsOnly: true,
    maxVerifyOperations: 1,
    recordMemoryAllowed: false,
    supersedeMemoryAllowed: false,
    compensationActions: [],
    maxRetries: 0,
    maxSupersedeOperations: 0,
    maxCompensationOperations: 0,
    localFallbackWriteAllowed: false,
    automaticRetryAllowed: false,
    automaticRollbackAllowed: false,
    physicalDeleteAllowed: false,
    inPlaceOverwriteAllowed: false,
    existingRealMemoryModificationAllowed: false,
    otherRealMemoryReadAllowed: false,
    rawPrivateMemoryAccessAllowed: false,
    registryMarkerDeletionAllowed: false,
    registryRebuildAllowed: false,
    defaultMcpExpansionAllowed: false,
    remoteGitActionsAllowed: false,
    releaseDeployCutoverAllowed: false,
    readinessClaimAllowed: false
  };
}

function expectedRuntimeContext({ implementationCommit, implementationTree } = {}) {
  return {
    schemaVersion: 1,
    taskId: 'CM-2107',
    implementationCommit,
    implementationTree,
    cleanDetachedCheckoutRequired: true,
    outerTransport: 'frozen_local_executor',
    innerNativeTransport: 'local_http_mcp',
    primaryRuntime: 'VCPToolBox native memory',
    primaryWriteOnly: true,
    providerCallsAllowed: false,
    derivedIndexWritesAllowed: false,
    storeRootBindingSha256: STORE_ROOT_BINDING_CANONICAL_SHA256,
    storeIdentitySha256: IDENTITY_CANONICAL_SHA256,
    storeReference: STORE_IDENTITY.storeReference,
    storeInstanceId: STORE_IDENTITY.storeInstanceId,
    writeSubdir: STORE_IDENTITY.writeSubdir,
    recordReceiptCommit: RECORD_RECEIPT_BINDING.commit,
    recordReceiptBlobOid: RECORD_RECEIPT_BINDING.blobOid,
    recordReceiptSha256: RECORD_RECEIPT_BINDING.sha256,
    targetMemoryIdRef: RECORD_EXPECTED.memoryIdRef,
    targetRecordBytes: RECORD_EXPECTED.durableRecordBytes,
    targetRecordSha256: RECORD_EXPECTED.durableRecordSha256,
    tombstonePayloadCanonicalBytes: EXPECTED.payloadCanonicalBytes,
    tombstonePayloadCanonicalSha256: EXPECTED.payloadCanonicalSha256,
    durableMarkerBytes: EXPECTED.durableMarkerBytes,
    durableMarkerSha256: EXPECTED.durableMarkerSha256,
    expectedMarkerMemoryIdRef: EXPECTED.markerMemoryIdRef,
    runtimeTargetReferenceName: EXPECTED.runtimeTargetReference,
    runtimeTargetKind: 'mcp_server',
    runtimeTargetSourceAuthority: 'bridge_runtime_or_static_config',
    writeDelegationMode: 'primary',
    readDelegationMode: 'off',
    innerHttpTargetAccepted: true,
    innerHttpTargetConfigured: true,
    innerHttpAuthConfigured: true,
    innerTombstoneToolName: 'knowledge_base.tombstone',
    authorizationRegistryReference: EXPECTED.registryReference,
    authorizationRegistryRootReference: REGISTRY_ROOT_IDENTITY.registryRootReference,
    authorizationRegistryRootIdentitySha256: sha256Canonical(REGISTRY_ROOT_IDENTITY),
    appStateReference: EXPECTED.appStateReference,
    derivedRuntimeStoreReference: EXPECTED.derivedRuntimeStoreReference,
    scope: ALLOWED_SCOPE,
    expectedScopeFingerprint: EXPECTED.scopeFingerprint
  };
}

async function verifyIdentity(storeRoot, filesystem = fs) {
  const root = await filesystem.lstat(storeRoot);
  if (!root.isDirectory() || root.isSymbolicLink()) throw new Error('cm2107_store_root_invalid');
  const stat = await filesystem.lstat(path.join(storeRoot, IDENTITY_FILENAME));
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('cm2107_store_identity_invalid');
  const identity = await filesystem.readFile(path.join(storeRoot, IDENTITY_FILENAME));
  if (!identity.equals(expectedIdentityBytes()) || identity.length !== IDENTITY_CANONICAL_BYTES ||
      sha256(identity) !== IDENTITY_CANONICAL_SHA256) {
    throw new Error('cm2107_store_identity_binding_mismatch');
  }
  return {
    accepted: true,
    storeReference: STORE_IDENTITY.storeReference,
    storeRole: STORE_IDENTITY.storeRole,
    syntheticOnly: true,
    identityBytes: identity.length,
    identitySha256: sha256(identity),
    rawPathDisclosed: false
  };
}

async function markdownFiles(storeRoot, filesystem = fs) {
  const rootEntries = await filesystem.readdir(storeRoot, { withFileTypes: true });
  const writeEntry = rootEntries.find(entry => entry.name === STORE_IDENTITY.writeSubdir);
  if (rootEntries.length !== 2 || !writeEntry || !writeEntry.isDirectory() || writeEntry.isSymbolicLink()) {
    throw new Error('cm2107_store_root_shape_mismatch');
  }
  const directory = path.join(storeRoot, STORE_IDENTITY.writeSubdir);
  const entries = await filesystem.readdir(directory, { withFileTypes: true });
  if (entries.some(entry => !entry.isFile() || entry.isSymbolicLink() || !entry.name.endsWith('.md'))) {
    throw new Error('cm2107_store_file_shape_mismatch');
  }
  return { directory, entries };
}

async function exactProjection(directory, entry, expectedBytes, expectedSha256, memoryIdRef, filesystem = fs) {
  const bytes = await filesystem.readFile(path.join(directory, entry.name));
  if (bytes.length !== expectedBytes || sha256(bytes) !== expectedSha256) {
    throw new Error('cm2107_durable_object_binding_mismatch');
  }
  return {
    memoryIdRef,
    durableBytes: bytes.length,
    durableSha256: sha256(bytes),
    rawContentIncluded: false,
    rawPathDisclosed: false
  };
}

async function collectPreRollbackProjection(storeRoot, filesystem = fs) {
  const identity = await verifyIdentity(storeRoot, filesystem);
  const { directory, entries } = await markdownFiles(storeRoot, filesystem);
  const targetSuffix = `-${RECORD_EXPECTED.durableRecordSha256.slice(0, 16)}.md`;
  const target = entries.filter(entry => entry.name.endsWith(targetSuffix));
  const marker = entries.filter(entry => entry.name.endsWith(`-${EXPECTED.durableMarkerSha256.slice(0, 16)}.md`));
  if (entries.length !== 1 || target.length !== 1 || marker.length !== 0) {
    throw new Error('cm2107_pre_rollback_file_set_mismatch');
  }
  return {
    accepted: true,
    stage: 'pre_rollback',
    identity,
    targetRecordProjection: await exactProjection(
      directory, target[0], RECORD_EXPECTED.durableRecordBytes,
      RECORD_EXPECTED.durableRecordSha256, RECORD_EXPECTED.memoryIdRef, filesystem
    ),
    markerAbsent: true,
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

async function collectPostRollbackProjection(storeRoot, filesystem = fs) {
  const identity = await verifyIdentity(storeRoot, filesystem);
  const { directory, entries } = await markdownFiles(storeRoot, filesystem);
  const target = entries.filter(entry => entry.name.endsWith(`-${RECORD_EXPECTED.durableRecordSha256.slice(0, 16)}.md`));
  const marker = entries.filter(entry => entry.name.endsWith(`-${EXPECTED.durableMarkerSha256.slice(0, 16)}.md`));
  if (entries.length !== 2 || target.length !== 1 || marker.length !== 1) {
    throw new Error('cm2107_post_rollback_file_set_mismatch');
  }
  const targetProjection = await exactProjection(
    directory, target[0], RECORD_EXPECTED.durableRecordBytes,
    RECORD_EXPECTED.durableRecordSha256, RECORD_EXPECTED.memoryIdRef, filesystem
  );
  const markerProjection = await exactProjection(
    directory, marker[0], EXPECTED.durableMarkerBytes,
    EXPECTED.durableMarkerSha256, EXPECTED.markerMemoryIdRef, filesystem
  );
  return {
    accepted: true,
    stage: 'post_rollback',
    identity,
    targetRecordProjection: targetProjection,
    tombstoneMarkerProjection: {
      ...markerProjection,
      toolName: 'tombstone_memory',
      targetMemoryIdRef: RECORD_EXPECTED.memoryIdRef,
      markerMemoryIdRef: EXPECTED.markerMemoryIdRef,
      receiptBindingMatched: false,
      mutationMarkerOnly: true
    },
    sourceCandidateMemoryIdRefs: [RECORD_EXPECTED.memoryIdRef, EXPECTED.markerMemoryIdRef],
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    rawMemoryReturned: false,
    rawPathDisclosed: false
  };
}

function projectMarkerAwareLifecycle(targetRecordProjection, tombstoneMarkerProjection) {
  const accepted = targetRecordProjection?.memoryIdRef === RECORD_EXPECTED.memoryIdRef &&
    targetRecordProjection?.durableBytes === RECORD_EXPECTED.durableRecordBytes &&
    targetRecordProjection?.durableSha256 === RECORD_EXPECTED.durableRecordSha256 &&
    targetRecordProjection?.rawContentIncluded === false &&
    tombstoneMarkerProjection?.toolName === 'tombstone_memory' &&
    tombstoneMarkerProjection?.targetMemoryIdRef === RECORD_EXPECTED.memoryIdRef &&
    tombstoneMarkerProjection?.markerMemoryIdRef === EXPECTED.markerMemoryIdRef &&
    tombstoneMarkerProjection?.durableBytes === EXPECTED.durableMarkerBytes &&
    tombstoneMarkerProjection?.durableSha256 === EXPECTED.durableMarkerSha256 &&
    tombstoneMarkerProjection?.receiptBindingMatched === true &&
    tombstoneMarkerProjection?.mutationMarkerOnly === true &&
    tombstoneMarkerProjection?.rawContentIncluded === false;
  return {
    accepted,
    targetMemoryIdRef: RECORD_EXPECTED.memoryIdRef,
    effectiveLifecycleStatus: accepted ? 'tombstoned' : 'unverified',
    originalRecordUnchanged: accepted,
    effectiveMemoryEligible: !accepted,
    selectedFieldsOnly: true,
    rawMemoryReturned: false,
    rawAuditReturned: false
  };
}

function filterEffectiveCandidateRefs(candidateRefs, lifecycle) {
  if (!Array.isArray(candidateRefs) || candidateRefs.some(ref =>
    typeof ref !== 'string' || !/^vcp-kb-[a-f0-9]{16}$/.test(ref))) {
    throw new Error('cm2107_candidate_refs_invalid');
  }
  if (lifecycle?.accepted !== true || lifecycle.effectiveMemoryEligible !== false) {
    throw new Error('cm2107_lifecycle_not_verified');
  }
  return candidateRefs.filter(ref => ref !== lifecycle.targetMemoryIdRef);
}

function evaluateRecordReceiptBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length !== RECORD_RECEIPT_BINDING.bytes ||
      sha256(bytes) !== RECORD_RECEIPT_BINDING.sha256) {
    return { accepted: false, blockers: ['recordReceipt.gitBinding'] };
  }
  return evaluateRecordWriteReceipt(JSON.parse(bytes.toString('utf8')));
}

async function verifyTombstoneExecution({ registry, claimId, receiptId, decisionReference,
  claimBindingHash, runtimeTargetReferenceName, postStoreProjection, callAuditMemory } = {}) {
  if (!registry || typeof callAuditMemory !== 'function' ||
      postStoreProjection?.accepted !== true || postStoreProjection?.stage !== 'post_rollback') {
    return { accepted: false, reasonCode: 'cm2107_verify_configuration_or_store_projection_missing' };
  }
  const claim = await registry.readClaim(claimId).catch(() => null);
  if (!claim || claim.state !== 'WRITE_INVOCATION_CONSUMED' ||
      claim.bindingHash !== claimBindingHash || claim.receiptIdHash !== sha256(String(receiptId || ''))) {
    return { accepted: false, reasonCode: 'cm2107_verify_claim_binding_invalid' };
  }
  const report = await callAuditMemory({
    audit_family: 'governance',
    window: 10,
    scope: {
      project_id: ALLOWED_SCOPE.project_id,
      scope_id: ALLOWED_SCOPE.scope_id,
      workspace_id: ALLOWED_SCOPE.workspace_id,
      workspace_id_present: true,
      client_id: 'codex',
      visibility: ALLOWED_SCOPE.visibility,
      task_id: 'CM-2107'
    },
    include_raw: false
  });
  const receipts = Array.isArray(report?.findings)
    ? report.findings.map(item => item?.governedNativeBridgeReceipt).filter(Boolean)
    : [];
  const receipt = receipts.find(item =>
    item.toolName === 'tombstone_memory' &&
    item.auditReceiptReferenceName === receiptId &&
    item.exactApprovalAction === 'live_bridge_tombstone_memory_proof' &&
    item.exactApprovalDecisionReference === decisionReference &&
    item.exactApprovalClaimBindingHash === claimBindingHash &&
    item.targetReferenceName === runtimeTargetReferenceName &&
    item.scopeFingerprintPresent === true &&
    item.scopeFingerprintMatched === true &&
    item.writeAllowed === true &&
    item.exactApprovalActionMatched === true &&
    item.nativeInvocationAttempted === true &&
    item.nativeInvocationReceiptBindingMatched === true &&
    item.memoryWritePerformed === true &&
    item.rawRequestBodyPersisted === false &&
    item.rawResponseBodyPersisted === false
  );
  if (!receipt || report?.accepted !== true ||
      report?.access?.rawMemoryReturned !== false ||
      report?.access?.rawAuditReturned !== false ||
      report?.access?.contentReturned !== false) {
    return {
      accepted: false,
      reasonCode: 'cm2107_tombstone_audit_receipt_correlation_failed',
      observedReceiptCount: receipts.length
    };
  }
  const correlatedMarker = {
    ...postStoreProjection.tombstoneMarkerProjection,
    receiptBindingMatched: true
  };
  const lifecycle = projectMarkerAwareLifecycle(
    postStoreProjection.targetRecordProjection,
    correlatedMarker
  );
  if (!lifecycle.accepted) {
    return { accepted: false, reasonCode: 'cm2107_marker_aware_lifecycle_projection_failed' };
  }
  const effective = filterEffectiveCandidateRefs(
    postStoreProjection.sourceCandidateMemoryIdRefs,
    lifecycle
  );
  const effectiveTargetCount = effective.filter(ref => ref === RECORD_EXPECTED.memoryIdRef).length;
  const accepted = effectiveTargetCount === 0 &&
    postStoreProjection.otherRealMemoryRead === false &&
    postStoreProjection.otherRealMemoryModified === false;
  return {
    accepted,
    reasonCode: accepted
      ? 'cm2107_identity_bound_tombstone_verify_passed'
      : 'cm2107_effective_visibility_verify_failed',
    selectedFieldsOnly: true,
    targetMemoryIdRef: RECORD_EXPECTED.memoryIdRef,
    markerMemoryIdRef: EXPECTED.markerMemoryIdRef,
    markerSha256: EXPECTED.durableMarkerSha256,
    originalRecordObservedBytes: postStoreProjection.targetRecordProjection.durableBytes,
    originalRecordObservedSha256: postStoreProjection.targetRecordProjection.durableSha256,
    originalRecordUnchanged: lifecycle.originalRecordUnchanged,
    effectiveLifecycleStatus: lifecycle.effectiveLifecycleStatus,
    rollbackLifecycleProjectionTargetCount: effectiveTargetCount,
    defaultProductRetrievalTombstoneAwarenessProven: false,
    rollbackDrillLifecycleProjectionProven: accepted,
    observedReceiptCount: receipts.length,
    nativeInvocationReceiptBindingMatched: true,
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    rawPathDisclosed: false
  };
}

module.exports = {
  ALLOWED_SCOPE,
  DECISION_PATH,
  EXPECTED,
  PACKET_PATH,
  RECORD_RECEIPT_BINDING,
  RECORD_RECEIPT_PATH,
  REGISTRY_IDENTITY,
  REGISTRY_ROOT_IDENTITY,
  buildTombstonePayload,
  collectPostRollbackProjection,
  collectPreRollbackProjection,
  evaluateRecordReceiptBytes,
  expectedAllowlist,
  expectedRuntimeContext,
  filterEffectiveCandidateRefs,
  projectMarkerAwareLifecycle,
  serializeDurableMarker,
  sha256,
  verifyTombstoneExecution
};
