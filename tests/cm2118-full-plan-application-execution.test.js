'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const implementation = require('../src/core/Cm2118FullPlanApplicationExecution');
const { resolverOptions: realResolverOptions } = require('../scripts/generate-cm2116-exact-full-plan-application-gate');
const { main: runCli, parseArgs } = require('../src/cli/cm2118-full-plan-application');
const packetGenerator = require('../scripts/generate-cm2118-full-plan-application-execution-packet');
const releaseGenerator = require('../scripts/generate-cm2119-full-plan-final-execution-release');
const { canonicalize, sha256Canonical } = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  DECISION_REFERENCE: CM2115_DECISION_REFERENCE,
  GOVERNANCE_ROOT_IDENTITY: CM2115_GOVERNANCE_ROOT_IDENTITY,
  NONCE: CM2115_NONCE,
  RECEIPT_ID: CM2115_RECEIPT_ID,
  REGISTRY_REFERENCE: CM2115_REGISTRY_REFERENCE,
  claimFileName: cm2115ClaimFileName,
  validateDurableClaim: validateCm2115DurableClaim
} = require('../src/core/Cm2115R2Phase2CompletionAuditApplication');
const FIXED_DATE_PRELOAD = path.join(ROOT, 'tests/helpers/fixed-date-preload.js');
const CM2115_BINDING_HASH = '8ec9206dc2dad88f7fb88302c30bae6113b7ec0b909f37354c56c50d8f253ebc';
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

function decisionTime(decision) {
  const approved = Date.parse(decision.payload.approvedAt);
  const expires = Date.parse(decision.payload.expiresAt);
  assert.ok(Number.isFinite(approved));
  assert.ok(Number.isFinite(expires));
  assert.ok(approved < expires);
  return new Date(approved + Math.min(1000, Math.max(0, expires - approved - 1)));
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
    resolveDurableClaim: () => resolveFixtureDurableClaim(cwd),
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
  git(['-c', 'user.name=CM2118 Test', '-c', 'user.email=cm2118@example.invalid', 'commit', '-m', message], cwd);
  return text(['rev-parse', 'HEAD^{commit}'], cwd);
}

function fixtureGovernanceRoot(cwd) {
  return path.join(cwd, '.git', 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
}

function seedCm2115DurableClaim(cwd) {
  const root = fixtureGovernanceRoot(cwd);
  const claimFile = cm2115ClaimFileName();
  const claim = validateCm2115DurableClaim({
    schemaVersion: 1,
    registryReference: CM2115_REGISTRY_REFERENCE,
    claimId: claimFile.slice('.cm2115-r2-phase2-application-claim-'.length, -'.json'.length),
    nonceHash: sha256(CM2115_NONCE),
    receiptIdHash: sha256(CM2115_RECEIPT_ID),
    bindingHash: CM2115_BINDING_HASH,
    decisionReference: CM2115_DECISION_REFERENCE,
    authorizationUseCount: 1,
    authorizationReplayAllowed: false,
    patchInvocationCount: 1,
    state: 'CONSUMED_SUCCESS'
  }, CM2115_BINDING_HASH);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, '.phase8-registry-root-identity.json'),
    JSON.stringify(canonicalize(CM2115_GOVERNANCE_ROOT_IDENTITY))
  );
  fs.writeFileSync(path.join(root, claimFile), JSON.stringify(canonicalize(claim)));
}

function resolveFixtureDurableClaim(cwd) {
  return JSON.parse(fs.readFileSync(path.join(fixtureGovernanceRoot(cwd), cm2115ClaimFileName()), 'utf8'));
}

