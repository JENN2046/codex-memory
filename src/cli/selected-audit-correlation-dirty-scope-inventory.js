#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const {
  summarizeSelectedAuditCorrelationDirtyScopeInventory
} = require('../core/SelectedAuditCorrelationDirtyScopeInventory');

const REJECTED_FLAGS = new Set([
  '--apply',
  '--approve',
  '--clean',
  '--commit',
  '--delete',
  '--execute',
  '--fix',
  '--reset',
  '--restore'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    rejectedFlag: null
  };

  for (const token of argv) {
    if (token === '--json') {
      options.json = true;
    } else if (token === '--pretty') {
      options.pretty = true;
    } else if (token === '--help' || token === '-h') {
      options.help = true;
    } else if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
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

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_INVENTORY_REJECTED_MUTATION_FLAG',
    rejectedFlag,
    currentFactsCollected: false,
    inventoryExecuted: false,
    inventory: null,
    commitAuthorized: false,
    cleanAuthorized: false,
    approvalRequestsAllowedNow: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: {
      readsCurrentGitFacts: false,
      readsFileContents: false,
      callsRecordMemory: false,
      callsSearchMemory: false,
      callsMemoryOverview: false,
      appliesMutation: false,
      commits: false,
      cleansWorktree: false,
      claimsReadiness: false,
      claimsRecallReliable: false,
      claimsWriteReliable: false
    },
    nextStep: 'Re-run without apply, approve, clean, commit, delete, execute, fix, reset, or restore flags.'
  };
}

function buildReport(options = {}, dependencies = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const gitRunner = dependencies.gitRunner || defaultGitRunner;
  const statusResult = gitRunner(['status', '--short']);
  if (statusResult.status !== 0) {
    return {
      status: 'error',
      decision: 'SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_INVENTORY_GIT_STATUS_FAILED',
      currentFactsCollected: false,
      inventoryExecuted: false,
      gitStatus: statusResult.status,
      gitError: statusResult.error || statusResult.stderr || 'git status failed',
      commitAuthorized: false,
      cleanAuthorized: false,
      approvalRequestsAllowedNow: false,
      readinessClaimAllowed: false,
      reliabilityClaimAllowed: false,
      nextStep: 'Resolve git status collection failure before dirty-scope isolation.'
    };
  }

  const inventory = summarizeSelectedAuditCorrelationDirtyScopeInventory({
    statusShort: statusResult.stdout
  });

  return {
    status: 'blocked',
    decision: 'SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_INVENTORY_CLASSIFIED_NOT_MUTATED',
    source: 'current_git_status_short_readonly',
    currentFactsCollected: true,
    inventoryExecuted: true,
    inventory,
    inventoryClass: inventory.inventoryClass,
    worktreeClean: inventory.worktreeClean,
    dirtyLineCount: inventory.dirtyLineCount,
    knownDirtyLineCount: inventory.knownDirtyLineCount,
    unknownDirtyLineCount: inventory.unknownDirtyLineCount,
    unknownEntries: inventory.unknownEntries,
    commitAuthorized: false,
    cleanAuthorized: false,
    approvalRequestsAllowedNow: false,
    cm1111ApprovalRequestAllowed: false,
    cm1115ApprovalRequestAllowed: false,
    cm1120ApprovalRequestAllowed: false,
    readinessClaimAllowed: false,
    reliabilityClaimAllowed: false,
    safety: inventory.safety,
    nextStep: inventory.nextStep
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `currentFactsCollected: ${report.currentFactsCollected === true}`,
    `inventoryExecuted: ${report.inventoryExecuted === true}`,
    `inventoryClass: ${report.inventoryClass || '<none>'}`,
    `worktreeClean: ${report.worktreeClean === true}`,
    `dirtyLineCount: ${Number.isInteger(report.dirtyLineCount) ? report.dirtyLineCount : 0}`,
    `knownDirtyLineCount: ${Number.isInteger(report.knownDirtyLineCount) ? report.knownDirtyLineCount : 0}`,
    `unknownDirtyLineCount: ${Number.isInteger(report.unknownDirtyLineCount) ? report.unknownDirtyLineCount : 0}`,
    `commitAuthorized: ${report.commitAuthorized === true}`,
    `cleanAuthorized: ${report.cleanAuthorized === true}`,
    `approvalRequestsAllowedNow: ${report.approvalRequestsAllowedNow === true}`,
    `callsRecordMemory: ${report.safety?.callsRecordMemory === true}`,
    `callsSearchMemory: ${report.safety?.callsSearchMemory === true}`,
    `callsMemoryOverview: ${report.safety?.callsMemoryOverview === true}`,
    `readinessClaimAllowed: ${report.readinessClaimAllowed === true}`,
    `reliabilityClaimAllowed: ${report.reliabilityClaimAllowed === true}`,
    `nextStep: ${report.nextStep}`
  ];

  if (report.rejectedFlag) {
    lines.splice(2, 0, `rejectedFlag: ${report.rejectedFlag}`);
  }

  return `${lines.join('\n')}\n`;
}

function renderHelp() {
  return [
    'Usage: node src/cli/selected-audit-correlation-dirty-scope-inventory.js [--json] [--pretty]',
    '',
    'Reads only `git status --short` and classifies dirty paths into known CM evidence buckets.',
    'This command never stages, commits, cleans, restores, executes approval packets, reads file contents, reads audit logs, calls memory tools, or applies mutations.',
    '',
    'Rejected flags: --apply --approve --clean --commit --delete --execute --fix --reset --restore'
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
