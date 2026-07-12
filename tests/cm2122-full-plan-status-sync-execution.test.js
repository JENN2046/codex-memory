'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const implementation = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const { resolverOptions: realResolverOptions } = require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const { parseArgs } = require('../src/cli/cm2122-full-plan-status-sync');
const packetGenerator = require('../scripts/generate-cm2122-full-plan-status-sync-execution-packet');
const releaseGenerator = require('../scripts/generate-cm2123-full-plan-status-sync-final-release');
const { canonicalize, sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');

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

function text(args, cwd, options) {
  return git(args, cwd, options).toString().trim();
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
    const output = text(['diff-tree', '--no-renames', '--no-commit-id', '--name-only', '-r', parentCommit, commit], cwd);
    return output ? output.split('\n').filter(Boolean).sort() : [];
  }

  function resolveDiffEntries(parentCommit, commit) {
    const output = text(['diff-tree', '--no-renames', '--no-commit-id', '--name-status', '-r', parentCommit, commit], cwd);
    return output ? output.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^([A-Z])\t(.+)$/);
      if (!match) throw new Error('diff_entry_invalid');
      return { status: match[1], path: match[2] };
    }).sort((left, right) => left.path.localeCompare(right.path)) : [];
  }

  function isCommitAncestor(ancestor, descendant) {
    try {
      git(['merge-base', '--is-ancestor', ancestor, descendant], cwd);
      return true;
    } catch {
      return false;
    }
  }

  return {
    resolveCommitTree,
    resolveParentCommit,
    resolveGitPathState,
    resolveGitFile,
    resolveDiffPaths,
    resolveDiffEntries,
    isCommitAncestor
  };
}

