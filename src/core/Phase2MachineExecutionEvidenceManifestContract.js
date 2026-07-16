'use strict';

const crypto = require('node:crypto');

const CONTRACT_NAME = 'Phase2MachineExecutionEvidenceManifestContract';
const CONTRACT_MODE = 'machine_generated_low_disclosure_phase2_execution_evidence';
const EXPECTED_TOOLS = Object.freeze(['search_memory', 'memory_overview', 'audit_memory']);
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const FORBIDDEN_KEYS = Object.freeze([
  'query', 'queryText', 'requestBody', 'responseBody', 'rawOutput', 'rawMemory',
  'memoryContent', 'rawAudit', 'token', 'apiKey', 'secret', 'credential',
  'endpoint', 'locator', 'providerPayload', 'absolutePath', 'environmentValue'
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function collectForbidden(value, prefix = '') {
  if (Array.isArray(value)) return value.flatMap((v, i) => collectForbidden(v, `${prefix}[${i}]`));
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return FORBIDDEN_KEYS.includes(key) ? [path] : collectForbidden(child, path);
  });
}
function canonicalCallHash(call) {
  const copy = { ...call };
  delete copy.receiptSummarySha256;
  return crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex');
}
function failure(reasonCode, extras = {}) {
  return {
    accepted: false, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    reasonCode, blockers: [], phase2MachineExecutionEvidenceManifestPassed: false,
    completionEligible: false, replayRequired: true,
    memoryWritten: false, primaryMemoryStoreWritten: false,
    rawPrivateStateRead: false, readinessClaimed: false, ...extras
  };
}

