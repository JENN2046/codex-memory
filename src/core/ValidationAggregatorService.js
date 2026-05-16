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

const EVIDENCE_SOURCES = {
  decision: {
    source_type: 'aggregator',
    source_ref: 'ValidationAggregatorService',
    reason: 'decision derived from unresolved blockers'
  },
  blockers: {
    source_type: 'aggregator',
    source_ref: 'ValidationAggregatorService blockers[]',
    reason: 'blockers derived from unresolved validation, runtime, and A5-gated items'
  },
  a4_safe_slice: {
    source_type: 'doc',
    source_ref: 'docs/P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md',
    status: 'A4_SAFE_SLICE_PASSED'
  },
  full_final_rc_matrix: {
    source_type: 'doc',
    source_ref: 'docs/P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md',
    status: 'not_executed'
  },
  schema_version_runtime_enforcement: {
    source_type: 'runtime_gap',
    source_ref: 'P25 pending',
    status: 'not_implemented'
  },
  schema_version_policy_fixture: {
    source_type: 'fixture_contract',
    source_ref: 'tests/fixtures/schema-version-policy-v1.json',
    status: 'fixture_contract_added'
  },
  schema_compatibility_dry_run_cli: {
    source_type: 'fixture_only_cli_contract',
    source_ref: 'src/cli/schema-compatibility-dry-run.js / tests/schema-compatibility-dry-run-cli.test.js / tests/fixtures/schema-compatibility-dry-run-v1.json',
    status: 'fixture_only_cli_added_not_executed'
  },
  migration_import_export_dry_run_gate_cli: {
    source_type: 'fixture_only_cli_contract',
    source_ref: 'src/cli/migration-import-export-dry-run-gate.js / tests/migration-import-export-dry-run-gate-cli.test.js / tests/fixtures/migration-import-export-dry-run-gate-v1.json',
    status: 'fixture_only_cli_added_not_executed'
  },
  migration_import_export_approval_packet_cli: {
    source_type: 'fixture_only_cli_contract',
    source_ref: 'src/cli/migration-import-export-approval-packet.js / tests/migration-import-export-approval-packet-cli.test.js / tests/fixtures/migration-import-export-approval-packet-v1.json',
    status: 'fixture_only_cli_added_not_executed'
  },
  public_mcp_tools: {
    source_type: 'code_contract',
    source_ref: 'src/core/constants.js',
    status: 'frozen_three_tool_contract'
  },
  a5_gated_actions: {
    source_type: 'governance',
    source_ref: 'STATUS.md / CODEX_MEMORY_NEXT_PHASE_PLAN.md',
    status: 'blocked_pending_a5'
  },
  conditional_live_mcp_http: {
    source_type: 'runtime_condition',
    source_ref: 'P23.12 conditional live MCP/HTTP validation notes',
    status: 'not_executed_service_not_running'
  },
  validation_aggregator_full_implementation: {
    source_type: 'runtime_gap',
    source_ref: 'docs/P24_VALIDATION_AGGREGATOR_IMPLEMENTATION_PLAN.md',
    status: 'minimal_only'
  }
};

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
      schemaCompatibilityDryRunCliImplemented: true,
      schemaCompatibilityDryRunCliFixtureOnly: true,
      schemaCompatibilityDryRunCliExecuted: false,
      schemaCompatibilityRuntimeEnforcementImplemented: false,
      migrationImportExportDryRunGateCliImplemented: true,
      migrationImportExportDryRunGateCliFixtureOnly: true,
      migrationImportExportDryRunGateCliExecuted: false,
      migrationImportExportApprovalPacketCliImplemented: true,
      migrationImportExportApprovalPacketCliFixtureOnly: true,
      migrationImportExportApprovalPacketCliExecuted: false,
      migrationImportExportApprovalPacketExecutionApproved: false,
      migrationImportExportApprovalPacketRealMemoryScanned: false,
      migrationImportExportApprovalPacketPackageScriptAdded: false,
      migrationImportExportRealMemoryScanned: false,
      productionDeployPerformed: false,
      startupWatchdogInstalled: false,
      codexClaudeConfigSwitched: false,
      providerExecuted: false,
      migrationImportExportApplyPerformed: false,
      migrationImportExportPackageScriptAdded: false,
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
      schemaVersionPolicyFixture: createCheck({
        status: 'fixture_contract_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P25.2 schema-version policy fixture covers accepted, missing, and unknown version behavior.'
      }),
      schemaCompatibilityDryRunCli: createCheck({
        status: 'fixture_only_cli_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P25.6 direct-node fixture-only CLI exists; P25.7 records report-shape evidence without executing the CLI.'
      }),
      migrationImportExportDryRunGateCli: createCheck({
        status: 'fixture_only_cli_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P26.3 direct-node fixture-only CLI exists; P26.4 records report-shape evidence without executing the CLI.'
      }),
      migrationImportExportApprovalPacketCli: createCheck({
        status: 'fixture_only_cli_added',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P27.4 direct-node fixture-only CLI exists; P27.5 records report-shape evidence without executing the CLI.'
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
      'schemaVersionPolicyFixture',
      'schemaCompatibilityDryRunCli',
      'migrationImportExportDryRunGateCli',
      'migrationImportExportApprovalPacketCli',
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
      },
      p25SchemaVersionPolicy: {
        status: 'fixture_contract_added',
        fixture: 'tests/fixtures/schema-version-policy-v1.json',
        test: 'tests/schema-version-policy-fixture.test.js',
        runtimeEnforcementImplemented: false
      },
      p25SchemaCompatibilityDryRunCli: {
        status: 'fixture_only_cli_added',
        cli: 'src/cli/schema-compatibility-dry-run.js',
        test: 'tests/schema-compatibility-dry-run-cli.test.js',
        fixture: 'tests/fixtures/schema-compatibility-dry-run-v1.json',
        outputSchema: 'codex-memory.schema-compatibility-dry-run.v1',
        expectedDecision: 'DRY_RUN_BLOCKED',
        fixtureOnly: true,
        cliExecuted: false,
        realMemoryScanned: false,
        runtimeEnforcementImplemented: false,
        packageScriptAdded: false
      },
      p26MigrationImportExportDryRunGateCli: {
        status: 'fixture_only_cli_added',
        cli: 'src/cli/migration-import-export-dry-run-gate.js',
        test: 'tests/migration-import-export-dry-run-gate-cli.test.js',
        fixture: 'tests/fixtures/migration-import-export-dry-run-gate-v1.json',
        outputSchema: 'codex-memory.migration-import-export-dry-run-gate.v1',
        expectedDecision: 'NOT_READY_BLOCKED',
        fixtureOnly: true,
        cliExecuted: false,
        realMemoryScanned: false,
        importExportApplyPerformed: false,
        packageScriptAdded: false
      },
      p27MigrationImportExportApprovalPacketCli: {
        status: 'fixture_only_cli_added',
        cli: 'src/cli/migration-import-export-approval-packet.js',
        test: 'tests/migration-import-export-approval-packet-cli.test.js',
        fixture: 'tests/fixtures/migration-import-export-approval-packet-v1.json',
        outputSchema: 'codex-memory.migration-import-export-approval-packet.v1',
        expectedDecision: 'NOT_READY_BLOCKED',
        expectedApprovalStatus: 'BLOCKED_PENDING_APPROVAL',
        fixtureOnly: true,
        cliExecuted: false,
        realMemoryScanned: false,
        executionApproved: false,
        importExportApplyPerformed: false,
        backupRestorePerformed: false,
        durableReportWritten: false,
        packageScriptAdded: false
      }
    },
    evidence_sources: EVIDENCE_SOURCES,
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
