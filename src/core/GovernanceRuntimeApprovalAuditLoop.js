'use strict';

const {
  PUBLIC_MCP_TOOLS,
  REQUIRED_LOOP_STAGE_IDS
} = require('./GovernanceLoopBoundaryContract');

const TASK_ID = 'CM-1087_GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP';
const RESULT_STATUS_ACCEPTED =
  'GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_ACCEPTED_NOT_EXECUTED_NOT_READY';
const RESULT_STATUS_BLOCKED =
  'GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_BLOCKED_NOT_READY';
const REQUIRED_MODE = 'governance_runtime_approval_audit_loop_review_only';
const REQUIRED_SOURCE = 'temp_local_governance_loop_fixture';

const ACCEPTED_ACTION_IDS = Object.freeze([
  'proof_memory_tombstone_apply',
  'reconcile_retry_backoff_persistence_apply',
  'startup_reconcile_worker_enablement',
  'cleanup_rollback_apply'
]);

const REQUIRED_IDENTITY_FIELDS = Object.freeze([
  'loopId',
  'actionId',
  'reviewPacketId',
  'approvalPacketId',
  'preActionAuditEventId',
  'decisionAuditEventId',
  'postActionAuditEventId',
  'correlationId'
]);

const REQUIRED_SCOPE_FIELDS = Object.freeze([
  'projectRef',
  'workspaceRef',
  'clientRef',
  'agentRef',
  'taskRef',
  'visibility'
]);

const REQUIRED_COUNTER_KEYS = Object.freeze([
  'providerCalls',
  'apiCalls',
  'trueRecordMemoryCalls',
  'trueSearchMemoryCalls',
  'realMemoryReads',
  'rawJsonlReads',
  'rawAuditReads',
  'durableMemoryWrites',
  'durableAuditWrites',
  'governedActionExecutions',
  'cleanupApplyRuns',
  'rollbackApplyRuns',
  'publicMcpExpansions',
  'configWatchdogStartupChanges',
  'dependencyActions',
  'readinessClaims',
  'reliabilityClaims'
]);

const FORBIDDEN_FRAGMENTS = Object.freeze([
  'authorization:',
  'bearer ',
  'set-cookie',
  'api_key',
  'providerapikey',
  'token=',
  'password',
  'sk_live_',
  'sk-proj-',
  '.env'
]);

const SCOPE_FIELD_ALIASES = Object.freeze({
  projectRef: ['projectRef', 'project_ref', 'projectId', 'project_id'],
  workspaceRef: ['workspaceRef', 'workspace_ref', 'workspaceId', 'workspace_id'],
  clientRef: ['clientRef', 'client_ref', 'clientId', 'client_id'],
  agentRef: ['agentRef', 'agent_ref', 'agentId', 'agent_id'],
  taskRef: ['taskRef', 'task_ref', 'taskId', 'task_id'],
  visibility: ['visibility', 'visibility_policy']
});

const IDENTITY_FIELD_ALIASES = Object.freeze({
  loopId: ['loopId', 'loop_id'],
  actionId: ['actionId', 'action_id'],
  reviewPacketId: ['reviewPacketId', 'review_packet_id'],
  approvalPacketId: ['approvalPacketId', 'approval_packet_id'],
  preActionAuditEventId: ['preActionAuditEventId', 'pre_action_audit_event_id'],
  decisionAuditEventId: ['decisionAuditEventId', 'decision_audit_event_id'],
  postActionAuditEventId: ['postActionAuditEventId', 'post_action_audit_event_id'],
  correlationId: ['correlationId', 'correlation_id']
});

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstNormalizedString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function firstAliasString(source, aliases) {
  return firstNormalizedString(...aliases.map(alias => source[alias]));
}

function normalizeBoolean(value) {
  return value === true ? true : value === false ? false : null;
}

function normalizeNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function normalizeScope(scope = {}) {
  const safeScope = isPlainObject(scope) ? scope : {};
  const normalized = {};

  for (const field of REQUIRED_SCOPE_FIELDS) {
    normalized[field] = firstAliasString(safeScope, SCOPE_FIELD_ALIASES[field] || [field]);
  }

  return normalized;
}

function normalizeIdentity(identity = {}) {
  const safeIdentity = isPlainObject(identity) ? identity : {};
  const normalized = {};

  for (const field of REQUIRED_IDENTITY_FIELDS) {
    normalized[field] = firstAliasString(safeIdentity, IDENTITY_FIELD_ALIASES[field] || [field]);
  }

  return normalized;
}

