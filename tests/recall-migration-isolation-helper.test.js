const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const {
  BLOCKED_ACTIONS,
  PUBLIC_MCP_TOOLS,
  REQUIRED_ISOLATED_RECORD_KINDS,
  REQUIRED_MIGRATION_ALLOWED_SOURCES,
  REQUIRED_MIGRATION_DENIED_SOURCES,
  SAFE_SOURCE_TYPES,
  normalizeRecallMigrationIsolationContract,
  summarizeRecallMigrationIsolationContract
} = require('../src/core/RecallMigrationIsolationContract');

const p38FixturePath = path.join(__dirname, 'fixtures', 'p38-recall-isolation-v1.json');
const p39FixturePath = path.join(__dirname, 'fixtures', 'p39-synthetic-migration-dry-run-v1.json');
const helperSourcePath = path.join(__dirname, '..', 'src', 'core', 'RecallMigrationIsolationContract.js');

function loadFixture(fixturePath) {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildContract() {
  const p38 = loadFixture(p38FixturePath);
  const p39 = loadFixture(p39FixturePath);
  const p38RulesByKind = new Map(p38.isolationRules.map(rule => [rule.record_kind, rule]));
  const isolatedRules = [
    ['governance_record', 'governance_records'],
    ['validation_transcript', 'validation_transcripts'],
    ['redaction_sample', 'redaction_samples'],
    ['policy_decision', 'policy_decisions'],
    ['blocked_memory', 'blocked_memory'],
    ['tombstoned_memory', 'tombstoned_memory'],
    ['out_of_scope_memory', 'out_of_scope_memory'],
    ['readiness_report', 'readiness_reports'],
    ['synthetic_migration_metadata', 'synthetic_migration_metadata']
  ].map(([recordKind, namespace]) => {
    const p38Rule = p38RulesByKind.get(recordKind) || {};

    return {
      id: recordKind,
      recordKind,
      namespace,
      sourceType: recordKind === 'synthetic_migration_metadata'
        ? 'synthetic_fixture'
        : 'committed_fixture',
      acceptedForPlanning: true,
      entersNormalRecall: false,
      entersVectorIndex: false,
      entersCandidateCache: p38Rule.entersCandidateCache === true,
      entersRanking: p38Rule.entersRanking === true,
      entersProjection: p38Rule.entersProjection === true,
      entersUserVisibleAuditSummary: p38Rule.entersAuditSummary === true,
      runtimeIntegrated: false,
      reasonCode: `P43_${recordKind.toUpperCase()}_ISOLATED`
    };
  });

  return {
    schemaVersion: 'p43-recall-migration-isolation-contract-v1',
    phase: 'P43-recall-migration-isolation-explicit-input-helper',
    fixtureOnly: true,
    synthetic: true,
    explicitInputOnly: true,
    status: 'blocked',
    decision: 'NOT_READY_BLOCKED',
    acceptedForPlanning: true,
    runtimeIntegrated: false,
    recallRuntimeIntegrated: false,
    migrationRuntimeIntegrated: false,
    vectorIndexIntegrated: false,
    candidateCacheIntegrated: false,
    rankingIntegrated: false,
    projectionIntegrated: false,
    auditSummaryIntegrated: false,
    publicMcpExpanded: false,
    durableMemoryTouched: false,
    durableAuditWritten: false,
    realMemoryScanned: false,
    providerCalls: 0,
    serviceStarted: false,
    configChanged: false,
    dependencyChanged: false,
    remoteWritten: false,
    publicToolsFrozen: true,
    publicTools: PUBLIC_MCP_TOOLS,
    safeSourceTypes: SAFE_SOURCE_TYPES,
    acceptedSourceTypes: SAFE_SOURCE_TYPES,
    unsupportedSourceTypes: [],
    normalRecallNamespaces: p38.normalRecallNamespaces,
    isolatedNamespaces: [
      'governance_records',
      'validation_transcripts',
      'redaction_samples',
      'policy_decisions',
      'blocked_memory',
      'tombstoned_memory',
      'out_of_scope_memory',
      'readiness_reports',
      'synthetic_migration_metadata'
    ],
    isolationRules: isolatedRules,
    migrationDryRun: {
      sourceType: 'synthetic_fixture',
      allowedSources: p39.dryRunScope.allowedSources,
      deniedSources: p39.dryRunScope.deniedSources,
      acceptedForPlanning: true,
      dryRunRepresentsRealMemory: false,
      dryRunAuthorizesApply: false,
      realMemoryContentRead: false,
      realMemoryPreviewed: false,
      migrationApplied: false,
      importApplied: false,
      exportApplied: false,
      backupCreated: false,
      restorePerformed: false,
      failurePathExitCode: p39.planContract.failurePathExitCode,
      criticalUnknownEqualsFailure: true,
      criticalSkippedEqualsFailure: true,
      warningOnlyEqualsFailure: true
    },
    blockedActions: BLOCKED_ACTIONS,
    safety: {
      noRuntimeRecallIntegration: true,
      noMigrationRuntimeIntegration: true,
      noVectorIndexIntegration: true,
      noCandidateCacheIntegration: true,
      noRankingIntegration: true,
      noProjectionIntegration: true,
      noAuditSummaryIntegration: true,
      noCommandExecution: true,
      noDurableMemoryWrite: true,
      noDurableAuditWrite: true,
      noPublicMcpExpansion: true,
      noRealMemoryContentRead: true,
      noRealMemoryPreview: true,
      noRealMemoryExport: true,
      noRealMemoryImport: true,
      noRealMemoryScan: true,
      noRuntimeStoreScan: true,
      noMigrationApply: true,
      noBackupRestore: true,
      noProviderCall: true,
      noServiceStart: true,
      noConfigMutation: true,
      noDependencyChange: true,
      noRemoteWrite: true,
      rawSecretExposed: false,
      rawWorkspaceIdExposed: false,
      authorizationHeaderExposed: false,
      apiKeyExposed: false,
      structureLeakageApproved: false
    },
    requiredWording: [
      'P43 helper evaluates caller-provided isolation metadata only.',
      'Governance records, validation transcripts, redaction samples, policy decisions, readiness reports, and synthetic migration metadata do not enter normal recall, vector, candidate, ranking, projection, or user-visible audit summary.',
      'Synthetic migration dry-run metadata does not authorize real memory read or migration apply.',
      'P43 does not mean recall runtime, migration runtime, final RC matrix, or v1.0 RC readiness.'
    ],
    forbiddenClaims: [
      'P43 authorizes recall runtime isolation',
      'P43 authorizes migration runtime readiness',
      'P43 authorizes real memory scan',
      'P43 authorizes public MCP expansion',
      'P43 makes v1.0 RC ready'
    ]
  };
}

test('P43 helper summarizes explicit recall and migration isolation input', () => {
  const contract = buildContract();
  const before = JSON.stringify(contract);
  const summary = summarizeRecallMigrationIsolationContract(contract);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.schemaVersion, 'p43-recall-migration-isolation-contract-v1');
  assert.equal(summary.acceptedForPlanning, true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.runtimeReady, false);
  assert.equal(summary.recallRuntimeReady, false);
  assert.equal(summary.migrationRuntimeReady, false);
  assert.equal(summary.finalRcMatrixReady, false);
  assert.equal(summary.rcReady, false);
  assert.equal(summary.sourceContract.safe, true);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, []);
  assert.equal(summary.namespaces.separated, true);
  assert.equal(summary.isolationRules.requiredPresent, true);
  assert.equal(summary.isolationRules.safe, true);
  assert.deepEqual(summary.isolationRules.missingRequired, []);
  assert.equal(summary.migrationDryRun.safe, true);
  assert.deepEqual(summary.migrationDryRun.allowedSources, REQUIRED_MIGRATION_ALLOWED_SOURCES);
  assert.deepEqual(summary.migrationDryRun.deniedSources, REQUIRED_MIGRATION_DENIED_SOURCES);
  assert.equal(summary.publicMcpTools.frozen, true);
  assert.deepEqual(summary.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(summary.blockedActions.requiredPresent, true);
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.scansDirectories, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.touchesRecallRuntime, false);
  assert.equal(summary.safety.touchesVectorIndex, false);
  assert.equal(summary.safety.touchesCandidateCache, false);
  assert.equal(summary.safety.touchesAuditSummary, false);
  assert.equal(JSON.stringify(contract), before);
});

