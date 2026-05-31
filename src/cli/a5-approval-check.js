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
    template: false,
    approvedUnits: '',
    includedEvidence: '',
    noNewRuntimeAction: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') { options.json = true; continue; }
    if (token === '--pretty') { options.pretty = true; continue; }
    if (token === '--template') { options.template = true; continue; }
    if (token === '--no-new-runtime-action') { options.noNewRuntimeAction = true; continue; }
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
    if (token === '--approved-units') {
      options.approvedUnits = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--included-evidence') {
      options.includedEvidence = argv[index + 1] || '';
      index += 1;
      continue;
    }
  }

  return options;
}

function usage() {
  return [
    'Usage: node src/cli/a5-approval-check.js --approval-line TEXT --expected-unit A5-GAP-N --expected-branch BRANCH --expected-commit COMMIT [--json] [--pretty]',
    '       node src/cli/a5-approval-check.js --template --expected-unit A5-GAP-6 --expected-branch BRANCH --expected-commit COMMIT --approved-units A5-GAP-1,A5-GAP-2 [--included-evidence FILE] [--no-new-runtime-action] [--json] [--pretty]',
    '',
    'This command only validates or renders supplied approval text. It does not execute the approved action.'
  ].join('\n');
}

function normalizeApprovedUnits(value = '') {
  return value
    .split(',')
    .map(unit => unit.trim())
    .filter(Boolean);
}

function validateApprovedUnits(units = []) {
  const supportedUnits = new Set(Object.keys(A5_APPROVAL_LINE_UNITS));
  const seen = new Set();
  const invalidUnits = [];
  const duplicateUnits = [];

  for (const unit of units) {
    if (!/^A5-GAP-\d+$/.test(unit) || !supportedUnits.has(unit)) {
      invalidUnits.push(unit);
      continue;
    }
    if (seen.has(unit)) {
      duplicateUnits.push(unit);
      continue;
    }
    seen.add(unit);
  }

  return {
    invalidUnits,
    duplicateUnits,
    normalizedUnits: units.join(', ')
  };
}

function buildApprovalTemplate(options = {}) {
  if (options.expectedUnit !== 'A5-GAP-6') {
    return {
      status: 'approval_template_rejected_fail_closed',
      templateRendered: false,
      template: '',
      failClosedReasons: ['unsupported_template_unit']
    };
  }

  const failClosedReasons = [];
  const branch = options.expectedBranch || '';
  const commit = options.expectedCommit || '';
  const approvedUnitList = normalizeApprovedUnits(options.approvedUnits || '');
  const {
    invalidUnits,
    duplicateUnits,
    normalizedUnits: approvedUnits
  } = validateApprovedUnits(approvedUnitList);

  if (!branch) failClosedReasons.push('missing_expected_branch');
  if (!commit) failClosedReasons.push('missing_expected_commit');
  if (!approvedUnits) failClosedReasons.push('missing_approved_units');
  if (invalidUnits.length > 0) failClosedReasons.push('invalid_approved_units');
  if (duplicateUnits.length > 0) failClosedReasons.push('duplicate_approved_units');

  if (failClosedReasons.length > 0) {
    return {
      status: 'approval_template_rejected_fail_closed',
      templateRendered: false,
      template: '',
      invalidUnits,
      duplicateUnits,
      failClosedReasons
    };
  }

  const evidenceSuffix = options.includedEvidence
    ? `, including ${options.includedEvidence}${options.noNewRuntimeAction ? ', no new runtime action' : ''}`
    : '';
  const template = `I approve A5-GAP-6 for codex-memory on branch ${branch} at commit ${commit}, using only evidence from approved A5-GAP units ${approvedUnits}${evidenceSuffix}.`;

  return {
    status: 'approval_template_rendered',
    templateRendered: true,
    template,
    invalidUnits: [],
    duplicateUnits: [],
    failClosedReasons: []
  };
}

function buildCliReport(options = {}) {
  if (options.template) {
    const templateReport = buildApprovalTemplate(options);
    return {
      ...templateReport,
      decision: 'NOT_READY_BLOCKED',
      approvalAccepted: false,
      authorizationGranted: false,
      expectedUnit: options.expectedUnit || '',
      expectedBranch: options.expectedBranch || '',
      expectedCommit: options.expectedCommit || '',
      parsedBranch: '',
      parsedCommit: '',
      action: '',
      command: '',
      runtimeReady: false,
      finalRcMatrixReady: false,
      rcReady: false,
      cli: {
        name: 'a5-approval-check',
        mode: 'explicit_input_template_only',
        supportedUnits: Object.keys(A5_APPROVAL_LINE_UNITS),
        executesApprovedAction: false,
        grantsApprovalByItself: false
      }
    };
  }

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
    `template: ${report.template || 'n/a'}`,
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

  return report.approvalAccepted || report.templateRendered ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = run();
}

module.exports = {
  buildApprovalTemplate,
  parseArgs,
  usage,
  validateApprovedUnits,
  buildCliReport,
  renderText,
  run
};
