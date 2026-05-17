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

const VALIDATION_EVIDENCE_SOURCE_TYPES = [
  'committed_validation',
  'local_validation'
];

const VALIDATION_EVIDENCE_STATUSES = [
  'passed',
  'failed',
  'blocked',
  'not_executed',
  'warning',
  'unknown'
];

const VALIDATION_EVIDENCE_FRESHNESS_STATUSES = [
  'no_explicit_evidence',
  'fresh_passed',
  'fresh_with_warnings',
  'stale_or_unknown',
  'failed_or_blocked'
];

const VALIDATION_EVIDENCE_GATE_READINESS_STATUSES = [
  'not_ready_no_explicit_evidence',
  'not_ready_failed_or_blocked_evidence',
  'not_ready_rejected_evidence',
  'not_ready_stale_or_unknown_evidence',
  'not_ready_warning_evidence',
  'not_ready_existing_blockers'
];

const VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES = [
  'no_explicit_evidence',
  'command_coverage_present',
  'command_coverage_partial',
  'command_coverage_missing'
];

const VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES = [
  'no_rejections',
  'rejections_present',
  'all_inputs_rejected'
];

const VALIDATION_EVIDENCE_REJECTION_REASONS = [
  'invalid_source_shape',
  'sensitive_fragment_rejected',
  'unsupported_source_type',
  'unsupported_status',
  'side_effect_evidence_rejected'
];

const VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES = [
  'no_explicit_evidence',
  'failed_or_blocked_signal',
  'rejected_or_unsafe_signal',
  'stale_or_unknown_signal',
  'partial_signal',
  'usable_but_blocked'
];

const VALIDATION_EVIDENCE_STALE_AFTER_HOURS = 168;

