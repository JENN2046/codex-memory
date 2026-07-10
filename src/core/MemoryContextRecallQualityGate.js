'use strict';

const {
  MemoryContextPackageService,
  enforceNoForbiddenOutputKeys
} = require('./MemoryContextPackageService');

const QUALITY_GATE_SCHEMA_VERSION = 'memory_context_recall_quality_gate_v1';
const REPORT_GENERATED_AT = '2026-07-10T00:00:00.000Z';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function futureDate() {
  return '2099-01-01T00:00:00.000Z';
}

function baseTask(overrides = {}) {
  return {
    title: 'Prepare task memory context',
    user_request: 'Use bounded memory context before editing codex-memory.',
    project_id: 'codex-memory',
    workspace_id: 'workspace-main',
    client_id: 'codex',
    visibility: 'project',
    repo: 'codex-memory',
    current_branch: 'main',
    strict_scope: true,
    ...overrides
  };
}

function item(overrides = {}) {
  return {
    target: 'knowledge',
    score: 0.88,
    titleHitCount: 1,
    sourceKinds: ['fixture'],
    updatedAt: futureDate(),
    scope: {
      project_id: 'codex-memory',
      workspace_id: 'workspace-main',
      client_id: 'codex',
      visibility: 'project'
    },
    lifecycleStatus: 'active',
    ...overrides
  };
}

const DEFAULT_RECALL_QUALITY_SUITE = Object.freeze([
  {
    id: 'project_fact_recall',
    label: 'project fact recall',
    task: baseTask({
      title: 'Recall codex-memory role'
    }),
    results: [
      item({
        title: 'Current state: codex-memory is the governed MCP bridge plus local fallback audit validation compatibility offline continuity layer'
      })
    ],
    expectations: [
      { kind: 'bucket_contains', bucket: 'current_state', text: 'governed MCP bridge' }
    ]
  },
  {
    id: 'historical_decision_recall',
    label: 'historical decision recall',
    task: baseTask({
      title: 'Recall architecture decision'
    }),
    results: [
      item({
        target: 'process',
        title: 'Decision: keep VCPToolBox native memory as final memory intelligence owner'
      })
    ],
    expectations: [
      { kind: 'bucket_contains', bucket: 'recent_decisions', text: 'VCPToolBox native memory' }
    ]
  },
  {
    id: 'current_blocker_recall',
    label: 'current blocker recall',
    task: baseTask({
      title: 'Recall active blocker'
    }),
    results: [
      item({
        target: 'process',
        title: 'Blocker: operator-only full surface still requires exact approval and proof gates'
      })
    ],
    expectations: [
      { kind: 'bucket_contains', bucket: 'blockers', text: 'operator-only full surface' },
      { kind: 'next_step_mentions', text: 'blocker' }
    ]
  },
  {
    id: 'user_preference_recall',
    label: 'user preference recall',
    task: baseTask({
      title: 'Recall project operating preference'
    }),
    results: [
      item({
        target: 'process',
        title: 'User preference: default response language for project work is Simplified Chinese'
      })
    ],
    expectations: [
      { kind: 'bucket_contains', bucket: 'must_know', text: 'Simplified Chinese' }
    ]
  },
  {
    id: 'stale_fact_filtering',
    label: 'stale fact filtering',
    task: baseTask({
      title: 'Detect stale memory'
    }),
    results: [
      item({
        title: 'Current state: stale older plan says public MCP surface has only seven tools',
        updatedAt: '2025-01-01T00:00:00.000Z'
      })
    ],
    expectations: [
      { kind: 'risk_reason', reason: 'stale_memory' }
    ]
  },
  {
    id: 'conflict_fact_surfacing',
    label: 'conflict fact surfacing',
    task: baseTask({
      title: 'Detect conflicting memory'
    }),
    results: [
      item({
        title: 'Conflict: older release note contradicts current no-readiness policy'
      })
    ],
    expectations: [
      { kind: 'risk_reason', reason: 'conflict_memory' }
    ]
  },
  {
    id: 'private_isolation',
    label: 'private isolation',
    task: baseTask({
      title: 'Recall only current client private facts',
      visibility: 'private'
    }),
    results: [
      item({
        title: 'Current state: current client private preference may be used',
        scope: {
          project_id: 'codex-memory',
          workspace_id: 'workspace-main',
          client_id: 'codex',
          visibility: 'private'
        }
      }),
      item({
        title: 'PRIVATE_OTHER_CLIENT_SHOULD_NOT_LEAK',
        scope: {
          project_id: 'codex-memory',
          workspace_id: 'workspace-main',
          client_id: 'claude',
          visibility: 'private'
        }
      })
    ],
    expectations: [
      { kind: 'bucket_contains', bucket: 'current_state', text: 'current client private preference' },
      { kind: 'not_serialized', text: 'PRIVATE_OTHER_CLIENT_SHOULD_NOT_LEAK' }
    ]
  },
  {
    id: 'workspace_isolation',
    label: 'workspace isolation',
    task: baseTask({
      title: 'Recall only current workspace facts',
      workspace_id: 'workspace-main'
    }),
    results: [
      item({
        title: 'Current state: workspace-main context is in scope',
        scope: {
          project_id: 'codex-memory',
          workspace_id: 'workspace-main',
          client_id: 'codex',
          visibility: 'project'
        }
      }),
      item({
        title: 'OTHER_WORKSPACE_SHOULD_NOT_LEAK',
        scope: {
          project_id: 'codex-memory',
          workspace_id: 'workspace-other',
          client_id: 'codex',
          visibility: 'project'
        }
      })
    ],
    expectations: [
      { kind: 'bucket_contains', bucket: 'current_state', text: 'workspace-main context' },
      { kind: 'not_serialized', text: 'OTHER_WORKSPACE_SHOULD_NOT_LEAK' }
    ]
  },
  {
    id: 'fallback_distinction',
    label: 'fallback distinction',
    task: baseTask({
      title: 'Distinguish fallback context package'
    }),
    searchAccess: {
      localMemoryFallbackUsed: true,
      resultCanBeMistakenForVcpNative: false
    },
    results: [
      item({
        title: 'Current state: fallback result must remain marked as local continuity'
      })
    ],
    expectations: [
      { kind: 'fallback_used', value: true },
      { kind: 'not_mistaken_for_native' }
    ]
  }
]);

