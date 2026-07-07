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

const ARTIFACT_OUTPUT_MODE_FLAGS = Object.freeze([
  ['rcCutoverCandidateArtifact', '--rc-cutover-candidate-artifact'],
  ['rcCutoverOwnerApprovalBoundary', '--rc-cutover-owner-approval-boundary'],
  ['rcCutoverFinalOwnerReviewPackage', '--rc-cutover-final-owner-review-package'],
  ['rcCutoverExecutionBoundaryPrecheck', '--rc-cutover-execution-boundary-precheck']
]);

function collectSelectedArtifactOutputModes(options = {}) {
  return ARTIFACT_OUTPUT_MODE_FLAGS
    .filter(([key]) => options[key] === true)
    .map(([key, flag]) => ({ key, flag }));
}

function parseArgs(argv = []) {
  const options = {
    pretty: false,
    strict: false,
    help: false,
    rcCutoverCandidateArtifact: false,
    rcCutoverOwnerApprovalBoundary: false,
    rcCutoverFinalOwnerReviewPackage: false,
    rcCutoverExecutionBoundaryPrecheck: false,
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
    if (token === '--rc-cutover-candidate-artifact') {
      options.rcCutoverCandidateArtifact = true;
      continue;
    }
    if (token === '--rc-cutover-owner-approval-boundary') {
      options.rcCutoverOwnerApprovalBoundary = true;
      continue;
    }
    if (token === '--rc-cutover-final-owner-review-package') {
      options.rcCutoverFinalOwnerReviewPackage = true;
      continue;
    }
    if (token === '--rc-cutover-execution-boundary-precheck') {
      options.rcCutoverExecutionBoundaryPrecheck = true;
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
    if (token === '--rc-cutover-candidate-artifact-report') {
      options.rcCutoverCandidateArtifactReportPath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--rc-cutover-owner-approval-boundary-report') {
      options.rcCutoverOwnerApprovalBoundaryReportPath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--rc-cutover-final-owner-review-package-report') {
      options.rcCutoverFinalOwnerReviewPackageReportPath = argv[index + 1] || '';
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

  const selectedArtifactOutputModes = collectSelectedArtifactOutputModes(options);
  if (selectedArtifactOutputModes.length > 1) {
    options.outputModeConflict = {
      selectedModeCount: selectedArtifactOutputModes.length,
      selectedFlags: selectedArtifactOutputModes.map(mode => mode.flag),
      selectedKeys: selectedArtifactOutputModes.map(mode => mode.key)
    };
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
    '  --rc-cutover-candidate-artifact-report PATH|-',
    '            Read one low-disclosure RC cutover pre-candidate artifact JSON from a workspace JSON file or stdin, then validate it as owner-review input without generating approval.',
    '  --rc-cutover-owner-approval-boundary-report PATH|-',
    '            Read one low-disclosure owner approval boundary display JSON from a workspace JSON file or stdin, then aggregate it into a final owner-review package without generating approval.',
    '  --rc-cutover-final-owner-review-package-report PATH|-',
    '            Read one low-disclosure final owner-review package JSON from a workspace JSON file or stdin, then prepare an execution boundary precheck without generating approval or executing cutover.',
    '  --runtime-evidence-current-head COMMIT',
    '  --runtime-evidence-expected-current-head COMMIT',
    '  --runtime-evidence-generated-at ISO_TIMESTAMP',
    '            Optional exact head-bound runtime summary metadata supplied separately from the low-disclosure report. Values are used for aggregator replay and are not printed in output.',
    '  --rc-cutover-candidate-artifact',
    '            Emit only the low-disclosure RC cutover pre-candidate evidence artifact JSON to stdout. No file is written and no approval is generated.',
    '  --rc-cutover-owner-approval-boundary',
    '            Emit only the low-disclosure owner approval boundary display JSON to stdout. Requires a candidate artifact report input for an accepted display.',
    '  --rc-cutover-final-owner-review-package',
    '            Emit only the low-disclosure final owner-review package JSON to stdout. Requires an owner approval boundary report input for an accepted package.',
    '  --rc-cutover-execution-boundary-precheck',
    '            Emit only the low-disclosure owner approval / execution boundary precheck JSON to stdout. Requires a final owner-review package report input for an accepted precheck.',
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

const FORBIDDEN_RC_CUTOVER_CANDIDATE_ARTIFACT_PATTERNS = Object.freeze([
  /https?:\/\//i,
  /\bBearer\b/i,
  /\bAuthorization\b/i,
  /\/tmp\/|\\AppData\\|\\Users\\|[A-Z]:\\/i,
  /\.env\b/i,
  /Synthetic temp-local chunk/i,
  /codex-memory-http-bounded-mutation-proof/i,
  /bounded-cleanup-proof-runner/i,
  /http-runner-tombstone-memory/i,
  /http-runner-supersede-old-memory/i,
  /http-runner-supersede-new-memory/i,
  /sk-[A-Za-z0-9_-]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /BEGIN (RSA|OPENSSH|PRIVATE)/i
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS = Object.freeze([
  'current_head_binding',
  'remote_release_tag_deploy_action_list',
  'config_watchdog_startup_change_scope',
  'rollback_path',
  'validation_commands',
  'single_use_statement'
]);

const REQUIRED_RC_CUTOVER_EXECUTION_BOUNDARY_CHECK_IDS = Object.freeze([
  'exact_owner_approval_required',
  'current_head_binding_required',
  'single_use_owner_decision_required',
  'remote_release_tag_deploy_action_list_required',
  'config_watchdog_startup_scope_required',
  'rollback_path_required',
  'validation_commands_required',
  'execution_stays_blocked'
]);

const REQUIRED_P77_SOURCE_CHAIN_IDS = Object.freeze([
  'p67_runtime_evidence_standard_input_preflight',
  'p68_final_evidence_aggregation_rc_gate_precheck',
  'p69_rc_cutover_pre_approval_candidate_package',
  'p70_rc_cutover_owner_approval_readiness_summary',
  'p71_rc_cutover_final_evidence_package_aggregation_outlet',
  'p72_rc_cutover_candidate_artifact_export',
  'p73_rc_cutover_candidate_artifact_intake_precheck',
  'p75_rc_cutover_owner_approval_boundary_precheck',
  'p77_rc_cutover_final_owner_review_package_aggregation'
]);

const P77_SOURCE_CHAIN_PROVENANCE_VERSION =
  'p77-source-chain-provenance-v1';

const P75_OWNER_APPROVAL_BOUNDARY_READY_STATUS =
  'owner_approval_boundary_display_ready_not_authorization';

function containsForbiddenRcCutoverCandidateArtifactMaterial(value) {
  const serialized = JSON.stringify(value);
  return FORBIDDEN_RC_CUTOVER_CANDIDATE_ARTIFACT_PATTERNS
    .some(pattern => pattern.test(serialized));
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

function buildArtifactOutputModeConflictReport(conflict = {}, options = {}) {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: options.generatedAt || undefined
  });
  const selectedFlags = Array.isArray(conflict.selectedFlags)
    ? conflict.selectedFlags
    : [];

  return {
    ...report,
    phase: 'artifact-output-mode-conflict-rejected',
    decision: 'NOT_READY_BLOCKED',
    artifactOutputModeConflict: {
      rejected: true,
      selectedModeCount: selectedFlags.length,
      selectedFlags,
      pathDisclosed: false,
      rawInputPrinted: false
    },
    evidence: {
      ...report.evidence,
      artifactOutputModeConflictRejection: {
        rejected: true,
        selectedModeCount: selectedFlags.length,
        selectedFlags,
        artifactOnlyOutputEmitted: false,
        lowDisclosure: true,
        approvalGenerated: false,
        executesCutover: false,
        readinessClaimed: false
      }
    },
    summary: {
      ...report.summary,
      artifactOutputModeConflictRejected: true,
      artifactOutputModeConflictSelectedModeCount: selectedFlags.length,
      artifactOutputModeConflictArtifactOnlyOutputEmitted: false,
      artifactOutputModeConflictCanClaimRcReady: false
    },
    warnings: [
      ...report.warnings,
      'Multiple artifact-only output modes were rejected fail-closed.'
    ],
    recommendations: [
      ...report.recommendations,
      'Select exactly one artifact-only output mode.'
    ],
    nextStep: 'Select exactly one artifact-only output mode.'
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

function readRcCutoverCandidateArtifactReportInput(
  inputPath,
  { cwd = process.cwd() } = {}
) {
  if (!inputPath) {
    return {
      ok: false,
      reason: 'rc_cutover_candidate_artifact_report_path_required',
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
        reason: 'rc_cutover_candidate_artifact_report_stdin_json_invalid',
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
      reason: 'rc_cutover_candidate_artifact_report_path_rejected',
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
      reason: 'rc_cutover_candidate_artifact_report_file_json_invalid',
      value: null
    };
  }
}

function readRcCutoverOwnerApprovalBoundaryReportInput(
  inputPath,
  { cwd = process.cwd() } = {}
) {
  if (!inputPath) {
    return {
      ok: false,
      reason: 'rc_cutover_owner_approval_boundary_report_path_required',
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
        reason: 'rc_cutover_owner_approval_boundary_report_stdin_json_invalid',
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
      reason: 'rc_cutover_owner_approval_boundary_report_path_rejected',
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
      reason: 'rc_cutover_owner_approval_boundary_report_file_json_invalid',
      value: null
    };
  }
}

function readRcCutoverFinalOwnerReviewPackageReportInput(
  inputPath,
  { cwd = process.cwd() } = {}
) {
  if (!inputPath) {
    return {
      ok: false,
      reason: 'rc_cutover_final_owner_review_package_report_path_required',
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
        reason: 'rc_cutover_final_owner_review_package_report_stdin_json_invalid',
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
      reason: 'rc_cutover_final_owner_review_package_report_path_rejected',
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
      reason: 'rc_cutover_final_owner_review_package_report_file_json_invalid',
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

function buildRcCutoverCandidateArtifactReportLoadError(loadErrorReason, options = {}) {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: options.generatedAt || undefined
  });

  return {
    ...report,
    phase: 'P73-rc-cutover-candidate-artifact-input-rejected',
    rcCutoverCandidateArtifactReportInput: {
      provided: true,
      accepted: false,
      rejected: true,
      rejectReason: loadErrorReason,
      pathDisclosed: false,
      rawInputPrinted: false
    },
    evidence: {
      ...report.evidence,
      p73RcCutoverCandidateArtifactIntakePrecheck: {
        status: 'candidate_artifact_intake_blocked_fail_closed',
        decision: 'NOT_READY_BLOCKED',
        artifactInputProvided: false,
        inputAccepted: false,
        rejectReason: loadErrorReason,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false,
        canClaimRcReady: false
      }
    },
    summary: {
      ...report.summary,
      rcCutoverCandidateArtifactReportInputProvided: true,
      rcCutoverCandidateArtifactReportInputAccepted: false,
      rcCutoverCandidateArtifactIntakeAccepted: false,
      rcCutoverCandidateArtifactIntakeReadyForOwnerReview: false,
      rcCutoverCandidateArtifactIntakeCanClaimRcReady: false
    },
    warnings: [
      ...report.warnings,
      'RC cutover candidate artifact input was rejected before intake; no raw input or path was disclosed.'
    ],
    nextStep: 'Provide a workspace JSON P72 candidate artifact or pipe it on stdin with --rc-cutover-candidate-artifact-report -.'
  };
}

function buildRcCutoverOwnerApprovalBoundaryReportLoadError(
  loadErrorReason,
  options = {}
) {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: options.generatedAt || undefined
  });

  return {
    ...report,
    phase: 'P77-rc-cutover-owner-approval-boundary-input-rejected',
    rcCutoverOwnerApprovalBoundaryReportInput: {
      provided: true,
      accepted: false,
      rejected: true,
      rejectReason: loadErrorReason,
      pathDisclosed: false,
      rawInputPrinted: false
    },
    evidence: {
      ...report.evidence,
      p77RcCutoverFinalOwnerReviewPackageAggregation: {
        status: 'final_owner_review_package_blocked_fail_closed',
        decision: 'NOT_READY_BLOCKED',
        ownerApprovalBoundaryInputProvided: false,
        finalOwnerReviewPackageAccepted: false,
        rejectReason: loadErrorReason,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false,
        canClaimRcReady: false
      }
    },
    summary: {
      ...report.summary,
      rcCutoverOwnerApprovalBoundaryReportInputProvided: true,
      rcCutoverOwnerApprovalBoundaryReportInputAccepted: false,
      rcCutoverFinalOwnerReviewPackageAccepted: false,
      rcCutoverFinalOwnerReviewPackageReadyForOwnerReview: false,
      rcCutoverFinalOwnerReviewPackageApprovalGenerated: false,
      rcCutoverFinalOwnerReviewPackageExecutesCutover: false,
      rcCutoverFinalOwnerReviewPackageCanClaimRcReady: false
    },
    warnings: [
      ...report.warnings,
      'RC cutover owner approval boundary input was rejected before final owner-review package aggregation; no raw input or path was disclosed.'
    ],
    nextStep: 'Provide a workspace JSON P75 owner approval boundary display or pipe it on stdin with --rc-cutover-owner-approval-boundary-report -.'
  };
}

function buildRcCutoverFinalOwnerReviewPackageReportLoadError(
  loadErrorReason,
  options = {}
) {
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: options.generatedAt || undefined
  });

  return {
    ...report,
    phase: 'P78-rc-cutover-final-owner-review-package-input-rejected',
    rcCutoverFinalOwnerReviewPackageReportInput: {
      provided: true,
      accepted: false,
      rejected: true,
      rejectReason: loadErrorReason,
      pathDisclosed: false,
      rawInputPrinted: false
    },
    evidence: {
      ...report.evidence,
      p78RcCutoverOwnerApprovalExecutionBoundaryPrecheck: {
        status: 'owner_approval_execution_boundary_precheck_blocked_fail_closed',
        decision: 'NOT_READY_BLOCKED',
        finalOwnerReviewPackageInputProvided: false,
        boundaryPrecheckAccepted: false,
        rejectReason: loadErrorReason,
        canClaimRuntimeReady: false,
        canClaimFinalRcReady: false,
        canClaimV1RcReady: false,
        canClaimRcReady: false
      }
    },
    summary: {
      ...report.summary,
      rcCutoverFinalOwnerReviewPackageReportInputProvided: true,
      rcCutoverFinalOwnerReviewPackageReportInputAccepted: false,
      rcCutoverOwnerApprovalExecutionBoundaryPrecheckAccepted: false,
      rcCutoverOwnerApprovalExecutionBoundaryPrecheckReadyForExactReview: false,
      rcCutoverOwnerApprovalExecutionBoundaryPrecheckExecutesCutover: false,
      rcCutoverOwnerApprovalExecutionBoundaryPrecheckCanClaimRcReady: false
    },
    warnings: [
      ...report.warnings,
      'RC cutover final owner-review package input was rejected before execution boundary precheck; no raw input or path was disclosed.'
    ],
    nextStep: 'Provide a workspace JSON P77 final owner-review package or pipe it on stdin with --rc-cutover-final-owner-review-package-report -.'
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

function buildRcCutoverFinalEvidencePackageAggregationOutlet({
  runtimeEvidencePreflight = null,
  finalEvidenceAggregationRcGatePrecheck = null,
  rcCutoverPreApprovalCandidatePackage = null,
  rcCutoverOwnerApprovalReadinessSummary = null
} = {}) {
  const preflight = runtimeEvidencePreflight || {};
  const precheck = finalEvidenceAggregationRcGatePrecheck || {};
  const candidate = rcCutoverPreApprovalCandidatePackage || {};
  const ownerSummary = rcCutoverOwnerApprovalReadinessSummary || {};
  const chainRows = [
    {
      id: 'p67_runtime_evidence_standard_input_preflight',
      accepted:
        preflight.standardInputSourceAccepted === true &&
        preflight.aggregatorReplay?.accepted === true,
      sourceMode: 'sanitized_runtime_evidence_report_plus_optional_exact_head_input',
      canClaimReadiness: false
    },
    {
      id: 'p68_final_evidence_aggregation_rc_gate_precheck',
      accepted: precheck.rcGatePrecheckAccepted === true,
      sourceMode: 'final_evidence_aggregation_rc_gate_precheck',
      canClaimReadiness: false
    },
    {
      id: 'p69_rc_cutover_pre_approval_candidate_package',
      accepted: candidate.candidatePackageAccepted === true,
      sourceMode: 'rc_cutover_pre_approval_candidate_package',
      canClaimReadiness: false
    },
    {
      id: 'p70_rc_cutover_owner_approval_readiness_summary',
      accepted: ownerSummary.ownerReviewReady === true,
      sourceMode: 'rc_cutover_owner_approval_readiness_summary',
      canClaimReadiness: false
    }
  ];
  const missingChainIds = chainRows
    .filter(row => row.accepted !== true)
    .map(row => row.id);
  const candidateBlockerIds = Array.isArray(candidate.blockerIds)
    ? candidate.blockerIds
    : [];
  const ownerBlockerIds = Array.isArray(ownerSummary.blockerIds)
    ? ownerSummary.blockerIds
    : [];
  const blockerIds = [
    ...missingChainIds.map(id => `${id}_not_accepted`),
    ...candidateBlockerIds,
    ...ownerBlockerIds
  ];
  const aggregationOutletAccepted =
    missingChainIds.length === 0 &&
    ownerSummary.ownerReviewReady === true &&
    ownerSummary.ownerApprovalPresent === false &&
    ownerSummary.rcCutoverExecutionAllowed === false &&
    ownerSummary.rcReady === false;

  return {
    schemaVersion: 'p71-rc-cutover-final-evidence-package-aggregation-outlet-v1',
    packageType: 'rc_cutover_final_evidence_package_aggregation_outlet',
    sourceMode: 'p67_p68_p69_p70_low_disclosure_chain',
    status: aggregationOutletAccepted
      ? 'final_evidence_package_ready_for_exact_owner_review_not_authorization'
      : 'final_evidence_package_blocked_pending_complete_low_disclosure_chain',
    decision: 'NOT_READY_BLOCKED',
    aggregationOutletAccepted,
    ownerReviewReady: ownerSummary.ownerReviewReady === true,
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
    chain: {
      rowCount: chainRows.length,
      acceptedRowCount: chainRows.length - missingChainIds.length,
      missingRowCount: missingChainIds.length,
      missingIds: missingChainIds,
      rows: chainRows
    },
    evidenceSummary: {
      runtimeEvidenceStandardInputAccepted:
        preflight.standardInputSourceAccepted === true,
      runtimeEvidenceAggregatorReplayAccepted:
        preflight.aggregatorReplay?.accepted === true,
      exactHeadBoundInputAccepted:
        preflight.exactHeadBoundRuntimeSummaryInput?.accepted === true,
      currentHeadBindingMatched: precheck.currentHeadBindingMatched === true,
      evidenceFreshnessStatus:
        typeof precheck.evidenceFreshnessStatus === 'string'
          ? precheck.evidenceFreshnessStatus
          : '',
      evidenceUnitsComplete: precheck.evidenceUnitsComplete === true,
      rcGatePrecheckAccepted: precheck.rcGatePrecheckAccepted === true,
      candidatePackageAccepted: candidate.candidatePackageAccepted === true,
      ownerApprovalReadinessAccepted: ownerSummary.ownerReviewReady === true
    },
    rcGateRows: {
      freshCurrentHeadAccepted:
        precheck.rcGateRows?.freshCurrentHeadAccepted === true,
      strictGateAccepted: precheck.rcGateRows?.strictGateAccepted === true,
      liveHttpNoWriteAccepted:
        precheck.rcGateRows?.liveHttpNoWriteAccepted === true,
      validationAggregatorZeroGapAccepted:
        precheck.rcGateRows?.validationAggregatorZeroGapAccepted === true
    },
    ownerApprovalBoundary: {
      required: true,
      present: false,
      accepted: false,
      submitted: false,
      executionAllowed: false,
      requiredFieldCount: Array.isArray(ownerSummary.requiredOwnerApprovalFields)
        ? ownerSummary.requiredOwnerApprovalFields.length
        : 0,
      requiredFieldValuesIncluded: false,
      canClaimRcReady: false
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
      readsLowDisclosureEvidenceChainOnly: true,
      readsFiles: false,
      scansDirectories: false,
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
    nextStep: aggregationOutletAccepted
      ? 'Use this outlet as the local low-disclosure evidence package for separate exact owner review only; do not execute cutover or claim readiness.'
      : 'Continue closing missing low-disclosure evidence chain rows before preparing exact owner review.'
  };
}

function buildRcCutoverCandidateArtifactExport({
  rcCutoverFinalEvidencePackageAggregationOutlet = null
} = {}) {
  const outlet = rcCutoverFinalEvidencePackageAggregationOutlet || {};
  const outletAccepted = outlet.aggregationOutletAccepted === true;
  const sourceBlockerIds = Array.isArray(outlet.blockerIds)
    ? outlet.blockerIds
    : ['final_evidence_package_aggregation_outlet_unavailable'];
  const blockerIds = outletAccepted
    ? []
    : [
        'final_evidence_package_aggregation_outlet_not_accepted',
        ...sourceBlockerIds
      ];

  return {
    schemaVersion: 'p72-rc-cutover-candidate-artifact-export-v1',
    artifactType: 'rc_cutover_pre_candidate_evidence_artifact_export',
    sourceMode: 'p71_rc_cutover_final_evidence_package_aggregation_outlet',
    status: outletAccepted
      ? 'artifact_ready_for_exact_owner_review_not_authorization'
      : 'artifact_blocked_pending_final_evidence_package_acceptance',
    decision: 'NOT_READY_BLOCKED',
    artifactAccepted: outletAccepted,
    artifactReadyForOwnerReview: outlet.ownerReviewReady === true,
    approvalRequestOnly: true,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    approvalTextGenerated: false,
    ownerApprovalPresent: false,
    ownerApprovalAccepted: false,
    ownerApprovalExecutionAllowed: false,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    rcReady: false,
    export: {
      mode: 'json_stdout_only',
      jsonStdoutOnly: true,
      fileWritten: false,
      durableArtifactWritten: false,
      pathOutput: false,
      pathPersisted: false
    },
    manifest: {
      manifestVersion: 'p72-rc-cutover-candidate-artifact-manifest-v1',
      manifestType: 'low_disclosure_rc_cutover_pre_candidate_manifest',
      sourceCli: 'src/cli/v1-rc-validation-aggregator.js',
      sourceArtifactSchemaVersion:
        typeof outlet.schemaVersion === 'string' ? outlet.schemaVersion : '',
      sourceArtifactAccepted: outletAccepted,
      requiredInputFamilies: [
        'sanitized_runtime_evidence_report',
        'separate_exact_head_bound_runtime_summary_input'
      ],
      includedPackageRefs: [
        'p67AuthenticatedHttpBoundedMutationRuntimeEvidencePreflight',
        'p68FinalEvidenceAggregationRcGatePrecheck',
        'p69RcCutoverPreApprovalCandidatePackage',
        'p70RcCutoverOwnerApprovalReadinessSummary',
        'p71RcCutoverFinalEvidencePackageAggregationOutlet'
      ],
      excludedMaterial: [
        'raw_current_head_commit',
        'raw_expected_current_head_commit',
        'raw_evidence_generated_at',
        'approval_text',
        'approval_line',
        'endpoint_or_locator',
        'request_body',
        'raw_response',
        'raw_error',
        'secret',
        'private_memory_content'
      ],
      outputPolicy: 'low_disclosure_json_stdout_only',
      ownerApprovalRequiredSeparately: true,
      ownerApprovalIncluded: false,
      executionAuthorizationIncluded: false,
      canClaimRcReady: false
    },
    finalEvidencePackageAggregationOutlet:
      outlet && typeof outlet === 'object' && !Array.isArray(outlet)
        ? outlet
        : null,
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
      privateMemoryContentOutput: false,
      artifactPathOutput: false
    },
    safety: {
      readsLowDisclosureEvidenceChainOnly: true,
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsMcpTools: false,
      readsRealMemory: false,
      writesDurableState: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      writesArtifactFile: false,
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
    nextStep: outletAccepted
      ? 'Use this stdout JSON artifact as the local low-disclosure RC cutover pre-candidate package for separate exact owner review only.'
      : 'Continue closing the final evidence package aggregation outlet before treating this artifact as owner-review-ready.'
  };
}

function collectRcCutoverCandidateArtifactIntakeBlockers(artifact = {}) {
  const blockers = [];
  const exportPolicy = isPlainObject(artifact.export) ? artifact.export : {};
  const manifest = isPlainObject(artifact.manifest) ? artifact.manifest : {};
  const finalOutlet = isPlainObject(artifact.finalEvidencePackageAggregationOutlet)
    ? artifact.finalEvidencePackageAggregationOutlet
    : {};
  const disclosure = isPlainObject(artifact.disclosure) ? artifact.disclosure : {};
  const safety = isPlainObject(artifact.safety) ? artifact.safety : {};

  if (!isPlainObject(artifact)) blockers.push('artifact_shape_invalid');
  if (artifact.schemaVersion !== 'p72-rc-cutover-candidate-artifact-export-v1') {
    blockers.push('artifact_schema_version_mismatch');
  }
  if (artifact.artifactType !== 'rc_cutover_pre_candidate_evidence_artifact_export') {
    blockers.push('artifact_type_mismatch');
  }
  if (artifact.decision !== 'NOT_READY_BLOCKED') {
    blockers.push('artifact_decision_mismatch');
  }
  if (artifact.status !== 'artifact_ready_for_exact_owner_review_not_authorization') {
    blockers.push('artifact_status_not_owner_review_ready');
  }
  if (artifact.artifactAccepted !== true) blockers.push('artifact_not_accepted');
  if (artifact.artifactReadyForOwnerReview !== true) {
    blockers.push('artifact_owner_review_not_ready');
  }
  if (Array.isArray(artifact.blockerIds) && artifact.blockerIds.length > 0) {
    blockers.push('artifact_blockers_present');
  }

  if (
    exportPolicy.mode !== 'json_stdout_only' ||
    exportPolicy.jsonStdoutOnly !== true ||
    exportPolicy.fileWritten !== false ||
    exportPolicy.durableArtifactWritten !== false ||
    exportPolicy.pathOutput !== false ||
    exportPolicy.pathPersisted !== false
  ) {
    blockers.push('artifact_export_policy_not_stdout_only');
  }

  if (
    manifest.manifestVersion !==
      'p72-rc-cutover-candidate-artifact-manifest-v1' ||
    manifest.manifestType !== 'low_disclosure_rc_cutover_pre_candidate_manifest' ||
    manifest.outputPolicy !== 'low_disclosure_json_stdout_only' ||
    manifest.ownerApprovalRequiredSeparately !== true ||
    manifest.ownerApprovalIncluded !== false ||
    manifest.executionAuthorizationIncluded !== false ||
    manifest.canClaimRcReady !== false ||
    manifest.sourceArtifactAccepted !== true
  ) {
    blockers.push('artifact_manifest_boundary_invalid');
  }
  const requiredInputFamilies = Array.isArray(manifest.requiredInputFamilies)
    ? manifest.requiredInputFamilies
    : [];
  for (const requiredFamily of [
    'sanitized_runtime_evidence_report',
    'separate_exact_head_bound_runtime_summary_input'
  ]) {
    if (!requiredInputFamilies.includes(requiredFamily)) {
      blockers.push(`artifact_manifest_missing_${requiredFamily}`);
    }
  }
  const includedPackageRefs = Array.isArray(manifest.includedPackageRefs)
    ? manifest.includedPackageRefs
    : [];
  if (!includedPackageRefs.includes('p71RcCutoverFinalEvidencePackageAggregationOutlet')) {
    blockers.push('artifact_manifest_missing_p71_final_outlet_ref');
  }

  if (
    finalOutlet.schemaVersion !==
      'p71-rc-cutover-final-evidence-package-aggregation-outlet-v1' ||
    finalOutlet.aggregationOutletAccepted !== true ||
    finalOutlet.ownerReviewReady !== true ||
    finalOutlet.rcCutoverExecutionAllowed !== false ||
    finalOutlet.rcReady !== false
  ) {
    blockers.push('artifact_final_evidence_package_outlet_not_accepted');
  }

  if (
    artifact.approvalRequestSubmitted === true ||
    artifact.approvalLineGenerated === true ||
    artifact.approvalTextGenerated === true ||
    artifact.ownerApprovalPresent === true ||
    artifact.ownerApprovalAccepted === true ||
    artifact.ownerApprovalExecutionAllowed === true ||
    artifact.rcCutoverApproved === true ||
    artifact.rcCutoverExecuted === true ||
    artifact.rcCutoverExecutionAllowed === true ||
    artifact.rcReady === true ||
    artifact.canClaimRuntimeReady === true ||
    artifact.canClaimFinalRcReady === true ||
    artifact.canClaimV1RcReady === true ||
    artifact.canClaimRcReady === true
  ) {
    blockers.push('artifact_approval_execution_or_readiness_claim_present');
  }

  for (const [key, value] of Object.entries(disclosure)) {
    if (key !== 'lowDisclosure' && value === true) {
      blockers.push(`artifact_disclosure_${key}`);
    }
  }
  for (const [key, value] of Object.entries(safety)) {
    if (key !== 'readsLowDisclosureEvidenceChainOnly' && value === true) {
      blockers.push(`artifact_safety_${key}`);
    }
  }
  if (disclosure.lowDisclosure !== true) {
    blockers.push('artifact_not_low_disclosure');
  }
  if (containsForbiddenRcCutoverCandidateArtifactMaterial(artifact)) {
    blockers.push('artifact_contains_forbidden_material');
  }

  return [...new Set(blockers)].sort();
}

function buildRcCutoverCandidateArtifactIntakePrecheck({
  rcCutoverCandidateArtifactExport = null
} = {}) {
  const artifact = isPlainObject(rcCutoverCandidateArtifactExport)
    ? rcCutoverCandidateArtifactExport
    : {};
  const manifest = isPlainObject(artifact.manifest) ? artifact.manifest : {};
  const finalOutlet = isPlainObject(artifact.finalEvidencePackageAggregationOutlet)
    ? artifact.finalEvidencePackageAggregationOutlet
    : {};
  const blockerIds = collectRcCutoverCandidateArtifactIntakeBlockers(artifact);
  const inputAccepted = blockerIds.length === 0;

  return {
    schemaVersion: 'p73-rc-cutover-candidate-artifact-intake-precheck-v1',
    intakeType: 'rc_cutover_candidate_artifact_intake_precheck',
    sourceMode: 'p72_rc_cutover_candidate_artifact_export',
    status: inputAccepted
      ? 'candidate_artifact_intake_accepted_for_owner_review_not_authorization'
      : 'candidate_artifact_intake_blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    artifactInputProvided: isPlainObject(rcCutoverCandidateArtifactExport),
    inputAccepted,
    ownerReviewInputReady: inputAccepted,
    artifactAcceptedByInput: artifact.artifactAccepted === true,
    artifactReadyForOwnerReview: artifact.artifactReadyForOwnerReview === true,
    approvalRequestOnly: true,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    approvalTextGenerated: false,
    ownerApprovalPresent: false,
    ownerApprovalAccepted: false,
    ownerApprovalExecutionAllowed: false,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    rcReady: false,
    manifestSummary: {
      manifestVersion:
        typeof manifest.manifestVersion === 'string'
          ? manifest.manifestVersion
          : '',
      outputPolicy:
        typeof manifest.outputPolicy === 'string' ? manifest.outputPolicy : '',
      sourceArtifactAccepted: manifest.sourceArtifactAccepted === true,
      requiredInputFamilyCount: Array.isArray(manifest.requiredInputFamilies)
        ? manifest.requiredInputFamilies.length
        : 0,
      includedPackageRefCount: Array.isArray(manifest.includedPackageRefs)
        ? manifest.includedPackageRefs.length
        : 0,
      ownerApprovalRequiredSeparately:
        manifest.ownerApprovalRequiredSeparately === true,
      ownerApprovalIncluded: manifest.ownerApprovalIncluded === true,
      executionAuthorizationIncluded:
        manifest.executionAuthorizationIncluded === true,
      canClaimRcReady: manifest.canClaimRcReady === true
    },
    finalEvidencePackageSummary: {
      schemaVersion:
        typeof finalOutlet.schemaVersion === 'string'
          ? finalOutlet.schemaVersion
          : '',
      aggregationOutletAccepted:
        finalOutlet.aggregationOutletAccepted === true,
      ownerReviewReady: finalOutlet.ownerReviewReady === true,
      chainRowCount: Number.isFinite(finalOutlet.chain?.rowCount)
        ? finalOutlet.chain.rowCount
        : 0,
      acceptedRowCount: Number.isFinite(finalOutlet.chain?.acceptedRowCount)
        ? finalOutlet.chain.acceptedRowCount
        : 0,
      missingRowCount: Number.isFinite(finalOutlet.chain?.missingRowCount)
        ? finalOutlet.chain.missingRowCount
        : 0,
      blockerCount: Array.isArray(finalOutlet.blockerIds)
        ? finalOutlet.blockerIds.length
        : 0,
      rcCutoverExecutionAllowed:
        finalOutlet.rcCutoverExecutionAllowed === true,
      rcReady: finalOutlet.rcReady === true
    },
    blockerIds,
    disclosure: {
      lowDisclosure: true,
      rawCurrentHeadCommitOutput: false,
      rawExpectedCurrentHeadCommitOutput: false,
      rawEvidenceGeneratedAtOutput: false,
      approvalTextOutput: false,
      approvalLineOutput: false,
      endpointOrLocatorOutput: false,
      requestBodyOutput: false,
      rawResponseOutput: false,
      rawErrorOutput: false,
      secretOutput: false,
      privateMemoryContentOutput: false,
      artifactPathOutput: false,
      rawInputPrinted: false
    },
    safety: {
      readsCandidateArtifactInputOnly: true,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsMcpTools: false,
      readsRealMemory: false,
      writesDurableState: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      writesArtifactFile: false,
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
    nextStep: inputAccepted
      ? 'Treat this artifact as an owner-review input only; a separate exact owner approval and execution boundary is still required.'
      : 'Regenerate or repair the P72 low-disclosure artifact before using it as owner-review input.'
  };
}

function buildRcCutoverOwnerApprovalBoundaryPrecheck({
  rcCutoverCandidateArtifactIntakePrecheck = null
} = {}) {
  const intake = isPlainObject(rcCutoverCandidateArtifactIntakePrecheck)
    ? rcCutoverCandidateArtifactIntakePrecheck
    : {};
  const intakeAccepted = intake.inputAccepted === true;
  const ownerReviewInputReady = intake.ownerReviewInputReady === true;
  const finalEvidenceSummary = isPlainObject(intake.finalEvidencePackageSummary)
    ? intake.finalEvidencePackageSummary
    : {};
  const manifestSummary = isPlainObject(intake.manifestSummary)
    ? intake.manifestSummary
    : {};
  const sourceBlockers = Array.isArray(intake.blockerIds)
    ? intake.blockerIds
    : ['candidate_artifact_intake_unavailable'];
  const blockerIds = [];

  if (intakeAccepted !== true) {
    blockerIds.push('candidate_artifact_intake_not_accepted');
  }
  if (ownerReviewInputReady !== true) {
    blockerIds.push('owner_review_input_not_ready');
  }
  if (manifestSummary.ownerApprovalRequiredSeparately !== true) {
    blockerIds.push('owner_approval_required_separately_not_declared');
  }
  if (manifestSummary.ownerApprovalIncluded === true) {
    blockerIds.push('owner_approval_already_included');
  }
  if (manifestSummary.executionAuthorizationIncluded === true) {
    blockerIds.push('execution_authorization_included');
  }
  if (finalEvidenceSummary.aggregationOutletAccepted !== true) {
    blockerIds.push('final_evidence_package_outlet_not_accepted');
  }
  if (finalEvidenceSummary.ownerReviewReady !== true) {
    blockerIds.push('final_evidence_package_owner_review_not_ready');
  }
  if (finalEvidenceSummary.missingRowCount !== 0) {
    blockerIds.push('final_evidence_package_missing_rows_present');
  }
  if (finalEvidenceSummary.blockerCount !== 0) {
    blockerIds.push('final_evidence_package_blockers_present');
  }
  if (finalEvidenceSummary.rcCutoverExecutionAllowed === true) {
    blockerIds.push('final_evidence_package_execution_allowed');
  }
  if (finalEvidenceSummary.rcReady === true) {
    blockerIds.push('final_evidence_package_readiness_claim_present');
  }
  blockerIds.push(...sourceBlockers);

  const boundaryPrecheckAccepted = blockerIds.length === 0;
  const requiredBoundaryFields = [
    {
      id: 'current_head_binding',
      category: 'fresh_head_binding',
      valueIncluded: false,
      rawValueOutput: false,
      requiredFor: 'owner_single_use_cutover_decision'
    },
    {
      id: 'remote_release_tag_deploy_action_list',
      category: 'explicit_delivery_surface_and_forbidden_actions',
      valueIncluded: false,
      rawValueOutput: false,
      requiredFor: 'prove_no_unintended_remote_release_deploy_tag'
    },
    {
      id: 'config_watchdog_startup_change_scope',
      category: 'runtime_configuration_mutation_scope',
      valueIncluded: false,
      rawValueOutput: false,
      requiredFor: 'prove_no_unapproved_config_watchdog_startup_change'
    },
    {
      id: 'rollback_path',
      category: 'rollback_or_abort_posture',
      valueIncluded: false,
      rawValueOutput: false,
      requiredFor: 'owner_risk_acceptance_before_any_cutover'
    },
    {
      id: 'validation_commands',
      category: 'exact_validation_evidence_requirements',
      valueIncluded: false,
      rawValueOutput: false,
      requiredFor: 'fresh_replayable_validation_before_owner_decision'
    },
    {
      id: 'single_use_statement',
      category: 'single_use_owner_authorization_limit',
      valueIncluded: false,
      rawValueOutput: false,
      requiredFor: 'prevent_reuse_or_retry_expansion'
    }
  ];

  return {
    schemaVersion: 'p75-rc-cutover-owner-approval-boundary-precheck-v1',
    boundaryType: 'rc_cutover_owner_approval_boundary_precheck_display',
    sourceMode: 'p73_rc_cutover_candidate_artifact_intake_precheck',
    status: boundaryPrecheckAccepted
      ? P75_OWNER_APPROVAL_BOUNDARY_READY_STATUS
      : 'owner_approval_boundary_display_blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    boundaryPrecheckAccepted,
    ownerReviewInputAccepted: intakeAccepted,
    ownerReviewInputReady,
    ownerApprovalBoundaryDisplayReady: boundaryPrecheckAccepted,
    approvalRequestOnly: true,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    approvalTextGenerated: false,
    ownerApprovalPresent: false,
    ownerApprovalAccepted: false,
    ownerApprovalExecutionAllowed: false,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    rcReady: false,
    requiredBoundaryFields,
    boundaryFieldCount: requiredBoundaryFields.length,
    requiredBoundaryFieldValuesIncluded: false,
    requiredBoundaryRawValuesOutput: false,
    requiredBoundaryRawValuesPersisted: false,
    generatedApprovalMaterial: {
      approvalLineGenerated: false,
      approvalTextGenerated: false,
      approvalTemplateGenerated: false,
      approvalRequestSubmitted: false,
      ownerApprovalAccepted: false,
      executionAuthorizationIncluded: false
    },
    sourceSummary: {
      intakeSchemaVersion:
        typeof intake.schemaVersion === 'string' ? intake.schemaVersion : '',
      intakeStatus: typeof intake.status === 'string' ? intake.status : '',
      manifestOwnerApprovalRequiredSeparately:
        manifestSummary.ownerApprovalRequiredSeparately === true,
      finalEvidencePackageAggregationOutletAccepted:
        finalEvidenceSummary.aggregationOutletAccepted === true,
      finalEvidencePackageOwnerReviewReady:
        finalEvidenceSummary.ownerReviewReady === true,
      finalEvidencePackageMissingRowCount:
        Number.isFinite(finalEvidenceSummary.missingRowCount)
          ? finalEvidenceSummary.missingRowCount
          : 0,
      finalEvidencePackageBlockerCount:
        Number.isFinite(finalEvidenceSummary.blockerCount)
          ? finalEvidenceSummary.blockerCount
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
      approvalTemplateOutput: false,
      endpointOrLocatorOutput: false,
      requestBodyOutput: false,
      rawResponseOutput: false,
      rawErrorOutput: false,
      secretOutput: false,
      privateMemoryContentOutput: false,
      artifactPathOutput: false,
      rawInputPrinted: false
    },
    safety: {
      readsCandidateArtifactIntakeOnly: true,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsMcpTools: false,
      readsRealMemory: false,
      writesDurableState: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      writesArtifactFile: false,
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
    nextStep: boundaryPrecheckAccepted
      ? 'Use this display as the structural owner approval boundary checklist only; separate exact owner approval is still required before any execution.'
      : 'Repair the P73 candidate artifact intake before preparing an owner approval boundary display.'
  };
}

function collectRcCutoverFinalOwnerReviewPackageBlockers(boundary = {}) {
  const blockers = [];
  const fields = Array.isArray(boundary.requiredBoundaryFields)
    ? boundary.requiredBoundaryFields
    : [];
  const fieldIds = fields.map(field => (
    typeof field?.id === 'string' ? field.id : ''
  ));
  const generated = isPlainObject(boundary.generatedApprovalMaterial)
    ? boundary.generatedApprovalMaterial
    : {};
  const disclosure = isPlainObject(boundary.disclosure)
    ? boundary.disclosure
    : {};
  const safety = isPlainObject(boundary.safety) ? boundary.safety : {};

  if (!isPlainObject(boundary)) blockers.push('owner_approval_boundary_shape_invalid');
  if (boundary.schemaVersion !== 'p75-rc-cutover-owner-approval-boundary-precheck-v1') {
    blockers.push('owner_approval_boundary_schema_version_mismatch');
  }
  if (boundary.boundaryType !== 'rc_cutover_owner_approval_boundary_precheck_display') {
    blockers.push('owner_approval_boundary_type_mismatch');
  }
  if (boundary.decision !== 'NOT_READY_BLOCKED') {
    blockers.push('owner_approval_boundary_decision_mismatch');
  }
  if (boundary.status !== P75_OWNER_APPROVAL_BOUNDARY_READY_STATUS) {
    blockers.push('owner_approval_boundary_status_not_ready_for_review');
  }
  if (boundary.boundaryPrecheckAccepted !== true) {
    blockers.push('owner_approval_boundary_not_accepted');
  }
  if (boundary.ownerApprovalBoundaryDisplayReady !== true) {
    blockers.push('owner_approval_boundary_display_not_ready');
  }
  if (boundary.ownerReviewInputAccepted !== true) {
    blockers.push('owner_review_input_not_accepted');
  }
  if (boundary.ownerReviewInputReady !== true) {
    blockers.push('owner_review_input_not_ready');
  }
  if (boundary.requiredBoundaryFieldValuesIncluded !== false) {
    blockers.push('owner_approval_boundary_field_values_included');
  }
  if (boundary.requiredBoundaryRawValuesOutput !== false) {
    blockers.push('owner_approval_boundary_raw_values_output');
  }
  if (boundary.requiredBoundaryRawValuesPersisted !== false) {
    blockers.push('owner_approval_boundary_raw_values_persisted');
  }

  for (const requiredId of REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS) {
    if (!fieldIds.includes(requiredId)) {
      blockers.push(`owner_approval_boundary_missing_${requiredId}`);
    }
  }
  if (new Set(fieldIds).size !== fieldIds.length) {
    blockers.push('owner_approval_boundary_duplicate_fields');
  }
  if (fields.length !== REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS.length) {
    blockers.push('owner_approval_boundary_field_count_mismatch');
  }
  for (const field of fields) {
    const fieldId = typeof field?.id === 'string' ? field.id : 'unknown';
    if (!REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS.includes(fieldId)) {
      blockers.push('owner_approval_boundary_unknown_field');
    }
    if (field?.valueIncluded !== false || field?.rawValueOutput !== false) {
      blockers.push(`owner_approval_boundary_field_value_disclosure_${fieldId}`);
    }
  }

  if (
    generated.approvalLineGenerated === true ||
    generated.approvalTextGenerated === true ||
    generated.approvalTemplateGenerated === true ||
    generated.approvalRequestSubmitted === true ||
    generated.ownerApprovalAccepted === true ||
    generated.executionAuthorizationIncluded === true ||
    boundary.approvalRequestSubmitted === true ||
    boundary.approvalLineGenerated === true ||
    boundary.approvalTextGenerated === true ||
    boundary.ownerApprovalPresent === true ||
    boundary.ownerApprovalAccepted === true ||
    boundary.ownerApprovalExecutionAllowed === true ||
    boundary.rcCutoverApproved === true ||
    boundary.rcCutoverExecuted === true ||
    boundary.rcCutoverExecutionAllowed === true ||
    boundary.rcReady === true ||
    boundary.canClaimRuntimeReady === true ||
    boundary.canClaimFinalRcReady === true ||
    boundary.canClaimV1RcReady === true ||
    boundary.canClaimRcReady === true
  ) {
    blockers.push('owner_approval_boundary_authorization_execution_or_readiness_claim_present');
  }

  for (const [key, value] of Object.entries(disclosure)) {
    if (key !== 'lowDisclosure' && value === true) {
      blockers.push(`owner_approval_boundary_disclosure_${key}`);
    }
  }
  if (disclosure.lowDisclosure !== true) {
    blockers.push('owner_approval_boundary_not_low_disclosure');
  }

  for (const [key, value] of Object.entries(safety)) {
    if (key !== 'readsCandidateArtifactIntakeOnly' && value === true) {
      blockers.push(`owner_approval_boundary_safety_${key}`);
    }
  }
  if (Array.isArray(boundary.blockerIds) && boundary.blockerIds.length > 0) {
    blockers.push('owner_approval_boundary_blockers_present');
  }
  if (containsForbiddenRcCutoverCandidateArtifactMaterial(boundary)) {
    blockers.push('owner_approval_boundary_contains_forbidden_material');
  }

  return [...new Set(blockers)].sort();
}

function buildRcCutoverFinalOwnerReviewPackageAggregation({
  rcCutoverOwnerApprovalBoundaryPrecheck = null
} = {}) {
  const boundary = isPlainObject(rcCutoverOwnerApprovalBoundaryPrecheck)
    ? rcCutoverOwnerApprovalBoundaryPrecheck
    : {};
  const fields = Array.isArray(boundary.requiredBoundaryFields)
    ? boundary.requiredBoundaryFields
    : [];
  const blockerIds = collectRcCutoverFinalOwnerReviewPackageBlockers(boundary);
  const accepted = blockerIds.length === 0;
  const sourceChainAccepted = accepted &&
    boundary.boundaryPrecheckAccepted === true &&
    boundary.ownerApprovalBoundaryDisplayReady === true &&
    Array.isArray(boundary.blockerIds) &&
    boundary.blockerIds.length === 0;
  const safeFields = fields
    .filter(field => REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS.includes(field?.id))
    .map(field => ({
      id: field.id,
      category: typeof field.category === 'string' ? field.category : '',
      requiredFor: typeof field.requiredFor === 'string' ? field.requiredFor : '',
      valueIncluded: false,
      rawValueOutput: false
    }));

  return {
    schemaVersion: 'p77-rc-cutover-final-owner-review-package-aggregation-v1',
    packageType: 'rc_cutover_final_owner_review_package_aggregation',
    sourceMode: 'p75_rc_cutover_owner_approval_boundary_precheck',
    status: accepted
      ? 'final_owner_review_package_ready_not_authorization'
      : 'final_owner_review_package_blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    ownerApprovalBoundaryInputProvided:
      isPlainObject(rcCutoverOwnerApprovalBoundaryPrecheck),
    finalOwnerReviewPackageAccepted: accepted,
    readyForExactOwnerReview: accepted,
    approvalRequestOnly: true,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    approvalTextGenerated: false,
    approvalTemplateGenerated: false,
    ownerApprovalPresent: false,
    ownerApprovalAccepted: false,
    ownerApprovalExecutionAllowed: false,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    rcReady: false,
    packageContents: {
      lowDisclosure: true,
      boundaryDisplayIncluded: true,
      boundaryFieldCount: safeFields.length,
      boundaryFieldValuesIncluded: false,
      approvalMaterialIncluded: false,
      executionAuthorizationIncluded: false,
      ownerApprovalIncluded: false,
      readinessClaimIncluded: false
    },
    requiredBoundaryFields: safeFields,
    sourceSummary: {
      boundarySchemaVersion:
        typeof boundary.schemaVersion === 'string' ? boundary.schemaVersion : '',
      boundaryStatus: typeof boundary.status === 'string' ? boundary.status : '',
      boundaryPrecheckAccepted: boundary.boundaryPrecheckAccepted === true,
      ownerApprovalBoundaryDisplayReady:
        boundary.ownerApprovalBoundaryDisplayReady === true,
      boundaryFieldCount: Number.isFinite(boundary.boundaryFieldCount)
        ? boundary.boundaryFieldCount
        : 0,
      sourceBlockerCount: Array.isArray(boundary.blockerIds)
        ? boundary.blockerIds.length
        : 0
    },
    sourceChainProvenance: {
      provenanceVersion: P77_SOURCE_CHAIN_PROVENANCE_VERSION,
      generatedBy: 'v1-rc-validation-aggregator',
      lowDisclosure: true,
      sourceBoundarySchemaVersion:
        typeof boundary.schemaVersion === 'string' ? boundary.schemaVersion : '',
      sourceBoundaryStatus:
        typeof boundary.status === 'string' ? boundary.status : '',
      sourceBoundaryAccepted: boundary.boundaryPrecheckAccepted === true,
      sourceBoundaryBlockerCount: Array.isArray(boundary.blockerIds)
        ? boundary.blockerIds.length
        : 0,
      priorLowDisclosureChain: [...REQUIRED_P77_SOURCE_CHAIN_IDS],
      requiredChainRowCount: REQUIRED_P77_SOURCE_CHAIN_IDS.length,
      acceptedChainRowCount: sourceChainAccepted
        ? REQUIRED_P77_SOURCE_CHAIN_IDS.length
        : 0,
      allPriorRowsAccepted: sourceChainAccepted,
      fieldValueDisclosure: false,
      approvalMaterialIncluded: false,
      executionAuthorizationIncluded: false,
      readinessClaimIncluded: false,
      rawValuesOutput: false
    },
    blockerIds,
    disclosure: {
      lowDisclosure: true,
      rawCurrentHeadCommitOutput: false,
      rawExpectedCurrentHeadCommitOutput: false,
      rawEvidenceGeneratedAtOutput: false,
      requiredOwnerApprovalFieldValuesOutput: false,
      approvalTextOutput: false,
      approvalLineOutput: false,
      approvalTemplateOutput: false,
      endpointOrLocatorOutput: false,
      requestBodyOutput: false,
      rawResponseOutput: false,
      rawErrorOutput: false,
      secretOutput: false,
      privateMemoryContentOutput: false,
      artifactPathOutput: false,
      rawInputPrinted: false
    },
    safety: {
      readsOwnerApprovalBoundaryInputOnly: true,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsMcpTools: false,
      readsRealMemory: false,
      writesDurableState: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      writesArtifactFile: false,
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
    nextStep: accepted
      ? 'Use this package as an auditable final owner-review candidate only; separate exact owner approval and execution boundary remain required.'
      : 'Repair the owner approval boundary display input before using it as a final owner-review package.'
  };
}

function collectP77SourceChainProvenanceBlockers(sourceChainProvenance = {}) {
  const blockers = [];
  const sourceChainIds = Array.isArray(sourceChainProvenance.priorLowDisclosureChain)
    ? sourceChainProvenance.priorLowDisclosureChain
    : [];

  if (
    sourceChainProvenance.provenanceVersion !==
      P77_SOURCE_CHAIN_PROVENANCE_VERSION ||
    sourceChainProvenance.generatedBy !== 'v1-rc-validation-aggregator' ||
    sourceChainProvenance.lowDisclosure !== true ||
    sourceChainProvenance.sourceBoundarySchemaVersion !==
      'p75-rc-cutover-owner-approval-boundary-precheck-v1' ||
    sourceChainProvenance.sourceBoundaryStatus !==
      P75_OWNER_APPROVAL_BOUNDARY_READY_STATUS ||
    sourceChainProvenance.sourceBoundaryAccepted !== true ||
    sourceChainProvenance.sourceBoundaryBlockerCount !== 0 ||
    sourceChainProvenance.requiredChainRowCount !==
      REQUIRED_P77_SOURCE_CHAIN_IDS.length ||
    sourceChainProvenance.acceptedChainRowCount !==
      REQUIRED_P77_SOURCE_CHAIN_IDS.length ||
    sourceChainProvenance.allPriorRowsAccepted !== true ||
    sourceChainProvenance.fieldValueDisclosure !== false ||
    sourceChainProvenance.approvalMaterialIncluded !== false ||
    sourceChainProvenance.executionAuthorizationIncluded !== false ||
    sourceChainProvenance.readinessClaimIncluded !== false ||
    sourceChainProvenance.rawValuesOutput !== false
  ) {
    blockers.push('final_owner_review_package_source_chain_provenance_invalid');
  }
  if (sourceChainIds.length !== REQUIRED_P77_SOURCE_CHAIN_IDS.length) {
    blockers.push('final_owner_review_package_source_chain_row_count_mismatch');
  }
  if (new Set(sourceChainIds).size !== sourceChainIds.length) {
    blockers.push('final_owner_review_package_source_chain_duplicate_rows');
  }
  for (const requiredId of REQUIRED_P77_SOURCE_CHAIN_IDS) {
    if (!sourceChainIds.includes(requiredId)) {
      blockers.push(`final_owner_review_package_source_chain_missing_${requiredId}`);
    }
  }

  return [...new Set(blockers)].sort();
}

function collectRcCutoverOwnerApprovalExecutionBoundaryBlockers(pkg = {}) {
  const blockers = [];
  const contents = isPlainObject(pkg.packageContents) ? pkg.packageContents : {};
  const fields = Array.isArray(pkg.requiredBoundaryFields)
    ? pkg.requiredBoundaryFields
    : [];
  const fieldIds = fields.map(field => (
    typeof field?.id === 'string' ? field.id : ''
  ));
  const sourceSummary = isPlainObject(pkg.sourceSummary) ? pkg.sourceSummary : {};
  const sourceChainProvenance = isPlainObject(pkg.sourceChainProvenance)
    ? pkg.sourceChainProvenance
    : {};
  const disclosure = isPlainObject(pkg.disclosure) ? pkg.disclosure : {};
  const safety = isPlainObject(pkg.safety) ? pkg.safety : {};

  if (!isPlainObject(pkg)) blockers.push('final_owner_review_package_shape_invalid');
  if (pkg.schemaVersion !== 'p77-rc-cutover-final-owner-review-package-aggregation-v1') {
    blockers.push('final_owner_review_package_schema_version_mismatch');
  }
  if (pkg.packageType !== 'rc_cutover_final_owner_review_package_aggregation') {
    blockers.push('final_owner_review_package_type_mismatch');
  }
  if (pkg.sourceMode !== 'p75_rc_cutover_owner_approval_boundary_precheck') {
    blockers.push('final_owner_review_package_source_mode_mismatch');
  }
  if (pkg.status !== 'final_owner_review_package_ready_not_authorization') {
    blockers.push('final_owner_review_package_status_not_ready_for_review');
  }
  if (pkg.decision !== 'NOT_READY_BLOCKED') {
    blockers.push('final_owner_review_package_decision_mismatch');
  }
  if (pkg.ownerApprovalBoundaryInputProvided !== true) {
    blockers.push('final_owner_review_package_boundary_input_not_provided');
  }
  if (pkg.finalOwnerReviewPackageAccepted !== true) {
    blockers.push('final_owner_review_package_not_accepted');
  }
  if (pkg.readyForExactOwnerReview !== true) {
    blockers.push('final_owner_review_package_not_ready_for_exact_review');
  }
  if (pkg.approvalRequestOnly !== true) {
    blockers.push('final_owner_review_package_not_review_only');
  }

  if (
    contents.lowDisclosure !== true ||
    contents.boundaryDisplayIncluded !== true ||
    contents.boundaryFieldCount !== REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS.length ||
    contents.boundaryFieldValuesIncluded !== false ||
    contents.approvalMaterialIncluded !== false ||
    contents.executionAuthorizationIncluded !== false ||
    contents.ownerApprovalIncluded !== false ||
    contents.readinessClaimIncluded !== false
  ) {
    blockers.push('final_owner_review_package_contents_boundary_invalid');
  }

  for (const requiredId of REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS) {
    if (!fieldIds.includes(requiredId)) {
      blockers.push(`final_owner_review_package_missing_${requiredId}`);
    }
  }
  if (new Set(fieldIds).size !== fieldIds.length) {
    blockers.push('final_owner_review_package_duplicate_fields');
  }
  if (fields.length !== REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS.length) {
    blockers.push('final_owner_review_package_field_count_mismatch');
  }
  for (const field of fields) {
    const fieldId = typeof field?.id === 'string' ? field.id : 'unknown';
    if (!REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS.includes(fieldId)) {
      blockers.push('final_owner_review_package_unknown_field');
    }
    if (field?.valueIncluded !== false || field?.rawValueOutput !== false) {
      blockers.push(`final_owner_review_package_field_value_disclosure_${fieldId}`);
    }
  }

  if (
    sourceSummary.boundarySchemaVersion !==
      'p75-rc-cutover-owner-approval-boundary-precheck-v1' ||
    sourceSummary.boundaryStatus !== P75_OWNER_APPROVAL_BOUNDARY_READY_STATUS ||
    sourceSummary.boundaryPrecheckAccepted !== true ||
    sourceSummary.ownerApprovalBoundaryDisplayReady !== true ||
    sourceSummary.boundaryFieldCount !== REQUIRED_OWNER_APPROVAL_BOUNDARY_FIELD_IDS.length ||
    sourceSummary.sourceBlockerCount !== 0
  ) {
    blockers.push('final_owner_review_package_source_summary_invalid');
  }

  blockers.push(
    ...collectP77SourceChainProvenanceBlockers(sourceChainProvenance)
  );

  if (
    pkg.approvalRequestSubmitted === true ||
    pkg.approvalLineGenerated === true ||
    pkg.approvalTextGenerated === true ||
    pkg.approvalTemplateGenerated === true ||
    pkg.ownerApprovalPresent === true ||
    pkg.ownerApprovalAccepted === true ||
    pkg.ownerApprovalExecutionAllowed === true ||
    pkg.rcCutoverApproved === true ||
    pkg.rcCutoverExecuted === true ||
    pkg.rcCutoverExecutionAllowed === true ||
    pkg.rcReady === true ||
    pkg.canClaimRuntimeReady === true ||
    pkg.canClaimFinalRcReady === true ||
    pkg.canClaimV1RcReady === true ||
    pkg.canClaimRcReady === true
  ) {
    blockers.push('final_owner_review_package_approval_execution_or_readiness_claim_present');
  }

  for (const [key, value] of Object.entries(disclosure)) {
    if (key !== 'lowDisclosure' && value === true) {
      blockers.push(`final_owner_review_package_disclosure_${key}`);
    }
  }
  if (disclosure.lowDisclosure !== true) {
    blockers.push('final_owner_review_package_not_low_disclosure');
  }

  for (const [key, value] of Object.entries(safety)) {
    if (key !== 'readsOwnerApprovalBoundaryInputOnly' && value === true) {
      blockers.push(`final_owner_review_package_safety_${key}`);
    }
  }
  if (Array.isArray(pkg.blockerIds) && pkg.blockerIds.length > 0) {
    blockers.push('final_owner_review_package_blockers_present');
  }
  if (containsForbiddenRcCutoverCandidateArtifactMaterial(pkg)) {
    blockers.push('final_owner_review_package_contains_forbidden_material');
  }

  return [...new Set(blockers)].sort();
}

function buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck({
  rcCutoverFinalOwnerReviewPackageAggregation = null
} = {}) {
  const pkg = isPlainObject(rcCutoverFinalOwnerReviewPackageAggregation)
    ? rcCutoverFinalOwnerReviewPackageAggregation
    : {};
  const sourceChainProvenance = isPlainObject(pkg.sourceChainProvenance)
    ? pkg.sourceChainProvenance
    : {};
  const sourceChainProvenanceAccepted =
    collectP77SourceChainProvenanceBlockers(sourceChainProvenance).length === 0;
  const blockerIds = collectRcCutoverOwnerApprovalExecutionBoundaryBlockers(pkg);
  const accepted = blockerIds.length === 0;
  const rows = [
    {
      id: 'exact_owner_approval_required',
      category: 'separate_owner_decision',
      requiredFor: 'any_future_cutover_execution',
      valueIncluded: false,
      rawValueOutput: false
    },
    {
      id: 'current_head_binding_required',
      category: 'fresh_head_binding',
      requiredFor: 'single_use_owner_decision_scope',
      valueIncluded: false,
      rawValueOutput: false
    },
    {
      id: 'single_use_owner_decision_required',
      category: 'retry_and_reuse_limit',
      requiredFor: 'prevent_boundary_expansion',
      valueIncluded: false,
      rawValueOutput: false
    },
    {
      id: 'remote_release_tag_deploy_action_list_required',
      category: 'delivery_surface_control',
      requiredFor: 'prove_remote_release_deploy_tag_actions_are_not_implicit',
      valueIncluded: false,
      rawValueOutput: false
    },
    {
      id: 'config_watchdog_startup_scope_required',
      category: 'runtime_configuration_mutation_control',
      requiredFor: 'prove_config_watchdog_startup_changes_are_not_implicit',
      valueIncluded: false,
      rawValueOutput: false
    },
    {
      id: 'rollback_path_required',
      category: 'rollback_or_abort_posture',
      requiredFor: 'future_owner_risk_decision',
      valueIncluded: false,
      rawValueOutput: false
    },
    {
      id: 'validation_commands_required',
      category: 'fresh_replayable_validation',
      requiredFor: 'future_owner_decision_evidence',
      valueIncluded: false,
      rawValueOutput: false
    },
    {
      id: 'execution_stays_blocked',
      category: 'execution_gate',
      requiredFor: 'keep_cutover_blocked_until_separate_decision',
      valueIncluded: false,
      rawValueOutput: false
    }
  ];
  const rowIds = rows.map(row => row.id);
  const missingRowIds = REQUIRED_RC_CUTOVER_EXECUTION_BOUNDARY_CHECK_IDS
    .filter(id => !rowIds.includes(id));

  return {
    schemaVersion: 'p78-rc-cutover-owner-approval-execution-boundary-precheck-v1',
    precheckType: 'rc_cutover_owner_approval_execution_boundary_precheck',
    sourceMode: 'p77_rc_cutover_final_owner_review_package_aggregation',
    status: accepted
      ? 'owner_approval_execution_boundary_precheck_ready_not_authorization'
      : 'owner_approval_execution_boundary_precheck_blocked_fail_closed',
    decision: 'NOT_READY_BLOCKED',
    finalOwnerReviewPackageInputProvided:
      isPlainObject(rcCutoverFinalOwnerReviewPackageAggregation),
    finalOwnerReviewPackageAcceptedByInput:
      pkg.finalOwnerReviewPackageAccepted === true,
    boundaryPrecheckAccepted: accepted,
    readyForExactOwnerReview: accepted,
    executionBoundaryPrepared: accepted,
    executionBoundaryReadyForExactOwnerReview: accepted,
    terminalLocalPreCandidatePackage: accepted,
    rcCutoverPreCandidatePackageAuditable: accepted,
    additionalLocalWrapperRequired: false,
    nextRequiredBoundary: accepted
      ? 'separate_exact_owner_decision_or_stop'
      : 'repair_existing_input_not_add_wrapper',
    approvalRequestOnly: true,
    approvalRequestSubmitted: false,
    approvalLineGenerated: false,
    approvalTextGenerated: false,
    approvalTemplateGenerated: false,
    ownerApprovalRequiredSeparately: true,
    ownerApprovalPresent: false,
    ownerApprovalAccepted: false,
    ownerApprovalExecutionAllowed: false,
    rcCutoverApproved: false,
    rcCutoverExecuted: false,
    rcCutoverExecutionAllowed: false,
    canProceedToCutoverExecution: false,
    rcReady: false,
    executionBoundaryChecklist: {
      lowDisclosure: true,
      checkCount: rows.length,
      missingCheckCount: missingRowIds.length,
      missingCheckIds: missingRowIds,
      valuesIncluded: false,
      rawValuesOutput: false,
      rows
    },
    chainConvergence: {
      convergenceStatus: accepted
        ? 'terminal_local_pre_candidate_package_ready_for_owner_decision_not_authorization'
        : 'terminal_local_pre_candidate_package_blocked_pending_input_repair',
      localEvidenceAggregationTerminal: accepted,
      localRcGatePrecheckTerminal: accepted,
      noAdditionalLocalWrapperRequired: true,
      repairInsteadOfWrapWhenBlocked: true,
      stopsBeforeApprovalRequestSubmission: true,
      stopsBeforeOwnerApproval: true,
      stopsBeforeExecution: true,
      stopsBeforeReleaseDeployTag: true,
      stopsBeforeReadinessClaim: true,
      nextBoundaryType: 'separate_exact_owner_decision',
      terminalArtifactSchemaVersion:
        'p78-rc-cutover-owner-approval-execution-boundary-precheck-v1',
      priorLowDisclosureChain: [
        ...REQUIRED_P77_SOURCE_CHAIN_IDS,
        'p78_rc_cutover_owner_approval_execution_boundary_precheck'
      ],
      omittedMaterial: [
        'approval_text',
        'approval_line',
        'approval_template',
        'endpoint_or_locator',
        'request_body',
        'raw_response',
        'raw_error',
        'secret',
        'private_memory_content'
      ]
    },
    sourceSummary: {
      packageSchemaVersion:
        typeof pkg.schemaVersion === 'string' ? pkg.schemaVersion : '',
      packageStatus: typeof pkg.status === 'string' ? pkg.status : '',
      finalOwnerReviewPackageAccepted:
        pkg.finalOwnerReviewPackageAccepted === true,
      readyForExactOwnerReview: pkg.readyForExactOwnerReview === true,
      packageBoundaryFieldCount: Number.isFinite(pkg.packageContents?.boundaryFieldCount)
        ? pkg.packageContents.boundaryFieldCount
        : 0,
      sourceBlockerCount: Array.isArray(pkg.blockerIds) ? pkg.blockerIds.length : 0,
      sourceChainProvenanceAccepted,
      sourceChainRowCount: Array.isArray(sourceChainProvenance.priorLowDisclosureChain)
        ? sourceChainProvenance.priorLowDisclosureChain.length
        : 0
    },
    blockerIds,
    disclosure: {
      lowDisclosure: true,
      rawCurrentHeadCommitOutput: false,
      rawExpectedCurrentHeadCommitOutput: false,
      rawEvidenceGeneratedAtOutput: false,
      requiredOwnerApprovalFieldValuesOutput: false,
      approvalTextOutput: false,
      approvalLineOutput: false,
      approvalTemplateOutput: false,
      endpointOrLocatorOutput: false,
      requestBodyOutput: false,
      rawResponseOutput: false,
      rawErrorOutput: false,
      secretOutput: false,
      privateMemoryContentOutput: false,
      artifactPathOutput: false,
      rawInputPrinted: false
    },
    safety: {
      readsFinalOwnerReviewPackageInputOnly: true,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      callsMcpTools: false,
      readsRealMemory: false,
      writesDurableState: false,
      writesDurableMemory: false,
      writesDurableAudit: false,
      writesArtifactFile: false,
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
    nextStep: accepted
      ? 'Use this precheck as owner-review boundary evidence only; separate exact owner decision remains required before any cutover execution.'
      : 'Repair the final owner-review package input before preparing an owner approval / execution boundary precheck.'
  };
}

function buildCliReport(options = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }
  if (options.outputModeConflict) {
    return buildArtifactOutputModeConflictReport(
      options.outputModeConflict,
      options
    );
  }

  if (options.runtimeEvidenceReportLoadError) {
    return buildRuntimeEvidenceReportLoadError(
      options.runtimeEvidenceReportLoadError,
      options
    );
  }
  if (options.rcCutoverCandidateArtifactReportLoadError) {
    return buildRcCutoverCandidateArtifactReportLoadError(
      options.rcCutoverCandidateArtifactReportLoadError,
      options
    );
  }
  if (options.rcCutoverOwnerApprovalBoundaryReportLoadError) {
    return buildRcCutoverOwnerApprovalBoundaryReportLoadError(
      options.rcCutoverOwnerApprovalBoundaryReportLoadError,
      options
    );
  }
  if (options.rcCutoverFinalOwnerReviewPackageReportLoadError) {
    return buildRcCutoverFinalOwnerReviewPackageReportLoadError(
      options.rcCutoverFinalOwnerReviewPackageReportLoadError,
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
  const rcCutoverFinalEvidencePackageAggregationOutlet =
    rcCutoverOwnerApprovalReadinessSummary
      ? buildRcCutoverFinalEvidencePackageAggregationOutlet({
          runtimeEvidencePreflight,
          finalEvidenceAggregationRcGatePrecheck,
          rcCutoverPreApprovalCandidatePackage,
          rcCutoverOwnerApprovalReadinessSummary
        })
      : null;
  const rcCutoverCandidateArtifactExport =
    rcCutoverFinalEvidencePackageAggregationOutlet
      ? buildRcCutoverCandidateArtifactExport({
          rcCutoverFinalEvidencePackageAggregationOutlet
        })
      : null;
  const rcCutoverCandidateArtifactIntakePrecheck =
    options.rcCutoverCandidateArtifactReport
      ? buildRcCutoverCandidateArtifactIntakePrecheck({
          rcCutoverCandidateArtifactExport:
            options.rcCutoverCandidateArtifactReport
        })
      : null;
  const rcCutoverOwnerApprovalBoundaryPrecheck =
    rcCutoverCandidateArtifactIntakePrecheck
      ? buildRcCutoverOwnerApprovalBoundaryPrecheck({
          rcCutoverCandidateArtifactIntakePrecheck
        })
      : null;
  const rcCutoverFinalOwnerReviewPackageAggregation =
    options.rcCutoverOwnerApprovalBoundaryReport
      ? buildRcCutoverFinalOwnerReviewPackageAggregation({
          rcCutoverOwnerApprovalBoundaryPrecheck:
            options.rcCutoverOwnerApprovalBoundaryReport
        })
      : null;
  const rcCutoverOwnerApprovalExecutionBoundaryPrecheck =
    options.rcCutoverFinalOwnerReviewPackageReport
      ? buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck({
          rcCutoverFinalOwnerReviewPackageAggregation:
            options.rcCutoverFinalOwnerReviewPackageReport
        })
      : null;

  const outputReport = {
    ...report,
    phase: rcCutoverOwnerApprovalExecutionBoundaryPrecheck
      ? 'P78-rc-cutover-owner-approval-execution-boundary-precheck'
      : rcCutoverFinalOwnerReviewPackageAggregation
      ? 'P77-rc-cutover-final-owner-review-package-aggregation'
      : rcCutoverCandidateArtifactIntakePrecheck
      ? 'P73-rc-cutover-candidate-artifact-intake-precheck'
      : runtimeEvidencePreflight
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
    ...(rcCutoverCandidateArtifactIntakePrecheck
      ? {
          rcCutoverCandidateArtifactReportInput: {
            provided: true,
            accepted:
              rcCutoverCandidateArtifactIntakePrecheck.inputAccepted === true,
            rejected:
              rcCutoverCandidateArtifactIntakePrecheck.inputAccepted !== true,
            pathDisclosed: false,
            rawInputPrinted: false
          }
        }
      : {}),
    ...(rcCutoverFinalOwnerReviewPackageAggregation
      ? {
          rcCutoverOwnerApprovalBoundaryReportInput: {
            provided: true,
            accepted:
              rcCutoverFinalOwnerReviewPackageAggregation
                .finalOwnerReviewPackageAccepted === true,
            rejected:
              rcCutoverFinalOwnerReviewPackageAggregation
                .finalOwnerReviewPackageAccepted !== true,
            pathDisclosed: false,
            rawInputPrinted: false
          }
        }
      : {}),
    ...(rcCutoverOwnerApprovalExecutionBoundaryPrecheck
      ? {
          rcCutoverFinalOwnerReviewPackageReportInput: {
            provided: true,
            accepted:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
                .boundaryPrecheckAccepted === true,
            rejected:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
                .boundaryPrecheckAccepted !== true,
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
              rcCutoverOwnerApprovalReadinessSummary,
            p71RcCutoverFinalEvidencePackageAggregationOutlet:
              rcCutoverFinalEvidencePackageAggregationOutlet,
            p72RcCutoverCandidateArtifactExport:
              rcCutoverCandidateArtifactExport
          }
        : {}),
      ...(rcCutoverCandidateArtifactIntakePrecheck
        ? {
            p73RcCutoverCandidateArtifactIntakePrecheck:
              rcCutoverCandidateArtifactIntakePrecheck,
            p75RcCutoverOwnerApprovalBoundaryPrecheck:
              rcCutoverOwnerApprovalBoundaryPrecheck
          }
        : {}),
      ...(rcCutoverFinalOwnerReviewPackageAggregation
        ? {
            p77RcCutoverFinalOwnerReviewPackageAggregation:
              rcCutoverFinalOwnerReviewPackageAggregation
          }
        : {}),
      ...(rcCutoverOwnerApprovalExecutionBoundaryPrecheck
        ? {
            p78RcCutoverOwnerApprovalExecutionBoundaryPrecheck:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
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
            rcCutoverFinalEvidencePackageAggregationOutletAccepted:
              rcCutoverFinalEvidencePackageAggregationOutlet
                ?.aggregationOutletAccepted === true,
            rcCutoverFinalEvidencePackageAggregationOutletReadyForOwnerReview:
              rcCutoverFinalEvidencePackageAggregationOutlet
                ?.ownerReviewReady === true,
            rcCutoverFinalEvidencePackageAggregationOutletCanClaimRcReady: false,
            rcCutoverCandidateArtifactExportAccepted:
              rcCutoverCandidateArtifactExport?.artifactAccepted === true,
            rcCutoverCandidateArtifactExportReadyForOwnerReview:
              rcCutoverCandidateArtifactExport?.artifactReadyForOwnerReview === true,
            rcCutoverCandidateArtifactExportFileWritten: false,
            rcCutoverCandidateArtifactExportCanClaimRcReady: false,
            runtimeEvidenceReportCanClaimV1RcReady: false
          }
        : {}),
      ...(rcCutoverCandidateArtifactIntakePrecheck
        ? {
            rcCutoverCandidateArtifactReportInputProvided: true,
            rcCutoverCandidateArtifactReportInputAccepted:
              rcCutoverCandidateArtifactIntakePrecheck.inputAccepted === true,
            rcCutoverCandidateArtifactIntakeAccepted:
              rcCutoverCandidateArtifactIntakePrecheck.inputAccepted === true,
            rcCutoverCandidateArtifactIntakeReadyForOwnerReview:
              rcCutoverCandidateArtifactIntakePrecheck.ownerReviewInputReady === true,
            rcCutoverCandidateArtifactIntakeBlockerCount:
              rcCutoverCandidateArtifactIntakePrecheck.blockerIds.length,
            rcCutoverCandidateArtifactIntakeApprovalSubmitted: false,
            rcCutoverCandidateArtifactIntakeExecutesCutover: false,
            rcCutoverCandidateArtifactIntakeCanClaimRcReady: false,
            rcCutoverOwnerApprovalBoundaryPrecheckAccepted:
              rcCutoverOwnerApprovalBoundaryPrecheck
                ?.boundaryPrecheckAccepted === true,
            rcCutoverOwnerApprovalBoundaryDisplayReady:
              rcCutoverOwnerApprovalBoundaryPrecheck
                ?.ownerApprovalBoundaryDisplayReady === true,
            rcCutoverOwnerApprovalBoundaryFieldCount:
              rcCutoverOwnerApprovalBoundaryPrecheck?.boundaryFieldCount || 0,
            rcCutoverOwnerApprovalBoundaryFieldValuesIncluded: false,
            rcCutoverOwnerApprovalBoundaryApprovalGenerated: false,
            rcCutoverOwnerApprovalBoundaryExecutesCutover: false,
            rcCutoverOwnerApprovalBoundaryCanClaimRcReady: false
          }
        : {}),
      ...(rcCutoverFinalOwnerReviewPackageAggregation
        ? {
            rcCutoverOwnerApprovalBoundaryReportInputProvided: true,
            rcCutoverOwnerApprovalBoundaryReportInputAccepted:
              rcCutoverFinalOwnerReviewPackageAggregation
                .finalOwnerReviewPackageAccepted === true,
            rcCutoverFinalOwnerReviewPackageAccepted:
              rcCutoverFinalOwnerReviewPackageAggregation
                .finalOwnerReviewPackageAccepted === true,
            rcCutoverFinalOwnerReviewPackageReadyForOwnerReview:
              rcCutoverFinalOwnerReviewPackageAggregation
                .readyForExactOwnerReview === true,
            rcCutoverFinalOwnerReviewPackageFieldCount:
              rcCutoverFinalOwnerReviewPackageAggregation
                .packageContents?.boundaryFieldCount || 0,
            rcCutoverFinalOwnerReviewPackageApprovalGenerated: false,
            rcCutoverFinalOwnerReviewPackageExecutesCutover: false,
            rcCutoverFinalOwnerReviewPackageCanClaimRcReady: false
          }
        : {}),
      ...(rcCutoverOwnerApprovalExecutionBoundaryPrecheck
        ? {
            rcCutoverFinalOwnerReviewPackageReportInputProvided: true,
            rcCutoverFinalOwnerReviewPackageReportInputAccepted:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
                .boundaryPrecheckAccepted === true,
            rcCutoverOwnerApprovalExecutionBoundaryPrecheckAccepted:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
                .boundaryPrecheckAccepted === true,
            rcCutoverOwnerApprovalExecutionBoundaryPrecheckReadyForExactReview:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
                .readyForExactOwnerReview === true,
            rcCutoverOwnerApprovalExecutionBoundaryPrecheckChecklistCount:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
                .executionBoundaryChecklist?.checkCount || 0,
            rcCutoverOwnerApprovalExecutionBoundaryPrecheckTerminalLocalPreCandidatePackage:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
                .terminalLocalPreCandidatePackage === true,
            rcCutoverOwnerApprovalExecutionBoundaryPrecheckNoAdditionalLocalWrapperRequired:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
                .chainConvergence?.noAdditionalLocalWrapperRequired === true,
            rcCutoverOwnerApprovalExecutionBoundaryPrecheckNextBoundaryRequiresExactOwnerDecision:
              rcCutoverOwnerApprovalExecutionBoundaryPrecheck
                .chainConvergence?.nextBoundaryType === 'separate_exact_owner_decision',
            rcCutoverOwnerApprovalExecutionBoundaryPrecheckApprovalGenerated: false,
            rcCutoverOwnerApprovalExecutionBoundaryPrecheckExecutesCutover: false,
            rcCutoverOwnerApprovalExecutionBoundaryPrecheckCanClaimRcReady: false
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
        : 'Plan full matrix aggregation separately from this minimal CLI wrapper.',
      rcCutoverCandidateArtifactIntakePrecheck
        ? 'Use the candidate artifact intake as owner-review input only; do not treat it as approval or RC readiness.'
        : 'Add candidate artifact intake only when a P72 low-disclosure artifact is supplied explicitly.',
      rcCutoverFinalOwnerReviewPackageAggregation
        ? 'Use the final owner-review package as review input only; do not treat it as approval, cutover authorization, or RC readiness.'
        : 'Add final owner-review package aggregation only when a P75 owner approval boundary display is supplied explicitly.',
      rcCutoverOwnerApprovalExecutionBoundaryPrecheck
        ? 'Use the execution boundary precheck as owner-review evidence only; do not execute cutover or claim RC readiness.'
        : 'Add execution boundary precheck only when a P77 final owner-review package is supplied explicitly.'
    ]
  };

  return redactExactRuntimeEvidenceValues(outputReport, exactHeadBoundRuntimeSummaryInput);
}

function selectCliOutput(report = {}, options = {}) {
  if (options.outputModeConflict) {
    return report;
  }
  if (options.rcCutoverCandidateArtifact) {
    return (
      report.evidence?.p72RcCutoverCandidateArtifactExport ||
      buildRcCutoverCandidateArtifactExport()
    );
  }
  if (options.rcCutoverOwnerApprovalBoundary) {
    return (
      report.evidence?.p75RcCutoverOwnerApprovalBoundaryPrecheck ||
      buildRcCutoverOwnerApprovalBoundaryPrecheck()
    );
  }
  if (options.rcCutoverFinalOwnerReviewPackage) {
    return (
      report.evidence?.p77RcCutoverFinalOwnerReviewPackageAggregation ||
      buildRcCutoverFinalOwnerReviewPackageAggregation()
    );
  }
  if (options.rcCutoverExecutionBoundaryPrecheck) {
    return (
      report.evidence?.p78RcCutoverOwnerApprovalExecutionBoundaryPrecheck ||
      buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck()
    );
  }
  return report;
}

function writeCliReportAndSetExitCode(options = {}) {
  const report = buildCliReport(options);
  const output = selectCliOutput(report, options);
  const spacing = options.pretty ? 2 : 0;

  process.stdout.write(`${JSON.stringify(output, null, spacing)}\n`);
  process.exitCode = getExitCodeForDecision(report.decision, {
    strict: options.strict,
    rejected: Boolean(
      options.rejectedFlag ||
      options.outputModeConflict ||
      options.runtimeEvidenceReportLoadError ||
      options.rcCutoverCandidateArtifactReportLoadError ||
      options.rcCutoverOwnerApprovalBoundaryReportLoadError ||
      options.rcCutoverFinalOwnerReviewPackageReportLoadError
    )
  });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${buildUsageText()}\n`);
    process.exitCode = 0;
    return;
  }

  if (options.rejectedFlag || options.outputModeConflict) {
    writeCliReportAndSetExitCode(options);
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
  if (options.rcCutoverCandidateArtifactReportPath) {
    const rcCutoverCandidateArtifactReport =
      readRcCutoverCandidateArtifactReportInput(
        options.rcCutoverCandidateArtifactReportPath
      );
    if (rcCutoverCandidateArtifactReport.ok) {
      options.rcCutoverCandidateArtifactReport =
        rcCutoverCandidateArtifactReport.value;
    } else {
      options.rcCutoverCandidateArtifactReportLoadError =
        rcCutoverCandidateArtifactReport.reason;
    }
  }
  if (options.rcCutoverOwnerApprovalBoundaryReportPath) {
    const rcCutoverOwnerApprovalBoundaryReport =
      readRcCutoverOwnerApprovalBoundaryReportInput(
        options.rcCutoverOwnerApprovalBoundaryReportPath
      );
    if (rcCutoverOwnerApprovalBoundaryReport.ok) {
      options.rcCutoverOwnerApprovalBoundaryReport =
        rcCutoverOwnerApprovalBoundaryReport.value;
    } else {
      options.rcCutoverOwnerApprovalBoundaryReportLoadError =
        rcCutoverOwnerApprovalBoundaryReport.reason;
    }
  }
  if (options.rcCutoverFinalOwnerReviewPackageReportPath) {
    const rcCutoverFinalOwnerReviewPackageReport =
      readRcCutoverFinalOwnerReviewPackageReportInput(
        options.rcCutoverFinalOwnerReviewPackageReportPath
      );
    if (rcCutoverFinalOwnerReviewPackageReport.ok) {
      options.rcCutoverFinalOwnerReviewPackageReport =
        rcCutoverFinalOwnerReviewPackageReport.value;
    } else {
      options.rcCutoverFinalOwnerReviewPackageReportLoadError =
        rcCutoverFinalOwnerReviewPackageReport.reason;
    }
  }

  writeCliReportAndSetExitCode(options);
}

if (require.main === module) {
  main();
}

module.exports = {
  REJECTED_FLAGS,
  buildRuntimeEvidenceReportLoadError,
  buildRcCutoverCandidateArtifactReportLoadError,
  buildExactHeadBoundRuntimeSummaryInputFromOptions,
  buildFinalEvidenceAggregationRcGatePrecheck,
  buildRcCutoverPreApprovalCandidatePackage,
  buildRcCutoverOwnerApprovalReadinessSummary,
  buildRcCutoverFinalEvidencePackageAggregationOutlet,
  buildRcCutoverCandidateArtifactExport,
  buildRcCutoverCandidateArtifactIntakePrecheck,
  buildRcCutoverOwnerApprovalBoundaryPrecheck,
  buildRcCutoverFinalOwnerReviewPackageAggregation,
  buildRcCutoverOwnerApprovalExecutionBoundaryPrecheck,
  parseArgs,
  buildUsageText,
  selectCliOutput,
  redactExactRuntimeEvidenceValues,
  getExitCodeForDecision,
  readRuntimeEvidenceReportInput,
  readRcCutoverCandidateArtifactReportInput,
  readRcCutoverOwnerApprovalBoundaryReportInput,
  readRcCutoverFinalOwnerReviewPackageReportInput,
  buildCliReport,
  buildRejectedReport
};
