'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const {
  LOCAL_VALIDATION_RECEIPT_PATH,
  PHASE2_APPLICATION_RECEIPT_PATH,
  buildEntrySpecs,
  buildRouteDefinition,
  buildSnapshot: buildSnapshotCore,
  canonicalize,
  sha256,
  sha256Canonical
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshot');
const {
  evaluateCm2115CanonicalFullPlanEvidenceSnapshot,
  safeSourcePath
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshotContract');
const {
  evaluateCm2115LocalValidationReceipt
} = require('../src/core/Cm2115LocalValidationReceiptContract');
const {
  DECISION_PATH: PHASE2_DECISION_PATH,
  DECISION_REFERENCE: PHASE2_DECISION_REFERENCE,
  NONCE: PHASE2_NONCE,
  RECEIPT_ID: PHASE2_RECEIPT_ID,
  REGISTRY_REFERENCE: PHASE2_REGISTRY_REFERENCE
} = require('../src/core/Cm2115R2Phase2CompletionAuditApplication');
const snapshotGit = require('../scripts/cm2115-r2-git');
const {
  IMPLEMENTATION_ARTIFACT_PATHS,
  REVIEW_IMPLEMENTATION_FREEZE,
  evaluateCm2115SnapshotReviewRequest
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract');
const {
  buildGateCiSafeSummary,
  buildReceipt,
  extractTapSummaries,
  renderCanonicalMarkdown,
  resolveFrozenPhase2DurableClaim,
  resolveGitFile: resolveSnapshotGitFile,
  resolveGitSourceObject,
  buildReviewRequest,
  resolveReviewGitFile,
  isReviewCommitAncestor,
  reviewRequestResolverOptions
} = (() => {
  const receiptGenerator = require('../scripts/generate-cm2115-local-validation-receipt');
  const snapshotGenerator = require('../src/cli/cm2115-canonical-full-plan-evidence-snapshot');
  const reviewGenerator = require('../scripts/generate-cm2115-independent-review-request');
  return {
    ...receiptGenerator,
    ...snapshotGenerator,
    buildReviewRequest: reviewGenerator.buildRequest,
    resolveReviewGitFile: reviewGenerator.resolveGitFile,
    isReviewCommitAncestor: reviewGenerator.isCommitAncestor,
    reviewRequestResolverOptions: reviewGenerator.resolverOptions
  };
})();

const VALIDATION_TARGET_COMMIT = '1'.repeat(40);
const VALIDATION_TARGET_TREE = '2'.repeat(40);

function validPhase2ApplicationReceipt() {
  return JSON.parse(fs.readFileSync(PHASE2_APPLICATION_RECEIPT_PATH, 'utf8'));
}

function bindingReceiptResolvers() {
  const receipt = validPhase2ApplicationReceipt();
  return {
    resolveGitFile: snapshotGit.resolveGitFile,
    resolveCommitTree: snapshotGit.resolveCommitTree,
    resolveParentCommit: snapshotGit.resolveParentCommit,
    resolveDiffPaths: snapshotGit.resolveDiffPaths,
    resolveGitPathState: snapshotGit.resolveGitPathState,
    resolveDurableClaim: bindingHash => ({
      schemaVersion: 1,
      registryReference: PHASE2_REGISTRY_REFERENCE,
      claimId: receipt.payload.registry.claimId,
      nonceHash: sha256(PHASE2_NONCE),
      receiptIdHash: sha256(PHASE2_RECEIPT_ID),
      bindingHash,
      decisionReference: PHASE2_DECISION_REFERENCE,
      authorizationUseCount: 1,
      authorizationReplayAllowed: false,
      patchInvocationCount: 1,
      state: 'CONSUMED_SUCCESS'
    })
  };
}

function buildSnapshot(resolveSourceObject) {
  return buildSnapshotCore(resolveSourceObject, bindingReceiptResolvers());
}

function reviewRequestResolvers() {
  return {
    ...bindingReceiptResolvers(),
    resolveGitFile: resolveReviewGitFile,
    isCommitAncestor: isReviewCommitAncestor
  };
}

function tap(tests) {
  return { tests, pass: tests, fail: 0, cancelled: 0, skipped: 0, todo: 0 };
}

function commandResult(commandId, command, tapSummaries, safeSummary = null) {
  return {
    commandId,
    command,
    exitCode: 0,
    status: 'PASS',
    tapSummaries,
    stdoutSha256: sha256(`${commandId}:stdout`),
    stderrSha256: sha256(`${commandId}:stderr`),
    safeSummary
  };
}

function validValidationReceipt() {
  return buildReceipt({
    targetCommit: VALIDATION_TARGET_COMMIT,
    targetTree: VALIDATION_TARGET_TREE,
    commandResults: [
      commandResult(
        'cm2115_r2_durable_exact_patch_focused',
        'node --test tests/cm2115-r2-durable-exact-patch-application.test.js',
        [tap(8)]
      ),
      commandResult('test_all', 'npm run test:all', [tap(5370), tap(94), tap(6)]),
      commandResult('gate_ci', 'npm run gate:ci -- --json', [tap(5370)], {
        summaryOk: true,
        fixtureOnly: true,
        noNetwork: true,
        noDaemon: true,
        noProvider: true,
        unsafeEnvOverrideDetected: false,
        failedCheckCount: 0,
        checkStatusesSha256: sha256Canonical({
          compare: 'ok',
          docs: 'ok',
          lifecyclePolicy: 'ok',
          policyPreflight: 'ok',
          queries: 'ok',
          rollback: 'ok',
          tests: 'ok'
        })
      })
    ]
  });
}

function legacyValidationReceipt(version) {
  const receipt = structuredClone(validValidationReceipt());
  if (version === 1) {
    receipt.taskId = 'CM-2115';
    receipt.receiptType = 'canonical_full_plan_local_validation_receipt_v1';
    delete receipt.payload.validationTarget.worktreeCleanAfterCommands;
    receipt.payload.commandResults[0].commandId = 'cm2115_snapshot_focused';
    receipt.payload.commandResults[0].command =
      'node --test tests/cm2115-canonical-full-plan-evidence-snapshot.test.js';
    receipt.payload.evidenceSemantics = {
      phase1RegressionTestsPassed: true,
      testAllPassed: true,
      gateCiPassed: true,
      snapshotContractTestsPassed: true
    };
  } else {
    receipt.taskId = 'CM-2115-R1';
    receipt.receiptType = 'canonical_full_plan_local_validation_receipt_v2';
    receipt.payload.commandResults[0].commandId = 'cm2115_r1_phase2_application_focused';
    receipt.payload.commandResults[0].command =
      'node --test tests/cm2115-r1-phase2-completion-audit-application.test.js';
    receipt.payload.evidenceSemantics = {
      phase1RegressionTestsPassed: true,
      testAllPassed: true,
      gateCiPassed: true,
      phase2ApplicationTestsPassed: true
    };
  }
  receipt.canonicalPayloadSha256 = sha256Canonical(receipt.payload);
  return receipt;
}

function fakeResolverFactory({ receipt = validValidationReceipt(), overrides = {} } = {}) {
  return sourcePath => {
    if (overrides[sourcePath]) return overrides[sourcePath];
    const content = sourcePath === LOCAL_VALIDATION_RECEIPT_PATH
      ? Buffer.from(`${JSON.stringify(canonicalize(receipt), null, 2)}\n`)
      : sourcePath === PHASE2_APPLICATION_RECEIPT_PATH
        ? Buffer.from(`${JSON.stringify(canonicalize(validPhase2ApplicationReceipt()), null, 2)}\n`)
        : Buffer.from(`CM-2115-R2 evidence source: ${sourcePath}\n`);
    return {
      gitObjectType: 'blob',
      gitMode: '100644',
      blobOid: crypto.createHash('sha1').update(content).digest('hex'),
      bytes: content.length,
      sha256: sha256(content),
      content
    };
  };
}

function evaluate(snapshot, resolver = fakeResolverFactory(), extras = {}) {
  const binding = bindingReceiptResolvers();
  return evaluateCm2115CanonicalFullPlanEvidenceSnapshot(snapshot, {
    resolveSourceObject: resolver,
    ...binding,
    resolveCommitTree: commit => commit === VALIDATION_TARGET_COMMIT
      ? VALIDATION_TARGET_TREE
      : binding.resolveCommitTree(commit),
    resolveParentCommit: commit => commit === snapshot.payload.baseline.sourceCommit
      ? VALIDATION_TARGET_COMMIT
      : binding.resolveParentCommit(commit),
    resolveDiffPaths: (parent, commit) => parent === VALIDATION_TARGET_COMMIT && commit === snapshot.payload.baseline.sourceCommit
      ? [LOCAL_VALIDATION_RECEIPT_PATH]
      : binding.resolveDiffPaths(parent, commit),
    isCommitAncestor: (ancestor, descendant) =>
      ancestor === VALIDATION_TARGET_COMMIT && typeof descendant === 'string' && descendant.length === 40,
    ...extras
  });
}

function mutate(snapshot, fn) {
  const copy = structuredClone(snapshot);
  fn(copy);
  copy.canonicalPayloadSha256 = sha256Canonical(copy.payload);
  return copy;
}

test('CM-2115 route table defines exactly 164 non-placeholder trace entries', () => {
  const specs = buildEntrySpecs();
  assert.equal(specs.length, 164);
  assert.equal(new Set(specs.map(spec => spec.traceKey)).size, 164);
  assert.equal(new Set(specs.map(spec => spec.evidenceField)).size, 146);
  assert.equal(specs.filter(spec => spec.evidenceKind === 'exact_authorized_receipt').length, 21);
  assert.equal(specs.filter(spec => spec.evidenceKind === 'external_review').length, 6);
  assert.equal(specs.filter(spec => spec.evidenceKind === 'local_command_gate').length, 2);
  assert.ok(specs.every(spec => spec.sourcePaths.length > 0));
  assert.ok(specs.every(spec => spec.sourcePaths.every(safeSourcePath)));
  assert.ok(specs.every(spec => !spec.sourcePaths.some(sourcePath => /future|placeholder/.test(sourcePath))));
  const phase2Applied = specs.find(spec =>
    spec.traceKey === 'phase:phase2_readonly_realtime_native_memory:phase2ReceiptBundleAppliedToCompletionAudit'
  );
  assert.deepEqual(phase2Applied.sourcePaths, [PHASE2_APPLICATION_RECEIPT_PATH]);
  const phase2Exact = specs.filter(spec =>
    spec.requirementId === 'phase2_readonly_realtime_native_memory' &&
    spec.evidenceKind === 'exact_authorized_receipt'
  );
  assert.equal(phase2Exact.length, 9);
  assert.ok(phase2Exact.every(spec => spec.sourcePaths.includes(PHASE2_APPLICATION_RECEIPT_PATH)));
  assert.equal(buildRouteDefinition().length, 164);
});

test('CM-2115 snapshot directly binds all 164 entries to source/blob/bytes/SHA identities', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  assert.equal(snapshot.payload.entries.length, 164);
  assert.equal(snapshot.payload.counts.resolvedTraceEntryCount, 164);
  assert.equal(snapshot.payload.counts.fakePlaceholderRefCount, 0);
  assert.ok(snapshot.payload.counts.uniqueSourceObjectCount > 0);
  for (const entry of snapshot.payload.entries) {
    assert.ok(entry.sourceBindings.length > 0, entry.traceKey);
    for (const source of entry.sourceBindings) {
      assert.equal(source.gitObjectType, 'blob');
      assert.match(source.blobOid, /^[a-f0-9]{40}$/);
      assert.ok(source.bytes > 0);
      assert.match(source.sha256, /^[a-f0-9]{64}$/);
    }
  }
});

test('CM-2115 snapshot contract accepts exact semantic routes and resolved source objects only', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  const result = evaluate(snapshot);
  assert.equal(result.accepted, true, result.blockers.join(','));
  assert.equal(result.readyForIndependentReview, true);
  assert.equal(result.validationReceiptAccepted, true);
  assert.equal(result.traceEntryCount, 164);
  assert.equal(result.fakePlaceholderRefCount, 0);
  assert.equal(result.independentReviewPassed, false);
  assert.equal(result.applicationAuthorized, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
});

test('canonical JSON round-trip preserves acceptance while retaining strict array order', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  const roundTripped = JSON.parse(JSON.stringify(canonicalize(snapshot)));
  const result = evaluate(roundTripped);
  assert.equal(result.accepted, true, result.blockers.join(','));
  const reordered = mutate(roundTripped, copy => {
    [copy.payload.entries[0], copy.payload.entries[1]] = [copy.payload.entries[1], copy.payload.entries[0]];
  });
  assert.equal(evaluate(reordered).accepted, false);
});