function normalizeCounterMap(counters = {}) {
  const safeCounters = isPlainObject(counters) ? counters : {};
  const normalized = {};

  for (const key of REQUIRED_COUNTER_KEYS) {
    normalized[key] = safeCounters[key];
  }

  return normalized;
}

function normalizeBooleanMap(value = {}, keys = []) {
  const safeValue = isPlainObject(value) ? value : {};
  return Object.fromEntries(keys.map(key => [key, normalizeBoolean(safeValue[key])]));
}

function containsForbiddenFragment(value) {
  const encoded = JSON.stringify(value || {}).toLowerCase();
  return FORBIDDEN_FRAGMENTS.some(fragment => encoded.includes(fragment));
}

function allRequiredStringsPresent(value, fields) {
  return fields.every(field => Boolean(normalizeString(value[field])));
}

function scopeMatches(left = {}, right = {}) {
  return REQUIRED_SCOPE_FIELDS.every(field =>
    normalizeString(left[field]) === normalizeString(right[field])
  );
}

function identityMatches(identity = {}, packet = {}) {
  return REQUIRED_IDENTITY_FIELDS.every(field => {
    if (!Object.prototype.hasOwnProperty.call(packet, field)) return true;
    return normalizeString(packet[field]) === identity[field];
  });
}

function collectCounterBlockers(counters = {}) {
  const safeCounters = isPlainObject(counters) ? counters : {};
  const blockers = [];

  for (const key of REQUIRED_COUNTER_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(safeCounters, key)) {
      blockers.push(`counter_${key}_missing`);
      continue;
    }
    const normalized = normalizeNonNegativeInteger(safeCounters[key]);
    if (normalized === null) {
      blockers.push(`counter_${key}_malformed`);
    } else if (normalized !== 0) {
      blockers.push(`counter_${key}_must_be_zero`);
    }
  }

  for (const [key, value] of Object.entries(safeCounters)) {
    if (REQUIRED_COUNTER_KEYS.includes(key)) continue;
    const normalized = normalizeNonNegativeInteger(value);
    if (normalized === null) {
      blockers.push(`counter_${key}_unknown_malformed`);
    } else if (normalized !== 0) {
      blockers.push(`counter_${key}_unknown_nonzero`);
    }
  }

  return blockers;
}

function normalizeReviewPacket(packet = {}) {
  const safePacket = isPlainObject(packet) ? packet : {};
  return {
    packetId: firstNormalizedString(safePacket.packetId, safePacket.packet_id),
    loopId: firstAliasString(safePacket, IDENTITY_FIELD_ALIASES.loopId),
    actionId: firstAliasString(safePacket, IDENTITY_FIELD_ALIASES.actionId),
    status: normalizeString(safePacket.status),
    scope: normalizeScope(safePacket.scope),
    reviewed: normalizeBoolean(safePacket.reviewed),
    recommendsApprovalPacket: normalizeBoolean(safePacket.recommendsApprovalPacket ?? safePacket.recommends_approval_packet),
    executionApproved: normalizeBoolean(safePacket.executionApproved ?? safePacket.execution_approved),
    rawPayloadIncluded: normalizeBoolean(safePacket.rawPayloadIncluded ?? safePacket.raw_payload_included)
  };
}

function normalizeApprovalPacket(packet = {}) {
  const safePacket = isPlainObject(packet) ? packet : {};
  return {
    packetId: firstNormalizedString(safePacket.packetId, safePacket.packet_id),
    loopId: firstAliasString(safePacket, IDENTITY_FIELD_ALIASES.loopId),
    actionId: firstAliasString(safePacket, IDENTITY_FIELD_ALIASES.actionId),
    reviewPacketId: firstAliasString(safePacket, IDENTITY_FIELD_ALIASES.reviewPacketId),
    status: normalizeString(safePacket.status),
    decision: normalizeString(safePacket.decision),
    scope: normalizeScope(safePacket.scope),
    exactActionNamed: normalizeBoolean(safePacket.exactActionNamed ?? safePacket.exact_action_named),
    exactScopeNamed: normalizeBoolean(safePacket.exactScopeNamed ?? safePacket.exact_scope_named),
    durableAuditIntentNamed: normalizeBoolean(safePacket.durableAuditIntentNamed ?? safePacket.durable_audit_intent_named),
    durableMemoryIntentNamed: normalizeBoolean(safePacket.durableMemoryIntentNamed ?? safePacket.durable_memory_intent_named),
    executionApproved: normalizeBoolean(safePacket.executionApproved ?? safePacket.execution_approved),
    expiresAt: firstNormalizedString(safePacket.expiresAt, safePacket.expires_at)
  };
}

