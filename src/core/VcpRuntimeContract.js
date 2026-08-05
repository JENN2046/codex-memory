'use strict';

const VCP_RUNTIME_IDENTITY_SCHEMA_VERSION = 1;
const VCP_RUNTIME_CONTRACT_EVIDENCE_SCHEMA_VERSION = 1;
const VCP_RUNTIME_CONTRACT_SCHEMA_VERSION = 1;
// Keep the stable contract projection independent of candidate-runtime imports.
// Stack validation binds this value to the canonical governed-read protocol.
const VCP_RUNTIME_NATIVE_SHIM_PROTOCOL = 'governed_read_attempt.v1';
const VCP_RUNTIME_NATIVE_CAPABILITIES = Object.freeze([
  'audit_memory',
  'knowledge_base.search',
  'memory_overview'
]);
const VCP_RUNTIME_SECURITY_ROOTS = Object.freeze([
  Object.freeze({
    relativePath: 'EmbeddingUtils.js',
    requiredExports: Object.freeze(['getEmbeddingsBatch'])
  }),
  Object.freeze({
    relativePath: 'KnowledgeBaseManager.js',
    requiredExports: Object.freeze(['initialize', 'shutdown'])
  })
]);
const VCP_RUNTIME_OPAQUE_LOCAL_PACKAGE_ROOTS = Object.freeze([
  'rust-vexus-lite'
]);
const VCP_RUNTIME_CONTRACT_PROJECTION = Object.freeze({
  capabilitySurface: VCP_RUNTIME_NATIVE_CAPABILITIES,
  componentBindingContract: Object.freeze({
    embeddingModule: 'EmbeddingUtils.js#getEmbeddingsBatch',
    knowledgeBaseModule:
      'KnowledgeBaseManager.js#initialize,shutdown'
  }),
  globalSearchPolicy: 'disabled',
  manifestSchemaVersion: 1,
  memoryReadPolicy: 'project_scoped_allowlisted_diaries',
  memoryWritePolicy: 'disabled',
  nativeShimProtocol: VCP_RUNTIME_NATIVE_SHIM_PROTOCOL,
  providerPolicy: 'governed_embedding_child_only',
  repositoryBinding: 'canonical_vcp_runtime_repository',
  schemaVersion: VCP_RUNTIME_IDENTITY_SCHEMA_VERSION
});

module.exports = {
  VCP_RUNTIME_CONTRACT_PROJECTION,
  VCP_RUNTIME_CONTRACT_EVIDENCE_SCHEMA_VERSION,
  VCP_RUNTIME_CONTRACT_SCHEMA_VERSION,
  VCP_RUNTIME_IDENTITY_SCHEMA_VERSION,
  VCP_RUNTIME_NATIVE_CAPABILITIES,
  VCP_RUNTIME_NATIVE_SHIM_PROTOCOL,
  VCP_RUNTIME_OPAQUE_LOCAL_PACKAGE_ROOTS,
  VCP_RUNTIME_SECURITY_ROOTS
};
