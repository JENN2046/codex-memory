'use strict';

const { ACTIONS } = require('./VcpBridgeExactApprovalGate');

const PROBE_TYPE = 'vcp_bridge_live_no_write_probe_plan';
const ALLOWED_CHECKS = Object.freeze([
  'bridge_reachable_design_only',
  'trusted_context_shape',
  'allowlist_hash',
  'context_hash',
  'approval_gate_accepted',
  'no_record_memory_call',
  'no_public_mcp_expansion'
]);
const ZERO_COUNTERS = Object.freeze({
  networkCallsPlanned: 0,
  vcpRuntimeCallsPlanned: 0,
  mcpCallsPlanned: 0,
  recordMemoryCallsPlanned: 0,
  recordMemoryWritesPlanned: 0,
  persistentTagWritesPlanned: 0,
  providerApiCallsPlanned: 0,
  bearerTokenMaterialLogged: 0,
  rawScansPlanned: 0,
  broadScansPlanned: 0,
  confirmedMutationsPlanned: 0,
  publicMcpExpansionsPlanned: 0
});
const FORBIDDEN_INTENT_FIELDS = Object.freeze([
  'writeIntent',
  'recordMemoryWriteIntent',
  'recordMemoryCallIntent',
  'persistentTagWriteIntent',
  'providerApiIntent',
  'providerApiFlag',
  'bearerTokenMaterial',
  'bearerTokenMaterialFlag',
  'bearerTokenLoggingIntent',
  'rawScanIntent',
  'rawScanFlag',
  'broadScanIntent',
  'broadScanFlag',
  'confirmedMutationIntent',
  'publicMcpExpansionIntent'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function lowDisclosure(reason, missingFields = [], forbiddenFields = []) {
  return {
    reason,
    code: 'vcp_bridge_live_no_write_probe_plan_rejected',
    lowDisclosure: true,
    missingFields,
    forbiddenFields
  };
}

function rejected(reason, { missingFields = [], forbiddenFields = [] } = {}) {
  return {
    accepted: false,
    probeType: PROBE_TYPE,
    action: ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE,
    actionPlanOnly: true,
    lowDisclosureRejection: lowDisclosure(reason, missingFields, forbiddenFields),
    missingFields,
    forbiddenFields,
    allowedChecks: [],
    stopConditions: [
      'missing_accepted_adapter',
      'missing_accepted_proof',
      'missing_accepted_exact_approval',
      'write_intent_detected',
      'provider_api_intent_detected',
      'bearer_token_material_detected',
      'raw_or_broad_scan_intent_detected',
      'confirmed_mutation_intent_detected',
      'public_mcp_expansion_intent_detected'
    ],
    rollbackPlan: 'no_runtime_state_to_rollback',
    counters: { ...ZERO_COUNTERS },
    bridgeReachabilityExecuted: false,
    networkCalled: false,
    vcpRuntimeCalled: false,
    mcpCalled: false,
    recordMemoryCalled: false,
    publicMcpExpanded: false,
    providerApiCalled: false,
    bearerTokenMaterialAccepted: false,
    rawScanAllowed: false,
    broadScanAllowed: false,
    confirmedMutationAllowed: false
  };
}

function isAccepted(value) {
  return isPlainObject(value) && value.accepted === true;
}

function hasForbiddenIntent(input) {
  return FORBIDDEN_INTENT_FIELDS.filter(field => input[field]);
}

function buildVcpBridgeLiveNoWriteProbePlan(input = {}) {
  if (!isPlainObject(input)) {
    return rejected('input_not_plain_object');
  }

  const forbiddenFields = hasForbiddenIntent(input);
  if (forbiddenFields.length > 0) {
    return rejected('forbidden_probe_intent', { forbiddenFields });
  }

  const {
    requestedAction = ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE,
    adapterResult,
    proofPreflightResult,
    approvalGateResult
  } = input;

  if (requestedAction === ACTIONS.LIVE_BRIDGE_RECORD_MEMORY_PROOF) {
    return rejected('live_record_memory_proof_not_allowed_by_no_write_probe', {
      forbiddenFields: ['requestedAction']
    });
  }
  if (requestedAction !== ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE) {
    return rejected('unsupported_probe_action', {
      forbiddenFields: ['requestedAction']
    });
  }

  const missingFields = [];
  if (!isAccepted(adapterResult)) missingFields.push('adapterResult');
  if (!isAccepted(proofPreflightResult)) missingFields.push('proofPreflightResult');
  if (!isAccepted(approvalGateResult)) missingFields.push('approvalGateResult');
  if (missingFields.length > 0) {
    return rejected('required_preflight_not_accepted', { missingFields });
  }

  if (approvalGateResult.allowedAction !== ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE) {
    return rejected('approval_gate_action_not_live_no_write', {
      forbiddenFields: ['approvalGateResult.allowedAction']
    });
  }

  return {
    accepted: true,
    probeType: PROBE_TYPE,
    action: ACTIONS.LIVE_BRIDGE_PROBE_NO_WRITE,
    actionPlanOnly: true,
    lowDisclosureRejection: null,
    missingFields: [],
    forbiddenFields: [],
    allowedChecks: ALLOWED_CHECKS,
    receiptCountersRequired: Object.keys(ZERO_COUNTERS),
    stopConditions: [
      'any_write_intent',
      'any_record_memory_call',
      'any_provider_api_intent',
      'any_bearer_token_material_logging',
      'any_raw_or_broad_scan_intent',
      'any_confirmed_mutation_intent',
      'any_public_mcp_expansion_intent',
      'approval_gate_not_accepted',
      'proof_preflight_not_accepted',
      'adapter_result_not_accepted'
    ],
    rollbackPlan: 'no_runtime_state_to_rollback',
    counters: { ...ZERO_COUNTERS },
    bridgeReachabilityExecuted: false,
    bridgeReachabilityCheck: 'design_only_not_executed',
    trustedContextShapeCheck: 'planned_from_adapter_result',
    allowlistHashCheck: 'planned_from_proof_and_approval',
    contextHashCheck: 'planned_from_proof_and_approval',
    approvalGateCheck: 'accepted_live_bridge_probe_no_write',
    networkCalled: false,
    vcpRuntimeCalled: false,
    mcpCalled: false,
    recordMemoryCalled: false,
    publicMcpExpanded: false,
    providerApiCalled: false,
    bearerTokenMaterialAccepted: false,
    rawScanAllowed: false,
    broadScanAllowed: false,
    confirmedMutationAllowed: false
  };
}

module.exports = {
  ALLOWED_CHECKS,
  FORBIDDEN_INTENT_FIELDS,
  PROBE_TYPE,
  ZERO_COUNTERS,
  buildVcpBridgeLiveNoWriteProbePlan
};
