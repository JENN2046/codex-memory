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
    generatedAt: null,
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
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

function buildRejectedReport(rejectedFlag) {
  return {
    schemaVersion: 'v1-rc-validation-aggregator-v1',
    version: 'v1',
    phase: 'P24.3-validation-aggregator-cli-wiring-minimal-implementation',
    mode: 'read-only',
    decision: 'NOT_READY_BLOCKED',
    rejectedFlag,
    error: `${rejectedFlag} is outside the minimal validation aggregator CLI boundary.`,
    mutated: false,
    providerCalls: 0,
    serviceStarted: false,
    durableMemoryTouched: false,
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
    phase: 'P24.3-validation-aggregator-cli-wiring-minimal-implementation',
    evidence: {
      ...report.evidence,
      p24Aggregator: {
        ...report.evidence.p24Aggregator,
        minimalCliWiring: true
      }
    },
    recommendations: [
      'Keep this CLI as a direct-node command unless package script addition is separately authorized.',
      'Keep conditional live checks non-starting by default.',
      'Keep A5-gated checks report-only until explicit authorization.',
      'Plan full matrix aggregation separately from this minimal CLI wrapper.'
    ]
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildCliReport(options);
  const spacing = options.pretty ? 2 : 0;

  process.stdout.write(`${JSON.stringify(report, null, spacing)}\n`);
  process.exitCode = options.rejectedFlag ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  REJECTED_FLAGS,
  parseArgs,
  buildCliReport,
  buildRejectedReport
};
