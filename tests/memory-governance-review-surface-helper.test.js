const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const {
  PUBLIC_MCP_TOOLS,
  REQUIRED_APPROVALS,
  REQUIRED_BLOCKERS,
  REQUIRED_REVIEW_SECTIONS,
  REQUIRED_SOURCE_SURFACES,
  SAFE_SOURCE_TYPES,
  normalizeMemoryGovernanceReviewSurfaceContract,
  summarizeMemoryGovernanceReviewSurfaceContract
} = require('../src/core/MemoryGovernanceReviewSurfaceContract');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-governance-review-surface-v1.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

test('P34.2 helper summarizes explicit governance review surface fixture input', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const summary = summarizeMemoryGovernanceReviewSurfaceContract(fixture);

  assert.equal(summary.sourceMode, 'explicit_input');
  assert.equal(summary.schemaVersion, 'memory-governance-review-surface-v1');
  assert.equal(summary.acceptedForPlanning, true);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
  assert.equal(summary.reviewStatus, 'evidence_only');
  assert.equal(summary.reviewLevel, 'blocked');
  assert.equal(summary.executionApproved, false);
  assert.equal(summary.runtimeIntegrated, false);
  assert.equal(summary.governanceReportExecuted, false);
  assert.equal(summary.realDbReviewExecuted, false);
  assert.equal(summary.durableMemoryTouched, false);
  assert.equal(summary.durableAuditWritten, false);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.mutated, false);
  assert.equal(summary.realMemoryScanned, false);
  assert.equal(summary.sourceContract.safe, true);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, []);
  assert.equal(summary.sourceSurfaces.requiredPresent, true);
  assert.equal(summary.sourceSurfaces.safe, true);
  assert.deepEqual(summary.sourceSurfaces.missingRequired, []);
  assert.equal(summary.reviewSections.requiredPresent, true);
  assert.equal(summary.reviewSections.blocked, true);
  assert.deepEqual(summary.reviewSections.missingRequired, []);
  assert.equal(summary.blockers.requiredPresent, true);
  assert.deepEqual(summary.blockers.missingRequired, []);
  assert.equal(summary.requiredApprovals.requiredPresent, true);
  assert.deepEqual(summary.requiredApprovals.missingRequired, []);
  assert.deepEqual(summary.publicMcpTools, {
    frozen: true,
    tools: PUBLIC_MCP_TOOLS
  });
  assert.equal(summary.safety.noSideEffects, true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.callsProviders, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.equal(summary.safety.writesDurableAudit, false);
  assert.equal(summary.safety.executesGovernanceReport, false);
  assert.equal(summary.safety.reviewsRealDb, false);
  assert.equal(summary.safety.scansRealMemory, false);
  assert.equal(JSON.stringify(fixture), before);
});

