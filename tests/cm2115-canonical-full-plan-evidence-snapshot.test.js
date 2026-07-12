'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');

const {
  LOCAL_VALIDATION_RECEIPT_PATH,
  PHASE2_APPLICATION_RECEIPT_PATH,
  buildEntrySpecs,
  buildRouteDefinition,
  buildSnapshot,
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
  buildDecision: buildPhase2Decision,
  buildReceiptPayload: buildPhase2ReceiptPayload,
  gitBlobOid,
  serializeArtifact: serializePhase2Decision,
  sha256Canonical: sha256Phase2Canonical
} = require('../src/core/Cm2115R1Phase2CompletionAuditApplication');
const {
  evaluateCm2115SnapshotReviewRequest
} = require('../src/core/Cm2115CanonicalFullPlanEvidenceSnapshotReviewRequestContract');
const {
  buildReceipt,
  extractTapSummaries,
  renderCanonicalMarkdown,
  resolveGitFile: resolveSnapshotGitFile,
  resolveGitSourceObject,
  buildReviewRequest,
  resolveReviewGitFile,
  isReviewCommitAncestor
} = (() => {
  const receiptGenerator = require('../scripts/generate-cm2115-local-validation-receipt');
  const snapshotGenerator = require('../src/cli/cm2115-canonical-full-plan-evidence-snapshot');
  const reviewGenerator = require('../scripts/generate-cm2115-independent-review-request');
  return {
    ...receiptGenerator,
    ...snapshotGenerator,
    buildReviewRequest: reviewGenerator.buildRequest,
    resolveReviewGitFile: reviewGenerator.resolveGitFile,
    isReviewCommitAncestor: reviewGenerator.isCommitAncestor
  };
})();

const VALIDATION_TARGET_COMMIT = '1'.repeat(40);
const VALIDATION_TARGET_TREE = '2'.repeat(40);

function fakePhase2DecisionIdentity() {
  const content = Buffer.from(serializePhase2Decision(buildPhase2Decision()));
  return {
    sourceCommit: '3'.repeat(40),
    sourceTree: '4'.repeat(40),
    sourcePath: PHASE2_DECISION_PATH,
    blobOid: gitBlobOid(content),
    bytes: content.length,
    sha256: sha256(content)
  };
}

function validPhase2ApplicationReceipt() {
  const receiptPayload = buildPhase2ReceiptPayload(fakePhase2DecisionIdentity());
  return {
    receiptPayload,
    receiptPayloadSha256: sha256Phase2Canonical(receiptPayload)
  };
}

function fakePhase2DecisionResolver(commit, sourcePath) {
  const identity = fakePhase2DecisionIdentity();
  if (commit !== identity.sourceCommit || sourcePath !== identity.sourcePath) {
    throw new Error('fake_phase2_decision_missing');
  }
  return {
    ...identity,
    content: Buffer.from(serializePhase2Decision(buildPhase2Decision()))
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
        'cm2115_r1_phase2_application_focused',
        'node --test tests/cm2115-r1-phase2-completion-audit-application.test.js',
        [tap(6)]
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
        checkStatusesSha256: sha256Canonical({ compare: 'ok', rollback: 'ok', tests: 'ok' })
      })
    ]
  });
}

function fakeResolverFactory({ receipt = validValidationReceipt(), overrides = {} } = {}) {
  return sourcePath => {
    if (overrides[sourcePath]) return overrides[sourcePath];
    const content = sourcePath === LOCAL_VALIDATION_RECEIPT_PATH
      ? Buffer.from(`${JSON.stringify(canonicalize(receipt), null, 2)}\n`)
      : sourcePath === PHASE2_APPLICATION_RECEIPT_PATH
        ? Buffer.from(`${JSON.stringify(canonicalize(validPhase2ApplicationReceipt()), null, 2)}\n`)
        : Buffer.from(`CM-2115-R1 evidence source: ${sourcePath}\n`);
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
  return evaluateCm2115CanonicalFullPlanEvidenceSnapshot(snapshot, {
    resolveSourceObject: resolver,
    resolveCommitTree: commit => commit === VALIDATION_TARGET_COMMIT ? VALIDATION_TARGET_TREE : null,
    isCommitAncestor: (ancestor, descendant) =>
      ancestor === VALIDATION_TARGET_COMMIT && typeof descendant === 'string' && descendant.length === 40,
    resolveGitFile: fakePhase2DecisionResolver,
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
    resolveCommitTree: commit => execFileSync('git', ['rev-parse', `${commit}^{tree}`], {
      cwd: process.cwd(), encoding: 'utf8'
    }).trim(),
    resolveGitFile: resolveSnapshotGitFile,
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
  assert.equal(result.validationReceiptTargetCommit, '3e7edf9da62347afa15595bca5ec8fbdad19f415');
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
  receipt.receiptPayload.currentState.fullPlanPackCompleted = true;
  receipt.receiptPayloadSha256 = sha256Phase2Canonical(receipt.receiptPayload);
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
  assert.throws(() => buildSnapshot(invalidResolver), /phase2_application_receipt_rejected/);

  const snapshot = buildSnapshot(validResolver);
  const result = evaluate(snapshot, validResolver, {
    resolveGitFile: () => ({
      ...fakePhase2DecisionResolver('3'.repeat(40), PHASE2_DECISION_PATH),
      sha256: 'f'.repeat(64)
    })
  });
  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('phase2ApplicationReceipt.contract'));
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
  assert.equal(safeSourcePath('.env'), false);
  assert.equal(safeSourcePath('data/private.json'), false);
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
});

test('snapshot review boundary cannot be promoted inside snapshot preparation', () => {
  const snapshot = buildSnapshot(fakeResolverFactory());
  const mutations = [
    copy => { copy.payload.reviewBoundary.independentReviewPassed = true; },
    copy => { copy.payload.reviewBoundary.applicationAuthorized = true; },
    copy => { copy.payload.semanticEvidenceChecks.supersededCm2074UsedAsCurrentAuthority = true; },
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
  const result = evaluateCm2115SnapshotReviewRequest(request, {
    resolveGitFile: resolveReviewGitFile,
    resolveCommitTree: commit => execFileSync('git', ['rev-parse', `${commit}^{tree}`], {
      cwd: process.cwd(), encoding: 'utf8'
    }).trim(),
    isCommitAncestor: isReviewCommitAncestor
  });
  assert.equal(result.accepted, true, result.blockers.join(','));
  assert.equal(result.snapshotContractAccepted, true);
  assert.equal(result.readyToSubmitForIndependentReview, true);
  assert.equal(result.independentReviewPassed, false);
  assert.equal(result.applicationAuthorized, false);
  assert.equal(result.fullPlanPackCompleted, false);
  assert.equal(result.readinessClaimed, false);
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
    const result = evaluateCm2115SnapshotReviewRequest(candidate, {
      resolveGitFile: resolveReviewGitFile,
      resolveCommitTree: commit => execFileSync('git', ['rev-parse', `${commit}^{tree}`], {
        cwd: process.cwd(), encoding: 'utf8'
      }).trim(),
      isCommitAncestor: isReviewCommitAncestor
    });
    assert.equal(result.accepted, false);
  }
});
