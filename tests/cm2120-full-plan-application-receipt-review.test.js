'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const { resolverOptions } = require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const review = require('../src/core/Cm2120FullPlanApplicationReceiptReview');
const cm2118 = require('../src/core/Cm2118FullPlanApplicationExecution');
const cm2115 = require('../src/core/Cm2115R2Phase2CompletionAuditApplication');
const generator = require('../scripts/generate-cm2120-full-plan-application-receipt-review');
const freezer = require('../scripts/freeze-cm2120-full-plan-application-receipts');
const { sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');

const ROOT = path.resolve(__dirname, '..');
const CM2115_BINDING_HASH = '8ec9206dc2dad88f7fb88302c30bae6113b7ec0b909f37354c56c50d8f253ebc';
const plainDurableEvidence = Object.freeze({
  accepted: true,
  blockers: [],
  applicationCommit: review.APPLICATION_COMMIT,
  applicationTree: review.APPLICATION_TREE,
  fullPlanPackCompleted: true,
  readinessClaimed: false,
  statusSyncAuthorized: false
});
let durableEvidence;
let durableFixtureRoot;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function seedTrackedDurableEvidenceFixture(repo) {
  const governanceRoot = path.join(repo, '.git', 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
  fs.mkdirSync(governanceRoot, { recursive: true });
  fs.writeFileSync(
    path.join(governanceRoot, '.phase8-registry-root-identity.json'),
    JSON.stringify(review.canonicalize(cm2118.GOVERNANCE_ROOT_IDENTITY))
  );
  const cm2115ClaimFile = cm2115.claimFileName();
  const cm2115Claim = cm2115.validateDurableClaim({
    schemaVersion: 1,
    registryReference: cm2115.REGISTRY_REFERENCE,
    claimId: cm2115ClaimFile.slice('.cm2115-r2-phase2-application-claim-'.length, -'.json'.length),
    nonceHash: sha256(cm2115.NONCE),
    receiptIdHash: sha256(cm2115.RECEIPT_ID),
    bindingHash: CM2115_BINDING_HASH,
    decisionReference: cm2115.DECISION_REFERENCE,
    authorizationUseCount: 1,
    authorizationReplayAllowed: false,
    patchInvocationCount: 1,
    state: 'CONSUMED_SUCCESS'
  }, CM2115_BINDING_HASH);
  fs.writeFileSync(path.join(governanceRoot, cm2115ClaimFile), JSON.stringify(review.canonicalize(cm2115Claim)));
  const executionBytes = fs.readFileSync(path.join(ROOT, review.FROZEN_RECEIPTS[0].outputPath));
  const bindingBytes = fs.readFileSync(path.join(ROOT, review.FROZEN_RECEIPTS[1].outputPath));
  const execution = JSON.parse(executionBytes.toString('utf8'));
  fs.writeFileSync(path.join(governanceRoot, cm2118.EXECUTION_RECEIPT_FILENAME), executionBytes);
  fs.writeFileSync(path.join(governanceRoot, cm2118.BINDING_RECEIPT_FILENAME), bindingBytes);
  const registry = new cm2118.Cm2118FullPlanApplicationClaimRegistry({ governanceRoot });
  const claim = registry.validateEnvelope({
    schemaVersion: 1,
    registryReference: cm2118.REGISTRY_REFERENCE,
    claimId: cm2118.claimId(),
    nonceHash: sha256(cm2118.NONCE),
    receiptIdHash: sha256(cm2118.RECEIPT_ID),
    bindingHash: review.BINDING_HASH,
    action: cm2118.ACTION,
    contentDecisionReference: cm2118.CONTENT_DECISION_FREEZE.reference,
    finalReleaseDecisionReference: execution.payload.finalRelease.reference,
    finalReleaseApprovedAt: execution.payload.registry.finalReleaseApprovedAt,
    finalReleaseExpiresAt: execution.payload.registry.finalReleaseExpiresAt,
    claimedAt: execution.payload.registry.claimedAt,
    authorizationUseCount: 1,
    authorizationReplayAllowed: false,
    patchInvocationCount: 1,
    state: 'CONSUMED_SUCCESS',
    applicationCommitAttempted: true,
    applicationCommitCreated: true,
    executionReceiptCreated: true,
    bindingReceiptCreated: true,
    reconciliationRequired: false,
    applicationCommit: review.APPLICATION_COMMIT,
    applicationTree: review.APPLICATION_TREE,
    executionReceiptSha256: sha256(executionBytes),
    bindingReceiptSha256: sha256(bindingBytes)
  }, review.BINDING_HASH);
  fs.writeFileSync(path.join(governanceRoot, cm2118.claimFileName()), JSON.stringify(review.canonicalize(claim)));
}

test.before(async () => {
  durableFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2120-durable-'));
  const repo = path.join(durableFixtureRoot, 'repo');
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', ROOT, repo], { stdio: ['ignore', 'pipe', 'pipe'] });
  seedTrackedDurableEvidenceFixture(repo);
  const previous = process.cwd();
  try {
    process.chdir(repo);
    durableEvidence = await review.evaluateCurrentDurableEvidence();
  } finally {
    process.chdir(previous);
  }
  assert.equal(durableEvidence.accepted, true, durableEvidence.blockers.join(','));
});

test.after(() => {
  if (durableFixtureRoot) fs.rmSync(durableFixtureRoot, { recursive: true, force: true });
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function prepared() {
  const options = resolverOptions();
  const frozenEvidence = review.evaluateFrozenReceiptSet(options);
  assert.equal(frozenEvidence.accepted, true, frozenEvidence.blockers.join(','));
  const implementation = {
    commit: review.FREEZE_COMMIT,
    tree: review.FREEZE_TREE
  };
  const decision = review.buildReviewDecision({ frozenEvidence, durableEvidence, implementation });
  return { options, frozenEvidence, implementation, decision };
}

test('frozen receipt commit is exact, anchored, and low-disclosure', () => {
  const { frozenEvidence } = prepared();
  assert.equal(frozenEvidence.applicationCommitAnchored, true);
  assert.equal(frozenEvidence.fullPlanPackCompletedEvidenceAccepted, true);
  assert.equal(frozenEvidence.statusSyncPerformed, false);
  assert.equal(frozenEvidence.readinessClaimed, false);
  assert.equal(frozenEvidence.identities[0].json.blobOid, review.FROZEN_RECEIPTS[0].blobOid);
  assert.equal(frozenEvidence.identities[1].json.blobOid, review.FROZEN_RECEIPTS[1].blobOid);
});

test('exact internal receipt review decision passes without authorizing status sync', () => {
  const { options, implementation, decision } = prepared();
  const evaluation = review.evaluateReviewDecision(decision, { implementation, durableEvidence, ...options });
  assert.equal(evaluation.accepted, true, evaluation.blockers.join(','));
  assert.equal(evaluation.statusSyncApplicationMayBePrepared, true);
  assert.equal(evaluation.statusSyncAuthorized, false);
  assert.equal(evaluation.readinessClaimed, false);
});

test('receipt, application, readiness, and side-effect drift fail closed', () => {
  const { options, implementation, decision } = prepared();
  for (const mutate of [
    value => { value.payload.receipts[0].rawSha256 = '0'.repeat(64); },
    value => { value.payload.application.commit = '0'.repeat(40); },
    value => { value.payload.oneShotResult.authorizationReplayAllowed = true; },
    value => { value.payload.appliedEvidence.statusSyncPerformed = true; },
    value => { value.payload.appliedEvidence.readiness.productionReady = true; },
    value => { value.payload.sideEffects.nativeWrites = 1; }
  ]) {
    const changed = clone(decision);
    mutate(changed);
    changed.canonicalPayloadSha256 = sha256Canonical(changed.payload);
    assert.equal(review.evaluateReviewDecision(changed, {
      implementation,
      durableEvidence,
      ...options
    }).accepted, false);
  }
});

test('durable evidence cannot be replaced by an incomplete or readiness-bearing summary', () => {
  const { options, frozenEvidence, implementation } = prepared();
  assert.throws(() => review.buildReviewDecision({
    frozenEvidence,
    durableEvidence: { ...plainDurableEvidence, accepted: false },
    implementation
  }), /exact_evidence/);
  assert.throws(() => review.buildReviewDecision({
    frozenEvidence,
    durableEvidence: { ...plainDurableEvidence, readinessClaimed: true },
    implementation
  }), /exact_evidence/);
  const decision = review.buildReviewDecision({ frozenEvidence, durableEvidence, implementation });
  assert.equal(review.evaluateReviewDecision(decision, {
    implementation,
    durableEvidence: { ...plainDurableEvidence, applicationCommit: '0'.repeat(40) },
    ...options
  }).accepted, false);
});

test('ordinary caller-supplied durable evidence has no review authority', () => {
  const { options, frozenEvidence, implementation } = prepared();
  const decision = review.buildReviewDecision({ frozenEvidence, durableEvidence, implementation });
  const evaluation = review.evaluateReviewDecision(decision, {
    implementation,
    durableEvidence: { ...plainDurableEvidence },
    ...options
  });
  assert.equal(evaluation.accepted, false);
  assert.ok(evaluation.blockers.includes('review.durableEvidenceMachineBinding'));
});

test('review implementation must resolve to the claimed Git tree and reviewed ancestry', () => {
  const { options, frozenEvidence } = prepared();
  const implementation = { commit: 'f'.repeat(40), tree: 'e'.repeat(40) };
  const decision = review.buildReviewDecision({ frozenEvidence, durableEvidence, implementation });
  const evaluation = review.evaluateReviewDecision(decision, {
    implementation,
    durableEvidence,
    ...options
  });
  assert.equal(evaluation.accepted, false);
  assert.ok(evaluation.blockers.includes('review.implementationGitIdentity'));

  const extraFieldImplementation = {
    commit: review.FREEZE_COMMIT,
    tree: review.FREEZE_TREE,
    unreviewedAuthority: false
  };
  const extraFieldDecision = review.buildReviewDecision({
    frozenEvidence,
    durableEvidence,
    implementation: extraFieldImplementation
  });
  const extraFieldEvaluation = review.evaluateReviewDecision(extraFieldDecision, {
    implementation: extraFieldImplementation,
    durableEvidence,
    ...options
  });
  assert.equal(extraFieldEvaluation.accepted, false);
  assert.ok(extraFieldEvaluation.blockers.includes('review.implementationGitIdentity'));
});

test('review generator accepts no arguments or output path overrides', () => {
  assert.deepEqual(generator.parseArgs([]), {});
  assert.throws(() => generator.parseArgs(['--output', '/tmp/x']), /no_arguments/);
});

test('review generator rejects unsafe Git overrides before its first repository read', async () => {
  const previous = process.env.GIT_DIR;
  process.env.GIT_DIR = '/tmp/cm2120-forbidden-git-dir';
  try {
    await assert.rejects(
      generator.main([]),
      /cm2118_unsafe_git_environment:GIT_DIR/
    );
  } finally {
    if (previous === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previous;
  }
});

test('review generator implementation reads ignore local replacement refs', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2120-review-replace-ref-'));
  const repo = path.join(parent, 'repo');
  try {
    execFileSync('git', ['clone', '--quiet', '--no-hardlinks', ROOT, repo], { stdio: ['ignore', 'pipe', 'pipe'] });
    const cleanGitEnv = { ...process.env, GIT_NO_REPLACE_OBJECTS: '1' };
    const cleanGitText = args => execFileSync('git', args, {
      cwd: repo,
      env: cleanGitEnv,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    const head = cleanGitText(['rev-parse', 'HEAD^{commit}']);
    const realTree = cleanGitText(['rev-parse', 'HEAD^{tree}']);
    const replacement = cleanGitText(['rev-parse', 'HEAD^']);
    execFileSync('git', ['replace', head, replacement], {
      cwd: repo,
      env: cleanGitEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const replacedTree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    assert.notEqual(replacedTree, realTree);
    const previous = process.cwd();
    let implementation;
    try {
      process.chdir(repo);
      implementation = generator.buildReviewImplementationIdentity();
    } finally {
      process.chdir(previous);
    }
    assert.equal(implementation.commit, head);
    assert.equal(implementation.tree, realTree);
    assert.notEqual(implementation.tree, replacedTree);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('receipt freezer rejects unsafe Git overrides before its first repository read', async () => {
  const previous = process.env.GIT_DIR;
  process.env.GIT_DIR = '/tmp/cm2120-forbidden-freeze-git-dir';
  try {
    await assert.rejects(
      freezer.main([]),
      /cm2118_unsafe_git_environment:GIT_DIR/
    );
  } finally {
    if (previous === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previous;
  }
});

test('receipt freezer repository reads ignore local replacement refs', () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2120-replace-ref-'));
  const repo = path.join(parent, 'repo');
  try {
    execFileSync('git', ['clone', '--quiet', '--no-hardlinks', ROOT, repo], { stdio: ['ignore', 'pipe', 'pipe'] });
    const replacement = execFileSync('git', ['rev-parse', 'HEAD^{commit}'], {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    execFileSync('git', ['replace', freezer.APPLICATION_COMMIT, replacement], {
      cwd: repo,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const replacedTree = execFileSync('git', ['rev-parse', `${freezer.APPLICATION_COMMIT}^{tree}`], {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    assert.notEqual(replacedTree, freezer.APPLICATION_TREE);
    const previous = process.cwd();
    try {
      process.chdir(repo);
      assert.doesNotThrow(() => freezer.assertRepositoryBoundary());
    } finally {
      process.chdir(previous);
    }
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
