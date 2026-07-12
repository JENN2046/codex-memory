#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const {
  canonicalize,
  sha256,
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  evaluateCm2115LocalValidationReceipt
} = require('../src/core/Cm2115LocalValidationReceiptContract');

const DEFAULT_OUTPUT = path.join(
  'docs',
  'near-model-memory-plan-pack',
  'cm2115_r1_local_validation_receipt.json'
);

function git(...args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function parseArgs(argv) {
  const options = { output: DEFAULT_OUTPUT };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output') {
      options.output = argv[++index];
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    throw new Error(`cm2115_validation_receipt_unknown_argument:${arg}`);
  }
  return options;
}

function safeEnv() {
  const env = { ...process.env, CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'false' };
  delete env.CODEX_MEMORY_GATE_CI_COMPARE_COMMAND_JSON;
  delete env.CODEX_MEMORY_GATE_CI_ROLLBACK_COMMAND_JSON;
  delete env.CODEX_MEMORY_GATE_CI_TEST_COMMAND_JSON;
  return env;
}

function run(commandId, command, executable, args) {
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    env: safeEnv(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true
  });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  if (result.error || exitCode !== 0) {
    const error = new Error(`cm2115_validation_command_failed:${commandId}:${exitCode}`);
    error.stdoutTail = stdout.slice(-4000);
    error.stderrTail = stderr.slice(-4000);
    throw error;
  }
  return {
    commandId,
    command,
    exitCode,
    status: 'PASS',
    tapSummaries: extractTapSummaries(`${stdout}\n${stderr}`),
    stdoutSha256: sha256(stdout),
    stderrSha256: sha256(stderr),
    safeSummary: null,
    rawStdout: stdout
  };
}

function extractTapSummaries(output) {
  const summaries = [];
  let current = null;
  for (const rawLine of String(output || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    let match = line.match(/^# tests (\d+)$/);
    if (match) {
      if (current) summaries.push(current);
      current = {
        tests: Number(match[1]),
        pass: null,
        fail: null,
        cancelled: null,
        skipped: null,
        todo: null
      };
      continue;
    }
    if (!current) continue;
    match = line.match(/^# (pass|fail|cancelled|skipped|todo) (\d+)$/);
    if (match) current[match[1]] = Number(match[2]);
    if (/^# duration_ms /.test(line)) {
      summaries.push(current);
      current = null;
    }
  }
  if (current) summaries.push(current);
  return summaries.filter(summary => Object.values(summary).every(Number.isInteger));
}

function parseJsonFromNpmOutput(stdout) {
  const text = String(stdout || '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('cm2115_gate_ci_json_missing');
  return JSON.parse(text.slice(start, end + 1));
}

function buildGateCiSafeSummary(gatePayload) {
  const summary = gatePayload?.summary || {};
  const statuses = Object.fromEntries(Object.entries(gatePayload?.checks || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, value?.status || 'missing']));
  return {
    summaryOk: summary.ok === true,
    fixtureOnly: summary.fixtureOnly === true,
    noNetwork: summary.noNetwork === true,
    noDaemon: summary.noDaemon === true,
    noProvider: summary.noProvider === true,
    unsafeEnvOverrideDetected: summary.unsafeEnvOverrideDetected === true,
    failedCheckCount: Array.isArray(summary.failedChecks) ? summary.failedChecks.length : -1,
    checkStatusesSha256: sha256Canonical(statuses)
  };
}

function buildReceipt({ targetCommit, targetTree, commandResults }) {
  const payload = {
    validationTarget: {
      commit: targetCommit,
      tree: targetTree,
      worktreeCleanAtStart: true,
      worktreeCleanAfterCommands: true
    },
    commandResults: commandResults.map(result => ({
      commandId: result.commandId,
      command: result.command,
      exitCode: result.exitCode,
      status: result.status,
      tapSummaries: result.tapSummaries,
      stdoutSha256: result.stdoutSha256,
      stderrSha256: result.stderrSha256,
      safeSummary: result.safeSummary
    })),
    evidenceSemantics: {
      phase1RegressionTestsPassed: true,
      testAllPassed: true,
      gateCiPassed: true,
      phase2ApplicationTestsPassed: true
    },
    currentState: {
      phase8Completed: true,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    sideEffects: {
      nativeReads: 0,
      nativeWrites: 0,
      durableMutations: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    },
    nonClaims: {
      productionReady: false,
      releaseReady: false,
      deployReady: false,
      cutoverReady: false,
      rcReady: false,
      completeV8: false,
      fullPlanPackCompleted: false
    }
  };
  return {
    schemaVersion: 1,
    taskId: 'CM-2115-R1',
    receiptType: 'canonical_full_plan_local_validation_receipt_v2',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (git('status', '--porcelain') !== '') throw new Error('cm2115_validation_receipt_clean_worktree_required');
  const targetCommit = git('rev-parse', 'HEAD^{commit}');
  const targetTree = git('rev-parse', 'HEAD^{tree}');
  const commandResults = [];
  commandResults.push(run(
    'cm2115_r1_phase2_application_focused',
    'node --test tests/cm2115-r1-phase2-completion-audit-application.test.js',
    process.execPath,
    ['--test', 'tests/cm2115-r1-phase2-completion-audit-application.test.js']
  ));
  commandResults.push(run('test_all', 'npm run test:all', 'npm', ['run', 'test:all']));
  const gate = run('gate_ci', 'npm run gate:ci -- --json', 'npm', ['run', 'gate:ci', '--', '--json']);
  const gatePayload = parseJsonFromNpmOutput(gate.rawStdout);
  gate.safeSummary = buildGateCiSafeSummary(gatePayload);
  const gateTests = gatePayload?.checks?.tests?.detail;
  if (gate.tapSummaries.length === 0 && Number.isInteger(gateTests?.total) && Number.isInteger(gateTests?.passed)) {
    gate.tapSummaries = [{
      tests: gateTests.total,
      pass: gateTests.passed,
      fail: gateTests.failed || 0,
      cancelled: 0,
      skipped: 0,
      todo: 0
    }];
  }
  commandResults.push(gate);
  if (git('status', '--porcelain') !== '') {
    throw new Error('cm2115_r1_validation_receipt_worktree_drift_after_commands');
  }
  const receipt = buildReceipt({ targetCommit, targetTree, commandResults });
  const evaluation = evaluateCm2115LocalValidationReceipt(receipt);
  if (!evaluation.accepted) {
    throw new Error(`cm2115_validation_receipt_contract_rejected:${evaluation.blockers.join(',')}`);
  }
  fs.writeFileSync(options.output, `${JSON.stringify(canonicalize(receipt), null, 2)}\n`, { flag: 'wx' });
  const summary = {
    status: 'PASS',
    targetCommit,
    targetTree,
    output: options.output,
    canonicalPayloadSha256: receipt.canonicalPayloadSha256,
    commandCount: commandResults.length,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
  process.stdout.write(options.json ? `${JSON.stringify(summary)}\n` : `${JSON.stringify(summary, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    if (error.stdoutTail) process.stderr.write(`${error.stdoutTail}\n`);
    if (error.stderrTail) process.stderr.write(`${error.stderrTail}\n`);
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_OUTPUT,
  buildGateCiSafeSummary,
  buildReceipt,
  extractTapSummaries,
  parseArgs,
  parseJsonFromNpmOutput
};