test('CM-2115 snapshot resolves all 164 routes against the frozen real Git baseline', () => {
  const snapshot = buildSnapshot(resolveGitSourceObject);
  const result = evaluateCm2115CanonicalFullPlanEvidenceSnapshot(snapshot, {
    resolveSourceObject: resolveGitSourceObject,
    ...bindingReceiptResolvers(),
    isCommitAncestor: (ancestor, descendant) => {
      const result = execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
        cwd: process.cwd(), encoding: 'utf8'
      });
      return result !== null;
    }
  });
  assert.equal(result.accepted, true, result.blockers.join(','));
  assert.equal(result.traceEntryCount, 164);
  assert.equal(result.uniqueSourceObjectCount, snapshot.payload.counts.uniqueSourceObjectCount);
  assert.equal(result.validationReceiptTargetCommit, 'd3cdc894772171c8c98dbbf6c2d19adf4fcd99e2');
});

test('snapshot CLI verifies the frozen Phase 2 claim without live registry state', () => {
  const bindingHash = '8ec9206dc2dad88f7fb88302c30bae6113b7ec0b909f37354c56c50d8f253ebc';
  const claim = resolveFrozenPhase2DurableClaim(bindingHash);
  assert.equal(claim.bindingHash, bindingHash);
  assert.equal(claim.state, 'CONSUMED_SUCCESS');
  assert.equal(claim.patchInvocationCount, 1);
  assert.equal(claim.authorizationReplayAllowed, false);
  assert.throws(
    () => resolveFrozenPhase2DurableClaim('f'.repeat(64)),
    /claim_binding_mismatch/
  );
});

