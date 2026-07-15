'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawn, spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const implementation = require('../src/core/Cm2122FullPlanStatusSyncExecution');
const { resolverOptions: realResolverOptions } = require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const { parseArgs } = require('../src/cli/cm2122-full-plan-status-sync');
const packetGenerator = require('../scripts/generate-cm2122-full-plan-status-sync-execution-packet');
const releaseGenerator = require('../scripts/generate-cm2123-full-plan-status-sync-final-release');
const { canonicalize, sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const FIXED_DATE_PRELOAD = path.join(ROOT, 'tests/helpers/fixed-date-preload.js');
// The frozen executor performs a large number of Git-object checks. A focused
// run completes in roughly one minute, while the default suite runs many test
// files concurrently and can take materially longer. Keep a hard ceiling so a
// stalled child cannot pin the suite, with enough headroom for loaded CI hosts.
const EXECUTOR_CHILD_TIMEOUT_MS = 180_000;

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

test('CM-2122 packet consumes the exact CM-2121 one-shot registry authority', () => {
  const contentEvidence = fixture.frozenModule.intakeContentDecision(fixture.gitResolvers);
  assert.equal(contentEvidence.accepted, true, contentEvidence.blockers.join(','));
  const authorized = contentEvidence.decision.payload.authorizationContent;
  const packetRegistry = fixture.packetEvidence.packet.payload.oneShotRegistry;
  assert.deepEqual({
    registryReference: packetRegistry.registryReference,
    nonce: packetRegistry.nonce,
    receiptId: packetRegistry.receiptId
  }, {
    registryReference: authorized.registryReference,
    nonce: authorized.nonce,
    receiptId: authorized.receiptId
  });

  const drifted = JSON.parse(JSON.stringify(fixture.packetEvidence.packet));
  drifted.payload.oneShotRegistry.registryReference = 'cm2122-r2-full-plan-status-sync-registry-001';
  drifted.payload.oneShotRegistry.nonce = 'cm2122-r2-full-plan-status-sync-001';
  drifted.payload.oneShotRegistry.receiptId = 'cm2122-r2-full-plan-status-sync-receipt-001';
  drifted.canonicalPayloadSha256 = sha256Canonical(drifted.payload);
  const evaluation = fixture.frozenModule.evaluateExecutionPacket(drifted, fixture.gitResolvers);
  assert.equal(evaluation.accepted, false);
  assert.ok(evaluation.blockers.includes('packet.exactContent'));
});

test('the exact frozen CM-2122 packet cannot replay its stale CM-2117 execution attribution', () => {
  assert.throws(
    () => implementation.assertExecutableStatusAttribution({
      packetCommit: implementation.ATTRIBUTION_STALE_PACKET_COMMIT
    }),
    /cm2122_frozen_packet_status_attribution_stale/
  );
  assert.equal(implementation.assertExecutableStatusAttribution({ packetCommit: 'a'.repeat(40) }), true);
  const source = fs.readFileSync('src/core/Cm2122FullPlanStatusSyncExecution.js', 'utf8');
  assert.ok(
    source.indexOf('assertExecutableStatusAttribution(packetEvidence);') <
    source.indexOf('let finalReleaseEvidence = intakeFinalReleaseDecision')
  );
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

test('CM-2123 generation validates at a deterministic in-window time', () => {
  assert.equal(releaseGenerator.VALIDATION_AT, releaseGenerator.APPROVED_AT);
  const validation = Date.parse(releaseGenerator.VALIDATION_AT);
  assert.equal(validation >= Date.parse(releaseGenerator.APPROVED_AT), true);
  assert.equal(validation < Date.parse(releaseGenerator.EXPIRES_AT), true);
});

test('Git repository, object, and index environment overrides fail before any governance or Git effect', () => {
  for (const key of [
    'GIT_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_INDEX_FILE',
    'GIT_GRAFT_FILE', 'GIT_NO_REPLACE_OBJECTS', 'GIT_PREFIX', 'GIT_IMPLICIT_WORK_TREE'
  ]) {
    assert.throws(() => implementation.assertSafeGitEnvironment({ [key]: '/tmp/cm2122-forbidden' }),
      /unsafe_git_environment/);
    const sanitized = implementation.sanitizedGitEnvironment({
      SAFE_VALUE: 'kept',
      [key]: '/tmp/cm2122-forbidden'
    });
    if (key === 'GIT_NO_REPLACE_OBJECTS') assert.equal(sanitized[key], '1');
    else assert.equal(Object.hasOwn(sanitized, key), false);
    assert.equal(sanitized.GIT_NO_REPLACE_OBJECTS, '1');
    const before = text(['rev-parse', 'HEAD^{commit}'], fixture.repo);
    const rejected = spawnSync(process.execPath, [
      'src/cli/cm2122-full-plan-status-sync.js',
      '--content-decision-commit', implementation.CONTENT_DECISION_FREEZE.commit,
      '--execution-packet-commit', fixture.packetCommit,
      '--final-execution-release-commit', fixture.finalReleaseCommit
    ], {
      cwd: fixture.repo,
      env: { ...process.env, [key]: '/tmp/cm2122-forbidden' },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /unsafe_git_environment/);
    assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.repo), before);
  }
  assert.equal(fs.existsSync(path.join(
    fixture.repo,
    '.git',
    'codex-memory-governance',
    'phase8-one-shot-authorization-registries'
  )), false);
});

test('status-sync resolver intake uses the replace-disabled shared Git helpers', () => {
  const gitHelperSource = fs.readFileSync(path.join(ROOT, 'scripts/cm2115-r2-git.js'), 'utf8');
  const gateSource = fs.readFileSync(
    path.join(ROOT, 'scripts/generate-cm2116-exact-full-plan-application-gate.js'),
    'utf8'
  );
  assert.match(gitHelperSource, /GIT_NO_REPLACE_OBJECTS:\s*'1'/);
  assert.match(gitHelperSource, /env:\s*gitEnvironment\(\)/);
  assert.match(gateSource, /function isCommitAncestor\(ancestor, descendant\)/);
  assert.doesNotMatch(gateSource, /generate-cm2115-r2-self-review-decision/);
});

test('durable binding review rejects Git environment overrides before reading review evidence', async () => {
  for (const key of [
    'GIT_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_GRAFT_FILE', 'GIT_NO_REPLACE_OBJECTS', 'GIT_PREFIX', 'GIT_IMPLICIT_WORK_TREE'
  ]) {
    const previous = process.env[key];
    process.env[key] = '/tmp/cm2122-forbidden';
    try {
      await assert.rejects(fixture.frozenModule.evaluateDurableDetachedBinding({
        contentDecisionCommit: implementation.CONTENT_DECISION_FREEZE.commit,
        packetCommit: fixture.packetCommit,
        finalReleaseCommit: fixture.finalReleaseCommit
      }), /unsafe_git_environment/);
    } finally {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
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
  assert.deepEqual(packet.payload.supersedes, fixture.frozenModule.SUPERSEDED_FREEZE);
  assert.equal(packet.payload.supersedes.authorizationClaimed, false);
  assert.equal(packet.payload.supersedes.executorRun, false);

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

test('final release cannot replace the independently frozen approval window', () => {
  const decision = JSON.parse(JSON.stringify(fixture.finalReleaseEvidence.decision));
  decision.payload.authorization.approvedAt = '2030-01-01T00:00:00+08:00';
  decision.payload.authorization.expiresAt = '2030-01-02T00:00:00+08:00';
  decision.canonicalPayloadSha256 = sha256Canonical(decision.payload);
  const evaluation = fixture.frozenModule.evaluateFinalReleaseDecision(decision, {
    packetEvidence: fixture.packetEvidence,
    now: new Date('2030-01-01T12:00:00+08:00')
  });
  assert.equal(evaluation.accepted, false);
  assert.ok(evaluation.blockers.includes('finalRelease.exactContent'));
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

test('receipt writes pin the verified governance directory and never follow its mutable path', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/core/Cm2122FullPlanStatusSyncExecution.js'), 'utf8');
  assert.match(source, /rootIdentity = await registry\.verifyRoot\(\)/);
  assert.match(source, /fs\.constants\.O_DIRECTORY \| fs\.constants\.O_NOFOLLOW/);
  assert.match(source, /`\/proc\/self\/fd\/\$\{rootHandle\.fd\}\/\$\{filename\}`/);
  assert.match(source, /descriptorStat\.dev !== rootIdentity\.dev \|\| descriptorStat\.ino !== rootIdentity\.ino/);
  assert.doesNotMatch(source, /fsPromises\.writeFile\(receiptPath, bytes/);
});

test('receipt reads pin the verified governance directory and read through a no-follow descriptor', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/core/Cm2122FullPlanStatusSyncExecution.js'), 'utf8');
  const start = source.indexOf('async function readExternalReceipt');
  const end = source.indexOf('\nasync function evaluateDurableDetachedBinding', start);
  const implementationSource = source.slice(start, end);
  assert.match(implementationSource, /openVerifiedGovernanceRoot\(registry\)/);
  assert.match(implementationSource, /O_NOFOLLOW/);
  assert.match(implementationSource, /receiptHandle\.stat\(\)/);
  assert.match(implementationSource, /receiptHandle\.readFile\(\)/);
  assert.doesNotMatch(implementationSource, /lstat\(receiptPath\)/);
  assert.doesNotMatch(implementationSource, /readFile\(receiptPath\)/);
});

test('claim create, read, and transition stay inside the verified governance descriptor', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/core/Cm2122FullPlanStatusSyncExecution.js'), 'utf8');
  assert.match(source, /governanceDescriptorPath\(rootHandle, claimFileName\(\)\)/);
  assert.match(source, /governanceDescriptorPath\(rootHandle, temporaryName\)/);
  assert.match(source, /governanceDescriptorPath\(rootHandle, filename\)/);
  assert.doesNotMatch(source, /this\.fs\.writeFile\(this\.claimPath/);
  assert.doesNotMatch(source, /this\.fs\.readFile\(this\.claimPath/);
});

test('claim transition keeps read and write pinned to one governance descriptor across a path swap', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2122-transition-root-swap-'));
  const root = path.join(parent, 'registry');
  const replacement = path.join(parent, 'replacement');
  const displaced = path.join(parent, 'displaced');
  const identity = JSON.stringify(canonicalize(fixture.frozenModule.GOVERNANCE_ROOT_IDENTITY));
  const bindingHash = fixture.frozenModule.buildClaimBindingHash({
    packetEvidence: fixture.packetEvidence,
    finalReleaseEvidence: fixture.finalReleaseEvidence
  });
  fs.mkdirSync(root);
  fs.mkdirSync(replacement);
  fs.writeFileSync(path.join(root, '.phase8-registry-root-identity.json'), identity);
  fs.writeFileSync(path.join(replacement, '.phase8-registry-root-identity.json'), identity);
  try {
    const initialRegistry = new fixture.frozenModule.Cm2122StatusSyncClaimRegistry({ governanceRoot: root });
    await initialRegistry.claim(bindingHash, fixture.finalReleaseEvidence, fixture.now);
    const initialClaim = fs.readFileSync(path.join(root, fixture.frozenModule.claimFileName()));
    fs.writeFileSync(path.join(replacement, fixture.frozenModule.claimFileName()), initialClaim);

    let swapped = false;
    const fsApi = Object.create(require('node:fs/promises'));
    fsApi.open = async (target, flags, mode) => {
      const handle = await require('node:fs/promises').open(target, flags, mode);
      if (!swapped && String(target).endsWith(fixture.frozenModule.claimFileName()) &&
          flags === (fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)) {
        return {
          stat: (...args) => handle.stat(...args),
          readFile: async (...args) => {
            const bytes = await handle.readFile(...args);
            fs.renameSync(root, displaced);
            fs.renameSync(replacement, root);
            swapped = true;
            return bytes;
          },
          close: (...args) => handle.close(...args)
        };
      }
      return handle;
    };
    const registry = new fixture.frozenModule.Cm2122StatusSyncClaimRegistry({ governanceRoot: root, fsApi });
    const next = await registry.transition(
      bindingHash,
      'STATUS_COMMIT_INVOCATION_CONSUMED',
      'DETACHED_STATUS_COMMIT_CREATED',
      {
        detachedStatusCommitCreated: true,
        detachedHeadUpdateAcknowledged: true,
        detachedStatusCommit: 'a'.repeat(40),
        detachedStatusTree: 'b'.repeat(40)
      },
      fixture.finalReleaseEvidence
    );
    assert.equal(swapped, true);
    assert.equal(next.state, 'DETACHED_STATUS_COMMIT_CREATED');
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(displaced, fixture.frozenModule.claimFileName()))).state,
      'DETACHED_STATUS_COMMIT_CREATED'
    );
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(root, fixture.frozenModule.claimFileName()))).state,
      'STATUS_COMMIT_INVOCATION_CONSUMED'
    );
    assert.deepEqual(
      fs.readdirSync(root).sort(),
      ['.phase8-registry-root-identity.json', fixture.frozenModule.claimFileName()].sort()
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('successful execution replays durable receipts before returning and can terminalize failure as ambiguous', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/core/Cm2122FullPlanStatusSyncExecution.js'), 'utf8');
  const successTransition = source.indexOf("'CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION', {}, finalReleaseEvidence");
  const durableReplay = source.indexOf('const durableBinding = await evaluateDurableDetachedBinding', successTransition);
  const successReturn = source.indexOf('accepted: true', durableReplay);
  assert.ok(successTransition >= 0 && durableReplay > successTransition && successReturn > durableReplay);
  assert.match(source, /CONSUMED_SUCCESS_DETACHED_COMMIT_BOUND_AWAITING_REF_DECISION:\s*\['CONSUMED_AMBIGUOUS_POST_COMMIT'\]/);
  assert.match(source.slice(durableReplay), /if \(state !== 'UNCLAIMED'\)/);
});

test('reentry expects the detached runtime only after the HEAD update was acknowledged', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/core/Cm2122FullPlanStatusSyncExecution.js'), 'utf8');
  const start = source.indexOf('function assertReentryRuntime');
  const end = source.indexOf('\nfunction assertExecutableStatusAttribution', start);
  const implementationSource = source.slice(start, end);
  assert.match(implementationSource, /detachedStatusCommitCreated === true &&\s*existing\.envelope\.detachedHeadUpdateAcknowledged === true/);
  assert.match(implementationSource, /const expectedHead = detachedHeadAdvanced/);
  assert.match(implementationSource, /const expectedTree = detachedHeadAdvanced/);
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

function runStatusSyncProcess(fixedNow = fixture.now.toISOString(), environment = {}) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [
      '--require', FIXED_DATE_PRELOAD,
      'src/cli/cm2122-full-plan-status-sync.js',
      '--content-decision-commit', implementation.CONTENT_DECISION_FREEZE.commit,
      '--execution-packet-commit', fixture.packetCommit,
      '--final-execution-release-commit', fixture.finalReleaseCommit
    ], {
      cwd: fixture.repo,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CODEX_MEMORY_TEST_FIXED_NOW: fixedNow,
        ...environment
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, stdout, stderr, timedOut });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, EXECUTOR_CHILD_TIMEOUT_MS);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => finish({ code: null, signal: null, spawnError: error.message }));
    child.on('close', (code, signal) => finish({ code, signal, spawnError: null }));
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

test('temp clone creates one exact detached 9M commit, binds it, and leaves the branch ref unchanged', {
  timeout: EXECUTOR_CHILD_TIMEOUT_MS + 15_000
}, async () => {
  initializeGovernanceRoot();
  git(['update-ref', implementation.FUTURE_BRANCH_REF, fixture.finalReleaseCommit], fixture.repo);
  git(['checkout', '--detach', fixture.finalReleaseCommit], fixture.repo);
  const branchBefore = text(['show-ref', '--hash', '--verify', implementation.FUTURE_BRANCH_REF], fixture.repo);
  assert.equal(branchBefore, fixture.finalReleaseCommit);
  assert.equal(text(['branch', '--show-current'], fixture.repo), '');

  git(['config', '--unset-all', 'user.name'], fixture.repo);
  git(['config', '--unset-all', 'user.email'], fixture.repo);
  const emptyHome = path.join(path.dirname(fixture.repo), 'empty-home');
  fs.mkdirSync(emptyHome);
  const result = await runStatusSyncProcess(fixture.now.toISOString(), {
    HOME: emptyHome,
    XDG_CONFIG_HOME: emptyHome,
    GIT_AUTHOR_NAME: '',
    GIT_AUTHOR_EMAIL: '',
    GIT_COMMITTER_NAME: '',
    GIT_COMMITTER_EMAIL: ''
  });
  assert.equal(result.timedOut, false, JSON.stringify(result));
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
  assert.equal(
    text(['show', '-s', '--format=%an%n%ae%n%aI%n%cn%n%ce%n%cI', fixture.detachedStatusCommit], fixture.repo),
    [
      implementation.DETACHED_STATUS_COMMIT_IDENTITY.authorName,
      implementation.DETACHED_STATUS_COMMIT_IDENTITY.authorEmail,
      implementation.DETACHED_STATUS_COMMIT_IDENTITY.authorDate,
      implementation.DETACHED_STATUS_COMMIT_IDENTITY.committerName,
      implementation.DETACHED_STATUS_COMMIT_IDENTITY.committerEmail,
      implementation.DETACHED_STATUS_COMMIT_IDENTITY.committerDate
    ].join('\n')
  );
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
  const detached = executionReceipt.payload.detachedCommit;
  const callerBinding = {
    accepted: true,
    blockers: [],
    detachedStatusCommit: detached.commit,
    detachedStatusTree: detached.tree,
    parentCommit: detached.parentCommit,
    parentTree: detached.parentTree,
    targetBranchRef: detached.targetBranchRef,
    targetBranchExpectedOld: detached.targetBranchExpectedOld,
    targetBranchObservedBeforeCommit: detached.targetBranchObservedBeforeCommit,
    targetBranchObservedAfterCommit: detached.targetBranchObservedAfterCommit,
    detachedHeadCasUsed: true
  };
  assert.equal(fixture.frozenModule.verifyDetachedCommitBinding, undefined);
  assert.equal(fixture.frozenModule.isMachineBoundDetachedBinding, undefined);
  assert.equal(
    fixture.frozenModule.evaluateExecutionReceipt(executionReceipt, {
      packetEvidence: fixture.packetEvidence,
      finalReleaseEvidence: fixture.finalReleaseEvidence,
      detachedBinding: callerBinding
    }).accepted,
    false
  );
  const preBindingClaim = {
    ...claim,
    state: 'EXECUTION_RECEIPT_WRITTEN',
    bindingReceiptCreated: false,
    bindingReceiptSha256: null,
    reconciliationRequired: true
  };
  assert.equal(
    fixture.frozenModule.evaluateBindingReceipt(bindingReceipt, {
      detachedBinding: callerBinding,
      executionReceipt,
      claimEnvelope: preBindingClaim,
      packetEvidence: fixture.packetEvidence,
      finalReleaseEvidence: fixture.finalReleaseEvidence
    }).accepted,
    false
  );
  for (const receipt of [executionReceipt, bindingReceipt]) {
    assert.equal(receipt.payload.detachedCommit.targetBranchRef, implementation.FUTURE_BRANCH_REF);
    assert.equal(receipt.payload.detachedCommit.targetBranchExpectedOld, fixture.finalReleaseCommit);
    assert.equal(receipt.payload.detachedCommit.targetBranchObservedBeforeCommit, fixture.finalReleaseCommit);
    assert.equal(receipt.payload.detachedCommit.targetBranchObservedAfterCommit, fixture.finalReleaseCommit);
    assert.equal(receipt.payload.detachedCommit.detachedHeadCasUsed, true);
  }

  const durable = evaluateDurableInFixture();
  assert.equal(durable.accepted, true, durable.blockers.join(','));
  assert.equal(durable.detachedStatusCommit, fixture.detachedStatusCommit);
  assert.equal(durable.detachedCommitBound, true);
  assert.equal(durable.branchRefUpdateAuthorized, false);
  assert.equal(durable.statusSyncPerformed, false);
  assert.equal(durable.currentBranchStatusSynchronized, false);
  assert.equal(durable.readinessClaimed, false);
});

test('a new process cannot replay the consumed authorization or move the branch ref', {
  timeout: EXECUTOR_CHILD_TIMEOUT_MS + 15_000
}, async () => {
  const branchBefore = text(['show-ref', '--hash', '--verify', implementation.FUTURE_BRANCH_REF], fixture.repo);
  const objectsBefore = text(['count-objects', '-v'], fixture.repo);
  assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.repo), fixture.detachedStatusCommit);
  const replay = await runStatusSyncProcess();
  assert.equal(replay.timedOut, false, JSON.stringify(replay));
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
  assert.equal(text(['rev-parse', 'HEAD^{commit}'], fixture.repo), fixture.detachedStatusCommit);
  assert.equal(text(['count-objects', '-v'], fixture.repo), objectsBefore);

  const registry = new fixture.frozenModule.Cm2122StatusSyncClaimRegistry({
    governanceRoot: fixture.governanceRoot
  });
  const bindingHash = fixture.frozenModule.buildClaimBindingHash({
    packetEvidence: fixture.packetEvidence,
    finalReleaseEvidence: fixture.finalReleaseEvidence
  });
  const existing = await registry.inspectExisting(bindingHash, fixture.finalReleaseEvidence);
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

test('consumed status-sync authorization remains readonly-reentrant after final-release expiry', {
  timeout: EXECUTOR_CHILD_TIMEOUT_MS + 15_000
}, async () => {
  const replay = await runStatusSyncProcess('2026-07-20T00:00:00+08:00');
  assert.equal(replay.timedOut, false, JSON.stringify(replay));
  assert.equal(replay.code, 0, replay.stderr);
  const result = JSON.parse(replay.stdout);
  assert.equal(result.status, 'STOPPED');
  assert.equal(result.authorizationConsumed, true);
  assert.equal(result.authorizationReplayAllowed, false);
  assert.equal(result.statusSyncPerformed, false);
  assert.equal(result.currentBranchStatusSynchronized, false);
});
