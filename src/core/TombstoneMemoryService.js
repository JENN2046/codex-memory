const crypto = require('node:crypto');

const { formatSecretRejectionReason, scanMemoryWritePayload } = require('./SecretScanner');
const { ToolArgumentValidationError, validateArgumentsAgainstSchema } = require('./ToolArgumentValidator');

const TOMBSTONE_MEMORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'memory_id',
    'reason',
    'evidence',
    'tombstone_reason',
    'actor_client_id',
    'request_source'
  ],
  properties: {
    memory_id: { type: 'string' },
    reason: { type: 'string' },
    evidence: { type: 'string' },
    tombstone_reason: { type: 'string' },
    actor_client_id: { type: 'string' },
    request_source: { type: 'string' },
    dry_run: { type: 'boolean' },
    confirm: { type: 'boolean' }
  }
};

const ALLOWED_TRANSITIONS = [
  { from: 'active', to: 'tombstoned' },
  { from: 'stale', to: 'tombstoned' },
  { from: 'superseded', to: 'tombstoned' }
];

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase();
}

function createEventId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function isAllowedTransition(fromStatus, toStatus = 'tombstoned') {
  return ALLOWED_TRANSITIONS.some(transition => transition.from === fromStatus && transition.to === toStatus);
}

function createPreviousSnapshotRef(record, fromStatus) {
  return {
    memory_id: record.memoryId,
    status: fromStatus,
    updated_at: record.updatedAt || null
  };
}

class TombstoneMemoryService {
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
      toolCandidate: 'memory_tombstone',
      dryRun,
      mutated: false,
      memoryId: memoryId || normalizeString(payload.memory_id) || null,
      fromStatus,
      toStatus: 'tombstoned',
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
      event_type: 'memory_tombstone',
      tool_name: 'memory_tombstone',
      actor_client_id: normalizeString(payload.actor_client_id),
      request_source: normalizeString(payload.request_source) || this.config.defaultRequestSource,
      from_status: fromStatus,
      to_status: 'tombstoned',
      reason: normalizeString(payload.reason),
      evidence: normalizeString(payload.evidence),
      tombstone_reason: normalizeString(payload.tombstone_reason),
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
      tombstone_reason: auditEvent.tombstone_reason,
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
      tombstone_reason: auditEvent.tombstone_reason,
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

  async tombstone(payload = {}) {
    const dryRun = payload.dry_run !== false;
    let normalizedPayload = payload;

    try {
      validateArgumentsAgainstSchema(TOMBSTONE_MEMORY_SCHEMA, payload);
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
      tombstone_reason: normalizeString(payload.tombstone_reason),
      actor_client_id: normalizeString(payload.actor_client_id),
      request_source: normalizeString(payload.request_source)
    };

    if (!normalizedPayload.memory_id || !normalizedPayload.reason || !normalizedPayload.evidence || !normalizedPayload.tombstone_reason) {
      return this.buildRejectedResult({
        reason: 'memory_id, reason, evidence, and tombstone_reason are required.',
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
      title: 'memory_tombstone',
      content: `${normalizedPayload.reason}\n${normalizedPayload.tombstone_reason}`,
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
        reason: 'lifecycle status column is unavailable; memory_tombstone requires an existing lifecycle status.',
        payload: normalizedPayload,
        memoryId: record.memoryId,
        dryRun
      });
    }
    if (policy.tombstoneReasonColumnAvailable !== true) {
      return this.buildRejectedResult({
        reason: 'tombstone_reason column is unavailable; memory_tombstone requires tombstone_reason lifecycle projection support.',
        payload: normalizedPayload,
        memoryId: record.memoryId,
        dryRun
      });
    }

    const fromStatus = normalizeStatus(policy.status);
    if (!isAllowedTransition(fromStatus, 'tombstoned')) {
      return this.buildRejectedResult({
        reason: `memory_tombstone only allows active/stale/superseded -> tombstoned; current status is ${fromStatus || 'unknown'}.`,
        payload: normalizedPayload,
        memoryId: record.memoryId,
        fromStatus,
        dryRun
      });
    }

    const recordClientId = normalizeString(policy.clientId).toLowerCase();
    const recordVisibility = normalizeStatus(policy.visibility);
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
        toolCandidate: 'memory_tombstone',
        dryRun: true,
        mutated: false,
        memoryId: record.memoryId,
        fromStatus,
        toStatus: 'tombstoned',
        allowedTransition: true,
        runtimeApprovalRequired: false,
        auditEventPreview: auditEvent,
        auditIntentStatus: 'not_appended',
        auditCommitStatus: 'not_applicable',
        policy: {
          lifecycle_policy_applied: true,
          scope_policy_applied: true,
          redaction_applied: true
        },
        nextStep: 'Re-run with dry_run=false and confirm=true only inside an explicitly approved internal tombstone mutation phase.'
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
        reason: 'memory_tombstone pending intent before lifecycle mutation.',
        requestSource: normalizedPayload.request_source
      });
    } catch {
      return this.buildRejectedResult({
        reason: 'write audit intent append failed; memory_tombstone did not mutate.',
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
      toStatus: 'tombstoned',
      updatedAt: createdAt,
      actorClientId: normalizedPayload.actor_client_id,
      reason: normalizedPayload.reason,
      tombstoneReason: normalizedPayload.tombstone_reason,
      expectedClientId: policy.clientId,
      expectedVisibility: policy.visibility
    });

    if (!updateResult.updated) {
      const cancelReason = 'lifecycle status or policy guard changed before memory_tombstone could apply.';
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
        auditCancelStatus = 'failed_after_rejection';
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
        decision: 'tombstoned',
        record,
        reason: 'memory_tombstone applied lifecycle tombstone.',
        requestSource: normalizedPayload.request_source
      });
    } catch {
      return {
        success: true,
        decision: 'tombstoned-with-warning',
        toolCandidate: 'memory_tombstone',
        dryRun: false,
        mutated: true,
        memoryId: record.memoryId,
        fromStatus,
        toStatus: 'tombstoned',
        reason: 'committed audit append failed after lifecycle mutation; durable pending audit intent exists.',
        tombstoneReason: normalizedPayload.tombstone_reason,
        auditEvent: committedAuditEvent,
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
      decision: 'tombstoned',
      toolCandidate: 'memory_tombstone',
      dryRun: false,
      mutated: true,
      memoryId: record.memoryId,
      fromStatus,
      toStatus: 'tombstoned',
      tombstoneReason: normalizedPayload.tombstone_reason,
      auditEvent: committedAuditEvent,
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
  TOMBSTONE_MEMORY_SCHEMA,
  TombstoneMemoryService
};
