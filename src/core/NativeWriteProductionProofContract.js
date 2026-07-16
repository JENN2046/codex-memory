'use strict';

const CONTRACT_NAME = 'NativeWriteProductionProofContract';
const CONTRACT_MODE = 'local_phase8_native_write_contract_preflight_only';
const SCHEMA_VERSION = 1;

const ALLOWED_MODES = Object.freeze([
  'local-contract-preflight'
]);

const ALLOWED_PHASE_ACTIONS = Object.freeze([
  'prepare_write',
  'commit_write',
  'verify_write',
  'rollback_or_compensate'
]);

const ALLOWED_DECISIONS = Object.freeze([
  'native_write_contract_preflight_accepted',
  'native_write_contract_proof_rejected',
  'native_write_contract_sequence_rejected',
  'stop_l4'
]);

const REQUIRED_TOP_LEVEL_FIELDS = Object.freeze([
  'schemaVersion',
  'taskId',
  'mode',
  'phaseAction',
  'sequence',
  'priorGateEvidence',
  'proofRequirements',
  'authority',
  'runtimeTarget',
  'writePlan',
  'commitEvidence',
  'verifyEvidence',
  'rollbackEvidence',
  'failureRecovery',
  'audit',
  'output',
  'expectedDecision',
  'counters'
]);

const REQUIRED_SEQUENCE_FIELDS = Object.freeze([
  'prepareWriteContractAccepted',
  'commitWriteContractAccepted',
  'verifyWriteContractAccepted'
]);

const REQUIRED_PRIOR_GATE_FIELDS = Object.freeze([
  'operatorFullSurfaceProofAccepted',
  'defaultSurfaceUnchanged',
  'hardenedSurfaceRejected',
  'commitMemoryDeltaNotPublic',
  'proposalOnlyDefaultSurfacePreserved'
]);

const REQUIRED_PROOF_REQUIREMENT_FIELDS = Object.freeze([
  'exactApprovalEnforcementDefined',
  'nativeSideEffectReceiptRequired',
  'realRootDurableWriteProofRequired',
  'auditReceiptRequired',
  'rollbackPostureRequired',
  'failureRecoveryRequired',
  'outputDisclosureBudgetRequired'
]);

const REQUIRED_AUTHORITY_FIELDS = Object.freeze([
  'exactApprovalAccepted',
  'freshCurrentSingleUseApproval',
  'taskScopeBound',
  'operatorIntentBound',
  'durableWriteAuthorized',
  'providerApiAuthorized',
  'publicMcpExpansionAuthorized',
  'releaseDeployCutoverAuthorized',
  'readinessClaimAuthorized'
]);

const REQUIRED_RUNTIME_TARGET_FIELDS = Object.freeze([
  'targetReferenceBound',
  'targetReferenceCategory',
  'realRootTargetRequired',
  'endpointLocatorDisclosed',
  'rawRuntimeStateDisclosed'
]);

const REQUIRED_WRITE_PLAN_FIELDS = Object.freeze([
  'prepareWriteDefined',
  'commitWriteDefined',
  'boundedMutationFamilySelected',
  'scopeBound',
  'visibilityBound',
  'rollbackPostureBound',
  'unboundedMutationAllowed'
]);

const REQUIRED_COMMIT_EVIDENCE_FIELDS = Object.freeze([
  'commitWriteDefined',
  'nativeSideEffectReceiptRequired',
  'nativeWriteExecuted',
  'nativeSideEffectReceiptObserved',
  'realRootDurableWriteObserved'
]);

const REQUIRED_VERIFY_EVIDENCE_FIELDS = Object.freeze([
  'verifyWriteDefined',
  'verifyWritePassed',
  'durableWriteReReadObserved',
  'auditReceiptMatched',
  'scopeIsolationVerified'
]);

const REQUIRED_ROLLBACK_EVIDENCE_FIELDS = Object.freeze([
  'rollbackOrCompensateDefined',
  'rollbackPostureDefined',
  'rollbackOrCompensateExecuted',
  'rollbackReceiptObserved',
  'compensationBounded'
]);

const REQUIRED_FAILURE_RECOVERY_FIELDS = Object.freeze([
  'failureRecoveryDefined',
  'failureRecoveryDrillPassed',
  'partialWriteHandled',
  'retryBudgetBounded',
  'manualEscalationDefined'
]);

const REQUIRED_AUDIT_FIELDS = Object.freeze([
  'lowDisclosureAuditReceiptDefined',
  'auditReceiptObserved',
  'rawAuditIncluded',
  'nativeSideEffectReceiptLinked',
  'rollbackReceiptLinked'
]);

