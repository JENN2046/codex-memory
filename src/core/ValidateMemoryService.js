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

function normalizeStatus(value) {
  return normalizeString(value).toLowerCase();
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

  buildRejectedResult({ reason, payload = {}, memoryId = null, fromStatus = null, dryRun = true }) {
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

    const fromStatus = normalizeStatus(policy.status);
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

    const updateResult = await this.shadowStore.updateLifecycleStatus({
      memoryId: record.memoryId,
      fromStatus,
      toStatus: 'active',
      updatedAt: createdAt,
      actorClientId: actorClientId || null,
      reason: normalizedPayload.reason
    });

    if (!updateResult.updated) {
      return this.buildRejectedResult({
        reason: 'lifecycle status changed before validate_memory could apply.',
        payload: normalizedPayload,
        memoryId: record.memoryId,
        fromStatus,
        dryRun: false
      });
    }

    await this.auditLogStore.appendWriteAudit({
      timestamp: createdAt,
      decision: 'validated',
      target: record.target || null,
      title: record.title || null,
      memoryId: record.memoryId,
      reason: 'validate_memory promoted memory to active.',
      requestSource: normalizedPayload.request_source || this.config.defaultRequestSource,
      mutationAuditEvent: auditEvent
    });

    return {
      success: true,
      decision: 'validated',
      toolCandidate: 'validate_memory',
      dryRun: false,
      mutated: true,
      memoryId: record.memoryId,
      fromStatus,
      toStatus: 'active',
      auditEvent,
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
