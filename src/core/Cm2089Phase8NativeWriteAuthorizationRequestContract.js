'use strict';

const crypto = require('node:crypto');

const CONTRACT_NAME = 'Cm2089Phase8NativeWriteAuthorizationRequestContract';
const SOURCE_COMMIT = '66e6974cfc1f0225ac315f16bdd0aa4fa954fb51';
const SOURCE_TREE = 'e60d90e6b9bc0ca52e4d841b4b50130b6ea2b53d';
const PAYLOAD_SHA256 = '91d3b2ed314641bb372237aa9490a2803da6ea060b4457c5e7694c738a6b9aee';
const CONTEXT_HASH = '29668cd36b14b2d7e36e35463dcd7af0a1a1c1d01ba3b6aa94a32f6349ecc20a';
const ALLOWLIST_HASH = 'fd08575141c2ffdb501f24d4a8f525f660cc5919c1baeb1817697da164da956e';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
}

function sha256Canonical(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value)), 'utf8').digest('hex');
}

function evaluateCm2089Phase8NativeWriteAuthorizationRequest({request, payload} = {}) {
  const blockers = [];
  if (!request || !payload) return failure(['missing_input']);
  if (request.schemaVersion !== 1 || request.taskId !== 'CM-2089' || request.requestType !== 'exact_phase8_native_write_authorization') blockers.push('request.identity');
  if (request.phase8NativeWriteAuthorizationGranted !== false) blockers.push('request.authorizationState');
  const chain = request.decisionChain || {};
  for (const field of ['externalReviewPassed', 'completionAuditApplicationPassed', 'tagApprovalPacketPassed']) if (chain[field] !== true) blockers.push(`decisionChain.${field}`);
  if (chain.tagPushReceiptReviewReference !== 'CM-2087-ER-20260711-TAG-PUSH-RECEIPT-PASS-DF1E41DD') blockers.push('decisionChain.tagPushReceiptReviewReference');
  const execution = request.executionBinding || {};
  for (const [field, expected] of Object.entries({runtimeSourceCommit: SOURCE_COMMIT, runtimeSourceTree: SOURCE_TREE, cleanDetachedCheckoutRequired: true, runtimeHeadMustEqualSourceCommit: true, staleLoadedRuntimeAllowed: false, transport: 'isolated_stdio_mcp', persistentServiceMutationAllowed: false})) if (execution[field] !== expected) blockers.push(`executionBinding.${field}`);
  const target = execution.runtimeTarget || {};
  for (const [field, expected] of Object.entries({primaryRuntime: 'VCPToolBox native memory', targetReferenceName: 'cm2089-vcptoolbox-native-memory-target', targetKind: 'mcp_server', sourceAuthority: 'bridge_runtime_or_static_config'})) if (target[field] !== expected) blockers.push(`executionBinding.runtimeTarget.${field}`);
  const write = request.writeAction || {};
  for (const [field, expected] of Object.entries({toolName: 'record_memory', exactApprovalAction: 'live_bridge_record_memory_proof', maxNativeWrites: 1, proofRecordOnly: true, existingMemoryModificationAllowed: false, localFallbackWriteAllowed: false, payloadFile: 'docs/near-model-memory-plan-pack/phase8_native_write_proof_record_cm2089.json', payloadFileSha256: '3773ac46474890e033b6113d81fb2c0c191cbcbaf78225d2746eefb4c67fc245', canonicalPayloadSha256: PAYLOAD_SHA256})) if (write[field] !== expected) blockers.push(`writeAction.${field}`);
  if (sha256Canonical(payload) !== PAYLOAD_SHA256) blockers.push('payload.canonicalSha256');
  const scope = request.approvalScope || {};
  for (const [field, expected] of Object.entries({scopeId: 'cm2089-phase8-native-write-proof-001', projectId: 'codex-memory', workspaceId: 'codex-memory-phase8-proof', clientId: 'Codex', visibility: 'project'})) if (scope[field] !== expected) blockers.push(`approvalScope.${field}`);
  const packet = request.approvalPacketRequest || {};
  for (const [field, expected] of Object.entries({token: 'APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT', operatorIntentScope: 'one synthetic Phase 8 proof record only', allowedAction: 'live_bridge_record_memory_proof', expiresAt: '2026-07-12T06:00:00+08:00', nonce: 'cm2089-phase8-record-memory-proof-001', receiptId: 'cm2089-phase8-native-write-receipt-001', expectedContextHash: CONTEXT_HASH, expectedAllowlistHash: ALLOWLIST_HASH, authorizationUseCount: 1})) if (packet[field] !== expected) blockers.push(`approvalPacketRequest.${field}`);
  const verify = request.verification || {};
  for (const [field, expected] of Object.entries({maxVerifyOperations: 1, verifyOperation: 'audit_memory_low_disclosure_receipt_correlation', rawMemoryReadAllowed: false, rawAuditReadAllowed: false, receiptOnly: true})) if (verify[field] !== expected) blockers.push(`verification.${field}`);
  const rollback = request.rollbackOrCompensation || {};
  for (const [field, expected] of Object.entries({maxOperations: 0, authorizedByThisRequest: false, separateActionSpecificApprovalRequired: true, compensationCountsAsNativeWrite: true, postCommitFailureDisposition: 'rollback_required_not_applied', rollbackPlanReference: 'cm2089-phase8-rollback-plan'})) if (rollback[field] !== expected) blockers.push(`rollbackOrCompensation.${field}`);
  const receiptRequirements = request.receiptRequirements || {};
  for (const [field, expected] of Object.entries({lowDisclosureOnly: true, exactApprovalEnforcement: true, nativeSideEffect: true, realRootDurableWriteProof: true, verifyWrite: true, outputDisclosureBudget: true, auditReceipt: true, rollbackDrill: false, failureRecovery: false})) if (receiptRequirements[field] !== expected) blockers.push(`receiptRequirements.${field}`);
  const forbidden = request.forbidden || {};
  for (const field of ['rawPrivateMemoryAccess', 'defaultMcpExpansion', 'commitMemoryDeltaPublic', 'branchOrTagPush', 'releaseOrPublication', 'deployOrCutover', 'readinessClaim', 'fullPlanPackCompletionClaim']) if (forbidden[field] !== false) blockers.push(`forbidden.${field}`);
  const counters = request.currentExecutionCounters || {};
  for (const field of ['nativeWrites', 'verifyOperations', 'rollbackOrCompensationOperations', 'realMemoryReads', 'remoteGitActions']) if (counters[field] !== 0) blockers.push(`currentExecutionCounters.${field}`);
  return blockers.length ? failure(blockers) : {accepted: true, contractName: CONTRACT_NAME, blockers: [], authorizationRequestPrepared: true, phase8NativeWriteAuthorizationGranted: false, nativeWriteExecuted: false, verifyExecuted: false, rollbackOrCompensationExecuted: false, realMemoryRead: false, newRemoteActionPerformed: false, nextGate: 'independent_exact_phase8_native_write_authorization_review'};
}

function failure(blockers) {
  return {accepted: false, contractName: CONTRACT_NAME, blockers, authorizationRequestPrepared: false, phase8NativeWriteAuthorizationGranted: false, nativeWriteExecuted: false, verifyExecuted: false, rollbackOrCompensationExecuted: false, realMemoryRead: false, newRemoteActionPerformed: false};
}

module.exports = {ALLOWLIST_HASH, CONTEXT_HASH, CONTRACT_NAME, PAYLOAD_SHA256, SOURCE_COMMIT, SOURCE_TREE, canonicalize, sha256Canonical, evaluateCm2089Phase8NativeWriteAuthorizationRequest};