test('P34.2 helper normalizes expected governance review surface fields', () => {
  const fixture = loadFixture();
  const before = JSON.stringify(fixture);
  const normalized = normalizeMemoryGovernanceReviewSurfaceContract(fixture);

  assert.equal(normalized.fixtureOnly, true);
  assert.equal(normalized.synthetic, true);
  assert.equal(normalized.reviewOnly, true);
  assert.equal(normalized.status, 'blocked');
  assert.equal(normalized.reviewStatus, 'evidence_only');
  assert.equal(normalized.reviewLevel, 'blocked');
  assert.equal(normalized.executionApproved, false);
  assert.equal(normalized.mutated, false);
  assert.equal(normalized.runtimeIntegrated, false);
  assert.equal(normalized.governanceReportExecuted, false);
  assert.equal(normalized.realDbReviewExecuted, false);
  assert.equal(normalized.durableMemoryTouched, false);
  assert.equal(normalized.durableAuditWritten, false);
  assert.equal(normalized.publicMcpExpanded, false);
  assert.equal(normalized.realMemoryScanned, false);
  assert.equal(normalized.providerCalls, 0);
  assert.deepEqual(normalized.publicTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(normalized.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.acceptedSourceTypes, SAFE_SOURCE_TYPES);
  assert.deepEqual(normalized.sourceSurfaces.map(source => source.id), REQUIRED_SOURCE_SURFACES);
  assert.deepEqual(Object.keys(normalized.reviewSections), REQUIRED_REVIEW_SECTIONS);
  assert.deepEqual(REQUIRED_BLOCKERS.filter(blocker => !normalized.blockers.includes(blocker)), []);
  assert.deepEqual(REQUIRED_APPROVALS.filter(approval => !normalized.requiredApprovals.includes(approval)), []);
  assert.equal(JSON.stringify(fixture), before);
});

test('P34.2 helper does not perform implicit fixture reads or command execution', () => {
  const fixture = loadFixture();
  const originalReadFileSync = fs.readFileSync;
  const originalExecSync = childProcess.execSync;
  const originalExecFileSync = childProcess.execFileSync;
  const originalSpawnSync = childProcess.spawnSync;

  fs.readFileSync = () => {
    throw new Error('unexpected fs read during governance review helper evaluation');
  };
  childProcess.execSync = () => {
    throw new Error('unexpected command execution during governance review helper evaluation');
  };
  childProcess.execFileSync = () => {
    throw new Error('unexpected command execution during governance review helper evaluation');
  };
  childProcess.spawnSync = () => {
    throw new Error('unexpected command execution during governance review helper evaluation');
  };

  try {
    const summary = summarizeMemoryGovernanceReviewSurfaceContract(fixture);

    assert.equal(summary.acceptedForPlanning, true);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  } finally {
    fs.readFileSync = originalReadFileSync;
    childProcess.execSync = originalExecSync;
    childProcess.execFileSync = originalExecFileSync;
    childProcess.spawnSync = originalSpawnSync;
  }
});

test('P34.2 helper fails closed for malformed explicit input', () => {
  for (const malformedInput of [null, [], 'not an object']) {
    const summary = summarizeMemoryGovernanceReviewSurfaceContract(malformedInput);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
    assert.equal(summary.reviewStatus, 'evidence_only');
    assert.equal(summary.reviewLevel, 'blocked');
    assert.equal(summary.executionApproved, false);
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.governanceReportExecuted, false);
    assert.equal(summary.realDbReviewExecuted, false);
    assert.equal(summary.durableMemoryTouched, false);
    assert.equal(summary.durableAuditWritten, false);
    assert.equal(summary.publicMcpExpanded, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.realMemoryScanned, false);
    assert.equal(summary.sourceContract.safe, false);
    assert.equal(summary.sourceSurfaces.requiredPresent, false);
    assert.deepEqual(summary.sourceSurfaces.missingRequired, REQUIRED_SOURCE_SURFACES);
    assert.equal(summary.reviewSections.requiredPresent, false);
    assert.deepEqual(summary.reviewSections.missingRequired, REQUIRED_REVIEW_SECTIONS);
    assert.equal(summary.reviewSections.blocked, false);
    assert.equal(summary.blockers.requiredPresent, false);
    assert.equal(summary.requiredApprovals.requiredPresent, false);
    assert.equal(summary.publicMcpTools.frozen, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P34.2 helper rejects unsupported source types', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceReviewSurfaceContract({
    ...fixture,
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'live_service'
    ]
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.sourceTypesWhitelisted, false);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, ['live_service']);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.startsServices, false);
  assert.equal(summary.safety.callsProviders, false);
});

test('P34.2 helper does not allow input to redefine the source type whitelist', () => {
  const fixture = loadFixture();
  const summary = summarizeMemoryGovernanceReviewSurfaceContract({
    ...fixture,
    safeSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'real_database_review'
    ]
  });

  assert.equal(summary.acceptedForPlanning, false);
  assert.deepEqual(summary.sourceContract.safeSourceTypes, SAFE_SOURCE_TYPES);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.sourceTypesWhitelisted, false);
  assert.deepEqual(summary.sourceContract.unsupportedSourceTypes, ['real_database_review']);
});

test('P34.2 helper rejects execution, runtime, public MCP, and readiness claims', () => {
  const fixture = loadFixture();

  for (const unsafeContract of [
    { ...fixture, status: 'ready' },
    { ...fixture, reviewStatus: 'complete' },
    { ...fixture, reviewLevel: 'ready' },
    { ...fixture, decision: 'READY' },
    { ...fixture, approvalStatus: 'APPROVED' },
    { ...fixture, executionApproved: true },
    { ...fixture, mutated: true },
    { ...fixture, runtimeIntegrated: true },
    { ...fixture, governanceReportExecuted: true },
    { ...fixture, realDbReviewExecuted: true },
    { ...fixture, durableMemoryTouched: true },
    { ...fixture, durableAuditWritten: true },
    { ...fixture, publicMcpExpanded: true },
    { ...fixture, realMemoryScanned: true },
    { ...fixture, providerCalls: 1 },
    { ...fixture, publicTools: ['record_memory', 'search_memory'] }
  ]) {
    const summary = summarizeMemoryGovernanceReviewSurfaceContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
    assert.equal(summary.safety.mutatesDurableState, false);
    assert.equal(summary.safety.writesDurableAudit, false);
  }
});