const FORBIDDEN_EVIDENCE_FRAGMENTS = [
  'authorization:',
  'bearer ',
  'set-cookie',
  'api_key',
  'providerapikey',
  'workspace_id',
  '.env='
];

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
  schema_version_policy_helper: {
    source_type: 'explicit_input_policy_helper',
    source_ref: 'src/core/SchemaVersionPolicy.js / tests/schema-version-policy-runtime.test.js',
    status: 'helper_added_runtime_not_integrated'
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
  },
  validation_evidence_reader: {
    source_type: 'explicit_safe_input_contract',
    source_ref: 'ValidationAggregatorService validationEvidenceSources[]',
    status: 'foundation_added_read_only'
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

function includesForbiddenEvidenceFragment(value) {
  const encoded = JSON.stringify(value ?? '').toLowerCase();
  return FORBIDDEN_EVIDENCE_FRAGMENTS.some(fragment => encoded.includes(fragment));
}

function safeEvidenceId(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  if (includesForbiddenEvidenceFragment(value)) return fallback;
  return value.trim().slice(0, 120);
}

function safeEvidenceString(value, fallback = '') {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  if (includesForbiddenEvidenceFragment(value)) return '<redacted>';
  return value.trim().slice(0, 240);
}

function normalizeEvidenceCommands(commands) {
  if (!Array.isArray(commands)) return [];
  return commands
    .filter(command => typeof command === 'string' && command.trim() !== '')
    .map(command => safeEvidenceString(command))
    .filter(command => command && command !== '<redacted>')
    .slice(0, 12);
}

function parseEvidenceTimestamp(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function summarizeValidationEvidenceFreshness({
  acceptedSources,
  generatedAt,
  staleAfterHours = VALIDATION_EVIDENCE_STALE_AFTER_HOURS
}) {
  const referenceDate = parseEvidenceTimestamp(generatedAt);
  const staleAfterMs = staleAfterHours * 60 * 60 * 1000;
  const observedSources = acceptedSources
    .map(source => ({
      source,
      observedAt: parseEvidenceTimestamp(source.observed_at)
    }))
    .filter(item => item.observedAt);
  const staleSources = referenceDate
    ? observedSources.filter(item => referenceDate.getTime() - item.observedAt.getTime() > staleAfterMs)
    : [];
  const newestObserved = observedSources.reduce((newest, item) => {
    if (!newest || item.observedAt.getTime() > newest.getTime()) return item.observedAt;
    return newest;
  }, null);
  const failedCount = acceptedSources.filter(source => source.status === 'failed').length;
  const blockedCount = acceptedSources.filter(source => source.status === 'blocked').length;
  const warningCount = acceptedSources.filter(source => source.status === 'warning').length;
  const unknownStatusCount = acceptedSources.filter(source => source.status === 'unknown').length;
  const notExecutedCount = acceptedSources.filter(source => source.status === 'not_executed').length;
  const unknownFreshnessCount = referenceDate
    ? acceptedSources.length - observedSources.length
    : acceptedSources.length;
  const hasFailedEvidence = failedCount > 0;
  const hasBlockedEvidence = blockedCount > 0;
  const hasWarnings = warningCount > 0;
  const hasUnknownStatus = unknownStatusCount > 0 || notExecutedCount > 0;
  const hasStaleOrUnknownFreshness = staleSources.length > 0 || unknownFreshnessCount > 0;
  let overallStatus = 'no_explicit_evidence';

  if (acceptedSources.length === 0) {
    overallStatus = 'no_explicit_evidence';
  } else if (hasFailedEvidence || hasBlockedEvidence) {
    overallStatus = 'failed_or_blocked';
  } else if (hasStaleOrUnknownFreshness || hasUnknownStatus) {
    overallStatus = 'stale_or_unknown';
  } else if (hasWarnings) {
    overallStatus = 'fresh_with_warnings';
  } else {
    overallStatus = 'fresh_passed';
  }

  return {
    status: overallStatus,
    allowedStatuses: VALIDATION_EVIDENCE_FRESHNESS_STATUSES,
    referenceTime: safeEvidenceString(generatedAt, ''),
    staleAfterHours,
    sourceCount: acceptedSources.length,
    sourcesWithObservedAt: observedSources.length,
    unknownFreshnessCount,
    staleCount: staleSources.length,
    freshestObservedAt: newestObserved ? newestObserved.toISOString() : '',
    hasFailedEvidence,
    hasBlockedEvidence,
    hasWarnings,
    allAcceptedPassed: acceptedSources.length > 0 &&
      acceptedSources.every(source => source.status === 'passed')
  };
}

function summarizeValidationEvidenceGateReadiness({
  validationEvidenceReader,
  validationEvidenceFreshness,
  blockers
}) {
  const runtimeBlockers = blockers.filter(blocker => blocker.requiresRuntimeImplementation === true);
  const a5Blockers = blockers.filter(blocker => blocker.requiresA5 === true);
  const validationBlockers = blockers.filter(blocker => blocker.category === 'validation');
  const blockerIds = blockers.map(blocker => blocker.id);
  const acceptedCount = validationEvidenceReader.acceptedCount;
  const rejectedCount = validationEvidenceReader.rejectedCount;
  let status = 'not_ready_existing_blockers';

  if (acceptedCount === 0) {
    status = 'not_ready_no_explicit_evidence';
  } else if (validationEvidenceFreshness.hasFailedEvidence || validationEvidenceFreshness.hasBlockedEvidence) {
    status = 'not_ready_failed_or_blocked_evidence';
  } else if (rejectedCount > 0) {
    status = 'not_ready_rejected_evidence';
  } else if (validationEvidenceFreshness.status === 'stale_or_unknown') {
    status = 'not_ready_stale_or_unknown_evidence';
  } else if (validationEvidenceFreshness.status === 'fresh_with_warnings') {
    status = 'not_ready_warning_evidence';
  }

  return {
    status,
    allowedStatuses: VALIDATION_EVIDENCE_GATE_READINESS_STATUSES,
    sourceMode: validationEvidenceReader.sourceMode,
    decisionImpact: 'none_report_only',
    canClaimV1RcReady: false,
    readyForFinalRcMatrixRunner: false,
    acceptedEvidenceCount: acceptedCount,
    rejectedEvidenceCount: rejectedCount,
    freshnessStatus: validationEvidenceFreshness.status,
    explicitEvidenceUsable: acceptedCount > 0 &&
      rejectedCount === 0 &&
      validationEvidenceFreshness.status === 'fresh_passed',
    blockerCounts: {
      validationRequired: validationBlockers.length,
      runtimeRequired: runtimeBlockers.length,
      a5Gated: a5Blockers.length,
      totalUnresolved: blockers.length
    },
    blockedBy: blockerIds
  };
}

function classifyEvidenceCommand(command) {
  const trimmed = typeof command === 'string' ? command.trim().toLowerCase() : '';
  if (trimmed.startsWith('git ')) return 'git';
  if (trimmed.startsWith('node ')) return 'node';
  if (trimmed.startsWith('npm ')) return 'npm';
  return 'other';
}

function summarizeValidationEvidenceCommandCoverage(validationEvidenceReader) {
  const acceptedSources = validationEvidenceReader.acceptedSources;
  const sourceTypesCovered = [...new Set(acceptedSources.map(source => source.source_type))].sort();
  const allCommands = acceptedSources.flatMap(source => source.commands);
  const uniqueCommands = [...new Set(allCommands)].sort();
  const sourcesWithCommands = acceptedSources.filter(source => source.commands.length > 0);
  const commandFamilies = uniqueCommands.reduce((counts, command) => {
    const family = classifyEvidenceCommand(command);
    return {
      ...counts,
      [family]: counts[family] + 1
    };
  }, {
    git: 0,
    node: 0,
    npm: 0,
    other: 0
  });
  let status = 'no_explicit_evidence';

  if (acceptedSources.length === 0) {
    status = 'no_explicit_evidence';
  } else if (sourcesWithCommands.length === 0) {
    status = 'command_coverage_missing';
  } else if (sourcesWithCommands.length < acceptedSources.length) {
    status = 'command_coverage_partial';
  } else {
    status = 'command_coverage_present';
  }

  return {
    status,
    allowedStatuses: VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES,
    sourceMode: validationEvidenceReader.sourceMode,
    executesCommands: false,
    commandTextSanitized: true,
    acceptedEvidenceCount: acceptedSources.length,
    sourcesWithCommands: sourcesWithCommands.length,
    sourcesWithoutCommands: acceptedSources.length - sourcesWithCommands.length,
    commandCount: allCommands.length,
    uniqueCommandCount: uniqueCommands.length,
    sourceTypesCovered,
    requiredSourceTypesCovered: VALIDATION_EVIDENCE_SOURCE_TYPES.every(sourceType =>
      sourceTypesCovered.includes(sourceType)
    ),
    commandFamilies,
    allAcceptedHaveCommands: acceptedSources.length > 0 &&
      sourcesWithCommands.length === acceptedSources.length
  };
}

function summarizeValidationEvidenceRejections(validationEvidenceReader) {
  const rejectedSources = validationEvidenceReader.rejectedSources;
  const reasonCounts = VALIDATION_EVIDENCE_REJECTION_REASONS.reduce((counts, reason) => ({
    ...counts,
    [reason]: rejectedSources.filter(source => source.reason === reason).length
  }), {});
  let status = 'no_rejections';

  if (rejectedSources.length > 0 && validationEvidenceReader.acceptedCount === 0) {
    status = 'all_inputs_rejected';
  } else if (rejectedSources.length > 0) {
    status = 'rejections_present';
  }

  return {
    status,
    allowedStatuses: VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES,
    knownReasons: VALIDATION_EVIDENCE_REJECTION_REASONS,
    rejectedCount: rejectedSources.length,
    acceptedCount: validationEvidenceReader.acceptedCount,
    reasonCounts,
    hasSensitiveRejection: reasonCounts.sensitive_fragment_rejected > 0,
    hasSideEffectRejection: reasonCounts.side_effect_evidence_rejected > 0,
    hasUnsupportedContractRejection: reasonCounts.unsupported_source_type > 0 ||
      reasonCounts.unsupported_status > 0 ||
      reasonCounts.invalid_source_shape > 0,
    rawRejectedInputExposed: false,
    rejectsUnsafeInputs: true
  };
}

function summarizeValidationEvidenceConfidencePosture({
  validationEvidenceReader,
  validationEvidenceFreshness,
  validationEvidenceGateReadiness,
  validationEvidenceCommandCoverage,
  validationEvidenceRejectionSummary
}) {
  const acceptedCount = validationEvidenceReader.acceptedCount;
  let status = 'usable_but_blocked';
  const limitations = [];

  if (acceptedCount === 0 && validationEvidenceRejectionSummary.rejectedCount === 0) {
    status = 'no_explicit_evidence';
    limitations.push('no_explicit_validation_evidence');
  } else if (validationEvidenceFreshness.status === 'failed_or_blocked') {
    status = 'failed_or_blocked_signal';
    limitations.push('failed_or_blocked_evidence_present');
  } else if (
    validationEvidenceRejectionSummary.rejectedCount > 0 ||
    validationEvidenceGateReadiness.status === 'not_ready_rejected_evidence'
  ) {
    status = 'rejected_or_unsafe_signal';
    limitations.push('rejected_explicit_evidence_present');
  } else if (validationEvidenceFreshness.status === 'stale_or_unknown') {
    status = 'stale_or_unknown_signal';
    limitations.push('stale_or_unknown_freshness');
  } else if (
    validationEvidenceFreshness.status === 'fresh_with_warnings' ||
    validationEvidenceCommandCoverage.status !== 'command_coverage_present'
  ) {
    status = 'partial_signal';
    limitations.push('warning_or_partial_command_coverage');
  }

  limitations.push('full_final_rc_matrix_not_executed');
  limitations.push('runtime_schema_version_enforcement_missing');
  limitations.push('validation_aggregator_full_implementation_incomplete');
  limitations.push('a5_actions_blocked');

  return {
    status,
    allowedStatuses: VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES,
    sourceMode: validationEvidenceReader.sourceMode,
    decisionImpact: 'none_report_only',
    canClaimV1RcReady: false,
    confidenceSignal: status === 'usable_but_blocked'
      ? 'usable_explicit_evidence'
      : 'limited_explicit_evidence',
    acceptedEvidenceCount: acceptedCount,
    rejectedEvidenceCount: validationEvidenceRejectionSummary.rejectedCount,
    freshnessStatus: validationEvidenceFreshness.status,
    gateReadinessStatus: validationEvidenceGateReadiness.status,
    commandCoverageStatus: validationEvidenceCommandCoverage.status,
    rejectionStatus: validationEvidenceRejectionSummary.status,
    limitations
  };
}

function hasUnsafeEvidenceSideEffect(source) {
  const safety = source && typeof source.safety === 'object' && source.safety
    ? source.safety
    : {};

  return safety.mutated === true ||
    Number(safety.providerCalls || 0) > 0 ||
    safety.serviceStarted === true ||
    safety.durableMemoryTouched === true ||
    safety.realMemoryPreview === true ||
    safety.migrationApplied === true ||
    safety.importExportApplied === true ||
    safety.watchdogStartupInstalled === true ||
    safety.configChanged === true ||
    safety.pushed === true ||
    safety.tagged === true ||
    safety.released === true ||
    safety.deployed === true;
}

function normalizeValidationEvidenceSources(sources = []) {
  const inputSources = Array.isArray(sources) ? sources : [];
  const acceptedSources = [];
  const rejectedSources = [];

  inputSources.forEach((source, index) => {
    const fallbackId = `validation-evidence-${index + 1}`;
    const id = safeEvidenceId(source && source.id, fallbackId);

    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'invalid_source_shape'
      });
      return;
    }

    if (includesForbiddenEvidenceFragment(source)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'sensitive_fragment_rejected'
      });
      return;
    }

    if (!VALIDATION_EVIDENCE_SOURCE_TYPES.includes(source.source_type)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'unsupported_source_type'
      });
      return;
    }

    if (!VALIDATION_EVIDENCE_STATUSES.includes(source.status)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'unsupported_status'
      });
      return;
    }

    if (hasUnsafeEvidenceSideEffect(source)) {
      rejectedSources.push({
        id,
        accepted: false,
        reason: 'side_effect_evidence_rejected'
      });
      return;
    }

    acceptedSources.push({
      id,
      source_type: source.source_type,
      status: source.status,
      source_ref: safeEvidenceString(source.source_ref, 'explicit-safe-input'),
      observed_at: safeEvidenceString(source.observed_at, ''),
      commit: safeEvidenceString(source.commit, ''),
      commands: normalizeEvidenceCommands(source.commands),
      summary: safeEvidenceString(source.summary, ''),
      safety: {
        mutated: false,
        providerCalls: 0,
        serviceStarted: false,
        durableMemoryTouched: false,
        realMemoryPreview: false,
        migrationApplied: false,
        importExportApplied: false,
        configChanged: false,
        pushed: false,
        tagged: false,
        released: false,
        deployed: false
      }
    });
  });

  return {
    sourceMode: 'explicit_safe_inputs_only',
    contract: {
      sourceTypes: VALIDATION_EVIDENCE_SOURCE_TYPES,
      statuses: VALIDATION_EVIDENCE_STATUSES,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      acceptsRealMemoryPreview: false
    },
    sourceCount: inputSources.length,
    acceptedCount: acceptedSources.length,
    rejectedCount: rejectedSources.length,
    acceptedSources,
    rejectedSources,
    summary: {
      committedValidationCount: acceptedSources.filter(source => source.source_type === 'committed_validation').length,
      localValidationCount: acceptedSources.filter(source => source.source_type === 'local_validation').length,
      passedCount: acceptedSources.filter(source => source.status === 'passed').length,
      failedCount: acceptedSources.filter(source => source.status === 'failed').length,
      blockedCount: acceptedSources.filter(source => source.status === 'blocked').length,
      notExecutedCount: acceptedSources.filter(source => source.status === 'not_executed').length,
      allAcceptedReadOnly: acceptedSources.every(source => source.safety.mutated === false),
      allAcceptedSafe: acceptedSources.every(source =>
        source.safety.providerCalls === 0 &&
        source.safety.serviceStarted === false &&
        source.safety.durableMemoryTouched === false &&
        source.safety.realMemoryPreview === false
      )
    }
  };
}