test('P43 helper source stays disconnected from recall, storage, config, and runtime modules', () => {
  const source = fs.readFileSync(helperSourcePath, 'utf8');

  for (const forbidden of [
    "require('../recall",
    "require('./recall",
    "require('../storage",
    "require('./storage",
    "require('../app",
    "require('../http-index",
    'createConfig',
    'CandidateGenerator',
    'VectorIndexStore',
    'CandidateCacheStore',
    'RecallAuditService',
    'RerankService',
    'KnowledgeBaseRecallPipeline',
    'SqliteShadowStore'
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test('P43 helper normalizes expected fields without arbitrary passthrough', () => {
  const contract = buildContract();
  const before = JSON.stringify(contract);
  const normalized = normalizeRecallMigrationIsolationContract({
    ...contract,
    authorization: 'authorization: Bearer ISOLATION_TOKEN_1234567890',
    raw_workspace_id: 'raw_workspace_id=workspace-isolation-raw',
    productionMemorySnippet: 'raw memory content',
    recallHits: ['raw recall hit']
  });

  assert.equal(normalized.fixtureOnly, true);
  assert.equal(normalized.synthetic, true);
  assert.equal(normalized.explicitInputOnly, true);
  assert.equal(normalized.status, 'blocked');
  assert.equal(normalized.decision, 'NOT_READY_BLOCKED');
  assert.deepEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.isolationRules.map(rule => rule.recordKind), REQUIRED_ISOLATED_RECORD_KINDS);
  assert.deepEqual(normalized.migrationDryRun.allowedSources, REQUIRED_MIGRATION_ALLOWED_SOURCES);
  assert.deepEqual(normalized.migrationDryRun.deniedSources, REQUIRED_MIGRATION_DENIED_SOURCES);
  assert.deepEqual(BLOCKED_ACTIONS.filter(action => !normalized.blockedActions.includes(action)), []);
  assert.equal(Object.hasOwn(normalized, 'authorization'), false);
  assert.equal(Object.hasOwn(normalized, 'raw_workspace_id'), false);
  assert.equal(Object.hasOwn(normalized, 'productionMemorySnippet'), false);
  assert.equal(Object.hasOwn(normalized, 'recallHits'), false);
  assert.equal(JSON.stringify(contract), before);
});

test('P43 helper does not perform implicit fs reads, directory scans, or command execution', () => {
  const contract = buildContract();
  const originalReadFileSync = fs.readFileSync;
  const originalExistsSync = fs.existsSync;
  const originalReaddirSync = fs.readdirSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during P43 isolation helper evaluation');
  };
  fs.existsSync = () => {
    throw new Error('unexpected fs exists check during P43 isolation helper evaluation');
  };
  fs.readdirSync = () => {
    throw new Error('unexpected directory scan during P43 isolation helper evaluation');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during P43 isolation helper evaluation');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during P43 isolation helper evaluation');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during P43 isolation helper evaluation');
  };

  try {
    const summary = summarizeRecallMigrationIsolationContract(contract);

    assert.equal(summary.acceptedForPlanning, true);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.scansDirectories, false);
    assert.equal(summary.safety.executesCommands, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.existsSync = originalExistsSync;
    fs.readdirSync = originalReaddirSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P43 helper fails closed for malformed explicit input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeRecallMigrationIsolationContract(malformedInput);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.runtimeReady, false);
    assert.equal(summary.recallRuntimeReady, false);
    assert.equal(summary.migrationRuntimeReady, false);
    assert.equal(summary.sourceContract.safe, false);
    assert.equal(summary.namespaces.separated, false);
    assert.equal(summary.isolationRules.requiredPresent, false);
    assert.deepEqual(summary.isolationRules.missingRequired, REQUIRED_ISOLATED_RECORD_KINDS);
    assert.equal(summary.migrationDryRun.safe, false);
    assert.equal(summary.publicMcpTools.frozen, false);
    assert.equal(summary.blockedActions.requiredPresent, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P43 helper rejects unsupported source types and caller whitelist redefinition', () => {
  const contract = buildContract();
  const summary = summarizeRecallMigrationIsolationContract({
    ...contract,
    safeSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'real_sqlite'
    ],
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'real_memory_content'
    ],
    unsupportedSourceTypes: [
      'provider_output'
    ]
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, [
    'provider_output',
    'real_memory_content',
    'real_sqlite'
  ]);
});

test('P43 helper rejects recall, vector, candidate, ranking, projection, and audit pollution', () => {
  const contract = buildContract();

  for (const unsafeRule of [
    { entersNormalRecall: true },
    { entersVectorIndex: true },
    { entersCandidateCache: true },
    { entersRanking: true },
    { entersProjection: true },
    { entersUserVisibleAuditSummary: true },
    { namespace: 'user_memory' },
    { runtimeIntegrated: true },
    { sourceType: 'real_memory_content' }
  ]) {
    const summary = summarizeRecallMigrationIsolationContract({
      ...contract,
      isolationRules: contract.isolationRules.map((rule, index) => index === 0
        ? {
            ...rule,
            ...unsafeRule
          }
        : rule
      )
    });

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.isolationRules.safe, false);
    assert.equal(summary.safety.touchesRecallRuntime, false);
    assert.equal(summary.safety.touchesCandidateCache, false);
    assert.equal(summary.safety.touchesAuditSummary, false);
  }
});

