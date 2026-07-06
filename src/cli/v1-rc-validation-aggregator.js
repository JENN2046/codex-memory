#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  buildV1RcValidationAggregatorReport
} = require('../core/ValidationAggregatorService');
const {
  buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight,
  buildRuntimeEvidenceSummaryForAggregatorReplay
} = require('../core/AuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight');

const REJECTED_FLAGS = new Set([
  '--live',
  '--refresh-live',
  '--start-service',
  '--provider',
  '--apply',
  '--migrate',
  '--import',
  '--export',
  '--deploy',
  '--release',
  '--tag',
  '--push'
]);

function parseArgs(argv = []) {
  const options = {
    pretty: false,
    strict: false,
    help: false,
    generatedAt: null,
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--strict') {
      options.strict = true;
      continue;
    }
    if (token === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (token === '--generated-at') {
      options.generatedAt = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--runtime-evidence-report') {
      options.runtimeEvidenceReportPath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--runtime-evidence-current-head') {
      options.runtimeEvidenceCurrentHead = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--runtime-evidence-expected-current-head') {
      options.runtimeEvidenceExpectedCurrentHead = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--runtime-evidence-generated-at') {
      options.runtimeEvidenceGeneratedAt = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
      continue;
    }
  }

  return options;
}

function buildUsageText() {
  return [
    'Usage: node src/cli/v1-rc-validation-aggregator.js [--strict] [--pretty] [--generated-at ISO_TIMESTAMP] [--runtime-evidence-report PATH|-]',
    '',
    'Modes:',
    '  default   Emit a read-only JSON validation report and exit 0, even when the decision is blocked.',
    '  --strict  Emit the same JSON report but exit non-zero unless the decision is READY_FOR_V1_0_RC.',
    '  --runtime-evidence-report PATH|-',
    '            Read one explicit sanitized authenticated HTTP bounded mutation runtime evidence report from a workspace JSON file or stdin, then feed its sanitized summary into the aggregator preflight path.',
    '  --runtime-evidence-current-head COMMIT',
    '  --runtime-evidence-expected-current-head COMMIT',
    '  --runtime-evidence-generated-at ISO_TIMESTAMP',
    '            Optional exact head-bound runtime summary metadata supplied separately from the low-disclosure report. Values are used for aggregator replay and are not printed in output.',
    '  --help    Show this usage text without running live checks.',
    '',
    'This minimal CLI never starts services, calls providers, applies migrations, writes memory, refreshes live MCP/HTTP evidence, or claims readiness.'
  ].join('\n');
}

function getExitCodeForDecision(decision, { strict = false, rejected = false } = {}) {
  if (rejected) {
    return 1;
  }
  if (!strict) {
    return 0;
  }
  return decision === 'READY_FOR_V1_0_RC' ? 0 : 1;
}

function buildRejectedReport(rejectedFlag) {
  const report = buildV1RcValidationAggregatorReport();
  return {
    ...report,
    phase: 'P24.6-validation-aggregator-rejected-flag-contract-hardening',
    rejectedFlag,
    error: `${rejectedFlag} is outside the minimal validation aggregator CLI boundary.`,
    evidence: {
      ...report.evidence,
      p24Aggregator: {
        ...report.evidence.p24Aggregator,
        minimalCliWiring: true,
        decisionExitCodeSemantics: true,
        rc9DecisionPacketEmbedded: true,
        zeroGapCloseoutAuditEmbedded: true,
        rejectedFlagContractHardening: true
      }
    },
    warnings: [
      ...report.warnings,
      'Rejected flag output preserves the stable report contract while failing closed.'
    ],
    recommendations: [
      ...report.recommendations,
      'Re-run without live/provider/apply/deploy/release flags.'
    ],
    mutated: report.safety.mutated,
    providerCalls: report.safety.providerCalls,
    serviceStarted: report.safety.serviceStarted,
    durableMemoryTouched: report.safety.durableMemoryTouched,
    nextStep: 'Re-run without live/provider/apply/deploy/release flags.'
  };
}

function isSecretAdjacentPath(filePath) {
  const normalized = filePath.toLowerCase();
  return normalized.includes(`${path.sep}.env`) ||
    normalized.includes(`${path.sep}state-private${path.sep}`) ||
    normalized.includes('secret') ||
    normalized.includes('credential') ||
    normalized.includes('token') ||
    normalized.includes('private-key') ||
    normalized.includes('id_rsa') ||
    normalized.includes('id_ed25519');
}

