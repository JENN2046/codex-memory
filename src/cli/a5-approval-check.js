#!/usr/bin/env node
const {
  A5_APPROVAL_LINE_UNITS,
  evaluateA5ApprovalLine
} = require('../core/A5ApprovalLineVerifier');

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    approvalLine: '',
    expectedUnit: '',
    expectedBranch: '',
    expectedCommit: '',
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') { options.json = true; continue; }
    if (token === '--pretty') { options.pretty = true; continue; }
    if (token === '--help' || token === '-h') { options.help = true; continue; }
    if (token === '--approval-line') {
      options.approvalLine = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--expected-unit') {
      options.expectedUnit = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--expected-branch') {
      options.expectedBranch = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--expected-commit') {
      options.expectedCommit = argv[index + 1] || '';
      index += 1;
      continue;
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node src/cli/a5-approval-check.js --approval-line TEXT --expected-unit A5-GAP-N --expected-branch BRANCH --expected-commit COMMIT [--json] [--pretty]',
    '',
    'This command only validates the supplied approval text. It does not execute the approved action.'
  ].join('\n');
}

function buildCliReport(options = {}) {
  const result = evaluateA5ApprovalLine({
    approvalLine: options.approvalLine,
    expectedUnit: options.expectedUnit,
    expectedBranch: options.expectedBranch,
    expectedCommit: options.expectedCommit
  });

  return {
    ...result,
    cli: {
      name: 'a5-approval-check',
      mode: 'explicit_input_only',
      supportedUnits: Object.keys(A5_APPROVAL_LINE_UNITS),
      executesApprovedAction: false,
      grantsApprovalByItself: false
    }
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `approvalAccepted: ${report.approvalAccepted}`,
    `expectedUnit: ${report.expectedUnit}`,
    `parsedBranch: ${report.parsedBranch}`,
    `parsedCommit: ${report.parsedCommit}`,
    `action: ${report.action || 'n/a'}`,
    `command: ${report.command || 'n/a'}`,
    `failClosedReasons: ${report.failClosedReasons.join(',') || 'none'}`,
    `executesApprovedAction: ${report.cli.executesApprovedAction}`,
    `runtimeReady: ${report.runtimeReady}`,
    `rcReady: ${report.rcReady}`
  ];
  return `${lines.join('\n')}\n`;
}

function run(argv = process.argv.slice(2), stdout = process.stdout) {
  const options = parseArgs(argv);
  if (options.help) {
    stdout.write(`${usage()}\n`);
    return 0;
  }

  const report = buildCliReport(options);
  if (options.json) {
    const spacing = options.pretty ? 2 : 0;
    stdout.write(`${JSON.stringify(report, null, spacing)}\n`);
  } else {
    stdout.write(renderText(report));
  }

  return report.approvalAccepted ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = run();
}

module.exports = {
  parseArgs,
  usage,
  buildCliReport,
  renderText,
  run
};
