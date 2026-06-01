const crypto = require('node:crypto');

const { formatSecretRejectionReason, scanMemoryWritePayload } = require('./SecretScanner');
const { ToolArgumentValidationError, validateArgumentsAgainstSchema } = require('./ToolArgumentValidator');

const VALIDATE_MEMORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'memory_id',
    'reason',
    'evidence',
    'actor_client_id',
    'request_source'
  ],
  properties: {
    memory_id: { type: 'string' },
    reason: { type: 'string' },
    evidence: { type: 'string' },
    actor_client_id: { type: 'string' },
    request_source: { type: 'string' },
    dry_run: { type: 'boolean' },
    confirm: { type: 'boolean' }
  }
};

const ALLOWED_TRANSITIONS = [
  { from: 'proposal', to: 'active' },
  { from: 'stale', to: 'active' }
];

const FORBIDDEN_TRANSITIONS = [
  { from: 'rejected', to: 'active' },
  { from: 'tombstoned', to: 'active' },
  { from: 'superseded', to: 'active' }
];

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

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase();
}

function normalizePolicyStatus(policy = {}) {
  return normalizeStatus(firstNormalizedString(
    policy.status,
    policy.lifecycleStatus,
    policy.lifecycle_status
  ));
}

function createEventId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function isAllowedTransition(fromStatus, toStatus = 'active') {
  return ALLOWED_TRANSITIONS.some(transition => transition.from === fromStatus && transition.to === toStatus);
}

function createPreviousSnapshotRef(record, fromStatus) {
  return {
    memory_id: record.memoryId,
    status: fromStatus,
    updated_at: record.updatedAt || null
  };
}

class ValidateMemoryService {
  constructor({ config, shadowStore, auditLogStore }) {
    this.config = config;
    this.shadowStore = shadowStore;
    this.auditLogStore = auditLogStore;
  }

