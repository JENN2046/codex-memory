'use strict';

const REQUIRED_READONLY_BRIDGE_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory'
]);

const DEFAULT_SAFE_CONTEXT_TOOLS = Object.freeze([
  'prepare_memory_context',
  'propose_memory_delta'
]);

const FORBIDDEN_DEFAULT_MUTATION_TOOLS = Object.freeze([
  'record_memory',
  'validate_memory',
  'tombstone_memory',
  'supersede_memory',
  'commit_memory_delta'
]);

const REQUIRED_PHASE2_EVIDENCE = Object.freeze([
  'defaultReadOnlySurfacePassed',
  'hiddenToolsHardRejectPassed',
  'nativeTargetBindingPassed',
  'nativeReadProofPassed',
  'fallbackDistinctionPassed',
  'lowDisclosureProofPassed',
  'auditReceiptPassed',
  'scopeVisibilityIsolationPassed',
  'wslLinuxProofPassed',
  'windowsWslSmokePassed'
]);

const STOP_L4_FLAG_KEYS = Object.freeze([
  'runLiveReadNow',
  'liveReadRequested',
  'nativeRuntimeCallRequested',
  'vcpToolBoxRuntimeCallRequested',
  'serviceStartRequested',
  'serviceStopRequested',
  'processInspectionRequested',
  'realMemoryScanRequested',
  'rawPrivateMemoryReadRequested',
  'providerApiCallRequested',
  'runtimeWriteExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'providerApiCalled',
  'publicMcpExpanded',
  'tagCreated',
  'tagPushed',
  'releaseCreated',
  'releasePublished',
  'deploymentTriggered',
  'cutoverPerformed',
  'readinessClaimed',
  'productionReadyClaimed',
  'releaseReadyClaimed',
  'deployReadyClaimed',
  'cutoverReadyClaimed'
]);

const FORBIDDEN_INPUT_KEY_PATTERNS = Object.freeze([
  /raw/i,
  /secret/i,
  /token/i,
  /bearer/i,
  /private.*memory/i,
  /endpoint/i,
  /locator/i,
  /request.*body/i,
  /response.*body/i,
  /approval.*line/i,
  /provider.*payload/i,
  /runtime.*payload/i,
  /memory.*content/i,
  /query.*text/i
]);

function sortedUnique(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean))].sort();
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isForbiddenInputKey(key) {
  return FORBIDDEN_INPUT_KEY_PATTERNS.some(pattern => pattern.test(String(key || '')));
}

function collectForbiddenInputPaths(value, path = []) {
  if (!isPlainObject(value)) {
    return [];
  }

  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (isForbiddenInputKey(key)) {
      paths.push(nextPath.join('.'));
      continue;
    }
    paths.push(...collectForbiddenInputPaths(child, nextPath));
  }
  return sortedUnique(paths);
}

function collectEnabledStopFlags(value, path = []) {
  if (!isPlainObject(value)) {
    return [];
  }

  const flags = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (STOP_L4_FLAG_KEYS.includes(key) && child === true) {
      flags.push(nextPath.join('.'));
      continue;
    }
    flags.push(...collectEnabledStopFlags(child, nextPath));
  }
  return sortedUnique(flags);
}

function buildSurfaceEvidence(publicToolNames = []) {
  const toolNames = sortedUnique(publicToolNames);
  const missingReadOnlyBridgeTools = REQUIRED_READONLY_BRIDGE_TOOLS
    .filter(toolName => !toolNames.includes(toolName));
  const forbiddenDefaultMutationTools = FORBIDDEN_DEFAULT_MUTATION_TOOLS
    .filter(toolName => toolNames.includes(toolName));

  return {
    toolNames,
    requiredReadOnlyBridgeTools: [...REQUIRED_READONLY_BRIDGE_TOOLS],
    defaultSafeContextTools: [...DEFAULT_SAFE_CONTEXT_TOOLS],
    forbiddenDefaultMutationTools,
    missingReadOnlyBridgeTools,
    requiredReadOnlyBridgeToolsPresent: missingReadOnlyBridgeTools.length === 0,
    hiddenMutationToolsAbsent: forbiddenDefaultMutationTools.length === 0
  };
}

