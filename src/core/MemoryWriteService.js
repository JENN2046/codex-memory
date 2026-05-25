const crypto = require('node:crypto');

const { VisibilityPolicy, Namespace, createShadowWriteStatus } = require('./types');
const {
  computeCanonicalWriteHash,
  summarizeMemoryWriteLifecycleDedupSuppressionPreflight
} = require('./MemoryWriteLifecycleDedupSuppressionPreflight');
const { applyProofMemoryWritePolicy } = require('./ProofMemoryPolicy');
const { formatSecretRejectionReason, scanMemoryWritePayload } = require('./SecretScanner');

const HIGH_RISK_SENSITIVITY_PATTERN = /\b(secret|unsafe|credential|credentials|password|passwd|token|api[-_ ]?key|access[-_ ]?key|private[-_ ]?key|secret[-_ ]?key)\b/i;
const SCHEMA_VERSION_METADATA_KEYS = Object.freeze([
  'schema_version',
  'schemaVersion',
  'policy_version',
  'policyVersion',
  'manifest_version',
  'manifestVersion'
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = normalizeString(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeScopeField(payload = {}, executionContext = {}, camelKey, snakeKey) {
  return normalizeString(
    executionContext[camelKey] ||
    executionContext[snakeKey] ||
    payload[snakeKey] ||
    payload[camelKey]
  );
}

function buildWritePreflightAllowedScope(payload = {}, executionContext = {}) {
  return {
    projectId: normalizeScopeField(payload, executionContext, 'projectId', 'project_id'),
    workspaceId: normalizeScopeField(payload, executionContext, 'workspaceId', 'workspace_id'),
    clientId: normalizeScopeField(payload, executionContext, 'clientId', 'client_id'),
    taskId: normalizeScopeField(payload, executionContext, 'taskId', 'task_id'),
    conversationId: normalizeScopeField(payload, executionContext, 'conversationId', 'conversation_id'),
    visibility: normalizeScopeField(payload, executionContext, 'visibility', 'visibility'),
    retentionPolicy: normalizeScopeField(payload, executionContext, 'retentionPolicy', 'retention_policy')
  };
}

function buildWritePreflightProposedWrite(payload = {}, normalized = {}) {
  return {
    ...payload,
    target: normalized.target,
    title: normalized.title,
    content: normalized.content,
    evidence: normalized.evidence,
    sensitivity: normalized.sensitivity,
    tags: normalized.tags,
    validated: normalized.validated,
    reusable: normalized.reusable
  };
}

function buildWritePreflightFailure(decision, error) {
  const message = error && error.message ? error.message : null;

  return {
    decision,
    acceptedForWritePreflight: false,
    canonicalHash: null,
    blockers: message ? [`${decision}:${message}`] : [decision],
    matchedCandidateIds: [],
    scopeMismatches: [],
    runtimeIntegrated: true,
    mutated: false,
    publicMcpExpanded: false
  };
}

function generateMemoryId(target) {
  const prefix = target === 'knowledge' ? 'knowledge' : 'process';
  const randomPart = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : crypto.randomBytes(12).toString('hex');
  return `codex-${prefix}-${randomPart}`;
}

function findSchemaVersionMetadataKeys(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }

  return SCHEMA_VERSION_METADATA_KEYS.filter(key =>
    Object.prototype.hasOwnProperty.call(payload, key)
  );
}

function formatSchemaVersionMetadataRejection(keys) {
  return `schema/version metadata is not accepted by record_memory runtime boundary: ${keys.join(', ')}.`;
}

function validateProcessEntry(title, content) {
  const combined = `${title}\n${content}`;
  const allowedSignals = /\b(checkpoint|risk|todo|pending|stage-conclusion)\b/i;
  const guessSignals = /\b(maybe|perhaps|guess|assume|estimate)\b/i;

  if (!allowedSignals.test(combined)) {
    return 'process memory must include checkpoint, risk, todo, pending, or stage-conclusion.';
  }

  if (guessSignals.test(combined) && !/\b(risk|todo|pending)\b/i.test(combined)) {
    return 'pure guesses are not written to Codex memory; keep them as pending/risk or add evidence first.';
  }

  return null;
}

function getSensitivityRejectionReason(target, sensitivity) {
  if (!sensitivity || sensitivity === 'none') {
    return null;
  }

  if (target === 'knowledge') {
    return 'knowledge memory only accepts sensitivity=none.';
  }

  if (HIGH_RISK_SENSITIVITY_PATTERN.test(sensitivity)) {
    return 'high-risk sensitive content will not be written to Codex memory.';
  }

  return null;
}

class MemoryWriteService {
  constructor({
    config,
    diaryStore,
    shadowStore,
    vectorStore,
    auditLogStore,
    executionContextResolver,
    chunkIndexingService,
    writePreflight = summarizeMemoryWriteLifecycleDedupSuppressionPreflight,
    writePreflightCandidateProvider = null,
    writePreflightEnabled = false
  }) {
    this.config = config;
    this.diaryStore = diaryStore;
    this.shadowStore = shadowStore;
    this.vectorStore = vectorStore;
    this.auditLogStore = auditLogStore;
    this.executionContextResolver = executionContextResolver;
    this.chunkIndexingService = chunkIndexingService;
    this.writePreflight = writePreflight;
    this.writePreflightCandidateProvider = writePreflightCandidateProvider;
    this.writePreflightEnabled = writePreflightEnabled === true;
  }

  buildRejectedResult(reason, executionContext, target = null) {
    return {
      success: false,
      decision: 'rejected',
      targetDiary: null,
      reason,
      title: null,
      memoryId: null,
      filePath: null,
      agentAlias: executionContext.agentAlias || null,
      agentId: executionContext.agentId || null,
      requestSource: executionContext.requestSource || this.config.defaultRequestSource,
      target,
      shadowWrite: createShadowWriteStatus('skipped')
    };
  }

  async runWritePreflight({ payload, normalizedPayload, executionContext }) {
    if (!this.writePreflightEnabled) {
      return null;
    }

    const proposedWrite = buildWritePreflightProposedWrite(payload, normalizedPayload);
    const allowedScope = buildWritePreflightAllowedScope(payload, executionContext);
    const canonicalHash = computeCanonicalWriteHash(proposedWrite);
    let existingCandidates = [];

    try {
      if (typeof this.writePreflightCandidateProvider === 'function') {
        existingCandidates = await this.writePreflightCandidateProvider({
          proposedWrite,
          allowedScope,
          canonicalHash,
          executionContext
        });
      } else if (
        this.writePreflightCandidateProvider &&
        typeof this.writePreflightCandidateProvider.getCandidates === 'function'
      ) {
        existingCandidates = await this.writePreflightCandidateProvider.getCandidates({
          proposedWrite,
          allowedScope,
          canonicalHash,
          executionContext
        });
      }
    } catch (error) {
      return buildWritePreflightFailure('write_preflight_candidate_provider_failed', error);
    }

    if (!Array.isArray(existingCandidates)) {
      return buildWritePreflightFailure('write_preflight_candidate_provider_malformed');
    }

    let summary;
    try {
      summary = this.writePreflight({
        proposedWrite,
        allowedScope,
        existingCandidates,
        exactApproval: executionContext.writePreflightExactApproval === true ||
          executionContext.exactApproval === true
      });
    } catch (error) {
      return buildWritePreflightFailure('write_preflight_failed', error);
    }

    if (!summary || summary.acceptedForWritePreflight !== true) {
      return summary || buildWritePreflightFailure('write_preflight_failed_closed');
    }

    return null;
  }

  async record(payload, requestContext = {}) {
    const executionContext = this.executionContextResolver.resolve(requestContext, payload);
    const target = normalizeString(payload.target).toLowerCase();
    const title = normalizeString(payload.title);
    const content = normalizeString(payload.content);
    const evidence = normalizeString(payload.evidence);
    const sensitivity = normalizeString(payload.sensitivity).toLowerCase() || 'none';
    const tags = normalizeTags(payload.tags);
    const validated = normalizeBoolean(payload.validated);
    const reusable = normalizeBoolean(payload.reusable);
    let result;

    if (!this.executionContextResolver.isWritableByCodex(executionContext)) {
      result = this.buildRejectedResult('CodexMemoryBridge only allows writes from the Codex agent context.', executionContext, target || null);
      await this.writeAudit(result);
      return result;
    }

    const schemaVersionMetadataKeys = findSchemaVersionMetadataKeys(payload);
    if (schemaVersionMetadataKeys.length > 0) {
      result = this.buildRejectedResult(formatSchemaVersionMetadataRejection(schemaVersionMetadataKeys), executionContext, target || null);
      await this.writeAudit(result);
      return result;
    }

    if (target !== 'process' && target !== 'knowledge') {
      result = this.buildRejectedResult('target must be process or knowledge.', executionContext, target || null);
      await this.writeAudit(result);
      return result;
    }

    if (!title || !content || !evidence) {
      result = this.buildRejectedResult('title, content, and evidence are required.', executionContext, target);
      await this.writeAudit(result);
      return result;
    }

    const secretScan = scanMemoryWritePayload({
      ...payload,
      title,
      content,
      evidence,
      tags
    });
    if (!secretScan.ok) {
      result = this.buildRejectedResult(formatSecretRejectionReason(secretScan), executionContext, target);
      await this.writeAudit(result);
      return result;
    }

    const sensitivityError = getSensitivityRejectionReason(target, sensitivity);
    if (sensitivityError) {
      result = this.buildRejectedResult(sensitivityError, executionContext, target);
      await this.writeAudit(result);
      return result;
    }

    if (target === 'knowledge' && !(validated && reusable)) {
      result = this.buildRejectedResult('knowledge memory requires validated=true and reusable=true.', executionContext, target);
      await this.writeAudit(result);
      return result;
    }

    if (target === 'process') {
      const processError = validateProcessEntry(title, content);
      if (processError) {
        result = this.buildRejectedResult(processError, executionContext, target);
        await this.writeAudit(result);
        return result;
      }
    }

    const writePreflightResult = await this.runWritePreflight({
      payload,
      normalizedPayload: {
        target,
        title,
        content,
        evidence,
        sensitivity,
        tags,
        validated,
        reusable
      },
      executionContext
    });
    if (writePreflightResult) {
      const decision = normalizeString(writePreflightResult.decision) || 'write_preflight_rejected';
      result = this.buildRejectedResult(`write preflight rejected: ${decision}.`, executionContext, target);
      result.writePreflight = {
        decision,
        canonicalHash: writePreflightResult.canonicalHash || null,
        matchedCandidateCount: Array.isArray(writePreflightResult.matchedCandidateIds)
          ? writePreflightResult.matchedCandidateIds.length
          : 0,
        scopeMismatchCount: Array.isArray(writePreflightResult.scopeMismatches)
          ? writePreflightResult.scopeMismatches.length
          : 0
      };
      await this.writeAudit(result);
      return result;
    }

    const proofPolicy = applyProofMemoryWritePolicy(payload, {
      tags,
      visibility: normalizeString(payload.visibility) || null,
      retentionPolicy: normalizeString(payload.retention_policy || payload.retentionPolicy) || null
    });
    const createdAt = new Date().toISOString();
    const record = {
      memoryId: generateMemoryId(target),
      target,
      title,
      content,
      evidence,
      tags: proofPolicy.tags,
      sensitivity,
      validated,
      reusable,
      createdAt,
      updatedAt: createdAt,
      visibilityPolicy: VisibilityPolicy.CODEX_ONLY,
      namespace: target === 'knowledge' ? Namespace.KNOWLEDGE : Namespace.PROCESS,
      projectId: normalizeString(payload.project_id || payload.projectId) || null,
      workspaceId: normalizeString(payload.workspace_id || payload.workspaceId) || null,
      clientId: normalizeString(payload.client_id || payload.clientId) || null,
      taskId: normalizeString(payload.task_id || payload.taskId) || null,
      conversationId: normalizeString(payload.conversation_id || payload.conversationId) || null,
      visibility: proofPolicy.visibility,
      retentionPolicy: proofPolicy.retentionPolicy
    };

    const diaryWrite = await this.diaryStore.writeRecord(record);
    record.filePath = diaryWrite.filePath;
    record.relativePath = diaryWrite.relativePath;
    record.rawText = diaryWrite.fileContent;

    const shadowFailures = [];
    let sqliteShadowReady = !this.config.enableShadowWrites;

    if (this.config.enableShadowWrites) {
      try {
        await this.shadowStore.upsertRecord(record);
        await this.shadowStore.clearReconcileTasks(record.memoryId, 'sqlite');
        sqliteShadowReady = true;
      } catch (error) {
        shadowFailures.push(`sqlite:${error.message}`);
        await this.shadowStore.enqueueReconcileTask({
          memoryId: record.memoryId,
          storeKind: 'sqlite',
          reason: 'shadow_write_failed',
          payload: record
        });
      }
    }

    if (this.config.enableVectorIndex) {
      try {
        await this.vectorStore.upsertRecord(record);
        await this.shadowStore.clearReconcileTasks(record.memoryId, 'vector');
      } catch (error) {
        shadowFailures.push(`vector:${error.message}`);
        await this.shadowStore.enqueueReconcileTask({
          memoryId: record.memoryId,
          storeKind: 'vector',
          reason: 'shadow_write_failed',
          payload: record
        });
      }
    }

    if (this.config.enableShadowWrites && sqliteShadowReady && this.chunkIndexingService) {
      try {
        await this.chunkIndexingService.indexRecord(record);
        await this.shadowStore.clearReconcileTasks(record.memoryId, 'chunks');
      } catch (error) {
        shadowFailures.push(`chunks:${error.message}`);
        await this.shadowStore.enqueueReconcileTask({
          memoryId: record.memoryId,
          storeKind: 'chunks',
          reason: 'shadow_write_failed',
          payload: record
        });
      }
    }

    result = {
      success: true,
      decision: 'accepted',
      targetDiary: target === 'knowledge' ? 'Codex knowledge' : 'Codex',
      reason: `written to ${target === 'knowledge' ? 'Codex knowledge' : 'Codex'}.`,
      title,
      memoryId: record.memoryId,
      filePath: record.filePath,
      agentAlias: executionContext.agentAlias,
      agentId: executionContext.agentId || null,
      requestSource: executionContext.requestSource || this.config.defaultRequestSource,
      target,
      proofMemory: proofPolicy.proofMemory,
      shadowWrite: createShadowWriteStatus(shadowFailures.length > 0 ? 'degraded' : 'ok', shadowFailures)
    };

    await this.writeAudit(result);
    return result;
  }

  async writeAudit(result) {
    await this.auditLogStore.appendWriteAudit({
      timestamp: new Date().toISOString(),
      agentAlias: result.agentAlias || null,
      agentId: result.agentId || null,
      decision: result.decision,
      target: result.target || null,
      title: result.title || null,
      memoryId: result.memoryId || null,
      reason: result.reason,
      filePath: result.filePath || null,
      requestSource: result.requestSource || this.config.defaultRequestSource,
      shadowWrite: result.shadowWrite || createShadowWriteStatus('unknown')
    });
  }
}

module.exports = {
  SCHEMA_VERSION_METADATA_KEYS,
  findSchemaVersionMetadataKeys,
  MemoryWriteService,
  validateProcessEntry
};