test('review request generator uses the frozen Phase 2 claim without live registry state', () => {
  const bindingHash = '8ec9206dc2dad88f7fb88302c30bae6113b7ec0b909f37354c56c50d8f253ebc';
  const claim = reviewRequestResolverOptions().resolveDurableClaim(bindingHash);
  assert.equal(claim.bindingHash, bindingHash);
  assert.equal(claim.state, 'CONSUMED_SUCCESS');
  assert.equal(claim.authorizationReplayAllowed, false);
});

test('candidate Completion Audit eligibility is kept separate from authoritative state', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  assert.equal(snapshot.payload.candidateAudit.evaluatorAccepted, true);
  assert.equal(snapshot.payload.candidateAudit.evaluatorWouldReturnFullPlanPackCompleted, true);
  assert.equal(snapshot.payload.candidateAudit.completionEligibleForIndependentReview, true);
  assert.equal(snapshot.payload.candidateAudit.authoritativeFullPlanPackCompleted, false);
  assert.equal(snapshot.payload.currentState.phase8Completed, true);
  assert.equal(snapshot.payload.currentState.fullPlanPackCompleted, false);
  assert.equal(snapshot.payload.currentState.readinessClaimed, false);
});

test('snapshot contract rejects payload hash drift', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  snapshot.payload.counts.totalTraceEntryCount = 163;
  const result = evaluate(snapshot);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('snapshot.canonicalPayloadSha256'));
});