const REQUIRED_OUTPUT_FIELDS = Object.freeze([
  'lowDisclosureReceiptOnly',
  'rawValuesIncluded',
  'endpointLocatorIncluded',
  'requestResponseBodyIncluded',
  'rawMemoryIncluded',
  'readinessClaimIncluded'
]);

const COUNTER_FIELDS = Object.freeze([
  'runtimeCalls',
  'liveVcpToolBoxCalls',
  'nativeWriteAttempts',
  'memoryWrites',
  'durableMemoryWrites',
  'memoryUpdates',
  'memorySupersedes',
  'memoryTombstones',
  'providerApiCalls',
  'publicMcpExpansions',
  'releaseDeployCutoverActions',
  'readinessClaims'
]);

const FORBIDDEN_FIELD_NAMES = Object.freeze([
  'rawPayload',
  'raw_payload',
  'rawOutput',
  'raw_output',
  'rawPrivatePayload',
  'raw_private_payload',
  'rawRequest',
  'raw_request',
  'rawResponse',
  'raw_response',
  'requestBody',
  'request_body',
  'responseBody',
  'response_body',
  'rawError',
  'raw_error',
  'memoryContent',
  'memory_content',
  'rawMemory',
  'raw_memory',
  'rawAudit',
  'raw_audit',
  'rawAuditRow',
  'rawSqliteRow',
  'rawJsonlRow',
  'rawVectorRow',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'privateKey',
  'endpoint',
  'locator',
  'runtimeLocator',
  'approvalLine',
  'approvalLineValue',
  'providerPayload',
  'productionReady',
  'releaseReady',
  'deployReady',
  'cutoverReady',
  'rcReady',
  'RC_READY',
  'completeV8',
  'fullBridgeCompletion'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, field) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function pathJoin(prefix, key) {
  return prefix ? `${prefix}.${key}` : key;
}

function missingFields(required, value, prefix = '') {
  const actual = isPlainObject(value) ? value : {};
  return required
    .filter(field => !hasOwn(actual, field))
    .map(field => pathJoin(prefix, field));
}

function collectForbiddenFields(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenFields(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = pathJoin(prefix, key);
    if (FORBIDDEN_FIELD_NAMES.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenFields(nested, path));
  }
  return found;
}

function collectUnexpectedKeys(value, allowedFields, prefix = '') {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .filter(key => !allowedFields.includes(key))
    .map(key => pathJoin(prefix, key));
}

function collectUnexpectedFields(input) {
  if (!isPlainObject(input)) return [];
  return [
    ...collectUnexpectedKeys(input, REQUIRED_TOP_LEVEL_FIELDS),
    ...collectUnexpectedKeys(input.sequence, REQUIRED_SEQUENCE_FIELDS, 'sequence'),
    ...collectUnexpectedKeys(input.priorGateEvidence, REQUIRED_PRIOR_GATE_FIELDS, 'priorGateEvidence'),
    ...collectUnexpectedKeys(input.proofRequirements, REQUIRED_PROOF_REQUIREMENT_FIELDS, 'proofRequirements'),
    ...collectUnexpectedKeys(input.authority, REQUIRED_AUTHORITY_FIELDS, 'authority'),
    ...collectUnexpectedKeys(input.runtimeTarget, REQUIRED_RUNTIME_TARGET_FIELDS, 'runtimeTarget'),
    ...collectUnexpectedKeys(input.writePlan, REQUIRED_WRITE_PLAN_FIELDS, 'writePlan'),
    ...collectUnexpectedKeys(input.commitEvidence, REQUIRED_COMMIT_EVIDENCE_FIELDS, 'commitEvidence'),
    ...collectUnexpectedKeys(input.verifyEvidence, REQUIRED_VERIFY_EVIDENCE_FIELDS, 'verifyEvidence'),
    ...collectUnexpectedKeys(input.rollbackEvidence, REQUIRED_ROLLBACK_EVIDENCE_FIELDS, 'rollbackEvidence'),
    ...collectUnexpectedKeys(input.failureRecovery, REQUIRED_FAILURE_RECOVERY_FIELDS, 'failureRecovery'),
    ...collectUnexpectedKeys(input.audit, REQUIRED_AUDIT_FIELDS, 'audit'),
    ...collectUnexpectedKeys(input.output, REQUIRED_OUTPUT_FIELDS, 'output'),
    ...collectUnexpectedKeys(input.counters, COUNTER_FIELDS, 'counters')
  ];
}

function invalidCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => !Number.isInteger(counters[field]) || counters[field] < 0);
}

