'use strict';

const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const {
  APPLICATION_STATE_PATH,
  AUTHORITY_PATH,
  BINDING_RECEIPT_PATH,
  Cm2115R2ApplicationClaimRegistry,
  DECISION_PATH,
  EXECUTION_RECEIPT_PATH,
  GOVERNANCE_ROOT_IDENTITY,
  PATCH_PATHS,
  buildAuthorityIntake,
  buildBindingReceiptPayload,
  buildClaimBindingHash,
  buildDecision,
  buildPatchTargets,
  canonicalize,
  evaluateAuthorityIntake,
  evaluateBindingReceipt,
  evaluateDecision,
  evaluateExecutionReceipt,
  executeExactPatch,
  expectedApplicationDiffPaths,
  fileProjection,
  identityWithoutContent,
  serializeArtifact,
  sha256Canonical,
  wrapPayload
} = require('../src/core/Cm2115R2Phase2CompletionAuditApplication');
const {
  CM2080,
  PHASE2_MANIFEST,
  WINDOWS_WSL_RECEIPT
} = require('../src/core/Cm2115R1Phase2CompletionAuditApplication');
const { resolveGitFile: resolveRealGitFile } = require('../scripts/cm2115-r2-git');
const { parseArgs: parseApplyArgs } = require('../scripts/apply-cm2115-r2-phase2-completion-audit');
const { parseArgs: parseBindingArgs } = require('../scripts/generate-cm2115-r2-application-binding-receipt');

const ROOT = path.join(__dirname, '..');
const BASELINE_COMMIT = '1'.repeat(40);
const BASELINE_TREE = '2'.repeat(40);
const DECISION_COMMIT = '3'.repeat(40);
const DECISION_TREE = '4'.repeat(40);
const APPLICATION_COMMIT = '5'.repeat(40);
const APPLICATION_TREE = '6'.repeat(40);
const FROZEN_FIXTURE_BASELINE_COMMIT = 'f458277d0d929c4fcf24748ac56ee63eca186558';

function gitIdentity({ sourceCommit, sourceTree, sourcePath, content, gitMode = '100644' }) {
  const projection = fileProjection(content, gitMode);
  return {
    sourceCommit,
    sourceTree,
    sourcePath,
    gitMode,
    gitObjectType: 'blob',
    ...projection,
    content
  };
}

function authorityFixture() {
  return gitIdentity({
    sourceCommit: BASELINE_COMMIT,
    sourceTree: BASELINE_TREE,
    sourcePath: AUTHORITY_PATH,
    content: Buffer.from(serializeArtifact(buildAuthorityIntake()))
  });
}

function targetBaselineResolver(sourcePath) {
  const content = resolveRealGitFile(FROZEN_FIXTURE_BASELINE_COMMIT, sourcePath).content;
  return gitIdentity({ sourceCommit: BASELINE_COMMIT, sourceTree: BASELINE_TREE, sourcePath, content });
}

async function writeFrozenBaselineFile(root, sourcePath) {
  const target = path.join(root, sourcePath);
  await fsp.mkdir(path.dirname(target), { recursive: true });
  await fsp.writeFile(target, targetBaselineResolver(sourcePath).content, { flag: 'wx' });
}

function decisionFixture() {
  const authority = authorityFixture();
  const targets = buildPatchTargets(targetBaselineResolver);
  const decision = buildDecision({
    authorityGitIdentity: identityWithoutContent(authority),
    baselineCommit: BASELINE_COMMIT,
    baselineTree: BASELINE_TREE,
    targets
  });
  const identity = gitIdentity({
    sourceCommit: DECISION_COMMIT,
    sourceTree: DECISION_TREE,
    sourcePath: DECISION_PATH,
    content: Buffer.from(serializeArtifact(decision))
  });
  return { authority, targets, decision, identity };
}

function resolverFor({ decision, decisionIdentity, authority, applicationFiles = new Map(), executionReceiptIdentity = null } = {}) {
  return (commit, sourcePath) => {
    if (commit === DECISION_COMMIT && sourcePath === DECISION_PATH) return { ...decisionIdentity, content: Buffer.from(decisionIdentity.content) };
    if (commit === BASELINE_COMMIT && sourcePath === AUTHORITY_PATH) return { ...authority, content: Buffer.from(authority.content) };
    if (commit === CM2080.sourceCommit && sourcePath === CM2080.sourcePath) return resolveRealGitFile(commit, sourcePath);
    if (commit === PHASE2_MANIFEST.sourceCommit && sourcePath === PHASE2_MANIFEST.sourcePath) return resolveRealGitFile(commit, sourcePath);
    if (commit === WINDOWS_WSL_RECEIPT.sourceCommit && sourcePath === WINDOWS_WSL_RECEIPT.sourcePath) return resolveRealGitFile(commit, sourcePath);
    if (commit === APPLICATION_COMMIT && sourcePath === EXECUTION_RECEIPT_PATH && executionReceiptIdentity) return { ...executionReceiptIdentity, content: Buffer.from(executionReceiptIdentity.content) };
    const key = `${commit}:${sourcePath}`;
    if (applicationFiles.has(key)) return applicationFiles.get(key);
    if ((commit === BASELINE_COMMIT || commit === DECISION_COMMIT) && PATCH_PATHS.includes(sourcePath) && sourcePath !== APPLICATION_STATE_PATH) {
      return targetBaselineResolver(sourcePath);
    }
    throw new Error(`missing:${key}`);
  };
}

