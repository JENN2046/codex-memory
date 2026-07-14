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
} = require('./cm2115-r2-git');

const {
  BASELINE,
  LOCAL_VALIDATION_RECEIPT_PATH,
  canonicalize,
  sha256,
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  IMPLEMENTATION_ARTIFACT_PATHS,
  REVIEW_IMPLEMENTATION_FREEZE,
  SNAPSHOT_FREEZE,
  evaluateCm2115SnapshotReviewRequest
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract');
const {
  resolveFrozenPhase2DurableClaim
} = require('../src/cli/cm2115-canonical-full-plan-evidence-snapshot');

const DEFAULT_JSON_PATH = path.join(
  'docs',
  'near-model-memory-plan-pack',
  'cm2115_r2_canonical_full_plan_evidence_snapshot_review_request.json'
);
const DEFAULT_MARKDOWN_PATH = path.join(
  'docs',
  'near-model-memory-plan-pack',
  'cm2115_r2_canonical_full_plan_evidence_snapshot_review_request.md'
);

function gitText(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function resolveGitFile(commit, sourcePath) {
  return resolveR2GitFile(commit, sourcePath);
}

function fileBinding(commit, sourcePath) {
  const actual = resolveGitFile(commit, sourcePath);
  return {
    path: sourcePath,
    blobOid: actual.blobOid,
    bytes: actual.bytes,
    sha256: actual.sha256
  };
}

function parseArgs(argv) {
  const options = { jsonPath: DEFAULT_JSON_PATH, markdownPath: DEFAULT_MARKDOWN_PATH, jsonSummary: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output-json') { options.jsonPath = argv[++index]; continue; }
    if (arg === '--output-markdown') { options.markdownPath = argv[++index]; continue; }
    if (arg === '--json') { options.jsonSummary = true; continue; }
    throw new Error(`cm2115_review_request_unknown_argument:${arg}`);
  }
  return options;
}

function isCommitAncestor(ancestor, descendant) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
      cwd: process.cwd(), stdio: ['ignore', 'ignore', 'pipe']
    });
    return true;
  } catch {
    return false;
  }
}

function resolverOptions() {
  return {
    resolveGitFile,
    resolveCommitTree,
    isCommitAncestor,
    resolveParentCommit,
    resolveDiffPaths,
    resolveGitPathState,
    resolveDurableClaim: resolveFrozenPhase2DurableClaim
  };
}

function buildRequest() {
  const implementationCommit = REVIEW_IMPLEMENTATION_FREEZE.commit;
  const implementationTree = REVIEW_IMPLEMENTATION_FREEZE.tree;
  const validationFile = resolveGitFile(BASELINE.sourceCommit, LOCAL_VALIDATION_RECEIPT_PATH);
  const validationReceipt = JSON.parse(validationFile.content.toString('utf8'));
  const payload = {
    reviewStatus: 'pending_independent_review',
    snapshot: {
      commit: SNAPSHOT_FREEZE.commit,
      tree: SNAPSHOT_FREEZE.tree,
      json: { ...SNAPSHOT_FREEZE.json },
      markdown: { ...SNAPSHOT_FREEZE.markdown }
    },
    sourceBaseline: {
      commit: BASELINE.sourceCommit,
      tree: BASELINE.sourceTree
    },
    localValidationReceipt: {
      commit: BASELINE.sourceCommit,
      tree: BASELINE.sourceTree,
      path: LOCAL_VALIDATION_RECEIPT_PATH,
      blobOid: validationFile.blobOid,
      bytes: validationFile.bytes,
      sha256: validationFile.sha256,
      canonicalPayloadSha256: validationReceipt.canonicalPayloadSha256,
      validationTargetCommit: validationReceipt.payload.validationTarget.commit,
      validationTargetTree: validationReceipt.payload.validationTarget.tree
    },
    reviewImplementation: {
      commit: implementationCommit,
      tree: implementationTree,
      artifacts: IMPLEMENTATION_ARTIFACT_PATHS.map(artifactPath => ({
        path: artifactPath,
        blobOid: resolveGitFile(implementationCommit, artifactPath).blobOid
      }))
    },
    reviewScope: {
      phaseRequirementCount: 11,
      objectiveInvariantCount: 13,
      traceEntryCount: 164,
      resolvedTraceEntryCount: 164,
      fakePlaceholderRefCount: 0,
      uniqueEvidenceFieldCount: 146,
      uniqueSourceObjectCount: 105,
      exactAuthorizedReceiptEntryCount: 21,
      externalReviewEntryCount: 6
    },
    requiredReviewChecks: {
      snapshotRawBytesAndHashReviewRequested: true,
      snapshotCanonicalPayloadReviewRequested: true,
      allTraceGitObjectBindingsReviewRequested: true,
      allTraceSemanticRoutesReviewRequested: true,
      validationReceiptAndLineageReviewRequested: true,
      phase2ApplicationBindingReceiptSemanticReviewRequested: true,
      candidateCompletionAuditReviewRequested: true,
      nonClaimAndZeroSideEffectReviewRequested: true
    },
    requestedDecisionBoundary: {
      independentSnapshotReviewRequested: true,
      independentSnapshotReviewPassed: false,
      applicationPreparationAuthorizedByReviewRequest: false,
      applicationExecutionAuthorizedByReviewRequest: false,
      fullPlanPackCompleted: false,
      readinessClaimed: false,
      separateApplicationGateRequiredAfterIndependentPass: true
    },
    currentState: {
      phase8Completed: true,
      fullPlanPackCompleted: false,
      readinessClaimed: false
    },
    nonClaims: {
      productionReady: false,
      releaseReady: false,
      deployReady: false,
      cutoverReady: false,
      rcReady: false,
      completeV8: false,
      modelMemoryComplete: false,
      fullRealtimeMemory: false,
      fullBridgeCompletion: false
    },
    sideEffects: {
      nativeReads: 0,
      nativeWrites: 0,
      durableMutations: 0,
      providerCalls: 0,
      realMemoryReads: 0,
      remoteActions: 0,
      readinessClaims: 0
    }
  };
  return {
    schemaVersion: 3,
    taskId: 'CM-2115-R2',
    requestType: 'canonical_full_plan_evidence_snapshot_independent_review_request_v3',
    canonicalPayloadSha256: sha256Canonical(payload),
    payload
  };
}

