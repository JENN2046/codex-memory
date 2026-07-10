'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  inspectBoundedSearchEvidenceShape,
  inspectSearchMemoryResponseShape
} = require('../src/core/SearchMemoryResponseSanitizer');
const { TOOL_DEFINITIONS } = require('../src/core/constants');

function mcpResponse(structuredContent, wrapperText = '{"results":[]}') {
  return {
    jsonrpc: '2.0',
    id: 3,
    result: {
      content: [
        {
          type: 'text',
          text: wrapperText
        }
      ],
      structuredContent,
      isError: false
    }
  };
}

function violationPaths(result) {
  return result.violations.map(item => item.path);
}

function publicToolNames() {
  return TOOL_DEFINITIONS.map(tool => tool.name);
}

test('search memory sanitizer allows MCP wrapper content when structuredContent is safe', () => {
  const result = inspectSearchMemoryResponseShape(mcpResponse({ results: [] }, '{"content":"wrapper text is ignored"}'));

  assert.equal(result.accepted, true);
  assert.equal(result.resultCount, 0);
  assert.equal(result.wrapperContentIgnored, true);
  assert.deepEqual(result.violations, []);
});

test('search memory sanitizer rejects actual result item raw content fields', () => {
  const rawKeys = ['content', 'text', 'snippet', 'raw_text'];

  for (const key of rawKeys) {
    const result = inspectSearchMemoryResponseShape(mcpResponse({
      results: [
        {
          target: 'both',
          score: 0.5,
          [key]: 'synthetic raw value'
        }
      ]
    }));

    assert.equal(result.accepted, false);
    assert.deepEqual(violationPaths(result), [`result.structuredContent.results[0].${key}`]);
  }
});

test('search memory sanitizer rejects file path audit and store metadata', () => {
  const result = inspectSearchMemoryResponseShape(mcpResponse({
    results: [
      {
        target: 'both',
        score: 0.5,
        filePath: 'synthetic/path.md'
      },
      {
        target: 'process',
        score: 0.4,
        auditLogPath: 'logs/recall-audit.jsonl'
      },
      {
        target: 'project',
        score: 0.3,
        sourceFile: 'synthetic/source.md'
      }
    ]
  }));

  assert.equal(result.accepted, false);
  assert.deepEqual(violationPaths(result), [
    'result.structuredContent.results[0].filePath',
    'result.structuredContent.results[1].auditLogPath',
    'result.structuredContent.results[2].sourceFile'
  ]);
});

test('search memory sanitizer allows empty results', () => {
  const result = inspectSearchMemoryResponseShape(mcpResponse({ results: [] }));

  assert.equal(result.accepted, true);
  assert.equal(result.resultCount, 0);
  assert.deepEqual(result.violations, []);
});