test('P34.2 helper requires all source surfaces and review sections to stay blocked', () => {
  const fixture = loadFixture();
  const missingSummary = summarizeMemoryGovernanceReviewSurfaceContract({
    ...fixture,
    sourceSurfaces: fixture.sourceSurfaces.filter(source => source.id !== 'admin_review_surface'),
    reviewSections: {
      ...fixture.reviewSections,
      approvalReview: {
        ...fixture.reviewSections.approvalReview,
        visibleActions: fixture.reviewSections.approvalReview.visibleActions
          .filter(action => action !== 'governance_audit_write')
      }
    }
  });

  assert.equal(missingSummary.acceptedForPlanning, false);
  assert.equal(missingSummary.sourceSurfaces.requiredPresent, false);
  assert.deepEqual(missingSummary.sourceSurfaces.missingRequired, ['admin_review_surface']);
  assert.equal(missingSummary.reviewSections.blocked, false);
  assert.equal(missingSummary.reviewSections.approvalActions.requiredPresent, false);
  assert.deepEqual(missingSummary.reviewSections.approvalActions.missingRequired, [
    'governance_audit_write'
  ]);

  const unsafeSummary = summarizeMemoryGovernanceReviewSurfaceContract({
    ...fixture,
    sourceSurfaces: fixture.sourceSurfaces.map((source, index) => index === 0
      ? {
          ...source,
          helperExecuted: true
        }
      : source
    )
  });

  assert.equal(unsafeSummary.acceptedForPlanning, false);
  assert.equal(unsafeSummary.sourceSurfaces.safe, false);
});