function prepareFrozenFixture() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2118-e2e-'));
  const repo = path.join(parent, 'repo');
  git(['clone', '--quiet', '--no-hardlinks', ROOT, repo], parent);
  git(['checkout', '--detach', implementation.IMPLEMENTATION_PARENT_FREEZE.commit], repo);
  seedCm2115DurableClaim(repo);
  copyImplementationFiles(repo);
  const implementationCommit = commitAll(repo, 'test: freeze cm2118 implementation');
  execFileSync(process.execPath, ['scripts/generate-cm2118-full-plan-application-execution-packet.js'], {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const packetCommit = commitAll(repo, 'test: freeze cm2118 packet');
  execFileSync(process.execPath, ['scripts/generate-cm2119-full-plan-final-execution-release.js'], {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const finalReleaseCommit = commitAll(repo, 'test: freeze cm2119 final release');
  const modulePath = path.join(repo, 'src/core/Cm2118FullPlanApplicationExecution.js');
  delete require.cache[require.resolve(modulePath)];
  const frozenModule = require(modulePath);
  const gitResolvers = resolvers(repo);
  const packetEvidence = frozenModule.intakeExecutionPacket({ packetCommit, ...gitResolvers });
  const finalReleaseEvidence = frozenModule.intakeFinalReleaseDecision({
    finalReleaseCommit,
    packetEvidence,
    now: new Date('2026-07-12T18:00:00+08:00'),
    ...gitResolvers
  });
  return {
    parent,
    repo,
    frozenModule,
    gitResolvers,
    implementationCommit,
    packetCommit,
    finalReleaseCommit,
    packetEvidence,
    finalReleaseEvidence
  };
}

let fixture;

test.before(() => {
  fixture = prepareFrozenFixture();
});

test.after(() => {
  if (fixture?.parent && process.env.CM2118_KEEP_FIXTURE !== '1') {
    fs.rmSync(fixture.parent, { recursive: true, force: true });
  }
});

test('CM-2117 exact content decision is machine-intaken and immutable', () => {
  const evidence = implementation.intakeContentDecision(realResolverOptions());
  assert.equal(evidence.accepted, true, evidence.blockers.join(','));
  assert.equal(implementation.isMachineBoundContentDecision(evidence.decision), true);
  assert.equal(Object.isFrozen(evidence.decision), true);
  const clone = JSON.parse(JSON.stringify(evidence.decision));
  assert.equal(implementation.isMachineBoundContentDecision(clone), false);
});

test('CLI accepts exactly three commit arguments and rejects extra surfaces', () => {
  const a = 'a'.repeat(40);
  const b = 'b'.repeat(40);
  const c = 'c'.repeat(40);
  const parsed = parseArgs([
    '--execution-packet-commit', b,
    '--authorization-content-decision-commit', a,
    '--final-execution-release-decision-commit', c
  ]);
  assert.equal(parsed.executionPacketCommit, b);
  assert.throws(() => parseArgs(['--output', '/tmp/x']), /exact_three_commit/);
  assert.throws(() => parseArgs([
    '--execution-packet-commit', b,
    '--authorization-content-decision-commit', a,
    '--final-execution-release-decision-commit', c,
    '--json', 'true'
  ]), /exact_three_commit/);
});

test('packet and release generators reject output-path arguments', () => {
  assert.throws(() => packetGenerator.parseArgs(['--output', '/tmp/x']), /no_output/);
  assert.throws(() => releaseGenerator.parseArgs(['--output', '/tmp/x']), /no_output/);
});

test('CM-2118 rejects repository Git environment overrides before packet intake or durable effects', async () => {
  for (const key of [
    'GIT_DIR', 'GIT_WORK_TREE', 'GIT_OBJECT_DIRECTORY', 'GIT_INDEX_FILE',
    'GIT_GRAFT_FILE', 'GIT_NO_REPLACE_OBJECTS', 'GIT_PREFIX', 'GIT_IMPLICIT_WORK_TREE'
  ]) {
    assert.throws(
      () => implementation.assertSafeGitEnvironment({ [key]: '/tmp/cm2118-forbidden' }),
      /cm2118_unsafe_git_environment/
    );
    assert.equal(Object.hasOwn(
      implementation.sanitizedGitEnvironment({ SAFE_VALUE: 'kept', [key]: '/tmp/cm2118-forbidden' }),
      key
    ), false);
    const previous = process.env[key];
    process.env[key] = '/tmp/cm2118-forbidden';
    try {
      await assert.rejects(
        implementation.executeFullPlanApplicationFromCommits({
          authorizationContentDecisionCommit: implementation.CONTENT_DECISION_FREEZE.commit,
          packetCommit: 'a'.repeat(40),
          finalReleaseCommit: 'b'.repeat(40)
        }),
        /cm2118_unsafe_git_environment/
      );
      await assert.rejects(
        implementation.evaluateDurableApplicationBinding({
          authorizationContentDecisionCommit: implementation.CONTENT_DECISION_FREEZE.commit,
          packetCommit: 'a'.repeat(40),
          finalReleaseCommit: 'b'.repeat(40)
        }),
        /cm2118_unsafe_git_environment/
      );
    } finally {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
  }
});

test('CM-2118 CLI rejects unsafe Git environment before its repository-root Git read', async () => {
  const previous = process.env.GIT_DIR;
  process.env.GIT_DIR = '/tmp/cm2118-forbidden-cli-git-dir';
  try {
    await assert.rejects(
      runCli([
        '--authorization-content-decision-commit', implementation.CONTENT_DECISION_FREEZE.commit,
        '--execution-packet-commit', 'a'.repeat(40),
        '--final-execution-release-decision-commit', 'b'.repeat(40)
      ]),
      /cm2118_unsafe_git_environment:GIT_DIR/
    );
  } finally {
    if (previous === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previous;
  }
});

test('CM-2118 preflights author and committer identities before the durable claim', () => {
  const calls = [];
  assert.equal(implementation.assertGitCommitIdentity('/fixture/repo', (args, options) => {
    calls.push({ args, options });
    return `${args[1]} Fixture <fixture@example.invalid> 0 +0000`;
  }), true);
  assert.deepEqual(calls.map(call => call.args), [
    ['var', 'GIT_AUTHOR_IDENT'],
    ['var', 'GIT_COMMITTER_IDENT']
  ]);
  assert.ok(calls.every(call => call.options.cwd === '/fixture/repo'));

  assert.throws(
    () => implementation.assertGitCommitIdentity('/fixture/repo', args => {
      if (args[1] === 'GIT_COMMITTER_IDENT') throw new Error('Committer identity unknown');
      return 'Author Fixture <fixture@example.invalid> 0 +0000';
    }),
    /cm2118_git_commit_identity_required:GIT_COMMITTER_IDENT/
  );

  const executionSource = fs.readFileSync(
    path.join(ROOT, 'src/core/Cm2118FullPlanApplicationExecution.js'),
    'utf8'
  );
  assert.ok(
    executionSource.indexOf('assertGitCommitIdentity(repositoryRoot);') <
      executionSource.indexOf('registry.claim(bindingHash, finalReleaseEvidence)')
  );
});

test('CM-2119 generation validates at a deterministic in-window time', () => {
  assert.equal(releaseGenerator.VALIDATION_AT, releaseGenerator.APPROVED_AT);
  const validation = Date.parse(releaseGenerator.VALIDATION_AT);
  assert.equal(validation >= Date.parse(releaseGenerator.APPROVED_AT), true);
  assert.equal(validation < Date.parse(releaseGenerator.EXPIRES_AT), true);
});

test('frozen packet and final release pass exact Git intake but ordinary clones have no authority', () => {
  assert.equal(fixture.packetEvidence.accepted, true, fixture.packetEvidence.blockers.join(','));
  assert.equal(fixture.finalReleaseEvidence.accepted, true, fixture.finalReleaseEvidence.blockers.join(','));
  assert.equal(fixture.frozenModule.isMachineBoundExecutionPacket(fixture.packetEvidence.packet), true);
  assert.equal(fixture.frozenModule.isMachineBoundFinalReleaseDecision(fixture.finalReleaseEvidence.decision), true);
  assert.equal(fixture.frozenModule.isMachineBoundExecutionPacket(
    JSON.parse(JSON.stringify(fixture.packetEvidence.packet))
  ), false);
  assert.equal(fixture.frozenModule.isMachineBoundFinalReleaseDecision(
    JSON.parse(JSON.stringify(fixture.finalReleaseEvidence.decision))
  ), false);
});

test('final release is inactive before approvedAt and after expiry', () => {
  const packetEvidence = fixture.packetEvidence;
  const decision = fixture.finalReleaseEvidence.decision;
  assert.equal(fixture.frozenModule.evaluateFinalReleaseDecision(decision, {
    packetEvidence,
    now: new Date('2026-07-12T17:59:59+08:00')
  }).accepted, false);
  assert.equal(fixture.frozenModule.evaluateFinalReleaseDecision(decision, {
    packetEvidence,
    now: new Date('2026-07-19T18:00:00+08:00')
  }).accepted, false);
});

test('final release cannot replace the independently frozen approval window', () => {
  const decision = JSON.parse(JSON.stringify(fixture.finalReleaseEvidence.decision));
  decision.payload.approvedAt = '2030-01-01T00:00:00+08:00';
  decision.payload.expiresAt = '2030-01-02T00:00:00+08:00';
  decision.canonicalPayloadSha256 = sha256Canonical(decision.payload);
  const evaluation = fixture.frozenModule.evaluateFinalReleaseDecision(decision, {
    packetEvidence: fixture.packetEvidence,
    now: new Date('2030-01-01T12:00:00+08:00')
  });
  assert.equal(evaluation.accepted, false);
  assert.ok(evaluation.blockers.includes('finalRelease.exactContent'));
});

test('durable receipt reads use a verified governance descriptor, not a mutable path', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'src/core/Cm2118FullPlanApplicationExecution.js'),
    'utf8'
  );
  const start = source.indexOf('async function readExternalReceipt');
  const end = source.indexOf('\nasync function evaluateDurableApplicationBinding', start);
  const implementationSource = source.slice(start, end);
  assert.match(implementationSource, /openVerifiedGovernanceRoot\(registry\)/);
  assert.match(implementationSource, /O_NOFOLLOW/);
  assert.match(implementationSource, /receiptHandle\.stat\(\)/);
  assert.match(implementationSource, /receiptHandle\.readFile\(\)/);
  assert.doesNotMatch(implementationSource, /lstat\(receiptPath\)/);
  assert.doesNotMatch(implementationSource, /readFile\(receiptPath\)/);
});

test('one-shot registry uses fixed root identity, atomic claim, and rejects serial replay/binding drift', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: decisionTime(fixture.finalReleaseEvidence.decision) });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2118-registry-'));
  fs.writeFileSync(
    path.join(root, '.phase8-registry-root-identity.json'),
    JSON.stringify(canonicalize(fixture.frozenModule.GOVERNANCE_ROOT_IDENTITY))
  );
  const registry = new fixture.frozenModule.Cm2118FullPlanApplicationClaimRegistry({ governanceRoot: root });
  const bindingHash = 'd'.repeat(64);
  await assert.rejects(registry.claim(bindingHash, {
    decision: {
      payload: {
        decisionReference: fixture.finalReleaseEvidence.decision.payload.decisionReference,
        approvedAt: '2020-01-01T00:00:00.000Z',
        expiresAt: '2020-01-02T00:00:00.000Z'
      }
    }
  }), /outside_final_release_window/);
  const claim = await registry.claim(bindingHash, fixture.finalReleaseEvidence);
  assert.equal(claim.state, 'APPLICATION_COMMIT_INVOCATION_CONSUMED');
  assert.equal(claim.patchInvocationCount, 1);
  await assert.rejects(registry.claim(bindingHash, fixture.finalReleaseEvidence), /already_claimed/);
  await assert.rejects(registry.read('f'.repeat(64)), /binding_mismatch/);
  const second = new fixture.frozenModule.Cm2118FullPlanApplicationClaimRegistry({ governanceRoot: root });
  await assert.rejects(second.claim(bindingHash, fixture.finalReleaseEvidence), /already_claimed/);
  const ambiguous = await registry.transition(
    bindingHash,
    'APPLICATION_COMMIT_INVOCATION_CONSUMED',
    'CONSUMED_AMBIGUOUS',
    {
      applicationCommitCreated: true,
      applicationCommit: 'a'.repeat(40),
      applicationTree: 'b'.repeat(40),
      executionReceiptCreated: true,
      executionReceiptSha256: 'c'.repeat(64),
      bindingReceiptCreated: null,
      bindingReceiptSha256: 'e'.repeat(64)
    }
  );
  assert.equal(ambiguous.applicationCommitCreated, true);
  assert.equal(ambiguous.applicationCommit, 'a'.repeat(40));
  assert.equal(ambiguous.applicationTree, 'b'.repeat(40));
  assert.equal(ambiguous.executionReceiptCreated, true);
  assert.equal(ambiguous.executionReceiptSha256, 'c'.repeat(64));
  assert.equal(ambiguous.bindingReceiptCreated, null);
  assert.equal(ambiguous.bindingReceiptSha256, 'e'.repeat(64));
  fs.rmSync(root, { recursive: true, force: true });
});

