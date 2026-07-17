#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs', 'CHATGPT_WEB_R4_ARCHITECTURE_MANIFEST.json');
const DECISION_PATH = path.join(ROOT, 'docs', 'CHATGPT_WEB_R4_ARCHITECTURE_FREEZE.md');
const THREAT_MODEL_PATH = path.join(ROOT, 'docs', 'CHATGPT_WEB_R4_THREAT_MODEL.md');
const TASKBOOK_PATH = path.join(ROOT, 'docs', 'CHATGPT_WEB_R4_IMPLEMENTATION_TASKBOOK.md');

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sameMembers(actual, expected, label) {
  invariant(Array.isArray(actual), `${label} must be an array`);
  invariant(actual.length === expected.length, `${label} length mismatch`);
  invariant(
    [...actual].sort().join('\n') === [...expected].sort().join('\n'),
    `${label} members mismatch`
  );
}

function validateArchitecture(manifest) {
  invariant(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'manifest must be an object');
  invariant(manifest.schemaVersion === 1, 'schemaVersion must be 1');
  invariant(manifest.architectureReference === 'codex-memory-chatgpt-web-r4-v1', 'architecture reference mismatch');
  invariant(manifest.decisionAuthority === 'jenn_explicit_r4_freeze', 'decision authority mismatch');
  invariant(manifest.freezeStatus === 'frozen_for_implementation', 'architecture is not frozen');
  invariant(manifest.primaryArchetype === 'interactive_decoupled', 'wrong primary archetype');

  invariant(manifest.transport.chatgptIngress === 'stable_https_mcp', 'ChatGPT ingress must use stable HTTPS MCP');
  invariant(manifest.transport.edgeToLocal === 'local_outbound_authenticated_claim_channel', 'local transport must be outbound');
  invariant(manifest.transport.localHop === 'uds', 'local governed hop must use UDS');
  invariant(manifest.transport.secureMcpTunnelCanonical === false, 'Secure MCP Tunnel must not be canonical');
  invariant(manifest.transport.inboundLocalPortRequired === false, 'R4 must not require an inbound local port');

  const aclAuthorities = manifest.trustZones.filter(zone => zone.diaryAclAuthority);
  invariant(aclAuthorities.length === 1, 'exactly one diary ACL authority is required');
  invariant(aclAuthorities[0].id === 'local_governance_kernel', 'diary ACL authority must remain local');
  const durableAuthorities = manifest.trustZones.filter(zone => zone.durableMemoryAuthority);
  invariant(durableAuthorities.length === 1, 'exactly one durable memory authority is required');
  invariant(durableAuthorities[0].id === 'vcp_runtime', 'VCP must remain the durable memory authority');

  for (const [field, expected] of Object.entries({
    durableMemoryStored: false,
    rawMemoryStored: false,
    mappingStored: false,
    diaryNamesStored: false,
    inFlightOnly: true,
    boundedTtlRequired: true,
    requestOrResponseBodyLoggingAllowed: false
  })) {
    invariant(manifest.remoteState[field] === expected, `remoteState.${field} must be ${expected}`);
  }

  const expectedRoots = {
    sharedContractsRoot: 'packages/chatgpt-r4-contracts',
    publicEdgeRoot: 'apps/chatgpt-edge',
    localRelayRoot: 'apps/local-recall-relay',
    widgetRoot: 'apps/chatgpt-memory-scope-widget',
    governanceAdapterRoot: 'src/adapters/chatgpt-r4',
    testRoot: 'tests/chatgpt-r4'
  };
  for (const [field, expected] of Object.entries(expectedRoots)) {
    invariant(manifest.repositoryLayout[field] === expected, `repositoryLayout.${field} mismatch`);
  }
  invariant(manifest.repositoryLayout.importFencesRequired === true, 'repository import fences are required');
  sameMembers(manifest.repositoryLayout.publicEdgeForbiddenImports, [
    'src/config',
    'src/storage',
    'src/recall',
    'src/adapters/vcp-active-memory',
    'src/adapters/vcp-light-memory',
    'src/adapters/vcp-passive-memory'
  ], 'public edge forbidden imports');
  sameMembers(manifest.repositoryLayout.localRelayForbiddenCapabilities, [
    'diary_mapping_load',
    'provider_invocation',
    'memory_storage',
    'scope_authorization'
  ], 'local relay forbidden capabilities');

  invariant(manifest.scopeAuthority.contextReferenceRequiredBeforeRecall === true, 'context reference must precede recall');
  invariant(manifest.scopeAuthority.widgetStateAffectsAcl === false, 'widget state must not affect ACL');
  invariant(manifest.scopeAuthority.toolArgumentsAffectDiaryAcl === false, 'tool arguments must not affect ACL');
  invariant(manifest.scopeAuthority.rawDiaryIdentifiersExposed === false, 'raw diary identifiers must stay private');
  invariant(manifest.scopeAuthority.chatgptPrivatePartitionAccess === false, 'ChatGPT must not access client-private partitions in R4');
  invariant(manifest.scopeAuthority.legacyPartitionAccess === false, 'legacy partition access must remain denied');

  sameMembers(manifest.toolProfile.dataTools, [
    'resolve_memory_context',
    'memory_overview',
    'search_memory',
    'audit_memory',
    'prepare_memory_context'
  ], 'data tools');
  sameMembers(manifest.toolProfile.renderTools, ['render_memory_scope'], 'render tools');
  invariant(manifest.toolProfile.writeTools.length === 0, 'write tools are forbidden');
  invariant(manifest.toolProfile.proposalTools.length === 0, 'proposal tools are forbidden');
  invariant(manifest.toolProfile.publicExpansionImplemented === false, 'freeze cannot claim public expansion');

  invariant(manifest.widget.authorizationAuthority === false, 'widget cannot authorize memory');
  invariant(manifest.widget.rawMemoryDisplayAllowed === false, 'widget cannot display raw memory');
  invariant(manifest.authorization.oauthRequiredBeforeRealMemory === true, 'OAuth is mandatory before real memory');
  invariant(manifest.authorization.oauthVersion === '2.1', 'OAuth 2.1 is required');
  invariant(manifest.authorization.pkceMethod === 'S256', 'PKCE S256 is required');
  invariant(manifest.authorization.anonymousMemoryAccess === false, 'anonymous memory access is forbidden');

  for (const field of ['signatureRequired', 'nonceRequired', 'expiryRequired', 'replayRejected', 'mappingBindingRequired', 'receiptChainRequired']) {
    invariant(manifest.envelope[field] === true, `envelope.${field} must be true`);
  }
  invariant(manifest.envelope.rawDiaryNamesInPublicReceipt === false, 'public receipts cannot expose diary names');
  invariant(manifest.failurePolicy.defaultPolicy === 'deny', 'failure policy must default deny');
  invariant(manifest.failurePolicy.remoteContinuitySnapshotFallback === false, 'memory snapshot fallback is not part of R4');

  sameMembers(manifest.implementationStages.map(stage => stage.id), [
    'R4-A', 'R4-B', 'R4-C', 'R4-D', 'R4-E', 'R4-F', 'R4-G'
  ], 'implementation stage ids');
  for (const stage of manifest.implementationStages) {
    if (stage.id !== 'R4-F') invariant(stage.realMemoryAllowed === false, `${stage.id} cannot allow real memory`);
  }
  invariant(manifest.implementationStages.find(stage => stage.id === 'R4-F').realMemoryAllowed === true, 'only R4-F may authorize bounded real-memory proof');

  invariant(manifest.supersession.r3M5TunnelAsCanonicalRoute === true, 'R3 M5 Tunnel canonical route must be superseded');
  invariant(manifest.supersession.r3SecurityControlsPreserved === true, 'R3 security controls must be preserved');
  invariant(manifest.supersession.r3BranchStatus === 'draft_paused_no_merge', 'R3 branch must stay paused');

  for (const [claim, value] of Object.entries(manifest.nonClaims)) {
    invariant(value === false, `nonClaims.${claim} must remain false`);
  }

  return {
    accepted: true,
    architectureReference: manifest.architectureReference,
    freezeStatus: manifest.freezeStatus,
    canonicalRouteLength: manifest.canonicalRoute.length,
    trustZoneCount: manifest.trustZones.length,
    repositoryBoundaryCount: 6,
    implementationStageCount: manifest.implementationStages.length,
    tunnelCanonical: manifest.transport.secureMcpTunnelCanonical,
    runtimeMutationPerformed: false,
    providerCallPerformed: false,
    realMemoryReadPerformed: false,
    publicToolSurfaceExpanded: false,
    readinessClaimed: false
  };
}

function validateDocMarkers(root = ROOT) {
  const files = [DECISION_PATH, THREAT_MODEL_PATH, TASKBOOK_PATH];
  const combined = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  const requiredMarkers = [
    'stable HTTPS ChatGPT Edge',
    'outbound Local Recall Relay',
    'project_context_ref',
    'Secure MCP Tunnel',
    'interactive-decoupled',
    'automatic-first-task-call-guaranteed: false',
    'production-ready: false'
  ];
  for (const marker of requiredMarkers) {
    invariant(combined.includes(marker), `missing architecture marker: ${marker}`);
  }
  invariant(!combined.includes('production-ready: true'), 'docs must not claim production readiness');
  invariant(!combined.includes('release-ready: true'), 'docs must not claim release readiness');
  invariant(root === ROOT || typeof root === 'string', 'root must be a string');
}

function loadManifest(file = MANIFEST_PATH) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main() {
  const result = validateArchitecture(loadManifest());
  validateDocMarkers();
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  MANIFEST_PATH,
  loadManifest,
  validateArchitecture,
  validateDocMarkers
};