test('search memory sanitizer allows count and score style safe result fields', () => {
  const result = inspectSearchMemoryResponseShape(mcpResponse({
    results: [
      {
        target: 'project',
        score: 0.5,
        baseScore: 0.4,
        rerankScore: null,
        matchedTags: [],
        coreTags: [],
        titleHitCount: 0,
        tagHitCount: 0,
        contentHitCount: 0,
        evidenceHitCount: 0,
        exactCoreTagCount: 0,
        tagMemoSurfaceScore: 0,
        dynamicCoreWeight: 0,
        createdAt: '2026-06-03T00:00:00.000Z',
        updatedAt: '2026-06-03T00:00:00.000Z',
        sourceKinds: ['synthetic']
      }
    ]
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.resultCount, 1);
  assert.deepEqual(result.violations, []);
});

test('search memory sanitizer identifies exact key path for memory id and title leakage', () => {
  const result = inspectSearchMemoryResponseShape(mcpResponse({
    results: [
      {
        target: 'process',
        score: 0.5,
        memoryId: 'synthetic-id',
        title: 'synthetic title'
      }
    ]
  }));

  assert.equal(result.accepted, false);
  assert.deepEqual(violationPaths(result), [
    'result.structuredContent.results[0].memoryId',
    'result.structuredContent.results[0].title'
  ]);
});

test('bounded search evidence collector does not infer memory ids from safe access flag key', () => {
  const result = inspectBoundedSearchEvidenceShape(mcpResponse({
    access: {
      mode: 'authenticated_bounded_search',
      selectedProjection: true,
      includeContent: false,
      rawContentReturned: false,
      pathsReturned: false,
      memoryIdsReturned: false,
      titlesReturned: false,
      snippetsReturned: false
    },
    resultCount: 1,
    results: [
      {
        target: 'both',
        score: 0.75,
        baseScore: 0.7,
        rerankScore: null,
        titleHitCount: 0,
        tagHitCount: 1,
        contentHitCount: 0,
        evidenceHitCount: 0,
        exactCoreTagCount: 0,
        tagMemoSurfaceScore: 0,
        dynamicCoreWeight: 0,
        sourceKinds: ['synthetic']
      }
    ]
  }, '{"content":"wrapper text can mention memoryId without becoming evidence"}'));

  assert.equal(result.accepted, true);
  assert.equal(result.resultCount, 1);
  assert.equal(result.resultsLength, 1);
  assert.equal(result.wrapperContentIgnored, true);
  assert.equal(result.flags.memoryIdsReturned, false);
  assert.equal(result.flags.rawContentReturned, false);
  assert.deepEqual(result.violations, []);
  assert.equal(result.structuredKeyPaths.includes('result.structuredContent.access.memoryIdsReturned'), true);
});

test('bounded search evidence collector fails when structured access reports memory ids returned', () => {
  const result = inspectBoundedSearchEvidenceShape(mcpResponse({
    access: {
      mode: 'authenticated_bounded_search',
      selectedProjection: true,
      includeContent: false,
      rawContentReturned: false,
      pathsReturned: false,
      memoryIdsReturned: true,
      titlesReturned: false,
      snippetsReturned: false
    },
    resultCount: 1,
    results: [
      {
        target: 'both',
        score: 0.75,
        sourceKinds: ['synthetic']
      }
    ]
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.flags.memoryIdsReturned, true);
  assert.deepEqual(violationPaths(result), [
    'result.structuredContent.access.memoryIdsReturned'
  ]);
});

test('bounded search evidence collector fails when result item carries memory id field', () => {
  const result = inspectBoundedSearchEvidenceShape(mcpResponse({
    access: {
      mode: 'authenticated_bounded_search',
      selectedProjection: true,
      includeContent: false,
      rawContentReturned: false,
      pathsReturned: false,
      memoryIdsReturned: false,
      titlesReturned: false,
      snippetsReturned: false
    },
    resultCount: 1,
    results: [
      {
        target: 'both',
        score: 0.75,
        memoryId: 'synthetic-id'
      }
    ]
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.flags.memoryIdsReturned, true);
  assert.deepEqual(violationPaths(result), [
    'result.structuredContent.results[0].memoryId'
  ]);
});

test('bounded search projection regression rejects lifecycle and mutation status fields', () => {
  const result = inspectBoundedSearchEvidenceShape(mcpResponse({
    access: {
      mode: 'authenticated_bounded_search',
      selectedProjection: true,
      includeContent: false,
      rawContentReturned: false,
      pathsReturned: false,
      memoryIdsReturned: false,
      titlesReturned: false,
      snippetsReturned: false
    },
    resultCount: 1,
    results: [
      {
        target: 'both',
        score: 0.75,
        lifecycleStatus: 'active',
        mutationStatus: 'pending',
        fromStatus: 'proposal',
        toStatus: 'active',
        newFromStatus: 'stale',
        newToStatus: 'active',
        accepted: true,
        decision: 'dry-run'
      }
    ]
  }));

  assert.equal(result.accepted, false);
  assert.deepEqual(violationPaths(result), [
    'result.structuredContent.results[0].lifecycleStatus',
    'result.structuredContent.results[0].mutationStatus',
    'result.structuredContent.results[0].fromStatus',
    'result.structuredContent.results[0].toStatus',
    'result.structuredContent.results[0].newFromStatus',
    'result.structuredContent.results[0].newToStatus',
    'result.structuredContent.results[0].accepted',
    'result.structuredContent.results[0].decision'
  ]);
});

test('bounded search projection regression rejects client boundary fields in result items', () => {
  const result = inspectBoundedSearchEvidenceShape(mcpResponse({
    access: {
      mode: 'authenticated_bounded_search',
      selectedProjection: true,
      includeContent: false,
      rawContentReturned: false,
      pathsReturned: false,
      memoryIdsReturned: false,
      titlesReturned: false,
      snippetsReturned: false
    },
    resultCount: 1,
    results: [
      {
        target: 'project',
        score: 0.5,
        clientId: 'codex',
        client_id: 'codex',
        actorClientId: 'codex',
        workspaceId: 'A:/codex-memory',
        projectId: 'codex-memory',
        visibility: 'private'
      }
    ]
  }));

  assert.equal(result.accepted, false);
  assert.deepEqual(violationPaths(result), [
    'result.structuredContent.results[0].clientId',
    'result.structuredContent.results[0].client_id',
    'result.structuredContent.results[0].actorClientId',
    'result.structuredContent.results[0].workspaceId',
    'result.structuredContent.results[0].projectId',
    'result.structuredContent.results[0].visibility'
  ]);
});

test('bounded search projection regression keeps public MCP surface unchanged', () => {
  assert.deepEqual(publicToolNames(), [
    'record_memory',
    'search_memory',
    'memory_overview',
    'audit_memory',
  'prepare_memory_context',
'propose_memory_delta',
'validate_memory',
    'tombstone_memory',
    'supersede_memory'
  ]);
});