function renderMarkdown(request, jsonText) {
  return [
    '# CM-2115-R2 Canonical Full-plan Evidence Snapshot Independent Review Request',
    '',
    'Review only the frozen snapshot and its 164 exact Git-object/semantic-route bindings.',
    'This request does not authorize a completion application and does not change repository state.',
    '',
    `- Snapshot commit: \`${request.payload.snapshot.commit}\``,
    `- Snapshot JSON blob: \`${request.payload.snapshot.json.blobOid}\``,
    `- Snapshot JSON SHA-256: \`${request.payload.snapshot.json.sha256}\``,
    `- Snapshot payload SHA-256: \`${request.payload.snapshot.json.canonicalPayloadSha256}\``,
    `- Source baseline: \`${request.payload.sourceBaseline.commit}\``,
    `- Trace entries: \`${request.payload.reviewScope.traceEntryCount}\``,
    `- Placeholder refs: \`${request.payload.reviewScope.fakePlaceholderRefCount}\``,
    `- Current fullPlanPackCompleted: \`${request.payload.currentState.fullPlanPackCompleted}\``,
    `- Current readinessClaimed: \`${request.payload.currentState.readinessClaimed}\``,
    '',
    'If and only if the independent review passes, a separate application request may be prepared later.',
    'The independent review itself must keep application authority, completion state, and all readiness claims false.',
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
  if (gitText(['status', '--porcelain']) !== '') throw new Error('cm2115_review_request_clean_worktree_required');
  if (fs.existsSync(options.jsonPath) || fs.existsSync(options.markdownPath)) {
    throw new Error('cm2115_review_request_output_already_exists');
  }
  const request = buildRequest();
  const evaluation = evaluateCm2115SnapshotReviewRequest(request, resolverOptions());
  if (!evaluation.accepted) throw new Error(`cm2115_review_request_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = `${JSON.stringify(canonicalize(request), null, 2)}\n`;
  const markdownText = renderMarkdown(request, jsonText);
  fs.writeFileSync(options.jsonPath, jsonText, { flag: 'wx' });
  fs.writeFileSync(options.markdownPath, markdownText, { flag: 'wx' });
  const summary = {
    status: 'PASS_PREPARED_FOR_INDEPENDENT_REVIEW_SUBMISSION_ONLY',
    implementationCommit: request.payload.reviewImplementation.commit,
    implementationTree: request.payload.reviewImplementation.tree,
    snapshotCommit: request.payload.snapshot.commit,
    requestPayloadSha256: request.canonicalPayloadSha256,
    jsonBytes: Buffer.byteLength(jsonText),
    jsonSha256: sha256(jsonText),
    markdownBytes: Buffer.byteLength(markdownText),
    markdownSha256: sha256(markdownText),
    independentReviewPassed: false,
    applicationAuthorized: false,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
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
  buildRequest,
  fileBinding,
  isCommitAncestor,
  resolverOptions,
  parseArgs,
  renderMarkdown,
  resolveGitFile
};
