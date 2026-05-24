#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  evaluateRecallProofExecutionPreflight
} = require('../core/RecallProofExecutionPreflight');

const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'recall-proof-execution-preflight-v1.json'
);

const REJECTED_FLAGS = new Set([
  '--execute',
  '--run',
  '--live-proof',
  '--search-memory',
  '--record-memory',
  '--provider',
  '--write',
  '--apply',
  '--mutate',
  '--start-service'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    fixturePath: DEFAULT_FIXTURE_PATH,
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
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
    }
  }

  return options;
}

function loadFixture(fixturePath = DEFAULT_FIXTURE_PATH) {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'RECALL_PROOF_PREFLIGHT_REJECTED_EXECUTION_FLAG',
    rejectedFlag,
    acceptedForExecutionPreflight: false,
    executionStarted: false,
    mutated: false,
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    nextStep: 'Re-run without execution, mutation, provider, or live-proof flags.'
  };
}

function buildReport(options = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const fixture = loadFixture(options.fixturePath);
  const preflight = evaluateRecallProofExecutionPreflight(fixture);

  return {
    status: preflight.acceptedForExecutionPreflight ? 'ok' : 'blocked',
    decision: preflight.status,
    source: 'explicit_input_fixture',
    fixturePath: options.fixturePath,
    basisId: preflight.basisId,
    acceptedForExecutionPreflight: preflight.acceptedForExecutionPreflight,
    executionStarted: preflight.executionStarted,
    blockerReasons: preflight.blockerReasons,
    exactApprovalLineMatched: preflight.exactApprovalLineMatched,
    cleanSyncedMainHead: preflight.cleanSyncedMainHead,
    exactQueryFamilyBound: preflight.exactQueryFamilyBound,
    internalProofSeamBound: preflight.internalProofSeamBound,
    boundaryFlagsBound: preflight.boundaryFlagsBound,
    normalizedGitFacts: preflight.normalizedGitFacts,
    expectedQueryFamily: preflight.expectedQueryFamily,
    safety: preflight.safety,
    readinessClaimAllowed: false,
    memoryRecallReliableClaimed: false,
    nextStep: preflight.acceptedForExecutionPreflight
      ? 'Review preflight output; live proof execution remains a separate step and is not performed by this command.'
      : 'Resolve blockers, then rerun this non-executing preflight before any separate live proof step.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `basisId: ${report.basisId || '<none>'}`,
    `acceptedForExecutionPreflight: ${report.acceptedForExecutionPreflight === true}`,
    `executionStarted: ${report.executionStarted === true}`,
    `blockerReasons: ${(report.blockerReasons || []).join(', ') || 'none'}`,
    `cleanSyncedMainHead: ${report.cleanSyncedMainHead === true}`,
    `exactQueryFamilyBound: ${report.exactQueryFamilyBound === true}`,
    `internalProofSeamBound: ${report.internalProofSeamBound === true}`,
    `boundaryFlagsBound: ${report.boundaryFlagsBound === true}`,
    `callsSearchMemory: ${report.safety?.callsSearchMemory === true}`,
    `callsRecordMemory: ${report.safety?.callsRecordMemory === true}`,
    `callsProvider: ${report.safety?.callsProvider === true}`,
    `readinessClaimAllowed: ${report.readinessClaimAllowed === true}`,
    `nextStep: ${report.nextStep}`
  ];

  if (report.rejectedFlag) {
    lines.splice(2, 0, `rejectedFlag: ${report.rejectedFlag}`);
  }

  return `${lines.join('\n')}\n`;
}

function renderHelp() {
  return [
    'Usage: node src/cli/recall-proof-execution-preflight.js [--json] [--pretty] [--fixture <path>]',
    '',
    'Evaluates an explicit-input CM-0814 recall proof execution preflight packet.',
    'This command never runs search_memory, record_memory, providers, Git, or live proof execution.',
    '',
    'Rejected flags: --execute --run --live-proof --search-memory --record-memory --provider --write --apply --mutate --start-service'
  ].join('\n') + '\n';
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(renderHelp());
    return 0;
  }

  const report = buildReport(options);
  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, options.pretty ? 2 : 0));
    process.stdout.write('\n');
  } else {
    process.stdout.write(renderText(report));
  }
  return report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  DEFAULT_FIXTURE_PATH,
  buildReport,
  main,
  parseArgs,
  renderText
};
