#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const {
  buildReport: buildInventoryReport,
  parseArgs: parseInventoryArgs,
  renderHelp: renderInventoryHelp
} = require('./selected-audit-correlation-dirty-scope-inventory');
const {
  evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight
} = require('../core/SelectedAuditCorrelationLocalCommitIsolationPreflight');

const REJECTED_FLAGS = new Set([
  '--apply',
  '--approve',
  '--clean',
  '--commit',
  '--delete',
  '--execute',
  '--fix',
  '--push',
  '--reset',
  '--restore'
]);

function parseArgs(argv = []) {
  const options = {
    ...parseInventoryArgs(argv),
    approvalLine: '',
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
    } else if (token === '--approval-line') {
      options.approvalLine = argv[index + 1] || '';
      index += 1;
    }
  }

  return options;
}

function defaultGitRunner(args) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true
  });
  return {
    status: typeof result.status === 'number' ? result.status : 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : ''
  };
}

function rejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_LOCAL_COMMIT_ISOLATION_PREFLIGHT_REJECTED_MUTATION_FLAG',
    rejectedFlag,
    currentFactsCollected: false,
    preflightExecuted: false,
    localCommitExecutionAllowedNow: false,
    commitAuthorized: false,
    cleanAuthorized: false,
    pushAuthorized: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    nextStep: 'Re-run without apply, approve, clean, commit, delete, execute, fix, push, reset, or restore flags.'
  };
}

function gitFact(gitRunner, args, name) {
  const result = gitRunner(args);
  if (result.status !== 0) {
    return {
      ok: false,
      name,
      value: '',
      error: result.error || result.stderr || `${name} failed`
    };
  }
  return {
    ok: true,
    name,
    value: String(result.stdout || '').trim(),
    error: ''
  };
}

function buildReport(options = {}, dependencies = {}) {
  if (options.rejectedFlag) {
    return rejectedReport(options.rejectedFlag);
  }

  const gitRunner = dependencies.gitRunner || defaultGitRunner;
  const branchFact = gitFact(gitRunner, ['branch', '--show-current'], 'branch');
  const headFact = gitFact(gitRunner, ['rev-parse', 'HEAD'], 'head');
  const inventoryReport = buildInventoryReport(options, { gitRunner });

  if (!branchFact.ok || !headFact.ok || inventoryReport.status === 'error') {
    return {
      status: 'error',
      decision: 'SELECTED_AUDIT_CORRELATION_LOCAL_COMMIT_ISOLATION_PREFLIGHT_FACT_COLLECTION_FAILED',
      currentFactsCollected: false,
      preflightExecuted: false,
      branchError: branchFact.error,
      headError: headFact.error,
      inventoryDecision: inventoryReport.decision,
      localCommitExecutionAllowedNow: false,
      commitAuthorized: false,
      cleanAuthorized: false,
      pushAuthorized: false,
      readinessClaimAllowed: false,
      reliabilityClaimAllowed: false,
      nextStep: 'Resolve current Git fact collection before evaluating CM-1135 local commit isolation.'
    };
  }

  const preflight = evaluateSelectedAuditCorrelationLocalCommitIsolationPreflight({
    approvalLine: options.approvalLine,
    currentBranch: branchFact.value,
    currentHead: headFact.value,
    inventoryReport
  });

  return {
    status: preflight.status,
    decision: 'SELECTED_AUDIT_CORRELATION_LOCAL_COMMIT_ISOLATION_PREFLIGHT_EVALUATED_NOT_EXECUTED',
    source: 'current_git_branch_head_status_plus_cm1135_approval_line',
    currentFactsCollected: true,
    branch: branchFact.value,
    head: headFact.value,
    inventoryClass: inventoryReport.inventoryClass,
    dirtyLineCount: inventoryReport.dirtyLineCount,
    unknownDirtyLineCount: inventoryReport.unknownDirtyLineCount,
    preflightExecuted: true,
    preflightClass: preflight.preflightClass,
    approvalLineAccepted: preflight.approvalLineAccepted,
    branchMatched: preflight.branchMatched,
    headMatched: preflight.headMatched,
    localCommitExecutionAllowedNow: preflight.localCommitExecutionAllowedNow,
    commitAuthorized: false,
    cleanAuthorized: false,
    pushAuthorized: false,
    approvalRequestsAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    preflight,
    inventoryReport,
    safety: preflight.safety,
    nextStep: preflight.nextStep
  };
}

function renderText(report) {
  return [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `currentFactsCollected: ${report.currentFactsCollected === true}`,
    `branch: ${report.branch || '<none>'}`,
    `head: ${report.head || '<none>'}`,
    `inventoryClass: ${report.inventoryClass || '<none>'}`,
    `dirtyLineCount: ${Number.isInteger(report.dirtyLineCount) ? report.dirtyLineCount : 0}`,
    `unknownDirtyLineCount: ${Number.isInteger(report.unknownDirtyLineCount) ? report.unknownDirtyLineCount : 0}`,
    `preflightExecuted: ${report.preflightExecuted === true}`,
    `preflightClass: ${report.preflightClass || '<none>'}`,
    `approvalLineAccepted: ${report.approvalLineAccepted === true}`,
    `localCommitExecutionAllowedNow: ${report.localCommitExecutionAllowedNow === true}`,
    `commitAuthorized: ${report.commitAuthorized === true}`,
    `cleanAuthorized: ${report.cleanAuthorized === true}`,
    `pushAuthorized: ${report.pushAuthorized === true}`,
    `readinessClaimAllowed: ${report.readinessClaimAllowed === true}`,
    `reliabilityClaimAllowed: ${report.reliabilityClaimAllowed === true}`,
    `nextStep: ${report.nextStep}`
  ].join('\n') + '\n';
}

function renderHelp() {
  return [
    'Usage: node src/cli/selected-audit-correlation-local-commit-isolation-preflight.js [--json] [--pretty] [--approval-line <line>]',
    '',
    'Evaluates the CM-1135 draft approval line against current branch, HEAD, and dirty-scope inventory.',
    'This command never stages, commits, cleans, restores, pushes, executes approval packets, reads file contents, reads audit logs, calls memory tools, or applies mutations.',
    '',
    renderInventoryHelp().trim()
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
  buildReport,
  main,
  parseArgs,
  renderHelp,
  renderText
};
