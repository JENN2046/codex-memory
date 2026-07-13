'use strict';

const DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory',
  'prepare_memory_context',
  'propose_memory_delta'
]);

const OPERATOR_FULL_SURFACE_TOOLS = Object.freeze([
  'record_memory',
  'validate_memory',
  'tombstone_memory',
  'supersede_memory'
]);

const FORBIDDEN_DEFAULT_OPERATOR_TOOLS = Object.freeze([
  'commit_memory_delta'
]);

const REQUIRED_OPERATOR_PROOF_FIELDS = Object.freeze([
  'explicitEnvConfiguration',
  'operatorIntentConfirmed',
  'exactApprovalRequired',
  'auditReceiptRequired',
  'rollbackPostureRequired',
  'noApprovalDurableMutationBlocked',
  'defaultSurfaceUnchanged',
  'hardenedRegressionCovered'
]);

function sortedUnique(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean))].sort();
}

function isEnabled(value) {
  return value === true;
}

function isFullSurfaceConfig(config = {}) {
  const surface = String(config.mcpPublicToolSurface || '').trim().toLowerCase();
  return surface === 'full' ||
    (isEnabled(config.exposeControlledMutationMcpTools) && isEnabled(config.exposeWriteMcpTools));
}

function buildMissingRequiredProofFields(proof = {}) {
  return REQUIRED_OPERATOR_PROOF_FIELDS.filter(field => proof[field] !== true);
}

function buildToolSetBlockers(publicToolNames = []) {
  const names = sortedUnique(publicToolNames);
  const approved = sortedUnique([
    ...DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS,
    ...OPERATOR_FULL_SURFACE_TOOLS
  ]);
  const missingDefault = DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS.filter(toolName => !names.includes(toolName));
  const missingOperator = OPERATOR_FULL_SURFACE_TOOLS.filter(toolName => !names.includes(toolName));
  const forbiddenDefault = FORBIDDEN_DEFAULT_OPERATOR_TOOLS.filter(toolName => names.includes(toolName));
  const unexpected = names.filter(toolName => !approved.includes(toolName));

  return {
    names,
    missingDefault,
    missingOperator,
    forbiddenDefault,
    unexpected
  };
}

function evaluateOperatorFullSurfaceProof({
  config = {},
  publicToolNames = [],
  proof = {}
} = {}) {
  const toolSet = buildToolSetBlockers(publicToolNames);
  const blockers = [];
  const securityProfile = String(config.securityProfile || 'local').trim().toLowerCase();

  if (securityProfile === 'hardened') {
    blockers.push('hardened_profile_must_not_expose_operator_full_surface');
  }

  if (!isFullSurfaceConfig(config)) {
    blockers.push('explicit_operator_full_surface_config_missing');
  }

  const explicitTools = sortedUnique(config.mcpPublicToolNames);
  if (explicitTools.length > 0 && proof.explicitEnvConfiguration !== true) {
    blockers.push('explicit_tool_names_require_env_operator_evidence');
  }

  for (const field of buildMissingRequiredProofFields(proof)) {
    blockers.push(`missing_${field}`);
  }

  for (const toolName of toolSet.missingDefault) {
    blockers.push(`missing_default_tool_${toolName}`);
  }
  for (const toolName of toolSet.missingOperator) {
    blockers.push(`missing_operator_tool_${toolName}`);
  }
  for (const toolName of toolSet.forbiddenDefault) {
    blockers.push(`forbidden_default_tool_${toolName}`);
  }
  for (const toolName of toolSet.unexpected) {
    blockers.push(`unexpected_public_tool_${toolName}`);
  }

  const accepted = blockers.length === 0;

  return {
    schemaVersion: 'operator_full_surface_proof_gate_v1',
    accepted,
    status: accepted
      ? 'operator_full_surface_proof_accepted'
      : 'operator_full_surface_proof_rejected',
    blockers,
    publicSurface: {
      toolNames: toolSet.names,
      defaultProposalOnlyTools: [...DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS],
      operatorFullSurfaceTools: [...OPERATOR_FULL_SURFACE_TOOLS],
      missingDefaultTools: toolSet.missingDefault,
      missingOperatorTools: toolSet.missingOperator,
      forbiddenDefaultTools: toolSet.forbiddenDefault,
      unexpectedTools: toolSet.unexpected,
      commitMemoryDeltaPublicRegistered: toolSet.names.includes('commit_memory_delta')
    },
    policy: {
      explicitEnvOnly: proof.explicitEnvConfiguration === true,
      operatorIntentConfirmed: proof.operatorIntentConfirmed === true,
      hardenedRejected: securityProfile === 'hardened',
      hardenedRegressionCovered: proof.hardenedRegressionCovered === true,
      defaultSurfaceUnchanged: proof.defaultSurfaceUnchanged === true,
      exactApprovalRequired: proof.exactApprovalRequired === true,
      auditReceiptRequired: proof.auditReceiptRequired === true,
      rollbackPostureRequired: proof.rollbackPostureRequired === true,
      noApprovalDurableMutationBlocked: proof.noApprovalDurableMutationBlocked === true,
      nativeWriteProductionEnabled: false,
      durableMutationPerformed: false,
      providerApiCalled: false,
      readinessClaimed: false
    },
    nextGate: accepted
      ? 'native_write_production_proof_requires_separate_exact_approval'
      : 'operator_full_surface_proof_incomplete'
  };
}

module.exports = {
  DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS,
  OPERATOR_FULL_SURFACE_TOOLS,
  REQUIRED_OPERATOR_PROOF_FIELDS,
  evaluateOperatorFullSurfaceProof
};
