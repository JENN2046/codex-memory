#!/usr/bin/env node
'use strict';

const {
  runPhaseF1LiveClientNoWriteEvidence
} = require('../core/PhaseF1LiveClientNoWriteEvidenceRunner');

function parseArgs(argv = []) {
  const options = {
    branch: '',
    commit: '',
    endpoint: 'http://127.0.0.1:7605',
    approvalLine: '',
    currentBranch: '',
    currentHead: '',
    originHead: '',
    dirtyStatusLineCount: '',
    execute: false,
    json: false,
    pretty: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--execute') { options.execute = true; continue; }
    if (token === '--json') { options.json = true; continue; }
    if (token === '--pretty') { options.pretty = true; continue; }
    if (token === '--help' || token === '-h') { options.help = true; continue; }
    if (token === '--branch') {
      options.branch = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--commit') {
      options.commit = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--endpoint') {
      options.endpoint = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--approval-line') {
      options.approvalLine = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--current-branch') {
      options.currentBranch = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--current-head') {
      options.currentHead = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--origin-head') {
      options.originHead = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--dirty-status-line-count') {
      options.dirtyStatusLineCount = argv[index + 1] || '';
      index += 1;
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node src/cli/phase-f1-live-client-no-write.js --branch main --commit COMMIT --approval-line TEXT [--endpoint URL] [--execute] [--json] [--pretty]',
    '',
    'Default mode is plan-only. --execute requires an exact A5-GAP-4 approval line, current Git facts, and an already-present CODEX_MEMORY_HTTP_TOKEN.',
    'For --execute pass --current-branch, --current-head, --origin-head, and --dirty-status-line-count from fresh read-only Git checks.',
    'This command never prints or persists token material.'
  ].join('\n');
}

function renderText(report) {
  return [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `approvalAccepted: ${report.approvalAccepted}`,
    `executionMode: ${report.executionMode}`,
    `liveClientRefreshExecuted: ${report.liveClientRefreshExecuted}`,
    `providerCalls: ${report.safetyCounters.providerCalls}`,
    `durableMemoryWrites: ${report.safetyCounters.durableMemoryWrites}`,
    `durableAuditWrites: ${report.safetyCounters.durableAuditWrites}`,
    `runtimeReady: ${report.runtimeReady}`,
    `rcReady: ${report.rcReady}`,
    `failClosedReasons: ${(report.failClosedReasons || []).join(',') || 'none'}`
  ].join('\n') + '\n';
}

async function run(argv = process.argv.slice(2), stdout = process.stdout, env = process.env) {
  const options = parseArgs(argv);
  if (options.help) {
    stdout.write(`${usage()}\n`);
    return 0;
  }

  const report = await runPhaseF1LiveClientNoWriteEvidence({
    branch: options.branch,
    commit: options.commit,
    endpoint: options.endpoint,
    approvalLine: options.approvalLine,
    execute: options.execute,
    currentFacts: {
      currentBranch: options.currentBranch,
      currentHead: options.currentHead,
      originHead: options.originHead,
      dirtyStatusLineCount: options.dirtyStatusLineCount
    },
    bearerToken: options.execute ? env.CODEX_MEMORY_HTTP_TOKEN || '' : ''
  });

  if (options.json) {
    stdout.write(`${JSON.stringify(report, null, options.pretty ? 2 : 0)}\n`);
  } else {
    stdout.write(renderText(report));
  }

  if (options.execute) {
    return report.status === 'PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY' ? 0 : 1;
  }
  return report.approvalAccepted ? 0 : 1;
}

if (require.main === module) {
  run().then(code => {
    process.exitCode = code;
  }).catch(error => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  parseArgs,
  run
};