function copyImplementationFiles(destination) {
  for (const relative of implementation.IMPLEMENTATION_DIFF_PATHS) {
    const source = path.join(ROOT, relative);
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function commitAll(cwd, message) {
  git(['add', '-A'], cwd);
  git(['commit', '-m', message], cwd);
  return text(['rev-parse', 'HEAD^{commit}'], cwd);
}

function decisionTime(decision) {
  const approved = Date.parse(decision.payload.authorization.approvedAt);
  const expires = Date.parse(decision.payload.authorization.expiresAt);
  assert.ok(Number.isFinite(approved));
  assert.ok(Number.isFinite(expires));
  assert.ok(approved < expires);
  return new Date(approved + Math.min(1000, Math.max(0, expires - approved - 1)));
}

function prepareFrozenFixture() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2122-e2e-'));
  const repo = path.join(parent, 'repo');
  git(['clone', '--quiet', '--no-hardlinks', ROOT, repo], parent);
  git(['config', 'user.name', 'CM2122 Test'], repo);
  git(['config', 'user.email', 'cm2122@example.invalid'], repo);
  git(['checkout', '--detach', implementation.IMPLEMENTATION_PARENT_FREEZE.commit], repo);
  copyImplementationFiles(repo);
  const implementationCommit = commitAll(repo, 'test: freeze cm2122 implementation');

  execFileSync(process.execPath, ['scripts/generate-cm2122-full-plan-status-sync-execution-packet.js'], {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const packetCommit = commitAll(repo, 'test: freeze cm2122 packet');

  execFileSync(process.execPath, ['scripts/generate-cm2123-full-plan-status-sync-final-release.js'], {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const finalReleaseCommit = commitAll(repo, 'test: freeze cm2123 final release');

  const modulePath = path.join(repo, 'src/core/Cm2122FullPlanStatusSyncExecution.js');
  delete require.cache[require.resolve(modulePath)];
  const frozenModule = require(modulePath);
  const gitResolvers = resolvers(repo);
  const packetEvidence = frozenModule.intakeExecutionPacket({ packetCommit, ...gitResolvers });
  assert.equal(packetEvidence.accepted, true, packetEvidence.blockers.join(','));
  const releaseJson = gitResolvers.resolveGitFile(finalReleaseCommit, frozenModule.FINAL_RELEASE_PATH);
  const releaseDecision = JSON.parse(releaseJson.content.toString('utf8'));
  const now = decisionTime(releaseDecision);
  const finalReleaseEvidence = frozenModule.intakeFinalReleaseDecision({
    finalReleaseCommit,
    packetEvidence,
    now,
    ...gitResolvers
  });
  assert.equal(finalReleaseEvidence.accepted, true, finalReleaseEvidence.blockers.join(','));

  return {
    parent,
    repo,
    frozenModule,
    gitResolvers,
    implementationCommit,
    packetCommit,
    finalReleaseCommit,
    packetEvidence,
    finalReleaseEvidence,
    now
  };
}

let fixture;

test.before(() => {
  fixture = prepareFrozenFixture();
});

test.after(() => {
  if (fixture?.parent && process.env.CM2122_KEEP_FIXTURE !== '1') {
    fs.rmSync(fixture.parent, { recursive: true, force: true });
  }
});

test('CM-2121 content decision is Git-intaken, frozen, and WeakSet machine-bound', () => {
  const evidence = implementation.intakeContentDecision(realResolverOptions());
  assert.equal(evidence.accepted, true, evidence.blockers.join(','));
  assert.equal(implementation.isMachineBoundContentDecision(evidence.decision), true);
  assert.equal(Object.isFrozen(evidence.decision), true);
  assert.equal(evidence.statusSyncExecutionAuthorized, false);
  assert.equal(evidence.branchRefUpdateAuthorized, false);
  assert.equal(implementation.isMachineBoundContentDecision(JSON.parse(JSON.stringify(evidence.decision))), false);
});

test('CLI accepts exactly the three frozen commit arguments and rejects every extra surface', () => {
  const content = 'a'.repeat(40);
  const packet = 'b'.repeat(40);
  const release = 'c'.repeat(40);
  const parsed = parseArgs([
    '--content-decision-commit', content,
    '--execution-packet-commit', packet,
    '--final-execution-release-commit', release
  ]);
  assert.equal(parsed.contentDecisionCommit, content);
  assert.equal(parsed.packetCommit, packet);
  assert.equal(parsed.finalReleaseCommit, release);
  for (const argv of [
    [],
    ['--content-decision-commit', content],
    ['--output', '/tmp/x'],
    [
      '--content-decision-commit', content,
      '--execution-packet-commit', packet,
      '--final-execution-release-commit', release,
      '--branch', 'refs/heads/other'
    ]
  ]) {
    assert.throws(() => parseArgs(argv), /exact_three_commit/);
  }
});

test('packet and final-release generators are preparation-only and reject execution/output arguments', () => {
  assert.deepEqual(packetGenerator.parseArgs([]), {});
  assert.deepEqual(releaseGenerator.parseArgs([]), {});
  for (const argv of [['--execute'], ['--output', '/tmp/x'], ['--update-ref']]) {
    assert.throws(() => packetGenerator.parseArgs(argv));
    assert.throws(() => releaseGenerator.parseArgs(argv));
  }
});

test('frozen packet remains non-executing and final release authorizes no branch ref update', () => {
  const packet = fixture.packetEvidence.packet;
  const release = fixture.finalReleaseEvidence.decision;
  assert.equal(fixture.packetEvidence.accepted, true);
  assert.equal(fixture.finalReleaseEvidence.accepted, true);
  assert.equal(fixture.frozenModule.isMachineBoundExecutionPacket(packet), true);
  assert.equal(fixture.frozenModule.isMachineBoundFinalReleaseDecision(release), true);
  assert.equal(fixture.frozenModule.isMachineBoundExecutionPacket(JSON.parse(JSON.stringify(packet))), false);
  assert.equal(fixture.frozenModule.isMachineBoundFinalReleaseDecision(JSON.parse(JSON.stringify(release))), false);
  assert.deepEqual(
    fixture.gitResolvers.resolveDiffEntries(fixture.implementationCommit, fixture.packetCommit),
    fixture.frozenModule.PACKET_DIFF_ENTRIES
  );
  assert.deepEqual(
    fixture.gitResolvers.resolveDiffEntries(fixture.packetCommit, fixture.finalReleaseCommit),
    fixture.frozenModule.FINAL_RELEASE_DIFF_ENTRIES
  );
  assert.equal(fs.existsSync(path.join(
    fixture.repo,
    '.git',
    'codex-memory-governance',
    'phase8-one-shot-authorization-registries'
  )), false);

  assert.equal(packet.payload.currentAuthority.statusSyncExecutionAuthorized, false);
  assert.equal(packet.payload.currentAuthority.detachedStatusCommitCreationAuthorized, false);
  assert.equal(packet.payload.currentAuthority.branchRefUpdateAuthorized, false);
  assert.ok(Object.values(packet.payload.currentSideEffects).every(value => value === 0));

  assert.equal(release.payload.authorization.executionReleaseAuthorized, true);
  assert.equal(release.payload.authorization.detachedStatusCommitCreationAuthorized, true);
  assert.equal(release.payload.authorization.branchRefUpdateAuthorized, false);
  assert.equal(release.payload.authorization.remoteRefUpdateAuthorized, false);
  assert.equal(release.payload.authorization.postBindingBranchRefDecisionRequired, true);
  assert.equal(release.payload.sideEffectLimits.branchRefUpdates, 0);
  assert.equal(release.payload.currentState.branchRefUpdated, false);
  assert.equal(release.payload.currentState.statusSyncPerformed, false);
  assert.equal(release.payload.currentState.currentBranchStatusSynchronized, false);
  assert.ok(Object.values(release.payload.nonClaims).every(value => value === false));

  const changed = JSON.parse(JSON.stringify(release));
  changed.payload.authorization.branchRefUpdateAuthorized = true;
  changed.canonicalPayloadSha256 = sha256Canonical(changed.payload);
  assert.equal(fixture.frozenModule.evaluateFinalReleaseDecision(changed, {
    packetEvidence: fixture.packetEvidence,
    now: fixture.now
  }).accepted, false);
});

test('registry root symlinks and claim timestamps outside the exact release window fail before claim creation', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2122-registry-boundary-'));
  try {
    const realRoot = path.join(parent, 'real-root');
    const linkedRoot = path.join(parent, 'linked-root');
    fs.mkdirSync(realRoot);
    fs.writeFileSync(
      path.join(realRoot, '.phase8-registry-root-identity.json'),
      JSON.stringify(canonicalize(fixture.frozenModule.GOVERNANCE_ROOT_IDENTITY))
    );
    fs.symlinkSync(realRoot, linkedRoot, 'dir');
    const linkedRegistry = new fixture.frozenModule.Cm2122StatusSyncClaimRegistry({ governanceRoot: linkedRoot });
    await assert.rejects(linkedRegistry.verifyRoot(), /governance_root_directory_invalid|symlink_forbidden/);

    const registry = new fixture.frozenModule.Cm2122StatusSyncClaimRegistry({ governanceRoot: realRoot });
    const bindingHash = fixture.frozenModule.buildClaimBindingHash({
      packetEvidence: fixture.packetEvidence,
      finalReleaseEvidence: fixture.finalReleaseEvidence
    });
    await assert.rejects(
      registry.claim(
        bindingHash,
        fixture.finalReleaseEvidence,
        new Date(fixture.finalReleaseEvidence.decision.payload.authorization.expiresAt)
      ),
      /outside_final_release_window/
    );
    assert.equal(fs.existsSync(path.join(realRoot, fixture.frozenModule.claimFileName())), false);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

function initializeGovernanceRoot() {
  const root = path.join(
    fixture.repo,
    '.git',
    'codex-memory-governance',
    'phase8-one-shot-authorization-registries'
  );
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, '.phase8-registry-root-identity.json'),
    JSON.stringify(canonicalize(fixture.frozenModule.GOVERNANCE_ROOT_IDENTITY)),
    { flag: 'wx' }
  );
  fixture.governanceRoot = root;
}

function runStatusSyncProcess() {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [
      'src/cli/cm2122-full-plan-status-sync.js',
      '--content-decision-commit', implementation.CONTENT_DECISION_FREEZE.commit,
      '--execution-packet-commit', fixture.packetCommit,
      '--final-execution-release-commit', fixture.finalReleaseCommit
    ], { cwd: fixture.repo, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

function evaluateDurableInFixture() {
  const source = [
    "const m=require('./src/core/Cm2122FullPlanStatusSyncExecution');",
    `(async()=>{const r=await m.evaluateDurableDetachedBinding({contentDecisionCommit:'${implementation.CONTENT_DECISION_FREEZE.commit}',packetCommit:'${fixture.packetCommit}',finalReleaseCommit:'${fixture.finalReleaseCommit}'});process.stdout.write(JSON.stringify(r));})().catch(e=>{console.error(e.message);process.exit(1);});`
  ].join('');
  return JSON.parse(execFileSync(process.execPath, ['-e', source], {
    cwd: fixture.repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }));
}

test('temp clone creates one exact detached 9M commit, binds it, and leaves the branch ref unchanged', async () => {
  initializeGovernanceRoot();
  git(['update-ref', implementation.FUTURE_BRANCH_REF, fixture.finalReleaseCommit], fixture.repo);
  git(['checkout', '--detach', fixture.finalReleaseCommit], fixture.repo);
  const branchBefore = text(['show-ref', '--hash', '--verify', implementation.FUTURE_BRANCH_REF], fixture.repo);
  assert.equal(branchBefore, fixture.finalReleaseCommit);
  assert.equal(text(['branch', '--show-current'], fixture.repo), '');

  const result = await runStatusSyncProcess();
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'PASS_DETACHED_STATUS_COMMIT_BOUND');
  assert.equal(payload.state, 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION');
  assert.equal(payload.authorizationConsumed, true);
  assert.equal(payload.authorizationReplayAllowed, false);
  assert.equal(payload.branchRefUpdateAuthorized, false);
  assert.equal(payload.branchRefUpdated, false);
  assert.equal(payload.statusSyncPerformed, false);
  assert.equal(payload.currentBranchStatusSynchronized, false);
  assert.equal(payload.fullPlanPackCompletedInDetachedCommit, true);
  assert.equal(payload.readinessClaimed, false);

  fixture.detachedStatusCommit = payload.detachedStatusCommit;
  assert.match(fixture.detachedStatusCommit, /^[a-f0-9]{40}$/);
  assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.repo), fixture.detachedStatusCommit);
  assert.equal(text(['rev-parse', `${fixture.detachedStatusCommit}^`], fixture.repo), fixture.finalReleaseCommit);
  assert.equal(
    text(['show-ref', '--hash', '--verify', implementation.FUTURE_BRANCH_REF], fixture.repo),
    branchBefore
  );
  assert.deepEqual(
    fixture.gitResolvers.resolveDiffEntries(fixture.finalReleaseCommit, fixture.detachedStatusCommit),
    fixture.packetEvidence.packet.payload.detachedCommitBoundary.exactEntries
  );
  assert.deepEqual(
    fixture.gitResolvers.resolveDiffPaths(fixture.finalReleaseCommit, fixture.detachedStatusCommit),
    fixture.packetEvidence.packet.payload.detachedCommitBoundary.exactPaths
  );
  assert.equal(fixture.gitResolvers.resolveDiffPaths(fixture.finalReleaseCommit, fixture.detachedStatusCommit).length, 9);
  assert.equal(text(['status', '--porcelain'], fixture.repo), '');

  for (const target of fixture.packetEvidence.packet.payload.detachedCommitBoundary.targets) {
    const actual = fixture.gitResolvers.resolveGitFile(fixture.detachedStatusCommit, target.sourcePath);
    assert.equal(actual.blobOid, target.after.blobOid, target.sourcePath);
    assert.equal(actual.bytes, target.after.bytes, target.sourcePath);
    assert.equal(actual.sha256, target.after.sha256, target.sourcePath);
  }

  assert.equal(fs.existsSync(path.join(
    fixture.governanceRoot,
    fixture.frozenModule.EXECUTION_RECEIPT_FILENAME
  )), true);
  assert.equal(fs.existsSync(path.join(
    fixture.governanceRoot,
    fixture.frozenModule.BINDING_RECEIPT_FILENAME
  )), true);
  const claimPath = path.join(fixture.governanceRoot, fixture.frozenModule.claimFileName());
  const claim = JSON.parse(fs.readFileSync(claimPath, 'utf8'));
  assert.equal(claim.state, 'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION');
  assert.equal(claim.authorizationUseCount, 1);
  assert.equal(claim.authorizationReplayAllowed, false);
  assert.equal(claim.detachedCommitInvocationCount, 1);
  assert.equal(claim.branchRefUpdateCount, 0);
  assert.equal(claim.reconciliationRequired, false);
  assert.ok(Date.parse(claim.claimedAt) >= Date.parse(claim.finalReleaseApprovedAt));
  assert.ok(Date.parse(claim.claimedAt) < Date.parse(claim.finalReleaseExpiresAt));

  const executionReceipt = JSON.parse(fs.readFileSync(path.join(
    fixture.governanceRoot,
    fixture.frozenModule.EXECUTION_RECEIPT_FILENAME
  ), 'utf8'));
  const bindingReceipt = JSON.parse(fs.readFileSync(path.join(
    fixture.governanceRoot,
    fixture.frozenModule.BINDING_RECEIPT_FILENAME
  ), 'utf8'));
  for (const receipt of [executionReceipt, bindingReceipt]) {
    assert.equal(receipt.payload.detachedCommit.targetBranchRef, implementation.FUTURE_BRANCH_REF);
    assert.equal(receipt.payload.detachedCommit.targetBranchExpectedOld, fixture.finalReleaseCommit);
    assert.equal(receipt.payload.detachedCommit.targetBranchObservedBeforeCommit, fixture.finalReleaseCommit);
    assert.equal(receipt.payload.detachedCommit.targetBranchObservedAfterCommit, fixture.finalReleaseCommit);
    assert.equal(receipt.payload.detachedCommit.detachedHeadCasUsed, true);
  }

  git(['checkout', '--detach', fixture.finalReleaseCommit], fixture.repo);
  const durable = evaluateDurableInFixture();
  assert.equal(durable.accepted, true, durable.blockers.join(','));
  assert.equal(durable.detachedStatusCommit, fixture.detachedStatusCommit);
  assert.equal(durable.detachedCommitBound, true);
  assert.equal(durable.branchRefUpdateAuthorized, false);
  assert.equal(durable.statusSyncPerformed, false);
  assert.equal(durable.currentBranchStatusSynchronized, false);
  assert.equal(durable.readinessClaimed, false);
});

test('a new process cannot replay the consumed authorization or move the branch ref', async () => {
  git(['checkout', '--detach', fixture.finalReleaseCommit], fixture.repo);
  const branchBefore = text(['show-ref', '--hash', '--verify', implementation.FUTURE_BRANCH_REF], fixture.repo);
  const objectsBefore = text(['count-objects', '-v'], fixture.repo);
  const replay = await runStatusSyncProcess();
  assert.equal(replay.code, 0, replay.stderr);
  const result = JSON.parse(replay.stdout);
  assert.equal(result.status, 'STOPPED');
  assert.equal(result.authorizationConsumed, true);
  assert.equal(result.authorizationReplayAllowed, false);
  assert.equal(result.branchRefUpdateAuthorized, false);
  assert.equal(result.statusSyncPerformed, false);
  assert.equal(result.currentBranchStatusSynchronized, false);
  assert.equal(
    text(['show-ref', '--hash', '--verify', implementation.FUTURE_BRANCH_REF], fixture.repo),
    branchBefore
  );
  assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.repo), fixture.finalReleaseCommit);
  assert.equal(text(['count-objects', '-v'], fixture.repo), objectsBefore);

  const registry = new fixture.frozenModule.Cm2122StatusSyncClaimRegistry({
    governanceRoot: fixture.governanceRoot
  });
  const bindingHash = fixture.frozenModule.buildClaimBindingHash({
    packetEvidence: fixture.packetEvidence,
    finalReleaseEvidence: fixture.finalReleaseEvidence
  });
  const existing = await registry.inspectExisting(bindingHash);
  const reentryReceipt = fixture.frozenModule.buildReentryReceipt(
    existing,
    bindingHash,
    fixture.finalReleaseCommit
  );
  const reentryEvaluation = fixture.frozenModule.evaluateReentryReceipt(reentryReceipt, {
    existing,
    bindingHash,
    finalReleaseCommit: fixture.finalReleaseCommit
  });
  assert.equal(reentryEvaluation.accepted, true, reentryEvaluation.blockers.join(','));
  assert.equal(reentryReceipt.payload.authorizationReplayAllowed, false);
  assert.equal(reentryReceipt.payload.branchRefUpdateAuthorized, false);
  assert.equal(reentryReceipt.payload.currentBranchStatusSynchronized, false);
});