function readRuntimeEvidenceReportInput(inputPath, { cwd = process.cwd() } = {}) {
  if (!inputPath) {
    return {
      ok: false,
      reason: 'runtime_evidence_report_path_required',
      value: null
    };
  }

  if (inputPath === '-') {
    try {
      return {
        ok: true,
        reason: '',
        value: JSON.parse(fs.readFileSync(0, 'utf8'))
      };
    } catch {
      return {
        ok: false,
        reason: 'runtime_evidence_report_stdin_json_invalid',
        value: null
      };
    }
  }

  const resolvedPath = path.resolve(cwd, inputPath);
  const workspaceRoot = path.resolve(cwd);
  const relativePath = path.relative(workspaceRoot, resolvedPath);
  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    isSecretAdjacentPath(resolvedPath) ||
    path.extname(resolvedPath).toLowerCase() !== '.json'
  ) {
    return {
      ok: false,
      reason: 'runtime_evidence_report_path_rejected',
      value: null
    };
  }

  try {
    return {
      ok: true,
      reason: '',
      value: JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
    };
  } catch {
    return {
      ok: false,
      reason: 'runtime_evidence_report_file_json_invalid',
      value: null
    };
  }
}

function buildRuntimeEvidenceReportLoadError(loadErrorReason, options = {}) {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: options.generatedAt || undefined
  });

  return {
    ...report,
    phase: 'P67-runtime-evidence-standard-input-rejected',
    runtimeEvidenceReportInput: {
      provided: true,
      accepted: false,
      rejected: true,
      rejectReason: loadErrorReason,
      pathDisclosed: false,
      rawInputPrinted: false
    },
    evidence: {
      ...report.evidence,
      p67AuthenticatedHttpBoundedMutationRuntimeEvidencePreflight: {
        status: 'blocked_fail_closed',
        decision: 'NOT_READY_BLOCKED',
        standardInputSourceAccepted: false,
        rejectReason: loadErrorReason,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false,
        canClaimRcReady: false
      }
    },
    warnings: [
      ...report.warnings,
      'Runtime evidence report input was rejected before aggregation; no raw input or path was disclosed.'
    ],
    nextStep: 'Provide a workspace JSON runtime evidence report or pipe it on stdin with --runtime-evidence-report -.'
  };
}

function buildExactHeadBoundRuntimeSummaryInputFromOptions(options = {}) {
  const input = {};
  let exactMetadataProvided = false;
  if (Object.hasOwn(options, 'runtimeEvidenceCurrentHead')) {
    input.currentHeadCommit = options.runtimeEvidenceCurrentHead;
    exactMetadataProvided = true;
  }
  if (Object.hasOwn(options, 'runtimeEvidenceExpectedCurrentHead')) {
    input.expectedCurrentHeadCommit = options.runtimeEvidenceExpectedCurrentHead;
    exactMetadataProvided = true;
  }
  if (Object.hasOwn(options, 'runtimeEvidenceGeneratedAt')) {
    input.evidenceGeneratedAt = options.runtimeEvidenceGeneratedAt;
    exactMetadataProvided = true;
  }
  if (options.generatedAt) {
    input.generatedAt = options.generatedAt;
  }
  return exactMetadataProvided ? input : null;
}

function collectExactRuntimeEvidenceRedactionValues(exactInput = null) {
  if (!exactInput || typeof exactInput !== 'object') return [];
  const values = [
    exactInput.currentHeadCommit,
    exactInput.expectedCurrentHeadCommit,
    exactInput.evidenceGeneratedAt
  ].filter(value => typeof value === 'string' && value.trim()).map(value => value.trim());
  return [...new Set([
    ...values,
    ...values.map(value => value.toLowerCase()),
    ...values.map(value => value.toUpperCase())
  ])];
}

function redactExactRuntimeEvidenceValues(value, exactInput = null) {
  const redactions = collectExactRuntimeEvidenceRedactionValues(exactInput);
  if (redactions.length === 0) return value;
  if (typeof value === 'string') {
    return redactions.reduce(
      (current, redaction) => current.split(redaction).join('[redacted]'),
      value
    );
  }
  if (Array.isArray(value)) {
    return value.map(item => redactExactRuntimeEvidenceValues(item, exactInput));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        redactExactRuntimeEvidenceValues(entry, exactInput)
      ])
    );
  }
  return value;
}

