const path = require('node:path');

const { DEFAULT_AUDIT_WINDOW } = require('../storage/AuditLogStore');
const { KNOWLEDGE_DIARY_NAME, PROCESS_DIARY_NAME } = require('./constants');
const { buildNormalizedScopeAudit } = require('../recall/RecallAuditService');

const DEFAULT_LIST_LIMIT = 10;

function toInt(value, fallback, min = 1, max = 200) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function pickLaterTimestamp(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  const currentTime = new Date(current).getTime();
  const candidateTime = new Date(candidate).getTime();
  if (Number.isNaN(currentTime)) return candidate;
  if (Number.isNaN(candidateTime)) return current;
  return candidateTime > currentTime ? candidate : current;
}

function normalizeFileKey(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  return normalized;
}

function buildRecordLabel(entry) {
  if (typeof entry.title === 'string' && entry.title.trim()) {
    return entry.title.trim();
  }
  if (typeof entry.filePath === 'string' && entry.filePath.trim()) {
    return path.basename(entry.filePath.trim());
  }
  return 'Untitled memory';
}

function summarizeReasons(entries) {
  const buckets = new Map();
  for (const entry of entries) {
    const reason = typeof entry.reason === 'string' && entry.reason.trim()
      ? entry.reason.trim()
      : 'No recorded reason';
    buckets.set(reason, (buckets.get(reason) || 0) + 1);
  }
  return [...buckets.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((left, right) => right.count - left.count);
}

function buildWriteSummary(entries) {
  const summary = {
    sampleSize: entries.length,
    accepted: 0,
    rejected: 0,
    processAccepted: 0,
    knowledgeAccepted: 0,
    processRejected: 0,
    knowledgeRejected: 0,
    blockedDirectWrites: 0,
    sensitiveRejected: 0,
    latestAcceptedAt: null,
    latestRejectedAt: null
  };

  for (const entry of entries) {
    const decision = entry.decision;
    const target = entry.target;
    const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : null;
    const reason = typeof entry.reason === 'string' ? entry.reason : '';

    if (decision === 'accepted') {
      summary.accepted += 1;
      summary.latestAcceptedAt = pickLaterTimestamp(summary.latestAcceptedAt, timestamp);
      if (target === 'process') summary.processAccepted += 1;
      if (target === 'knowledge') summary.knowledgeAccepted += 1;
    }

    if (decision === 'rejected') {
      summary.rejected += 1;
      summary.latestRejectedAt = pickLaterTimestamp(summary.latestRejectedAt, timestamp);
      if (target === 'process') summary.processRejected += 1;
      if (target === 'knowledge') summary.knowledgeRejected += 1;
      if (/CodexMemoryBridge/i.test(reason)) summary.blockedDirectWrites += 1;
      if (/sensitive|sensitivity|secret|敏感/i.test(reason)) summary.sensitiveRejected += 1;
    }
  }

  return summary;
}

function buildRecallSummary(entries) {
  const summary = {
    sampleSize: entries.length,
    totalHits: 0,
    processHits: 0,
    knowledgeHits: 0,
    snippetHits: 0,
    fullTextHits: 0,
    directHits: 0,
    cacheHits: 0,
    latestHitAt: null,
    latestProcessHitAt: null,
    latestKnowledgeHitAt: null
  };

  for (const entry of entries) {
    const target = entry.target;
    const recallType = entry.recallType;
    const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : null;
    summary.totalHits += 1;
    summary.latestHitAt = pickLaterTimestamp(summary.latestHitAt, timestamp);
    if (entry.fromCache) summary.cacheHits += 1;
    if (target === 'process') {
      summary.processHits += 1;
      summary.latestProcessHitAt = pickLaterTimestamp(summary.latestProcessHitAt, timestamp);
    }
    if (target === 'knowledge') {
      summary.knowledgeHits += 1;
      summary.latestKnowledgeHitAt = pickLaterTimestamp(summary.latestKnowledgeHitAt, timestamp);
    }
    if (recallType === 'snippet') summary.snippetHits += 1;
    if (recallType === 'full_text') summary.fullTextHits += 1;
    if (recallType === 'direct') summary.directHits += 1;
  }

  return summary;
}

function incrementBreakdown(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function buildRecallScopeSummary(entries) {
  const summary = {
    scopedRecallCount: 0,
    strictScopedRecallCount: 0,
    latestScopedHitAt: null,
    modeBreakdown: {},
    dimensionBreakdown: {},
    projectBreakdown: {},
    clientBreakdown: {},
    visibilityBreakdown: {}
  };

  for (const entry of entries) {
    const scopeAudit = buildNormalizedScopeAudit(entry);
    if (!scopeAudit.scopeApplied) continue;

    const timestamp = typeof entry.timestamp === 'string' ? entry.timestamp : null;
    summary.scopedRecallCount += 1;
    summary.latestScopedHitAt = pickLaterTimestamp(summary.latestScopedHitAt, timestamp);

    if (scopeAudit.scopeStrict) {
      summary.strictScopedRecallCount += 1;
    }

    incrementBreakdown(summary.modeBreakdown, scopeAudit.scopeMode || 'unknown');

    for (const dimension of scopeAudit.scopeDimensions) {
      incrementBreakdown(summary.dimensionBreakdown, typeof dimension === 'string' ? dimension : null);
    }

    incrementBreakdown(summary.projectBreakdown, scopeAudit.scopeProjectId || null);
    incrementBreakdown(summary.clientBreakdown, scopeAudit.scopeClientId || null);

    for (const visibility of scopeAudit.scopeVisibility) {
      incrementBreakdown(summary.visibilityBreakdown, typeof visibility === 'string' ? visibility : null);
    }
  }

  return summary;
}

function buildNoTokenRecallSummary(summary) {
  return {
    sampleSize: summary.sampleSize,
    totalHits: summary.totalHits,
    processHits: summary.processHits,
    knowledgeHits: summary.knowledgeHits,
    snippetHits: summary.snippetHits,
    fullTextHits: summary.fullTextHits,
    directHits: summary.directHits,
    cacheHits: summary.cacheHits,
    scopedRecallCount: summary.scope?.scopedRecallCount || 0,
    strictScopedRecallCount: summary.scope?.strictScopedRecallCount || 0
  };
}

function buildNoTokenWriteSummary(summary) {
  return {
    sampleSize: summary.sampleSize,
    accepted: summary.accepted,
    rejected: summary.rejected,
    processAccepted: summary.processAccepted,
    knowledgeAccepted: summary.knowledgeAccepted,
    processRejected: summary.processRejected,
    knowledgeRejected: summary.knowledgeRejected,
    blockedDirectWrites: summary.blockedDirectWrites,
    sensitiveRejected: summary.sensitiveRejected
  };
}

function sanitizeSchemaStartupGate(schemaStartupGate) {
  if (!schemaStartupGate || typeof schemaStartupGate !== 'object') return null;
  return {
    status: typeof schemaStartupGate.status === 'string' ? schemaStartupGate.status : null,
    decision: typeof schemaStartupGate.decision === 'string' ? schemaStartupGate.decision : null,
    currentVersion: Number.isInteger(schemaStartupGate.currentVersion)
      ? schemaStartupGate.currentVersion
      : null,
    expectedVersion: Number.isInteger(schemaStartupGate.expectedVersion)
      ? schemaStartupGate.expectedVersion
      : null,
    unknownFutureVersionDetected: schemaStartupGate.unknownFutureVersionDetected === true,
    repairNeeded: schemaStartupGate.repairNeeded === true
  };
}

function sanitizeNoTokenShadowHealth(health) {
  return {
    available: health?.available === true,
    recordCount: Number.isFinite(health?.recordCount) ? health.recordCount : 0,
    chunkCount: Number.isFinite(health?.chunkCount) ? health.chunkCount : 0,
    totalChunkCount: Number.isFinite(health?.totalChunkCount) ? health.totalChunkCount : 0,
    reconcileCount: Number.isFinite(health?.reconcileCount) ? health.reconcileCount : 0,
    authoritativeStore: typeof health?.authoritativeStore === 'string' ? health.authoritativeStore : null,
    schemaStartupGate: sanitizeSchemaStartupGate(health?.schemaStartupGate),
    writeManifest: {
      total: Number.isFinite(health?.writeManifest?.total) ? health.writeManifest.total : 0,
      pending: Number.isFinite(health?.writeManifest?.pending) ? health.writeManifest.pending : 0,
      committed: Number.isFinite(health?.writeManifest?.committed) ? health.writeManifest.committed : 0,
      degraded: Number.isFinite(health?.writeManifest?.degraded) ? health.writeManifest.degraded : 0,
      repaired: Number.isFinite(health?.writeManifest?.repaired) ? health.writeManifest.repaired : 0,
      cancelled: Number.isFinite(health?.writeManifest?.cancelled) ? health.writeManifest.cancelled : 0,
      failed: Number.isFinite(health?.writeManifest?.failed) ? health.writeManifest.failed : 0,
      lifecycle: {
        sqliteCommitted: Number.isFinite(health?.writeManifest?.lifecycle?.sqliteCommitted)
          ? health.writeManifest.lifecycle.sqliteCommitted
          : 0,
        projected: Number.isFinite(health?.writeManifest?.lifecycle?.projected)
          ? health.writeManifest.lifecycle.projected
          : 0,
        audited: Number.isFinite(health?.writeManifest?.lifecycle?.audited)
          ? health.writeManifest.lifecycle.audited
          : 0,
        pendingRecovery: Number.isFinite(health?.writeManifest?.lifecycle?.pendingRecovery)
          ? health.writeManifest.lifecycle.pendingRecovery
          : 0
      }
    },
    jsonCorruption: {
      totalMalformed: Number.isFinite(health?.jsonCorruption?.totalMalformed)
        ? health.jsonCorruption.totalMalformed
        : 0
    }
  };
}

function sanitizeNoTokenIndexHealth(health) {
  return {
    available: health?.available === true,
    vectorCount: Number.isFinite(health?.vectorCount) ? health.vectorCount : 0,
    diaryVectorCount: Number.isFinite(health?.diaryVectorCount) ? health.diaryVectorCount : 0,
    embeddingCacheCount: Number.isFinite(health?.embeddingCacheCount) ? health.embeddingCacheCount : 0,
    embeddingHits: Number.isFinite(health?.embeddingHits) ? health.embeddingHits : 0,
    embeddingMisses: Number.isFinite(health?.embeddingMisses) ? health.embeddingMisses : 0
  };
}

function sanitizeNoTokenCandidateCacheHealth(health) {
  return {
    available: health?.available === true,
    entryCount: Number.isFinite(health?.entryCount) ? health.entryCount : 0,
    maxEntries: Number.isFinite(health?.maxEntries) ? health.maxEntries : null,
    ttlMs: Number.isFinite(health?.ttlMs) ? health.ttlMs : null,
    hits: Number.isFinite(health?.hits) ? health.hits : 0,
    misses: Number.isFinite(health?.misses) ? health.misses : 0,
    governanceStateRevisionTargetCount: Array.isArray(health?.governanceStateRevisionTargets)
      ? health.governanceStateRevisionTargets.length
      : 0
  };
}

function sanitizeNoTokenActiveMemoryHealth(health) {
  return {
    available: health?.available === true,
    status: typeof health?.status === 'string' ? health.status : null,
    syncMinIntervalMs: Number.isFinite(health?.syncMinIntervalMs) ? health.syncMinIntervalMs : null,
    agentCount: Number.isFinite(health?.agentCount) ? health.agentCount : 0,
    topicCount: Number.isFinite(health?.topicCount) ? health.topicCount : 0,
    conversationCount: Number.isFinite(health?.conversationCount) ? health.conversationCount : 0,
    messageCount: Number.isFinite(health?.messageCount) ? health.messageCount : 0
  };
}

function normalizeAuditEntries(entries, limit) {
  return [...entries]
    .sort((left, right) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime())
    .slice(0, limit)
    .map(entry => ({
      timestamp: entry.timestamp || null,
      decision: entry.decision || 'unknown',
      target: entry.target || null,
      title: entry.title || null,
      memoryId: entry.memoryId || null,
      reason: entry.reason || '',
      filePath: entry.filePath || null,
      agentAlias: entry.agentAlias || null,
      agentId: entry.agentId || null
    }));
}

function normalizeRecallEntries(entries, limit) {
  return [...entries]
    .sort((left, right) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime())
    .slice(0, limit)
    .map(entry => ({
      timestamp: entry.timestamp || null,
      embeddingFingerprint: entry.embeddingFingerprint || null,
      dbName: entry.dbName || null,
      target: entry.target || null,
      recallType: entry.recallType || 'unknown',
      resultCount: Number.isFinite(entry.resultCount) ? entry.resultCount : 0,
      topScore: Number.isFinite(entry.topScore) ? entry.topScore : null,
      topMemoryId: entry.topMemoryId || null,
      topMatchedTags: Array.isArray(entry.topMatchedTags) ? entry.topMatchedTags : [],
      matchedTags: Array.isArray(entry.matchedTags) ? entry.matchedTags : [],
      coreTags: Array.isArray(entry.coreTags) ? entry.coreTags : [],
      topSourceFile: entry.topSourceFile || null,
      memoryIds: Array.isArray(entry.memoryIds) ? entry.memoryIds : [],
      fromCache: !!entry.fromCache,
      sourceKinds: Array.isArray(entry.sourceKinds) ? entry.sourceKinds : [],
      sourceFiles: Array.isArray(entry.sourceFiles) ? entry.sourceFiles : [],
      candidateCount: Number.isFinite(entry.candidateCount) ? entry.candidateCount : null,
      semanticCandidateCount: Number.isFinite(entry.semanticCandidateCount) ? entry.semanticCandidateCount : null,
      timeCandidateCount: Number.isFinite(entry.timeCandidateCount) ? entry.timeCandidateCount : null,
      rerankMode: typeof entry.rerankMode === 'string' ? entry.rerankMode : null,
      rrfAlpha: Number.isFinite(entry.rrfAlpha) ? entry.rrfAlpha : null,
      queryAxes: Array.isArray(entry.queryAxes) ? entry.queryAxes : [],
      contextVectorUsed: !!entry.contextVectorUsed,
      contextSourceKinds: Array.isArray(entry.contextSourceKinds) ? entry.contextSourceKinds : [],
      contextSegmentCount: Number.isFinite(entry.contextSegmentCount) ? entry.contextSegmentCount : null,
      contextLogicDepth: Number.isFinite(entry.contextLogicDepth) ? entry.contextLogicDepth : null,
      contextSemanticWidth: Number.isFinite(entry.contextSemanticWidth) ? entry.contextSemanticWidth : null,
      contextBlendWeight: Number.isFinite(entry.contextBlendWeight) ? entry.contextBlendWeight : null
    }));
}

function buildMemoryLinks(writeEntries, recallEntries, limit = DEFAULT_LIST_LIMIT) {
  const records = new Map();
  const aliasToRecordKey = new Map();

  for (const entry of writeEntries) {
    if (entry.decision !== 'accepted') continue;
    const memoryId = typeof entry.memoryId === 'string' && entry.memoryId.trim() ? entry.memoryId.trim() : null;
    const fileKey = normalizeFileKey(entry.filePath);
    const recordKey = memoryId ? `id:${memoryId}` : (fileKey ? `path:${fileKey}` : null);
    if (!recordKey) continue;

    if (!records.has(recordKey)) {
      records.set(recordKey, {
        memoryId,
        title: buildRecordLabel(entry),
        target: entry.target || null,
        filePath: entry.filePath || null,
        writtenAt: entry.timestamp || null,
        recallCount: 0,
        cacheRecallCount: 0,
        lastRecallAt: null,
        lastTopScore: null
      });
    }

    if (memoryId) aliasToRecordKey.set(`id:${memoryId}`, recordKey);
    if (fileKey) aliasToRecordKey.set(`path:${fileKey}`, recordKey);
  }

  for (const entry of recallEntries) {
    const aliases = new Set();

    if (typeof entry.topMemoryId === 'string' && entry.topMemoryId.trim()) {
      aliases.add(`id:${entry.topMemoryId.trim()}`);
    }

    if (Array.isArray(entry.memoryIds)) {
      for (const memoryId of entry.memoryIds) {
        if (typeof memoryId === 'string' && memoryId.trim()) {
          aliases.add(`id:${memoryId.trim()}`);
        }
      }
    }

    if (typeof entry.topSourceFile === 'string' && entry.topSourceFile.trim()) {
      aliases.add(`path:${normalizeFileKey(entry.topSourceFile)}`);
    }

    if (Array.isArray(entry.sourceFiles)) {
      for (const sourceFile of entry.sourceFiles) {
        const fileKey = normalizeFileKey(sourceFile);
        if (fileKey) aliases.add(`path:${fileKey}`);
      }
    }

    const recordKeys = new Set(
      [...aliases]
        .map(alias => aliasToRecordKey.get(alias))
        .filter(Boolean)
    );

    for (const recordKey of recordKeys) {
      const record = records.get(recordKey);
      if (!record) continue;
      record.recallCount += 1;
      if (entry.fromCache) record.cacheRecallCount += 1;
      record.lastRecallAt = pickLaterTimestamp(record.lastRecallAt, entry.timestamp || null);
      if (typeof entry.topScore === 'number' && !Number.isNaN(entry.topScore)) {
        record.lastTopScore = entry.topScore;
      }
    }
  }

  return [...records.values()]
    .sort((left, right) => {
      if ((right.recallCount || 0) !== (left.recallCount || 0)) {
        return (right.recallCount || 0) - (left.recallCount || 0);
      }
      return new Date(right.lastRecallAt || 0).getTime() - new Date(left.lastRecallAt || 0).getTime();
    })
    .slice(0, limit);
}

function buildRecallStatus(summary) {
  if (!summary || summary.totalHits === 0) {
    return {
      available: true,
      status: 'enabled',
      message: 'Recall auditing is enabled. No Codex memory hits are present in the current window.'
    };
  }

  return {
    available: true,
    status: 'active',
    message: `Recall auditing is enabled. The current window contains ${summary.totalHits} Codex memory hits.`
  };
}

function buildAdaptiveProfile(writeEntries, recallEntries) {
  const diaries = [
    { dbName: PROCESS_DIARY_NAME, target: 'process' },
    { dbName: KNOWLEDGE_DIARY_NAME, target: 'knowledge' }
  ];

  return {
    enabled: true,
    profiles: diaries.map(diary => {
      const writeCount = writeEntries.filter(entry => entry.decision === 'accepted' && entry.target === diary.target).length;
      const hits = recallEntries.filter(entry => entry.target === diary.target);
      const avgTopScore = hits.length > 0
        ? hits
            .map(entry => (typeof entry.topScore === 'number' ? entry.topScore : null))
            .filter(score => score !== null)
            .reduce((sum, value, index, values) => sum + value / values.length, 0)
        : null;
      const hitRate = writeCount > 0 ? hits.length / writeCount : 0;
      return {
        dbName: diary.dbName,
        target: diary.target,
        writeCount,
        totalHits: hits.length,
        hitRate,
        avgTopScore,
        lastWriteAt: writeEntries
          .filter(entry => entry.decision === 'accepted' && entry.target === diary.target)
          .map(entry => entry.timestamp)
          .sort()
          .at(-1) || null,
        lastHitAt: hits.map(entry => entry.timestamp).sort().at(-1) || null,
        status: writeCount < 2 ? 'warming' : (hitRate >= 0.35 ? 'steady' : 'boosted'),
        reasons: writeCount < 2
          ? ['Not enough accepted writes yet.']
          : (hitRate >= 0.35 ? ['Hit rate is within the target range.'] : ['Hit rate is below the target range.'])
      };
    })
  };
}

class MemoryOverviewService {
  constructor({ config, auditLogStore, diaryStore, shadowStore, vectorStore, candidateCacheStore = null, chatHistoryIndexStore = null }) {
    this.config = config;
    this.auditLogStore = auditLogStore;
    this.diaryStore = diaryStore;
    this.shadowStore = shadowStore;
    this.vectorStore = vectorStore;
    this.candidateCacheStore = candidateCacheStore;
    this.chatHistoryIndexStore = chatHistoryIndexStore;
  }

  async getOverview({ auditWindow = DEFAULT_AUDIT_WINDOW, limit = DEFAULT_LIST_LIMIT } = {}) {
    const listLimit = toInt(limit, DEFAULT_LIST_LIMIT, 1, 50);
    const windowSize = toInt(auditWindow, DEFAULT_AUDIT_WINDOW, 10, 2000);
    const writeEntries = await this.auditLogStore.readRecentWriteAudit(windowSize);
    const recallEntries = await this.auditLogStore.readRecentRecallAudit(windowSize);
    const recallSummary = buildRecallSummary(recallEntries);
    recallSummary.scope = buildRecallScopeSummary(recallEntries);
    const shadowHealth = await this.shadowStore.getHealth();
    const vectorHealth = await this.vectorStore.getHealth();
    const candidateCacheHealth = this.candidateCacheStore
      ? await this.candidateCacheStore.getHealth()
      : { available: false };
    const activeMemoryHealth = this.chatHistoryIndexStore
      ? await this.chatHistoryIndexStore.getHealth()
      : { available: false, status: 'disabled' };

    return {
      paths: {
        auditLogPath: this.config.auditLogPath,
        recallLogPath: this.config.recallLogPath,
        processDiaryPath: path.join(this.config.dailyNoteRootPath, PROCESS_DIARY_NAME),
        knowledgeDiaryPath: path.join(this.config.dailyNoteRootPath, KNOWLEDGE_DIARY_NAME),
        dbPath: this.config.dbPath,
        vectorIndexPath: this.config.vectorIndexPath,
        chatIndexPath: this.config.chatIndexPath,
        candidateCachePath: this.config.candidateCachePath
      },
      embeddingProfile: {
        fingerprint: this.config.embeddingFingerprint,
        version: this.config.embeddingProfileVersion,
        model: this.config.embeddingModel || 'local-hash',
        provider: this.config.embeddingProvider || 'local',
        dimensions: this.config.embedDimensions,
        ragProfile: {
          available: !!this.config.ragProfile?.available,
          selectedProfile: this.config.ragProfile?.selectedProfile || null,
          error: this.config.ragProfile?.error || null
        }
      },
      summary: buildWriteSummary(writeEntries),
      recentAudit: normalizeAuditEntries(writeEntries, listLimit),
      rejectionReasons: summarizeReasons(writeEntries.filter(entry => entry.decision === 'rejected')).slice(0, 8),
      recentFiles: {
        process: await this.diaryStore.listRecentFiles('process', listLimit),
        knowledge: await this.diaryStore.listRecentFiles('knowledge', listLimit)
      },
      memoryLinks: buildMemoryLinks(writeEntries, recallEntries, listLimit),
      adaptive: buildAdaptiveProfile(writeEntries, recallEntries),
      recall: {
        ...buildRecallStatus(recallSummary),
        summary: recallSummary,
        recent: normalizeRecallEntries(recallEntries, listLimit)
      },
      shadowSync: shadowHealth,
      indexHealth: vectorHealth,
      cacheHealth: {
        candidate: candidateCacheHealth
      },
      activeMemoryHealth,
      adapterStatus: {
        codexMcp: 'enabled',
        vcpPassiveMemory: 'enabled',
        vcpActiveMemory: activeMemoryHealth.available ? 'enabled' : 'phase-c-pending'
      }
    };
  }

  async getNoTokenSelectedOverview({ auditWindow = DEFAULT_AUDIT_WINDOW } = {}) {
    const windowSize = toInt(auditWindow, DEFAULT_AUDIT_WINDOW, 10, 200);
    const writeEntries = await this.auditLogStore.readRecentWriteAudit(windowSize);
    const recallEntries = await this.auditLogStore.readRecentRecallAudit(windowSize);
    const recallSummary = buildRecallSummary(recallEntries);
    recallSummary.scope = buildRecallScopeSummary(recallEntries);
    const shadowHealth = await this.shadowStore.getHealth();
    const vectorHealth = await this.vectorStore.getHealth();
    const candidateCacheHealth = this.candidateCacheStore
      ? await this.candidateCacheStore.getHealth()
      : { available: false };
    const activeMemoryHealth = this.chatHistoryIndexStore
      ? await this.chatHistoryIndexStore.getHealth()
      : { available: false, status: 'disabled' };

    return {
      access: {
        mode: 'no_token_selected_overview',
        selectedProjection: true,
        selectedProjectionVersion: 1,
        bearerTokenRequiredForFullOverview: true,
        pathsReturned: false,
        embeddingFingerprintReturned: false,
        recentAuditReturned: false,
        recentFilesReturned: false,
        memoryLinksReturned: false,
        recallRecentReturned: false,
        rawMemoryFieldsReturned: false
      },
      summary: buildNoTokenWriteSummary(buildWriteSummary(writeEntries)),
      recall: {
        ...buildRecallStatus(recallSummary),
        summary: buildNoTokenRecallSummary(recallSummary)
      },
      shadowSync: sanitizeNoTokenShadowHealth(shadowHealth),
      indexHealth: sanitizeNoTokenIndexHealth(vectorHealth),
      cacheHealth: {
        candidate: sanitizeNoTokenCandidateCacheHealth(candidateCacheHealth)
      },
      activeMemoryHealth: sanitizeNoTokenActiveMemoryHealth(activeMemoryHealth),
      adapterStatus: {
        codexMcp: 'enabled',
        vcpPassiveMemory: 'enabled',
        vcpActiveMemory: activeMemoryHealth.available ? 'enabled' : 'phase-c-pending'
      }
    };
  }
}

module.exports = {
  MemoryOverviewService
};
