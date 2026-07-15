'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const implementation = require('../src/core/Cm2126ExactBranchCasExecution');
const constants = require('../src/core/Cm2126ExactBranchCasConstants');
const cli = require('../src/cli/cm2126-exact-branch-cas');
const packetGenerator = require('../scripts/generate-cm2126-exact-branch-cas-execution-packet');
const releaseGenerator = require('../scripts/generate-cm2127-exact-branch-cas-final-release');
const { resolverOptions: realResolverOptions } =
  require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const { canonicalize, sha256Canonical } =
  require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const FIXED_DATE_PRELOAD = path.join(ROOT, 'tests/helpers/fixed-date-preload.js');

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
  return git(args, cwd, options).toString('utf8').trim();
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
    resolveGitPathState,
    resolveGitFile,
    resolveDiffPaths,
    resolveDiffEntries,
    isCommitAncestor
  };
}

function copyImplementationFiles(destination) {
  for (const relative of constants.IMPLEMENTATION_DIFF_PATHS) {
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
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2126-cas-e2e-'));
  const repo = path.join(parent, 'evidence');
  const target = path.join(parent, 'target');
  const targetBranch = constants.TARGET_REF.replace('refs/heads/', '');
  git(['clone', '--quiet', '--no-hardlinks', ROOT, repo], parent);
  git(['config', 'user.name', 'CM2126 Test'], repo);
  git(['config', 'user.email', 'cm2126@example.invalid'], repo);
  git(['checkout', '--quiet', '--detach', constants.CONTENT_DECISION_FREEZE.commit], repo);
  git(['branch', targetBranch, constants.EXPECTED_OLD], repo);
  git(['worktree', 'add', '--quiet', target, targetBranch], repo);

  copyImplementationFiles(repo);
  const implementationCommit = commitAll(repo, 'test: freeze cm2126 exact branch cas executor');

  execFileSync(process.execPath, ['scripts/generate-cm2126-exact-branch-cas-execution-packet.js'], {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const packetCommit = commitAll(repo, 'test: freeze cm2126 exact branch cas packet');

  execFileSync(process.execPath, ['scripts/generate-cm2127-exact-branch-cas-final-release.js'], {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const finalReleaseCommit = commitAll(repo, 'test: freeze cm2127 exact branch cas final release');

  const modulePath = path.join(repo, 'src/core/Cm2126ExactBranchCasExecution.js');
  const constantsPath = path.join(repo, 'src/core/Cm2126ExactBranchCasConstants.js');
  const registryPath = path.join(repo, 'src/core/Cm2126ExactBranchCasClaimRegistry.js');
  const receiptPath = path.join(repo, 'src/core/Cm2126ExactBranchCasReceiptContract.js');
  for (const sourcePath of [modulePath, constantsPath, registryPath, receiptPath]) {
    delete require.cache[require.resolve(sourcePath)];
  }
  const frozenModule = require(modulePath);
  const frozenConstants = require(constantsPath);
  const frozenRegistry = require(registryPath);
  const frozenReceipt = require(receiptPath);
  const gitResolvers = resolvers(repo);
  const targetIdentity = frozenModule.deriveTargetWorktree(repo).publicIdentity;
  const packetEvidence = frozenModule.intakeExecutionPacket({
    packetCommit,
    targetWorktreeIdentity: targetIdentity,
    ...gitResolvers
  });
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
    target,
    targetBranch,
    frozenModule,
    frozenConstants,
    frozenRegistry,
    frozenReceipt,
    gitResolvers,
    targetIdentity,
    implementationCommit,
    packetCommit,
    finalReleaseCommit,
    packetEvidence,
    finalReleaseEvidence,
    now
  };
}

function exactArgs() {
  return {
    contentDecisionCommit: constants.CONTENT_DECISION_FREEZE.commit,
    packetCommit: fixture.packetCommit,
    finalReleaseCommit: fixture.finalReleaseCommit
  };
}

function cliArgv() {
  const args = exactArgs();
  return [
    '--content-decision-commit', args.contentDecisionCommit,
    '--execution-packet-commit', args.packetCommit,
    '--final-execution-release-commit', args.finalReleaseCommit
  ];
}

function runCli(extra = {}) {
  return spawnSync(process.execPath, [
    '--require', FIXED_DATE_PRELOAD,
    'src/cli/cm2126-exact-branch-cas.js',
    ...cliArgv()
  ], {
    cwd: fixture.repo,
    env: fixedExecutionEnv(extra.env || process.env),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function fixedExecutionEnv(env = process.env) {
  return {
    ...env,
    NODE_ENV: 'test',
    CODEX_MEMORY_TEST_FIXED_NOW: fixture.now.toISOString()
  };
}

function runTwiceInOneProcess() {
  const args = JSON.stringify(exactArgs());
  const source = [
    'process.umask(0o002);',
    "const m=require('./src/core/Cm2126ExactBranchCasExecution');",
    `(async()=>{const first=await m.executeBranchCasFromCommits(${args});`,
    `const second=await m.executeBranchCasFromCommits(${args});`,
    "process.stdout.write(JSON.stringify({first,second}));})()",
    ".catch(error=>{process.stderr.write(error.message+'\\n');process.exit(1);});"
  ].join('');
  return spawnSync(process.execPath, ['--require', FIXED_DATE_PRELOAD, '-e', source], {
    cwd: fixture.repo,
    env: fixedExecutionEnv(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function evaluateDurableInFixture() {
  const args = exactArgs();
  const source = [
    "const m=require('./src/core/Cm2126ExactBranchCasExecution');",
    `(async()=>{const value=await m.evaluateDurableBranchCas(${JSON.stringify(args)});`,
    "process.stdout.write(JSON.stringify(value));})()",
    ".catch(error=>{process.stderr.write(error.message+'\\n');process.exit(1);});"
  ].join('');
  const result = spawnSync(process.execPath, ['--require', FIXED_DATE_PRELOAD, '-e', source], {
    cwd: fixture.repo,
    env: fixedExecutionEnv(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function initializeGovernanceRoot() {
  const root = fixture.frozenModule.resolveFixedGovernanceRoot(fixture.repo);
  fs.mkdirSync(root, { recursive: true });
  const identityPath = path.join(root, '.phase8-registry-root-identity.json');
  if (!fs.existsSync(identityPath)) {
    fs.writeFileSync(identityPath, JSON.stringify(canonicalize(fixture.frozenConstants.GOVERNANCE_ROOT_IDENTITY)), {
      flag: 'wx'
    });
  }
  fixture.governanceRoot = root;
  fixture.claimPath = path.join(root, fixture.frozenRegistry.claimFileName());
  fixture.executionReceiptPath = path.join(root, fixture.frozenConstants.EXECUTION_RECEIPT_FILENAME);
  return root;
}

function runIsolatedFault(point, verify) {
  const primaryFixture = fixture;
  const isolated = prepareFrozenFixture();
  fixture = isolated;
  try {
    initializeGovernanceRoot();
    const result = runCli({
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CM2126_ISOLATED_TEST_FIXTURE: '1',
        CM2126_TEST_FAULT_POINT: point
      }
    });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.status, 'STOPPED');
    assert.equal(output.authorizationConsumed, true);
    assert.equal(output.authorizationReplayAllowed, false);
    assert.equal(output.currentBranchStatusSynchronized, false);
    assert.equal(output.reconciliationReceipt.payload.reconciliationRequired, true);
    assert.equal(output.reconciliationReceipt.payload.branchCasCallsThisReentry, 0);
    assert.equal(output.reconciliationReceipt.payload.targetIndexSyncCallsThisReentry, 0);
    assert.equal(output.reconciliationReceipt.payload.targetFileWritesThisReentry, 0);
    assert.equal(output.reconciliationReceipt.payload.executionReceiptWritesThisReentry, 0);
    const claimBytes = fs.readFileSync(fixture.claimPath);
    const claim = JSON.parse(claimBytes);
    verify({ claim, output });

    const replay = runCli();
    assert.equal(replay.status, 0, replay.stderr);
    const replayOutput = JSON.parse(replay.stdout);
    assert.equal(replayOutput.status, 'STOPPED');
    assert.equal(replayOutput.authorizationReplayAllowed, false);
    assert.equal(replayOutput.reconciliationReceipt.payload.branchCasCallsThisReentry, 0);
    assert.equal(replayOutput.reconciliationReceipt.payload.targetIndexSyncCallsThisReentry, 0);
    assert.equal(replayOutput.reconciliationReceipt.payload.targetFileWritesThisReentry, 0);
    assert.equal(replayOutput.reconciliationReceipt.payload.executionReceiptWritesThisReentry, 0);
    assert.ok(fs.readFileSync(fixture.claimPath).equals(claimBytes));
  } finally {
    fs.rmSync(isolated.parent, { recursive: true, force: true });
    fixture = primaryFixture;
  }
}

function refsSnapshot(cwd, prefix = 'refs/remotes') {
  return text(['for-each-ref', '--format=%(refname)%00%(objectname)', prefix], cwd);
}

let fixture;

test.before(() => {
  fixture = prepareFrozenFixture();
});

test.after(() => {
  if (fixture?.parent && process.env.CM2126_KEEP_FIXTURE !== '1') {
    fs.rmSync(fixture.parent, { recursive: true, force: true });
  }
});

test('content decision is exact Git-intaken, frozen, and WeakSet machine-bound', () => {
  const evidence = implementation.intakeContentDecision(realResolverOptions());
  assert.equal(evidence.accepted, true, evidence.blockers.join(','));
  assert.equal(evidence.contentDecisionMachineBound, true);
  assert.equal(implementation.isMachineBoundContentDecision(evidence.decision), true);
  assert.equal(Object.isFrozen(evidence.decision), true);
  assert.equal(implementation.isMachineBoundContentDecision(JSON.parse(JSON.stringify(evidence.decision))), false);
  assert.equal(evidence.branchCasExecutionAuthorized, false);
  assert.equal(evidence.branchRefUpdateAuthorized, false);
});

test('packet/final generators accept no arguments and CLI accepts exactly three frozen commits', () => {
  assert.deepEqual(packetGenerator.parseArgs([]), {});
  assert.deepEqual(releaseGenerator.parseArgs([]), {});
  assert.equal(releaseGenerator.VALIDATION_AT, releaseGenerator.APPROVED_AT);
  assert.equal(Date.parse(releaseGenerator.VALIDATION_AT) < Date.parse(releaseGenerator.EXPIRES_AT), true);
  for (const argv of [['--execute'], ['--update-ref'], ['--worktree', '/tmp/x'], ['--output', '/tmp/x']]) {
    assert.throws(() => packetGenerator.parseArgs(argv), /no_arguments/);
    assert.throws(() => releaseGenerator.parseArgs(argv), /no_arguments/);
  }

  const parsed = cli.parseArgs(cliArgv());
  assert.deepEqual(parsed, exactArgs());
  for (const argv of [
    [],
    cliArgv().slice(0, 4),
    [...cliArgv(), '--worktree', '/tmp/caller-controlled'],
    [...cliArgv(), '--target-ref', constants.TARGET_REF],
    [...cliArgv(), '--remote', 'origin'],
    ['--output', '/tmp/result.json']
  ]) {
    assert.throws(() => cli.parseArgs(argv), /exact_three_commit/);
  }
  assert.deepEqual(implementation.classifyBranchCasCommandFailure(constants.EXPECTED_OLD), {
    state: 'CONSUMED_AMBIGUOUS_CAS',
    details: {
      branchCasInvocationCount: 1,
      branchRefUpdates: null,
      targetRefObserved: constants.EXPECTED_OLD
    }
  });
  assert.deepEqual(implementation.classifyBranchCasCommandFailure(constants.NEW_COMMIT), {
    state: 'CONSUMED_AMBIGUOUS_CAS',
    details: {
      branchCasInvocationCount: 1,
      branchRefUpdates: null,
      targetRefObserved: constants.NEW_COMMIT
    }
  });
});

test('frozen packet and final release keep every current state false and current effect zero', () => {
  const packet = fixture.packetEvidence.packet;
  const release = fixture.finalReleaseEvidence.decision;
  assert.equal(fixture.frozenModule.isMachineBoundExecutionPacket(packet), true);
  assert.equal(fixture.frozenModule.isMachineBoundFinalReleaseDecision(release), true);
  assert.equal(fixture.frozenModule.isMachineBoundExecutionPacket(JSON.parse(JSON.stringify(packet))), false);
  assert.equal(fixture.frozenModule.isMachineBoundFinalReleaseDecision(JSON.parse(JSON.stringify(release))), false);

  assert.equal(packet.payload.currentAuthority.finalExecutionReleasePresent, false);
  assert.equal(packet.payload.currentAuthority.branchCasClaimCreationAuthorized, false);
  assert.equal(packet.payload.currentAuthority.branchCasExecutionAuthorized, false);
  assert.equal(packet.payload.currentAuthority.branchRefUpdateAuthorized, false);
  assert.equal(packet.payload.currentAuthority.targetWorktreeIndexSynchronizationAuthorized, false);
  assert.equal(packet.payload.currentAuthority.targetWorktreeFileSynchronizationAuthorized, false);
  assert.ok(Object.values(packet.payload.currentState).every(value => value === false));
  assert.ok(Object.values(packet.payload.currentSideEffects).every(value => value === 0));
  assert.ok(Object.values(packet.payload.nonClaims).every(value => value === false));

  assert.equal(release.payload.authorization.executionReleaseAuthorized, true);
  assert.equal(release.payload.authorization.branchRefUpdateAuthorized, true);
  assert.equal(release.payload.authorization.remoteActionAuthorized, false);
  assert.equal(release.payload.authorization.forceUpdateAuthorized, false);
  assert.equal(release.payload.authorization.automaticRetryAllowed, false);
  assert.equal(release.payload.authorization.automaticRollbackAllowed, false);
  assert.ok(Object.values(release.payload.currentState)
    .filter(value => typeof value === 'boolean').every(value => value === false || value === true));
  for (const [field, value] of Object.entries(release.payload.currentState)) {
    if (field === 'finalExecutionReleasePrepared') assert.equal(value, true);
    else assert.equal(value, false, field);
  }
  assert.ok(Object.values(release.payload.currentSideEffects).every(value => value === 0));
  assert.ok(Object.values(release.payload.nonClaims).every(value => value === false));
  assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), constants.EXPECTED_OLD);
  assert.equal(text(['status', '--porcelain'], fixture.target), '');
});

test('final release rejects candidate-controlled authorization window extensions', () => {
  const frozen = fixture.finalReleaseEvidence.decision;
  const rebuilt = fixture.frozenModule.buildFinalReleaseDecision({
    packetEvidence: fixture.packetEvidence,
    approvedAt: '2026-07-14T00:00:00+08:00',
    expiresAt: '2027-07-19T23:59:59+08:00'
  });
  assert.equal(rebuilt.payload.authorization.approvedAt, frozen.payload.authorization.approvedAt);
  assert.equal(rebuilt.payload.authorization.expiresAt, frozen.payload.authorization.expiresAt);

  for (const [field, value, observedAt] of [
    ['approvedAt', '2026-07-13T00:00:00+08:00', '2026-07-14T00:00:00+08:00'],
    ['expiresAt', '2027-07-19T23:59:59+08:00', '2027-01-01T00:00:00+08:00']
  ]) {
    const candidate = structuredClone(frozen);
    candidate.payload.authorization[field] = value;
    candidate.canonicalPayloadSha256 = sha256Canonical(candidate.payload);
    const evaluation = fixture.frozenModule.evaluateFinalReleaseDecision(candidate, {
      packetEvidence: fixture.packetEvidence,
      now: new Date(observedAt)
    });
    assert.equal(evaluation.accepted, false, field);
    assert.ok(evaluation.blockers.includes('finalRelease.exactContent'), field);
    assert.ok(evaluation.blockers.includes('finalRelease.authorizationWindowBinding'), field);
  }
});

test('unsafe Git environment and caller worktree surfaces fail before claim or Git effect', () => {
  initializeGovernanceRoot();
  const refBefore = text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo);
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY']) {
    const result = runCli({ env: { ...process.env, [key]: '/tmp/cm2126-forbidden' } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unsafe_git_environment/);
    assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), refBefore);
    assert.equal(fs.existsSync(fixture.claimPath), false);
  }
  assert.throws(() => cli.parseArgs([...cliArgv(), '--worktree', fixture.target]), /exact_three_commit/);
});

test('detached executor clean check reports untracked files even when Git config hides them', () => {
  initializeGovernanceRoot();
  const sentinel = path.join(fixture.repo, 'cm2126-untracked-evidence-sentinel');
  const refBefore = text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo);
  git(['config', 'status.showUntrackedFiles', 'no'], fixture.repo);
  fs.writeFileSync(sentinel, 'fixture only\n');
  try {
    const result = runCli();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /clean_detached_final_release_runtime_required/);
    assert.equal(fs.existsSync(fixture.claimPath), false);
    assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), refBefore);
  } finally {
    fs.rmSync(sentinel, { force: true });
    git(['config', '--unset', 'status.showUntrackedFiles'], fixture.repo);
  }
});

test('packet and final-release generators force untracked-file reporting', () => {
  const sentinel = path.join(fixture.repo, 'cm2126-hidden-generator-sentinel');
  git(['config', 'status.showUntrackedFiles', 'no'], fixture.repo);
  fs.writeFileSync(sentinel, 'fixture only\n');
  try {
    for (const script of [
      'scripts/generate-cm2126-exact-branch-cas-execution-packet.js',
      'scripts/generate-cm2127-exact-branch-cas-final-release.js'
    ]) {
      const result = spawnSync(process.execPath, [script], {
        cwd: fixture.repo,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      assert.notEqual(result.status, 0, script);
      assert.match(result.stderr, /cm212[67]_(packet|release)_clean_worktree_required/, script);
    }
  } finally {
    fs.rmSync(sentinel, { force: true });
    git(['config', '--unset', 'status.showUntrackedFiles'], fixture.repo);
  }
});

test('receipt-time final-release review remains bound to the validated claim time', () => {
  const claimedAt = fixture.now.toISOString();
  const reviewTime = fixture.frozenModule.claimBoundReviewTime({ claimedAt });
  assert.equal(reviewTime.toISOString(), claimedAt);
  const afterExpiry = new Date(fixture.finalReleaseEvidence.decision.payload.authorization.expiresAt);
  const expired = fixture.frozenModule.intakeFinalReleaseDecision({
    finalReleaseCommit: fixture.finalReleaseCommit,
    packetEvidence: fixture.packetEvidence,
    now: afterExpiry,
    ...fixture.gitResolvers
  });
  assert.equal(expired.accepted, false);
  const accepted = fixture.frozenModule.intakeFinalReleaseDecision({
    finalReleaseCommit: fixture.finalReleaseCommit,
    packetEvidence: fixture.packetEvidence,
    now: reviewTime,
    ...fixture.gitResolvers
  });
  assert.equal(accepted.accepted, true, accepted.blockers.join(','));
  assert.throws(
    () => fixture.frozenModule.claimBoundReviewTime({ claimedAt: 'invalid' }),
    /claimed_at_required_for_receipt_review/
  );
});

test('core executor rejects every fourth caller key or path before any effect', async () => {
  initializeGovernanceRoot();
  const refBefore = text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo);
  for (const [key, value] of [
    ['targetWorktreePath', fixture.target],
    ['worktree', fixture.target],
    ['targetRef', constants.TARGET_REF],
    ['registryRoot', fixture.governanceRoot],
    ['outputPath', '/tmp/cm2126-result.json'],
    ['callerResolver', true]
  ]) {
    await assert.rejects(
      fixture.frozenModule.executeBranchCasFromCommits({ ...exactArgs(), [key]: value }),
      /exact_three_commit_inputs_required/
    );
    assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), refBefore);
    assert.equal(fs.existsSync(fixture.claimPath), false);
  }
});

test('dirty target and ref drift fail before claim creation', () => {
  initializeGovernanceRoot();
  const originalStatus = fs.readFileSync(path.join(fixture.target, 'STATUS.md'));
  fs.writeFileSync(path.join(fixture.target, 'STATUS.md'), Buffer.concat([originalStatus, Buffer.from('\nfixture drift\n')]));
  let result = runCli();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /target_old_preflight_failed/);
  assert.equal(fs.existsSync(fixture.claimPath), false);
  assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), constants.EXPECTED_OLD);
  fs.writeFileSync(path.join(fixture.target, 'STATUS.md'), originalStatus);
  assert.equal(text(['status', '--porcelain'], fixture.target), '');

  const sentinel = path.join(fixture.target, 'cm2126-untracked-dirty-sentinel');
  fs.writeFileSync(sentinel, 'fixture only\n');
  result = runCli();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /target_old_preflight_failed/);
  assert.equal(fs.existsSync(fixture.claimPath), false);
  fs.rmSync(sentinel);

  git(['update-ref', constants.TARGET_REF, constants.NEW_COMMIT, constants.EXPECTED_OLD], fixture.repo);
  try {
    result = runCli();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /target_old_preflight_failed/);
    assert.equal(fs.existsSync(fixture.claimPath), false);
  } finally {
    git(['update-ref', constants.TARGET_REF, constants.EXPECTED_OLD, constants.NEW_COMMIT], fixture.repo);
  }
  assert.equal(text(['status', '--porcelain'], fixture.target), '');
});

