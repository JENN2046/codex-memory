'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const application = require('../src/core/Cm2125ExactBranchCasApplication');
const generator = require('../scripts/generate-cm2125-exact-branch-cas-application');
const { sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');

function git(args, cwd, options = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: options.encoding === null ? null : 'utf8',
    input: options.input,
    env: options.env || process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024
  });
}

function text(args, cwd) {
  return git(args, cwd).trim();
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function resolvers(cwd) {
  function resolveCommitTree(commit) {
    return text(['rev-parse', `${commit}^{tree}`], cwd);
  }

  function resolveParentCommit(commit) {
    const fields = text(['rev-list', '--parents', '-n', '1', commit], cwd).split(/\s+/);
    if (fields.length !== 2) throw new Error('single_parent_required');
    return fields[1];
  }

  function resolveGitPathState(sourceCommit, sourcePath) {
    const sourceTree = resolveCommitTree(sourceCommit);
    const raw = git(['ls-tree', '-z', sourceCommit, '--', sourcePath], cwd).toString('utf8');
    if (!raw) return { sourceCommit, sourceTree, sourcePath, exists: false };
    const match = raw.match(/^(\d{6}) (\w+) ([a-f0-9]{40})\t([^\0]+)\0$/);
    if (!match || match[4] !== sourcePath) throw new Error('path_state_invalid');
    return {
      sourceCommit,
      sourceTree,
      sourcePath,
      exists: true,
      gitMode: match[1],
      gitObjectType: match[2],
      objectOid: match[3]
    };
  }

  function resolveGitFile(sourceCommit, sourcePath) {
    const state = resolveGitPathState(sourceCommit, sourcePath);
    if (!state.exists || state.gitObjectType !== 'blob') throw new Error('file_missing');
    const content = git(['cat-file', 'blob', state.objectOid], cwd, { encoding: null });
    return {
      sourceCommit,
      sourceTree: state.sourceTree,
      sourcePath,
      gitMode: state.gitMode,
      gitObjectType: state.gitObjectType,
      blobOid: state.objectOid,
      bytes: content.length,
      sha256: sha256(content),
      content
    };
  }

  function resolveDiffPaths(parentCommit, commit) {
    const output = text([
      'diff-tree', '--no-renames', '--no-commit-id', '--name-only', '-r', parentCommit, commit
    ], cwd);
    return output ? output.split('\n').filter(Boolean).sort() : [];
  }

  function resolveDiffEntries(parentCommit, commit) {
    const output = text([
      'diff-tree', '--no-renames', '--no-commit-id', '--name-status', '-r', parentCommit, commit
    ], cwd);
    if (!output) return [];
    return output.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^([A-Z])\t(.+)$/);
      if (!match) throw new Error('diff_entry_invalid');
      return { status: match[1], path: match[2] };
    }).sort((left, right) => left.path.localeCompare(right.path));
  }

  function isCommitAncestor(ancestor, descendant) {
    const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return result.status === 0;
  }

  return {
    resolveCommitTree,
    resolveParentCommit,
    resolveDiffPaths,
    resolveDiffEntries,
    resolveGitFile,
    isCommitAncestor
  };
}