function findRc9ChecklistRow(report = {}, rowId = '') {
  const rows = Array.isArray(report.evidence?.rc9DecisionPacket?.completenessChecklist)
    ? report.evidence.rc9DecisionPacket.completenessChecklist
    : [];
  return rows.find(row => row && row.id === rowId) || {};
}

function buildFinalEvidenceAggregationRcGatePrecheck({
  report = {},
  runtimeEvidencePreflight = null
} = {}) {
  const preflight = runtimeEvidencePreflight || {};
  const exactInput = preflight.exactHeadBoundRuntimeSummaryInput || {};
  const summary = report.summary || {};
  const freshHeadRow = findRc9ChecklistRow(report, 'fresh_current_head');
  const strictGateRow = findRc9ChecklistRow(report, 'strict_gate');
  const liveHttpNoWriteRow = findRc9ChecklistRow(report, 'live_http_no_write');
  const zeroGapRow = findRc9ChecklistRow(report, 'validation_aggregator_zero_gap');
  const standardSourceAccepted = preflight.standardInputSourceAccepted === true;
  const exactHeadBoundInputAccepted = exactInput.accepted === true;
  const runtimeEvidenceSummaryAccepted =
    summary.runtimeEvidenceSummaryAccepted === true;
  const rc9PacketAvailable = summary.rc9DecisionPacketAvailable === true;
  const rcGatePrecheckAccepted =
    standardSourceAccepted &&
    exactHeadBoundInputAccepted &&
    runtimeEvidenceSummaryAccepted &&
    rc9PacketAvailable &&
    freshHeadRow.accepted === true;

  return {
    schemaVersion: 'p68-final-evidence-aggregation-rc-gate-precheck-v1',
    sourceMode:
      'runtime_evidence_standard_input_plus_exact_head_bound_summary_input',
    status: rcGatePrecheckAccepted
      ? 'exact_head_bound_runtime_summary_accepted_by_final_aggregation_not_ready'
      : 'blocked_pending_exact_head_bound_runtime_summary_acceptance',
    decision: 'NOT_READY_BLOCKED',
    standardInputSourceAccepted: standardSourceAccepted,
    exactHeadBoundInputProvided: exactInput.provided === true,
    exactHeadBoundInputAccepted,
    exactHeadBoundInputRejected: exactInput.rejected === true,
    runtimeEvidenceSummaryAccepted,
    runtimeEvidenceSummaryRejected:
      summary.runtimeEvidenceSummaryRejected === true,
    finalEvidenceAggregationAccepted: runtimeEvidenceSummaryAccepted,
    rcGatePrecheckAccepted,
    currentHeadBindingStatus:
      typeof summary.runtimeEvidenceSummaryCurrentHeadBindingStatus === 'string'
        ? summary.runtimeEvidenceSummaryCurrentHeadBindingStatus
        : '',
    currentHeadBindingMatched:
      summary.runtimeEvidenceSummaryCurrentHeadBindingMatched === true,
    evidenceFreshnessStatus:
      typeof summary.runtimeEvidenceSummaryEvidenceFreshnessStatus === 'string'
        ? summary.runtimeEvidenceSummaryEvidenceFreshnessStatus
        : '',
    evidenceUnitCount: Number.isFinite(summary.runtimeEvidenceSummaryEvidenceUnitCount)
      ? summary.runtimeEvidenceSummaryEvidenceUnitCount
      : 0,
    requiredEvidenceUnitCount:
      Number.isFinite(summary.runtimeEvidenceSummaryRequiredEvidenceUnitCount)
        ? summary.runtimeEvidenceSummaryRequiredEvidenceUnitCount
        : 0,
    missingEvidenceUnitCount:
      Number.isFinite(summary.runtimeEvidenceSummaryMissingEvidenceUnitCount)
        ? summary.runtimeEvidenceSummaryMissingEvidenceUnitCount
        : 0,
    evidenceUnitsComplete:
      summary.runtimeEvidenceSummaryEvidenceUnitsComplete === true,
    rc9DecisionPacketAvailable: rc9PacketAvailable,
    rc9DecisionPacketStatus:
      typeof summary.rc9DecisionPacketStatus === 'string'
        ? summary.rc9DecisionPacketStatus
        : '',
    rc9DecisionPacketDecision:
      typeof summary.rc9DecisionPacketDecision === 'string'
        ? summary.rc9DecisionPacketDecision
        : '',
    rc9DecisionPacketReadyToRequestRcCutoverApproval:
      summary.rc9DecisionPacketReadyToRequestRcCutoverApproval === true,
    rc9CompletenessChecklistStatus:
      typeof summary.rc9DecisionPacketCompletenessChecklistStatus === 'string'
        ? summary.rc9DecisionPacketCompletenessChecklistStatus
        : '',
    rc9CompletenessChecklistRequiredCount:
      Number.isFinite(summary.rc9DecisionPacketCompletenessChecklistRequiredCount)
        ? summary.rc9DecisionPacketCompletenessChecklistRequiredCount
        : 0,
    rc9CompletenessChecklistAcceptedCount:
      Number.isFinite(summary.rc9DecisionPacketCompletenessChecklistAcceptedCount)
        ? summary.rc9DecisionPacketCompletenessChecklistAcceptedCount
        : 0,
    rc9CompletenessChecklistMissingCount:
      Number.isFinite(summary.rc9DecisionPacketCompletenessChecklistMissingCount)
        ? summary.rc9DecisionPacketCompletenessChecklistMissingCount
        : 0,
    rcGateRows: {
      freshCurrentHeadAccepted: freshHeadRow.accepted === true,
      strictGateAccepted: strictGateRow.accepted === true,
      liveHttpNoWriteAccepted: liveHttpNoWriteRow.accepted === true,
      validationAggregatorZeroGapAccepted: zeroGapRow.accepted === true
    },
    disclosure: {
      lowDisclosure: true,
      rawCurrentHeadCommitOutput: false,
      rawExpectedCurrentHeadCommitOutput: false,
      rawEvidenceGeneratedAtOutput: false,
      rawCurrentHeadCommitPersisted: false,
      rawExpectedCurrentHeadCommitPersisted: false,
      rawEvidenceGeneratedAtPersisted: false
    },
    safety: {
      readsStandardInputOnly: true,
      readsSeparateExactMetadataInputOnly: true,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      readsRealMemory: false,
      writesDurableState: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      readinessClaimed: false,
      rcCutoverAuthorized: false
    },
    canClaimRuntimeReady: false,
    canClaimFinalRcReady: false,
    canClaimV1RcReady: false,
    canClaimRcReady: false,
    nextStep: rcGatePrecheckAccepted
      ? 'Use this as a higher-level RC gate precheck input only; keep RC readiness blocked.'
      : 'Provide accepted standard runtime evidence plus separate exact head-bound freshness input before RC gate precheck acceptance.'
  };
}