test('target identity compares only the Git executable bit', () => {
  const sourcePath = 'STATUS.md';
  const absolute = path.join(fixture.target, sourcePath);
  const originalMode = fs.statSync(absolute).mode & 0o777;
  const target = fixture.frozenModule.deriveTargetWorktree(fixture.repo);
  const bindings = fixture.packetEvidence.packet.payload.exactCasBoundary.targetBindings;
  try {
    fs.chmodSync(absolute, 0o664);
    assert.equal(text(['status', '--porcelain'], fixture.target), '');
    assert.doesNotThrow(() => fixture.frozenModule.verifyTargetOldPreflight(
      fixture.repo,
      target,
      bindings
    ));

    fs.chmodSync(absolute, 0o775);
    assert.throws(
      () => fixture.frozenModule.verifyTargetOldPreflight(fixture.repo, target, bindings),
      /target_old_preflight_failed/
    );
  } finally {
    fs.chmodSync(absolute, originalMode);
  }
  assert.equal(text(['status', '--porcelain'], fixture.target), '');
});

test('assume-unchanged and skip-worktree index flags fail closed before claim', () => {
  initializeGovernanceRoot();
  for (const [setFlag, clearFlag] of [
    ['--assume-unchanged', '--no-assume-unchanged'],
    ['--skip-worktree', '--no-skip-worktree']
  ]) {
    git(['update-index', setFlag, '--', 'STATUS.md'], fixture.target);
    try {
      assert.doesNotMatch(text(['ls-files', '-v', '--', 'STATUS.md'], fixture.target), /^H /);
      const result = runCli();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /target_old_preflight_failed/);
      assert.equal(fs.existsSync(fixture.claimPath), false);
      assert.equal(
        text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo),
        constants.EXPECTED_OLD
      );
    } finally {
      git(['update-index', clearFlag, '--', 'STATUS.md'], fixture.target);
    }
    assert.match(text(['ls-files', '-v', '--', 'STATUS.md'], fixture.target), /^H /);
    assert.equal(text(['status', '--porcelain'], fixture.target), '');
  }

  const indexPath = text(['rev-parse', '--path-format=absolute', '--git-path', 'index'], fixture.target);
  const lockPath = `${indexPath}.lock`;
  fs.writeFileSync(lockPath, 'synthetic stale index lock\n', { flag: 'wx' });
  try {
    const result = runCli();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /target_old_preflight_failed/);
    assert.equal(fs.existsSync(fixture.claimPath), false);
    assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), constants.EXPECTED_OLD);
  } finally {
    fs.rmSync(lockPath);
  }

  fs.symlinkSync('missing-receipt-target', fixture.executionReceiptPath);
  try {
    const result = runCli();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /preclaim_execution_receipt_exists/);
    assert.equal(fs.existsSync(fixture.claimPath), false);
    assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), constants.EXPECTED_OLD);
  } finally {
    fs.unlinkSync(fixture.executionReceiptPath);
  }
});

