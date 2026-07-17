#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs', 'CHATGPT_WEB_R4_ARCHITECTURE_MANIFEST.json');
const SCHEMA_PATH = path.join(ROOT, 'schemas', 'chatgpt-web-r4-architecture-v1.schema.json');
const DECISION_PATH = path.join(ROOT, 'docs', 'CHATGPT_WEB_R4_ARCHITECTURE_FREEZE.md');
const THREAT_MODEL_PATH = path.join(ROOT, 'docs', 'CHATGPT_WEB_R4_THREAT_MODEL.md');
const TASKBOOK_PATH = path.join(ROOT, 'docs', 'CHATGPT_WEB_R4_IMPLEMENTATION_TASKBOOK.md');
const EXPECTED_CANONICAL_MANIFEST_SHA256 = '97008bbac3b5ea80c5adb9b2addd48d709d1ea996460ab49fb6ff0c95e34934d';
const EXPECTED_CANONICAL_SCHEMA_SHA256 = 'a173b47069c757032a81153bd47428da5bd827e78bc6414d218282b25ef24413';

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

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function canonicalSha256(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

function valueType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function schemaInvariant(condition, location, message) {
  invariant(condition, `schema validation failed at ${location}: ${message}`);
}

function validateSchemaNode(value, schema, location = '$') {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return;

  if (Object.prototype.hasOwnProperty.call(schema, 'const')) {
    schemaInvariant(
      JSON.stringify(canonicalize(value)) === JSON.stringify(canonicalize(schema.const)),
      location,
      'const mismatch'
    );
  }

  if (schema.type) {
    const actualType = valueType(value);
    const typeMatches = schema.type === 'number'
      ? (actualType === 'number' || actualType === 'integer')
      : actualType === schema.type;
    schemaInvariant(typeMatches, location, `expected ${schema.type}, received ${actualType}`);
  }

  if (typeof value === 'string') {
    if (Number.isInteger(schema.minLength)) {
      schemaInvariant(value.length >= schema.minLength, location, `minLength ${schema.minLength}`);
    }
    if (schema.pattern) {
      schemaInvariant(new RegExp(schema.pattern).test(value), location, `pattern ${schema.pattern}`);
    }
    if (schema.format === 'date') {
      schemaInvariant(/^\d{4}-\d{2}-\d{2}$/.test(value), location, 'format date');
    }
  }

  if (Array.isArray(value)) {
    if (Number.isInteger(schema.minItems)) {
      schemaInvariant(value.length >= schema.minItems, location, `minItems ${schema.minItems}`);
    }
    if (Number.isInteger(schema.maxItems)) {
      schemaInvariant(value.length <= schema.maxItems, location, `maxItems ${schema.maxItems}`);
    }
    if (schema.uniqueItems === true) {
      const canonicalItems = value.map(item => JSON.stringify(canonicalize(item)));
      schemaInvariant(new Set(canonicalItems).size === canonicalItems.length, location, 'uniqueItems');
    }
    if (schema.items) {
      value.forEach((item, index) => validateSchemaNode(item, schema.items, `${location}[${index}]`));
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const properties = schema.properties || {};
    for (const field of schema.required || []) {
      schemaInvariant(Object.prototype.hasOwnProperty.call(value, field), location, `missing required property ${field}`);
    }
    if (schema.additionalProperties === false) {
      for (const field of Object.keys(value)) {
        schemaInvariant(Object.prototype.hasOwnProperty.call(properties, field), location, `unknown property ${field}`);
      }
    }
    for (const [field, childSchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, field)) {
        validateSchemaNode(value[field], childSchema, `${location}.${field}`);
      }
    }
  }
}

function validateJsonSchema(value, schema) {
  invariant(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'architecture schema draft mismatch');
  validateSchemaNode(value, schema);
}

function validateFrozenSchema(schema) {
  invariant(
    canonicalSha256(schema) === EXPECTED_CANONICAL_SCHEMA_SHA256,
    'architecture schema canonical digest mismatch'
  );
}

function validateArchitecture(manifest, schema = loadSchema()) {
  invariant(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'manifest must be an object');
  validateFrozenSchema(schema);
  validateJsonSchema(manifest, schema);
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

  for (const field of ['requestAndResponseBindingRequired', 'signatureRequired', 'nonceRequired', 'expiryRequired', 'replayRejected', 'mappingBindingRequired', 'receiptChainRequired']) {
    invariant(manifest.envelope[field] === true, `envelope.${field} must be true`);
  }
  invariant(manifest.envelope.rawDiaryNamesInPublicReceipt === false, 'public receipts cannot expose diary names');
  invariant(manifest.failurePolicy.defaultPolicy === 'deny', 'failure policy must default deny');
  invariant(manifest.failurePolicy.remoteContinuitySnapshotFallback === false, 'memory snapshot fallback is not part of R4');

  sameMembers(manifest.implementationStages.map(stage => stage.id), [
    'R4-A', 'R4-B', 'R4-C', 'R4-D', 'R4-E', 'R4-F', 'R4-G'
  ], 'implementation stage ids');
  const expectedStageAuthority = {
    'R4-A': { realMemoryAllowed: false, externalRuntimeAllowed: false },
    'R4-B': { realMemoryAllowed: false, externalRuntimeAllowed: false },
    'R4-C': { realMemoryAllowed: false, externalRuntimeAllowed: false },
    'R4-D': { realMemoryAllowed: false, externalRuntimeAllowed: true },
    'R4-E': { realMemoryAllowed: false, externalRuntimeAllowed: true },
    'R4-F': { realMemoryAllowed: true, externalRuntimeAllowed: true },
    'R4-G': { realMemoryAllowed: false, externalRuntimeAllowed: true }
  };
  for (const stage of manifest.implementationStages) {
    const expected = expectedStageAuthority[stage.id];
    invariant(expected, `unknown implementation stage ${stage.id}`);
    invariant(stage.realMemoryAllowed === expected.realMemoryAllowed, `${stage.id} real-memory authority mismatch`);
    invariant(stage.externalRuntimeAllowed === expected.externalRuntimeAllowed, `${stage.id} external-runtime authority mismatch`);
  }

  invariant(manifest.supersession.r3M5TunnelAsCanonicalRoute === true, 'R3 M5 Tunnel canonical route must be superseded');
  invariant(manifest.supersession.r3SecurityControlsPreserved === true, 'R3 security controls must be preserved');
  invariant(manifest.supersession.r3BranchStatus === 'draft_paused_no_merge', 'R3 branch must stay paused');

  for (const [claim, value] of Object.entries(manifest.nonClaims)) {
    invariant(value === false, `nonClaims.${claim} must remain false`);
  }
  invariant(
    canonicalSha256(manifest) === EXPECTED_CANONICAL_MANIFEST_SHA256,
    'architecture manifest canonical digest mismatch'
  );

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

function loadSchema(file = SCHEMA_PATH) {
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
  SCHEMA_PATH,
  canonicalSha256,
  loadManifest,
  loadSchema,
  validateArchitecture,
  validateDocMarkers,
  validateFrozenSchema,
  validateJsonSchema
};
