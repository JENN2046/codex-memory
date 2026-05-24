const {
  normalizeDurableGovernanceMutationPacketContract,
  summarizeDurableGovernanceMutationPacketContract
} = require('./DurableGovernanceMutationPacketContract');
const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');

const EXPECTED_VALIDATION_MODE = 'internal_dry_run_only';

const REQUIRED_DRY_RUN_INPUT_FIELDS = Object.freeze([
  'phaseId',
  'mutationFamily',
  'targetMemoryIds',
  'scopeTuple',
  'actorClientId',
  'requestSource',
  'reason',
  'evidenceSummary',
  'lifecycleTransition',
  'auditIntentPolicy',
  'auditCommitPolicy',
  'projectionPolicy',
  'revisionEmitter',
  'changedMemoryIdsPolicy',
  'rollbackPath',
  'validationMode',
  'executionApprovalStatement',
  'mutationFieldValues'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeStringArray(values) {
  return [...new Set(
    cloneArray(values)
      .map(normalizeString)
      .filter(Boolean)
  )];
}

function normalizeStringRecord(record = {}) {
  if (!isPlainObject(record)) {
    return {};
  }

  const normalized = {};
  for (const [key, value] of Object.entries(record)) {
    const rawKey = typeof key === 'string' ? key : '';
    const normalizedKey = normalizeString(key);
    const normalizedValue = normalizeString(value);
    if (
      normalizedKey &&
      normalizedValue &&
      !/(authorization|bearer|api_key|providerapikey|password|token|set-cookie|cookie|raw_workspace_id)/i.test(rawKey) &&
      !/(authorization|bearer|api_key|providerapikey|password|token|set-cookie|cookie|raw_workspace_id)/i.test(normalizedKey)
    ) {
      normalized[normalizedKey] = normalizedValue;
    }
  }
  return normalized;
}

function normalizeScopeTuple(scopeTuple = {}) {
  const normalized = normalizeStringRecord(scopeTuple);
  const redacted = {};

  for (const [key, value] of Object.entries(normalized)) {
    if (/(projectid|workspaceid|clientid|taskid|conversationid)/i.test(key)) {
      redacted[key] = '<redacted>';
      continue;
    }
    redacted[key] = value;
  }

  return redacted;
}

function normalizeLifecycleTransition(transition = {}) {
  const safeTransition = isPlainObject(transition) ? transition : {};
  return {
    from: normalizeString(safeTransition.from),
    to: normalizeString(safeTransition.to)
  };
}

function normalizeDurableGovernanceMutationDryRunInput(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};

  return {
    contract: isPlainObject(safeInput.contract) ? safeInput.contract : {},
    phaseId: normalizeString(safeInput.phaseId),
    mutationFamily: normalizeString(safeInput.mutationFamily),
    targetMemoryIds: normalizeStringArray(safeInput.targetMemoryIds),
    scopeTuple: normalizeScopeTuple(safeInput.scopeTuple),
    actorClientId: normalizeString(safeInput.actorClientId),
    requestSource: normalizeString(safeInput.requestSource),
    reason: normalizeString(safeInput.reason),
    evidenceSummary: normalizeString(safeInput.evidenceSummary),
    lifecycleTransition: normalizeLifecycleTransition(safeInput.lifecycleTransition),
    auditIntentPolicy: normalizeString(safeInput.auditIntentPolicy),
    auditCommitPolicy: normalizeString(safeInput.auditCommitPolicy),
    projectionPolicy: normalizeString(safeInput.projectionPolicy),
    revisionEmitter: normalizeString(safeInput.revisionEmitter),
    changedMemoryIdsPolicy: normalizeString(safeInput.changedMemoryIdsPolicy),
    changedMemoryIds: normalizeStringArray(safeInput.changedMemoryIds),
    rollbackPath: normalizeString(safeInput.rollbackPath),
    validationMode: normalizeString(safeInput.validationMode),
    executionApprovalStatement: normalizeString(safeInput.executionApprovalStatement),
    mutationFieldValues: normalizeStringRecord(safeInput.mutationFieldValues)
  };
}

function hasValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (isPlainObject(value)) {
    return Object.keys(value).length > 0;
  }
  return typeof value === 'string' ? value.length > 0 : value === true;
}

