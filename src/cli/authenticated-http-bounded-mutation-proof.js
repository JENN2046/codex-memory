#!/usr/bin/env node
'use strict';

const DEFAULT_MUTATION_FAMILIES = Object.freeze(['tombstone_memory', 'supersede_memory']);
const REPORT_SCHEMA_VERSION = 'authenticated-http-bounded-mutation-proof-report-v1';

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

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    family: 'both',
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--family') {
      const family = argv[index + 1] || '';
      if (REJECTED_FLAGS.has(family)) {
        options.rejectedFlag = family;
      }
      options.family = family;
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
    }
  }

  return options;
}

function renderHelp() {
  return [
    'Usage: node src/cli/authenticated-http-bounded-mutation-proof.js [--json] [--pretty] [--family both|tombstone_memory|supersede_memory]',
    '',
    'Runs a temp-local synthetic authenticated HTTP bounded mutation proof and emits a low-disclosure receipt report.',
    'The command starts only a loopback port-0 test server, writes no report file, returns no endpoint, token, path, memory id, raw content, raw response, or raw error, and makes no provider calls.',
    '',
    `Default families: ${DEFAULT_MUTATION_FAMILIES.join(', ')}`,
    `Rejected flags: ${[...REJECTED_FLAGS].join(' ')}`
  ].join('\n') + '\n';
}

function buildRejectedReport(rejectedFlag) {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    status: 'error',
    decision: 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REJECTED_UNSAFE_FLAG',
    accepted: false,
    rejectedFlag,
    receiptCount: 0,
    acceptedReceiptCount: 0,
    mutationFamilies: [],
    receipts: [],
    safety: {
      tempLocalOnly: true,
      syntheticOnly: true,
      authenticatedHttpRuntimeObserved: false,
      endpointOrLocatorReturned: false,
      tokenReturned: false,
      pathReturned: false,
      memoryIdReturned: false,
      rawContentReturned: false,
      rawResponseReturned: false,
      rawErrorReturned: false,
      providerCalls: 0,
      publicMcpExpansion: false,
      readinessClaimed: false,
      releaseClaimed: false,
      rcReadyClaimed: false
    },
    artifact: {
      jsonStdoutOnly: true,
      fileWritten: false,
      durableArtifactWritten: false
    },
    nextStep: 'Re-run without unsafe flags.'
  };
}

function isSupportedFamily(family) {
  return !family || family === 'both' || DEFAULT_MUTATION_FAMILIES.includes(family);
}

function buildUnsupportedFamilyReport() {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    status: 'error',
    decision: 'AUTHENTICATED_HTTP_BOUNDED_MUTATION_PROOF_REJECTED_UNSUPPORTED_FAMILY',
    accepted: false,
    receiptCount: 0,
    acceptedReceiptCount: 0,
    mutationFamilies: [],
    blockers: ['unsupported_mutation_family'],
    receipts: [],
    safety: {
      tempLocalOnly: true,
      syntheticOnly: true,
      authenticatedHttpRuntimeObserved: false,
      endpointOrLocatorReturned: false,
      tokenReturned: false,
      pathReturned: false,
      memoryIdReturned: false,
      rawContentReturned: false,
      rawResponseReturned: false,
      rawErrorReturned: false,
      providerCalls: 0,
      publicMcpExpansion: false,
      readinessClaimed: false,
      releaseClaimed: false,
      rcReadyClaimed: false
    },
    artifact: {
      jsonStdoutOnly: true,
      fileWritten: false,
      durableArtifactWritten: false
    },
    nextStep: 'Re-run with --family both, tombstone_memory, or supersede_memory.'
  };
}

function renderText(report = {}) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `accepted: ${report.accepted === true}`,
    `receiptCount: ${Number.isInteger(report.receiptCount) ? report.receiptCount : 0}`,
    `acceptedReceiptCount: ${Number.isInteger(report.acceptedReceiptCount) ? report.acceptedReceiptCount : 0}`,
    `mutationFamilies: ${(report.mutationFamilies || []).join(', ') || '<none>'}`,
    `endpointOrLocatorReturned: ${report.safety?.endpointOrLocatorReturned === true}`,
    `tokenReturned: ${report.safety?.tokenReturned === true}`,
    `memoryIdReturned: ${report.safety?.memoryIdReturned === true}`,
    `rawContentReturned: ${report.safety?.rawContentReturned === true}`,
    `providerCalls: ${Number.isInteger(report.safety?.providerCalls) ? report.safety.providerCalls : 0}`,
    `publicMcpExpansion: ${report.safety?.publicMcpExpansion === true}`,
    `readinessClaimed: ${report.safety?.readinessClaimed === true}`,
    `fileWritten: ${report.artifact?.fileWritten === true}`,
    `nextStep: ${report.nextStep || '<none>'}`
  ];
  if (report.rejectedFlag) {
    lines.splice(3, 0, `rejectedFlag: ${report.rejectedFlag}`);
  }
  return `${lines.join('\n')}\n`;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(renderHelp());
    return 0;
  }

  let report;
  if (options.rejectedFlag) {
    report = buildRejectedReport(options.rejectedFlag);
  } else if (!isSupportedFamily(options.family)) {
    report = buildUnsupportedFamilyReport();
  } else {
    const {
      runAuthenticatedHttpBoundedMutationProofReport
    } = require('../core/AuthenticatedHttpBoundedMutationProofRunner');
    report = await runAuthenticatedHttpBoundedMutationProofReport({ family: options.family });
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
  buildRejectedReport,
  buildUnsupportedFamilyReport,
  isSupportedFamily,
  main,
  parseArgs,
  renderHelp,
  renderText
};
