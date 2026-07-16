const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, 'fixtures', 'memory-governance-lifecycle-contract-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);

const PUBLIC_MCP_TOOLS = ['record_memory', 'search_memory', 'memory_overview', 'audit_memory', 'prepare_memory_context', 'propose_memory_delta', 'validate_memory', 'tombstone_memory', 'supersede_memory'];

const REQUIRED_TOP_LEVEL_FIELDS = [
  'acceptedForPlanning',
  'acceptedSourceTypes',
  'blockers',
  'decision',
  'fixtureOnly',
  'lifecycleCases',
  'mutated',
  'next',
  'phase',
  'publicMcpExpanded',
  'publicTools',
  'publicToolsFrozen',
  'requiredApprovals',
  'reviewOnly',
  'runtimeIntegrated',
  'safeSourceTypes',
  'safety',
  'schemaVersion',
  'surfaces',
  'synthetic',
  'unsupportedSourceTypes',
  'version'
];

const SURFACE_IDS = [
  'proposal_lifecycle',
  'supersession_lifecycle',
  'tombstone_lifecycle',
  'validate_memory_internal',
  'mutation_audit',
  'approval_posture',
  'public_mcp_freeze'
];

const LIFECYCLE_CASE_IDS = [
  'proposal_accept',
  'proposal_reject',
  'supersession_deferred',
  'tombstone_deferred'
];

function surfaceById(id) {
  const surface = fixture.surfaces.find(candidate => candidate.id === id);
  assert.ok(surface, `missing surface: ${id}`);
  return surface;
}

function lifecycleCaseById(id) {
  const lifecycleCase = fixture.lifecycleCases.find(candidate => candidate.id === id);
  assert.ok(lifecycleCase, `missing lifecycle case: ${id}`);
  return lifecycleCase;
}

test('P31.2 governance lifecycle fixture parses and locks top-level contract', () => {
  assert.equal(fixture.schemaVersion, 'memory-governance-lifecycle-contract-v1');
  assert.equal(fixture.version, 'v1');
  assert.equal(fixture.phase, 'P31.2-memory-governance-lifecycle-contract-fixture');
  assert.deepEqual(Object.keys(fixture).sort(), [...REQUIRED_TOP_LEVEL_FIELDS].sort());
});

test('P31.2 fixture remains synthetic review-only evidence', () => {
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.reviewOnly, true);
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.mutated, false);
  assert.equal(fixture.runtimeIntegrated, false);
  assert.equal(fixture.publicMcpExpanded, false);
  assert.equal(fixture.decision, 'NOT_READY_BLOCKED');
});

test('public MCP tools remain frozen to the three-tool contract', () => {
  assert.equal(fixture.publicToolsFrozen, true);
  assert.deepEqual(fixture.publicTools, PUBLIC_MCP_TOOLS);
  assert.deepEqual(surfaceById('public_mcp_freeze').publicTools, PUBLIC_MCP_TOOLS);
});

test('accepted source types are fully whitelisted', () => {
  const safe = new Set(fixture.safeSourceTypes);

  assert.equal(fixture.acceptedSourceTypes.length > 0, true);
  assert.deepEqual(fixture.unsupportedSourceTypes, []);
  assert.equal(fixture.acceptedForPlanning, true);

  for (const sourceType of fixture.acceptedSourceTypes) {
    assert.equal(safe.has(sourceType), true, `${sourceType} is not safe`);
  }
});

test('governance surfaces are complete and point to committed evidence only', () => {
  assert.deepEqual(fixture.surfaces.map(surface => surface.id), SURFACE_IDS);

  for (const surface of fixture.surfaces) {
    assert.ok(Array.isArray(surface.sourceArtifacts), `${surface.id} must list source artifacts`);
    assert.equal(surface.sourceArtifacts.length > 0, true, `${surface.id} must have source artifacts`);
    assert.equal(
      surface.sourceArtifacts.every(source => source.startsWith('tests/') || source.startsWith('src/')),
      true,
      `${surface.id} has unsupported source artifact`
    );
  }
});

test('proposal accept stays internal-only and evidence-gated', () => {
  const proposalAccept = lifecycleCaseById('proposal_accept');

  assert.equal(proposalAccept.from, 'proposal');
  assert.equal(proposalAccept.to, 'active');
  assert.equal(proposalAccept.acceptedForPlanning, true);
  assert.equal(proposalAccept.internalOnly, true);
  assert.equal(proposalAccept.publicMcpTool, false);
  assert.equal(proposalAccept.runtimeIntegrated, false);
  assert.equal(proposalAccept.requiresReason, true);
  assert.equal(proposalAccept.requiresEvidence, true);
  assert.equal(proposalAccept.requiresAudit, true);
  assert.equal(proposalAccept.requiresRedactionApplied, true);
  assert.equal(proposalAccept.requiresLifecyclePolicyApplied, true);
  assert.equal(proposalAccept.requiresScopePolicyApplied, true);
  assert.equal(proposalAccept.mutated, false);
});