function nonZeroCounters(counters) {
  if (!isPlainObject(counters)) return [...COUNTER_FIELDS];
  return COUNTER_FIELDS.filter(field => counters[field] !== 0);
}

function missingTrueFields(value, fields, prefix) {
  return fields
    .filter(field => value[field] !== true)
    .map(field => pathJoin(prefix, field));
}

function trueFields(value, fields, prefix) {
  return fields
    .filter(field => value[field] === true)
    .map(field => pathJoin(prefix, field));
}

function buildStopBlockers(input) {
  return [
    ...trueFields(input.authority, [
      'exactApprovalAccepted',
      'freshCurrentSingleUseApproval',
      'durableWriteAuthorized',
      'providerApiAuthorized',
      'publicMcpExpansionAuthorized',
      'releaseDeployCutoverAuthorized',
      'readinessClaimAuthorized'
    ], 'authority'),
    ...trueFields(input.runtimeTarget, [
      'endpointLocatorDisclosed',
      'rawRuntimeStateDisclosed'
    ], 'runtimeTarget'),
    ...trueFields(input.writePlan, [
      'unboundedMutationAllowed'
    ], 'writePlan'),
    ...trueFields(input.commitEvidence, [
      'nativeWriteExecuted',
      'nativeSideEffectReceiptObserved',
      'realRootDurableWriteObserved'
    ], 'commitEvidence'),
    ...trueFields(input.verifyEvidence, [
      'verifyWritePassed',
      'durableWriteReReadObserved'
    ], 'verifyEvidence'),
    ...trueFields(input.rollbackEvidence, [
      'rollbackOrCompensateExecuted',
      'rollbackReceiptObserved'
    ], 'rollbackEvidence'),
    ...trueFields(input.failureRecovery, [
      'failureRecoveryDrillPassed',
      'partialWriteHandled'
    ], 'failureRecovery'),
    ...trueFields(input.audit, [
      'auditReceiptObserved',
      'rawAuditIncluded',
      'nativeSideEffectReceiptLinked',
      'rollbackReceiptLinked'
    ], 'audit'),
    ...trueFields(input.output, [
      'rawValuesIncluded',
      'endpointLocatorIncluded',
      'requestResponseBodyIncluded',
      'rawMemoryIncluded',
      'readinessClaimIncluded'
    ], 'output'),
    ...nonZeroCounters(input.counters).map(field => `counters.${field}`)
  ];
}

function buildCommonProofBlockers(input) {
  const blockers = [
    ...missingTrueFields(input.priorGateEvidence, REQUIRED_PRIOR_GATE_FIELDS, 'priorGateEvidence'),
    ...missingTrueFields(input.proofRequirements, REQUIRED_PROOF_REQUIREMENT_FIELDS, 'proofRequirements')
  ];

  if (input.runtimeTarget.targetReferenceBound !== true) {
    blockers.push('runtimeTarget.targetReferenceBound');
  }
  if (input.runtimeTarget.realRootTargetRequired !== true) {
    blockers.push('runtimeTarget.realRootTargetRequired');
  }
  if (input.writePlan.scopeBound !== true) {
    blockers.push('writePlan.scopeBound');
  }
  if (input.writePlan.visibilityBound !== true) {
    blockers.push('writePlan.visibilityBound');
  }
  if (input.writePlan.rollbackPostureBound !== true) {
    blockers.push('writePlan.rollbackPostureBound');
  }
  if (input.audit.lowDisclosureAuditReceiptDefined !== true) {
    blockers.push('audit.lowDisclosureAuditReceiptDefined');
  }
  if (input.output.lowDisclosureReceiptOnly !== true) {
    blockers.push('output.lowDisclosureReceiptOnly');
  }
  if (input.authority.taskScopeBound !== true) {
    blockers.push('authority.taskScopeBound');
  }
  if (input.authority.operatorIntentBound !== true) {
    blockers.push('authority.operatorIntentBound');
  }

  return blockers;
}