function findMutationPacket(normalizedContract, mutationFamily) {
  return normalizedContract.mutationPackets.find(packet => packet.id === mutationFamily) || null;
}

function validateTargetCardinality(targetCardinality, targetMemoryIds) {
  if (targetCardinality === 'single') {
    return targetMemoryIds.length === 1;
  }
  if (targetCardinality === 'pair') {
    return targetMemoryIds.length === 2;
  }
  return targetMemoryIds.length > 0;
}

function deriveChangedMemoryIds(normalizedInput) {
  if (normalizedInput.changedMemoryIdsPolicy === 'explicit_changed_memory_ids') {
    return normalizeStringArray(normalizedInput.changedMemoryIds);
  }
  return normalizeStringArray(normalizedInput.targetMemoryIds);
}

function findMissingRequiredFields(requiredFields, values) {
  return requiredFields.filter(field => !hasValue(values[field]));
}

function buildTopLevelFieldValues(normalizedInput) {
  return {
    phaseId: normalizedInput.phaseId,
    mutationFamily: normalizedInput.mutationFamily,
    targetMemoryIds: normalizedInput.targetMemoryIds,
    scopeTuple: normalizedInput.scopeTuple,
    actorClientId: normalizedInput.actorClientId,
    requestSource: normalizedInput.requestSource,
    reason: normalizedInput.reason,
    evidenceSummary: normalizedInput.evidenceSummary,
    lifecycleTransition: normalizedInput.lifecycleTransition,
    auditIntentPolicy: normalizedInput.auditIntentPolicy,
    auditCommitPolicy: normalizedInput.auditCommitPolicy,
    projectionPolicy: normalizedInput.projectionPolicy,
    revisionEmitter: normalizedInput.revisionEmitter,
    changedMemoryIdsPolicy: normalizedInput.changedMemoryIdsPolicy,
    rollbackPath: normalizedInput.rollbackPath,
    validationMode: normalizedInput.validationMode,
    executionApprovalStatement: normalizedInput.executionApprovalStatement,
    mutationFieldValues: normalizedInput.mutationFieldValues
  };
}

function buildConsistencyFindings(normalizedInput) {
  const findings = [];
  const fieldValues = normalizedInput.mutationFieldValues;

  if (fieldValues.targetMemoryId && normalizedInput.targetMemoryIds[0] &&
      fieldValues.targetMemoryId !== normalizedInput.targetMemoryIds[0]) {
    findings.push('target_memory_id_mismatch');
  }

  if (fieldValues.oldMemoryId && !normalizedInput.targetMemoryIds.includes(fieldValues.oldMemoryId)) {
    findings.push('old_memory_id_not_in_target_memory_ids');
  }

  if (fieldValues.newMemoryId && !normalizedInput.targetMemoryIds.includes(fieldValues.newMemoryId)) {
    findings.push('new_memory_id_not_in_target_memory_ids');
  }

  if (fieldValues.actorClientId && normalizedInput.actorClientId &&
      fieldValues.actorClientId !== normalizedInput.actorClientId) {
    findings.push('actor_client_id_mismatch');
  }

  if (fieldValues.requestSource && normalizedInput.requestSource &&
      fieldValues.requestSource !== normalizedInput.requestSource) {
    findings.push('request_source_mismatch');
  }

  if (fieldValues.reason && normalizedInput.reason &&
      fieldValues.reason !== normalizedInput.reason) {
    findings.push('reason_mismatch');
  }

  if (fieldValues.evidenceSummary && normalizedInput.evidenceSummary &&
      fieldValues.evidenceSummary !== normalizedInput.evidenceSummary) {
    findings.push('evidence_summary_mismatch');
  }

  if (fieldValues.auditIntentPolicy && normalizedInput.auditIntentPolicy &&
      fieldValues.auditIntentPolicy !== normalizedInput.auditIntentPolicy) {
    findings.push('audit_intent_policy_mismatch');
  }

  if (fieldValues.auditCommitPolicy && normalizedInput.auditCommitPolicy &&
      fieldValues.auditCommitPolicy !== normalizedInput.auditCommitPolicy) {
    findings.push('audit_commit_policy_mismatch');
  }

  if (fieldValues.projectionPolicy && normalizedInput.projectionPolicy &&
      fieldValues.projectionPolicy !== normalizedInput.projectionPolicy) {
    findings.push('projection_policy_mismatch');
  }

  if (fieldValues.revisionEmitter && normalizedInput.revisionEmitter &&
      fieldValues.revisionEmitter !== normalizedInput.revisionEmitter) {
    findings.push('revision_emitter_mismatch');
  }

  if (fieldValues.fromStatus && normalizedInput.lifecycleTransition.from &&
      fieldValues.fromStatus !== normalizedInput.lifecycleTransition.from) {
    findings.push('lifecycle_from_mismatch');
  }

  if (fieldValues.toStatus && normalizedInput.lifecycleTransition.to &&
      fieldValues.toStatus !== normalizedInput.lifecycleTransition.to) {
    findings.push('lifecycle_to_mismatch');
  }

  return findings;
}