function buildMissingEvidence(evidence = {}) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};
  return REQUIRED_PHASE2_EVIDENCE.filter(field => safeEvidence[field] !== true);
}

function evaluatePhase2NativeReadProofEvidenceGate({
  publicToolNames = [],
  evidence = {},
  request = {}
} = {}) {
  const safeEvidence = isPlainObject(evidence) ? evidence : {};
  const surface = buildSurfaceEvidence(publicToolNames);
  const blockers = [];
  const stopReasons = [];

  for (const toolName of surface.missingReadOnlyBridgeTools) {
    blockers.push(`missing_readonly_bridge_tool_${toolName}`);
  }
  for (const toolName of surface.forbiddenDefaultMutationTools) {
    stopReasons.push(`default_surface_mutation_tool_not_allowed_${toolName}`);
  }

  for (const field of buildMissingEvidence(safeEvidence)) {
    blockers.push(`missing_phase2_evidence_${field}`);
  }

  const forbiddenInputPaths = sortedUnique([
    ...collectForbiddenInputPaths(safeEvidence, ['evidence']),
    ...collectForbiddenInputPaths(request, ['request'])
  ]);
  const enabledStopFlags = sortedUnique([
    ...collectEnabledStopFlags(safeEvidence, ['evidence']),
    ...collectEnabledStopFlags(request, ['request'])
  ]);

  for (const path of forbiddenInputPaths) {
    stopReasons.push(`forbidden_input_field_${path}`);
  }
  for (const path of enabledStopFlags) {
    stopReasons.push(`stop_l4_flag_${path}`);
  }

  const stopped = stopReasons.length > 0;
  const accepted = !stopped && blockers.length === 0;

  return {
    schemaVersion: 'phase2_native_read_proof_evidence_gate_v1',
    accepted,
    status: stopped
      ? 'phase2_native_read_proof_stop_l4'
      : accepted
        ? 'phase2_native_read_proof_evidence_accepted'
        : 'phase2_native_read_proof_evidence_incomplete',
    blockers: sortedUnique(blockers),
    stopReasons: sortedUnique(stopReasons),
    requiredEvidence: [...REQUIRED_PHASE2_EVIDENCE],
    publicSurface: surface,
    evidenceSummary: {
      defaultReadOnlySurfacePassed: safeEvidence.defaultReadOnlySurfacePassed === true,
      hiddenToolsHardRejectPassed: safeEvidence.hiddenToolsHardRejectPassed === true,
      nativeTargetBindingPassed: safeEvidence.nativeTargetBindingPassed === true,
      nativeReadProofPassed: safeEvidence.nativeReadProofPassed === true,
      fallbackDistinctionPassed: safeEvidence.fallbackDistinctionPassed === true,
      lowDisclosureProofPassed: safeEvidence.lowDisclosureProofPassed === true,
      auditReceiptPassed: safeEvidence.auditReceiptPassed === true,
      scopeVisibilityIsolationPassed: safeEvidence.scopeVisibilityIsolationPassed === true,
      wslLinuxProofPassed: safeEvidence.wslLinuxProofPassed === true,
      windowsWslSmokePassed: safeEvidence.windowsWslSmokePassed === true
    },
    policy: {
      evaluatesReceiptOnly: true,
      executesLiveRead: false,
      startsOrStopsServices: false,
      inspectsProcessState: false,
      readsRealMemory: false,
      readsRawPrivateState: false,
      callsProviderApi: false,
      performsDurableMutation: false,
      expandsPublicMcp: false,
      readinessClaimed: false,
      nativeWriteProofAccepted: false
    },
    nextGate: accepted
      ? 'feed_phase2_evidence_into_completion_audit_without_write_or_readiness_claim'
      : stopped
        ? 'stop_before_live_runtime_private_state_or_readiness_boundary'
        : 'collect_exact_authorized_low_disclosure_native_read_receipts'
  };
}

module.exports = {
  REQUIRED_READONLY_BRIDGE_TOOLS,
  DEFAULT_SAFE_CONTEXT_TOOLS,
  FORBIDDEN_DEFAULT_MUTATION_TOOLS,
  REQUIRED_PHASE2_EVIDENCE,
  evaluatePhase2NativeReadProofEvidenceGate
};
