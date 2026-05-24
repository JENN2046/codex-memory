#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const {
  buildReport: buildIsolationReviewReport
} = require('./memory-reliability-proof-baseline-isolation-review');
const {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_VERSION,
  DEFAULT_COMMIT_SCOPE_MODE,
  REQUIRED_DENIED_ACTIONS,
  SCOPED_COMMIT_SCOPE_MODE,
  summarizeMemoryReliabilityPhaseCommitReview
} = require('../core/MemoryReliabilityPhaseCommitReview');

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
  '--start-service',
  '--stage',
  '--commit',
  '--push'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    rejectedFlag: null,
    commitScopeMode: DEFAULT_COMMIT_SCOPE_MODE,
    worktreeOwnership: 'mixed_or_unverified',
    sharedStateHunksIsolated: false,
    proposedCommitPaths: [],
    verifiedIntendedPaths: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--worktree-ownership') {
      options.worktreeOwnership = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--commit-scope-mode') {
      options.commitScopeMode = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--scoped-candidate') {
      options.commitScopeMode = SCOPED_COMMIT_SCOPE_MODE;
      continue;
    }
    if (arg === '--shared-state-hunks-isolated') {
      options.sharedStateHunksIsolated = true;
      continue;
    }
    if (arg === '--proposed-path') {
      options.proposedCommitPaths.push(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (arg === '--verified-path') {
      options.verifiedIntendedPaths.push(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(arg)) {
      options.rejectedFlag = arg;
    }
  }

  return options;
}

function runGitStatusShort(cwd = process.cwd()) {
  const result = spawnSync('git', ['status', '--short'], {
    cwd,
    encoding: 'utf8',
    shell: false
  });

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : ''
  };
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    decision: 'MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_REJECTED_EXECUTION_FLAG',
    rejectedFlag,
    phaseCommitReviewAccepted: false,
    commitCandidateReady: false,
    safeToStage: false,
    safeToCommit: false,
    safeToPush: false,
    executionStarted: false,
    liveProofStarted: false,
    recordMemoryStarted: false,
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    memoryRecallReliableClaimed: false,
    memoryWriteReliableClaimed: false,
    nextStep: 'Re-run without execution, mutation, provider, service, stage, commit, push, record_memory, search_memory, or live-proof flags.'
  };
}

function buildReviewPacket(isolationReview, gitStatusShort, options = {}) {
  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    version: EXPECTED_VERSION,
    sourceMode: 'current_git_status_readonly',
    reviewOnly: true,
    commitScopeSource: 'CM-0938',
    commitScopeMode: options.commitScopeMode || DEFAULT_COMMIT_SCOPE_MODE,
    worktreeOwnership: options.worktreeOwnership || 'mixed_or_unverified',
    sharedStateHunksIsolated: options.sharedStateHunksIsolated === true,
    proposedCommitPaths: options.proposedCommitPaths || [],
    verifiedIntendedPaths: options.verifiedIntendedPaths || [],
    deniedActions: REQUIRED_DENIED_ACTIONS,
    isolationReview,
    gitStatusShort
  };
}

function buildReport(options = {}, dependencies = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const isolationReviewBuilder = dependencies.isolationReviewBuilder || buildIsolationReviewReport;
  const gitStatusRunner = dependencies.gitStatusRunner || runGitStatusShort;
  const isolationReview = isolationReviewBuilder({}, dependencies.isolationDependencies || dependencies);
  const gitStatus = gitStatusRunner(dependencies.cwd || process.cwd());
  const review = summarizeMemoryReliabilityPhaseCommitReview(
    buildReviewPacket(isolationReview, gitStatus.stdout || '', options)
  );
  const gitStatusOk = gitStatus.status === 0 && !gitStatus.error;
  const candidateReady = review.commitCandidateReady === true && gitStatusOk;
  const blocked = review.phaseCommitReviewAccepted === true && gitStatusOk;
  const accepted = candidateReady || blocked;

  return {
    status: candidateReady ? 'candidate_ready' : (blocked ? 'blocked' : 'incomplete'),
    decision: candidateReady
      ? 'MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_CANDIDATE_READY_NOT_EXECUTED'
      : (blocked
        ? 'MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_BLOCKED_NOT_EXECUTED'
        : 'MEMORY_RELIABILITY_PHASE_COMMIT_REVIEW_INCOMPLETE_NOT_EXECUTED'),
    source: 'current_git_status_readonly',
    isolationDecision: isolationReview.decision,
    isolationStatus: isolationReview.status,
    isolationReviewAccepted: isolationReview.isolationReviewAccepted === true,
    phaseCommitReviewAccepted: accepted,
    commitCandidateReady: candidateReady,
    safeToStage: false,
    safeToCommit: false,
    safeToPush: false,
    commitScopeMode: review.commitScopeMode,
    scopedCandidateMode: review.scopedCandidateMode,
    worktreeOwnership: review.worktreeOwnership,
    sharedStateHunksIsolated: review.sharedStateHunksIsolated,
    proposedCommitPathCount: review.proposedCommitPaths.length,
    verifiedIntendedPathCount: review.verifiedIntendedPaths.length,
    dirtySummary: review.dirtySummary,
    blockers: review.blockers,
    unrelatedDirtyPaths: review.unrelatedDirtyPaths,
    deniedActions: review.deniedActions,
    checks: {
      ...review.checks,
      gitStatusOk
    },
    gitStatus: {
      status: gitStatus.status,
      stderr: gitStatus.stderr,
      error: gitStatus.error
    },
    executionStarted: false,
    liveProofStarted: false,
    recordMemoryStarted: false,
    callsSearchMemory: false,
    callsRecordMemory: false,
    callsProvider: false,
    readinessClaimAllowed: false,
    memoryRecallReliableClaimed: false,
    memoryWriteReliableClaimed: false,
    safety: review.safety,
    nextStep: gitStatusOk
      ? review.nextStep
      : 'Git status could not be read. Keep stage, commit, push, live proof, and reliability/readiness claims blocked.'
  };
}