function matchesScope(memoryItem, scope = {}) {
  if (!isPlainObject(memoryItem.scope) || scope.strict !== true) return true;
  for (const key of ['project_id', 'workspace_id', 'client_id', 'visibility']) {
    if (scope[key] && memoryItem.scope[key] && memoryItem.scope[key] !== scope[key]) return false;
  }
  if (memoryItem.scope.visibility === 'private' && scope.client_id && memoryItem.scope.client_id !== scope.client_id) {
    return false;
  }
  return true;
}

function visibleResult(memoryItem, scope = {}) {
  if (['tombstoned', 'superseded', 'rejected'].includes(memoryItem.lifecycleStatus)) return false;
  return matchesScope(memoryItem, scope);
}

function createFixtureService(testCase) {
  const calls = {
    search: []
  };
  const service = new MemoryContextPackageService({
    async searchMemory(args, requestContext) {
      calls.search.push({ args, requestContext });
      return {
        results: testCase.results
          .filter(result => visibleResult(result, args.scope || {}))
          .map(({ scope: _scope, lifecycleStatus: _lifecycleStatus, ...result }) => result),
        access: {
          localMemoryFallbackUsed: false,
          resultCanBeMistakenForVcpNative: false,
          ...(testCase.searchAccess || {})
        }
      };
    },
    overviewService: {
      async getAuthenticatedBoundedOverview() {
        return {
          access: { mode: 'authenticated_bounded_overview' },
          runtimePosture: { securityProfile: 'hardened' }
        };
      }
    },
    auditMemoryReadonlyService: {
      async run() {
        return {
          status: 'AUDIT_MEMORY_READONLY_BOUNDED_ACCEPTED_NOT_PUBLIC',
          access: { mode: 'audit_memory_readonly_bounded' }
        };
      }
    }
  });
  return { service, calls };
}

function bucketText(pkg, bucket) {
  return (Array.isArray(pkg[bucket]) ? pkg[bucket] : [])
    .map(entry => String(entry.statement || ''))
    .join('\n');
}

function riskReasons(pkg) {
  return (Array.isArray(pkg.risks) ? pkg.risks : [])
    .flatMap(entry => Array.isArray(entry.reason_codes) ? entry.reason_codes : []);
}

function evaluateExpectation(expectation, result) {
  const pkg = result.memory_context_package || {};
  const serialized = JSON.stringify(result);
  if (expectation.kind === 'bucket_contains') {
    return bucketText(pkg, expectation.bucket).includes(expectation.text);
  }
  if (expectation.kind === 'risk_reason') {
    return riskReasons(pkg).includes(expectation.reason);
  }
  if (expectation.kind === 'not_serialized') {
    return !serialized.includes(expectation.text);
  }
  if (expectation.kind === 'fallback_used') {
    return pkg.source_breakdown?.fallback_used === expectation.value &&
      result.access?.localMemoryFallbackUsed === expectation.value;
  }
  if (expectation.kind === 'not_mistaken_for_native') {
    return pkg.source_breakdown?.result_can_be_mistaken_for_native === false &&
      result.access?.resultCanBeMistakenForVcpNative === false;
  }
  if (expectation.kind === 'next_step_mentions') {
    return String(pkg.recommended_next_step || '').toLowerCase().includes(String(expectation.text).toLowerCase());
  }
  return false;
}

