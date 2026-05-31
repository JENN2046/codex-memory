'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { MemoryOverviewService } = require('../src/core/MemoryOverviewService');

test('no-token selected overview sanitizes core overview dependencies directly', async () => {
  const service = new MemoryOverviewService({
    config: {
      auditLogPath: 'A:/sensitive/logs/audit.jsonl',
      recallLogPath: 'A:/sensitive/logs/recall.jsonl',
      dailyNoteRootPath: 'A:/sensitive/dailynote',
      dbPath: 'A:/sensitive/data/shadow.sqlite',
      vectorIndexPath: 'A:/sensitive/data/vector.json',
      chatIndexPath: 'A:/sensitive/data/chat.json',
      candidateCachePath: 'A:/sensitive/data/cache.json',
      embeddingFingerprint: 'raw-fingerprint-should-not-leak',
      embeddingProfileVersion: 9,
      embeddingModel: 'provider-model-should-not-leak',
      embeddingProvider: 'provider-name-should-not-leak',
      embedDimensions: 1024
    },
    auditLogStore: {
      readRecentWriteAudit: async () => [
        {
          timestamp: '2026-06-01T01:00:00.000Z',
          decision: 'accepted',
          target: 'process',
          title: 'raw title should not leak',
          memoryId: 'raw-memory-id-should-not-leak',
          filePath: 'A:/sensitive/dailynote/process/raw.md',
          reason: 'accepted'
        },
        {
          timestamp: '2026-06-01T02:00:00.000Z',
          decision: 'rejected',
          target: 'knowledge',
          title: 'secret rejection title should not leak',
          memoryId: 'raw-rejected-id-should-not-leak',
          filePath: 'A:/sensitive/dailynote/knowledge/rejected.md',
          reason: 'secret rejection reason should be counted only'
        }
      ],
      readRecentRecallAudit: async () => [
        {
          timestamp: '2026-06-01T03:00:00.000Z',
          target: 'process',
          recallType: 'snippet',
          fromCache: true,
          embeddingFingerprint: 'recall-fingerprint-should-not-leak',
          topMemoryId: 'top-memory-id-should-not-leak',
          memoryIds: ['memory-id-list-should-not-leak'],
          topSourceFile: 'A:/sensitive/dailynote/process/raw.md',
          sourceFiles: ['A:/sensitive/dailynote/process/raw.md'],
          scopeApplied: true,
          scopeStrict: true,
          scopeMode: 'project',
          scopeProjectId: 'project-id-should-not-leak',
          scopeClientId: 'client-id-should-not-leak',
          scopeVisibility: ['private-visibility-should-not-leak']
        }
      ]
    },
    diaryStore: {
      listRecentFiles: async () => {
        throw new Error('no-token selected overview must not list recent diary files');
      }
    },
    shadowStore: {
      getHealth: async () => ({
        available: true,
        recordCount: 2,
        chunkCount: 3,
        totalChunkCount: 4,
        reconcileCount: 1,
        authoritativeStore: 'sqlite',
        dbPath: 'A:/sensitive/data/shadow.sqlite',
        schemaStartupGate: {
          status: 'accepted',
          decision: 'current_schema_accepted',
          currentVersion: 1,
          expectedVersion: 1,
          unknownFutureVersionDetected: false,
          repairNeeded: false,
          dbPath: 'A:/sensitive/data/shadow.sqlite'
        },
        writeManifest: {
          total: 2,
          pending: 0,
          committed: 2,
          degraded: 0,
          repaired: 0,
          cancelled: 0,
          failed: 0,
          lifecycle: {
            sqliteCommitted: 2,
            projected: 2,
            audited: 2,
            pendingRecovery: 0,
            memoryIds: ['manifest-memory-id-should-not-leak']
          }
        },
        jsonCorruption: {
          totalMalformed: 0,
          filePath: 'A:/sensitive/malformed.json'
        }
      })
    },
    vectorStore: {
      getHealth: async () => ({
        available: true,
        vectorCount: 2,
        diaryVectorCount: 1,
        embeddingCacheCount: 1,
        embeddingHits: 5,
        embeddingMisses: 2,
        embeddingFingerprint: 'vector-fingerprint-should-not-leak',
        indexPath: 'A:/sensitive/vector.json'
      })
    },
    candidateCacheStore: {
      getHealth: async () => ({
        available: true,
        entryCount: 2,
        maxEntries: 100,
        ttlMs: 60000,
        hits: 3,
        misses: 1,
        governanceStateRevisionTargets: [
          { memoryId: 'cache-memory-id-should-not-leak', filePath: 'A:/sensitive/cache.json' }
        ]
      })
    },
    chatHistoryIndexStore: {
      getHealth: async () => ({
        available: true,
        status: 'ready',
        syncMinIntervalMs: 1000,
        agentCount: 1,
        topicCount: 2,
        conversationCount: 3,
        messageCount: 4,
        chatIndexPath: 'A:/sensitive/chat.json'
      })
    }
  });

  const overview = await service.getNoTokenSelectedOverview();
  const serialized = JSON.stringify(overview);

  assert.equal(overview.access.mode, 'no_token_selected_overview');
  assert.equal(overview.access.selectedProjection, true);
  assert.equal(overview.access.selectedProjectionVersion, 1);
  assert.equal(overview.summary.accepted, 1);
  assert.equal(overview.summary.rejected, 1);
  assert.equal(overview.summary.sensitiveRejected, 1);
  assert.equal(overview.summary.latestAcceptedAt, undefined);
  assert.equal(overview.summary.latestRejectedAt, undefined);
  assert.equal(overview.recall.summary.totalHits, 1);
  assert.equal(overview.recall.summary.scopedRecallCount, 1);
  assert.equal(overview.shadowSync.schemaStartupGate.currentVersion, 1);
  assert.equal(overview.cacheHealth.candidate.governanceStateRevisionTargetCount, 1);

  assert.doesNotMatch(serialized, /"paths"\s*:/);
  assert.doesNotMatch(serialized, /"embeddingProfile"\s*:/);
  assert.doesNotMatch(serialized, /"latestAcceptedAt"\s*:/);
  assert.doesNotMatch(serialized, /"latestRejectedAt"\s*:/);
  assert.doesNotMatch(serialized, /"recentAudit"\s*:/);
  assert.doesNotMatch(serialized, /"recentFiles"\s*:/);
  assert.doesNotMatch(serialized, /"memoryLinks"\s*:/);
  assert.doesNotMatch(serialized, /"recent"\s*:/);
  assert.doesNotMatch(serialized, /"memoryId"\s*:/);
  assert.doesNotMatch(serialized, /"memoryIds"\s*:/);
  assert.doesNotMatch(serialized, /"title"\s*:/);
  assert.doesNotMatch(serialized, /"filePath"\s*:/);
  assert.doesNotMatch(serialized, /"sourceFile"\s*:/);
  assert.doesNotMatch(serialized, /"sourceFiles"\s*:/);
  assert.doesNotMatch(serialized, /"embeddingFingerprint"\s*:/);
  assert.doesNotMatch(serialized, /"auditLogPath"\s*:/);
  assert.doesNotMatch(serialized, /"dbPath"\s*:/);
  assert.doesNotMatch(serialized, /raw-memory-id-should-not-leak/);
  assert.doesNotMatch(serialized, /raw title should not leak/);
  assert.doesNotMatch(serialized, /A:\/sensitive/);
  assert.doesNotMatch(serialized, /fingerprint-should-not-leak/);
  assert.doesNotMatch(serialized, /project-id-should-not-leak/);
  assert.doesNotMatch(serialized, /client-id-should-not-leak/);
  assert.doesNotMatch(serialized, /2026-06-01T01:00:00\.000Z/);
  assert.doesNotMatch(serialized, /2026-06-01T02:00:00\.000Z/);
});