function buildRcCutoverPreApprovalCandidatePackage({
  finalEvidenceAggregationRcGatePrecheck = null
} = {}) {
  const precheck = finalEvidenceAggregationRcGatePrecheck || {};
  const rows = precheck.rcGateRows || {};
  const rcGatePrecheckAccepted = precheck.rcGatePrecheckAccepted === true;
  const readyToRequestRcCutoverApproval =
    precheck.rc9DecisionPacketReadyToRequestRcCutoverApproval === true;
  const completenessChecklistComplete =
    precheck.rc9CompletenessChecklistStatus ===
    'complete_for_cutover_approval_request_not_rc_ready';
  const candidatePackageAccepted =
    rcGatePrecheckAccepted &&
    readyToRequestRcCutoverApproval &&
    completenessChecklistComplete &&
    rows.validationAggregatorZeroGapAccepted === true;
  const blockerIds = [];

  if (precheck.standardInputSourceAccepted !== true) {
    blockerIds.push('standard_runtime_evidence_source_not_accepted');
  }
  if (precheck.exactHeadBoundInputAccepted !== true) {
    blockerIds.push('exact_head_bound_runtime_summary_input_not_accepted');
  }
  if (precheck.runtimeEvidenceSummaryAccepted !== true) {
    blockerIds.push('runtime_evidence_summary_not_accepted');
  }
  if (rcGatePrecheckAccepted !== true) {
    blockerIds.push('final_evidence_rc_gate_precheck_not_accepted');
  }
  if (readyToRequestRcCutoverApproval !== true) {
    blockerIds.push('rc9_cutover_approval_request_not_ready');
  }
  if (completenessChecklistComplete !== true) {
    blockerIds.push('rc9_completeness_checklist_not_complete');
  }
  if (rows.validationAggregatorZeroGapAccepted !== true) {
    blockerIds.push('validation_aggregator_zero_gap_not_accepted');
  }

  return {
    schemaVersion: 'p69-rc-cutover-pre-approval-candidate-package-v1',
    packageType: 'rc_cutover_pre_approval_candidate_package',
    sourceMode: 'p68_final_evidence_aggregation_rc_gate_precheck',
    status: candidatePackageAccepted
      ? 'candidate_package_ready_for_owner_cutover_approval_request_not_ready'
      : 'candidate_package_blocked_pending_required_preapproval_evidence',
    decision: 'NOT_READY_BLOCKED',
    candidatePackageAccepted,
    approvalRequestOnly: true,
    readyToRequestRcCutoverApproval,
    rcCutoverApprovalPresent: false,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    rcReady: false,
    rcGatePrecheckAccepted,
    finalEvidenceAggregationAccepted:
      precheck.finalEvidenceAggregationAccepted === true,
    runtimeEvidenceSummaryAccepted:
      precheck.runtimeEvidenceSummaryAccepted === true,
    currentHeadBindingMatched: precheck.currentHeadBindingMatched === true,
    evidenceFreshnessStatus:
      typeof precheck.evidenceFreshnessStatus === 'string'
        ? precheck.evidenceFreshnessStatus
        : '',
    evidenceUnitsComplete: precheck.evidenceUnitsComplete === true,
    rc9DecisionPacket: {
      available: precheck.rc9DecisionPacketAvailable === true,
      decision:
        typeof precheck.rc9DecisionPacketDecision === 'string'
          ? precheck.rc9DecisionPacketDecision
          : '',
      readyToRequestRcCutoverApproval,
      completenessChecklistStatus:
        typeof precheck.rc9CompletenessChecklistStatus === 'string'
          ? precheck.rc9CompletenessChecklistStatus
          : '',
      completenessChecklistRequiredCount:
        Number.isFinite(precheck.rc9CompletenessChecklistRequiredCount)
          ? precheck.rc9CompletenessChecklistRequiredCount
          : 0,
      completenessChecklistAcceptedCount:
        Number.isFinite(precheck.rc9CompletenessChecklistAcceptedCount)
          ? precheck.rc9CompletenessChecklistAcceptedCount
          : 0,
      completenessChecklistMissingCount:
        Number.isFinite(precheck.rc9CompletenessChecklistMissingCount)
          ? precheck.rc9CompletenessChecklistMissingCount
          : 0
    },
    rcGateRows: {
      freshCurrentHeadAccepted: rows.freshCurrentHeadAccepted === true,
      strictGateAccepted: rows.strictGateAccepted === true,
      liveHttpNoWriteAccepted: rows.liveHttpNoWriteAccepted === true,
      validationAggregatorZeroGapAccepted:
        rows.validationAggregatorZeroGapAccepted === true
    },
    blockerIds: [...new Set(blockerIds)].sort(),
    disclosure: {
      lowDisclosure: true,
      rawCurrentHeadCommitOutput: false,
      rawExpectedCurrentHeadCommitOutput: false,
      rawEvidenceGeneratedAtOutput: false,
      endpointOrLocatorOutput: false,
      requestBodyOutput: false,
      rawResponseOutput: false,
      rawErrorOutput: false,
      secretOutput: false,
      privateMemoryContentOutput: false
    },
    safety: {
      readsAggregatedSummaryOnly: true,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsMcpTools: false,
      readsRealMemory: false,
      writesDurableState: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      mutatesConfig: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      pushes: false,
      tags: false,
      releases: false,
      deploys: false,
      executesCutover: false,
      readinessClaimed: false
    },
    canClaimRuntimeReady: false,
    canClaimFinalRcReady: false,
    canClaimV1RcReady: false,
    canClaimRcReady: false,
    nextStep: candidatePackageAccepted
      ? 'Use this package as an owner approval request candidate only; do not execute cutover or claim readiness.'
      : 'Continue closing local evidence prerequisites before preparing an owner cutover approval request candidate.'
  };
}