test('split-index targets fail before claim without creating shared-index side effects', () => {
  initializeGovernanceRoot();
  const commonDir = path.resolve(fixture.target, text(['rev-parse', '--git-common-dir'], fixture.target));
  const sharedIndexes = () => fs.readdirSync(commonDir).filter(name => name.startsWith('sharedindex.')).sort();
  const refBefore = text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo);
  git(['config', 'extensions.worktreeConfig', 'true'], fixture.repo);
  try {
    const sharedBefore = sharedIndexes();
    git(['config', '--worktree', 'core.splitIndex', 'true'], fixture.target);
    let result = runCli();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /target_old_preflight_failed/);
    assert.equal(fs.existsSync(fixture.claimPath), false);
    assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), refBefore);
    assert.deepEqual(sharedIndexes(), sharedBefore);

    git(['config', '--worktree', 'core.splitIndex', 'false'], fixture.target);
    git(['-c', 'core.splitIndex=true', 'update-index', '--split-index'], fixture.target);
    assert.notEqual(
      text(['-c', 'core.splitIndex=true', 'rev-parse', '--shared-index-path'], fixture.target),
      ''
    );
    result = runCli();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /target_old_preflight_failed/);
    assert.equal(fs.existsSync(fixture.claimPath), false);
    assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), refBefore);
  } finally {
    git(['-c', 'core.splitIndex=true', 'update-index', '--no-split-index'], fixture.target);
    git(['config', '--worktree', '--unset-all', 'core.splitIndex'], fixture.target);
    git(['config', '--unset-all', 'extensions.worktreeConfig'], fixture.repo);
  }
  assert.equal(text(['status', '--porcelain'], fixture.target), '');
});