function buildV1RcValidationAggregatorReport({
  generatedAt = new Date().toISOString(),
  validationEvidenceSources = []
} = {}) {
  const validationEvidenceReader = normalizeValidationEvidenceSources(validationEvidenceSources);
  const validationEvidenceFreshness = summarizeValidationEvidenceFreshness({
    acceptedSources: validationEvidenceReader.acceptedSources,
    generatedAt
  });
  const blockers = [
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
  ];
  const validationEvidenceGateReadiness = summarizeValidationEvidenceGateReadiness({
    validationEvidenceReader,
    validationEvidenceFreshness,
    blockers
  });
  const validationEvidenceCommandCoverage = summarizeValidationEvidenceCommandCoverage(validationEvidenceReader);
  const validationEvidenceRejectionSummary = summarizeValidationEvidenceRejections(validationEvidenceReader);
  const validationEvidenceConfidencePosture = summarizeValidationEvidenceConfidencePosture({
    validationEvidenceReader,
    validationEvidenceFreshness,
    validationEvidenceGateReadiness,
    validationEvidenceCommandCoverage,
    validationEvidenceRejectionSummary
  });

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
      validationEvidenceReaderImplemented: true,
      validationEvidenceSourceContract: validationEvidenceReader.sourceMode,
      validationEvidenceAcceptedCount: validationEvidenceReader.acceptedCount,
      validationEvidenceFreshnessStatus: validationEvidenceFreshness.status,
      validationEvidenceStaleCount: validationEvidenceFreshness.staleCount,
      validationEvidenceGateReadinessStatus: validationEvidenceGateReadiness.status,
      validationEvidenceCanClaimV1RcReady: false,
      validationEvidenceCommandCoverageStatus: validationEvidenceCommandCoverage.status,
      validationEvidenceCommandCount: validationEvidenceCommandCoverage.commandCount,
      validationEvidenceRejectionStatus: validationEvidenceRejectionSummary.status,
      validationEvidenceRejectedCount: validationEvidenceRejectionSummary.rejectedCount,
      validationEvidenceConfidencePostureStatus: validationEvidenceConfidencePosture.status,
      validationEvidenceConfidenceCanClaimV1RcReady: false,
      schemaVersionRuntimeEnforcementImplemented: false,
      schemaVersionPolicyHelperImplemented: true,
      schemaVersionPolicyHelperExplicitInputOnly: true,
      schemaVersionPolicyHelperRuntimeIntegrated: false,
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
      schemaVersionPolicyHelper: createCheck({
        status: 'helper_added_runtime_not_integrated',
        requiredBeforeV1Rc: true,
        blocksV1Rc: false,
        a4Safe: true,
        evidence: 'P29.1 SchemaVersionPolicy helper evaluates explicit parsed policy input only; it is not wired into runtime enforcement.'
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
      'schemaVersionPolicyHelper',
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
      p29SchemaVersionPolicyHelper: {
        status: 'helper_added_runtime_not_integrated',
        helper: 'src/core/SchemaVersionPolicy.js',
        test: 'tests/schema-version-policy-runtime.test.js',
        sourceMode: 'explicit_input',
        fixture: 'tests/fixtures/schema-version-policy-v1.json',
        evaluatesAcceptedMissingUnknownVersions: true,
        rejectsUnknownFamilies: true,
        readsFiles: false,
        mutatesInput: false,
        runtimeIntegrated: false,
        runtimeEnforcementImplemented: false,
        publicMcpExpanded: false
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
      },
      p28ValidationEvidenceReader: {
        status: validationEvidenceReader.acceptedCount > 0
          ? 'explicit_evidence_available'
          : 'no_explicit_validation_evidence',
        implemented: true,
        fullImplementation: false,
        freshness: validationEvidenceFreshness,
        gateReadiness: validationEvidenceGateReadiness,
        commandCoverage: validationEvidenceCommandCoverage,
        rejectionSummary: validationEvidenceRejectionSummary,
        confidencePosture: validationEvidenceConfidencePosture,
        ...validationEvidenceReader
      }
    },
    evidence_sources: EVIDENCE_SOURCES,
    blockers,
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
  VALIDATION_EVIDENCE_COMMAND_COVERAGE_STATUSES,
  VALIDATION_EVIDENCE_CONFIDENCE_POSTURE_STATUSES,
  VALIDATION_EVIDENCE_FRESHNESS_STATUSES,
  VALIDATION_EVIDENCE_GATE_READINESS_STATUSES,
  VALIDATION_EVIDENCE_REJECTION_REASONS,
  VALIDATION_EVIDENCE_REJECTION_SUMMARY_STATUSES,
  VALIDATION_EVIDENCE_SOURCE_TYPES,
  VALIDATION_EVIDENCE_STATUSES,
  buildV1RcValidationAggregatorReport,
  normalizeValidationEvidenceSources,
  summarizeValidationEvidenceFreshness,
  summarizeValidationEvidenceGateReadiness,
  summarizeValidationEvidenceCommandCoverage,
  summarizeValidationEvidenceRejections,
  summarizeValidationEvidenceConfidencePosture
};
