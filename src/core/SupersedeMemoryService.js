const crypto = require('node:crypto');

const {
  UPDATED_AT_ALIASES,
  firstNonEmptyAliasString,
  normalizeAuditSnapshotRef,
  normalizeLifecycleStatus,
  normalizeMemoryId
} = require('./FieldAliasNormalizer');
const { formatSecretRejectionReason, scanMemoryWritePayload } = require('./SecretScanner');
const { ToolArgumentValidationError, validateArgumentsAgainstSchema } = require('./ToolArgumentValidator');

const SUPERSEDE_MEMORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'old_memory_id',
    'new_memory_id',
    'reason',
    'evidence',
    'supersedes_link',
    'superseded_by_link',
    'actor_client_id',
    'request_source'
  ],
  properties: {
    old_memory_id: { type: 'string' },
    new_memory_id: { type: 'string' },
    reason: { type: 'string' },
    evidence: { type: 'string' },
    supersedes_link: { type: 'string' },
    superseded_by_link: { type: 'string' },
    actor_client_id: { type: 'string' },
    request_source: { type: 'string' },
    dry_run: { type: 'boolean' },
    confirm: { type: 'boolean' }
  }
};

const ALLOWED_OLD_TRANSITIONS = Object.freeze([
  { from: 'active', to: 'superseded' },
  { from: 'stale', to: 'superseded' }
]);

const ALLOWED_NEW_TRANSITIONS = Object.freeze([
  { from: 'proposal', to: 'active' },
  { from: 'stale', to: 'active' },
  { from: 'active', to: 'active' }
]);