test('registry enforces exact transitions and reentry receipt is readonly', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2126-registry-contract-'));
  try {
    fs.writeFileSync(
      path.join(root, '.phase8-registry-root-identity.json'),
      JSON.stringify(canonicalize(fixture.frozenConstants.GOVERNANCE_ROOT_IDENTITY)),
      { flag: 'wx' }
    );
    const bindingHash = fixture.frozenModule.buildClaimBindingHash({
      packetEvidence: fixture.packetEvidence,
      finalReleaseEvidence: fixture.finalReleaseEvidence
    });
    const release = fixture.frozenModule.releaseBinding(
      fixture.packetEvidence,
      fixture.finalReleaseEvidence,
      bindingHash
    );
    const registry = new fixture.frozenRegistry.Cm2126ExactBranchCasClaimRegistry({ governanceRoot: root });
    const ordinaryClone = structuredClone(release);
    await assert.rejects(
      registry.claim(bindingHash, ordinaryClone, fixture.now),
      /machine_bound_final_release_required/
    );
    const forgedRelease = {
      ...release,
      machineBound: true,
      packetEvidence: {
        ...release.packetEvidence,
        accepted: true,
        packet: structuredClone(release.packetEvidence.packet)
      },
      finalReleaseEvidence: {
        ...release.finalReleaseEvidence,
        accepted: true,
        decision: structuredClone(release.finalReleaseEvidence.decision)
      }
    };
    await assert.rejects(
      registry.claim(bindingHash, forgedRelease, fixture.now),
      /machine_bound_final_release_required/
    );
    assert.equal(fs.existsSync(registry.claimPath), false);
    let claim = await registry.claim(bindingHash, release, fixture.now);
    assert.equal(claim.state, 'CLAIMED');
    assert.equal(claim.authorizationReplayAllowed, false);
    const raced = await fixture.frozenModule.claimWithDurableRaceReentry({
      registry: new fixture.frozenRegistry.Cm2126ExactBranchCasClaimRegistry({ governanceRoot: root }),
      bindingHash,
      release,
      observedAt: fixture.now
    });
    assert.equal(raced.claim, null);
    assert.equal(raced.existing.claimEnvelopePresent, true);
    assert.equal(raced.existing.state, 'CLAIMED');
    const postClaimFailure = await fixture.frozenModule.claimWithDurableRaceReentry({
      registry: {
        claim: async () => { throw new Error('synthetic_post_claim_fsync_failure'); },
        inspectExisting: async () => ({
          claimEnvelopePresent: true,
          state: 'CLAIMED',
          authorizationConsumed: true,
          replayAllowed: false,
          reconciliationRequired: true,
          claimEnvelopeBindingVerified: true,
          envelope: claim
        })
      },
      bindingHash,
      release,
      observedAt: fixture.now
    });
    assert.equal(postClaimFailure.claim, null);
    assert.equal(postClaimFailure.existing.claimEnvelopePresent, true);
    await assert.rejects(
      fixture.frozenModule.claimWithDurableRaceReentry({
        registry: {
          claim: async () => { throw new Error('synthetic_pre_claim_failure'); },
          inspectExisting: async () => ({
            claimEnvelopePresent: false,
            authorizationConsumed: false,
            replayAllowed: false
          })
        },
        bindingHash,
        release,
        observedAt: fixture.now
      }),
      /synthetic_pre_claim_failure/
    );
    await assert.rejects(
      registry.transition(bindingHash, 'CLAIMED', 'BRANCH_REF_CAS_CONSUMED', {
        branchCasInvocationCount: null,
        branchRefCasAttempts: 1,
        branchRefUpdates: null
      }),
      /machine_bound_final_release_required/
    );
    const impossibleFailure = {
      ...claim,
      state: 'CONSUMED_FAILED_PRE_CAS',
      targetIndexSyncAttempts: 1,
      targetFileSyncAttempts: 1,
      targetFileWriteSlotsConsumed: 9,
      verificationAttempts: 1,
      executionReceiptWriteAttempts: 1,
      terminalStateDurablyRecorded: true,
      reconciliationRequired: true
    };
    assert.throws(
      () => registry.validateEnvelope(impossibleFailure, bindingHash, release),
      /claim_state_effect_mismatch/
    );
    await assert.rejects(
      registry.transition(bindingHash, 'CLAIMED', 'TARGET_INDEX_SYNCHRONIZED', {}, release),
      /transition_invalid/
    );
    claim = await registry.transition(bindingHash, 'CLAIMED', 'BRANCH_REF_CAS_CONSUMED', {
      branchCasInvocationCount: null,
      branchRefCasAttempts: 1,
      branchRefUpdates: null
    }, release);
    claim = await registry.transition(bindingHash, claim.state, 'CONSUMED_FAILED_PRE_CAS', {
      branchCasInvocationCount: 0,
      branchRefUpdates: 0,
      targetRefObserved: constants.EXPECTED_OLD
    }, release);
    assert.equal(claim.state, 'CONSUMED_FAILED_PRE_CAS');
    assert.equal(claim.terminalStateDurablyRecorded, true);
    assert.equal(claim.reconciliationRequired, true);
    const existing = await registry.inspectExisting(bindingHash, release);
    const runtimeObservation = {
      targetRefAfter: constants.EXPECTED_OLD,
      targetHeadAfter: constants.EXPECTED_OLD,
      targetIndexTreeAfter: constants.EXPECTED_OLD_TREE,
      afterBlobMatches: 9,
      targetWorktreeCleanAfter: true
    };
    const receipt = fixture.frozenReceipt.buildReentryReceipt({
      existing,
      bindingHash,
      runtimeObservation,
      packetEvidence: fixture.packetEvidence,
      finalReleaseEvidence: fixture.finalReleaseEvidence
    });
    const evaluation = fixture.frozenReceipt.evaluateReentryReceipt(receipt, {
      existing,
      bindingHash,
      runtimeObservation,
      packetEvidence: fixture.packetEvidence,
      finalReleaseEvidence: fixture.finalReleaseEvidence
    });
    assert.equal(evaluation.accepted, true, evaluation.blockers.join(','));
    assert.equal(receipt.payload.authorizationConsumed, true);
    assert.equal(receipt.payload.authorizationReplayAllowed, false);
    assert.equal(receipt.payload.branchCasCallsThisReentry, 0);
    assert.equal(receipt.payload.targetIndexSyncCallsThisReentry, 0);
    assert.equal(receipt.payload.targetFileWritesThisReentry, 0);
    assert.equal(receipt.payload.currentBranchStatusSynchronized, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('registry removes its verified transition temp after a pre-rename write failure', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2126-transition-temp-'));
  try {
    fs.writeFileSync(
      path.join(root, '.phase8-registry-root-identity.json'),
      JSON.stringify(canonicalize(fixture.frozenConstants.GOVERNANCE_ROOT_IDENTITY)),
      { flag: 'wx' }
    );
    const bindingHash = fixture.frozenModule.buildClaimBindingHash({
      packetEvidence: fixture.packetEvidence,
      finalReleaseEvidence: fixture.finalReleaseEvidence
    });
    const release = fixture.frozenModule.releaseBinding(
      fixture.packetEvidence,
      fixture.finalReleaseEvidence,
      bindingHash
    );
    const registry = new fixture.frozenRegistry.Cm2126ExactBranchCasClaimRegistry({ governanceRoot: root });
    await registry.claim(bindingHash, release, fixture.now);
    const transitionState = 'BRANCH_REF_CAS_CONSUMED';
    const temporaryPath = path.join(root, `${fixture.frozenRegistry.claimFileName()}.${transitionState}.tmp`);
    const faultingFileSystem = {
      ...fsPromises,
      open: async (entryPath, ...args) => {
        const handle = await fsPromises.open(entryPath, ...args);
        if (!String(entryPath).endsWith(`.${transitionState}.tmp`)) return handle;
        return {
          fd: handle.fd,
          stat: handle.stat.bind(handle),
          writeFile: async () => { throw new Error('synthetic_transition_write_failure'); },
          sync: handle.sync.bind(handle),
          close: handle.close.bind(handle)
        };
      }
    };
    const faultingRegistry = new fixture.frozenRegistry.Cm2126ExactBranchCasClaimRegistry({
      governanceRoot: root,
      fsApi: faultingFileSystem
    });
    const details = { branchCasInvocationCount: null, branchRefCasAttempts: 1, branchRefUpdates: null };
    await assert.rejects(
      faultingRegistry.transition(bindingHash, 'CLAIMED', transitionState, details, release),
      /synthetic_transition_write_failure/
    );
    assert.equal(fs.existsSync(temporaryPath), false);
    const transitioned = await registry.transition(bindingHash, 'CLAIMED', transitionState, details, release);
    assert.equal(transitioned.state, transitionState);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('claim registry rejects descriptor identity swaps before reading envelope bytes', async () => {
  const pathStat = {
    dev: 10,
    ino: 20,
    isFile: () => true,
    isSymbolicLink: () => false
  };
  let readCalls = 0;
  let closeCalls = 0;
  const registry = new fixture.frozenRegistry.Cm2126ExactBranchCasClaimRegistry({
    governanceRoot: '/fixed/governance-root',
    fsApi: {
      lstat: async () => pathStat,
      open: async () => ({
        stat: async () => ({ ...pathStat, ino: 21, isFile: () => true }),
        readFile: async () => { readCalls += 1; return Buffer.from('{}'); },
        close: async () => { closeCalls += 1; }
      })
    }
  });

  await assert.rejects(
    registry.readVerifiedFile('/fixed/governance-root/claim.json', 'cm2126_claim_invalid'),
    /cm2126_claim_invalid/
  );
  assert.equal(readCalls, 0);
  assert.equal(closeCalls, 1);
});

test('claim create, read, and transition stay pinned to one verified governance descriptor', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'src/core/Cm2126ExactBranchCasClaimRegistry.js'),
    'utf8'
  );
  assert.match(source, /O_DIRECTORY \| fs\.constants\.O_NOFOLLOW/);
  assert.match(source, /`\/proc\/self\/fd\/\$\{rootHandle\.fd\}\/\$\{filename\}`/);
  assert.match(source, /governanceDescriptorPath\(rootHandle, claimFileName\(\)\)/);
  assert.match(source, /governanceDescriptorPath\(rootHandle, temporaryName\)/);
  assert.match(source, /cm2126_governance_root_instance_replaced/);
  assert.match(source, /registry\.rootIdentity = Object\.freeze/);
  assert.doesNotMatch(source, /this\.fs\.writeFile\(this\.claimPath/);
  assert.doesNotMatch(source, /this\.fs\.rename\(temporary, this\.claimPath/);
});

test('one registry instance rejects a replaced governance root even with copied public identity bytes', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2126-governance-root-swap-'));
  const root = path.join(parent, 'registry');
  const displaced = path.join(parent, 'displaced');
  const identity = JSON.stringify(canonicalize(fixture.frozenConstants.GOVERNANCE_ROOT_IDENTITY));
  try {
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, '.phase8-registry-root-identity.json'), identity);
    const registry = new fixture.frozenRegistry.Cm2126ExactBranchCasClaimRegistry({ governanceRoot: root });
    const first = await registry.inspectExisting('0'.repeat(64), null);
    assert.equal(first.claimEnvelopePresent, false);
    fs.renameSync(root, displaced);
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, '.phase8-registry-root-identity.json'), identity);
    await assert.rejects(
      registry.inspectExisting('0'.repeat(64), null),
      /cm2126_governance_root_instance_replaced/
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('isolated fault injection preserves exact terminal counters and forbids replay', () => {
  runIsolatedFault('branch_cas_acknowledgement_lost', ({ claim }) => {
    assert.equal(claim.state, 'CONSUMED_AMBIGUOUS_CAS');
    assert.equal(claim.branchCasInvocationCount, 1);
    assert.equal(claim.branchRefUpdates, null);
    assert.equal(claim.targetIndexSynchronizations, 0);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.equal(claim.executionReceiptWrites, 0);
    assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), constants.NEW_COMMIT);
  });

  runIsolatedFault('branch_ref_postcheck_failure', ({ claim }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_AMBIGUOUS');
    assert.equal(claim.branchCasInvocationCount, 1);
    assert.equal(claim.branchRefUpdates, 1);
    assert.equal(claim.targetRefObserved, constants.NEW_COMMIT);
    assert.equal(claim.targetIndexTreeObserved, constants.EXPECTED_OLD_TREE);
    assert.equal(claim.targetFilesMatchedCount, 0);
    assert.equal(claim.targetIndexSynchronizations, 0);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.equal(claim.executionReceiptWrites, 0);
  });

  runIsolatedFault('index_preclaim_external_sync_failure', ({ claim }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL');
    assert.equal(claim.branchRefUpdates, 1);
    assert.equal(claim.targetIndexSyncAttempts, 0);
    assert.equal(claim.targetIndexSynchronizations, 0);
    assert.equal(claim.targetIndexTreeObserved, constants.NEW_TREE);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.equal(claim.executionReceiptWrites, 0);
  });

  runIsolatedFault('index_pre_rename_failure', ({ claim, output }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL');
    assert.equal(claim.branchRefUpdates, 1);
    assert.equal(claim.targetIndexSyncAttempts, 1);
    assert.equal(claim.targetIndexSynchronizations, 0);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.equal(claim.executionReceiptWrites, 0);
    assert.equal(output.reconciliationReceipt.payload.targetIndexLockAbsent, true);
  });

  runIsolatedFault('index_rename_rejected', ({ claim, output }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL');
    assert.equal(claim.branchRefUpdates, 1);
    assert.equal(claim.targetIndexSyncAttempts, 1);
    assert.equal(claim.targetIndexSynchronizations, 0);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.equal(output.reconciliationReceipt.payload.targetIndexLockAbsent, true);
  });

  runIsolatedFault('index_rename_acknowledgement_lost', ({ claim }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL');
    assert.equal(claim.branchRefUpdates, 1);
    assert.equal(claim.targetIndexSynchronizations, 1);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.equal(claim.executionReceiptWrites, 0);
  });

  runIsolatedFault('index_lock_before_first_file_sync', ({ claim, output }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL');
    assert.equal(claim.targetIndexSynchronizations, 1);
    assert.equal(claim.targetFileSyncAttempts, 1);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.equal(claim.targetFilesMatchedCount, 0);
    assert.equal(claim.executionReceiptWrites, 0);
    assert.equal(output.reconciliationReceipt.payload.targetIndexLockAbsent, false);
  });

  runIsolatedFault('file_pre_rename_failure', ({ claim }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL');
    assert.equal(claim.targetIndexSynchronizations, 1);
    assert.equal(claim.targetFileSyncAttempts, 1);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.doesNotMatch(
      text(['status', '--porcelain', '--untracked-files=all'], fixture.target),
      /\.cm2126-.*\.sync\.tmp/
    );
  });

  runIsolatedFault('file_rename_rejected', ({ claim }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL');
    assert.equal(claim.targetIndexSynchronizations, 1);
    assert.equal(claim.targetFileSyncAttempts, 1);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.doesNotMatch(
      text(['status', '--porcelain', '--untracked-files=all'], fixture.target),
      /\.cm2126-.*\.sync\.tmp/
    );
  });

  runIsolatedFault('file_rename_acknowledgement_lost', ({ claim }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL');
    assert.equal(claim.targetIndexSynchronizations, 1);
    assert.equal(claim.targetFileSyncAttempts, 1);
    assert.equal(claim.targetFileSynchronizations, null);
    assert.equal(claim.targetFilesMatchedCount, 1);
    assert.equal(claim.executionReceiptWrites, 0);
  });

  runIsolatedFault('receipt_write_acknowledgement_lost', ({ claim }) => {
    assert.equal(claim.state, 'CONSUMED_EXECUTION_RECEIPT_AMBIGUOUS');
    assert.equal(claim.branchRefUpdates, 1);
    assert.equal(claim.targetIndexSynchronizations, 1);
    assert.equal(claim.targetFileSynchronizations, 9);
    assert.equal(claim.executionReceiptWriteAttempts, 1);
    assert.equal(claim.executionReceiptWrites, 1);
    assert.match(claim.executionReceiptSha256, /^[a-f0-9]{64}$/);
    assert.equal(fs.existsSync(fixture.executionReceiptPath), true);
  });

  runIsolatedFault('transition_after_rename:TARGET_INDEX_SYNCHRONIZED', ({ claim }) => {
    assert.equal(claim.state, 'CONSUMED_REF_UPDATED_WORKTREE_SYNC_PARTIAL');
    assert.equal(claim.branchRefUpdates, 1);
    assert.equal(claim.targetIndexSyncAttempts, 1);
    assert.equal(claim.targetIndexSynchronizations, 1);
    assert.equal(claim.targetFileSynchronizations, 0);
    assert.equal(claim.executionReceiptWrites, 0);
  });
});

test('temp clone performs one exact CAS plus linked-target index and nine-file synchronization', () => {
  initializeGovernanceRoot();
  const branchBefore = text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo);
  const evidenceHeadBefore = text(['rev-parse', 'HEAD^{commit}'], fixture.repo);
  const objectsBefore = text(['count-objects', '-v'], fixture.repo);
  const remoteRefsBefore = refsSnapshot(fixture.repo);
  git(['config', 'core.sharedRepository', 'group'], fixture.repo);
  const targetBindings = fixture.frozenModule.buildTargetBindings(fixture.gitResolvers);
  const expectedModes = new Map();
  let preservedNonOwnerExecuteMode = false;
  for (const binding of targetBindings) {
    const mode = binding.before.gitMode === '100755'
      ? 0o775
      : preservedNonOwnerExecuteMode ? 0o664 : 0o654;
    if (mode === 0o654) preservedNonOwnerExecuteMode = true;
    fs.chmodSync(path.join(fixture.target, binding.sourcePath), mode);
    expectedModes.set(binding.sourcePath, mode);
  }
  const targetIndexPath = text(
    ['rev-parse', '--path-format=absolute', '--git-path', 'index'],
    fixture.target
  );
  fs.chmodSync(targetIndexPath, 0o664);
  const result = runTwiceInOneProcess();
  assert.equal(result.status, 0, result.stderr);
  const { first, second } = JSON.parse(result.stdout);
  assert.equal(first.accepted, true);
  assert.equal(first.state, fixture.frozenRegistry.SUCCESS_STATE);
  assert.equal(first.authorizationConsumed, true);
  assert.equal(first.authorizationReplayAllowed, false);
  assert.equal(first.branchRefUpdated, true);
  assert.equal(first.targetWorktreeIndexSynchronized, true);
  assert.equal(first.targetWorktreeFilesSynchronized, true);
  assert.equal(first.executionReceiptCreated, true);
  assert.equal(first.statusSyncPerformed, true);
  assert.equal(first.currentBranchStatusSynchronized, true);
  assert.equal(first.readinessClaimed, false);

  assert.equal(second.accepted, false);
  assert.equal(second.authorizationConsumed, true);
  assert.equal(second.authorizationReplayAllowed, false);
  assert.equal(second.branchRefUpdated, true);
  assert.equal(second.targetWorktreeIndexSynchronized, true);
  assert.equal(second.targetWorktreeFilesSynchronized, true);
  assert.equal(second.executionReceiptCreated, true);
  assert.equal(second.statusSyncPerformed, true);
  assert.equal(second.currentBranchStatusSynchronized, true);
  assert.equal(second.fullPlanPackCompleted, true);
  assert.equal(second.reconciliationReceipt.payload.branchCasCallsThisReentry, 0);
  assert.equal(second.reconciliationReceipt.payload.targetIndexSyncCallsThisReentry, 0);
  assert.equal(second.reconciliationReceipt.payload.targetFileWritesThisReentry, 0);
  assert.equal(second.reconciliationReceipt.payload.executionReceiptWritesThisReentry, 0);

  assert.equal(branchBefore, constants.EXPECTED_OLD);
  assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), constants.NEW_COMMIT);
  assert.equal(text(['symbolic-ref', '-q', 'HEAD'], fixture.target), constants.TARGET_REF);
  assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.target), constants.NEW_COMMIT);
  assert.equal(text(['status', '--porcelain', '--untracked-files=all'], fixture.target), '');
  assert.doesNotThrow(() => git(['diff', '--cached', '--quiet', constants.NEW_COMMIT, '--'], fixture.target));
  assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.repo), evidenceHeadBefore);
  assert.equal(text(['status', '--porcelain'], fixture.repo), '');
  assert.equal(text(['count-objects', '-v'], fixture.repo), objectsBefore);
  assert.equal(refsSnapshot(fixture.repo), remoteRefsBefore);

  assert.equal(targetBindings.length, 9);
  for (const binding of targetBindings) {
    const targetFile = path.join(fixture.target, binding.sourcePath);
    const bytes = fs.readFileSync(targetFile);
    assert.equal(bytes.length, binding.after.bytes, binding.sourcePath);
    assert.equal(sha256(bytes), binding.after.sha256, binding.sourcePath);
    assert.equal(fs.statSync(targetFile).mode & 0o777, expectedModes.get(binding.sourcePath), binding.sourcePath);
  }
  assert.equal(fs.statSync(targetIndexPath).mode & 0o777, 0o664);
  assert.deepEqual(
    fixture.gitResolvers.resolveDiffEntries(constants.EXPECTED_OLD, constants.NEW_COMMIT),
    fixture.frozenConstants.STATUS_ENTRIES
  );
});