async function prepareTempExecution(t) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'cm2115-r2-'));
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  for (const sourcePath of PATCH_PATHS.filter(item => item !== APPLICATION_STATE_PATH)) {
    await writeFrozenBaselineFile(root, sourcePath);
  }
  const governanceRoot = path.join(root, 'governance-root');
  await fsp.mkdir(governanceRoot);
  await fsp.writeFile(
    path.join(governanceRoot, '.phase8-registry-root-identity.json'),
    JSON.stringify(canonicalize(GOVERNANCE_ROOT_IDENTITY)),
    { flag: 'wx' }
  );
  const fixture = decisionFixture();
  const resolver = resolverFor({ decision: fixture.decision, decisionIdentity: fixture.identity, authority: fixture.authority });
  return { root, governanceRoot, resolver, ...fixture };
}

test('CM-2115-R2 authority intake and exact patch decision fail closed on drift', () => {
  const intake = buildAuthorityIntake();
  assert.equal(evaluateAuthorityIntake(intake).accepted, true);
  const fixture = decisionFixture();
  const resolver = resolverFor({ decision: fixture.decision, decisionIdentity: fixture.identity, authority: fixture.authority });
  assert.equal(evaluateDecision(fixture.decision, { resolveGitFile: resolver }).accepted, true);
  const drift = structuredClone(fixture.decision);
  drift.payload.patchPlan.targets[0].after.sha256 = 'f'.repeat(64);
  drift.canonicalPayloadSha256 = sha256Canonical(drift.payload);
  assert.equal(evaluateDecision(drift, { resolveGitFile: resolver }).accepted, false);
});

test('CM-2115-R2 durable claim allows exactly one serial or concurrent claimant', async t => {
  const fixture = await prepareTempExecution(t);
  const firstRegistry = new Cm2115R2ApplicationClaimRegistry({ governanceRoot: fixture.governanceRoot });
  const secondRegistry = new Cm2115R2ApplicationClaimRegistry({ governanceRoot: fixture.governanceRoot });
  const bindingHash = buildClaimBindingHash(identityWithoutContent(fixture.identity), fixture.decision);
  const results = await Promise.allSettled([
    firstRegistry.claim(bindingHash, fixture.decision.payload.decisionReference),
    secondRegistry.claim(bindingHash, fixture.decision.payload.decisionReference)
  ]);
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(results.filter(item => item.status === 'rejected').length, 1);
  await assert.rejects(
    () => new Cm2115R2ApplicationClaimRegistry({ governanceRoot: fixture.governanceRoot }).claim('f'.repeat(64), fixture.decision.payload.decisionReference),
    /already_claimed/
  );
});

