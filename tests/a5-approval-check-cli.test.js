const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  buildCliReport,
  parseArgs,
  renderText
} = require('../src/cli/a5-approval-check');

const CLI_PATH = 'src/cli/a5-approval-check.js';
const COMMIT = 'ae86fac0605a532dad75e6820a45186bd86ba915';
const APPROVAL_LINE = `I approve A5-GAP-5 for codex-memory on branch main at commit ${COMMIT}, running cutover-context strict gate only, no remote write.`;

function runCli(args = []) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
}

test('a5 approval check CLI accepts an exact supplied approval line', () => {
  const result = runCli([
    '--json',
    '--approval-line', APPROVAL_LINE,
    '--expected-unit', 'A5-GAP-5',
    '--expected-branch', 'main',
    '--expected-commit', COMMIT
  ]);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'approval_line_exact_match');
  assert.equal(report.approvalAccepted, true);
  assert.equal(report.authorizationGranted, true);
  assert.equal(report.command, 'npm run gate:mainline:strict');
  assert.equal(report.cli.executesApprovedAction, false);
  assert.equal(report.cli.grantsApprovalByItself, false);
  assert.equal(report.safety.executesCommands, false);
  assert.equal(report.safety.callsMcpTools, false);
  assert.equal(report.safety.remoteWrite, false);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.rcReady, false);
});

test('a5 approval check CLI rejects stale commit and exits non-zero', () => {
  const result = runCli([
    '--json',
    '--approval-line', APPROVAL_LINE,
    '--expected-unit', 'A5-GAP-5',
    '--expected-branch', 'main',
    '--expected-commit', 'f5bca6fced661b91f00b17f5a3e783ad5695e5d6'
  ]);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.approvalAccepted, false);
  assert.equal(report.failClosedReasons.includes('commit_mismatch'), true);
  assert.equal(report.cli.executesApprovedAction, false);
});

test('a5 approval check CLI rejects missing approval text fail-closed', () => {
  const result = runCli([
    '--json',
    '--expected-unit', 'A5-GAP-5',
    '--expected-branch', 'main',
    '--expected-commit', COMMIT
  ]);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.approvalAccepted, false);
  assert.equal(report.failClosedReasons.includes('missing_approval_line'), true);
});

test('a5 approval check helpers parse and render deterministic local reports', () => {
  const options = parseArgs([
    '--approval-line', APPROVAL_LINE,
    '--expected-unit', 'A5-GAP-5',
    '--expected-branch', 'main',
    '--expected-commit', COMMIT,
    '--pretty'
  ]);
  const report = buildCliReport(options);
  const text = renderText(report);

  assert.equal(options.pretty, true);
  assert.equal(report.approvalAccepted, true);
  assert.match(text, /executesApprovedAction: false/);
  assert.match(text, /runtimeReady: false/);
});
