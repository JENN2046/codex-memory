#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  resolveCommitTree,
  resolveDiffPaths,
  resolveGitFile: resolveR2GitFile,
  resolveGitPathState,
  resolveParentCommit
} = require('../../scripts/cm2115-r2-git');

const {
  BASELINE,
  buildSnapshot,
  canonicalize,
  sha256
} = require('../core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  DECISION_REFERENCE: PHASE2_DECISION_REFERENCE,
  NONCE: PHASE2_NONCE,
  RECEIPT_ID: PHASE2_RECEIPT_ID,
  REGISTRY_REFERENCE: PHASE2_REGISTRY_REFERENCE,
  validateDurableClaim
} = require('../core/Cm2115R2Phase2CompletionAuditApplication');
const {
  evaluateCm2115CanonicalFullPlanEvidenceSnapshot
} = require('../core/Cm2115CanonicalFullPlanEvidenceSnapshotContract');

const DEFAULT_JSON_PATH = path.join(
  'docs',
  'near-model-memory-plan-pack',
  'cm2115_r2_canonical_full_plan_evidence_snapshot.json'
);
const DEFAULT_MARKDOWN_PATH = path.join(
  'docs',
  'near-model-memory-plan-pack',
  'cm2115_r2_canonical_full_plan_evidence_snapshot.md'
);
const FROZEN_PHASE2_DURABLE_CLAIM = Object.freeze({
  schemaVersion: 1,
  registryReference: PHASE2_REGISTRY_REFERENCE,
  claimId: '2dca80c9a3a88fdf7c6814964ffc3ca89efa89dcafa6252172995fdeccf36b16',
  nonceHash: sha256(PHASE2_NONCE),
  receiptIdHash: sha256(PHASE2_RECEIPT_ID),
  bindingHash: '8ec9206dc2dad88f7fb88302c30bae6113b7ec0b909f37354c56c50d8f253ebc',
  decisionReference: PHASE2_DECISION_REFERENCE,
  authorizationUseCount: 1,
  authorizationReplayAllowed: false,
  patchInvocationCount: 1,
  state: 'CONSUMED_SUCCESS'
});

function gitText(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function parseArgs(argv) {
  const options = {
    jsonPath: DEFAULT_JSON_PATH,
    markdownPath: DEFAULT_MARKDOWN_PATH,
    verifyOnly: false,
    jsonSummary: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output-json') {
      options.jsonPath = argv[++index];
      continue;
    }
    if (arg === '--output-markdown') {
      options.markdownPath = argv[++index];
      continue;
    }
    if (arg === '--verify-only') {
      options.verifyOnly = true;
      continue;
    }
    if (arg === '--json') {
      options.jsonSummary = true;
      continue;
    }
    throw new Error(`cm2115_snapshot_unknown_argument:${arg}`);
  }
  return options;
}

function resolveGitFile(sourceCommit, sourcePath) {
  return resolveR2GitFile(sourceCommit, sourcePath);
}

function resolveGitSourceObject(sourcePath) {
  return resolveGitFile(BASELINE.sourceCommit, sourcePath);
}

function resolveFrozenPhase2DurableClaim(bindingHash) {
  return structuredClone(validateDurableClaim(FROZEN_PHASE2_DURABLE_CLAIM, bindingHash));
}

function assertFrozenBaseline() {
  const commit = gitText(['rev-parse', `${BASELINE.sourceCommit}^{commit}`]);
  const tree = gitText(['rev-parse', `${BASELINE.sourceCommit}^{tree}`]);
  if (commit !== BASELINE.sourceCommit || tree !== BASELINE.sourceTree) {
    throw new Error('cm2115_snapshot_baseline_identity_mismatch');
  }
  const currentHead = gitText(['rev-parse', 'HEAD^{commit}']);
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', BASELINE.sourceCommit, currentHead], {
      cwd: process.cwd(),
      stdio: ['ignore', 'ignore', 'pipe']
    });
  } catch {
    throw new Error('cm2115_snapshot_baseline_not_ancestor_of_generator_head');
  }
  return { currentHead, currentTree: gitText(['rev-parse', 'HEAD^{tree}']) };
}

function assertCleanWorktree() {
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2115_snapshot_clean_worktree_required');
}