test('CM-2115-R2 executes one exact patch and a fresh registry instance cannot replay it', async t => {
  const fixture = await prepareTempExecution(t);
  const registry = new Cm2115R2ApplicationClaimRegistry({ governanceRoot: fixture.governanceRoot });
  const result = await executeExactPatch({
    repoRoot: fixture.root,
    decision: fixture.decision,
    decisionIdentity: fixture.identity,
    authorityIdentity: fixture.authority,
    resolveGitFile: fixture.resolver,
    registry
  });
  assert.equal(result.accepted, true);
  assert.equal(result.state, 'CONSUMED_SUCCESS');
  assert.equal(result.receipt.payload.currentState.phase2ReceiptBundleAppliedToCompletionAudit, false);
  assert.equal(evaluateExecutionReceipt(result.receipt, { resolveGitFile: fixture.resolver }).accepted, true);
  for (const target of fixture.targets) {
    const bytes = await fsp.readFile(path.join(fixture.root, target.sourcePath));
    assert.deepEqual(fileProjection(bytes, target.after.gitMode), target.after);
  }
  for (const sourcePath of PATCH_PATHS.filter(item => item !== APPLICATION_STATE_PATH)) {
    await fsp.writeFile(path.join(fixture.root, sourcePath), targetBaselineResolver(sourcePath).content);
  }
  await fsp.rm(path.join(fixture.root, APPLICATION_STATE_PATH));
  await fsp.rm(path.join(fixture.root, EXECUTION_RECEIPT_PATH));
  await fsp.rm(path.join(fixture.root, EXECUTION_RECEIPT_PATH.replace(/\.json$/, '.md')));
  await assert.rejects(
    () => executeExactPatch({
      repoRoot: fixture.root,
      decision: fixture.decision,
      decisionIdentity: fixture.identity,
      authorityIdentity: fixture.authority,
      resolveGitFile: fixture.resolver,
      registry: new Cm2115R2ApplicationClaimRegistry({ governanceRoot: fixture.governanceRoot })
    }),
    /already_claimed/
  );
  const childScript = [
    "const {Cm2115R2ApplicationClaimRegistry}=require(process.argv[1]);",
    "const registry=new Cm2115R2ApplicationClaimRegistry({governanceRoot:process.argv[2]});",
    "registry.claim(process.argv[3],process.argv[4]).then(()=>{process.stdout.write('UNEXPECTED_SUCCESS');process.exit(2);}).catch(error=>process.stdout.write(error.message));"
  ].join('');
  const childOutput = execFileSync(process.execPath, [
    '-e',
    childScript,
    path.join(ROOT, 'src/core/Cm2115R2Phase2CompletionAuditApplication.js'),
    fixture.governanceRoot,
    buildClaimBindingHash(identityWithoutContent(fixture.identity), fixture.decision),
    fixture.decision.payload.decisionReference
  ], { encoding: 'utf8' });
  assert.match(childOutput, /authorization_already_claimed/);
});

test('CM-2115-R2 corrupt or binding-drifted claim fails closed without patch', async t => {
  const fixture = await prepareTempExecution(t);
  const registry = new Cm2115R2ApplicationClaimRegistry({ governanceRoot: fixture.governanceRoot });
  await fsp.writeFile(registry.claimPath, '{broken', { flag: 'wx' });
  await assert.rejects(() => registry.read(), /claim_corrupt/);
  await assert.rejects(() => registry.claim('a'.repeat(64), fixture.decision.payload.decisionReference), /already_claimed/);
  for (const sourcePath of PATCH_PATHS.filter(item => item !== APPLICATION_STATE_PATH)) {
    assert.deepEqual(await fsp.readFile(path.join(fixture.root, sourcePath)), targetBaselineResolver(sourcePath).content);
  }
});

test('CM-2115-R2 refuses a missing, replaced, or symlinked governance identity', async t => {
  const fixture = await prepareTempExecution(t);
  const identityPath = path.join(fixture.governanceRoot, '.phase8-registry-root-identity.json');
  await fsp.rm(identityPath);
  const registry = new Cm2115R2ApplicationClaimRegistry({ governanceRoot: fixture.governanceRoot });
  await assert.rejects(() => registry.claim('a'.repeat(64), fixture.decision.payload.decisionReference));
  await fsp.writeFile(identityPath, '{}');
  await assert.rejects(() => registry.claim('a'.repeat(64), fixture.decision.payload.decisionReference), /identity_mismatch/);
  await fsp.rm(identityPath);
  await fsp.symlink(path.join(ROOT, 'AGENTS.md'), identityPath);
  await assert.rejects(() => registry.claim('a'.repeat(64), fixture.decision.payload.decisionReference), /identity_invalid/);
});

test('CM-2115-R2 execution receipt re-resolves all upstream Git objects', async t => {
  const fixture = await prepareTempExecution(t);
  const result = await executeExactPatch({
    repoRoot: fixture.root,
    decision: fixture.decision,
    decisionIdentity: fixture.identity,
    authorityIdentity: fixture.authority,
    resolveGitFile: fixture.resolver,
    registry: new Cm2115R2ApplicationClaimRegistry({ governanceRoot: fixture.governanceRoot })
  });
  const calls = [];
  const trackingResolver = (commit, sourcePath) => {
    calls.push(`${commit}:${sourcePath}`);
    return fixture.resolver(commit, sourcePath);
  };
  assert.equal(evaluateExecutionReceipt(result.receipt, { resolveGitFile: trackingResolver }).accepted, true);
  for (const expected of [
    `${DECISION_COMMIT}:${DECISION_PATH}`,
    `${BASELINE_COMMIT}:${AUTHORITY_PATH}`,
    `${CM2080.sourceCommit}:${CM2080.sourcePath}`,
    `${PHASE2_MANIFEST.sourceCommit}:${PHASE2_MANIFEST.sourcePath}`,
    `${WINDOWS_WSL_RECEIPT.sourceCommit}:${WINDOWS_WSL_RECEIPT.sourcePath}`
  ]) assert.ok(calls.includes(expected), expected);
  const rejectingResolver = (commit, sourcePath) => {
    if (sourcePath === PHASE2_MANIFEST.sourcePath) throw new Error('blocked');
    return fixture.resolver(commit, sourcePath);
  };
  assert.equal(evaluateExecutionReceipt(result.receipt, { resolveGitFile: rejectingResolver }).accepted, false);
});

