'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  inspectSearchMemoryResponseShape
} = require('../src/core/SearchMemoryResponseSanitizer');

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
