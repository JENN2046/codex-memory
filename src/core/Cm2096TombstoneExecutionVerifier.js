'use strict';

const crypto = require('node:crypto');
const { projectCm2096MarkerAwareLifecycle, filterCm2096EffectiveCandidateRefs } = require('./Cm2096MarkerAwareLifecycleProjection');

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function scopeFingerprint(scope = {}) {
  const allowedFields = ['client_id', 'project_id', 'scope_id', 'visibility', 'workspace_id'];
  const source = Object.fromEntries(
    Object.keys(scope)
      .filter(field => allowedFields.includes(field))
      .sort()
      .map(field => [field, scope[field]])
  );
  return Object.keys(source).length > 0 ? sha256(JSON.stringify(canonicalize(source))) : null;
}

async function verifyCm2096TombstoneExecution({ registry, claimId, receiptId, decisionReference, claimBindingHash, runtimeTargetReferenceName, scope, expectedScopeFingerprint, postStoreProjection, callAuditMemory } = {}) {
  if (!registry || typeof callAuditMemory !== 'function' || postStoreProjection?.accepted !== true || postStoreProjection?.stage !== 'post_rollback') {
    return { accepted: false, reasonCode: 'cm2096_verify_configuration_or_store_projection_missing' };
  }
  if (postStoreProjection.rawMemoryReturned !== false ||
      postStoreProjection.rawPathDisclosed !== false ||
      postStoreProjection.targetRecordProjection?.rawContentIncluded !== false ||
      postStoreProjection.targetRecordProjection?.rawPathDisclosed !== false ||
      postStoreProjection.tombstoneMarkerProjection?.rawContentIncluded !== false ||
      postStoreProjection.tombstoneMarkerProjection?.rawPathDisclosed !== false) {
    return { accepted: false, reasonCode: 'cm2096_post_store_projection_disclosure_boundary_failed' };
  }
  const sourceRefs = postStoreProjection.sourceCandidateMemoryIdRefs;
  const targetRef = postStoreProjection.targetRecordProjection?.memoryIdRef;
  const markerRef = postStoreProjection.tombstoneMarkerProjection?.markerMemoryIdRef;
  if (!Array.isArray(sourceRefs) || postStoreProjection.sourceCandidateRefCount !== 2 ||
      sourceRefs.length !== 2 || sourceRefs[0] !== targetRef || sourceRefs[1] !== markerRef ||
      targetRef === markerRef || sourceRefs.some(ref => typeof ref !== 'string' || !/^vcp-kb-[a-f0-9]{16}$/.test(ref))) {
    return { accepted: false, reasonCode: 'cm2096_post_store_candidate_evidence_invalid' };
  }
  const claim = await registry.readClaim(claimId).catch(() => null);
  if (!claim ||
      claim.state !== 'WRITE_INVOCATION_CONSUMED' ||
      claim.bindingHash !== claimBindingHash ||
      claim.receiptIdHash !== sha256(receiptId)) {
    return { accepted: false, reasonCode: 'cm2096_verify_claim_binding_invalid' };
  }
  if (expectedScopeFingerprint !== scopeFingerprint(scope)) {
    return { accepted: false, reasonCode: 'cm2096_verify_scope_fingerprint_invalid' };
  }
  const report = await callAuditMemory({
    audit_family: 'governance',
    window: 10,
    scope: {
      project_id: scope.project_id,
      scope_id: scope.scope_id,
      workspace_id: scope.workspace_id,
      workspace_id_present: true,
      client_id: 'codex',
      visibility: scope.visibility,
      task_id: 'CM-2096'
    },
    include_raw: false
  });
  const receipts = Array.isArray(report?.findings) ? report.findings.map(item => item?.governedNativeBridgeReceipt).filter(Boolean) : [];
  const receipt = receipts.find(item =>
    item.toolName === 'tombstone_memory' &&
    item.auditReceiptReferenceName === receiptId &&
    item.exactApprovalAction === 'live_bridge_tombstone_memory_proof' &&
    item.exactApprovalDecisionReference === decisionReference &&
    item.exactApprovalClaimBindingHash === claimBindingHash &&
    item.targetReferenceName === runtimeTargetReferenceName &&
    item.scopeFingerprintPresent === true &&
    item.scopeFingerprintMatched === true &&
    typeof expectedScopeFingerprint === 'string' && /^[a-f0-9]{64}$/.test(expectedScopeFingerprint) &&
    item.writeAllowed === true &&
    item.exactApprovalActionMatched === true &&
    item.nativeInvocationAttempted === true &&
    item.nativeInvocationReceiptBindingMatched === true &&
    item.memoryWritePerformed === true &&
    item.rawRequestBodyPersisted === false &&
    item.rawResponseBodyPersisted === false
  );
  if (!receipt ||
      report?.accepted !== true ||
      report?.access?.rawMemoryReturned !== false ||
      report?.access?.rawAuditReturned !== false ||
      report?.access?.contentReturned !== false) {
    return { accepted: false, reasonCode: 'cm2096_tombstone_audit_receipt_correlation_failed', observedReceiptCount: receipts.length };
  }
  const correlatedMarker = { ...postStoreProjection.tombstoneMarkerProjection, receiptBindingMatched: true };
  const lifecycle = projectCm2096MarkerAwareLifecycle({
    targetRecordProjection: postStoreProjection.targetRecordProjection,
    tombstoneMarkerProjection: correlatedMarker
  });
  if (!lifecycle.accepted) return { accepted: false, reasonCode: 'cm2096_marker_aware_lifecycle_projection_failed' };
  const effectiveRefs = filterCm2096EffectiveCandidateRefs(postStoreProjection.sourceCandidateMemoryIdRefs, lifecycle);
  const accepted = effectiveRefs.filter(ref => ref === lifecycle.targetMemoryIdRef).length === 0 &&
    postStoreProjection.otherRealMemoryRead === false && postStoreProjection.otherRealMemoryModified === false;
  return {
    accepted,
    reasonCode: accepted ? 'cm2096_tombstone_low_disclosure_verify_passed' : 'cm2096_tombstone_effective_visibility_verify_failed',
    selectedFieldsOnly: true,
    rawMemoryReturned: false,
    rawAuditReturned: false,
    targetMemoryIdRef: lifecycle.targetMemoryIdRef,
    markerMemoryIdRef: correlatedMarker.markerMemoryIdRef,
    markerSha256: correlatedMarker.durableSha256,
    originalRecordObservedBytes: postStoreProjection.targetRecordProjection.durableBytes,
    originalRecordObservedSha256: postStoreProjection.targetRecordProjection.durableSha256,
    originalRecordUnchanged: lifecycle.originalRecordBytesUnchanged,
    effectiveLifecycleStatus: lifecycle.effectiveLifecycleStatus,
    governedRetrievalEffectiveTargetCount: effectiveRefs.filter(ref => ref === lifecycle.targetMemoryIdRef).length,
    observedReceiptCount: receipts.length,
    otherRealMemoryRead: false,
    otherRealMemoryModified: false,
    rawPathDisclosed: false
  };
}

module.exports = { scopeFingerprint, verifyCm2096TombstoneExecution };