const PAIR_SCOPE_FIELDS = Object.freeze([
  'projectId',
  'workspaceId',
  'clientId',
  'taskId',
  'conversationId',
  'visibility',
  'retentionPolicy'
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase();
}

function normalizePolicyStatus(policy = {}) {
  return normalizeLifecycleStatus(policy);
}

function normalizeScopeTuple(record = {}) {
  return {
    projectId: firstNonEmptyAliasString(record, ['projectId', 'project_id']),
    workspaceId: firstNonEmptyAliasString(record, ['workspaceId', 'workspace_id']),
    clientId: firstNonEmptyAliasString(record, ['clientId', 'client_id']),
    taskId: firstNonEmptyAliasString(record, ['taskId', 'task_id']),
    conversationId: firstNonEmptyAliasString(record, ['conversationId', 'conversation_id']),
    visibility: firstNonEmptyAliasString(record, ['visibility', 'visibility_policy']),
    retentionPolicy: firstNonEmptyAliasString(record, ['retentionPolicy', 'retention_policy'])
  };
}

function createEventId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function isAllowedTransition(transitions, fromStatus, toStatus) {
  return transitions.some(transition => transition.from === fromStatus && transition.to === toStatus);
}

function createPreviousSnapshotRef(record, fromStatus) {
  return normalizeAuditSnapshotRef({ ...record, status: fromStatus });
}

function normalizePairRecord(record = {}) {
  if (!record || typeof record !== 'object') {
    return record;
  }
  const memoryId = normalizeMemoryId(record);
  return {
    ...record,
    memoryId,
    updatedAt: firstNonEmptyAliasString(record, UPDATED_AT_ALIASES)
  };
}

function buildPairScopeMismatch(oldRecord, newRecord) {
  const oldScope = normalizeScopeTuple(oldRecord);
  const newScope = normalizeScopeTuple(newRecord);
  const mismatches = [];

  for (const fieldName of PAIR_SCOPE_FIELDS) {
    if (oldScope[fieldName] !== newScope[fieldName]) {
      mismatches.push(fieldName);
    }
  }

  return {
    exactMatch: mismatches.length === 0,
    mismatches,
    oldScope,
    newScope
  };
}

function createBaseAuditEvent({
  payload,
  oldRecord,
  newRecord,
  oldFromStatus,
  newFromStatus,
  pairCorrelationId,
  createdAt
}) {
  return {
    pair_correlation_id: pairCorrelationId,
    event_type: 'memory_supersede',
    tool_name: 'supersede_memory',
    memory_id: oldRecord.memoryId,
    replacement_memory_id: newRecord.memoryId,
    supersedes_memory_id: payload.supersedes_link,
    superseded_by_memory_id: payload.superseded_by_link,
    actor_client_id: normalizeString(payload.actor_client_id),
    request_source: normalizeString(payload.request_source),
    old_from_status: oldFromStatus,
    old_to_status: 'superseded',
    new_from_status: newFromStatus,
    new_to_status: 'active',
    from_status: oldFromStatus,
    to_status: 'superseded',
    reason: normalizeString(payload.reason),
    evidence: normalizeString(payload.evidence),
    created_at: createdAt,
    reversible: true,
    old_previous_snapshot_ref: createPreviousSnapshotRef(oldRecord, oldFromStatus),
    new_previous_snapshot_ref: createPreviousSnapshotRef(newRecord, newFromStatus),
    redaction_applied: true,
    lifecycle_policy_applied: true,
    scope_policy_applied: true
  };
}

class SupersedeMemoryService {
  constructor({
    config,
    shadowStore,
    auditLogStore,
    projectionCleanupService = null,
    projectionCleanupAppendAudit = false
  }) {
    this.config = config;
    this.shadowStore = shadowStore;
    this.auditLogStore = auditLogStore;
    this.projectionCleanupService = projectionCleanupService;
    this.projectionCleanupAppendAudit = projectionCleanupAppendAudit === true;
  }

  buildRejectedResult({
    reason,
    payload = {},
    oldMemoryId = null,
    newMemoryId = null,
    oldFromStatus = null,
    newFromStatus = null,
    dryRun = true,
    pairCorrelationId = null,
    auditEventIntent = null,
    auditCancelEvent = null,
    auditIntentStatus = 'not_appended',
    auditCancelStatus = 'not_applicable',
    auditCommitStatus = 'not_applicable'
  }) {
    return {
      success: false,
      decision: 'rejected',
      toolCandidate: 'supersede_memory',
      dryRun,
      mutated: false,
      oldMemoryId: oldMemoryId || normalizeString(payload.old_memory_id) || null,
      newMemoryId: newMemoryId || normalizeString(payload.new_memory_id) || null,
      oldFromStatus,
      oldToStatus: 'superseded',
      newFromStatus,
      newToStatus: 'active',
      pairCorrelationId,
      reason,
      auditEvent: null,
      auditEventIntent,
      auditCancelEvent,
      auditIntentStatus,
      auditCancelStatus,
      auditCommitStatus,
      policy: {
        lifecycle_policy_applied: true,
        scope_policy_applied: true,
        redaction_applied: true
      }
    };
  }

  buildAuditPlan({ payload, oldRecord, newRecord, oldFromStatus, newFromStatus, createdAt }) {
    const pairCorrelationId = createEventId();
    const baseEvent = createBaseAuditEvent({
      payload,
      oldRecord,
      newRecord,
      oldFromStatus,
      newFromStatus,
      pairCorrelationId,
      createdAt
    });

    return {
      pairCorrelationId,
      pendingEvent: {
        ...baseEvent,
        event_id: createEventId(),
        audit_phase: 'pending',
        mutation_applied: false
      },
      committedEvent: {
        ...baseEvent,
        event_id: createEventId(),
        correlation_id: pairCorrelationId,
        audit_phase: 'committed',
        mutation_applied: true,
        committed_at: createdAt
      },
      cancelledEvent: {
        ...baseEvent,
        event_id: createEventId(),
        correlation_id: pairCorrelationId,
        audit_phase: 'cancelled',
        mutation_applied: false,
        cancel_reason: 'pair lifecycle state or policy guard changed before supersede_memory could apply.',
        cancelled_at: createdAt
      }
    };
  }

  async appendMutationAudit({ auditEvent, timestamp, decision, record, reason, requestSource }) {
    await this.auditLogStore.appendWriteAudit({
      timestamp,
      decision,
      target: record.target || null,
      title: record.title || null,
      memoryId: record.memoryId,
      reason,
      requestSource: requestSource || this.config.defaultRequestSource,
      mutationAuditEvent: auditEvent
    });
  }

  async applyProjectionCleanup({ record, lifecycleFamily, targetStatus, requestSource, timestamp }) {
    if (!this.projectionCleanupService?.applySuppression) {
      return {
        status: 'not_configured',
        report: null
      };
    }

    try {
      const report = await this.projectionCleanupService.applySuppression({
        memoryId: record.memoryId,
        target: record.target || 'process',
        lifecycleFamily,
        targetStatus,
        requestSource,
        timestamp,
        appendProjectionAudit: this.projectionCleanupAppendAudit
      });
      return {
        status: report.accepted ? 'accepted' : 'blocked',
        report
      };
    } catch {
      return {
        status: 'failed_after_mutation',
        report: null
      };
    }
  }

  async getPairRecords(oldMemoryId, newMemoryId) {
    const records = await this.shadowStore.getRecordsByIds([oldMemoryId, newMemoryId]);
    const recordMap = new Map(
      records
        .map(normalizePairRecord)
        .filter(record => record?.memoryId)
        .map(record => [record.memoryId, record])
    );
    return {
      oldRecord: recordMap.get(oldMemoryId) || null,
      newRecord: recordMap.get(newMemoryId) || null
    };
  }

  async supersede(payload = {}) {
    const dryRun = payload.dry_run !== false;
    let normalizedPayload = payload;

    try {
      validateArgumentsAgainstSchema(SUPERSEDE_MEMORY_SCHEMA, payload);
    } catch (error) {
      if (error instanceof ToolArgumentValidationError) {
        return this.buildRejectedResult({
          reason: error.message,
          payload,
          dryRun
        });
      }
      throw error;
    }

    normalizedPayload = {
      ...payload,
      old_memory_id: normalizeString(payload.old_memory_id),
      new_memory_id: normalizeString(payload.new_memory_id),
      reason: normalizeString(payload.reason),
      evidence: normalizeString(payload.evidence),
      supersedes_link: normalizeString(payload.supersedes_link),
      superseded_by_link: normalizeString(payload.superseded_by_link),
      actor_client_id: normalizeString(payload.actor_client_id),
      request_source: normalizeString(payload.request_source)
    };

    if (
      !normalizedPayload.old_memory_id
      || !normalizedPayload.new_memory_id
      || !normalizedPayload.reason
      || !normalizedPayload.evidence
      || !normalizedPayload.supersedes_link
      || !normalizedPayload.superseded_by_link
    ) {
      return this.buildRejectedResult({
        reason: 'old_memory_id, new_memory_id, reason, evidence, supersedes_link, and superseded_by_link are required.',
        payload: normalizedPayload,
        dryRun
      });
    }

    if (!normalizedPayload.actor_client_id || !normalizedPayload.request_source) {
      return this.buildRejectedResult({
        reason: 'actor_client_id and request_source are required.',
        payload: normalizedPayload,
        dryRun
      });
    }

    if (normalizedPayload.old_memory_id === normalizedPayload.new_memory_id) {
      return this.buildRejectedResult({
        reason: 'supersede_memory requires two distinct memory ids.',
        payload: normalizedPayload,
        dryRun
      });
    }

    if (normalizedPayload.supersedes_link !== normalizedPayload.old_memory_id) {
      return this.buildRejectedResult({
        reason: 'supersedes_link must exactly match old_memory_id.',
        payload: normalizedPayload,
        oldMemoryId: normalizedPayload.old_memory_id,
        newMemoryId: normalizedPayload.new_memory_id,
        dryRun
      });
    }

    if (normalizedPayload.superseded_by_link !== normalizedPayload.new_memory_id) {
      return this.buildRejectedResult({
        reason: 'superseded_by_link must exactly match new_memory_id.',
        payload: normalizedPayload,
        oldMemoryId: normalizedPayload.old_memory_id,
        newMemoryId: normalizedPayload.new_memory_id,
        dryRun
      });
    }

    const secretScan = scanMemoryWritePayload({
      title: 'supersede_memory',
      content: normalizedPayload.reason,
      evidence: normalizedPayload.evidence,
      tags: []
    });
    if (!secretScan.ok) {
      return this.buildRejectedResult({
        reason: formatSecretRejectionReason(secretScan),
        payload: normalizedPayload,
        dryRun
      });
    }

    const { oldRecord, newRecord } = await this.getPairRecords(
      normalizedPayload.old_memory_id,
      normalizedPayload.new_memory_id
    );
    if (!oldRecord || !newRecord) {
      return this.buildRejectedResult({
        reason: 'both old and new memory records must exist.',
        payload: normalizedPayload,
        oldMemoryId: oldRecord?.memoryId || normalizedPayload.old_memory_id,
        newMemoryId: newRecord?.memoryId || normalizedPayload.new_memory_id,
        dryRun
      });
    }

    const [oldPolicy, newPolicy] = await Promise.all([
      this.shadowStore.getRecordValidationPolicy(oldRecord.memoryId),
      this.shadowStore.getRecordValidationPolicy(newRecord.memoryId)
    ]);

    if (oldPolicy.lifecycleColumnAvailable !== true || newPolicy.lifecycleColumnAvailable !== true) {
      return this.buildRejectedResult({
        reason: 'lifecycle status column is unavailable; supersede_memory requires existing lifecycle status support for both records.',
        payload: normalizedPayload,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        dryRun
      });
    }

    await this.shadowStore.ensureReady();
    this.shadowStore.refreshMemoryRecordColumnInfo();
    if (!this.shadowStore.hasMemoryRecordColumn('supersedes_memory_id') || !this.shadowStore.hasMemoryRecordColumn('superseded_by_memory_id')) {
      return this.buildRejectedResult({
        reason: 'supersede link columns are unavailable; supersede_memory requires bidirectional supersede link projection support.',
        payload: normalizedPayload,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        dryRun
      });
    }

    const oldFromStatus = normalizePolicyStatus(oldPolicy);
    const newFromStatus = normalizePolicyStatus(newPolicy);
    if (!isAllowedTransition(ALLOWED_OLD_TRANSITIONS, oldFromStatus, 'superseded')) {
      return this.buildRejectedResult({
        reason: `supersede_memory only allows old record active/stale -> superseded; current old status is ${oldFromStatus || 'unknown'}.`,
        payload: normalizedPayload,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        newFromStatus,
        dryRun
      });
    }
    if (!isAllowedTransition(ALLOWED_NEW_TRANSITIONS, newFromStatus, 'active')) {
      return this.buildRejectedResult({
        reason: `supersede_memory only allows new record proposal/stale/active -> active; current new status is ${newFromStatus || 'unknown'}.`,
        payload: normalizedPayload,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        newFromStatus,
        dryRun
      });
    }

    const actorClientId = normalizeStatus(normalizedPayload.actor_client_id);
    const crossClientPrivateViolation = [oldPolicy, newPolicy].some(policy => {
      const visibility = normalizeStatus(policy.visibility);
      const clientId = normalizeStatus(policy.clientId);
      return visibility === 'private' && clientId && clientId !== actorClientId;
    });
    if (crossClientPrivateViolation) {
      return this.buildRejectedResult({
        reason: 'cross-client private memory mutation is forbidden by default.',
        payload: normalizedPayload,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        newFromStatus,
        dryRun
      });
    }

    const scopeMatch = buildPairScopeMismatch(oldRecord, newRecord);
    if (!scopeMatch.exactMatch) {
      return this.buildRejectedResult({
        reason: `supersede_memory requires exact pair scope match; mismatched fields: ${scopeMatch.mismatches.join(', ')}.`,
        payload: normalizedPayload,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        newFromStatus,
        dryRun
      });
    }

    const createdAt = new Date().toISOString();
    const auditPlan = this.buildAuditPlan({
      payload: normalizedPayload,
      oldRecord,
      newRecord,
      oldFromStatus,
      newFromStatus,
      createdAt
    });

    if (dryRun) {
      return {
        success: true,
        decision: 'dry-run',
        toolCandidate: 'supersede_memory',
        dryRun: true,
        mutated: false,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        oldToStatus: 'superseded',
        newFromStatus,
        newToStatus: 'active',
        pairCorrelationId: auditPlan.pairCorrelationId,
        allowedTransition: true,
        runtimeApprovalRequired: false,
        auditPlanPreview: auditPlan,
        policy: {
          lifecycle_policy_applied: true,
          scope_policy_applied: true,
          redaction_applied: true
        },
        nextStep: 'Re-run with dry_run=false and confirm=true only inside an explicitly approved internal supersede mutation phase.'
      };
    }

    if (payload.confirm !== true) {
      return this.buildRejectedResult({
        reason: 'confirm=true is required when dry_run=false.',
        payload: normalizedPayload,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        newFromStatus,
        dryRun: false,
        pairCorrelationId: auditPlan.pairCorrelationId
      });
    }

    try {
      await this.appendMutationAudit({
        auditEvent: auditPlan.pendingEvent,
        timestamp: createdAt,
        decision: 'pending',
        record: oldRecord,
        reason: 'supersede_memory pending intent before pair lifecycle mutation.',
        requestSource: normalizedPayload.request_source
      });
    } catch {
      return this.buildRejectedResult({
        reason: 'write audit intent append failed; supersede_memory did not mutate.',
        payload: normalizedPayload,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        newFromStatus,
        dryRun: false,
        pairCorrelationId: auditPlan.pairCorrelationId,
        auditIntentStatus: 'failed_before_mutation'
      });
    }

    const updateResult = await this.shadowStore.applySupersedePair({
      oldMemoryId: oldRecord.memoryId,
      newMemoryId: newRecord.memoryId,
      oldFromStatus,
      oldToStatus: 'superseded',
      newFromStatus,
      newToStatus: 'active',
      updatedAt: createdAt,
      actorClientId: normalizedPayload.actor_client_id,
      reason: normalizedPayload.reason,
      expectedOldClientId: oldPolicy.clientId,
      expectedOldVisibility: oldPolicy.visibility,
      expectedNewClientId: newPolicy.clientId,
      expectedNewVisibility: newPolicy.visibility,
      supersedesLink: normalizedPayload.supersedes_link,
      supersededByLink: normalizedPayload.superseded_by_link
    });

    if (!updateResult.updated) {
      let auditCancelStatus = 'appended';
      try {
        await this.appendMutationAudit({
          auditEvent: auditPlan.cancelledEvent,
          timestamp: auditPlan.cancelledEvent.cancelled_at,
          decision: 'cancelled',
          record: oldRecord,
          reason: 'pair lifecycle state or policy guard changed before supersede_memory could apply.',
          requestSource: normalizedPayload.request_source
        });
      } catch {
        auditCancelStatus = 'failed_after_rejection';
      }

      return this.buildRejectedResult({
        reason: 'pair lifecycle state or policy guard changed before supersede_memory could apply.',
        payload: normalizedPayload,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        newFromStatus,
        dryRun: false,
        pairCorrelationId: auditPlan.pairCorrelationId,
        auditEventIntent: auditPlan.pendingEvent,
        auditCancelEvent: auditCancelStatus === 'appended' ? auditPlan.cancelledEvent : null,
        auditIntentStatus: 'appended',
        auditCancelStatus
      });
    }

    try {
      await this.appendMutationAudit({
        auditEvent: auditPlan.committedEvent,
        timestamp: auditPlan.committedEvent.committed_at,
        decision: 'superseded',
        record: oldRecord,
        reason: 'supersede_memory applied pair lifecycle mutation.',
        requestSource: normalizedPayload.request_source
      });
    } catch {
      return {
        success: true,
        decision: 'superseded-with-warning',
        toolCandidate: 'supersede_memory',
        dryRun: false,
        mutated: true,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        oldToStatus: 'superseded',
        newFromStatus,
        newToStatus: 'active',
        pairCorrelationId: auditPlan.pairCorrelationId,
        reason: 'committed audit append failed after pair lifecycle mutation; durable pending audit intent exists.',
        auditEvent: auditPlan.committedEvent,
        auditEventIntent: auditPlan.pendingEvent,
        auditIntentStatus: 'appended',
        auditCommitStatus: 'failed_after_mutation',
        policy: {
          lifecycle_policy_applied: true,
          scope_policy_applied: true,
          redaction_applied: true
        }
      };
    }

    const projectionCleanup = await this.applyProjectionCleanup({
      record: oldRecord,
      lifecycleFamily: 'supersede_memory',
      targetStatus: 'superseded',
      requestSource: normalizedPayload.request_source,
      timestamp: auditPlan.committedEvent.committed_at
    });
    if (projectionCleanup.status === 'blocked' || projectionCleanup.status === 'failed_after_mutation') {
      return {
        success: true,
        decision: 'superseded-with-warning',
        toolCandidate: 'supersede_memory',
        dryRun: false,
        mutated: true,
        oldMemoryId: oldRecord.memoryId,
        newMemoryId: newRecord.memoryId,
        oldFromStatus,
        oldToStatus: 'superseded',
        newFromStatus,
        newToStatus: 'active',
        pairCorrelationId: auditPlan.pairCorrelationId,
        reason: 'projection cleanup did not fully complete after pair lifecycle mutation.',
        auditEvent: auditPlan.committedEvent,
        auditEventIntent: auditPlan.pendingEvent,
        auditIntentStatus: 'appended',
        auditCommitStatus: 'appended',
        projectionCleanupStatus: projectionCleanup.status,
        projectionCleanupReport: projectionCleanup.report,
        policy: {
          lifecycle_policy_applied: true,
          scope_policy_applied: true,
          redaction_applied: true
        }
      };
    }

    return {
      success: true,
      decision: 'superseded',
      toolCandidate: 'supersede_memory',
      dryRun: false,
      mutated: true,
      oldMemoryId: oldRecord.memoryId,
      newMemoryId: newRecord.memoryId,
      oldFromStatus,
      oldToStatus: 'superseded',
      newFromStatus,
      newToStatus: 'active',
      pairCorrelationId: auditPlan.pairCorrelationId,
      auditEvent: auditPlan.committedEvent,
      auditEventIntent: auditPlan.pendingEvent,
      auditIntentStatus: 'appended',
      auditCommitStatus: 'appended',
      projectionCleanupStatus: projectionCleanup.status,
      projectionCleanupReport: projectionCleanup.report,
      policy: {
        lifecycle_policy_applied: true,
        scope_policy_applied: true,
        redaction_applied: true
      }
    };
  }
}

module.exports = {
  ALLOWED_NEW_TRANSITIONS,
  ALLOWED_OLD_TRANSITIONS,
  SUPERSEDE_MEMORY_SCHEMA,
  SupersedeMemoryService
};