test('CM-2115-R2 binding receipt requires exact parent, diff, targets, and execution receipt', async t => {
  const fixture = await prepareTempExecution(t);
  const execution = await executeExactPatch({
    repoRoot: fixture.root,
    decision: fixture.decision,
    decisionIdentity: fixture.identity,
    authorityIdentity: fixture.authority,
    resolveGitFile: fixture.resolver,
    registry: new Cm2115R2ApplicationClaimRegistry({ governanceRoot: fixture.governanceRoot })
  });
  const executionBytes = Buffer.from(serializeArtifact(execution.receipt));
  const executionIdentity = gitIdentity({
    sourceCommit: APPLICATION_COMMIT,
    sourceTree: APPLICATION_TREE,
    sourcePath: EXECUTION_RECEIPT_PATH,
    content: executionBytes
  });
  const files = new Map();
  for (const target of fixture.targets) {
    const bytes = await fsp.readFile(path.join(fixture.root, target.sourcePath));
    files.set(`${APPLICATION_COMMIT}:${target.sourcePath}`, gitIdentity({sourceCommit:APPLICATION_COMMIT,sourceTree:APPLICATION_TREE,sourcePath:target.sourcePath,content:bytes,gitMode:target.after.gitMode}));
  }
  const resolver = resolverFor({
    decision: fixture.decision,
    decisionIdentity: fixture.identity,
    authority: fixture.authority,
    applicationFiles: files,
    executionReceiptIdentity: executionIdentity
  });
  const diffPaths = expectedApplicationDiffPaths();
  const payload = buildBindingReceiptPayload({
    applicationCommit: APPLICATION_COMMIT,
    applicationTree: APPLICATION_TREE,
    applicationParentCommit: DECISION_COMMIT,
    applicationParentTree: DECISION_TREE,
    decisionIdentity: fixture.identity,
    executionReceiptIdentity: executionIdentity,
    decision: fixture.decision,
    diffPathsSha256: sha256Canonical(diffPaths)
  });
  const receipt = wrapPayload(payload, 'phase2_exact_patch_application_git_binding_receipt_v1');
  const options = {
    resolveGitFile: resolver,
    resolveCommitTree: commit => ({[APPLICATION_COMMIT]:APPLICATION_TREE,[DECISION_COMMIT]:DECISION_TREE}[commit]),
    resolveParentCommit: commit => commit === APPLICATION_COMMIT ? DECISION_COMMIT : BASELINE_COMMIT,
    resolveDiffPaths: () => [...diffPaths]
  };
  assert.equal(evaluateBindingReceipt(receipt, options).accepted, true);
  const drift = structuredClone(receipt);
  drift.payload.application.targets[0].after.sha256 = 'f'.repeat(64);
  drift.canonicalPayloadSha256 = sha256Canonical(drift.payload);
  assert.equal(evaluateBindingReceipt(drift, options).accepted, false);
  assert.equal(evaluateBindingReceipt(receipt, {
    ...options,
    resolveDiffPaths: () => [...diffPaths, 'unexpected.txt']
  }).accepted, false);
  assert.equal(evaluateBindingReceipt(receipt, {
    ...options,
    resolveParentCommit: () => BASELINE_COMMIT
  }).accepted, false);
  assert.equal(receipt.payload.currentState.phase2ReceiptBundleAppliedToCompletionAudit, true);
  assert.equal(receipt.payload.currentState.fullPlanPackCompleted, false);
  assert.equal(receipt.payload.currentState.readinessClaimed, false);
});

test('CM-2115-R2 production CLIs reject alternate output paths and extra arguments', () => {
  assert.deepEqual(parseApplyArgs(['--decision-commit', DECISION_COMMIT]), { decisionCommit: DECISION_COMMIT });
  assert.throws(() => parseApplyArgs(['--decision-commit', DECISION_COMMIT, '--output-json', '/tmp/x']), /no_other_arguments/);
  assert.deepEqual(parseBindingArgs(['--application-commit', APPLICATION_COMMIT]), { applicationCommit: APPLICATION_COMMIT });
  assert.throws(() => parseBindingArgs(['--application-commit', APPLICATION_COMMIT, '--output-json', '/tmp/x']), /no_other_arguments/);
  assert.equal(BINDING_RECEIPT_PATH.endsWith('.json'), true);
});