function evaluatePhase2MachineExecutionEvidenceManifestContract(manifest, windowsReceipt) {
  if (!isObject(manifest) || !isObject(windowsReceipt)) return failure('invalid_input');
  const forbiddenFields = [...collectForbidden(manifest), ...collectForbidden(windowsReceipt, 'windowsReceipt')];
  if (forbiddenFields.length) return failure('forbidden_raw_secret_or_locator_fields', { forbiddenFields });
  const blockers = [];
  if (manifest.schemaVersion !== 1) blockers.push('manifest.schemaVersion');
  if (manifest.taskId !== 'CM-2077') blockers.push('manifest.taskId');
  if (manifest.generationMethod !== 'sanitized_mcp_projection_captured_by_tool_orchestration') blockers.push('manifest.generationMethod');
  if (!COMMIT_PATTERN.test(String(manifest.sourceCommit || ''))) blockers.push('manifest.sourceCommit');
  if (!COMMIT_PATTERN.test(String(manifest.loadedRuntimeHead || ''))) blockers.push('manifest.loadedRuntimeHead');
  if (typeof manifest.worktreeClean !== 'boolean') blockers.push('manifest.worktreeClean');
  if (typeof manifest.runtimeHeadMatchesSourceCommit !== 'boolean') blockers.push('manifest.runtimeHeadMatchesSourceCommit');
  if (!Array.isArray(manifest.calls) || manifest.calls.length !== EXPECTED_TOOLS.length) {
    blockers.push('manifest.calls');
  } else {
    manifest.calls.forEach((call, index) => {
      const prefix = `manifest.calls[${index}]`;
      if (call.toolName !== EXPECTED_TOOLS[index]) blockers.push(`${prefix}.toolName`);
      if (call.safeCallRef !== `CM-2077-P2-${index + 1}-${EXPECTED_TOOLS[index]}`) blockers.push(`${prefix}.safeCallRef`);
      if (!HASH_PATTERN.test(String(call.receiptSummarySha256 || ''))) blockers.push(`${prefix}.receiptSummarySha256`);
      else if (canonicalCallHash(call) !== call.receiptSummarySha256) blockers.push(`${prefix}.receiptSummarySha256_mismatch`);
      for (const field of [
        'accepted', 'nativeInvocationAttempted', 'nativeInvocationSucceeded',
        'invocationBindingMatched', 'scopeBoundaryBound', 'visibilityBound',
        'readAllowed', 'outputDisclosureBudgetBound', 'auditReceiptRequired',
        'auditReceiptLowDisclosureBound', 'localAuditAppended',
        'localAuditLowDisclosure', 'nativeRuntimeReceiptPresent',
        'nativeRuntimeCalled', 'providerApiCalled', 'memoryReadPerformed',
        'durableWritePerformed', 'isolatedRuntimeStoreUsed', 'derivedIndexWritePerformed'
      ]) if (call[field] !== true) blockers.push(`${prefix}.${field}`);
      for (const field of [
        'writeAllowed', 'memoryWritePerformed', 'primaryMemoryStoreWritePerformed',
        'localFallbackUsed', 'rawOutputReturned', 'rawMemoryReturned',
        'rawAuditReturned', 'memoryContentReturned', 'memoryIdsReturned',
        'filesystemPathsReturned', 'tokenMaterialReturned',
        'providerPayloadReturned', 'readinessClaimed'
      ]) if (call[field] !== false) blockers.push(`${prefix}.${field}`);
      if (call.durableWriteScope !== 'isolated_derived_index') blockers.push(`${prefix}.durableWriteScope`);
      if (call.routeCategory !== 'vcp_native_primary') blockers.push(`${prefix}.routeCategory`);
    });
  }
  const expectedAggregate = {
    mcpCalls: 3, nativeReadAttempts: 3, nativeReadSuccesses: 3,
    providerApiCalls: 3, memoryReads: 3, memoryWrites: 0,
    primaryMemoryStoreWrites: 0, isolatedDerivedIndexWrites: 3,
    localAuditAppends: 3, localFallbackUses: 0, rawPrivateReturns: 0,
    readinessClaims: 0
  };
  for (const [field, expected] of Object.entries(expectedAggregate)) {
    if (!manifest.aggregate || manifest.aggregate[field] !== expected) blockers.push(`manifest.aggregate.${field}`);
  }
  if (windowsReceipt.schemaVersion !== 1 || windowsReceipt.taskId !== 'CM-2077') blockers.push('windowsReceipt.identity');
  if (windowsReceipt.sourceCommit !== manifest.sourceCommit) blockers.push('windowsReceipt.sourceCommit');
  if (windowsReceipt.loadedRuntimeHead !== manifest.loadedRuntimeHead) blockers.push('windowsReceipt.loadedRuntimeHead');
  for (const bridge of ['cmdBridge', 'powershellBridge']) {
    if (!windowsReceipt[bridge] || windowsReceipt[bridge].present !== true || windowsReceipt[bridge].passed !== true || windowsReceipt[bridge].exitStatusCategory !== 'zero') {
      blockers.push(`windowsReceipt.${bridge}`);
    }
  }
  for (const field of ['rawOutputCaptured', 'absolutePathCaptured', 'environmentValuesCaptured']) {
    if (windowsReceipt[field] !== false) blockers.push(`windowsReceipt.${field}`);
  }
  const expectedEligible = manifest.worktreeClean === true &&
    manifest.runtimeHeadMatchesSourceCommit === true &&
    manifest.loadedRuntimeHead === manifest.sourceCommit &&
    windowsReceipt.worktreeClean === true &&
    windowsReceipt.runtimeHeadMatchesSourceCommit === true &&
    windowsReceipt.completionEligible === true;
  if (!manifest.phase2CompletionDerivation || manifest.phase2CompletionDerivation.eligible !== expectedEligible) blockers.push('manifest.phase2CompletionDerivation.eligible');
  if (manifest.phase2CompletionDerivation && manifest.phase2CompletionDerivation.phase2AcceptedFromThisManifest !== expectedEligible) blockers.push('manifest.phase2CompletionDerivation.phase2AcceptedFromThisManifest');
  if (windowsReceipt.completionEligible !== expectedEligible) blockers.push('windowsReceipt.completionEligible');
  if (blockers.length) return failure('manifest_blocked', { blockers });
  return {
    accepted: true, contractName: CONTRACT_NAME, contractMode: CONTRACT_MODE,
    reasonCode: expectedEligible ? 'phase2_machine_evidence_completion_eligible' : 'phase2_machine_evidence_replay_required',
    blockers: expectedEligible ? [] : ['worktree_not_clean_or_runtime_head_mismatch'],
    phase2MachineExecutionEvidenceManifestPassed: expectedEligible,
    completionEligible: expectedEligible,
    replayRequired: !expectedEligible,
    callReceiptHashesVerified: 3,
    windowsSmokeVerified: true,
    memoryWritten: false, primaryMemoryStoreWritten: false,
    isolatedDerivedIndexWritesObserved: 3,
    rawPrivateStateRead: false, readinessClaimed: false
  };
}

module.exports = {
  CONTRACT_MODE, CONTRACT_NAME, EXPECTED_TOOLS, canonicalCallHash,
  evaluatePhase2MachineExecutionEvidenceManifestContract
};
