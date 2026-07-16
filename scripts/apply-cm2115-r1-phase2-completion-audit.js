#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const {
  CM2080,
  DECISION_PATH,
  PHASE2_MANIFEST,
  RECEIPT_PATH,
  WINDOWS_WSL_RECEIPT,
  canonicalize,
  evaluateApplicationReceipt,
  executeApplication,
  sha256
} = require('../src/core/Cm2115R1Phase2CompletionAuditApplication');

const DEFAULT_MARKDOWN_PATH = RECEIPT_PATH.replace(/\.json$/, '.md');

function gitText(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function gitBuffer(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: null,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024
  });
}

function parseArgs(argv) {
  const options = { jsonPath: RECEIPT_PATH, markdownPath: DEFAULT_MARKDOWN_PATH, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--decision-commit') options.decisionCommit = argv[++index];
    else if (arg === '--output-json') options.jsonPath = argv[++index];
    else if (arg === '--output-markdown') options.markdownPath = argv[++index];
    else if (arg === '--json') options.json = true;
    else throw new Error(`cm2115_r1_phase2_application_unknown_argument:${arg}`);
  }
  if (!/^[a-f0-9]{40}$/.test(options.decisionCommit || '')) {
    throw new Error('cm2115_r1_phase2_application_decision_commit_required');
  }
  return options;
}

function resolveGitFile(sourceCommit, sourcePath) {
  const sourceTree = gitText(['rev-parse', `${sourceCommit}^{tree}`]);
  const treeLine = gitBuffer(['ls-tree', '-z', sourceCommit, '--', sourcePath]).toString('utf8');
  const match = treeLine.match(/^(\d{6}) (\w+) ([a-f0-9]{40})\t([^\0]+)\0$/);
  if (!match || match[4] !== sourcePath || match[2] !== 'blob') {
    throw new Error(`cm2115_r1_phase2_application_git_file_missing:${sourcePath}`);
  }
  const content = gitBuffer(['cat-file', 'blob', match[3]]);
  return {
    sourceCommit,
    sourceTree,
    sourcePath,
    blobOid: match[3],
    bytes: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    content
  };
}

function parseGitJson(identity) {
  return JSON.parse(identity.content.toString('utf8'));
}

function identityOnly(identity) {
  const { content, ...safeIdentity } = identity;
  return safeIdentity;
}

function renderMarkdown(receipt, jsonText) {
  return [
    '# CM-2115-R1 Phase 2 Completion Audit Application Receipt',
    '',
    `Receipt payload SHA-256: \`${receipt.receiptPayloadSha256}\``,
    '',
    'The exact CM-2080-reviewed Phase 2 machine evidence was applied once.',
    'No runtime, native memory, provider, real-memory, remote, full-plan, or readiness action occurred.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2115_r1_phase2_application_clean_worktree_required');
  const head = gitText(['rev-parse', 'HEAD^{commit}']);
  if (head !== options.decisionCommit) throw new Error('cm2115_r1_phase2_application_head_must_equal_decision_commit');
  if (fs.existsSync(options.jsonPath) || fs.existsSync(options.markdownPath)) {
    throw new Error('cm2115_r1_phase2_application_receipt_exists');
  }
  const decisionIdentity = resolveGitFile(options.decisionCommit, DECISION_PATH);
  const reviewIdentity = resolveGitFile(CM2080.sourceCommit, CM2080.sourcePath);
  const manifestIdentity = resolveGitFile(PHASE2_MANIFEST.sourceCommit, PHASE2_MANIFEST.sourcePath);
  const smokeIdentity = resolveGitFile(WINDOWS_WSL_RECEIPT.sourceCommit, WINDOWS_WSL_RECEIPT.sourcePath);
  const result = executeApplication({
    decision: parseGitJson(decisionIdentity),
    decisionGitIdentity: identityOnly(decisionIdentity),
    decisionRawBytes: decisionIdentity.content,
    externalReviewDecision: parseGitJson(reviewIdentity),
    externalReviewGitIdentity: identityOnly(reviewIdentity),
    phase2Manifest: parseGitJson(manifestIdentity),
    phase2ManifestGitIdentity: identityOnly(manifestIdentity),
    windowsWslReceipt: parseGitJson(smokeIdentity),
    windowsWslReceiptGitIdentity: identityOnly(smokeIdentity),
    baseline: {
      cleanWorktree: true,
      applicationReceiptAbsent: true,
      completionAuditWorktreeMatchesHead: true,
      traceMatrixWorktreeMatchesHead: true,
      independentReviewPassed: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false,
      oldCm2074UsedAsCurrentAuthority: false
    }
  });
  if (!result.accepted) throw new Error(`cm2115_r1_phase2_application_rejected:${result.blockers.join(',')}`);
  const receipt = {
    receiptPayload: result.receiptPayload,
    receiptPayloadSha256: result.receiptPayloadSha256
  };
  const evaluation = evaluateApplicationReceipt(receipt, { resolveGitFile });
  if (!evaluation.accepted) throw new Error(`cm2115_r1_phase2_receipt_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = `${JSON.stringify(canonicalize(receipt), null, 2)}\n`;
  const markdownText = renderMarkdown(receipt, jsonText);
  fs.writeFileSync(options.jsonPath, jsonText, { flag: 'wx' });
  fs.writeFileSync(options.markdownPath, markdownText, { flag: 'wx' });
  const summary = {
    status: 'PASS_PHASE2_COMPLETION_AUDIT_EVIDENCE_APPLIED_ONCE',
    decisionCommit: options.decisionCommit,
    decisionBlobOid: decisionIdentity.blobOid,
    receiptPayloadSha256: receipt.receiptPayloadSha256,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    applicationAuthorizationConsumed: true,
    independentReviewPassed: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
  process.stdout.write(options.json ? `${JSON.stringify(summary)}\n` : `${JSON.stringify(summary, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = { DEFAULT_MARKDOWN_PATH, identityOnly, parseArgs, renderMarkdown, resolveGitFile };
