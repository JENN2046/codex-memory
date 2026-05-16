const { TOOL_DEFINITIONS } = require('./constants');

const DECISION_LABELS = [
  'READY_FOR_V1_0_RC',
  'READY_FOR_DOCS_ONLY_RC_REVIEW',
  'A4_SAFE_SLICE_PASSED',
  'BLOCKED_RUNTIME_REQUIRED',
  'BLOCKED_A5_REQUIRED',
  'NOT_READY_BLOCKED'
];

const PUBLIC_MCP_TOOLS = TOOL_DEFINITIONS.map(tool => tool.name);

function createCheck({
  status,
  requiredBeforeV1Rc = false,
  blocksV1Rc = false,
  blocksV1Release = false,
  a4Safe = false,
  a5Gated = false,
  runtimeRequired = false,
  conditionalLive = false,
  evidence = null
}) {
  return {
    status,
    requiredBeforeV1Rc,
    ...(blocksV1Rc ? { blocksV1Rc } : {}),
    ...(blocksV1Release ? { blocksV1Release } : {}),
    ...(a4Safe ? { a4Safe } : {}),
    ...(a5Gated ? { a5Gated } : {}),
    ...(runtimeRequired ? { runtimeRequired } : {}),
    ...(conditionalLive ? { conditionalLive } : {}),
    ...(evidence ? { evidence } : {})
  };
}

function buildBlocker(id, { status, category, requiresA5 = false, requiresRuntimeImplementation = false }) {
  return {
    id,
    status,
    category,
    requiresA5,
    requiresRuntimeImplementation
  };
}