function buildRcCutoverOwnerApprovalReadinessSummary({
  rcCutoverPreApprovalCandidatePackage = null
} = {}) {
  const candidate = rcCutoverPreApprovalCandidatePackage || {};
  const candidateAccepted = candidate.candidatePackageAccepted === true;
  const ownerReviewReady =
    candidateAccepted &&
    candidate.readyToRequestRcCutoverApproval === true &&
    candidate.rcCutoverApprovalPresent === false &&
    candidate.rcCutoverExecutionAllowed === false &&
    candidate.rcReady === false;
  const blockerIds = candidateAccepted
    ? []
    : [
        'rc_cutover_pre_approval_candidate_package_not_accepted',
        ...(
          Array.isArray(candidate.blockerIds)
            ? candidate.blockerIds
            : ['candidate_package_blockers_unavailable']
        )
      ];

  return {
    schemaVersion: 'p70-rc-cutover-owner-approval-readiness-summary-v1',
    summaryType: 'rc_cutover_owner_approval_readiness_summary',
    sourceMode: 'p69_rc_cutover_pre_approval_candidate_package',
    status: ownerReviewReady
      ? 'owner_approval_readiness_summary_ready_for_exact_owner_review_not_authorization'
      : 'owner_approval_readiness_summary_blocked_pending_candidate_package_acceptance',
    decision: 'NOT_READY_BLOCKED',
    candidatePackageAccepted: candidateAccepted,
    ownerReviewReady,
    approvalRequestOnly: true,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    approvalTextGenerated: false,
    ownerApprovalPresent: false,
    ownerApprovalAccepted: false,
    ownerApprovalBoundToHead: false,
    ownerApprovalExecutionAllowed: false,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    rcReady: false,
    requiredOwnerApprovalFields: [
      'current_head_binding',
      'remote_release_tag_deploy_action_list',
      'config_watchdog_startup_change_scope',
      'rollback_path',
      'validation_commands',
      'single_use_statement'
    ],
    requiredOwnerApprovalFieldValuesIncluded: false,
    candidatePackage: {
      schemaVersion:
        typeof candidate.schemaVersion === 'string'
          ? candidate.schemaVersion
          : '',
      status: typeof candidate.status === 'string'
        ? candidate.status
        : '',
      readyToRequestRcCutoverApproval:
        candidate.readyToRequestRcCutoverApproval === true,
      rcGatePrecheckAccepted: candidate.rcGatePrecheckAccepted === true,
      rc9CompletenessChecklistStatus:
        typeof candidate.rc9DecisionPacket?.completenessChecklistStatus === 'string'
          ? candidate.rc9DecisionPacket.completenessChecklistStatus
          : '',
      blockerCount: Array.isArray(candidate.blockerIds)
        ? candidate.blockerIds.length
        : 0
    },
    blockerIds: [...new Set(blockerIds)].sort(),
    disclosure: {
      lowDisclosure: true,
      rawCurrentHeadCommitOutput: false,
      rawExpectedCurrentHeadCommitOutput: false,
      rawEvidenceGeneratedAtOutput: false,
      requiredOwnerApprovalFieldValuesOutput: false,
      approvalTextOutput: false,
      approvalLineOutput: false,
      endpointOrLocatorOutput: false,
      requestBodyOutput: false,
      rawResponseOutput: false,
      rawErrorOutput: false,
      secretOutput: false,
      privateMemoryContentOutput: false
    },
    safety: {
      readsCandidatePackageOnly: true,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsMcpTools: false,
      readsRealMemory: false,
      writesDurableState: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      mutatesConfig: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      pushes: false,
      tags: false,
      releases: false,
      deploys: false,
      submitsApprovalRequest: false,
      executesCutover: false,
      readinessClaimed: false
    },
    canClaimRuntimeReady: false,
    canClaimFinalRcReady: false,
    canClaimV1RcReady: false,
    canClaimRcReady: false,
    nextStep: ownerReviewReady
      ? 'Jenn may supply a separate exact RC cutover approval bound to current repository reality; this summary is not approval and does not authorize execution.'
      : 'Continue closing local evidence prerequisites before owner approval readiness review.'
  };
}