test('terminal claim and execution receipt bind the exact successful runtime', () => {
  const claim = JSON.parse(fs.readFileSync(fixture.claimPath, 'utf8'));
  assert.equal(claim.state, fixture.frozenRegistry.SUCCESS_STATE);
  assert.equal(claim.authorizationUseCount, 1);
  assert.equal(claim.authorizationReplayAllowed, false);
  assert.equal(claim.branchCasInvocationCount, 1);
  assert.equal(claim.branchRefCasAttempts, 1);
  assert.equal(claim.branchRefUpdates, 1);
  assert.equal(claim.targetIndexSynchronizations, 1);
  assert.equal(claim.targetFileSynchronizations, 9);
  assert.equal(claim.executionReceiptWrites, 1);
  assert.equal(claim.reconciliationRequired, false);

  const receipt = JSON.parse(fs.readFileSync(fixture.executionReceiptPath, 'utf8'));
  const runtimeResult = {
    targetWorktreeIdentitySha256: receipt.payload.exactTarget.targetWorktreeIdentitySha256,
    ...receipt.payload.executionResult
  };
  const preReceiptClaim = {
    ...claim,
    state: 'EXECUTION_RECEIPT_WRITE_CONSUMED',
    executionReceiptWrites: null,
    executionReceiptSha256: null,
    terminalStateDurablyRecorded: false,
    reconciliationRequired: true
  };
  const bindingHash = fixture.frozenModule.buildClaimBindingHash({
    packetEvidence: fixture.packetEvidence,
    finalReleaseEvidence: fixture.finalReleaseEvidence
  });
  const evaluation = fixture.frozenReceipt.evaluateExecutionReceipt(receipt, {
    packetEvidence: fixture.packetEvidence,
    finalReleaseEvidence: fixture.finalReleaseEvidence,
    claimEnvelope: preReceiptClaim,
    bindingHash,
    runtimeResult
  });
  assert.equal(evaluation.accepted, true, evaluation.blockers.join(','));
  assert.equal(receipt.payload.executionResult.branchRefUpdates, 1);
  assert.equal(receipt.payload.executionResult.targetIndexSynchronizations, 1);
  assert.equal(receipt.payload.executionResult.targetFileSynchronizations, 9);
  assert.equal(receipt.payload.executionResult.otherRefUpdates, 0);
  assert.equal(receipt.payload.currentBranchOutcome.currentBranchStatusSynchronized, true);
  assert.ok(Object.values(receipt.payload.currentBranchOutcome.readiness).every(value => value === false));
  assert.ok(Object.values(receipt.payload.prohibitedSideEffects).every(value => value === 0));

  const changed = structuredClone(receipt);
  changed.payload.executionResult.targetFileSynchronizations = 8;
  changed.canonicalPayloadSha256 = sha256Canonical(changed.payload);
  assert.equal(fixture.frozenReceipt.evaluateExecutionReceipt(changed, {
    packetEvidence: fixture.packetEvidence,
    finalReleaseEvidence: fixture.finalReleaseEvidence,
    claimEnvelope: preReceiptClaim,
    bindingHash,
    runtimeResult
  }).accepted, false);

  const durable = evaluateDurableInFixture();
  assert.equal(durable.accepted, true, durable.blockers.join(','));
  assert.equal(durable.branchRefUpdated, true);
  assert.equal(durable.currentBranchStatusSynchronized, true);
  assert.equal(durable.readinessClaimed, false);
});