test('proposal reject is hidden by default and audit-gated', () => {
  const proposalReject = lifecycleCaseById('proposal_reject');

  assert.equal(proposalReject.from, 'proposal');
  assert.equal(proposalReject.to, 'rejected');
  assert.equal(proposalReject.acceptedForPlanning, true);
  assert.equal(proposalReject.hiddenByDefault, true);
  assert.equal(proposalReject.requiresReason, true);
  assert.equal(proposalReject.requiresEvidence, true);
  assert.equal(proposalReject.requiresAudit, true);
  assert.equal(proposalReject.mutated, false);
});

test('supersession remains deferred until bidirectional link integrity exists', () => {
  const supersession = lifecycleCaseById('supersession_deferred');
  const surface = surfaceById('supersession_lifecycle');

  assert.equal(supersession.acceptedForPlanning, false);
  assert.equal(supersession.deferred, true);
  assert.equal(supersession.requiresOldMemoryId, true);
  assert.equal(supersession.requiresNewMemoryId, true);
  assert.equal(supersession.requiresSupersedesLink, true);
  assert.equal(supersession.requiresSupersededByLink, true);
  assert.equal(supersession.mutated, false);
  assert.equal(surface.mutated, false);
  assert.equal(surface.status, 'deferred_until_link_integrity_runtime_design');
});

test('tombstone remains soft-delete only and hidden by default', () => {
  const tombstone = lifecycleCaseById('tombstone_deferred');
  const surface = surfaceById('tombstone_lifecycle');

  assert.equal(tombstone.acceptedForPlanning, false);
  assert.equal(tombstone.defaultAction, 'tombstone');
  assert.equal(tombstone.hardDeleteAllowed, false);
  assert.equal(tombstone.hiddenByDefault, true);
  assert.equal(tombstone.requiresTombstoneReason, true);
  assert.equal(tombstone.mutated, false);
  assert.equal(surface.hardDeleteAllowed, false);
  assert.equal(surface.visibleByDefault, false);
});

test('validate_memory remains internal-only with forbidden revive transitions', () => {
  const surface = surfaceById('validate_memory_internal');

  assert.equal(surface.publicMcpTool, false);
  assert.equal(surface.defaultMutates, false);
  assert.equal(surface.requiresExplicitApprovalForApply, true);
  assert.deepEqual(surface.allowedTransitions, [
    { from: 'proposal', to: 'active', requiresEvidence: true },
    { from: 'stale', to: 'active', requiresEvidence: true }
  ]);
  assert.deepEqual(surface.forbiddenTransitions, [
    { from: 'rejected', to: 'active' },
    { from: 'tombstoned', to: 'active' },
    { from: 'superseded', to: 'active' }
  ]);
});

test('approval posture keeps runtime mutation and public MCP expansion blocked', () => {
  const surface = surfaceById('approval_posture');

  assert.equal(surface.runtimeMutationAllowedNow, false);
  assert.equal(surface.publicMcpExpansionAllowedNow, false);
  assert.equal(surface.realMemoryScanAllowedNow, false);
  assert.ok(fixture.requiredApprovals.includes('runtime_mutation'));
  assert.ok(fixture.requiredApprovals.includes('public_mcp_tool_or_schema_expansion'));
  assert.ok(fixture.requiredApprovals.includes('push_tag_release_deploy'));
});

test('safety flags preserve no side effects and no sensitive output', () => {
  assert.equal(fixture.safety.noRuntimeMutation, true);
  assert.equal(fixture.safety.noPublicMcpExpansion, true);
  assert.equal(fixture.safety.noDurableMemoryWrite, true);
  assert.equal(fixture.safety.noRealMemoryScan, true);
  assert.equal(fixture.safety.noMigrationImportExportApply, true);
  assert.equal(fixture.safety.noBackupRestore, true);
  assert.equal(fixture.safety.noProviderCall, true);
  assert.equal(fixture.safety.noServiceStart, true);
  assert.equal(fixture.safety.noConfigMutation, true);
  assert.equal(fixture.safety.noPackageScriptChange, true);
  assert.equal(fixture.safety.noRemoteWrite, true);
  assert.equal(fixture.safety.rawSecretExposed, false);
  assert.equal(fixture.safety.rawWorkspaceIdExposed, false);
});

test('blockers preserve not-ready governance state', () => {
  for (const blocker of [
    'runtime_schema_version_enforcement_incomplete',
    'public_mcp_governance_expansion_not_approved',
    'durable_mutation_not_approved',
    'real_memory_scan_blocked',
    'migration_import_export_apply_blocked',
    'backup_restore_blocked',
    'final_rc_matrix_not_executed',
    'v1_rc_not_ready_blocked'
  ]) {
    assert.ok(fixture.blockers.includes(blocker), blocker);
  }
});

test('fixture text does not expose raw secrets or concrete raw workspace ids', () => {
  assert.doesNotMatch(fixtureText, /Bearer\s+[A-Za-z0-9._-]+/);
  assert.doesNotMatch(fixtureText, /sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(fixtureText, /workspace-[A-Za-z0-9_-]{8,}/);
});

test('reading the fixture does not rewrite it', () => {
  const before = fs.readFileSync(fixturePath, 'utf8');

  JSON.parse(before);

  assert.equal(fs.readFileSync(fixturePath, 'utf8'), before);
});