function buildCliReport(options = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  if (options.runtimeEvidenceReportLoadError) {
    return buildRuntimeEvidenceReportLoadError(
      options.runtimeEvidenceReportLoadError,
      options
    );
  }

  const exactHeadBoundRuntimeSummaryInput =
    buildExactHeadBoundRuntimeSummaryInputFromOptions(options);
  const runtimeEvidencePreflight = options.runtimeEvidenceReport
    ? buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight(
        options.runtimeEvidenceReport,
        {
          exactHeadBoundRuntimeSummaryInput: exactHeadBoundRuntimeSummaryInput || {},
          generatedAt: options.generatedAt || undefined
        }
      )
    : null;
  const runtimeEvidenceSummaryForReport =
    runtimeEvidencePreflight && exactHeadBoundRuntimeSummaryInput
      ? buildRuntimeEvidenceSummaryForAggregatorReplay(options.runtimeEvidenceReport, {
          exactHeadBoundRuntimeSummaryInput,
          includeExactValues: true
        })
      : runtimeEvidencePreflight?.runtimeEvidenceSummaryForAggregator || null;
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: options.generatedAt || undefined,
    runtimeEvidenceSummary: runtimeEvidenceSummaryForReport
  });
  const finalEvidenceAggregationRcGatePrecheck = runtimeEvidencePreflight
    ? buildFinalEvidenceAggregationRcGatePrecheck({
        report,
        runtimeEvidencePreflight
      })
    : null;
  const rcCutoverPreApprovalCandidatePackage =
    finalEvidenceAggregationRcGatePrecheck
      ? buildRcCutoverPreApprovalCandidatePackage({
          finalEvidenceAggregationRcGatePrecheck
        })
      : null;
  const rcCutoverOwnerApprovalReadinessSummary =
    rcCutoverPreApprovalCandidatePackage
      ? buildRcCutoverOwnerApprovalReadinessSummary({
          rcCutoverPreApprovalCandidatePackage
        })
      : null;

  const outputReport = {
    ...report,
    phase: runtimeEvidencePreflight
      ? 'P67-runtime-evidence-standard-input-preflight'
      : 'P24.4-validation-aggregator-decision-exit-code-semantics',
    ...(runtimeEvidencePreflight
      ? {
          runtimeEvidenceReportInput: {
            provided: true,
            accepted: runtimeEvidencePreflight.standardInputSourceAccepted === true,
            rejected: runtimeEvidencePreflight.standardInputSourceAccepted !== true,
            pathDisclosed: false,
            rawInputPrinted: false
          }
        }
      : {}),
    evidence: {
      ...report.evidence,
      p24Aggregator: {
        ...report.evidence.p24Aggregator,
        minimalCliWiring: true,
        decisionExitCodeSemantics: true,
        rc9DecisionPacketEmbedded: true,
        zeroGapCloseoutAuditEmbedded: true
      },
      ...(runtimeEvidencePreflight
        ? {
            p67AuthenticatedHttpBoundedMutationRuntimeEvidencePreflight:
              runtimeEvidencePreflight,
            p68FinalEvidenceAggregationRcGatePrecheck:
              finalEvidenceAggregationRcGatePrecheck,
            p69RcCutoverPreApprovalCandidatePackage:
              rcCutoverPreApprovalCandidatePackage,
            p70RcCutoverOwnerApprovalReadinessSummary:
              rcCutoverOwnerApprovalReadinessSummary
          }
        : {})
    },
    summary: {
      ...report.summary,
      ...(runtimeEvidencePreflight
        ? {
            runtimeEvidenceReportInputProvided: true,
            runtimeEvidenceReportStandardInputSourceAccepted:
              runtimeEvidencePreflight.standardInputSourceAccepted === true,
            runtimeEvidenceReportAggregatorReplayFed:
              runtimeEvidencePreflight.aggregatorReplay?.fed === true,
            runtimeEvidenceReportAggregatorReplayAccepted:
              runtimeEvidencePreflight.aggregatorReplay?.accepted === true,
            runtimeEvidenceReportAggregatorReplayRejected:
              runtimeEvidencePreflight.aggregatorReplay?.rejected === true,
            runtimeEvidenceReportExactHeadBoundInputProvided:
              runtimeEvidencePreflight.exactHeadBoundRuntimeSummaryInput?.provided === true,
            runtimeEvidenceReportExactHeadBoundInputAccepted:
              runtimeEvidencePreflight.exactHeadBoundRuntimeSummaryInput?.accepted === true,
            runtimeEvidenceReportExactHeadBoundInputRejected:
              runtimeEvidencePreflight.exactHeadBoundRuntimeSummaryInput?.rejected === true,
            finalEvidenceAggregationRcGatePrecheckAccepted:
              finalEvidenceAggregationRcGatePrecheck?.rcGatePrecheckAccepted === true,
            finalEvidenceAggregationRuntimeEvidenceSummaryAccepted:
              finalEvidenceAggregationRcGatePrecheck?.runtimeEvidenceSummaryAccepted === true,
            finalEvidenceAggregationCurrentHeadBindingMatched:
              finalEvidenceAggregationRcGatePrecheck?.currentHeadBindingMatched === true,
            finalEvidenceAggregationEvidenceFreshnessStatus:
              finalEvidenceAggregationRcGatePrecheck?.evidenceFreshnessStatus || '',
            rcGatePrecheckFreshCurrentHeadAccepted:
              finalEvidenceAggregationRcGatePrecheck?.rcGateRows
                ?.freshCurrentHeadAccepted === true,
            rcGatePrecheckCompletenessChecklistStatus:
              finalEvidenceAggregationRcGatePrecheck
                ?.rc9CompletenessChecklistStatus || '',
            rcGatePrecheckCanClaimRcReady: false,
            rcCutoverPreApprovalCandidatePackageAccepted:
              rcCutoverPreApprovalCandidatePackage?.candidatePackageAccepted === true,
            rcCutoverPreApprovalCandidatePackageReadyToRequestApproval:
              rcCutoverPreApprovalCandidatePackage?.readyToRequestRcCutoverApproval === true,
            rcCutoverPreApprovalCandidatePackageCanClaimRcReady: false,
            rcCutoverOwnerApprovalReadinessSummaryReadyForOwnerReview:
              rcCutoverOwnerApprovalReadinessSummary?.ownerReviewReady === true,
            rcCutoverOwnerApprovalReadinessSummaryApprovalSubmitted: false,
            rcCutoverOwnerApprovalReadinessSummaryCanClaimRcReady: false,
            runtimeEvidenceReportCanClaimV1RcReady: false
          }
        : {})
    },
    recommendations: [
      'Keep this CLI as a direct-node command unless package script addition is separately authorized.',
      'Keep conditional live checks non-starting by default.',
      'Keep A5-gated checks report-only until explicit authorization.',
      'Use --strict only for future gate semantics; the current NOT_READY_BLOCKED report intentionally exits 1 in strict mode.',
      runtimeEvidencePreflight
        ? 'Use the runtime evidence report input as a low-disclosure standard source preflight only; do not treat sanitized replay as readiness.'
        : 'Plan full matrix aggregation separately from this minimal CLI wrapper.'
    ]
  };

  return redactExactRuntimeEvidenceValues(outputReport, exactHeadBoundRuntimeSummaryInput);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${buildUsageText()}\n`);
    process.exitCode = 0;
    return;
  }

  if (options.runtimeEvidenceReportPath) {
    const runtimeEvidenceReport = readRuntimeEvidenceReportInput(
      options.runtimeEvidenceReportPath
    );
    if (runtimeEvidenceReport.ok) {
      options.runtimeEvidenceReport = runtimeEvidenceReport.value;
    } else {
      options.runtimeEvidenceReportLoadError = runtimeEvidenceReport.reason;
    }
  }

  const report = buildCliReport(options);
  const spacing = options.pretty ? 2 : 0;

  process.stdout.write(`${JSON.stringify(report, null, spacing)}\n`);
  process.exitCode = getExitCodeForDecision(report.decision, {
    strict: options.strict,
    rejected: Boolean(options.rejectedFlag || options.runtimeEvidenceReportLoadError)
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  REJECTED_FLAGS,
  buildRuntimeEvidenceReportLoadError,
  buildExactHeadBoundRuntimeSummaryInputFromOptions,
  buildFinalEvidenceAggregationRcGatePrecheck,
  buildRcCutoverPreApprovalCandidatePackage,
  buildRcCutoverOwnerApprovalReadinessSummary,
  parseArgs,
  buildUsageText,
  redactExactRuntimeEvidenceValues,
  getExitCodeForDecision,
  readRuntimeEvidenceReportInput,
  buildCliReport,
  buildRejectedReport
};