test('P43 helper rejects missing isolated kinds and unsafe migration dry-run claims', () => {
  const contract = buildContract();

  const missingSummary = summarizeRecallMigrationIsolationContract({
    ...contract,
    isolationRules: contract.isolationRules
      .filter(rule => rule.recordKind !== 'synthetic_migration_metadata')
  });

  assert.equal(missingSummary.acceptedForPlanning, false);
  assert.equal(missingSummary.isolationRules.requiredPresent, false);
  assert.deepEqual(missingSummary.isolationRules.missingRequired, [
    'synthetic_migration_metadata'
  ]);

  for (const unsafeDryRun of [
    { allowedSources: ['synthetic_fixture', 'real_sqlite'] },
    { deniedSources: ['real_memory_content'] },
    { dryRunRepresentsRealMemory: true },
    { dryRunAuthorizesApply: true },
    { realMemoryContentRead: true },
    { realMemoryPreviewed: true },
    { migrationApplied: true },
    { importApplied: true },
    { exportApplied: true },
    { backupCreated: true },
    { restorePerformed: true },
    { criticalUnknownEqualsFailure: false },
    { criticalSkippedEqualsFailure: false },
    { warningOnlyEqualsFailure: false }
  ]) {
    const summary = summarizeRecallMigrationIsolationContract({
      ...contract,
      migrationDryRun: {
        ...contract.migrationDryRun,
        ...unsafeDryRun
      }
    });

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.migrationDryRun.safe, false);
    assert.equal(summary.migrationDryRun.dryRunRepresentsRealMemory, false);
    assert.equal(summary.migrationDryRun.dryRunAuthorizesApply, false);
  }
});