test('snapshot contract rejects missing, duplicate, and reordered entries after rehash', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  for (const candidate of [
    mutate(snapshot, copy => { copy.payload.entries.pop(); copy.payload.counts.totalTraceEntryCount = 163; }),
    mutate(snapshot, copy => { copy.payload.entries[1] = structuredClone(copy.payload.entries[0]); }),
    mutate(snapshot, copy => { [copy.payload.entries[0], copy.payload.entries[1]] = [copy.payload.entries[1], copy.payload.entries[0]]; })
  ]) {
    const result = evaluate(candidate);
    assert.equal(result.accepted, false);
    assert.ok(result.blockers.some(blocker => blocker.includes('entries.orderOrCoverage') || blocker.includes('payload.counts')));
  }
});

test('snapshot contract rejects semantically unrelated but well-formed source substitution', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  const candidate = mutate(snapshot, copy => {
    copy.payload.entries[0].sourceBindings = structuredClone(copy.payload.entries[1].sourceBindings);
  });
  const result = evaluate(candidate);
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.some(blocker => blocker.startsWith('entry.sourceCoverage.')));
});

test('snapshot construction and contract reject invalid Phase 2 application semantics', () => {
  const validResolver = fakeResolverFactory();
  const actual = validResolver(PHASE2_APPLICATION_RECEIPT_PATH);
  const receipt = JSON.parse(actual.content.toString('utf8'));
  receipt.payload.currentState.fullPlanPackCompleted = true;
  receipt.canonicalPayloadSha256 = sha256Canonical(receipt.payload);
  const content = Buffer.from(`${JSON.stringify(canonicalize(receipt), null, 2)}\n`);
  const invalidIdentity = {
    ...actual,
    blobOid: crypto.createHash('sha1').update(content).digest('hex'),
    bytes: content.length,
    sha256: sha256(content),
    content
  };
  const invalidResolver = fakeResolverFactory({
    overrides: { [PHASE2_APPLICATION_RECEIPT_PATH]: invalidIdentity }
  });
  assert.throws(() => buildSnapshot(invalidResolver), /phase2_application_binding_receipt_rejected/);

  const snapshot = buildSnapshot(validResolver);
  const binding = bindingReceiptResolvers();
  const result = evaluate(snapshot, validResolver, {
    resolveGitFile: (commit, sourcePath) => {
      const identity = binding.resolveGitFile(commit, sourcePath);
      return sourcePath === PHASE2_DECISION_PATH ? { ...identity, sha256: 'f'.repeat(64) } : identity;
    }
  });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('phase2ApplicationReceipt.contract'));
});