function summarizeDurableGovernanceMutationDryRun(input = {}) {
  const normalizedInput = normalizeDurableGovernanceMutationDryRunInput(input);
  const contractSummary = summarizeDurableGovernanceMutationPacketContract(normalizedInput.contract);
  const normalizedContract = normalizeDurableGovernanceMutationPacketContract(normalizedInput.contract);
  const mutationPacket = findMutationPacket(normalizedContract, normalizedInput.mutationFamily);
  const topLevelValues = buildTopLevelFieldValues(normalizedInput);
  const missingTopLevelFields = findMissingRequiredFields(REQUIRED_DRY_RUN_INPUT_FIELDS, topLevelValues);
  const missingContractPacketFields = findMissingRequiredFields(
    contractSummary.requiredPacketFields.ids || [],
    topLevelValues
  );
  const missingMutationFields = mutationPacket
    ? findMissingRequiredFields(mutationPacket.requiredFields, normalizedInput.mutationFieldValues)
    : [];
  const exactTargetCardinality = mutationPacket
    ? validateTargetCardinality(mutationPacket.targetCardinality, normalizedInput.targetMemoryIds)
    : false;
  const changedMemoryIds = deriveChangedMemoryIds(normalizedInput);
  const consistencyFindings = buildConsistencyFindings(normalizedInput);
  const blockingFindings = [];

  if (contractSummary.acceptedForPlanning !== true) {
    blockingFindings.push('contract_not_accepted_for_planning');
  }
  if (!mutationPacket) {
    blockingFindings.push('unsupported_mutation_family');
  }
  if (missingTopLevelFields.length > 0) {
    blockingFindings.push('missing_dry_run_input_fields');
  }
  if (missingContractPacketFields.length > 0) {
    blockingFindings.push('missing_contract_packet_fields');
  }
  if (missingMutationFields.length > 0) {
    blockingFindings.push('missing_mutation_fields');
  }
  if (mutationPacket && exactTargetCardinality !== true) {
    blockingFindings.push('target_cardinality_mismatch');
  }
  if (normalizedInput.validationMode !== EXPECTED_VALIDATION_MODE) {
    blockingFindings.push('validation_mode_not_internal_dry_run_only');
  }
  if (normalizedInput.changedMemoryIdsPolicy === 'explicit_changed_memory_ids' &&
      changedMemoryIds.length === 0) {
    blockingFindings.push('explicit_changed_memory_ids_missing');
  }
  if (!normalizedInput.lifecycleTransition.from || !normalizedInput.lifecycleTransition.to) {
    blockingFindings.push('lifecycle_transition_incomplete');
  }
  if (Object.keys(normalizedInput.scopeTuple).length === 0) {
    blockingFindings.push('scope_tuple_missing');
  }
  blockingFindings.push(...consistencyFindings);

  const acceptedForDryRunPreview = blockingFindings.length === 0;

  return {
    sourceMode: 'explicit_input',
    schemaVersion: contractSummary.schemaVersion,
    version: contractSummary.version,
    phase: contractSummary.phase,
    phaseId: normalizedInput.phaseId,
    acceptedForDryRunPreview,
    previewMode: EXPECTED_VALIDATION_MODE,
    decision: contractSummary.decision || 'NOT_READY_BLOCKED',
    approvalStatus: contractSummary.approvalStatus || 'BLOCKED_PENDING_APPROVAL',
    mutationFamily: normalizedInput.mutationFamily,
    executionApproved: false,
    runtimeIntegrated: false,
    publicMcpExpanded: false,
    mutated: false,
    durableAuditWritten: false,
    durableProjectionApplied: false,
    realMemoryScanned: false,
    contract: {
      acceptedForPlanning: contractSummary.acceptedForPlanning === true,
      blockedDecision: contractSummary.decision || 'NOT_READY_BLOCKED',
      approvalStatus: contractSummary.approvalStatus || 'BLOCKED_PENDING_APPROVAL'
    },
    packetFields: {
      requiredPresent: missingTopLevelFields.length === 0 && missingContractPacketFields.length === 0,
      missingDryRunFields: missingTopLevelFields,
      missingContractPacketFields
    },
    mutationFields: {
      requiredPresent: missingMutationFields.length === 0,
      missingRequired: missingMutationFields,
      providedKeys: Object.keys(normalizedInput.mutationFieldValues)
    },
    targeting: {
      targetCardinality: mutationPacket ? mutationPacket.targetCardinality : '',
      exactCardinality: exactTargetCardinality,
      targetMemoryIds: normalizedInput.targetMemoryIds,
      changedMemoryIdsPolicy: normalizedInput.changedMemoryIdsPolicy,
      changedMemoryIds
    },
    scopeTuple: {
      provided: Object.keys(normalizedInput.scopeTuple).length > 0,
      presentKeys: Object.keys(normalizedInput.scopeTuple),
      values: normalizedInput.scopeTuple
    },
    lifecycleTransition: {
      provided: Boolean(normalizedInput.lifecycleTransition.from && normalizedInput.lifecycleTransition.to),
      from: normalizedInput.lifecycleTransition.from,
      to: normalizedInput.lifecycleTransition.to
    },
    auditPreview: {
      intentPolicy: normalizedInput.auditIntentPolicy,
      commitPolicy: normalizedInput.auditCommitPolicy,
      appendOnlyRequired: mutationPacket ? mutationPacket.appendOnlyAuditRequired === true : false,
      durableAuditWritten: false
    },
    projectionPreview: {
      policy: normalizedInput.projectionPolicy,
      shadowProjectionRequired: mutationPacket ? mutationPacket.shadowProjectionRequired === true : false,
      durableProjectionApplied: false
    },
    revisionPreview: {
      revisionEmitter: normalizedInput.revisionEmitter,
      changedMemoryIdsPolicy: normalizedInput.changedMemoryIdsPolicy,
      revisionEmissionRequired: mutationPacket ? mutationPacket.revisionEmissionRequired === true : false,
      changedMemoryIdsRequired: mutationPacket ? mutationPacket.changedMemoryIdsRequired === true : false,
      changedMemoryIds
    },
    validationPreview: {
      mode: normalizedInput.validationMode,
      dryRunOnly: normalizedInput.validationMode === EXPECTED_VALIDATION_MODE,
      executionApplyBlocked: true
    },
    rollbackPreview: {
      path: normalizedInput.rollbackPath,
      provided: Boolean(normalizedInput.rollbackPath)
    },
    requiredApprovals: {
      ids: contractSummary.requiredApprovals.ids || [],
      requiredPresent: contractSummary.requiredApprovals.requiredPresent === true
    },
    blockers: {
      ids: contractSummary.blockers.ids || [],
      requiredPresent: contractSummary.blockers.requiredPresent === true,
      blockingFindings
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawSecretExposed: false,
      rawWorkspaceIdExposed: false
    },
    nextStep: acceptedForDryRunPreview
      ? 'Keep this helper in internal dry-run mode only; runtime durable governance mutation remains blocked pending explicit approval and future runtime wiring.'
      : 'Repair the explicit input packet and keep runtime durable governance mutation blocked pending explicit approval.'
  };
}

module.exports = {
  EXPECTED_VALIDATION_MODE,
  REQUIRED_DRY_RUN_INPUT_FIELDS,
  normalizeDurableGovernanceMutationDryRunInput,
  summarizeDurableGovernanceMutationDryRun
};
