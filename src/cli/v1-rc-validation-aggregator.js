#!/usr/bin/env node
const {
  buildV1RcValidationAggregatorReport
} = require('../core/ValidationAggregatorService');

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
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
      continue;
    }
  }

  return options;
}

function buildUsageText() {
  return [
    'Usage: node src/cli/v1-rc-validation-aggregator.js [--strict] [--pretty] [--generated-at ISO_TIMESTAMP]',
    '',
    'Modes:',
    '  default   Emit a read-only JSON validation report and exit 0, even when the decision is blocked.',
    '  --strict  Emit the same JSON report but exit non-zero unless the decision is READY_FOR_V1_0_RC.',
    '  --help    Show this usage text without running live checks.',
    '',
    'This minimal CLI never starts services, calls providers, applies migrations, writes memory, or refreshes live MCP/HTTP evidence.'
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

function buildCliReport(options = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const report = buildV1RcValidationAggregatorReport({
    generatedAt: options.generatedAt || undefined
  });

  return {
    ...report,
    phase: 'P24.4-validation-aggregator-decision-exit-code-semantics',
    evidence: {
      ...report.evidence,
      p24Aggregator: {
        ...report.evidence.p24Aggregator,
        minimalCliWiring: true,
        decisionExitCodeSemantics: true,
        rc9DecisionPacketEmbedded: true,
        zeroGapCloseoutAuditEmbedded: true
      }
    },
    recommendations: [
      'Keep this CLI as a direct-node command unless package script addition is separately authorized.',
      'Keep conditional live checks non-starting by default.',
      'Keep A5-gated checks report-only until explicit authorization.',
      'Use --strict only for future gate semantics; the current NOT_READY_BLOCKED report intentionally exits 1 in strict mode.',
      'Plan full matrix aggregation separately from this minimal CLI wrapper.'
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

  const report = buildCliReport(options);
  const spacing = options.pretty ? 2 : 0;

  process.stdout.write(`${JSON.stringify(report, null, spacing)}\n`);
  process.exitCode = getExitCodeForDecision(report.decision, {
    strict: options.strict,
    rejected: Boolean(options.rejectedFlag)
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  REJECTED_FLAGS,
  parseArgs,
  buildUsageText,
  getExitCodeForDecision,
  buildCliReport,
  buildRejectedReport
};