test('initial claim write stays pinned to the verified governance root across a path swap', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: decisionTime(fixture.finalReleaseEvidence.decision) });
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2118-claim-root-swap-'));
  const root = path.join(parent, 'registry');
  const replacement = path.join(parent, 'replacement');
  const pinned = path.join(parent, 'pinned');
  const identity = JSON.stringify(canonicalize(fixture.frozenModule.GOVERNANCE_ROOT_IDENTITY));
  fs.mkdirSync(root);
  fs.mkdirSync(replacement);
  fs.writeFileSync(path.join(root, '.phase8-registry-root-identity.json'), identity);
  fs.writeFileSync(path.join(replacement, '.phase8-registry-root-identity.json'), identity);
  let swapped = false;
  const filesystem = Object.create(require('node:fs/promises'));
  filesystem.writeFile = async (target, bytes, options) => {
    if (!swapped && String(target).endsWith(fixture.frozenModule.claimFileName())) {
      fs.renameSync(root, pinned);
      fs.renameSync(replacement, root);
      swapped = true;
    }
    return require('node:fs/promises').writeFile(target, bytes, options);
  };
  try {
    const registry = new fixture.frozenModule.Cm2118FullPlanApplicationClaimRegistry({
      governanceRoot: root,
      filesystem
    });
    const claim = await registry.claim('d'.repeat(64), fixture.finalReleaseEvidence);
    assert.equal(claim.state, 'APPLICATION_COMMIT_INVOCATION_CONSUMED');
    assert.equal(swapped, true);
    assert.equal(fs.existsSync(path.join(pinned, fixture.frozenModule.claimFileName())), true);
    assert.equal(fs.existsSync(path.join(root, fixture.frozenModule.claimFileName())), false);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

test('CM-2118 registry rejects a governance root reached through a symlinked parent', async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2118-registry-parent-'));
  try {
    const realParent = path.join(parent, 'real-parent');
    const linkedParent = path.join(parent, 'linked-parent');
    const realRoot = path.join(realParent, 'registry');
    fs.mkdirSync(realRoot, { recursive: true });
    fs.writeFileSync(
      path.join(realRoot, '.phase8-registry-root-identity.json'),
      JSON.stringify(canonicalize(fixture.frozenModule.GOVERNANCE_ROOT_IDENTITY))
    );
    fs.symlinkSync(realParent, linkedParent, 'dir');
    const registry = new fixture.frozenModule.Cm2118FullPlanApplicationClaimRegistry({
      governanceRoot: path.join(linkedParent, 'registry')
    });
    await assert.rejects(registry.verifyRoot(), /governance_root_invalid|symlink_forbidden/);
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});

function runApplicationProcess() {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [
      '--require', FIXED_DATE_PRELOAD,
      'src/cli/cm2118-full-plan-application.js',
      '--authorization-content-decision-commit', implementation.CONTENT_DECISION_FREEZE.commit,
      '--execution-packet-commit', fixture.packetCommit,
      '--final-execution-release-decision-commit', fixture.finalReleaseCommit
    ], {
      cwd: fixture.repo,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CODEX_MEMORY_TEST_FIXED_NOW: decisionTime(fixture.finalReleaseEvidence.decision).toISOString()
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
    "const m=require('./src/core/Cm2118FullPlanApplicationExecution');",
    `(async()=>{const r=await m.evaluateDurableApplicationBinding({authorizationContentDecisionCommit:'${implementation.CONTENT_DECISION_FREEZE.commit}',packetCommit:'${fixture.packetCommit}',finalReleaseCommit:'${fixture.finalReleaseCommit}',now:new Date('2026-07-12T18:00:00+08:00')});process.stdout.write(JSON.stringify(r));})().catch(e=>{console.error(e.message);process.exit(1);});`
  ].join('');
  return JSON.parse(execFileSync(process.execPath, ['-e', source], {
    cwd: fixture.repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }));
}

test('fixed executor survives concurrent invocation with exactly one application and durable receipts', {
  timeout: EXECUTOR_CHILD_TIMEOUT_MS + 15_000
}, async () => {
  const governanceRoot = fixtureGovernanceRoot(fixture.repo);
  git(['checkout', '--detach', fixture.implementationCommit], fixture.repo);
  const [left, right] = await Promise.all([runApplicationProcess(), runApplicationProcess()]);
  assert.equal(left.timedOut, false, JSON.stringify(left));
  assert.equal(right.timedOut, false, JSON.stringify(right));
  const successful = [left, right].filter(item => item.code === 0 && item.stdout.includes('PASS_APPLICATION_COMMIT_BOUND'));
  assert.equal(successful.length, 1, JSON.stringify({ left, right }));
  const applicationResult = JSON.parse(successful[0].stdout);
  fixture.applicationCommit = applicationResult.applicationCommit;
  fixture.governanceRoot = governanceRoot;
  assert.equal(applicationResult.fullPlanPackCompleted, true);
  assert.equal(applicationResult.readinessClaimed, false);
  assert.equal(text(['rev-parse', `${fixture.applicationCommit}^`], fixture.repo), implementation.CONTENT_DECISION_FREEZE.commit);
  assert.deepEqual(
    fixture.gitResolvers.resolveDiffEntries(implementation.CONTENT_DECISION_FREEZE.commit, fixture.applicationCommit),
    fixture.frozenModule.APPLICATION_DIFF_ENTRIES
  );
  assert.deepEqual(
    fixture.gitResolvers.resolveDiffPaths(implementation.CONTENT_DECISION_FREEZE.commit, fixture.applicationCommit),
    fixture.frozenModule.APPLICATION_DIFF_PATHS
  );
  assert.equal(fixture.gitResolvers.resolveDiffPaths(implementation.CONTENT_DECISION_FREEZE.commit, fixture.applicationCommit)
    .some(item => item.includes('receipt')), false);
  assert.equal(fs.existsSync(path.join(governanceRoot, fixture.frozenModule.EXECUTION_RECEIPT_FILENAME)), true);
  assert.equal(fs.existsSync(path.join(governanceRoot, fixture.frozenModule.BINDING_RECEIPT_FILENAME)), true);
  const claimName = fs.readdirSync(governanceRoot).find(item => item.startsWith('.cm2118-full-plan-application-claim-'));
  const claim = JSON.parse(fs.readFileSync(path.join(governanceRoot, claimName), 'utf8'));
  assert.equal(claim.state, 'CONSUMED_SUCCESS');
  assert.equal(claim.reconciliationRequired, false);
  assert.ok(Date.parse(claim.claimedAt) >= Date.parse(claim.finalReleaseApprovedAt));
  assert.ok(Date.parse(claim.claimedAt) < Date.parse(claim.finalReleaseExpiresAt));
  assert.match(claim.executionReceiptSha256, /^[a-f0-9]{64}$/);
  assert.match(claim.bindingReceiptSha256, /^[a-f0-9]{64}$/);
  const durable = evaluateDurableInFixture();
  assert.equal(durable.accepted, true, durable.blockers.join(','));
  assert.equal(durable.fullPlanPackCompleted, true);
  assert.equal(durable.readinessClaimed, false);
  assert.equal(durable.statusSyncAuthorized, false);
});

test('new process cannot replay consumed authorization', {
  timeout: EXECUTOR_CHILD_TIMEOUT_MS + 15_000
}, async () => {
  const before = text(['count-objects', '-v'], fixture.repo);
  const replay = await runApplicationProcess();
  assert.equal(replay.timedOut, false, JSON.stringify(replay));
  assert.equal(replay.code, 0, replay.stderr);
  const result = JSON.parse(replay.stdout);
  assert.equal(result.status, 'STOPPED');
  assert.equal(result.authorizationReplayAllowed, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(text(['count-objects', '-v'], fixture.repo), before);
});

test('durable binding rejects receipt/readiness drift instead of accepting caller-supplied objects', () => {
  const receiptPath = path.join(fixture.governanceRoot, fixture.frozenModule.BINDING_RECEIPT_FILENAME);
  const original = fs.readFileSync(receiptPath);
  const receipt = JSON.parse(original.toString('utf8'));
  receipt.payload.appliedState.readiness.productionReady = true;
  receipt.canonicalPayloadSha256 = sha256Canonical(receipt.payload);
  fs.writeFileSync(receiptPath, `${JSON.stringify(canonicalize(receipt), null, 2)}\n`);
  const rejected = evaluateDurableInFixture();
  assert.equal(rejected.accepted, false);
  fs.writeFileSync(receiptPath, original);
  assert.equal(evaluateDurableInFixture().accepted, true);
});

test('authority exports do not expose raw Git-plumbing or caller-resolver execution primitives', () => {
  assert.equal(fixture.frozenModule.createExactApplicationCommitWithGitPlumbing, undefined);
  assert.equal(fixture.frozenModule.executeFullPlanApplication, undefined);
  assert.equal(fixture.frozenModule.evaluateApplicationBindingReceipt, undefined);
  assert.equal(typeof fixture.frozenModule.executeFullPlanApplicationFromCommits, 'function');
  assert.equal(typeof fixture.frozenModule.evaluateDurableApplicationBinding, 'function');
  assert.equal(implementation.APPLICATION_DIFF_ENTRIES.filter(item => item.status === 'M').length, 4);
  assert.equal(implementation.APPLICATION_DIFF_ENTRIES.filter(item => item.status === 'A').length, 1);
});

test('external receipt writes immediately re-verify the fixed governance root', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/core/Cm2118FullPlanApplicationExecution.js'), 'utf8');
  for (const [identity, filename] of [
    ['executionReceiptIdentity', 'EXECUTION_RECEIPT_FILENAME'],
    ['bindingReceiptIdentity', 'BINDING_RECEIPT_FILENAME']
  ]) {
    assert.match(
      source,
      new RegExp(`await registry\\.verifyRoot\\(\\);\\s+${identity} = await writeExternalReceipt\\(governanceRoot, ${filename},`)
    );
  }
});