async function runQualityCase(testCase) {
  const { service, calls } = createFixtureService(testCase);
  const result = await service.prepare({
    task: testCase.task,
    options: { max_items: 6, max_bytes: 12000 }
  }, {
    executionContext: {
      requestSource: 'memory_context_recall_quality_gate'
    }
  });

  let lowDisclosurePassed = true;
  try {
    enforceNoForbiddenOutputKeys(result);
  } catch (_error) {
    lowDisclosurePassed = false;
  }

  const assertions = testCase.expectations.map(expectation => ({
    expectation,
    passed: evaluateExpectation(expectation, result)
  }));
  assertions.push({
    expectation: { kind: 'low_disclosure' },
    passed: lowDisclosurePassed &&
      result.access?.rawMemoryReturned === false &&
      result.access?.rawAuditReturned === false &&
      result.access?.providerPayloadReturned === false &&
      result.access?.durableMutationPerformed === false &&
      result.access?.productionWritePerformed === false
  });
  assertions.push({
    expectation: { kind: 'read_only_prepare_context' },
    passed: calls.search.length === 1 &&
      calls.search[0].args.include_content === false &&
      calls.search[0].requestContext.noTokenReadOnly === true
  });

  const passed = assertions.every(assertion => assertion.passed);
  return {
    id: testCase.id,
    label: testCase.label,
    status: passed ? 'PASS' : 'FAIL',
    expectedCoverage: testCase.expectations.map(expectation => expectation.kind),
    assertions,
    observed: {
      bucketCounts: {
        must_know: result.memory_context_package.must_know.length,
        recent_decisions: result.memory_context_package.recent_decisions.length,
        current_state: result.memory_context_package.current_state.length,
        blockers: result.memory_context_package.blockers.length,
        risks: result.memory_context_package.risks.length,
        forbidden_assumptions: result.memory_context_package.forbidden_assumptions.length
      },
      fallback_used: result.memory_context_package.source_breakdown.fallback_used,
      result_can_be_mistaken_for_native: result.memory_context_package.source_breakdown.result_can_be_mistaken_for_native,
      search_result_count: result.memory_context_package.source_breakdown.search_result_count,
      recommended_next_step: result.memory_context_package.recommended_next_step
    }
  };
}

async function runMemoryContextRecallQualityGate({ suite = DEFAULT_RECALL_QUALITY_SUITE } = {}) {
  const cases = [];
  for (const testCase of suite) {
    cases.push(await runQualityCase(testCase));
  }
  const passed = cases.every(testCase => testCase.status === 'PASS');
  return {
    schemaVersion: QUALITY_GATE_SCHEMA_VERSION,
    generated_at: REPORT_GENERATED_AT,
    status: passed ? 'PASS' : 'FAIL',
    summary: {
      total: cases.length,
      passed: cases.filter(testCase => testCase.status === 'PASS').length,
      failed: cases.filter(testCase => testCase.status !== 'PASS').length
    },
    coverage: [
      'project_fact_recall',
      'historical_decision_recall',
      'current_blocker_recall',
      'user_preference_recall',
      'stale_fact_filtering',
      'conflict_fact_surfacing',
      'private_isolation',
      'workspace_isolation',
      'fallback_distinction'
    ],
    access: {
      fixtureOnly: true,
      readOnly: true,
      durableMutationPerformed: false,
      productionWritePerformed: false,
      providerApiCalled: false,
      vcpToolBoxRuntimeCalled: false,
      mcpMemoryToolCalled: false,
      rawMemoryRead: false,
      rawAuditRead: false,
      readinessClaimed: false
    },
    nonClaims: {
      productionRecallQuality: false,
      liveRuntimeProof: false,
      nativeReadProof: false,
      nativeWriteProof: false,
      fullPlanPackCompletion: false
    },
    cases
  };
}

function renderRecallQualityMarkdown(report) {
  const lines = [
    '# Recall Quality Report',
    '',
    `Schema: \`${report.schemaVersion}\``,
    `Generated: \`${report.generated_at}\``,
    `Status: \`${report.status}\``,
    '',
    'This is a fixture/local dry-run quality baseline for `prepare_memory_context`. It does not read real private memory, call VCPToolBox runtime, call providers, write memory, or prove production recall quality.',
    '',
    '| Case | Status | Evidence |',
    '|---|---:|---|'
  ];
  for (const testCase of report.cases) {
    const evidence = [
      `search_result_count=${testCase.observed.search_result_count}`,
      `fallback_used=${testCase.observed.fallback_used}`,
      `native_confusion=${testCase.observed.result_can_be_mistaken_for_native}`
    ].join('; ');
    lines.push(`| ${testCase.label} | \`${testCase.status}\` | ${evidence} |`);
  }
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push('- Fixture/local dry-run only.');
  lines.push('- Read-only context package path only.');
  lines.push('- No durable mutation, production write, provider/API call, MCP memory tool call, raw memory read, raw audit read, VCPToolBox runtime call, release/deploy/cutover, or readiness claim.');
  lines.push('- VCPToolBox native memory remains the final memory intelligence owner; local context packaging remains fallback/audit/validation/compat/offline continuity.');
  return `${lines.join('\n')}\n`;
}

module.exports = {
  DEFAULT_RECALL_QUALITY_SUITE,
  QUALITY_GATE_SCHEMA_VERSION,
  renderRecallQualityMarkdown,
  runMemoryContextRecallQualityGate
};