function normalizeAuditRefs(auditRefs = {}) {
  const safeRefs = isPlainObject(auditRefs) ? auditRefs : {};
  return {
    preActionAuditEventId: firstAliasString(safeRefs, IDENTITY_FIELD_ALIASES.preActionAuditEventId),
    decisionAuditEventId: firstAliasString(safeRefs, IDENTITY_FIELD_ALIASES.decisionAuditEventId),
    postActionAuditEventId: firstAliasString(safeRefs, IDENTITY_FIELD_ALIASES.postActionAuditEventId),
    correlationId: firstAliasString(safeRefs, IDENTITY_FIELD_ALIASES.correlationId),
    appendOnly: normalizeBoolean(safeRefs.appendOnly ?? safeRefs.append_only),
    redactedSummaryOnly: normalizeBoolean(safeRefs.redactedSummaryOnly ?? safeRefs.redacted_summary_only),
    durableAuditWritten: normalizeBoolean(safeRefs.durableAuditWritten ?? safeRefs.durable_audit_written),
    rawAuditPayloadIncluded: normalizeBoolean(safeRefs.rawAuditPayloadIncluded ?? safeRefs.raw_audit_payload_included)
  };
}

function buildAuditPlan({ identity, actionId }) {
  return {
    appendOnly: true,
    redactedSummaryOnly: true,
    durableAuditWritten: false,
    entries: [
      {
        eventId: identity.preActionAuditEventId,
        eventFamily: 'governance_pre_action_review',
        actionId,
        writesDurableAudit: false
      },
      {
        eventId: identity.decisionAuditEventId,
        eventFamily: 'governance_approval_decision',
        actionId,
        writesDurableAudit: false
      },
      {
        eventId: identity.postActionAuditEventId,
        eventFamily: 'governance_post_action_evidence',
        actionId,
        writesDurableAudit: false
      }
    ]
  };
}