test('governance receipt reads use no-follow descriptors and reject path identity swaps', async () => {
  const expected = Buffer.from('{"accepted":true}\n');
  const pathStat = {
    dev: 1,
    ino: 2,
    isFile: () => true,
    isSymbolicLink: () => false
  };
  let openedFlags = null;
  let readCalls = 0;
  let closeCalls = 0;
  const acceptedFileSystem = {
    lstat: async () => pathStat,
    open: async (_entryPath, flags) => {
      openedFlags = flags;
      return {
        stat: async () => ({ ...pathStat, isFile: () => true }),
        readFile: async () => { readCalls += 1; return expected; },
        close: async () => { closeCalls += 1; }
      };
    }
  };
  const observed = await implementation.readVerifiedGovernanceFile('/fixed/receipt', acceptedFileSystem);
  assert.ok(observed.equals(expected));
  assert.equal(openedFlags & fs.constants.O_RDONLY, fs.constants.O_RDONLY);
  if (fs.constants.O_NOFOLLOW !== undefined) {
    assert.equal(openedFlags & fs.constants.O_NOFOLLOW, fs.constants.O_NOFOLLOW);
  }
  assert.equal(readCalls, 1);
  assert.equal(closeCalls, 1);

  const swappedFileSystem = {
    lstat: async () => pathStat,
    open: async () => ({
      stat: async () => ({ ...pathStat, ino: 3, isFile: () => true }),
      readFile: async () => { throw new Error('must_not_read_swapped_descriptor'); },
      close: async () => { closeCalls += 1; }
    })
  };
  await assert.rejects(
    implementation.readVerifiedGovernanceFile('/fixed/receipt', swappedFileSystem),
    /cm2126_execution_receipt_invalid/
  );
});

