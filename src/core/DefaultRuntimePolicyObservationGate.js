'use strict';

const {
  DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS,
  OPERATOR_FULL_SURFACE_TOOLS
} = require('./OperatorFullSurfaceProofGate');

const COMMIT_MEMORY_DELTA_TOOL = 'commit_memory_delta';

const DEFAULT_RUNTIME_ALLOWED_TOOLS = Object.freeze([
  ...DEFAULT_PUBLIC_PROPOSAL_ONLY_TOOLS
]);

const DEFAULT_RUNTIME_FORBIDDEN_TOOLS = Object.freeze([
  ...OPERATOR_FULL_SURFACE_TOOLS,
  COMMIT_MEMORY_DELTA_TOOL
]);

const STOP_L4_FLAG_KEYS = Object.freeze([
  'approvalAccepted',
  'approvalSubmitted',
  'approvalLineGenerated',
  'approvalLineDisclosed',
  'runtimeWriteExecuted',
  'nativeWriteExecuted',
  'durableMutationPerformed',
  'rollbackExecuted',
  'failureRecoveryExecuted',
  'providerApiCalled',
  'publicMcpExpanded',
  'releaseTagged',
  'deployed',
  'cutoverPerformed',
  'readinessClaimed',
  'productionReadyClaimed',
  'releaseReadyClaimed',
  'cutoverReadyClaimed',
  'rcReadyClaimed',
  'deployReadyClaimed',
  'fullCapabilityClaimed',
  'modelMemoryCompleteClaimed'
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
  /approval.*line/i
]);

function sortedUnique(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(value => String(value || '').trim())
    .filter(Boolean))].sort();
}

function numberOrZero(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function isForbiddenInputKey(key) {
  return FORBIDDEN_INPUT_KEY_PATTERNS.some(pattern => pattern.test(String(key || '')));
}

function collectForbiddenInputPaths(value, path = []) {
  if (!value || typeof value !== 'object') {
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
  if (!value || typeof value !== 'object') {
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

function hasCompleteObservation(observation = {}) {
  return numberOrZero(observation.observationWindowDays) >= 30 ||
    observation.equivalentDogfoodReviewAccepted === true;
}

function evaluateDefaultRuntimePolicyObservationGate({
  publicToolNames = [],
  policy = {},
  observation = {},
  review = {}
} = {}) {
  const toolNames = sortedUnique(publicToolNames);
  const requestedDefaultTools = sortedUnique(policy.requestedDefaultTools);
  const defaultMissingTools = DEFAULT_RUNTIME_ALLOWED_TOOLS
    .filter(toolName => !toolNames.includes(toolName));
  const unexpectedDefaultTools = toolNames
    .filter(toolName => !DEFAULT_RUNTIME_ALLOWED_TOOLS.includes(toolName));
  const defaultForbiddenTools = [...unexpectedDefaultTools];
  const requestedForbiddenTools = DEFAULT_RUNTIME_FORBIDDEN_TOOLS
    .filter(toolName => requestedDefaultTools.includes(toolName));
  const expansionRequested = policy.expansionRequested === true ||
    requestedDefaultTools.some(toolName => !DEFAULT_RUNTIME_ALLOWED_TOOLS.includes(toolName)) ||
    unexpectedDefaultTools.length > 0;

  const forbiddenInputPaths = sortedUnique([
    ...collectForbiddenInputPaths(policy, ['policy']),
    ...collectForbiddenInputPaths(observation, ['observation']),
    ...collectForbiddenInputPaths(review, ['review'])
  ]);
  const enabledStopFlags = sortedUnique([
    ...collectEnabledStopFlags(policy, ['policy']),
    ...collectEnabledStopFlags(observation, ['observation']),
    ...collectEnabledStopFlags(review, ['review'])
  ]);

  const blockers = [];
  const stopReasons = [];

  for (const toolName of defaultMissingTools) {
    blockers.push(`missing_default_runtime_tool_${toolName}`);
  }
  for (const toolName of defaultForbiddenTools) {
    stopReasons.push(`default_runtime_tool_not_allowed_${toolName}`);
  }
  for (const toolName of requestedForbiddenTools) {
    stopReasons.push(`requested_default_runtime_tool_not_allowed_${toolName}`);
  }
  for (const path of forbiddenInputPaths) {
    stopReasons.push(`forbidden_input_field_${path}`);
  }
  for (const path of enabledStopFlags) {
    stopReasons.push(`stop_l4_flag_${path}`);
  }

  const observationComplete = hasCompleteObservation(observation);
  const externalReviewAccepted = review.externalReviewAccepted === true;

  if (expansionRequested) {
    blockers.push('default_runtime_expansion_request_not_accepted_by_current_policy');
    if (!observationComplete) {
      blockers.push('missing_30_day_observation_or_equivalent_dogfood_review');
    }
    if (!externalReviewAccepted) {
      blockers.push('missing_external_review_acceptance');
    }
  }

  const stopped = stopReasons.length > 0;
  const accepted = !stopped && blockers.length === 0 && expansionRequested === false;

  return {
    schemaVersion: 'default_runtime_policy_observation_gate_v1',
    accepted,
    status: stopped
      ? 'default_runtime_policy_stop_l4'
      : accepted
        ? 'default_runtime_policy_hold_read_context_proposal_accepted'
        : 'default_runtime_policy_rejected',
    blockers: sortedUnique(blockers),
    stopReasons: sortedUnique(stopReasons),
    publicSurface: {
      toolNames,
      defaultRuntimeAllowedTools: [...DEFAULT_RUNTIME_ALLOWED_TOOLS],
      defaultRuntimeForbiddenTools: [...DEFAULT_RUNTIME_FORBIDDEN_TOOLS],
      missingDefaultTools: defaultMissingTools,
      unexpectedDefaultTools,
      forbiddenDefaultTools: defaultForbiddenTools,
      commitMemoryDeltaPublicRegistered: toolNames.includes(COMMIT_MEMORY_DELTA_TOOL)
    },
    requestedSurface: {
      expansionRequested,
      requestedDefaultTools,
      requestedForbiddenTools
    },
    observation: {
      observationWindowRequired: true,
      observationWindowDays: numberOrZero(observation.observationWindowDays),
      equivalentDogfoodReviewAccepted: observation.equivalentDogfoodReviewAccepted === true,
      observationComplete
    },
    externalReview: {
      externalReviewRequired: true,
      externalReviewAccepted
    },
    policy: {
      recommendedDefault: 'read_context_proposal',
      defaultExpansionAllowed: false,
      productionWriteDefaultAllowed: false,
      operatorOnlyFullSurfaceStillSeparate: true,
      nativeWriteProductionStillSeparate: true,
      durableMutationPerformed: false,
      providerApiCalled: false,
      readinessClaimed: false
    },
    nextGate: accepted
      ? 'continue_observation_without_default_write_expansion'
      : stopped
        ? 'stop_before_runtime_or_write_boundary'
        : 'external_review_and_observation_required_before_any_future_policy_reconsideration'
  };
}

module.exports = {
  DEFAULT_RUNTIME_ALLOWED_TOOLS,
  DEFAULT_RUNTIME_FORBIDDEN_TOOLS,
  evaluateDefaultRuntimePolicyObservationGate
};
