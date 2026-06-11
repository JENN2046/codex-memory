const crypto = require('node:crypto');

const { VisibilityPolicy, Namespace, createShadowWriteStatus } = require('./types');
const {
  computeCanonicalWriteHash,
  summarizeMemoryWriteLifecycleDedupSuppressionPreflight
} = require('./MemoryWriteLifecycleDedupSuppressionPreflight');
const {
  firstNonEmptyAliasString,
  normalizeMemoryId
} = require('./FieldAliasNormalizer');
const { applyProofMemoryWritePolicy } = require('./ProofMemoryPolicy');
const { formatSecretRejectionReason, scanMemoryWritePayload } = require('./SecretScanner');
const {
  buildRuntimeNoopProjectionFailure,
  buildRuntimeNoopProjectionInput,
  createTagMemoRuntimeNoopProjection
} = require('../tagmemo/runtime-noop-projection');

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
  const candidates = [
    executionContext[camelKey],
    executionContext[snakeKey],
    payload[snakeKey],
    payload[camelKey]
  ];

  for (const candidate of candidates) {
    const normalized = normalizeString(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function buildWritePreflightAllowedScope(payload = {}, executionContext = {}) {
  return {
    projectId: normalizeScopeField(payload, executionContext, 'projectId', 'project_id'),
    workspaceId: normalizeScopeField(payload, executionContext, 'workspaceId', 'workspace_id'),
    clientId: normalizeScopeField(payload, executionContext, 'clientId', 'client_id'),
    taskId: normalizeScopeField(payload, executionContext, 'taskId', 'task_id'),
    conversationId: normalizeScopeField(payload, executionContext, 'conversationId', 'conversation_id'),
    visibility: normalizeScopeField(payload, executionContext, 'visibility', 'visibility_policy'),
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

function buildDefaultIdempotencyKey(canonicalHash) {
  return `memory-write-v1:${canonicalHash}`;
}

function supportsWriteManifest(config = {}, shadowStore = null) {
  return config.enableShadowWrites !== false &&
    config.enableWriteManifest !== false &&
    shadowStore &&
    typeof shadowStore.beginMemoryWriteManifest === 'function' &&
    typeof shadowStore.finalizeMemoryWriteManifest === 'function';
}

function supportsWriteManifestRecovery(config = {}, shadowStore = null) {
  return supportsWriteManifest(config, shadowStore) &&
    typeof shadowStore.listMemoryWriteManifestsByStatus === 'function';
}

function supportsWriteManifestCancellation(config = {}, shadowStore = null) {
  return supportsWriteManifestRecovery(config, shadowStore) &&
    typeof shadowStore.cancelPendingMemoryWriteManifest === 'function';
}

function supportsWriteManifestRepair(config = {}, shadowStore = null) {
  return supportsWriteManifestRecovery(config, shadowStore) &&
    typeof shadowStore.repairDegradedMemoryWriteManifest === 'function' &&
    typeof shadowStore.listReconcileTasksForMemoryId === 'function';
}

function supportsDiaryProjectionRebuild(config = {}, shadowStore = null) {
  return supportsWriteManifestRecovery(config, shadowStore) &&
    typeof shadowStore.listMemoryWriteManifestsForDiaryProjectionRebuild === 'function' &&
    typeof shadowStore.updateMemoryWriteManifestRecord === 'function';
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
    writePreflightEnabled = false,
    recordMemoryPrincipalScopeAuthorizationPreflight = null,
    recordMemoryPrincipalScopeAuthorizationPolicy = null,
    recordMemoryPrincipalScopeAuthorizationObserver = null,
    recordMemoryPrincipalScopeAuthorizationStrictMode = false,
    tagMemoNoopProjection = createTagMemoRuntimeNoopProjection,
    tagMemoNoopProjectionObserver = null
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
    this.recordMemoryPrincipalScopeAuthorizationPreflight =
      typeof recordMemoryPrincipalScopeAuthorizationPreflight === 'function'
        ? recordMemoryPrincipalScopeAuthorizationPreflight
        : null;
    this.recordMemoryPrincipalScopeAuthorizationPolicy =
      recordMemoryPrincipalScopeAuthorizationPolicy &&
        typeof recordMemoryPrincipalScopeAuthorizationPolicy === 'object' &&
        !Array.isArray(recordMemoryPrincipalScopeAuthorizationPolicy)
        ? recordMemoryPrincipalScopeAuthorizationPolicy
        : null;
    this.recordMemoryPrincipalScopeAuthorizationObserver =
      typeof recordMemoryPrincipalScopeAuthorizationObserver === 'function'
        ? recordMemoryPrincipalScopeAuthorizationObserver
        : null;
    this.recordMemoryPrincipalScopeAuthorizationStrictMode =
      recordMemoryPrincipalScopeAuthorizationStrictMode === true;
    this.tagMemoNoopProjection = tagMemoNoopProjection;
    this.tagMemoNoopProjectionObserver = tagMemoNoopProjectionObserver;
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

  runTagMemoNoopProjection(record) {
    if (typeof this.tagMemoNoopProjection !== 'function') {
      return null;
    }

    let projection;
    try {
      projection = this.tagMemoNoopProjection({
        ...record,
        tags: Array.isArray(record.tags) ? [...record.tags] : record.tags
      });
    } catch (error) {
      const projectionInput = buildRuntimeNoopProjectionInput({ memoryId: record?.memoryId });
      projection = buildRuntimeNoopProjectionFailure(
        'tagmemo_noop_projection_failed',
        projectionInput.ok ? projectionInput.input.memoryId : null
      );
    }

    if (typeof this.tagMemoNoopProjectionObserver === 'function') {
      try {
        this.tagMemoNoopProjectionObserver(projection);
      } catch (error) {
        return projection;
      }
    }

    return projection;
  }

  async runRecordMemoryPrincipalScopeAuthorizationPreflight({
    executionContext = {},
    requestContext = {}
  } = {}) {
    if (!this.recordMemoryPrincipalScopeAuthorizationPreflight) {
      return null;
    }

    const policy = requestContext.recordMemoryPrincipalScopeAuthorizationPolicy ||
      this.recordMemoryPrincipalScopeAuthorizationPolicy ||
      {};

    let summary;
    try {
      summary = await this.recordMemoryPrincipalScopeAuthorizationPreflight({
        sourceMode: 'explicit_input',
        policy,
        executionContext,
        sideEffects: {
          runtimeApplied: false,
          recordMemoryCalled: false,
          providerCalls: 0,
          realMemoryScanned: false,
          durableMutationExecuted: false,
          durableAuditWritten: false,
          configChanged: false,
          watchdogStartupChanged: false,
          publicMcpExpanded: false,
          readinessClaimed: false,
          reliabilityClaimed: false
        }
      });
      summary = {
        ...(summary || {}),
        currentRuntimeAuthorizationChanged: false,
        recordMemoryRuntimeIntegrated: true,
        runtimeApplied: false
      };
    } catch (error) {
      summary = {
        acceptedForPrincipalScopeAuthorizationPreflight: false,
        decision: 'NOT_READY_BLOCKED',
        currentRuntimeAuthorizationChanged: false,
        recordMemoryRuntimeIntegrated: true,
        noApplyInvariant: true,
        runtimeApplied: false,
        recordMemoryCalled: false,
        providerCalls: 0,
        realMemoryScanned: false,
        durableMutationExecuted: false,
        durableAuditWritten: false,
        publicMcpExpanded: false,
        readinessClaimed: false,
        reliabilityClaimed: false,
        safety: {
          callsMemoryTools: false,
          callsProviders: false,
          scansRealMemory: false,
          mutatesDurableState: false,
          changesRuntimeAuth: false
        }
      };
    }

    if (this.recordMemoryPrincipalScopeAuthorizationObserver) {
      try {
        this.recordMemoryPrincipalScopeAuthorizationObserver(summary);
      } catch (error) {
        return summary;
      }
    }

    return summary;
  }

  shouldEnforceRecordMemoryPrincipalScopeAuthorization(requestContext = {}) {
    return this.recordMemoryPrincipalScopeAuthorizationStrictMode === true ||
      requestContext.recordMemoryPrincipalScopeAuthorizationStrictMode === true;
  }

  buildRecordMemoryPrincipalScopeAuthorizationRejectedResult(summary = {}, executionContext = {}, target = null) {
    const missing = Array.isArray(summary.missingRequiredContextFields)
      ? summary.missingRequiredContextFields
      : [];
    const mismatched = Array.isArray(summary.mismatchedFields)
      ? summary.mismatchedFields
      : [];
    const blockers = [...new Set([
      ...(summary.requiredPolicyPresent === false ? ['policy'] : []),
      ...missing,
      ...mismatched,
      ...(summary.noApplyInvariant === false ? ['noApplyInvariant'] : []),
      ...(summary.rawWorkspaceIdExposed === true ? ['lowDisclosure'] : [])
    ])];
    const reason = blockers.length > 0
      ? `record_memory principal/scope authorization rejected: ${blockers.join(', ')}.`
      : 'record_memory principal/scope authorization rejected.';

    const result = this.buildRejectedResult(reason, executionContext, target);
    result.agentId = null;
    result.principalScopeAuthorization = {
      decision: summary.decision || 'NOT_READY_BLOCKED',
      accepted: false,
      strictMode: true,
      requiredPolicyPresent: summary.requiredPolicyPresent === true,
      requiredContextFieldsPresent: summary.requiredContextFieldsPresent === true,
      allPrincipalScopeMatched: summary.allPrincipalScopeMatched === true,
      missingRequiredContextFields: missing,
      mismatchedFields: mismatched,
      rawWorkspaceIdExposed: summary.rawWorkspaceIdExposed === true,
      noApplyInvariant: summary.noApplyInvariant === true
    };
    return result;
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
    let writeManifestContext = null;

    if (!this.executionContextResolver.isWritableByCodex(executionContext)) {
      result = this.buildRejectedResult('CodexMemoryBridge only allows writes from the Codex agent context.', executionContext, target || null);
      await this.writeAudit(result);
      return result;
    }

    const principalScopeAuthorization =
      await this.runRecordMemoryPrincipalScopeAuthorizationPreflight({
        executionContext,
        requestContext
      });
    if (
      this.shouldEnforceRecordMemoryPrincipalScopeAuthorization(requestContext) &&
      principalScopeAuthorization?.acceptedForPrincipalScopeAuthorizationPreflight !== true
    ) {
      result = this.buildRecordMemoryPrincipalScopeAuthorizationRejectedResult(
        principalScopeAuthorization || {},
        executionContext,
        target || null
      );
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

    const canonicalHash = computeCanonicalWriteHash(buildWritePreflightProposedWrite(payload, {
      target,
      title,
      content,
      evidence,
      sensitivity,
      tags,
      validated,
      reusable
    }));
    const idempotencyKey = buildDefaultIdempotencyKey(canonicalHash);
    let memoryId = generateMemoryId(target);

    if (supportsWriteManifest(this.config, this.shadowStore)) {
      const manifestStart = await this.shadowStore.beginMemoryWriteManifest({
        idempotencyKey,
        memoryId,
        canonicalHash,
        target,
        createdAt: new Date().toISOString()
      });
      const manifest = manifestStart.manifest;

      if (!manifestStart.started && manifest) {
        if (['committed', 'degraded', 'repaired'].includes(manifest.status)) {
          result = {
            ...(manifest.result || {}),
            success: true,
            decision: 'accepted',
            reason: 'idempotent replay: existing memory write returned.',
            memoryId: manifest.memoryId,
            target,
            title,
            requestSource: executionContext.requestSource || this.config.defaultRequestSource,
            idempotency: {
              key: manifest.idempotencyKey,
              canonicalHash: manifest.canonicalHash,
              status: manifest.status,
              replayed: true,
              recovered: manifest.result?.idempotency?.recovered === true,
              repaired: manifest.result?.idempotency?.repaired === true,
              repairReason: manifest.result?.idempotency?.repairReason || null,
              authoritativeStore: 'sqlite',
              lifecycle: this.buildWriteManifestLifecycle(manifest)
            },
            shadowWrite: manifest.result?.shadowWrite || createShadowWriteStatus('ok')
          };
          await this.writeAudit(result);
          return result;
        }

        if (['cancelled', 'aborted'].includes(manifest.status)) {
          result = this.buildRejectedResult(
            `write manifest ${manifest.status}: canonical write is terminally closed.`,
            executionContext,
            target
          );
          result.memoryId = manifest.memoryId || null;
          result.idempotency = {
            key: manifest.idempotencyKey,
            canonicalHash: manifest.canonicalHash,
            status: manifest.status,
            replayed: false,
            recoveryRequired: false,
            cancelled: manifest.status === 'cancelled',
            authoritativeStore: 'sqlite',
            lifecycle: this.buildWriteManifestLifecycle(manifest)
          };
          await this.writeAudit(result);
          return result;
        }

        result = this.buildRejectedResult(
          'write manifest pending recovery for this canonical write.',
          executionContext,
          target
        );
        result.memoryId = manifest.memoryId || null;
        result.idempotency = {
          key: manifest.idempotencyKey,
          canonicalHash: manifest.canonicalHash,
          status: manifest.status,
          replayed: false,
          recoveryRequired: true,
          authoritativeStore: 'sqlite'
        };
        await this.writeAudit(result);
        return result;
      }

      if (manifest?.memoryId) {
        memoryId = manifest.memoryId;
        writeManifestContext = {
          idempotencyKey,
          canonicalHash,
          authoritativeStore: 'sqlite'
        };
      }
    }

    const effectiveScope = buildWritePreflightAllowedScope(payload, executionContext);
    const proofPolicy = applyProofMemoryWritePolicy(payload, {
      tags,
      visibility: effectiveScope.visibility || null,
      retentionPolicy: effectiveScope.retentionPolicy || null
    });
    const createdAt = new Date().toISOString();
    const record = {
      memoryId,
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
      projectId: effectiveScope.projectId || null,
      workspaceId: effectiveScope.workspaceId || null,
      clientId: effectiveScope.clientId || null,
      taskId: effectiveScope.taskId || null,
      conversationId: effectiveScope.conversationId || null,
      visibility: proofPolicy.visibility,
      retentionPolicy: proofPolicy.retentionPolicy
    };
    this.runTagMemoNoopProjection(record);

    const shadowFailures = [];
    let sqliteShadowReady = !this.config.enableShadowWrites;

    if (
      writeManifestContext &&
      this.config.enableShadowWrites &&
      this.shadowStore &&
      typeof this.shadowStore.attachRecordToMemoryWriteManifest === 'function'
    ) {
      try {
        const authoritativeWrite = await this.shadowStore.attachRecordToMemoryWriteManifest({
          idempotencyKey: writeManifestContext.idempotencyKey,
          record,
          updatedAt: new Date().toISOString()
        });
        if (!authoritativeWrite.updated) {
          result = this.buildRejectedResult(
            `sqlite authoritative write manifest attach failed: ${authoritativeWrite.reason || 'unknown'}.`,
            executionContext,
            target
          );
          result.memoryId = record.memoryId;
          result.idempotency = {
            key: writeManifestContext.idempotencyKey,
            canonicalHash: writeManifestContext.canonicalHash,
            status: 'pending',
            replayed: false,
            recoveryRequired: true,
            authoritativeStore: 'sqlite'
          };
          await this.writeAudit(result);
          return result;
        }
        sqliteShadowReady = true;
      } catch (error) {
        result = this.buildRejectedResult(
          `sqlite authoritative write failed: ${error.message}.`,
          executionContext,
          target
        );
        result.memoryId = record.memoryId;
        result.idempotency = {
          key: writeManifestContext.idempotencyKey,
          canonicalHash: writeManifestContext.canonicalHash,
          status: 'pending',
          replayed: false,
          recoveryRequired: true,
          authoritativeStore: 'sqlite'
        };
        await this.writeAudit(result);
        return result;
      }
    }

    if (writeManifestContext) {
      try {
        const diaryWrite = await this.diaryStore.writeRecord(record);
        record.filePath = diaryWrite.filePath;
        record.relativePath = diaryWrite.relativePath;
        record.rawText = diaryWrite.fileContent;
      } catch (error) {
        shadowFailures.push(`diary:${error.message}`);
      }
    } else {
      const diaryWrite = await this.diaryStore.writeRecord(record);
      record.filePath = diaryWrite.filePath;
      record.relativePath = diaryWrite.relativePath;
      record.rawText = diaryWrite.fileContent;
    }

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
      filePath: record.filePath || null,
      agentAlias: executionContext.agentAlias,
      agentId: executionContext.agentId || null,
      requestSource: executionContext.requestSource || this.config.defaultRequestSource,
      target,
      proofMemory: proofPolicy.proofMemory,
      shadowWrite: createShadowWriteStatus(shadowFailures.length > 0 ? 'degraded' : 'ok', shadowFailures)
    };
    if (writeManifestContext) {
      result.idempotency = {
        key: writeManifestContext.idempotencyKey,
        canonicalHash: writeManifestContext.canonicalHash,
        status: shadowFailures.length > 0 ? 'degraded' : 'committed',
        replayed: false,
        authoritativeStore: writeManifestContext.authoritativeStore,
        lifecycle: {
          pending: false,
          committed: true,
          projected: true,
          audited: false
        }
      };
      await this.shadowStore.finalizeMemoryWriteManifest({
        idempotencyKey: writeManifestContext.idempotencyKey,
        status: result.idempotency.status,
        result,
        updatedAt: new Date().toISOString()
      });
      await this.writeAuditAndMarkMemoryWriteManifestAudited(result);
      return result;
    }

    await this.writeAudit(result);
    return result;
  }

  async recoverPendingWriteManifests(options = {}) {
    if (!supportsWriteManifestRecovery(this.config, this.shadowStore)) {
      return {
        attempted: 0,
        recovered: 0,
        degraded: 0,
        missingDiary: 0,
        items: []
      };
    }

    const limit = Number.isInteger(options.limit) && options.limit > 0 ? Math.min(options.limit, 500) : 50;
    const manifests = await this.shadowStore.listMemoryWriteManifestsByStatus('pending', limit);
    const diaryRecords = await this.diaryStore.listRecords({ target: 'both' });
    const diaryRecordByMemoryId = new Map(
      diaryRecords
        .filter(record => record?.memoryId)
        .map(record => [record.memoryId, record])
    );
    const summary = {
      attempted: manifests.length,
      recovered: 0,
      degraded: 0,
      missingDiary: 0,
      items: []
    };

    for (const manifest of manifests) {
      const record = manifest.record || diaryRecordByMemoryId.get(manifest.memoryId);
      if (!record) {
        summary.missingDiary += 1;
        summary.items.push({
          memoryId: manifest.memoryId,
          idempotencyKey: manifest.idempotencyKey,
          status: 'pending',
          recovered: false,
          reason: 'diary_record_missing'
        });
        continue;
      }

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
            reason: 'manifest_recovery_shadow_write_failed',
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
            reason: 'manifest_recovery_shadow_write_failed',
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
            reason: 'manifest_recovery_shadow_write_failed',
            payload: record
          });
        }
      }

      const status = shadowFailures.length > 0 ? 'degraded' : 'committed';
      const result = {
        success: true,
        decision: 'accepted',
        targetDiary: record.target === 'knowledge' ? 'Codex knowledge' : 'Codex',
        reason: 'recovered pending write manifest from diary.',
        title: record.title,
        memoryId: record.memoryId,
        filePath: record.filePath,
        agentAlias: null,
        agentId: null,
        requestSource: this.config.defaultRequestSource,
        target: record.target,
        idempotency: {
          key: manifest.idempotencyKey,
          canonicalHash: manifest.canonicalHash,
          status,
          replayed: false,
          recovered: true,
          authoritativeStore: 'sqlite',
          lifecycle: {
            pending: false,
            committed: true,
            projected: true,
            audited: false
          }
        },
        shadowWrite: createShadowWriteStatus(status === 'committed' ? 'ok' : 'degraded', shadowFailures)
      };

      await this.shadowStore.finalizeMemoryWriteManifest({
        idempotencyKey: manifest.idempotencyKey,
        status,
        result,
        updatedAt: new Date().toISOString()
      });
      await this.writeAuditAndMarkMemoryWriteManifestAudited(result);
      summary.recovered += 1;
      if (status === 'degraded') {
        summary.degraded += 1;
      }
      summary.items.push({
        memoryId: manifest.memoryId,
        idempotencyKey: manifest.idempotencyKey,
        status,
        recovered: true,
        shadowFailureCount: shadowFailures.length
      });
    }

    return summary;
  }

  async rebuildMissingDiaryProjections(options = {}) {
    if (!supportsDiaryProjectionRebuild(this.config, this.shadowStore)) {
      return {
        attempted: 0,
        rebuilt: 0,
        degraded: 0,
        skipped: 0,
        malformedRecord: 0,
        items: []
      };
    }

    const limit = Number.isInteger(options.limit) && options.limit > 0 ? Math.min(options.limit, 500) : 50;
    const manifests = await this.shadowStore.listMemoryWriteManifestsForDiaryProjectionRebuild(limit);
    const summary = {
      attempted: manifests.length,
      rebuilt: 0,
      degraded: 0,
      skipped: 0,
      malformedRecord: 0,
      items: []
    };

    for (const manifest of manifests) {
      const record = manifest.record;
      if (!record || manifest.recordMalformed || !record.memoryId || !record.target) {
        summary.malformedRecord += 1;
        summary.items.push({
          memoryId: manifest.memoryId,
          idempotencyKey: manifest.idempotencyKey,
          status: manifest.status,
          rebuilt: false,
          reason: 'manifest_record_malformed'
        });
        continue;
      }

      if (record.filePath || record.relativePath) {
        summary.skipped += 1;
        summary.items.push({
          memoryId: manifest.memoryId,
          idempotencyKey: manifest.idempotencyKey,
          status: manifest.status,
          rebuilt: false,
          reason: 'diary_projection_present'
        });
        continue;
      }

      const shadowFailures = [];
      try {
        const diaryWrite = await this.diaryStore.writeRecord(record);
        record.filePath = diaryWrite.filePath;
        record.relativePath = diaryWrite.relativePath;
        record.rawText = diaryWrite.fileContent;
        record.updatedAt = new Date().toISOString();
      } catch (error) {
        shadowFailures.push(`diary:${error.message}`);
      }

      let sqliteShadowReady = !this.config.enableShadowWrites;
      if (this.config.enableShadowWrites && shadowFailures.length === 0) {
        try {
          await this.shadowStore.updateMemoryWriteManifestRecord({
            idempotencyKey: manifest.idempotencyKey,
            record,
            updatedAt: new Date().toISOString()
          });
          await this.shadowStore.clearReconcileTasks(record.memoryId, 'sqlite');
          sqliteShadowReady = true;
        } catch (error) {
          shadowFailures.push(`sqlite:${error.message}`);
          await this.shadowStore.enqueueReconcileTask({
            memoryId: record.memoryId,
            storeKind: 'sqlite',
            reason: 'diary_projection_rebuild_shadow_write_failed',
            payload: record
          });
        }
      }

      if (this.config.enableVectorIndex && shadowFailures.length === 0) {
        try {
          await this.vectorStore.upsertRecord(record);
          await this.shadowStore.clearReconcileTasks(record.memoryId, 'vector');
        } catch (error) {
          shadowFailures.push(`vector:${error.message}`);
          await this.shadowStore.enqueueReconcileTask({
            memoryId: record.memoryId,
            storeKind: 'vector',
            reason: 'diary_projection_rebuild_shadow_write_failed',
            payload: record
          });
        }
      }

      if (
        this.config.enableShadowWrites &&
        sqliteShadowReady &&
        this.chunkIndexingService &&
        shadowFailures.length === 0
      ) {
        try {
          await this.chunkIndexingService.indexRecord(record);
          await this.shadowStore.clearReconcileTasks(record.memoryId, 'chunks');
        } catch (error) {
          shadowFailures.push(`chunks:${error.message}`);
          await this.shadowStore.enqueueReconcileTask({
            memoryId: record.memoryId,
            storeKind: 'chunks',
            reason: 'diary_projection_rebuild_shadow_write_failed',
            payload: record
          });
        }
      }

      const status = shadowFailures.length > 0 ? 'degraded' : 'committed';
      const result = {
        success: true,
        decision: 'accepted',
        targetDiary: record.target === 'knowledge' ? 'Codex knowledge' : 'Codex',
        reason: 'rebuilt missing diary projection from sqlite authority.',
        title: record.title,
        memoryId: record.memoryId,
        filePath: record.filePath || null,
        agentAlias: null,
        agentId: null,
        requestSource: this.config.defaultRequestSource,
        target: record.target,
        idempotency: {
          key: manifest.idempotencyKey,
          canonicalHash: manifest.canonicalHash,
          status,
          replayed: false,
          recovered: manifest.result?.idempotency?.recovered === true,
          diaryProjectionRebuilt: Boolean(record.filePath || record.relativePath),
          authoritativeStore: 'sqlite',
          lifecycle: {
            pending: false,
            committed: true,
            projected: true,
            audited: false
          }
        },
        shadowWrite: createShadowWriteStatus(status === 'committed' ? 'ok' : 'degraded', shadowFailures)
      };

      await this.shadowStore.finalizeMemoryWriteManifest({
        idempotencyKey: manifest.idempotencyKey,
        status,
        result,
        updatedAt: new Date().toISOString()
      });
      await this.writeAuditAndMarkMemoryWriteManifestAudited(result);
      if (status === 'committed') {
        summary.rebuilt += 1;
      } else {
        summary.degraded += 1;
      }
      summary.items.push({
        memoryId: manifest.memoryId,
        idempotencyKey: manifest.idempotencyKey,
        status,
        rebuilt: status === 'committed',
        shadowFailureCount: shadowFailures.length
      });
    }

    return summary;
  }

  async repairDegradedMemoryWriteManifests(options = {}) {
    if (!supportsWriteManifestRepair(this.config, this.shadowStore)) {
      return {
        attempted: 0,
        repaired: 0,
        retained: 0,
        items: []
      };
    }

    const limit = Number.isInteger(options.limit) && options.limit > 0 ? Math.min(options.limit, 500) : 50;
    const repairReason = normalizeString(options.reason) || 'reconcile_queue_drained';
    const manifests = await this.shadowStore.listMemoryWriteManifestsByStatus('degraded', limit);
    const summary = {
      attempted: manifests.length,
      repaired: 0,
      retained: 0,
      items: []
    };

    for (const manifest of manifests) {
      const remainingTasks = await this.shadowStore.listReconcileTasksForMemoryId(manifest.memoryId, 1);
      if (remainingTasks.length > 0) {
        summary.retained += 1;
        summary.items.push({
          memoryId: manifest.memoryId,
          idempotencyKey: manifest.idempotencyKey,
          status: manifest.status,
          repaired: false,
          reason: 'reconcile_tasks_remaining'
        });
        continue;
      }

      const result = {
        ...(manifest.result || {}),
        success: true,
        decision: 'accepted',
        reason: 'write manifest repaired: reconcile queue drained.',
        memoryId: manifest.memoryId,
        target: manifest.target,
        idempotency: {
          ...((manifest.result && manifest.result.idempotency) || {}),
          key: manifest.idempotencyKey,
          canonicalHash: manifest.canonicalHash,
          status: 'repaired',
          replayed: false,
          recovered: (manifest.result && manifest.result.idempotency && manifest.result.idempotency.recovered) === true,
          recoveryRequired: false,
          repaired: true,
          repairReason,
          authoritativeStore: 'sqlite',
          lifecycle: {
            pending: false,
            committed: manifest.committedAt !== null,
            projected: manifest.projectedAt !== null,
            audited: false
          }
        },
        shadowWrite: {
          ...((manifest.result && manifest.result.shadowWrite) || {}),
          status: 'repaired',
          repaired: true,
          repairReason
        }
      };

      const repair = await this.shadowStore.repairDegradedMemoryWriteManifest({
        idempotencyKey: manifest.idempotencyKey,
        status: 'repaired',
        result,
        updatedAt: new Date().toISOString()
      });

      if (!repair.updated) {
        summary.retained += 1;
        summary.items.push({
          memoryId: manifest.memoryId,
          idempotencyKey: manifest.idempotencyKey,
          status: manifest.status,
          repaired: false,
          reason: 'repair_guard_failed'
        });
        continue;
      }

      await this.writeAuditAndMarkMemoryWriteManifestAudited(result);
      summary.repaired += 1;
      summary.items.push({
        memoryId: manifest.memoryId,
        idempotencyKey: manifest.idempotencyKey,
        status: 'repaired',
        repaired: true,
        reason: repairReason
      });
    }

    return summary;
  }

  async cancelUnrecoverablePendingWriteManifests(options = {}) {
    if (!supportsWriteManifestCancellation(this.config, this.shadowStore)) {
      return {
        attempted: 0,
        cancelled: 0,
        retained: 0,
        items: []
      };
    }

    const limit = Number.isInteger(options.limit) && options.limit > 0 ? Math.min(options.limit, 500) : 50;
    const cancelReason = normalizeString(options.reason) || 'diary_record_missing';
    const manifests = await this.shadowStore.listMemoryWriteManifestsByStatus('pending', limit);
    const diaryRecords = await this.diaryStore.listRecords({ target: 'both' });
    const diaryRecordByMemoryId = new Map(
      diaryRecords
        .filter(record => record?.memoryId)
        .map(record => [record.memoryId, record])
    );
    const summary = {
      attempted: manifests.length,
      cancelled: 0,
      retained: 0,
      items: []
    };

    for (const manifest of manifests) {
      const record = manifest.record || diaryRecordByMemoryId.get(manifest.memoryId);
      if (record) {
        summary.retained += 1;
        summary.items.push({
          memoryId: manifest.memoryId,
          idempotencyKey: manifest.idempotencyKey,
          status: manifest.status,
          cancelled: false,
          reason: manifest.record ? 'manifest_record_available' : 'diary_record_available'
        });
        continue;
      }

      const result = {
        success: false,
        decision: 'rejected',
        targetDiary: null,
        reason: `write manifest cancelled: ${cancelReason}.`,
        title: null,
        memoryId: manifest.memoryId,
        filePath: null,
        agentAlias: null,
        agentId: null,
        requestSource: this.config.defaultRequestSource,
        target: manifest.target,
        idempotency: {
          key: manifest.idempotencyKey,
          canonicalHash: manifest.canonicalHash,
          status: 'cancelled',
          replayed: false,
          recovered: false,
          recoveryRequired: false,
          cancelled: true,
          cancelReason,
          authoritativeStore: 'sqlite',
          lifecycle: {
            pending: false,
            committed: manifest.committedAt !== null,
            projected: manifest.projectedAt !== null,
            audited: false
          }
        },
        shadowWrite: createShadowWriteStatus('skipped')
      };
      const cancellation = await this.shadowStore.cancelPendingMemoryWriteManifest({
        idempotencyKey: manifest.idempotencyKey,
        status: 'cancelled',
        result,
        updatedAt: new Date().toISOString()
      });

      if (!cancellation.updated) {
        summary.retained += 1;
        summary.items.push({
          memoryId: manifest.memoryId,
          idempotencyKey: manifest.idempotencyKey,
          status: manifest.status,
          cancelled: false,
          reason: 'cancel_guard_failed'
        });
        continue;
      }

      await this.writeAuditAndMarkMemoryWriteManifestAudited(result);
      summary.cancelled += 1;
      summary.items.push({
        memoryId: manifest.memoryId,
        idempotencyKey: manifest.idempotencyKey,
        status: 'cancelled',
        cancelled: true,
        reason: cancelReason
      });
    }

    return summary;
  }

  buildWriteManifestLifecycle(manifest) {
    return {
      pending: manifest?.status === 'pending',
      committed: manifest?.committedAt !== null && manifest?.committedAt !== undefined,
      projected: manifest?.projectedAt !== null && manifest?.projectedAt !== undefined,
      audited: manifest?.auditedAt !== null && manifest?.auditedAt !== undefined
    };
  }

  async writeAuditAndMarkMemoryWriteManifestAudited(result) {
    if (result?.idempotency?.lifecycle) {
      result.idempotency.lifecycle.audited = true;
    }
    await this.writeAudit(result);
    if (
      result?.idempotency?.key &&
      this.shadowStore &&
      typeof this.shadowStore.markMemoryWriteManifestAudited === 'function'
    ) {
      await this.shadowStore.markMemoryWriteManifestAudited({
        idempotencyKey: result.idempotency.key,
        result,
        updatedAt: new Date().toISOString()
      });
    }
  }

  async writeAudit(result) {
    const idempotency = result.idempotency || null;
    await this.auditLogStore.appendWriteAudit({
      timestamp: new Date().toISOString(),
      agentAlias: firstNonEmptyAliasString(result, ['agentAlias', 'agent_alias']) || null,
      agentId: firstNonEmptyAliasString(result, ['agentId', 'agent_id']) || null,
      decision: firstNonEmptyAliasString(result, ['decision']) || result.decision,
      target: firstNonEmptyAliasString(result, ['target']) || null,
      title: firstNonEmptyAliasString(result, ['title']) || null,
      memoryId: normalizeMemoryId(result) || null,
      reason: firstNonEmptyAliasString(result, ['reason']) || result.reason,
      filePath: firstNonEmptyAliasString(result, ['filePath', 'file_path']) || null,
      requestSource: firstNonEmptyAliasString(result, ['requestSource', 'request_source']) || this.config.defaultRequestSource,
      shadowWrite: result.shadowWrite || createShadowWriteStatus('unknown'),
      writeManifest: idempotency ? {
        authoritativeStore: firstNonEmptyAliasString(idempotency, ['authoritativeStore', 'authoritative_store']) || null,
        idempotencyKey: firstNonEmptyAliasString(idempotency, ['key', 'idempotencyKey', 'idempotency_key']) || null,
        canonicalHash: firstNonEmptyAliasString(idempotency, ['canonicalHash', 'canonical_hash']) || null,
        status: firstNonEmptyAliasString(idempotency, ['status']) || null,
        replayed: idempotency.replayed === true,
        recovered: idempotency.recovered === true,
        recoveryRequired: idempotency.recoveryRequired === true,
        repaired: idempotency.repaired === true,
        repairReason: idempotency.repairReason || null,
        cancelled: idempotency.cancelled === true,
        cancelReason: idempotency.cancelReason || null,
        lifecycle: idempotency.lifecycle || null
      } : null
    });
  }
}

module.exports = {
  SCHEMA_VERSION_METADATA_KEYS,
  buildDefaultIdempotencyKey,
  findSchemaVersionMetadataKeys,
  MemoryWriteService,
  validateProcessEntry
};