test('P43 helper rejects schema drift and non-exact required sets', () => {
  const contract = buildContract();

  for (const unsafeContract of [
    { ...contract, schemaVersion: 'unsupported-schema' },
    { ...contract, isolationRules: [...contract.isolationRules, contract.isolationRules[0]] },
    { ...contract, blockedActions: [...contract.blockedActions, 'unexpected_action'] },
    {
      ...contract,
      migrationDryRun: {
        ...contract.migrationDryRun,
        deniedSources: [...contract.migrationDryRun.deniedSources, 'unexpected_denied_source']
      }
    }
  ]) {
    const summary = summarizeRecallMigrationIsolationContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.runtimeReady, false);
    assert.equal(summary.recallRuntimeReady, false);
    assert.equal(summary.migrationRuntimeReady, false);
    assert.equal(summary.rcReady, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P43 helper rejects runtime, public MCP, durable, provider, and safety leakage claims', () => {
  const contract = buildContract();

  for (const unsafeContract of [
    { ...contract, status: 'ready' },
    { ...contract, decision: 'READY_FOR_V1_0_RC' },
    { ...contract, runtimeIntegrated: true },
    { ...contract, recallRuntimeIntegrated: true },
    { ...contract, migrationRuntimeIntegrated: true },
    { ...contract, vectorIndexIntegrated: true },
    { ...contract, candidateCacheIntegrated: true },
    { ...contract, rankingIntegrated: true },
    { ...contract, projectionIntegrated: true },
    { ...contract, auditSummaryIntegrated: true },
    { ...contract, publicMcpExpanded: true },
    { ...contract, durableMemoryTouched: true },
    { ...contract, durableAuditWritten: true },
    { ...contract, realMemoryScanned: true },
    { ...contract, providerCalls: 1 },
    { ...contract, serviceStarted: true },
    { ...contract, configChanged: true },
    { ...contract, dependencyChanged: true },
    { ...contract, remoteWritten: true },
    { ...contract, publicTools: ['record_memory', 'search_memory'] },
    {
      ...contract,
      safety: {
        ...contract.safety,
        noRealMemoryScan: false
      }
    },
    {
      ...contract,
      safety: {
        ...contract.safety,
        rawSecretExposed: true
      }
    }
  ]) {
    const summary = summarizeRecallMigrationIsolationContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.runtimeReady, false);
    assert.equal(summary.rcReady, false);
    assert.equal(summary.publicMcpExpanded, false);
    assert.equal(summary.providerCalls, 0);
    assert.equal(summary.serviceStarted, false);
    assert.equal(summary.safety.readsRealMemory, false);
    assert.equal(summary.safety.expandsPublicMcp, false);
    assert.equal(summary.safety.mutatesDurableState, false);
  }
});