function buildActionBlockers(input) {
  const action = input.phaseAction;
  const blockers = [];

  if (action === 'prepare_write') {
    if (input.writePlan.prepareWriteDefined !== true) {
      blockers.push('writePlan.prepareWriteDefined');
    }
    return blockers;
  }

  if (action === 'commit_write') {
    if (input.sequence.prepareWriteContractAccepted !== true) {
      blockers.push('sequence.prepareWriteContractAccepted');
    }
    if (input.writePlan.commitWriteDefined !== true) {
      blockers.push('writePlan.commitWriteDefined');
    }
    if (input.commitEvidence.commitWriteDefined !== true) {
      blockers.push('commitEvidence.commitWriteDefined');
    }
    if (input.commitEvidence.nativeSideEffectReceiptRequired !== true) {
      blockers.push('commitEvidence.nativeSideEffectReceiptRequired');
    }
    return blockers;
  }

  if (action === 'verify_write') {
    if (input.sequence.commitWriteContractAccepted !== true) {
      blockers.push('sequence.commitWriteContractAccepted');
    }
    if (input.verifyEvidence.verifyWriteDefined !== true) {
      blockers.push('verifyEvidence.verifyWriteDefined');
    }
    if (input.commitEvidence.nativeSideEffectReceiptRequired !== true) {
      blockers.push('commitEvidence.nativeSideEffectReceiptRequired');
    }
    return blockers;
  }

  if (action === 'rollback_or_compensate') {
    if (input.sequence.commitWriteContractAccepted !== true) {
      blockers.push('sequence.commitWriteContractAccepted');
    }
    if (input.rollbackEvidence.rollbackOrCompensateDefined !== true) {
      blockers.push('rollbackEvidence.rollbackOrCompensateDefined');
    }
    if (input.rollbackEvidence.rollbackPostureDefined !== true) {
      blockers.push('rollbackEvidence.rollbackPostureDefined');
    }
    if (input.failureRecovery.failureRecoveryDefined !== true) {
      blockers.push('failureRecovery.failureRecoveryDefined');
    }
    return blockers;
  }

  return ['phaseAction'];
}

function computeDecision(input) {
  const stopBlockers = buildStopBlockers(input);
  if (stopBlockers.length > 0) {
    return { decision: 'stop_l4', blockers: stopBlockers };
  }

  const commonBlockers = buildCommonProofBlockers(input);
  if (commonBlockers.length > 0) {
    return {
      decision: 'native_write_contract_proof_rejected',
      blockers: commonBlockers
    };
  }

  const actionBlockers = buildActionBlockers(input);
  if (actionBlockers.length > 0) {
    const sequenceBlocked = actionBlockers.some(field => field.startsWith('sequence.'));
    return {
      decision: sequenceBlocked
        ? 'native_write_contract_sequence_rejected'
        : 'native_write_contract_proof_rejected',
      blockers: actionBlockers
    };
  }

  return {
    decision: 'native_write_contract_preflight_accepted',
    blockers: []
  };
}

function failure(reasonCode, extras = {}) {
  return {
    accepted: false,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    reasonCode,
    blockers: [],
    productionWriteProven: false,
    realRootDurableWriteProven: false,
    runtimeCalled: false,
    nativeWriteExecuted: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    releaseDeployCutoverPerformed: false,
    readinessClaimed: false,
    ...extras
  };
}

