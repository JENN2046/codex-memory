const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const workspaceRoot = path.join(__dirname, '..');
const frozenPublicMcpTools = [
  'record_memory',
  'search_memory',
  'memory_overview'
];

const noTouchTargets = [
  {
    label: 'MemoryGovernanceLifecycleContract',
    path: 'src/core/MemoryGovernanceLifecycleContract.js'
  },
  {
    label: 'MemoryGovernanceApprovalPacketContract',
    path: 'src/core/MemoryGovernanceApprovalPacketContract.js'
  },
  {
    label: 'MemoryGovernanceAuditEvidenceContract',
    path: 'src/core/MemoryGovernanceAuditEvidenceContract.js'
  },
  {
    label: 'MemoryGovernanceReviewSurfaceContract',
    path: 'src/core/MemoryGovernanceReviewSurfaceContract.js'
  },
  {
    label: 'EvidenceManifestContract',
    path: 'src/core/EvidenceManifestContract.js'
  },
  {
    label: 'EvidenceRuntimeTraceContract',
    path: 'src/core/EvidenceRuntimeTraceContract.js'
  },
  {
    label: 'GovernanceLoopBoundaryContract',
    path: 'src/core/GovernanceLoopBoundaryContract.js'
  },
  {
    label: 'RecallIsolationRuntimeProofContract',
    path: 'src/core/RecallIsolationRuntimeProofContract.js'
  },
  {
    label: 'MigrationImportExportBackupRestoreApprovalContract',
    path: 'src/core/MigrationImportExportBackupRestoreApprovalContract.js'
  },
  {
    label: 'HttpRuntimeObservabilityOperationContract',
    path: 'src/core/HttpRuntimeObservabilityOperationContract.js'
  },
  {
    label: 'RcEvidenceReportContract',
    path: 'src/core/RcEvidenceReportContract.js'
  },
  {
    label: 'A5RuntimeAuthorizationPreconditionContract',
    path: 'src/core/A5RuntimeAuthorizationPreconditionContract.js'
  },
  {
    label: 'FinalRcMatrixEvaluator',
    path: 'src/core/FinalRcMatrixEvaluator.js'
  },
  {
    label: 'FinalRcRunnerCommandResultContract',
    path: 'src/core/FinalRcRunnerCommandResultContract.js'
  },
  {
    label: 'FinalRcRunnerExecutionPreflight',
    path: 'src/core/FinalRcRunnerExecutionPreflight.js'
  },
  {
    label: 'FinalRcRunnerAllowlistedExecutionAdapter',
    path: 'src/core/FinalRcRunnerAllowlistedExecutionAdapter.js'
  },
  {
    label: 'RuntimeSchemaVersionEnforcementContract',
    path: 'src/core/RuntimeSchemaVersionEnforcementContract.js'
  },
  {
    label: 'ValidationAggregatorSourceRegistryProofContract',
    path: 'src/core/ValidationAggregatorSourceRegistryProofContract.js'
  },
  {
    label: 'ValidationAggregatorEvidenceFreshnessProofContract',
    path: 'src/core/ValidationAggregatorEvidenceFreshnessProofContract.js'
  },
  {
    label: 'ValidationAggregatorBaselineBindingProofContract',
    path: 'src/core/ValidationAggregatorBaselineBindingProofContract.js'
  },
  {
    label: 'ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofContract',
    path: 'src/core/ValidationAggregatorRuntimeEvidenceSummaryNormalizationProofContract.js'
  },
  {
    label: 'ValidationAggregatorMissingStaleEvidenceFailClosedProofContract',
    path: 'src/core/ValidationAggregatorMissingStaleEvidenceFailClosedProofContract.js'
  },
  {
    label: 'ValidationAggregatorUnsupportedSourceFailClosedProofContract',
    path: 'src/core/ValidationAggregatorUnsupportedSourceFailClosedProofContract.js'
  },
  {
    label: 'ValidationAggregatorNoTouchBoundaryProofContract',
    path: 'src/core/ValidationAggregatorNoTouchBoundaryProofContract.js'
  },
  {
    label: 'ValidationAggregatorReadinessOverclaimRejectionProofContract',
    path: 'src/core/ValidationAggregatorReadinessOverclaimRejectionProofContract.js'
  },
  {
    label: 'ValidationAggregatorService',
    path: 'src/core/ValidationAggregatorService.js'
  }
];