test('execution receipt writes and runtime reads share the registry-pinned governance descriptor', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/core/Cm2126ExactBranchCasExecution.js'), 'utf8');
  const writeStart = source.indexOf('async function writeExternalReceipt');
  const readStart = source.indexOf('async function readExternalReceipt');
  const writeSource = source.slice(writeStart, source.indexOf('\nasync function readVerifiedGovernanceFile', writeStart));
  const readSource = source.slice(readStart, source.indexOf('\nfunction successfulRuntimeResult', readStart));
  assert.match(writeSource, /registry\.openVerifiedRootHandle\(\)/);
  assert.match(writeSource, /governanceDescriptorPath\(rootHandle, EXECUTION_RECEIPT_FILENAME\)/);
  assert.match(writeSource, /rootHandle\.sync\(\)/);
  assert.doesNotMatch(writeSource, /path\.join\(root/);
  assert.match(readSource, /registry\.openVerifiedRootHandle\(\)/);
  assert.match(readSource, /governanceDescriptorPath\(rootHandle, EXECUTION_RECEIPT_FILENAME\)/);
  assert.doesNotMatch(readSource, /path\.join\(root/);
});

test('SUCCESS claim with a missing or corrupt external receipt reenters fail closed with zero effect', () => {
  const originalReceipt = fs.readFileSync(fixture.executionReceiptPath);
  const receiptMode = fs.statSync(fixture.executionReceiptPath).mode & 0o777;
  const before = {
    ref: text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo),
    evidenceHead: text(['rev-parse', 'HEAD^{commit}'], fixture.repo),
    evidenceStatus: text(['status', '--porcelain'], fixture.repo),
    targetStatus: text(['status', '--porcelain', '--untracked-files=all'], fixture.target),
    objects: text(['count-objects', '-v'], fixture.repo),
    remoteRefs: refsSnapshot(fixture.repo),
    claim: fs.readFileSync(fixture.claimPath)
  };

  function assertFailClosedReplay(result) {
    assert.equal(result.status, 'STOPPED');
    assert.equal(result.authorizationConsumed, true);
    assert.equal(result.authorizationReplayAllowed, false);
    assert.equal(result.branchRefUpdated, false);
    assert.equal(result.targetWorktreeIndexSynchronized, false);
    assert.equal(result.targetWorktreeFilesSynchronized, false);
    assert.equal(result.executionReceiptCreated, false);
    assert.equal(result.statusSyncPerformed, false);
    assert.equal(result.currentBranchStatusSynchronized, false);
    assert.equal(result.reconciliationReceipt.payload.reconciliationRequired, true);
    assert.equal(result.reconciliationReceipt.payload.successReceiptAccepted, false);
    assert.equal(result.reconciliationReceipt.payload.branchRefUpdated, false);
    assert.equal(result.reconciliationReceipt.payload.currentBranchStatusSynchronized, false);
    assert.equal(result.reconciliationReceipt.payload.branchCasCallsThisReentry, 0);
    assert.equal(result.reconciliationReceipt.payload.targetIndexSyncCallsThisReentry, 0);
    assert.equal(result.reconciliationReceipt.payload.targetFileWritesThisReentry, 0);
    assert.equal(result.reconciliationReceipt.payload.executionReceiptWritesThisReentry, 0);
    assert.equal(result.remoteActions, 0);
    assert.equal(result.readinessClaimed, false);
  }

  function assertNoRuntimeEffect() {
    assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), before.ref);
    assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.repo), before.evidenceHead);
    assert.equal(text(['status', '--porcelain'], fixture.repo), before.evidenceStatus);
    assert.equal(text(['status', '--porcelain', '--untracked-files=all'], fixture.target), before.targetStatus);
    assert.equal(text(['count-objects', '-v'], fixture.repo), before.objects);
    assert.equal(refsSnapshot(fixture.repo), before.remoteRefs);
    assert.ok(fs.readFileSync(fixture.claimPath).equals(before.claim));
  }

  fs.rmSync(fixture.executionReceiptPath);
  try {
    const missing = runCli();
    assert.equal(missing.status, 0, missing.stderr);
    assertFailClosedReplay(JSON.parse(missing.stdout));
    assert.equal(fs.existsSync(fixture.executionReceiptPath), false);
    assertNoRuntimeEffect();
  } finally {
    if (!fs.existsSync(fixture.executionReceiptPath)) {
      fs.writeFileSync(fixture.executionReceiptPath, originalReceipt, { flag: 'wx', mode: receiptMode });
    }
  }
  assert.ok(fs.readFileSync(fixture.executionReceiptPath).equals(originalReceipt));

  const corruptReceipt = Buffer.from('{"corrupt":true}\n');
  fs.writeFileSync(fixture.executionReceiptPath, corruptReceipt);
  try {
    const corrupt = runCli();
    assert.equal(corrupt.status, 0, corrupt.stderr);
    assertFailClosedReplay(JSON.parse(corrupt.stdout));
    assert.ok(fs.readFileSync(fixture.executionReceiptPath).equals(corruptReceipt));
    assertNoRuntimeEffect();
  } finally {
    fs.writeFileSync(fixture.executionReceiptPath, originalReceipt);
    fs.chmodSync(fixture.executionReceiptPath, receiptMode);
  }
  assert.ok(fs.readFileSync(fixture.executionReceiptPath).equals(originalReceipt));
});