function evaluateNativeWriteProductionProofContract(input) {
  if (!isPlainObject(input)) {
    return failure('invalid_input');
  }

  const forbiddenFields = collectForbiddenFields(input);
  if (forbiddenFields.length > 0) {
    return failure('forbidden_raw_secret_runtime_or_overclaim_fields', {
      forbiddenFields
    });
  }

  const missing = [
    ...missingFields(REQUIRED_TOP_LEVEL_FIELDS, input),
    ...missingFields(REQUIRED_SEQUENCE_FIELDS, input.sequence, 'sequence'),
    ...missingFields(REQUIRED_PRIOR_GATE_FIELDS, input.priorGateEvidence, 'priorGateEvidence'),
    ...missingFields(REQUIRED_PROOF_REQUIREMENT_FIELDS, input.proofRequirements, 'proofRequirements'),
    ...missingFields(REQUIRED_AUTHORITY_FIELDS, input.authority, 'authority'),
    ...missingFields(REQUIRED_RUNTIME_TARGET_FIELDS, input.runtimeTarget, 'runtimeTarget'),
    ...missingFields(REQUIRED_WRITE_PLAN_FIELDS, input.writePlan, 'writePlan'),
    ...missingFields(REQUIRED_COMMIT_EVIDENCE_FIELDS, input.commitEvidence, 'commitEvidence'),
    ...missingFields(REQUIRED_VERIFY_EVIDENCE_FIELDS, input.verifyEvidence, 'verifyEvidence'),
    ...missingFields(REQUIRED_ROLLBACK_EVIDENCE_FIELDS, input.rollbackEvidence, 'rollbackEvidence'),
    ...missingFields(REQUIRED_FAILURE_RECOVERY_FIELDS, input.failureRecovery, 'failureRecovery'),
    ...missingFields(REQUIRED_AUDIT_FIELDS, input.audit, 'audit'),
    ...missingFields(REQUIRED_OUTPUT_FIELDS, input.output, 'output'),
    ...missingFields(COUNTER_FIELDS, input.counters, 'counters')
  ];
  if (missing.length > 0) {
    return failure('missing_required_fields', { missingFields: missing });
  }

  const unexpected = collectUnexpectedFields(input);
  if (unexpected.length > 0) {
    return failure('unexpected_fields', { unexpectedFields: unexpected });
  }

  if (input.schemaVersion !== SCHEMA_VERSION) {
    return failure('invalid_schema_version');
  }

  if (!/^CM-[0-9]{4}$/.test(input.taskId)) {
    return failure('invalid_task_id');
  }

  if (!ALLOWED_MODES.includes(input.mode)) {
    return failure('invalid_mode');
  }

  if (!ALLOWED_PHASE_ACTIONS.includes(input.phaseAction)) {
    return failure('invalid_phase_action');
  }

  if (!ALLOWED_DECISIONS.includes(input.expectedDecision)) {
    return failure('invalid_expected_decision');
  }

  const invalidCounterFields = invalidCounters(input.counters);
  if (invalidCounterFields.length > 0) {
    return failure('invalid_counters', { invalidCounterFields });
  }

  const computed = computeDecision(input);
  if (computed.decision !== input.expectedDecision) {
    return failure('decision_mismatch', {
      expectedDecision: input.expectedDecision,
      computedDecision: computed.decision,
      blockers: computed.blockers
    });
  }

  const accepted = computed.decision === 'native_write_contract_preflight_accepted';
  return {
    accepted,
    contractName: CONTRACT_NAME,
    contractMode: CONTRACT_MODE,
    decision: computed.decision,
    blockers: computed.blockers,
    phaseAction: input.phaseAction,
    taskId: input.taskId,
    productionWriteProven: false,
    realRootDurableWriteProven: false,
    preflightOnly: true,
    nextGate: accepted
      ? 'exact_approved_real_root_write_proof_required'
      : 'phase8_native_write_contract_material_incomplete',
    lowDisclosureReceipt: {
      taskId: input.taskId,
      phase: 'Phase 8',
      action: input.phaseAction,
      decision: computed.decision,
      targetReferenceCategory: input.runtimeTarget.targetReferenceCategory,
      exactApprovalEnforcementDefined: input.proofRequirements.exactApprovalEnforcementDefined,
      nativeSideEffectReceiptRequired: input.proofRequirements.nativeSideEffectReceiptRequired,
      realRootDurableWriteProofRequired: input.proofRequirements.realRootDurableWriteProofRequired,
      auditReceiptRequired: input.proofRequirements.auditReceiptRequired,
      rollbackPostureRequired: input.proofRequirements.rollbackPostureRequired,
      failureRecoveryRequired: input.proofRequirements.failureRecoveryRequired,
      lowDisclosure: true,
      rawValuesIncluded: false,
      endpointLocatorIncluded: false,
      memoryWritten: false,
      durableWrite: false,
      readinessClaimed: false
    },
    runtimeCalled: false,
    liveVcpToolBoxCalled: false,
    nativeWriteExecuted: false,
    memoryWritten: false,
    durableMutationPerformed: false,
    providerApiCalled: false,
    publicMcpExpanded: false,
    releaseDeployCutoverPerformed: false,
    readinessClaimed: false
  };
}

module.exports = {
  ALLOWED_DECISIONS,
  ALLOWED_MODES,
  ALLOWED_PHASE_ACTIONS,
  CONTRACT_MODE,
  CONTRACT_NAME,
  COUNTER_FIELDS,
  FORBIDDEN_FIELD_NAMES,
  REQUIRED_AUDIT_FIELDS,
  REQUIRED_AUTHORITY_FIELDS,
  REQUIRED_COMMIT_EVIDENCE_FIELDS,
  REQUIRED_FAILURE_RECOVERY_FIELDS,
  REQUIRED_OUTPUT_FIELDS,
  REQUIRED_PRIOR_GATE_FIELDS,
  REQUIRED_PROOF_REQUIREMENT_FIELDS,
  REQUIRED_ROLLBACK_EVIDENCE_FIELDS,
  REQUIRED_RUNTIME_TARGET_FIELDS,
  REQUIRED_SEQUENCE_FIELDS,
  REQUIRED_TOP_LEVEL_FIELDS,
  REQUIRED_VERIFY_EVIDENCE_FIELDS,
  REQUIRED_WRITE_PLAN_FIELDS,
  SCHEMA_VERSION,
  collectForbiddenFields,
  evaluateNativeWriteProductionProofContract
};