test('snapshot contract requires the durable Phase 2 claim to remain consumed-success', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  const withoutResolver = evaluate(snapshot, fakeResolverFactory(), { resolveDurableClaim: undefined });
  assert.equal(withoutResolver.accepted, false);
  assert.ok(withoutResolver.blockers.includes('phase2ApplicationReceipt.contract'));

  const binding = bindingReceiptResolvers();
  const nonSuccess = evaluate(snapshot, fakeResolverFactory(), {
    resolveDurableClaim: bindingHash => ({
      ...binding.resolveDurableClaim(bindingHash),
      state: 'CONSUMED_AMBIGUOUS'
    })
  });
  assert.equal(nonSuccess.accepted, false);
  assert.ok(nonSuccess.blockers.includes('phase2ApplicationReceipt.contract'));
});

test('snapshot contract rejects blob, byte, or SHA drift even after payload rehash', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  for (const field of ['blobOid', 'bytes', 'sha256']) {
    const candidate = mutate(snapshot, copy => {
      const binding = copy.payload.entries[0].sourceBindings[0];
      binding[field] = field === 'bytes' ? binding.bytes + 1 : (field === 'blobOid' ? 'a'.repeat(40) : 'b'.repeat(64));
    });
    const result = evaluate(candidate);
    assert.equal(result.accepted, false);
    assert.ok(result.blockers.some(blocker => blocker.startsWith('source.gitObjectDrift.')));
  }
});

test('snapshot contract rejects circular, private, symlink, or non-blob sources', () => {
  assert.equal(safeSourcePath('docs/near-model-memory-plan-pack/completion_audit_report.md'), false);
  assert.equal(safeSourcePath('docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md'), false);
  assert.equal(safeSourcePath('docs/near-model-memory-plan-pack/cm2115_canonical_full_plan_evidence_snapshot.json'), false);
  assert.equal(safeSourcePath('docs/near-model-memory-plan-pack/cm2115_r2_canonical_full_plan_evidence_snapshot.json'), false);
  assert.equal(safeSourcePath('.env'), false);
  assert.equal(safeSourcePath('data/private.json'), false);
  for (const sourcePath of [
    '.colameta/plan.json',
    '.colameta/memory.md',
    '.colameta/decisions.json',
    '.colameta/todolist.json',
    '.colameta/state.json',
    '.colameta/executor-session.json',
    '.colameta/settings.json',
    '.colameta/runner-settings.json',
    '.colameta/runtime',
    '.colameta/runtime/state.json',
    '.colameta/logs/runtime.md',
    '.colameta/reports/review.md',
    '.colameta/audits/audit.md',
    '.colameta/plan-patches/patch.md',
    '.colameta/tmp/cache',
    '.colameta/local/state',
    '.colameta/executor-sessions/session.json',
    '.colameta/current.lock',
    '.colameta/prompts/nested.lock'
  ]) assert.equal(safeSourcePath(sourcePath), false, sourcePath);
  const privateStatePaths = [
    '.claude/session.json',
    '.omc/state.json',
    '.tmp/cache',
    'tmp-compare.json',
    'db.sqlite',
    'data.sqlite-shm',
    'nested/data.sqlite-wal'
  ];
  for (const sourcePath of privateStatePaths) {
    assert.equal(safeSourcePath(sourcePath), false, sourcePath);
  }
  const vcsInternalPaths = [
    '.git/config',
    'nested/.git/config',
    '.hg/hgrc',
    'nested/.svn/wc.db',
    '.bzr/branch/format',
    '_darcs/inventory',
    'CVS/Root',
    'RCS/config,v',
    'SCCS/s.config',
    '.jj/repo/store/type',
    '.pijul/pristine/db',
    '.repo/manifests.git/config',
    '.sl/store/requires',
    '_MTN/options',
    '.fossil-settings/ignore-glob',
    '.fslckout',
    '_FOSSIL_'
  ];
  for (const sourcePath of vcsInternalPaths) {
    assert.equal(safeSourcePath(sourcePath), false, sourcePath);
  }
  for (const sourcePath of [
    '.colameta/prompts/system.md',
    '.colameta/rules.md',
    '.colameta/planner.json',
    '.colameta/settings.json.bak',
    '.colameta/prompts/not.locked'
  ]) assert.equal(safeSourcePath(sourcePath), true, sourcePath);

  const unsafeSnapshot = buildSnapshot(fakeResolverFactory());
  unsafeSnapshot.payload.entries[0].sourceBindings[0].sourcePath = '.colameta/settings.json';
  unsafeSnapshot.canonicalPayloadSha256 = sha256Canonical(unsafeSnapshot.payload);
  let unsafeResolverCalls = 0;
  const unsafeResult = evaluate(unsafeSnapshot, sourcePath => {
    if (sourcePath === '.colameta/settings.json') unsafeResolverCalls += 1;
    return fakeResolverFactory()(sourcePath);
  });
  assert.equal(unsafeResult.accepted, false);
  assert.ok(unsafeResult.blockers.some(blocker => blocker.startsWith('source.path.')));
  assert.equal(unsafeResolverCalls, 0);
  for (const sourcePath of privateStatePaths) {
    const privateSnapshot = buildSnapshot(fakeResolverFactory());
    privateSnapshot.payload.entries[0].sourceBindings[0].sourcePath = sourcePath;
    privateSnapshot.canonicalPayloadSha256 = sha256Canonical(privateSnapshot.payload);
    let privateResolverCalls = 0;
    const result = evaluate(privateSnapshot, resolvedPath => {
      if (resolvedPath === sourcePath) privateResolverCalls += 1;
      return fakeResolverFactory()(resolvedPath);
    });
    assert.equal(result.accepted, false, sourcePath);
    assert.ok(result.blockers.some(blocker => blocker.startsWith('source.path.')), sourcePath);
    assert.equal(privateResolverCalls, 0, sourcePath);
  }
  for (const sourcePath of vcsInternalPaths) {
    const privateSnapshot = buildSnapshot(fakeResolverFactory());
    privateSnapshot.payload.entries[0].sourceBindings[0].sourcePath = sourcePath;
    privateSnapshot.canonicalPayloadSha256 = sha256Canonical(privateSnapshot.payload);
    let resolverCalls = 0;
    const result = evaluate(privateSnapshot, resolvedPath => {
      if (resolvedPath === sourcePath) resolverCalls += 1;
      return fakeResolverFactory()(resolvedPath);
    });
    assert.equal(result.accepted, false, sourcePath);
    assert.ok(result.blockers.some(blocker => blocker.startsWith('source.path.')), sourcePath);
    assert.equal(resolverCalls, 0, sourcePath);
  }
  const resolver = fakeResolverFactory();
  const snapshot = buildSnapshot(resolver);
  const firstPath = snapshot.payload.entries[0].sourceBindings[0].sourcePath;
  const actual = resolver(firstPath);
  for (const override of [
    { ...actual, gitObjectType: 'tree' },
    { ...actual, gitMode: '120000' }
  ]) {
    const result = evaluate(snapshot, fakeResolverFactory({ overrides: { [firstPath]: override } }));
    assert.equal(result.accepted, false);
    assert.ok(result.blockers.some(blocker => blocker.startsWith('source.gitObjectDrift.')));
  }
});