const disallowedLoadPatterns = [
  /\brequire\(['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\)/,
  /\bfrom\s+['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]/,
  /\bimport\s*\(\s*['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\s*\)/,
  /\bmodule\s*\.\s*require\s*\(\s*['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\s*\)/,
  /\bcreateRequire\s*\(/,
  /\brequire\(['"](?:\.\.?\/)+(?:storage|recall|adapters)\//,
  /\bfrom\s+['"](?:\.\.?\/)+(?:storage|recall|adapters)\//,
  /\bimport\s*\(\s*['"](?:\.\.?\/)+(?:storage|recall|adapters)\//,
  /\bmodule\s*\.\s*require\s*\(\s*['"](?:\.\.?\/)+(?:storage|recall|adapters)\//,
  /\brequire\(['"][^'"]*(?:Sqlite|SQLite|Vector|Candidate|Recall|Provider|Embedding|Rerank)[^'"]*['"]\)/,
  /\bfrom\s+['"][^'"]*(?:Sqlite|SQLite|Vector|Candidate|Recall|Provider|Embedding|Rerank)[^'"]/,
  /\bimport\s*\(\s*['"][^'"]*(?:Sqlite|SQLite|Vector|Candidate|Recall|Provider|Embedding|Rerank)[^'"]*['"]\s*\)/,
  /\bmodule\s*\.\s*require\s*\(\s*['"][^'"]*(?:Sqlite|SQLite|Vector|Candidate|Recall|Provider|Embedding|Rerank)[^'"]*['"]\s*\)/
];

const disallowedRuntimeCalls = [
  /\breadFileSync\s*\(/,
  /\breaddirSync\s*\(/,
  /\bopendirSync\s*\(/,
  /\bcreateReadStream\s*\(/,
  /\bwriteFileSync\s*\(/,
  /\bappendFileSync\s*\(/,
  /\bcreateWriteStream\s*\(/,
  /\bmkdirSync\s*\(/,
  /\brmSync\s*\(/,
  /\bunlinkSync\s*\(/,
  /\bspawn(?:Sync)?\s*\(/,
  /\bexec(?:File)?(?:Sync)?\s*\(/,
  /\bfork\s*\(/,
  /\bfetch\s*\(/,
  /\brequest\s*\(/,
  /\bconnect\s*\(/
];

function readTargetSource(target) {
  return fs.readFileSync(path.join(workspaceRoot, target.path), 'utf8');
}

function assertTargetSourceNoTouch(target) {
  const source = readTargetSource(target);

  for (const pattern of disallowedLoadPatterns) {
    assert.equal(pattern.test(source), false, `${target.label} matches ${pattern}`);
  }

  for (const pattern of disallowedRuntimeCalls) {
    assert.equal(pattern.test(source), false, `${target.label} matches ${pattern}`);
  }
}

function assertAllTargetSourcesNoTouch() {
  for (const target of noTouchTargets) {
    assertTargetSourceNoTouch(target);
  }
}

function loadTargetModule(target) {
  return require(path.join(workspaceRoot, target.path));
}

function loadAggregatorReportBuilder() {
  const target = noTouchTargets.find(item => item.label === 'ValidationAggregatorService');
  return loadTargetModule(target).buildV1RcValidationAggregatorReport;
}

test('P50 no-touch targets do not load fs, child_process, network, runtime store, recall, or provider modules', () => {
  assertAllTargetSourcesNoTouch();
});

test('P50 no-touch targets do not introduce scan, command, network, or durable-write calls', () => {
  assertAllTargetSourcesNoTouch();
});

test('P50 no-touch targets keep public MCP surface frozen to the three existing tools', () => {
  assertAllTargetSourcesNoTouch();

  for (const target of noTouchTargets) {
    const targetModule = loadTargetModule(target);
    if (targetModule.PUBLIC_MCP_TOOLS) {
      assert.deepEqual(targetModule.PUBLIC_MCP_TOOLS, frozenPublicMcpTools, target.label);
    }
  }

  const buildV1RcValidationAggregatorReport = loadAggregatorReportBuilder();
  const aggregatorReport = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-18T00:00:00.000Z'
  });
  assert.deepEqual(aggregatorReport.public_mcp_tools, frozenPublicMcpTools);
  assert.equal(aggregatorReport.safety.publicMcpExpanded, false);
  assert.equal(aggregatorReport.safety.mcpSchemaChanged, false);
});

test('P50 no-touch regression preserves explicit non-runtime safety posture in aggregator report', () => {
  assertAllTargetSourcesNoTouch();

  const buildV1RcValidationAggregatorReport = loadAggregatorReportBuilder();
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-18T00:00:00.000Z'
  });

  assert.equal(report.decision, 'NOT_READY_BLOCKED');
  assert.equal(report.summary.runtimeReady, false);
  assert.equal(report.summary.finalRcMatrixReady, false);
  assert.equal(report.summary.rcReady, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorImportedByAggregator, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorExecutedByAggregator, false);
  assert.equal(report.summary.p45FinalRcMatrixEvaluatorFixtureReadByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evaluatorImportedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.evidenceCollectedByAggregator, false);
  assert.equal(report.evidence.p45FinalRcMatrixEvaluatorPosture.finalRcMatrixReady, false);
  assert.equal(report.safety.mutated, false);
  assert.equal(report.safety.providerCalls, 0);
  assert.equal(report.safety.serviceStarted, false);
  assert.equal(report.safety.durableMemoryTouched, false);
});