test('P43 helper redacts sensitive normalized output and unsupported source summaries', () => {
  const contract = buildContract();
  const normalized = normalizeRecallMigrationIsolationContract({
    ...contract,
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'authorization: Bearer ISOLATION_TOKEN_1234567890'
    ],
    unsupportedSourceTypes: [
      'api_key=ISOLATION_API_KEY_1234567890',
      'token=ISOLATION_SUMMARY_TOKEN_1234567890',
      'raw_workspace_id=workspace-isolation-raw'
    ],
    requiredWording: [
      ...contract.requiredWording,
      'authorization: Bearer WORDING_TOKEN_1234567890',
      'api_key=WORDING_API_KEY_1234567890'
    ],
    isolationRules: contract.isolationRules.map((rule, index) => index === 0
      ? {
          ...rule,
          authorization: 'authorization: Bearer RULE_TOKEN_1234567890',
          api_key: 'api_key=RULE_API_KEY_1234567890',
          raw_workspace_id: 'raw_workspace_id=workspace-rule-raw',
          reasonCode: 'P43_REASON authorization: Bearer REASON_TOKEN_1234567890 A:\\secret\\.env https://example.test workspace_id=workspace-public-id'
        }
      : rule
    )
  });
  const summary = summarizeRecallMigrationIsolationContract(normalized);
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'bearer',
    'api_key',
    'raw_workspace_id',
    'authorization: bearer',
    'isolation_token_1234567890',
    'isolation_api_key_1234567890',
    'isolation_summary_token_1234567890',
    'wording_token_1234567890',
    'wording_api_key_1234567890',
    'rule_token_1234567890',
    'rule_api_key_1234567890',
    'workspace-rule-raw',
    'reason_token_1234567890',
    'a:\\',
    '.env',
    'https://example.test',
    'workspace_id',
    'workspace-public-id'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false, forbidden);
    assert.equal(summaryText.includes(forbidden), false, forbidden);
  }

  assert.equal(Object.hasOwn(normalized.isolationRules[0], 'authorization'), false);
  assert.equal(Object.hasOwn(normalized.isolationRules[0], 'api_key'), false);
  assert.equal(Object.hasOwn(normalized.isolationRules[0], 'raw_workspace_id'), false);
  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.unsupportedSourceTypes.every(sourceType =>
    sourceType === '<redacted>' || sourceType.includes('<redacted>')
  ), true);
  assert.deepEqual(summary.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
});