test('snapshot contract requires the fresh validation receipt and its Git lineage', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  const noLineage = evaluate(snapshot, fakeResolverFactory(), {
    resolveCommitTree: undefined,
    isCommitAncestor: undefined
  });
  assert.equal(noLineage.accepted, false);
  assert.ok(noLineage.blockers.includes('validationReceipt.gitLineageResolversRequired'));

  const wrongTree = evaluate(snapshot, fakeResolverFactory(), {
    resolveCommitTree: () => '3'.repeat(40)
  });
  assert.equal(wrongTree.accepted, false);
  assert.ok(wrongTree.blockers.includes('validationReceipt.targetTree'));

  const unrelated = evaluate(snapshot, fakeResolverFactory(), {
    isCommitAncestor: () => false
  });
  assert.equal(unrelated.accepted, false);
  assert.ok(unrelated.blockers.includes('validationReceipt.targetNotAncestorOfBaseline'));

  const staleAncestor = evaluate(snapshot, fakeResolverFactory(), {
    resolveParentCommit: () => '4'.repeat(40)
  });
  assert.equal(staleAncestor.accepted, false);
  assert.ok(staleAncestor.blockers.includes('validationReceipt.notExactBaselineParent'));
});

test('R2 snapshot rejects legacy validation receipts accepted by the shared validator', () => {
  for (const version of [1, 2]) {
    const receipt = legacyValidationReceipt(version);
    assert.equal(evaluateCm2115LocalValidationReceipt(receipt).accepted, true, `legacy v${version}`);
    const resolver = fakeResolverFactory({ receipt });
    const snapshot = buildSnapshot(resolver);
    const result = evaluate(snapshot, resolver);
    assert.equal(result.accepted, false, `legacy v${version}`);
    assert.ok(result.blockers.includes('validationReceipt.currentR2Required'), `legacy v${version}`);
  }
});

