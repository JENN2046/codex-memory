const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildV1RcValidationAggregatorReport
} = require('../src/core/ValidationAggregatorService');

const workspaceRoot = path.join(__dirname, '..');
const frozenPublicMcpTools = [
  'record_memory',
  'search_memory',
  'memory_overview'
];

const noTouchTargets = [
  {
    label: 'MemoryGovernanceLifecycleContract',
    path: 'src/core/MemoryGovernanceLifecycleContract.js',
    module: require('../src/core/MemoryGovernanceLifecycleContract')
  },
  {
    label: 'MemoryGovernanceApprovalPacketContract',
    path: 'src/core/MemoryGovernanceApprovalPacketContract.js',
    module: require('../src/core/MemoryGovernanceApprovalPacketContract')
  },
  {
    label: 'MemoryGovernanceAuditEvidenceContract',
    path: 'src/core/MemoryGovernanceAuditEvidenceContract.js',
    module: require('../src/core/MemoryGovernanceAuditEvidenceContract')
  },
  {
    label: 'MemoryGovernanceReviewSurfaceContract',
    path: 'src/core/MemoryGovernanceReviewSurfaceContract.js',
    module: require('../src/core/MemoryGovernanceReviewSurfaceContract')
  },
  {
    label: 'EvidenceManifestContract',
    path: 'src/core/EvidenceManifestContract.js',
    module: require('../src/core/EvidenceManifestContract')
  },
  {
    label: 'FinalRcMatrixEvaluator',
    path: 'src/core/FinalRcMatrixEvaluator.js',
    module: require('../src/core/FinalRcMatrixEvaluator')
  },
  {
    label: 'ValidationAggregatorService',
    path: 'src/core/ValidationAggregatorService.js',
    module: require('../src/core/ValidationAggregatorService')
  }
];

const disallowedLoadPatterns = [
  /\brequire\(['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]\)/,
  /\bfrom\s+['"](?:node:fs|fs|node:child_process|child_process|node:http|http|node:https|https|node:net|net|node:tls|tls|node:dgram|dgram|node:sqlite|sqlite3|better-sqlite3)['"]/,
  /\brequire\(['"](?:\.\.?\/)+(?:storage|recall|adapters)\//,
  /\bfrom\s+['"](?:\.\.?\/)+(?:storage|recall|adapters)\//,
  /\brequire\(['"][^'"]*(?:Sqlite|SQLite|Vector|Candidate|Recall|Provider|Embedding|Rerank)[^'"]*['"]\)/,
  /\bfrom\s+['"][^'"]*(?:Sqlite|SQLite|Vector|Candidate|Recall|Provider|Embedding|Rerank)[^'"]*['"]/
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

test('P50 no-touch targets do not load fs, child_process, network, runtime store, recall, or provider modules', () => {
  for (const target of noTouchTargets) {
    const source = readTargetSource(target);

    for (const pattern of disallowedLoadPatterns) {
      assert.equal(pattern.test(source), false, `${target.label} matches ${pattern}`);
    }
  }
});

test('P50 no-touch targets do not introduce scan, command, network, or durable-write calls', () => {
  for (const target of noTouchTargets) {
    const source = readTargetSource(target);

    for (const pattern of disallowedRuntimeCalls) {
      assert.equal(pattern.test(source), false, `${target.label} matches ${pattern}`);
    }
  }
});

test('P50 no-touch targets keep public MCP surface frozen to the three existing tools', () => {
  for (const target of noTouchTargets) {
    if (target.module.PUBLIC_MCP_TOOLS) {
      assert.deepEqual(target.module.PUBLIC_MCP_TOOLS, frozenPublicMcpTools, target.label);
    }
  }

  const aggregatorReport = buildV1RcValidationAggregatorReport({
    generatedAt: '2026-05-18T00:00:00.000Z'
  });
  assert.deepEqual(aggregatorReport.public_mcp_tools, frozenPublicMcpTools);
  assert.equal(aggregatorReport.safety.publicMcpExpanded, false);
  assert.equal(aggregatorReport.safety.mcpSchemaChanged, false);
});

test('P50 no-touch regression preserves explicit non-runtime safety posture in aggregator report', () => {
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