function copyImplementationFiles(destination) {
  for (const relative of application.IMPLEMENTATION_DIFF_PATHS) {
    const source = path.join(ROOT, relative);
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function commitImplementation(repo) {
  git(['add', '--', ...application.IMPLEMENTATION_DIFF_PATHS], repo);
  git(['commit', '-m', 'test: freeze cm2125 exact branch cas application'], repo);
  return text(['rev-parse', 'HEAD^{commit}'], repo);
}

function prepareFixture() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2125-application-'));
  const targetRepo = path.join(parent, 'target');
  const repo = path.join(parent, 'evidence');
  const targetBranch = application.TARGET_REF.replace('refs/heads/', '');
  git(['clone', '--quiet', '--no-hardlinks', ROOT, targetRepo], parent);
  git(['config', 'user.name', 'CM2125 Test'], targetRepo);
  git(['config', 'user.email', 'cm2125@example.invalid'], targetRepo);
  git(['checkout', '--quiet', '-B', targetBranch, application.EXPECTED_OLD], targetRepo);
  git(['worktree', 'add', '--quiet', '--detach', repo, application.REVIEW_COMMIT], targetRepo);
  copyImplementationFiles(repo);
  const implementationCommit = commitImplementation(repo);
  const targetBefore = text(['show-ref', '--hash', '--verify', application.TARGET_REF], repo);
  const stdout = execFileSync(process.execPath, [
    'scripts/generate-cm2125-exact-branch-cas-application.js'
  ], {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const targetAfter = text(['show-ref', '--hash', '--verify', application.TARGET_REF], repo);
  const jsonText = fs.readFileSync(path.join(repo, application.APPLICATION_PATH), 'utf8');
  const markdownText = fs.readFileSync(path.join(repo, application.APPLICATION_MARKDOWN_PATH), 'utf8');
  const artifact = JSON.parse(jsonText);
  const options = resolvers(repo);
  return {
    parent,
    repo,
    targetRepo,
    targetBranch,
    implementationCommit,
    targetBefore,
    targetAfter,
    summary: JSON.parse(stdout),
    jsonText,
    markdownText,
    artifact,
    options
  };
}

function changedArtifact(original, change) {
  const changed = structuredClone(original);
  change(changed);
  changed.canonicalPayloadSha256 = sha256Canonical(changed.payload);
  return changed;
}

let fixture;

test.before(() => {
  fixture = prepareFixture();
});

test.after(() => {
  if (fixture?.parent && process.env.CM2125_KEEP_FIXTURE !== '1') {
    fs.rmSync(fixture.parent, { recursive: true, force: true });
  }
});

test('review-commit temp clone freezes the exact implementation and generates only an application', () => {
  assert.equal(text(['rev-parse', `${fixture.implementationCommit}^`], fixture.repo), application.REVIEW_COMMIT);
  assert.deepEqual(
    fixture.options.resolveDiffPaths(application.REVIEW_COMMIT, fixture.implementationCommit),
    application.IMPLEMENTATION_DIFF_PATHS
  );
  const evaluation = application.evaluateApplication(fixture.artifact, fixture.options);
  assert.equal(evaluation.accepted, true, evaluation.blockers.join(','));
  assert.equal(fixture.summary.status, 'PASS_APPLICATION_PREPARED_ONLY');
  assert.equal(fixture.targetBefore, application.EXPECTED_OLD);
  assert.equal(fixture.targetAfter, application.EXPECTED_OLD);
  assert.equal(text(['branch', '--show-current'], fixture.targetRepo), fixture.targetBranch);
  assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.targetRepo), application.EXPECTED_OLD);
  assert.equal(text(['status', '--porcelain'], fixture.targetRepo), '');
  assert.ok(fixture.markdownText.includes(fixture.jsonText.trimEnd()));
});

test('application binds the exact ref, old/new transition, freeze, and independent review', () => {
  const { target, receiptEvidence } = fixture.artifact.payload;
  assert.deepEqual(target, {
    remoteName: null,
    targetRef: 'refs/heads/codex/near-model-memory-frozen-replay-v2',
    expectedOld: '869d9d6e62eebd7ce1c04cfe9e7a3b394355937f',
    expectedOldTree: '9e8185956ba4229a3238e162a4e9a092e1d4915c',
    newCommit: 'eb016872c834a8a8b36ed8edd8ce1aeb0db599c8',
    newTree: 'c129ecfaa134a47f30ed98f17d74151989c1a547',
    newCommitParent: '869d9d6e62eebd7ce1c04cfe9e7a3b394355937f',
    updateMethod: 'git_update_ref_exact_expected_old_compare_and_swap',
    forceAllowed: false,
    deleteAllowed: false,
    retargetAllowed: false,
    otherRefUpdateAllowed: false,
    remoteRefUpdateAllowed: false
  });
  assert.equal(receiptEvidence.freezeCommit, '86fc18bcfe9173af3cab3afca0522290f6f1f87c');
  assert.equal(receiptEvidence.freezeTree, '10bd4586209d5d3c3fe8d85082fb25f33a6595b1');
  assert.equal(receiptEvidence.reviewCommit, '4c820c284681692cb0354e9e9fd1a49aaa346d37');
  assert.equal(receiptEvidence.reviewTree, 'fbbbd57053263844bc7ac7d366883ef87e23700e');
  assert.equal(receiptEvidence.executionReceipt.blobOid, application.FREEZE_IDENTITIES.execution.blobOid);
  assert.equal(receiptEvidence.bindingReceipt.blobOid, application.FREEZE_IDENTITIES.binding.blobOid);
  assert.equal(receiptEvidence.reviewJson.blobOid, application.REVIEW_IDENTITIES.json.blobOid);
});

test('execution packet, final release, CAS execution, ref update, and readiness remain false', () => {
  const evaluation = application.evaluateApplication(fixture.artifact, fixture.options);
  const { requestedAuthorization, currentAuthority, currentState, currentSideEffects, nonClaims } =
    fixture.artifact.payload;
  assert.equal(requestedAuthorization.branchCasMayExecuteFromThisApplication, false);
  assert.equal(requestedAuthorization.branchRefUpdateAuthorized, false);
  assert.deepEqual(fixture.artifact.payload.targetWorktreeBoundary, {
    targetBranchCheckedOutInLinkedWorktreeAtApplication: true,
    targetWorktreeCleanAtApplication: true,
    refOnlyCasIsSufficient: false,
    exactPostCasIndexSynchronizationRequired: true,
    exactPostCasNinePathWorktreeSynchronizationRequired: true,
    targetWorktreeIdentityMustBeMachineDerived: true,
    callerSuppliedWorktreePathAllowed: false,
    resetHardAllowed: false,
    destructiveCheckoutAllowed: false,
    executorImplementationAndFinalReleaseStillRequired: true
  });
  assert.equal(currentAuthority.applicationExecuted, false);
  assert.equal(currentAuthority.contentDecisionPresent, false);
  assert.equal(currentAuthority.executionPacketPresent, false);
  assert.equal(currentAuthority.finalExecutionReleasePresent, false);
  assert.equal(currentAuthority.branchCasExecutionAuthorized, false);
  assert.equal(currentAuthority.branchRefUpdateAuthorized, false);
  assert.equal(currentState.branchRefUpdated, false);
  assert.equal(currentState.currentBranchStatusSynchronized, false);
  assert.equal(currentState.readinessClaimed, false);
  assert.ok(Object.values(currentSideEffects).every(value => value === 0));
  assert.ok(Object.values(nonClaims).every(value => value === false));
  assert.equal(evaluation.branchCasExecutionAuthorized, false);
  assert.equal(evaluation.branchRefUpdateAuthorized, false);
  assert.equal(evaluation.branchRefUpdated, false);
});

test('target, evidence, authority, state, side-effect, and upstream Git drift fail closed', () => {
  const changes = [
    value => { value.payload.target.targetRef = 'refs/heads/main'; },
    value => { value.payload.target.expectedOld = '0'.repeat(40); },
    value => { value.payload.target.expectedOldTree = '0'.repeat(40); },
    value => { value.payload.target.newCommit = '0'.repeat(40); },
    value => { value.payload.target.newTree = '0'.repeat(40); },
    value => { value.payload.target.newCommitParent = '0'.repeat(40); },
    value => { value.payload.receiptEvidence.freezeCommit = '0'.repeat(40); },
    value => { value.payload.receiptEvidence.reviewCommit = '0'.repeat(40); },
    value => { value.payload.receiptEvidence.executionReceipt.blobOid = '0'.repeat(40); },
    value => { value.payload.receiptEvidence.bindingReceipt.sha256 = '0'.repeat(64); },
    value => { value.payload.receiptEvidence.reviewPayloadSha256 = '0'.repeat(64); },
    value => { value.payload.targetWorktreeBoundary.refOnlyCasIsSufficient = true; },
    value => { value.payload.targetWorktreeBoundary.targetWorktreeCleanAtApplication = false; },
    value => { value.payload.currentAuthority.applicationExecuted = true; },
    value => { value.payload.currentAuthority.executionPacketPresent = true; },
    value => { value.payload.currentAuthority.finalExecutionReleasePresent = true; },
    value => { value.payload.currentAuthority.branchRefUpdateAuthorized = true; },
    value => { value.payload.currentState.branchRefUpdated = true; },
    value => { value.payload.currentSideEffects.branchRefUpdates = 1; },
    value => { value.payload.nonClaims.productionReady = true; }
  ];
  for (const change of changes) {
    const evaluation = application.evaluateApplication(changedArtifact(fixture.artifact, change), fixture.options);
    assert.equal(evaluation.accepted, false);
  }

  const originalResolveCommitTree = fixture.options.resolveCommitTree;
  const driftedOptions = {
    ...fixture.options,
    resolveCommitTree(commit) {
      return commit === application.FREEZE_COMMIT ? '0'.repeat(40) : originalResolveCommitTree(commit);
    }
  };
  assert.equal(application.evaluateApplication(fixture.artifact, driftedOptions).accepted, false);
});

test('generator rejects target-ref drift and every extra or execution argument', () => {
  assert.doesNotThrow(() => generator.parseArgs([]));
  for (const argv of [
    ['--execute'],
    ['--update-ref'],
    ['--final-release'],
    ['--output', '/tmp/cm2125.json'],
    ['--expected-old', application.EXPECTED_OLD]
  ]) {
    assert.throws(() => generator.parseArgs(argv), /no_arguments/);
  }

  fs.rmSync(path.join(fixture.repo, application.APPLICATION_PATH));
  fs.rmSync(path.join(fixture.repo, application.APPLICATION_MARKDOWN_PATH));
  assert.equal(text(['status', '--porcelain'], fixture.repo), '');

  const evidenceSentinel = path.join(fixture.repo, 'cm2125-dirty-evidence-sentinel');
  git(['config', 'status.showUntrackedFiles', 'no'], fixture.repo);
  fs.writeFileSync(evidenceSentinel, 'fixture only\n');
  assert.equal(text(['status', '--porcelain'], fixture.repo), '');
  let result = spawnSync(process.execPath, [
    'scripts/generate-cm2125-exact-branch-cas-application.js'
  ], {
    cwd: fixture.repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /clean_worktree_required/);
  fs.rmSync(evidenceSentinel);
  git(['config', '--unset', 'status.showUntrackedFiles'], fixture.repo);

  git(['checkout', '--quiet', '--detach', application.EXPECTED_OLD], fixture.targetRepo);
  result = spawnSync(process.execPath, [
    'scripts/generate-cm2125-exact-branch-cas-application.js'
  ], {
    cwd: fixture.repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /exact_checked_out_target_worktree_required/);
  git(['checkout', '--quiet', fixture.targetBranch], fixture.targetRepo);

  const dirtySentinel = path.join(fixture.targetRepo, 'cm2125-dirty-target-sentinel');
  git(['config', 'status.showUntrackedFiles', 'no'], fixture.targetRepo);
  fs.writeFileSync(dirtySentinel, 'fixture only\n');
  assert.equal(text(['status', '--porcelain'], fixture.targetRepo), '');
  result = spawnSync(process.execPath, [
    'scripts/generate-cm2125-exact-branch-cas-application.js'
  ], {
    cwd: fixture.repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /clean_target_worktree_required/);
  fs.rmSync(dirtySentinel);
  git(['config', '--unset', 'status.showUntrackedFiles'], fixture.targetRepo);

  git(['update-ref', application.TARGET_REF, application.REVIEW_COMMIT, application.EXPECTED_OLD], fixture.repo);
  try {
    result = spawnSync(process.execPath, [
      'scripts/generate-cm2125-exact-branch-cas-application.js'
    ], {
      cwd: fixture.repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /target_ref_expected_old_required/);
    assert.equal(text(['show-ref', '--hash', '--verify', application.TARGET_REF], fixture.repo), application.REVIEW_COMMIT);
  } finally {
    git(['update-ref', application.TARGET_REF, application.EXPECTED_OLD, application.REVIEW_COMMIT], fixture.repo);
  }
});