  buildRejectedResult({
    reason,
    payload = {},
    memoryId = null,
    fromStatus = null,
    dryRun = true,
    auditEventIntent = null,
    auditCancelEvent = null,
    auditIntentStatus = 'not_appended',
    auditCancelStatus = 'not_applicable',
    auditCommitStatus = 'not_applicable'
  }) {
    return {
      success: false,
      decision: 'rejected',
      toolCandidate: 'validate_memory',
      dryRun,
      mutated: false,
      memoryId: memoryId || normalizeString(payload.memory_id) || null,
      fromStatus,
      toStatus: 'active',
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

  buildAuditEvent({ payload, record, fromStatus, createdAt }) {
    return {
      event_id: createEventId(),
      memory_id: record.memoryId,
      event_type: 'memory_validate',
      tool_name: 'validate_memory',
      actor_client_id: normalizeString(payload.actor_client_id),
      request_source: normalizeString(payload.request_source) || this.config.defaultRequestSource,
      from_status: fromStatus,
      to_status: 'active',
      reason: normalizeString(payload.reason),
      evidence: normalizeString(payload.evidence),
      created_at: createdAt,
      reversible: true,
      previous_snapshot_ref: createPreviousSnapshotRef(record, fromStatus),
      redaction_applied: true,
      lifecycle_policy_applied: true,
      scope_policy_applied: true
    };
  }

  buildPendingAuditEvent(auditEvent) {
    return {
      ...auditEvent,
      audit_phase: 'pending',
      mutation_applied: false
    };
  }

  buildCommittedAuditEvent(auditEvent, committedAt) {
    return {
      event_id: auditEvent.event_id,
      correlation_id: auditEvent.event_id,
      event_type: auditEvent.event_type,
      audit_phase: 'committed',
      tool_name: auditEvent.tool_name,
      memory_id: auditEvent.memory_id,
      actor_client_id: auditEvent.actor_client_id,
      request_source: auditEvent.request_source,
      from_status: auditEvent.from_status,
      to_status: auditEvent.to_status,
      mutation_applied: true,
      committed_at: committedAt,
      redaction_applied: true,
      lifecycle_policy_applied: true,
      scope_policy_applied: true
    };
  }

  buildCancelledAuditEvent(auditEvent, cancelReason, cancelledAt) {
    return {
      event_id: auditEvent.event_id,
      correlation_id: auditEvent.event_id,
      event_type: auditEvent.event_type,
      audit_phase: 'cancelled',
      tool_name: auditEvent.tool_name,
      memory_id: auditEvent.memory_id,
      actor_client_id: auditEvent.actor_client_id,
      request_source: auditEvent.request_source,
      from_status: auditEvent.from_status,
      to_status: auditEvent.to_status,
      mutation_applied: false,
      cancel_reason: cancelReason,
      cancelled_at: cancelledAt,
      redaction_applied: true,
      lifecycle_policy_applied: true,
      scope_policy_applied: true
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

  async validate(payload = {}) {
    const dryRun = payload.dry_run !== false;
    let normalizedPayload = payload;

    try {
      validateArgumentsAgainstSchema(VALIDATE_MEMORY_SCHEMA, payload);
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
      memory_id: normalizeString(payload.memory_id),
      reason: normalizeString(payload.reason),
      evidence: normalizeString(payload.evidence),
      actor_client_id: normalizeString(payload.actor_client_id),
      request_source: normalizeString(payload.request_source)
    };

    if (!normalizedPayload.memory_id || !normalizedPayload.reason || !normalizedPayload.evidence) {
      return this.buildRejectedResult({
        reason: 'memory_id, reason, and evidence are required.',
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

    const secretScan = scanMemoryWritePayload({
      title: 'validate_memory',
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

    const record = await this.shadowStore.getRecord(normalizedPayload.memory_id);
    if (!record) {
      return this.buildRejectedResult({
        reason: 'memory not found.',
        payload: normalizedPayload,
        dryRun
      });
    }

    const policy = await this.shadowStore.getRecordValidationPolicy(normalizedPayload.memory_id);
    if (!policy.lifecycleColumnAvailable) {
      return this.buildRejectedResult({
        reason: 'lifecycle status column is unavailable; validate_memory requires an existing lifecycle status.',
        payload: normalizedPayload,
        memoryId: record.memoryId,
        dryRun
      });
    }

    const fromStatus = normalizePolicyStatus(policy);
    if (!isAllowedTransition(fromStatus, 'active')) {
      return this.buildRejectedResult({
        reason: `validate_memory only allows proposal/stale -> active; current status is ${fromStatus || 'unknown'}.`,
        payload: normalizedPayload,
        memoryId: record.memoryId,
        fromStatus,
        dryRun
      });
    }

    const recordVisibility = normalizeString(policy.visibility).toLowerCase();
    const recordClientId = normalizeString(policy.clientId).toLowerCase();
    const actorClientId = normalizeString(normalizedPayload.actor_client_id).toLowerCase();
    if (recordVisibility === 'private' && recordClientId && recordClientId !== actorClientId) {
      return this.buildRejectedResult({
        reason: 'cross-client private memory mutation is forbidden by default.',
        payload: normalizedPayload,
        memoryId: record.memoryId,
        fromStatus,
        dryRun
      });
    }

    const createdAt = new Date().toISOString();
    const auditEvent = this.buildAuditEvent({
      payload: normalizedPayload,
      record,
      fromStatus,
      createdAt
    });

    if (dryRun) {
      return {
        success: true,
        decision: 'dry-run',
        toolCandidate: 'validate_memory',
        dryRun: true,
        mutated: false,
        memoryId: record.memoryId,
        fromStatus,
        toStatus: 'active',
        allowedTransition: true,
        runtimeApprovalRequired: false,
        auditEventPreview: auditEvent,
        forbiddenTransitions: FORBIDDEN_TRANSITIONS,
        policy: {
          lifecycle_policy_applied: true,
          scope_policy_applied: true,
          redaction_applied: true
        },
        nextStep: 'Re-run with dry_run=false and confirm=true only inside an explicitly approved runtime mutation phase.'
      };
    }

    if (payload.confirm !== true) {
      return this.buildRejectedResult({
        reason: 'confirm=true is required when dry_run=false.',
        payload: normalizedPayload,
        memoryId: record.memoryId,
        fromStatus,
        dryRun: false
      });
    }

    const pendingAuditEvent = this.buildPendingAuditEvent(auditEvent);
    try {
      await this.appendMutationAudit({
        auditEvent: pendingAuditEvent,
        timestamp: createdAt,
        decision: 'pending',
        record,
        reason: 'validate_memory pending intent before lifecycle mutation.',
        requestSource: normalizedPayload.request_source
      });
    } catch {
      return this.buildRejectedResult({
        reason: 'write audit intent append failed; validate_memory did not mutate.',
        payload: normalizedPayload,
        memoryId: record.memoryId,
        fromStatus,
        dryRun: false,
        auditIntentStatus: 'failed_before_mutation'
      });
    }

    const updateResult = await this.shadowStore.updateLifecycleStatus({
      memoryId: record.memoryId,
      fromStatus,
      toStatus: 'active',
      updatedAt: createdAt,
      actorClientId: actorClientId || null,
      reason: normalizedPayload.reason,
      expectedClientId: policy.clientId,
      expectedVisibility: policy.visibility
    });

    if (!updateResult.updated) {
      const cancelReason = 'lifecycle status or policy guard changed before validate_memory could apply.';
      const cancelledAuditEvent = this.buildCancelledAuditEvent(auditEvent, cancelReason, new Date().toISOString());
      let auditCancelStatus = 'appended';
      try {
        await this.appendMutationAudit({
          auditEvent: cancelledAuditEvent,
          timestamp: cancelledAuditEvent.cancelled_at,
          decision: 'cancelled',
          record,
          reason: cancelReason,
          requestSource: normalizedPayload.request_source
        });
      } catch {
        auditCancelStatus = 'failed_after_pending';
      }

      return this.buildRejectedResult({
        reason: cancelReason,
        payload: normalizedPayload,
        memoryId: record.memoryId,
        fromStatus,
        dryRun: false,
        auditEventIntent: pendingAuditEvent,
        auditCancelEvent: auditCancelStatus === 'appended' ? cancelledAuditEvent : null,
        auditIntentStatus: 'appended',
        auditCancelStatus
      });
    }

    const committedAt = new Date().toISOString();
    const committedAuditEvent = this.buildCommittedAuditEvent(auditEvent, committedAt);
    try {
      await this.appendMutationAudit({
        auditEvent: committedAuditEvent,
        timestamp: committedAt,
        decision: 'validated',
        record,
        reason: 'validate_memory promoted memory to active.',
        requestSource: normalizedPayload.request_source
      });
    } catch {
      return {
        success: true,
        decision: 'validated-with-warning',
        toolCandidate: 'validate_memory',
        dryRun: false,
        mutated: true,
        memoryId: record.memoryId,
        fromStatus,
        toStatus: 'active',
        reason: 'committed audit append failed after lifecycle mutation; durable pending audit intent exists.',
        auditEvent: committedAuditEvent,
        auditEventIntent: pendingAuditEvent,
        auditIntentStatus: 'appended',
        auditCommitStatus: 'failed_after_mutation',
        policy: {
          lifecycle_policy_applied: true,
          scope_policy_applied: true,
          redaction_applied: true
        }
      };
    }

    return {
      success: true,
      decision: 'validated',
      toolCandidate: 'validate_memory',
      dryRun: false,
      mutated: true,
      memoryId: record.memoryId,
      fromStatus,
      toStatus: 'active',
      auditEvent: committedAuditEvent,
      auditEventIntent: pendingAuditEvent,
      auditIntentStatus: 'appended',
      auditCommitStatus: 'appended',
      policy: {
        lifecycle_policy_applied: true,
        scope_policy_applied: true,
        redaction_applied: true
      }
    };
  }
}

module.exports = {
  ALLOWED_TRANSITIONS,
  FORBIDDEN_TRANSITIONS,
  VALIDATE_MEMORY_SCHEMA,
  ValidateMemoryService
};
