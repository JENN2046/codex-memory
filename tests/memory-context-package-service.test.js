const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  MemoryContextPackageService,
  enforceNoForbiddenOutputKeys
} = require('../src/core/MemoryContextPackageService');

function createService({ results = [], searchAccess = {}, audit = {}, overview = {} } = {}) {
  const calls = {
    search: [],
    overview: 0,
    audit: []
  };
  const service = new MemoryContextPackageService({
    async searchMemory(args, requestContext) {
      calls.search.push({ args, requestContext });
      return {
        results,
        access: searchAccess
      };
    },
    overviewService: {
      async getAuthenticatedBoundedOverview() {
        calls.overview += 1;
        return {
          access: { mode: 'authenticated_bounded_overview' },
          runtimePosture: { securityProfile: 'hardened' },
          ...overview
        };
      }
    },
    auditMemoryReadonlyService: {
      async run(args) {
        calls.audit.push(args);
        return {
          status: 'AUDIT_MEMORY_READONLY_BOUNDED_ACCEPTED_NOT_PUBLIC',
          access: { mode: 'audit_memory_readonly_bounded' },
          ...audit
        };
      }
    }
  });
  return { service, calls };
}

function baseInput(extra = {}) {
  return {
    task: {
      title: 'Implement governed memory context',
      user_request: 'Use the plan pack and keep default runtime read-only.',
      project_id: 'codex-memory',
      scope_id: 'scope-a',
      workspace_id: 'workspace-a',
      client_id: 'codex',
      visibility: 'project',
      repo: 'codex-memory',
      current_branch: 'main',
      current_files: ['src/app.js'],
      ...extra.task
    },
    options: {
      max_items: 6,
      max_bytes: 12000,
      ...extra.options
    }
  };
}

test('prepare_memory_context builds a low-disclosure task context package from bounded recall', async () => {
  const { service, calls } = createService({
    results: [
      {
        target: 'knowledge',
        title: 'Current state: prepare_memory_context is the next milestone',
        score: 0.9,
        titleHitCount: 1,
        tagHitCount: 1,
        matchedTags: ['context-package'],
        sourceKinds: ['rag'],
        updatedAt: new Date().toISOString()
      },
      {
        target: 'process',
        title: 'Decision: keep VCPToolBox native memory as owner',
        score: 0.8,
        titleHitCount: 1,
        sourceKinds: ['time'],
        updatedAt: new Date().toISOString()
      },
      {
        target: 'process',
        title: 'Blocker: hardened explicit tools bypass must stay fixed',
        score: 0.7,
        contentHitCount: 1,
        sourceKinds: ['rag'],
        updatedAt: new Date().toISOString()
      }
    ]
  });

  const result = await service.prepare(baseInput(), {
    executionContext: { requestSource: 'unit-test' }
  });

  assert.equal(result.accepted, true);
  assert.equal(result.access.mode, 'prepare_memory_context_readonly');
  assert.equal(result.access.durableMutationPerformed, false);
  assert.equal(result.access.rawMemoryReturned, false);
  assert.equal(result.access.memoryIdsReturned, false);
  assert.equal(result.memory_context_package.current_state.length, 1);
  assert.equal(result.memory_context_package.recent_decisions.length, 1);
  assert.equal(result.memory_context_package.blockers.length, 1);
  assert.equal(result.memory_context_package.source_breakdown.reused_surfaces.includes('KnowledgeBaseRecallPipeline'), true);
  assert.equal(result.memory_context_package.source_breakdown.reused_surfaces.includes('CandidateGenerator'), true);
  assert.equal(result.memory_context_package.source_breakdown.reused_surfaces.includes('TagMemoEngine'), true);
  assert.equal(result.memory_context_package.source_breakdown.vcp_toolbox_native_memory_owner, true);
  assert.equal(calls.search[0].args.include_content, false);
  assert.equal(calls.search[0].requestContext.noTokenReadOnly, true);
  assert.equal(calls.audit[0].include_raw, false);
  enforceNoForbiddenOutputKeys(result);
});