test('local validation receipt contract rejects failed command or completion/readiness overclaim', () => {
  const receipt = validValidationReceipt();
  assert.equal(evaluateCm2115LocalValidationReceipt(receipt).accepted, true);
  const failed = structuredClone(receipt);
  failed.payload.commandResults[0].exitCode = 1;
  failed.canonicalPayloadSha256 = sha256Canonical(failed.payload);
  assert.equal(evaluateCm2115LocalValidationReceipt(failed).accepted, false);
  const completed = structuredClone(receipt);
  completed.payload.currentState.fullPlanPackCompleted = true;
  completed.canonicalPayloadSha256 = sha256Canonical(completed.payload);
  assert.equal(evaluateCm2115LocalValidationReceipt(completed).accepted, false);
  const ready = structuredClone(receipt);
  ready.payload.currentState.readinessClaimed = true;
  ready.canonicalPayloadSha256 = sha256Canonical(ready.payload);
  assert.equal(evaluateCm2115LocalValidationReceipt(ready).accepted, false);
  const dirtyAfter = structuredClone(receipt);
  dirtyAfter.payload.validationTarget.worktreeCleanAfterCommands = false;
  dirtyAfter.canonicalPayloadSha256 = sha256Canonical(dirtyAfter.payload);
  assert.equal(evaluateCm2115LocalValidationReceipt(dirtyAfter).accepted, false);
  const incompleteGateCoverage = structuredClone(receipt);
  incompleteGateCoverage.payload.commandResults[2].safeSummary.checkStatusesSha256 =
    sha256Canonical({ tests: 'ok' });
  incompleteGateCoverage.canonicalPayloadSha256 = sha256Canonical(incompleteGateCoverage.payload);
  assert.equal(evaluateCm2115LocalValidationReceipt(incompleteGateCoverage).accepted, false);
});

test('local validation receipt generator requires an explicit safe gate environment summary', () => {
  const safeSummary = {
    ok: true,
    fixtureOnly: true,
    noNetwork: true,
    noDaemon: true,
    noProvider: true,
    unsafeEnvOverrideDetected: false,
    failedChecks: []
  };
  assert.equal(buildGateCiSafeSummary({ summary: safeSummary, checks: {} }).unsafeEnvOverrideDetected, false);

  const missing = { ...safeSummary };
  delete missing.unsafeEnvOverrideDetected;
  assert.throws(
    () => buildGateCiSafeSummary({ summary: missing, checks: {} }),
    /cm2115_gate_ci_unsafe_env_override_status_required/
  );

  const renamed = { ...missing, unsafeEnvironmentOverrideDetected: false };
  assert.throws(
    () => buildGateCiSafeSummary({ summary: renamed, checks: {} }),
    /cm2115_gate_ci_unsafe_env_override_status_required/
  );

  assert.throws(
    () => buildGateCiSafeSummary({
      summary: { ...safeSummary, unsafeEnvOverrideDetected: true },
      checks: {}
    }),
    /cm2115_gate_ci_unsafe_env_override_status_required/
  );
});

test('snapshot review boundary cannot be promoted inside snapshot preparation', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  const mutations = [
    copy => { copy.payload.reviewBoundary.independentReviewPassed = true; },
    copy => { copy.payload.reviewBoundary.applicationAuthorized = true; },
    copy => { copy.payload.semanticEvidenceChecks.supersededCm2074UsedAsCurrentAuthority = true; },
    copy => { copy.payload.semanticEvidenceChecks.supersededR1UsedAsCurrentAuthority = true; },
    copy => { copy.payload.currentState.fullPlanPackCompleted = true; },
    copy => { copy.payload.currentState.readinessClaimed = true; },
    copy => { copy.payload.nonClaims.productionReady = true; },
    copy => { copy.payload.sideEffects.remoteActions = 1; }
  ];
  for (const change of mutations) {
    const result = evaluate(mutate(snapshot, change));
    assert.equal(result.accepted, false);
  }
});

test('TAP extraction returns only complete summary groups', () => {
  const output = [
    '# tests 12',
    '# pass 12',
    '# fail 0',
    '# cancelled 0',
    '# skipped 0',
    '# todo 0',
    '# duration_ms 10',
    '# tests 2',
    '# pass 2',
    '# fail 0',
    '# cancelled 0',
    '# skipped 0',
    '# todo 0',
    '# duration_ms 1'
  ].join('\n');
  assert.deepEqual(extractTapSummaries(output), [tap(12), tap(2)]);
});

test('canonical Markdown is a complete content-equivalent JSON mirror', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  const jsonText = `${JSON.stringify(canonicalize(snapshot), null, 2)}\n`;
  const markdown = renderCanonicalMarkdown(snapshot, jsonText);
  assert.ok(markdown.includes(jsonText.trimEnd()));
  assert.ok(markdown.includes('Authoritative fullPlanPackCompleted: `false`'));
  assert.ok(markdown.includes('Readiness claimed: `false`'));
});