function evaluateGovernanceRuntimeApprovalAuditLoop(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const mode = normalizeString(safeInput.mode);
  const source = normalizeString(safeInput.source);
  const identity = normalizeIdentity(safeInput.identity);
  const scope = normalizeScope(safeInput.scope);
  const reviewPacket = normalizeReviewPacket(safeInput.reviewPacket);
  const approvalPacket = normalizeApprovalPacket(safeInput.approvalPacket);
  const auditRefs = normalizeAuditRefs(safeInput.auditRefs);
  const sideEffectCounters = normalizeCounterMap(safeInput.sideEffectCounters);
  const blockers = [];
  const requestedActions = normalizeBooleanMap(safeInput.requestedActions, [
    'executeGovernedAction',
    'writeDurableAudit',
    'writeDurableMemory',
    'readRealMemory',
    'readRawAudit',
    'callProvider',
    'expandPublicMcp',
    'changeConfigWatchdogStartup',
    'changeDependencies',
    'claimReadiness',
    'claimReliability'
  ]);

  if (mode !== REQUIRED_MODE) blockers.push('mode_must_be_governance_runtime_approval_audit_loop_review_only');
  if (source !== REQUIRED_SOURCE) blockers.push('source_must_be_temp_local_governance_loop_fixture');
  if (!allRequiredStringsPresent(identity, REQUIRED_IDENTITY_FIELDS)) {
    blockers.push('identity_fields_required');
  }
  if (!ACCEPTED_ACTION_IDS.includes(identity.actionId)) {
    blockers.push('action_id_not_supported_for_cm1087');
  }
  if (!allRequiredStringsPresent(scope, REQUIRED_SCOPE_FIELDS)) {
    blockers.push('scope_fields_required');
  }
  if (containsForbiddenFragment(safeInput)) blockers.push('sensitive_fragment_rejected');
  if (!identityMatches(identity, reviewPacket)) blockers.push('review_packet_identity_mismatch');
  if (!identityMatches(identity, approvalPacket)) blockers.push('approval_packet_identity_mismatch');
  if (reviewPacket.packetId !== identity.reviewPacketId) blockers.push('review_packet_id_mismatch');
  if (approvalPacket.packetId !== identity.approvalPacketId) blockers.push('approval_packet_id_mismatch');
  if (approvalPacket.reviewPacketId !== identity.reviewPacketId) {
    blockers.push('approval_packet_review_ref_mismatch');
  }
  if (!scopeMatches(scope, reviewPacket.scope)) blockers.push('review_packet_scope_mismatch');
  if (!scopeMatches(scope, approvalPacket.scope)) blockers.push('approval_packet_scope_mismatch');
  if (auditRefs.preActionAuditEventId !== identity.preActionAuditEventId ||
    auditRefs.decisionAuditEventId !== identity.decisionAuditEventId ||
    auditRefs.postActionAuditEventId !== identity.postActionAuditEventId ||
    auditRefs.correlationId !== identity.correlationId) {
    blockers.push('audit_refs_identity_mismatch');
  }
  if (reviewPacket.status !== 'reviewed_requires_approval') {
    blockers.push('review_packet_status_must_require_approval');
  }
  if (reviewPacket.reviewed !== true || reviewPacket.recommendsApprovalPacket !== true) {
    blockers.push('review_packet_must_be_reviewed_for_approval_packet');
  }
  if (reviewPacket.executionApproved !== false) {
    blockers.push('review_packet_must_not_approve_execution');
  }
  if (approvalPacket.status !== 'approval_packet_valid_review_only') {
    blockers.push('approval_packet_status_must_be_valid_review_only');
  }
  if (approvalPacket.decision !== 'approved_for_planning_not_execution') {
    blockers.push('approval_packet_decision_must_be_planning_only');
  }
  if (approvalPacket.exactActionNamed !== true ||
    approvalPacket.exactScopeNamed !== true ||
    approvalPacket.durableAuditIntentNamed !== true ||
    approvalPacket.durableMemoryIntentNamed !== true) {
    blockers.push('approval_packet_exact_fields_required');
  }
  if (approvalPacket.executionApproved !== false) {
    blockers.push('approval_packet_must_not_approve_execution');
  }
  if (auditRefs.appendOnly !== true || auditRefs.redactedSummaryOnly !== true) {
    blockers.push('audit_refs_must_be_append_only_redacted_summary');
  }
  if (auditRefs.durableAuditWritten !== false || auditRefs.rawAuditPayloadIncluded !== false) {
    blockers.push('audit_refs_must_not_write_or_expose_raw_audit');
  }
  if (Object.values(requestedActions).some(value => value === true)) {
    blockers.push('requested_action_not_authorized_in_cm1087');
  }
  blockers.push(...collectCounterBlockers(safeInput.sideEffectCounters));

  const accepted = blockers.length === 0;
  return {
    taskId: TASK_ID,
    status: accepted ? RESULT_STATUS_ACCEPTED : RESULT_STATUS_BLOCKED,
    accepted,
    runtimeApprovalAuditLoopAccepted: accepted,
    decision: accepted
      ? 'GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_ACCEPTED_STOP_BEFORE_EXECUTION_NOT_READY'
      : 'GOVERNANCE_RUNTIME_APPROVAL_AUDIT_LOOP_BLOCKED_NOT_READY',
    mode,
    source,
    publicMcpTools: [...PUBLIC_MCP_TOOLS],
    loopStages: REQUIRED_LOOP_STAGE_IDS.map(stageId => ({
      id: stageId,
      status: 'evaluated_not_executed',
      canExecute: false,
      durableWriteAllowed: false
    })),
    identity,
    scope,
    reviewPacket,
    approvalPacket,
    auditRefs,
    auditPlan: buildAuditPlan({ identity, actionId: identity.actionId }),
    executionGate: {
      gateId: TASK_ID,
      reviewPacketAccepted: accepted,
      approvalPacketAccepted: accepted,
      auditRefsAccepted: accepted,
      governedActionExecutionAuthorized: false,
      governedActionExecuted: false,
      durableAuditWriteAuthorized: false,
      durableAuditWritten: false,
      durableMemoryWriteAuthorized: false,
      durableMemoryWritten: false,
      separateApplyApprovalRequired: true,
      runtimeValidationRequiredBeforeApply: true,
      operatorReceiptRequiredBeforeApply: true,
      postActionEvidenceRequired: true,
      nextAllowedAction: accepted
        ? 'request_separate_governed_action_execution_approval'
        : 'fix_governance_loop_blockers'
    },
    sideEffectCounters,
    blockerReasons: [...new Set(blockers)],
    safety: {
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      readsRealMemory: false,
      readsRawAudit: false,
      readsJsonl: false,
      readsRuntimeStores: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      executesGovernedAction: false,
      appliesCleanup: false,
      appliesRollback: false,
      expandsPublicMcp: false,
      changesConfigWatchdogStartup: false,
      changesDependencies: false,
      pushes: false,
      tagsReleasesDeploys: false,
      readinessClaimed: false,
      reliabilityClaimed: false
    }
  };
}

module.exports = {
  ACCEPTED_ACTION_IDS,
  REQUIRED_COUNTER_KEYS,
  REQUIRED_MODE,
  REQUIRED_SOURCE,
  RESULT_STATUS_ACCEPTED,
  RESULT_STATUS_BLOCKED,
  TASK_ID,
  evaluateGovernanceRuntimeApprovalAuditLoop
};
