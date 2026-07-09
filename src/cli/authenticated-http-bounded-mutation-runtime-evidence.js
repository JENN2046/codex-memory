#!/usr/bin/env node
'use strict';

const {
  REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS
} = require('../core/AuthenticatedHttpBoundedMutationProofRuntimeEvidenceIntake');

const REPORT_SCHEMA_VERSION =
  'authenticated-http-bounded-mutation-proof-runtime-evidence-report-v1';
const DEFAULT_MUTATION_FAMILY = 'both';

const REJECTED_FLAGS = new Set([
  '--provider',
  '--real-memory',
  '--raw-memory',
  '--read-secret',
  '--write-secret',
  '--print-token',
  '--print-endpoint',
  '--write-artifact',
  '--output-file',
  '--persist',
  '--release',
  '--deploy',
  '--tag',
  '--push',
  '--rc-ready',
  '--readiness',
  '--production',
  '--public-mcp-expansion',
  '--config',
  '--watchdog',
  '--startup'
]);

function parseCsvList(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    family: DEFAULT_MUTATION_FAMILY,
    generatedAt: '',
    evidenceGeneratedAt: '',
    currentHeadCommit: '',
    expectedCurrentHeadCommit: '',
    evidenceUnitIds: [],
    localRuntimeEvidenceMatrixExecuted: false,
    allowlistedFinalRcEvidenceRunnerExecuted: false,
    rejectedFlag: null,
    unknownFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (token === '--family') {
      const family = argv[index + 1] || '';
      if (REJECTED_FLAGS.has(family)) options.rejectedFlag = family;
      options.family = family;
      index += 1;
      continue;
    }
    if (token === '--generated-at') {
      options.generatedAt = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--evidence-generated-at') {
      options.evidenceGeneratedAt = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--current-head') {
      options.currentHeadCommit = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--expected-current-head') {
      options.expectedCurrentHeadCommit = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--evidence-unit') {
      options.evidenceUnitIds.push(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--evidence-units') {
      options.evidenceUnitIds.push(...parseCsvList(argv[index + 1] || ''));
      index += 1;
      continue;
    }
    if (token === '--local-runtime-matrix-executed') {
      options.localRuntimeEvidenceMatrixExecuted = true;
      continue;
    }
    if (token === '--allowlisted-final-rc-evidence-runner-executed') {
      options.allowlistedFinalRcEvidenceRunnerExecuted = true;
      continue;
    }
    if (token === '--locally-evidenced-runtime-gap') {
      if (!Object.hasOwn(options, 'locallyEvidencedRuntimeGaps')) {
        options.locallyEvidencedRuntimeGaps = [];
      }
      options.locallyEvidencedRuntimeGaps.push(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--locally-evidenced-runtime-gaps') {
      if (!Object.hasOwn(options, 'locallyEvidencedRuntimeGaps')) {
        options.locallyEvidencedRuntimeGaps = [];
      }
      options.locallyEvidencedRuntimeGaps.push(...parseCsvList(argv[index + 1] || ''));
      index += 1;
      continue;
    }
    if (token === '--remaining-runtime-gap') {
      if (!Object.hasOwn(options, 'remainingRuntimeGaps')) {
        options.remainingRuntimeGaps = [];
      }
      options.remainingRuntimeGaps.push(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--remaining-runtime-gaps') {
      if (!Object.hasOwn(options, 'remainingRuntimeGaps')) {
        options.remainingRuntimeGaps = [];
      }
      options.remainingRuntimeGaps.push(...parseCsvList(argv[index + 1] || ''));
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
      continue;
    }
    if (token.startsWith('--')) {
      options.unknownFlag = token;
    }
  }

  return options;
}

function renderHelp() {
  return [
    'Usage: node src/cli/authenticated-http-bounded-mutation-runtime-evidence.js [--json] [--pretty] [--family both|tombstone_memory|supersede_memory]',
    '',
    'Runs the temp-local authenticated HTTP bounded mutation proof, generates a low-disclosure runtime evidence artifact, and feeds it into the validation aggregator intake path.',
    'Default metadata is intentionally incomplete, so the report stays blocked until exact head-bound runtime matrix metadata is supplied.',
    '',
    'Optional exact metadata:',
    '  --current-head COMMIT',
    '  --expected-current-head COMMIT',
    '  --evidence-generated-at ISO_TIMESTAMP',
    '  --generated-at ISO_TIMESTAMP',
    '  --evidence-unit A5-GAP-N',
    '  --evidence-units A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5',
    '  --local-runtime-matrix-executed',
    '  --allowlisted-final-rc-evidence-runner-executed',
    '  --locally-evidenced-runtime-gap GAP_ID',
    '  --locally-evidenced-runtime-gaps GAP_ID,GAP_ID',
    '  --remaining-runtime-gap GAP_ID',
    '  --remaining-runtime-gaps GAP_ID,GAP_ID',
    '',
    'Runtime gap IDs are accepted only from the static allowlist used by the validation aggregator; unsupported IDs fail closed without printing the raw value.',
    `Required evidence units for accepted aggregator intake: ${REQUIRED_RUNTIME_EVIDENCE_UNIT_IDS.join(', ')}`,
    `Rejected flags: ${[...REJECTED_FLAGS].join(' ')}`,
    '',
    'This command writes no report file, prints no endpoint, token, path, memory id, raw content, raw response, raw error, secret, or commit value, and makes no provider calls.'
  ].join('\n') + '\n';
}

function buildRejectedReport(flag) {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: 'authenticated_http_bounded_cleanup_suppression_runtime_evidence_aggregation_report',
    status: 'error',
    decision: 'AUTHENTICATED_HTTP_BOUNDED_CLEANUP_SUPPRESSION_RUNTIME_EVIDENCE_AGGREGATION_REJECTED_UNSAFE_FLAG',
    accepted: false,
    rejectedFlag: flag,
    sourceRouteSummary: {
      accepted: false,
      receiptCount: 0,
      acceptedReceiptCount: 0,
      mutationFamiliesComplete: false
    },
    runtimeEvidenceArtifact: null,
    intake: {
      accepted: false,
      validationAggregatorBridgeAccepted: false,
      validationAggregatorBridgeRejected: false,
      canClaimRuntimeReady: false,
      canClaimFinalRcReady: false,
      canClaimV1RcReady: false,
      canClaimRcReady: false
    },
    artifact: {
      jsonStdoutOnly: true,
      fileWritten: false,
      durableArtifactWritten: false
    },
    disclosure: {
      lowDisclosure: true,
      endpointOrLocatorIncluded: false,
      tokenIncluded: false,
      pathIncluded: false,
      memoryIdIncluded: false,
      rawContentIncluded: false,
      rawResponseIncluded: false,
      rawErrorIncluded: false,
      secretIncluded: false,
      currentHeadCommitIncluded: false,
      expectedCurrentHeadCommitIncluded: false
    },
    safety: {
      tempLocalOnly: true,
      syntheticOnly: true,
      providerCalls: 0,
      publicMcpExpansion: false,
      durablePrivateMemoryWrite: false,
      rawStoreScan: false,
      realPrivateMemoryAccess: false,
      endpointOrLocatorReturned: false,
      tokenReturned: false,
      pathReturned: false,
      memoryIdReturned: false,
      rawContentReturned: false,
      rawResponseReturned: false,
      rawErrorReturned: false,
      remoteWrites: false,
      configChanged: false,
      readinessClaimed: false,
      releaseClaimed: false,
      rcReadyClaimed: false
    },
    blockers: ['unsafe_or_unknown_flag_rejected'],
    nextStep: 'Re-run without unsafe or unsupported flags.'
  };
}

function renderText(report = {}) {
  return [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `accepted: ${report.accepted === true}`,
    `routeSummaryAccepted: ${report.sourceRouteSummary?.accepted === true}`,
    `aggregatorInputFed: ${report.runtimeEvidenceArtifact?.aggregatorInputFed === true}`,
    `aggregatorBridgeAccepted: ${report.intake?.validationAggregatorBridgeAccepted === true}`,
    `aggregatorBridgeRejected: ${report.intake?.validationAggregatorBridgeRejected === true}`,
    `aggregatorRejectReason: ${report.intake?.validationAggregatorBridgeRejectReason || ''}`,
    `providerCalls: ${Number.isInteger(report.safety?.providerCalls) ? report.safety.providerCalls : 0}`,
    `endpointOrLocatorReturned: ${report.safety?.endpointOrLocatorReturned === true}`,
    `rawResponseReturned: ${report.safety?.rawResponseReturned === true}`,
    `readinessClaimed: ${report.safety?.readinessClaimed === true}`,
    `fileWritten: ${report.artifact?.fileWritten === true}`,
    `nextStep: ${report.nextStep || '<none>'}`
  ].join('\n') + '\n';
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(renderHelp());
    return 0;
  }

  let report;
  if (options.rejectedFlag || options.unknownFlag) {
    report = buildRejectedReport(options.rejectedFlag || options.unknownFlag);
  } else {
    const {
      buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport
    } = require('../core/AuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport');
    report = await buildAuthenticatedHttpBoundedMutationProofRuntimeEvidenceReport(options);
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, options.pretty ? 2 : 0));
    process.stdout.write('\n');
  } else {
    process.stdout.write(renderText(report));
  }

  return report.status === 'error' || report.status === 'blocked' ? 1 : 0;
}

if (require.main === module) {
  main().then(code => {
    process.exitCode = code;
  }).catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  REJECTED_FLAGS,
  buildRejectedReport,
  main,
  parseArgs,
  renderHelp,
  renderText
};