test('prepare_memory_context labels fallback and cannot be mistaken for native realtime', async () => {
  const { service } = createService({
    searchAccess: {
      localMemoryFallbackUsed: true,
      resultCanBeMistakenForVcpNative: false
    },
    results: [
      {
        target: 'process',
        title: 'Fallback current state signal',
        score: 0.6,
        updatedAt: new Date().toISOString()
      }
    ]
  });

  const result = await service.prepare(baseInput());

  assert.equal(result.access.localMemoryFallbackUsed, true);
  assert.equal(result.access.resultCanBeMistakenForVcpNative, false);
  assert.equal(result.memory_context_package.source_breakdown.fallback_used, true);
  assert.equal(result.memory_context_package.source_breakdown.result_can_be_mistaken_for_native, false);
  assert.equal(result.memory_context_package.audit_receipt.fallback_used, true);
});

test('prepare_memory_context handles empty memory without mutation or readiness claims', async () => {
  const { service } = createService({ results: [] });

  const result = await service.prepare(baseInput());

  assert.deepEqual(result.memory_context_package.must_know, []);
  assert.match(result.memory_context_package.recommended_next_step, /no relevant memory context/i);
  assert.equal(result.nonClaims.productionReadiness, false);
  assert.equal(result.nonClaims.productionWriteReady, false);
  assert.equal(result.access.productionWritePerformed, false);
});

test('prepare_memory_context surfaces stale and conflict candidates as risks', async () => {
  const { service } = createService({
    results: [
      {
        target: 'knowledge',
        title: 'Conflict: older plan contradicts current default runtime policy',
        score: 0.5,
        updatedAt: '2025-01-01T00:00:00.000Z'
      }
    ]
  });

  const result = await service.prepare(baseInput());
  const riskReasons = result.memory_context_package.risks.flatMap(item => item.reason_codes);

  assert.equal(riskReasons.includes('stale_memory'), true);
  assert.equal(riskReasons.includes('conflict_memory'), true);
});

test('prepare_memory_context applies scope and bounded compression', async () => {
  const { service, calls } = createService({
    results: Array.from({ length: 10 }, (_, index) => ({
      target: 'process',
      title: `Current state memory ${index} `.repeat(30),
      score: 0.4,
      updatedAt: new Date().toISOString()
    }))
  });

  const result = await service.prepare(baseInput({
    options: {
      max_items: 10,
      max_bytes: 1800
    }
  }));

  assert.equal(calls.search[0].args.scope.project_id, 'codex-memory');
  assert.equal(calls.search[0].args.scope.scope_id, 'scope-a');
  assert.equal(calls.search[0].args.scope.client_id, 'codex');
  assert.equal(calls.search[0].args.scope.strict, true);
  assert.equal(Buffer.byteLength(JSON.stringify(result), 'utf8') <= 1800, true);
  assert.equal(result.compression.applied, true);
  enforceNoForbiddenOutputKeys(result);
});

test('prepare_memory_context enforces the minimum max_bytes budget with a minimal envelope', async () => {
  const { service } = createService({ results: [] });
  const result = await service.prepare(baseInput({
    options: {
      max_bytes: 1200
    }
  }));

  assert.equal(Buffer.byteLength(JSON.stringify(result), 'utf8') <= 1200, true);
  assert.equal(result.compression.applied, true);
  assert.equal(result.compression.mode, 'minimal_bounded_envelope');
  assert.equal(result.access.rawMemoryReturned, false);
  assert.equal(result.access.readinessClaimed, false);
  enforceNoForbiddenOutputKeys(result);
});

test('prepare_memory_context redacts sensitive fragments from returned statements', async () => {
  const { service } = createService({
    results: [
      {
        target: 'knowledge',
        title: 'Secret token=abc123456789 and path /home/jenn/private/file should not return',
        score: 0.9,
        updatedAt: new Date().toISOString()
      }
    ]
  });

  const result = await service.prepare(baseInput());
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes('abc123456789'), false);
  assert.equal(serialized.includes('/home/jenn/private/file'), false);
  assert.equal(serialized.includes('<redacted>'), true);
});