test('P34.2 helper rejects missing blockers, approvals, or unsafe safety flags', () => {
  const fixture = loadFixture();

  for (const unsafeContract of [
    {
      ...fixture,
      blockers: fixture.blockers.filter(blocker => blocker !== 'audit_writer_not_implemented')
    },
    {
      ...fixture,
      requiredApprovals: fixture.requiredApprovals
        .filter(approval => approval !== 'audit_writer_implementation')
    },
    {
      ...fixture,
      safety: {
        ...fixture.safety,
        noGovernanceReportExecution: false
      }
    },
    {
      ...fixture,
      safety: {
        ...fixture.safety,
        rawSecretExposed: true
      }
    },
    {
      ...fixture,
      safety: {
        ...fixture.safety,
        authorizationHeaderExposed: true
      }
    }
  ]) {
    const summary = summarizeMemoryGovernanceReviewSurfaceContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P34.2 helper rejects schema/version drift and non-exact required sets', () => {
  const fixture = loadFixture();

  for (const unsafeContract of [
    { ...fixture, schemaVersion: 'unsupported-schema' },
    { ...fixture, version: 'v2' },
    { ...fixture, sourceSurfaces: [...fixture.sourceSurfaces, fixture.sourceSurfaces[0]] },
    { ...fixture, blockers: [...fixture.blockers, 'unexpected_blocker'] },
    { ...fixture, requiredApprovals: [...fixture.requiredApprovals, 'unexpected_approval'] },
    {
      ...fixture,
      reviewSections: {
        ...fixture.reviewSections,
        lifecycleReview: {
          ...fixture.reviewSections.lifecycleReview,
          visibleCases: [
            ...fixture.reviewSections.lifecycleReview.visibleCases,
            fixture.reviewSections.lifecycleReview.visibleCases[0]
          ]
        }
      }
    }
  ]) {
    const summary = summarizeMemoryGovernanceReviewSurfaceContract(unsafeContract);

    assert.equal(summary.acceptedForPlanning, false);
    assert.equal(summary.decision, 'NOT_READY_BLOCKED');
    assert.equal(summary.approvalStatus, 'BLOCKED_PENDING_APPROVAL');
    assert.equal(summary.reviewStatus, 'evidence_only');
    assert.equal(summary.reviewLevel, 'blocked');
    assert.equal(summary.executionApproved, false);
    assert.equal(summary.runtimeIntegrated, false);
    assert.equal(summary.publicMcpExpanded, false);
    assert.equal(summary.mutated, false);
    assert.equal(summary.safety.readsFiles, false);
    assert.equal(summary.safety.executesCommands, false);
  }
});

test('P34.2 helper redacts sensitive normalized output and unsupported source types', () => {
  const fixture = loadFixture();
  const normalized = normalizeMemoryGovernanceReviewSurfaceContract({
    ...fixture,
    acceptedSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'authorization: Bearer REVIEW_TOKEN_1234567890'
    ],
    unsupportedSourceTypes: [
      'api_key=REVIEW_API_KEY_1234567890',
      'password=REVIEW_PASSWORD_1234567890',
      'token=REVIEW_SUMMARY_TOKEN_1234567890',
      'set-cookie=session=REVIEW_COOKIE_1234567890'
    ],
    safeSourceTypes: [
      ...SAFE_SOURCE_TYPES,
      'raw_workspace_id=workspace-review-raw'
    ],
    requiredWording: [
      ...fixture.requiredWording,
      'password=REVIEW_WORDING_PASSWORD_1234567890',
      'token=REVIEW_WORDING_TOKEN_1234567890',
      'set-cookie=session=REVIEW_WORDING_COOKIE_1234567890',
      '-----BEGIN PRIVATE KEY-----\nREVIEW_WORDING_PRIVATE_KEY_BODY'
    ],
    sourceSurfaces: fixture.sourceSurfaces.map((source, index) => index === 0
      ? {
          ...source,
          authorization: 'authorization: Bearer SURFACE_TOKEN_1234567890',
          bearer: 'Bearer SURFACE_BEARER_1234567890',
          api_key: 'api_key=SURFACE_API_KEY_1234567890',
          raw_workspace_id: 'raw_workspace_id=workspace-surface-raw',
          artifacts: [
            ...source.artifacts,
            'artifact authorization: Bearer ARTIFACT_TOKEN_1234567890 api_key=ARTIFACT_API_KEY_1234567890'
          ]
        }
      : source
    ),
    reviewSections: {
      ...fixture.reviewSections,
      lifecycleReview: {
        ...fixture.reviewSections.lifecycleReview,
        raw_workspace_id: 'raw_workspace_id=workspace-lifecycle-raw',
        visibleCases: [
          ...fixture.reviewSections.lifecycleReview.visibleCases,
          'bearer CASE_TOKEN_1234567890'
        ]
      }
    }
  });
  const summary = summarizeMemoryGovernanceReviewSurfaceContract(normalized);
  const normalizedText = JSON.stringify(normalized).toLowerCase();
  const summaryText = JSON.stringify(summary).toLowerCase();

  for (const forbidden of [
    'bearer',
    'api_key',
    'raw_workspace_id',
    'authorization: bearer',
    'review_token_1234567890',
    'surface_token_1234567890',
    'artifact_api_key_1234567890',
    'review_password_1234567890',
    'review_summary_token_1234567890',
    'review_cookie_1234567890',
    'review_wording_password_1234567890',
    'review_wording_token_1234567890',
    'review_wording_cookie_1234567890',
    'begin private key',
    'review_wording_private_key_body',
    'workspace-surface-raw',
    'workspace-lifecycle-raw'
  ]) {
    assert.equal(normalizedText.includes(forbidden), false);
    assert.equal(summaryText.includes(forbidden), false);
  }

  assert.equal(Object.hasOwn(normalized.sourceSurfaces[0], 'authorization'), false);
  assert.equal(Object.hasOwn(normalized.sourceSurfaces[0], 'api_key'), false);
  assert.equal(Object.hasOwn(normalized.reviewSections.lifecycleReview, 'raw_workspace_id'), false);
  assert.equal(summary.acceptedForPlanning, false);
  assert.equal(summary.sourceContract.safe, false);
  assert.equal(summary.sourceContract.unsupportedSourceTypes.every(sourceType =>
    sourceType === '<redacted>' || sourceType.includes('<redacted>')
  ), true);
  assert.equal(summary.safety.readsFiles, false);
  assert.equal(summary.safety.executesCommands, false);
  assert.equal(summary.safety.mutatesDurableState, false);
  assert.deepEqual(summary.publicMcpTools.tools, PUBLIC_MCP_TOOLS);
  assert.equal(summary.publicMcpExpanded, false);
  assert.equal(summary.decision, 'NOT_READY_BLOCKED');
  assert.equal(summary.acceptedForPlanning, false);
});