test('independent review request binds the frozen snapshot and stays non-authoritative', () => {
  const request = buildReviewRequest();
  const result = evaluateCm2115SnapshotReviewRequest(request, reviewRequestResolvers());
  assert.equal(result.accepted, true, result.blockers.join(','));
  assert.equal(result.snapshotContractAccepted, true);
  assert.equal(result.readyToSubmitForIndependentReview, true);
  assert.equal(result.independentReviewPassed, false);
  assert.equal(result.applicationAuthorized, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
  assert.equal(request.payload.reviewImplementation.commit, REVIEW_IMPLEMENTATION_FREEZE.commit);
  assert.equal(request.payload.reviewImplementation.tree, REVIEW_IMPLEMENTATION_FREEZE.tree);
  assert.match(
    resolveReviewGitFile(
      REVIEW_IMPLEMENTATION_FREEZE.commit,
      'src/core/Cm2115CanonicalFullPlanEvidenceSnapshotContract.js'
    ).content.toString('utf8'),
    /VCS_INTERNAL_PATH_COMPONENTS/
  );
  assert.match(
    resolveReviewGitFile(
      REVIEW_IMPLEMENTATION_FREEZE.commit,
      'src/core/Cm2115R2Phase2CompletionAuditApplication.js'
    ).content.toString('utf8'),
    /decision\.authorityBaseline/
  );

  const staleRequest = structuredClone(request);
  staleRequest.payload.reviewImplementation = {
    commit: '5a2494dd6fc6a3c72015b3f92cf2940759b77b5d',
    tree: 'ab04eff94dc1655378a6f88e5cdbf1ddf3f82d14',
    artifacts: IMPLEMENTATION_ARTIFACT_PATHS.map(artifactPath => ({
      path: artifactPath,
      blobOid: resolveReviewGitFile('5a2494dd6fc6a3c72015b3f92cf2940759b77b5d', artifactPath).blobOid
    }))
  };
  staleRequest.canonicalPayloadSha256 = sha256Canonical(staleRequest.payload);
  const staleResult = evaluateCm2115SnapshotReviewRequest(staleRequest, reviewRequestResolvers());
  assert.equal(staleResult.accepted, false);
  assert.ok(staleResult.blockers.includes('payload.reviewImplementation'));
});

test('independent review request requires the exact implementation parent and diff paths', () => {
  const request = buildReviewRequest();
  const parentDrift = evaluateCm2115SnapshotReviewRequest(request, {
    ...reviewRequestResolvers(),
    resolveParentCommit: commit => commit === request.payload.reviewImplementation.commit
      ? 'f'.repeat(40)
      : snapshotGit.resolveParentCommit(commit)
  });
  assert.equal(parentDrift.accepted, false);
  assert.ok(parentDrift.blockers.includes('reviewImplementation.parent'));

  const diffDrift = evaluateCm2115SnapshotReviewRequest(request, {
    ...reviewRequestResolvers(),
    resolveDiffPaths: (parent, commit) => parent === REVIEW_IMPLEMENTATION_FREEZE.parentCommit &&
        commit === request.payload.reviewImplementation.commit
      ? ['src/core/Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract.js']
      : snapshotGit.resolveDiffPaths(parent, commit)
  });
  assert.equal(diffDrift.accepted, false);
  assert.ok(diffDrift.blockers.includes('reviewImplementation.diffPaths'));
});

test('review request cannot self-approve review, application, completion, or readiness', () => {
  const original = buildReviewRequest();
  const mutations = [
    copy => { copy.payload.requestedDecisionBoundary.independentSnapshotReviewPassed = true; },
    copy => { copy.payload.requestedDecisionBoundary.applicationPreparationAuthorizedByReviewRequest = true; },
    copy => { copy.payload.requestedDecisionBoundary.applicationExecutionAuthorizedByReviewRequest = true; },
    copy => { copy.payload.currentState.fullPlanPackCompleted = true; },
    copy => { copy.payload.currentState.readinessClaimed = true; },
    copy => { copy.payload.snapshot.json.blobOid = 'a'.repeat(40); },
    copy => { copy.payload.reviewImplementation.artifacts.pop(); }
  ];
  for (const change of mutations) {
    const candidate = structuredClone(original);
    change(candidate);
    candidate.canonicalPayloadSha256 = sha256Canonical(candidate.payload);
    const result = evaluateCm2115SnapshotReviewRequest(candidate, reviewRequestResolvers());
    assert.equal(result.accepted, false);
  }
});