function buildV1RcValidationAggregatorReport({
  generatedAt = new Date().toISOString()
} = {}) {
  return {
    schemaVersion: 'v1-rc-validation-aggregator-v1',
    version: 'v1',
    phase: 'P24.2-validation-aggregator-minimal-implementation',
    mode: 'read-only',
    generated_at: generatedAt,
    source: {
      kind: 'minimal-implementation',
      synthetic: false,
      realMemoryPreview: false
    },
    decision: 'NOT_READY_BLOCKED',
    decisionContract: {
      allowed: DECISION_LABELS,
      readyRequires: [
        'full_final_rc_matrix_executed',
        'validation_aggregator_full_implementation_completed',
        'schema_version_runtime_enforcement_implemented',
        'required_a5_authorizations_resolved'
      ],
      currentMustNotBe: [
        'READY_FOR_V1_0_RC'
      ]
    },
    summary: {
      a4SafeSlice: 'A4_SAFE_SLICE_PASSED',
      fullFinalRcMatrixExecuted: false,
      liveMcpHttpEvidenceRefreshed: false,
      validationAggregatorImplemented: true,
      validationAggregatorFullImplementation: false,
      schemaVersionRuntimeEnforcementImplemented: false,
      productionDeployPerformed: false,
      startupWatchdogInstalled: false,
      codexClaudeConfigSwitched: false,
      providerExecuted: false,
      migrationImportExportApplyPerformed: false,
      durableMemoryMutationExpansionPerformed: false,
      pushTagReleaseDeployPerformed: false
    },
    checks: {
      gitHygiene: createCheck({
        status: 'not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true
      }),
      docsValidation: createCheck({
        status: 'not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true
      }),
      p2DocsWhitespace: createCheck({
        status: 'not_executed',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true
      }),
      mcpContract: createCheck({
        status: 'recorded_historical',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true,
        evidence: 'P22 local HTTP MCP evidence recorded; P23.12 did not refresh live evidence.'
      }),
      publicMcpTools: createCheck({
        status: 'pass',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        a4Safe: true
      }),
      schemaVersionRuntimeEnforcement: createCheck({
        status: 'planned_not_implemented',
        requiredBeforeV1Rc: true,
        blocksV1Rc: true,
        runtimeRequired: true
      }),
      validationAggregatorExecutable: createCheck({
        status: 'minimal_implemented',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        runtimeRequired: true
      }),
      conditionalLiveMcpHttp: createCheck({
        status: 'not_executed_service_not_running',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        conditionalLive: true
      }),
      migrationImportExportApply: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      providerExecution: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      startupWatchdog: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      clientConfigSwitch: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      productionDeploy: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      }),
      pushTagReleaseDeploy: createCheck({
        status: 'blocked_pending_a5',
        blocksV1Release: true,
        a5Gated: true
      })
    },
    a4_safe: [
      'gitHygiene',
      'docsValidation',
      'p2DocsWhitespace',
      'docsStatusBoardConsistency',
      'schemaVersionDocsReview',
      'clientBoundaryDocsReview',
      'migrationImportExportBoundaryDocsReview',
      'rcChecklistAlignmentReview',
      'publicMcpToolFreezeReview'
    ],
    a5_gated: [
      'migrationImportExportApply',
      'providerExecution',
      'startupWatchdog',
      'clientConfigSwitch',
      'productionDeploy',
      'durableMemoryMutationExpansion',
      'destructiveRollbackExecution',
      'pushTagReleaseDeploy'
    ],
    runtime_required: [
      'validationAggregatorFullImplementation',
      'schemaVersionRuntimeEnforcement'
    ],
    conditional_live: [
      'health',
      'initializeToolsList',
      'observeHttp',
      'mcpHttpTests'
    ],
    public_mcp_tools: PUBLIC_MCP_TOOLS,
    evidence: {
      p22LocalHttpMcpEvidence: {
        status: 'recorded_historical',
        health: 'ok',
        initializeToolsList: 'ok',
        observeHttp: 'ok',
        mcpHttpTests: '12/12'
      },
      p23A4SafeSlice: {
        status: 'A4_SAFE_SLICE_PASSED',
        fullFinalRcMatrixExecuted: false,
        liveMcpHttpEvidenceRefreshed: false
      },
      p24Aggregator: {
        planned: true,
        implemented: true,
        minimalImplementation: true,
        fullImplementation: false
      }
    },
    blockers: [
      buildBlocker('full-final-rc-matrix-not-executed', {
        status: 'blocked',
        category: 'validation'
      }),
      buildBlocker('validation-aggregator-full-implementation-not-complete', {
        status: 'minimal_implemented',
        category: 'runtime-required',
        requiresRuntimeImplementation: true
      }),
      buildBlocker('schema-version-runtime-enforcement-not-implemented', {
        status: 'planned_not_implemented',
        category: 'runtime-required',
        requiresRuntimeImplementation: true
      }),
      buildBlocker('migration-import-export-apply-a5-gated', {
        status: 'blocked_pending_a5',
        category: 'a5-gated',
        requiresA5: true
      }),
      buildBlocker('provider-execution-a5-gated', {
        status: 'blocked_pending_a5',
        category: 'a5-gated',
        requiresA5: true
      }),
      buildBlocker('startup-watchdog-a5-gated', {
        status: 'blocked_pending_a5',
        category: 'a5-gated',
        requiresA5: true
      }),
      buildBlocker('codex-claude-config-switch-a5-gated', {
        status: 'blocked_pending_a5',
        category: 'a5-gated',
        requiresA5: true
      }),
      buildBlocker('production-deploy-a5-gated', {
        status: 'blocked_pending_a5',
        category: 'a5-gated',
        requiresA5: true
      }),
      buildBlocker('push-tag-release-deploy-a5-gated', {
        status: 'blocked_pending_a5',
        category: 'a5-gated',
        requiresA5: true
      })
    ],
    warnings: [
      'This report is generated by a minimal local implementation, not the full final RC matrix executor.',
      'Historical P22 live MCP evidence must not be treated as fresh P23/P24 live evidence.',
      'A4_SAFE_SLICE_PASSED does not mean READY_FOR_V1_0_RC.'
    ],
    recommendations: [
      'Add a scoped CLI wrapper only after this minimal core contract is committed.',
      'Keep package.json unchanged unless separately authorized.',
      'Keep conditional live checks non-starting by default.',
      'Keep A5-gated checks report-only until explicit authorization.'
    ],
    safety: {
      mutated: false,
      providerCalls: 0,
      serviceStarted: false,
      durableMemoryTouched: false,
      realMemoryPreview: false,
      redactionApplied: true,
      rawWorkspaceIdExposed: false,
      rawSecretExposed: false,
      publicMcpExpanded: false,
      mcpSchemaChanged: false,
      runtimeCodeChanged: true,
      packageChanged: false,
      migrationApplied: false,
      importExportApplied: false,
      watchdogStartupInstalled: false,
      configChanged: false,
      pushed: false,
      tagged: false,
      released: false,
      deployed: false
    },
    forbiddenFragments: [
      'authorization:',
      'bearer ',
      'set-cookie',
      'api_key',
      'providerapikey',
      'workspace_id',
      '.env='
    ],
    forbiddenTopLevelKeys: [
      'hitRate',
      'qualityScore',
      'providerLatency',
      'productionMemorySnippet'
    ]
  };
}

module.exports = {
  DECISION_LABELS,
  buildV1RcValidationAggregatorReport
};