function renderCanonicalMarkdown(snapshot, jsonText) {
  const counts = snapshot.payload.counts;
  return [
    '# CM-2115-R2 Canonical Full-plan Evidence Snapshot',
    '',
    'This is a content-equivalent review surface for the canonical JSON snapshot.',
    'It is prepared for independent Git-object and semantic-route review only.',
    '',
    `- Source commit: \`${snapshot.payload.baseline.sourceCommit}\``,
    `- Source tree: \`${snapshot.payload.baseline.sourceTree}\``,
    `- Canonical payload SHA-256: \`${snapshot.canonicalPayloadSha256}\``,
    `- Trace entries: \`${counts.totalTraceEntryCount}\``,
    `- Resolved trace entries: \`${counts.resolvedTraceEntryCount}\``,
    `- Placeholder refs: \`${counts.fakePlaceholderRefCount}\``,
    `- Unique source objects: \`${counts.uniqueSourceObjectCount}\``,
    `- Candidate completion eligible: \`${snapshot.payload.candidateAudit.completionEligibleForIndependentReview}\``,
    `- Authoritative fullPlanPackCompleted: \`${snapshot.payload.currentState.fullPlanPackCompleted}\``,
    `- Readiness claimed: \`${snapshot.payload.currentState.readinessClaimed}\``,
    '',
    'The candidate audit result is not an application. Independent review and a separate application gate remain required.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
}

function verifySnapshot(snapshot) {
  const evaluation = evaluateCm2115CanonicalFullPlanEvidenceSnapshot(snapshot, {
    resolveSourceObject: resolveGitSourceObject,
    resolveCommitTree,
    resolveGitFile,
    resolveParentCommit,
    resolveDiffPaths,
    resolveDurableClaim: resolveFrozenPhase2DurableClaim,
    resolveGitPathState,
    isCommitAncestor: (ancestor, descendant) => {
      try {
        execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
          cwd: process.cwd(),
          stdio: ['ignore', 'ignore', 'pipe']
        });
        return true;
      } catch {
        return false;
      }
    }
  });
  if (!evaluation.accepted) {
    throw new Error(`cm2115_snapshot_contract_rejected:${evaluation.blockers.join(',')}`);
  }
  return evaluation;
}

function generate(options) {
  assertCleanWorktree();
  const generator = assertFrozenBaseline();
  if (fs.existsSync(options.jsonPath) || fs.existsSync(options.markdownPath)) {
    throw new Error('cm2115_snapshot_output_already_exists');
  }
  const snapshot = buildSnapshot(resolveGitSourceObject, {
    resolveGitFile,
    resolveCommitTree,
    resolveParentCommit,
    resolveDiffPaths,
    resolveDurableClaim: resolveFrozenPhase2DurableClaim,
    resolveGitPathState
  });
  const evaluation = verifySnapshot(snapshot);
  const jsonText = `${JSON.stringify(canonicalize(snapshot), null, 2)}\n`;
  const markdownText = renderCanonicalMarkdown(snapshot, jsonText);
  fs.writeFileSync(options.jsonPath, jsonText, { flag: 'wx' });
  fs.writeFileSync(options.markdownPath, markdownText, { flag: 'wx' });
  return {
    status: 'PASS_PREPARED_FOR_INDEPENDENT_REVIEW_ONLY',
    generatorCommit: generator.currentHead,
    generatorTree: generator.currentTree,
    baseline: { ...BASELINE },
    jsonPath: options.jsonPath,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownPath: options.markdownPath,
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    canonicalPayloadSha256: snapshot.canonicalPayloadSha256,
    traceEntryCount: evaluation.traceEntryCount,
    uniqueSourceObjectCount: evaluation.uniqueSourceObjectCount,
    fakePlaceholderRefCount: evaluation.fakePlaceholderRefCount,
    independentReviewPassed: false,
    applicationAuthorized: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

function verifyExisting(options) {
  assertFrozenBaseline();
  const jsonText = fs.readFileSync(options.jsonPath, 'utf8');
  const markdownText = fs.readFileSync(options.markdownPath, 'utf8');
  const snapshot = JSON.parse(jsonText);
  const evaluation = verifySnapshot(snapshot);
  const expectedMarkdown = renderCanonicalMarkdown(snapshot, jsonText);
  if (markdownText !== expectedMarkdown) throw new Error('cm2115_snapshot_markdown_mirror_mismatch');
  return {
    status: 'PASS_VERIFIED_FOR_INDEPENDENT_REVIEW_ONLY',
    baseline: { ...BASELINE },
    jsonPath: options.jsonPath,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownPath: options.markdownPath,
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    canonicalPayloadSha256: snapshot.canonicalPayloadSha256,
    traceEntryCount: evaluation.traceEntryCount,
    uniqueSourceObjectCount: evaluation.uniqueSourceObjectCount,
    fakePlaceholderRefCount: evaluation.fakePlaceholderRefCount,
    independentReviewPassed: false,
    applicationAuthorized: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = options.verifyOnly ? verifyExisting(options) : generate(options);
  process.stdout.write(options.jsonSummary ? `${JSON.stringify(summary)}\n` : `${JSON.stringify(summary, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_JSON_PATH,
  DEFAULT_MARKDOWN_PATH,
  assertFrozenBaseline,
  generate,
  parseArgs,
  renderCanonicalMarkdown,
  resolveGitFile,
  resolveCommitTree,
  resolveDiffPaths,
  resolveGitPathState,
  resolveGitSourceObject,
  resolveParentCommit,
  resolveFrozenPhase2DurableClaim,
  verifyExisting,
  verifySnapshot
};
