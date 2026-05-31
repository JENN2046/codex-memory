const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  buildApprovalTemplate,
  buildCliReport,
  parseArgs,
  renderText,
  validateApprovedUnits
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

test('a5 approval check CLI exposes normalized A5-GAP-6 approved evidence units', () => {
  const commit = '5c05a8ecb1994635180b07e16af47ad293932371';
  const approvalLine = `I approve A5-GAP-6 for codex-memory on branch main at commit ${commit}, using only evidence from approved A5-GAP units A5-GAP-1, A5-GAP-2, A5-GAP-3, A5-GAP-4, A5-GAP-5, including P66_A5_GAP_2_SANITIZED_CLASSIFIED_SAMPLE_WRITE_EVIDENCE.md, no new runtime action.`;
  const result = runCli([
    '--json',
    '--approval-line', approvalLine,
    '--expected-unit', 'A5-GAP-6',
    '--expected-branch', 'main',
    '--expected-commit', commit
  ]);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.approvalAccepted, true);
  assert.deepEqual(report.parsedApprovalScope.approvedEvidenceUnits, [
    'A5-GAP-1',
    'A5-GAP-2',
    'A5-GAP-3',
    'A5-GAP-4',
    'A5-GAP-5'
  ]);
  assert.equal(report.parsedApprovalScope.approvedEvidenceUnitCount, 5);
  assert.equal(
    report.parsedApprovalScope.includedEvidenceFile,
    'P66_A5_GAP_2_SANITIZED_CLASSIFIED_SAMPLE_WRITE_EVIDENCE.md'
  );
  assert.equal(report.parsedApprovalScope.noNewRuntimeAction, true);
  assert.equal(report.cli.executesApprovedAction, false);
  assert.equal(report.runtimeReady, false);
});

test('a5 approval check CLI renders an A5-GAP-6 exact approval template without granting approval', () => {
  const commit = 'ce1e71509a6966f09cf76c1082e012db615eccbf';
  const result = runCli([
    '--json',
    '--template',
    '--expected-unit', 'A5-GAP-6',
    '--expected-branch', 'main',
    '--expected-commit', commit,
    '--approved-units', 'A5-GAP-1,A5-GAP-2,A5-GAP-3,A5-GAP-4,A5-GAP-5',
    '--included-evidence', 'P66_A5_GAP_2_SANITIZED_CLASSIFIED_SAMPLE_WRITE_EVIDENCE.md',
    '--no-new-runtime-action'
  ]);

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'approval_template_rendered');
  assert.equal(report.templateRendered, true);
  assert.equal(report.approvalAccepted, false);
  assert.equal(report.authorizationGranted, false);
  assert.equal(report.cli.executesApprovedAction, false);
  assert.equal(
    report.template,
    `I approve A5-GAP-6 for codex-memory on branch main at commit ${commit}, using only evidence from approved A5-GAP units A5-GAP-1, A5-GAP-2, A5-GAP-3, A5-GAP-4, A5-GAP-5, including P66_A5_GAP_2_SANITIZED_CLASSIFIED_SAMPLE_WRITE_EVIDENCE.md, no new runtime action.`
  );
  assert.equal(report.runtimeReady, false);
});

test('a5 approval template helper rejects unsupported template units fail-closed', () => {
  const report = buildApprovalTemplate({
    expectedUnit: 'A5-GAP-5',
    expectedBranch: 'main',
    expectedCommit: COMMIT,
    approvedUnits: 'A5-GAP-4,A5-GAP-5'
  });

  assert.equal(report.templateRendered, false);
  assert.equal(report.failClosedReasons.includes('unsupported_template_unit'), true);
});

test('a5 approval template rejects invalid approved units fail-closed', () => {
  const commit = '3f655d6062d337b3c22242727e9079f0a1879026';
  const result = runCli([
    '--json',
    '--template',
    '--expected-unit', 'A5-GAP-6',
    '--expected-branch', 'main',
    '--expected-commit', commit,
    '--approved-units', 'A5-GAP-1,A5-GAP-999,NOT-A-GAP'
  ]);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.templateRendered, false);
  assert.equal(report.failClosedReasons.includes('invalid_approved_units'), true);
  assert.deepEqual(report.invalidUnits, ['A5-GAP-999', 'NOT-A-GAP']);
  assert.equal(report.authorizationGranted, false);
});

test('a5 approval template rejects duplicate approved units fail-closed', () => {
  const report = buildApprovalTemplate({
    expectedUnit: 'A5-GAP-6',
    expectedBranch: 'main',
    expectedCommit: '3f655d6062d337b3c22242727e9079f0a1879026',
    approvedUnits: 'A5-GAP-1,A5-GAP-2,A5-GAP-2,A5-GAP-5'
  });

  assert.equal(report.templateRendered, false);
  assert.equal(report.failClosedReasons.includes('duplicate_approved_units'), true);
  assert.deepEqual(report.duplicateUnits, ['A5-GAP-2']);
});

test('a5 approved-unit validator normalizes supported units', () => {
  const result = validateApprovedUnits(['A5-GAP-1', 'A5-GAP-2', 'A5-GAP-6']);

  assert.deepEqual(result.invalidUnits, []);
  assert.deepEqual(result.duplicateUnits, []);
  assert.equal(result.normalizedUnits, 'A5-GAP-1, A5-GAP-2, A5-GAP-6');
});