function renderText(report) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `phaseCommitReviewAccepted: ${report.phaseCommitReviewAccepted === true}`,
    `commitCandidateReady: ${report.commitCandidateReady === true}`,
    `safeToStage: ${report.safeToStage === true}`,
    `safeToCommit: ${report.safeToCommit === true}`,
    `safeToPush: ${report.safeToPush === true}`,
    `dirtyStatusLineCount: ${report.dirtySummary ? report.dirtySummary.dirtyStatusLineCount : 0}`,
    `trackedModifiedCount: ${report.dirtySummary ? report.dirtySummary.trackedModifiedCount : 0}`,
    `untrackedCount: ${report.dirtySummary ? report.dirtySummary.untrackedCount : 0}`,
    `sharedStateCount: ${report.dirtySummary ? report.dirtySummary.sharedStateCount : 0}`,
    `runtimeSurfaceCount: ${report.dirtySummary ? report.dirtySummary.runtimeSurfaceCount : 0}`,
    `otherCount: ${report.dirtySummary ? report.dirtySummary.otherCount : 0}`,
    `blockers: ${(report.blockers || []).join(',') || '<none>'}`,
    `executionStarted: ${report.executionStarted === true}`,
    `liveProofStarted: ${report.liveProofStarted === true}`,
    `recordMemoryStarted: ${report.recordMemoryStarted === true}`,
    `callsSearchMemory: ${report.callsSearchMemory === true}`,
    `callsRecordMemory: ${report.callsRecordMemory === true}`,
    `callsProvider: ${report.callsProvider === true}`,
    `readinessClaimAllowed: ${report.readinessClaimAllowed === true}`,
    `memoryRecallReliableClaimed: ${report.memoryRecallReliableClaimed === true}`,
    `memoryWriteReliableClaimed: ${report.memoryWriteReliableClaimed === true}`,
    `nextStep: ${report.nextStep}`
  ];

  if (report.rejectedFlag) {
    lines.splice(2, 0, `rejectedFlag: ${report.rejectedFlag}`);
  }

  return `${lines.join('\n')}\n`;
}

function renderHelp() {
  return [
    'Usage: node src/cli/memory-reliability-phase-commit-review.js [--json] [--pretty]',
    '       node src/cli/memory-reliability-phase-commit-review.js --json --worktree-ownership verified_intended_scope --shared-state-hunks-isolated --proposed-path <path> --verified-path <path>',
    '       node src/cli/memory-reliability-phase-commit-review.js --json --scoped-candidate --worktree-ownership verified_intended_scope --proposed-path <path> --verified-path <path>',
    '',
    'Runs the CM-0938 isolation review and read-only git status, then evaluates whether the current reliability phase is isolated enough for a future stage/commit.',
    'This command never stages, commits, pushes, runs search_memory, runs record_memory, calls providers, starts services, writes durable memory, or claims readiness.',
    'Candidate path flags are review-only. They do not stage files; they only let the report check whether an explicitly proposed path set covers the current dirty tree or a scoped candidate subset.',
    '',
    'Rejected flags: --execute --run --live-proof --search-memory --record-memory --provider --write --apply --mutate --start-service --stage --commit --push'
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
  buildReviewPacket,
  main,
  parseArgs,
  renderText,
  runGitStatusShort
};
