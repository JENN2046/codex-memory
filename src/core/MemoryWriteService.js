const crypto = require('node:crypto');

const { VisibilityPolicy, Namespace, createShadowWriteStatus } = require('./types');
const { formatSecretRejectionReason, scanMemoryWritePayload } = require('./SecretScanner');

const HIGH_RISK_SENSITIVITY_PATTERN = /\b(secret|unsafe|credential|credentials|password|passwd|token|api[-_ ]?key|access[-_ ]?key|private[-_ ]?key|secret[-_ ]?key)\b/i;

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

function generateMemoryId(target) {
  const prefix = target === 'knowledge' ? 'knowledge' : 'process';
  const randomPart = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : crypto.randomBytes(12).toString('hex');
  return `codex-${prefix}-${randomPart}`;
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
  constructor({ config, diaryStore, shadowStore, vectorStore, auditLogStore, executionContextResolver, chunkIndexingService }) {
    this.config = config;
    this.diaryStore = diaryStore;
    this.shadowStore = shadowStore;
    this.vectorStore = vectorStore;
    this.auditLogStore = auditLogStore;
    this.executionContextResolver = executionContextResolver;
    this.chunkIndexingService = chunkIndexingService;
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

    const createdAt = new Date().toISOString();
    const record = {
      memoryId: generateMemoryId(target),
      target,
      title,
      content,
      evidence,
      tags,
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
      visibility: normalizeString(payload.visibility) || null,
      retentionPolicy: normalizeString(payload.retention_policy || payload.retentionPolicy) || null
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
  MemoryWriteService,
  validateProcessEntry
};
