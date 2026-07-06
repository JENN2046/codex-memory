#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  buildV1RcValidationAggregatorReport
} = require('../core/ValidationAggregatorService');
const {
  buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight
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

  const runtimeEvidencePreflight = options.runtimeEvidenceReport
    ? buildAuthenticatedHttpBoundedMutationRuntimeEvidenceAggregationPreflight(
        options.runtimeEvidenceReport,
        { generatedAt: options.generatedAt || undefined }
      )
    : null;
  const report = buildV1RcValidationAggregatorReport({
    generatedAt: options.generatedAt || undefined,
    runtimeEvidenceSummary:
      runtimeEvidencePreflight?.runtimeEvidenceSummaryForAggregator || null
  });

  return {
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
              runtimeEvidencePreflight
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
  parseArgs,
  buildUsageText,
  getExitCodeForDecision,
  readRuntimeEvidenceReportInput,
  buildCliReport,
  buildRejectedReport
};