test('SUCCESS reentry requires the exact symbolic branch and full index policy', () => {
  const claimBefore = fs.readFileSync(fixture.claimPath);
  const receiptBefore = fs.readFileSync(fixture.executionReceiptPath);

  git(['checkout', '--quiet', '--detach', constants.NEW_COMMIT], fixture.target);
  try {
    const detached = runCli();
    assert.notEqual(detached.status, 0);
    assert.match(detached.stderr, /exact_single_target_worktree_required|target_worktree_identity_drift/);
  } finally {
    git(['symbolic-ref', 'HEAD', constants.TARGET_REF], fixture.target);
  }
  assert.equal(text(['symbolic-ref', '-q', 'HEAD'], fixture.target), constants.TARGET_REF);
  assert.equal(text(['status', '--porcelain', '--untracked-files=all'], fixture.target), '');

  git(['update-index', '--assume-unchanged', '--', 'STATUS.md'], fixture.target);
  try {
    const flagged = runCli();
    assert.equal(flagged.status, 0, flagged.stderr);
    const result = JSON.parse(flagged.stdout);
    assert.equal(result.status, 'STOPPED');
    assert.equal(result.currentBranchStatusSynchronized, false);
    assert.equal(result.reconciliationReceipt.payload.targetIndexPolicyMatched, false);
    assert.equal(result.reconciliationReceipt.payload.currentBranchStatusSynchronized, false);
    assert.equal(result.reconciliationReceipt.payload.reconciliationRequired, true);
  } finally {
    git(['update-index', '--no-assume-unchanged', '--', 'STATUS.md'], fixture.target);
  }

  const indexPath = text(['rev-parse', '--path-format=absolute', '--git-path', 'index'], fixture.target);
  const lockPath = `${indexPath}.lock`;
  fs.writeFileSync(lockPath, 'synthetic concurrent index writer\n', { flag: 'wx' });
  try {
    const locked = runCli();
    assert.equal(locked.status, 0, locked.stderr);
    const result = JSON.parse(locked.stdout);
    assert.equal(result.status, 'STOPPED');
    assert.equal(result.currentBranchStatusSynchronized, false);
    assert.equal(result.reconciliationReceipt.payload.targetIndexLockAbsent, false);
    assert.equal(result.reconciliationReceipt.payload.reconciliationRequired, true);
  } finally {
    fs.rmSync(lockPath);
  }
  assert.ok(fs.readFileSync(fixture.claimPath).equals(claimBefore));
  assert.ok(fs.readFileSync(fixture.executionReceiptPath).equals(receiptBefore));
  assert.equal(text(['status', '--porcelain', '--untracked-files=all'], fixture.target), '');
});

test('a new process replay is readonly and performs zero additional effect', () => {
  const before = {
    ref: text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo),
    evidenceHead: text(['rev-parse', 'HEAD^{commit}'], fixture.repo),
    evidenceStatus: text(['status', '--porcelain'], fixture.repo),
    targetStatus: text(['status', '--porcelain', '--untracked-files=all'], fixture.target),
    objects: text(['count-objects', '-v'], fixture.repo),
    remoteRefs: refsSnapshot(fixture.repo),
    claim: fs.readFileSync(fixture.claimPath),
    receipt: fs.readFileSync(fixture.executionReceiptPath)
  };
  const replay = runCli();
  assert.equal(replay.status, 0, replay.stderr);
  const result = JSON.parse(replay.stdout);
  assert.equal(result.status, 'STOPPED');
  assert.equal(result.authorizationConsumed, true);
  assert.equal(result.authorizationReplayAllowed, false);
  assert.equal(result.branchRefUpdated, true);
  assert.equal(result.targetWorktreeIndexSynchronized, true);
  assert.equal(result.targetWorktreeFilesSynchronized, true);
  assert.equal(result.executionReceiptCreated, true);
  assert.equal(result.statusSyncPerformed, true);
  assert.equal(result.currentBranchStatusSynchronized, true);
  assert.equal(result.fullPlanPackCompleted, true);
  assert.equal(result.reconciliationReceipt.payload.reconciliationRequired, false);
  assert.equal(result.reconciliationReceipt.payload.successReceiptAccepted, true);
  assert.equal(result.reconciliationReceipt.payload.branchCasCallsThisReentry, 0);
  assert.equal(result.reconciliationReceipt.payload.targetIndexSyncCallsThisReentry, 0);
  assert.equal(result.reconciliationReceipt.payload.targetFileWritesThisReentry, 0);
  assert.equal(result.reconciliationReceipt.payload.executionReceiptWritesThisReentry, 0);
  assert.equal(result.readinessClaimed, false);
  assert.equal(result.remoteActions, 0);

  assert.equal(text(['show-ref', '--hash', '--verify', constants.TARGET_REF], fixture.repo), before.ref);
  assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.repo), before.evidenceHead);
  assert.equal(text(['status', '--porcelain'], fixture.repo), before.evidenceStatus);
  assert.equal(text(['status', '--porcelain', '--untracked-files=all'], fixture.target), before.targetStatus);
  assert.equal(text(['count-objects', '-v'], fixture.repo), before.objects);
  assert.equal(refsSnapshot(fixture.repo), before.remoteRefs);
  assert.ok(fs.readFileSync(fixture.claimPath).equals(before.claim));
  assert.ok(fs.readFileSync(fixture.executionReceiptPath).equals(before.receipt));
});
