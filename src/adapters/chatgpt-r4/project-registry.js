'use strict';

const {
  CONTEXT_VISIBILITIES,
  canonicalJson,
  deepFreeze,
  sha256,
  reject
} = require('../../../packages/chatgpt-r4-contracts');
const REGISTRY_SCHEMA_VERSION = 1;
const MAX_PROJECTS = 64;
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const UNSAFE_REFERENCE_PATTERNS = Object.freeze([
  /https?:\/\//iu, /[A-Za-z]:[\\/]/u, /\\\\/u, /\//u, /\\/u,
  /\bconfig\.env\b/iu, /\.env\b/iu, /\bbearer\b/iu, /\btoken\b/iu,
  /\bsecret\b/iu, /\bapi[_-]?key\b/iu, /\bprivate[_-]?key\b/iu,
  /\bpassword\b/iu
]);
const PROJECT_KEYS = Object.freeze([
  'safeProjectAlias',
  'projectId',
  'workspaceId',
  'allowedVisibilities'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isSafeReferenceName(value) {
  return typeof value === 'string' && SAFE_REFERENCE_PATTERN.test(value) &&
    !UNSAFE_REFERENCE_PATTERNS.some(pattern => pattern.test(value));
}

function aliasKey(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

function validateProject(entry) {
  if (!exactKeys(entry, PROJECT_KEYS)) return false;
  if (typeof entry.safeProjectAlias !== 'string' ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(entry.safeProjectAlias) ||
      entry.safeProjectAlias !== entry.safeProjectAlias.normalize('NFC')) return false;
  if (!isSafeReferenceName(entry.projectId) || !isSafeReferenceName(entry.workspaceId)) return false;
  if (!Array.isArray(entry.allowedVisibilities) || entry.allowedVisibilities.length < 1 ||
      new Set(entry.allowedVisibilities).size !== entry.allowedVisibilities.length ||
      entry.allowedVisibilities.some(value => !CONTEXT_VISIBILITIES.includes(value))) return false;
  return true;
}

function visibilityScope(visibility) {
  if (visibility === 'project') return { visibility: 'project', recallProfile: 'exact_visibility' };
  if (visibility === 'workspace') return { visibility: 'workspace', recallProfile: 'exact_visibility' };
  return { visibility: 'shared', recallProfile: 'exact_visibility' };
}

function mappingEntryBelongsToRegistry(entry, projects) {
  if (entry.classification === 'client_private') {
    return ['Codex', 'Claude'].includes(entry.clientId);
  }
  if (entry.classification === 'project_shared') {
    return entry.clientId === null && projects.some(project =>
      project.projectId === entry.projectId &&
      (!entry.workspaceId || project.workspaceId === entry.workspaceId)
    );
  }
  if (entry.classification === 'workspace_shared') {
    return entry.clientId === null && projects.some(project =>
      project.workspaceId === entry.workspaceId &&
      (!entry.projectId || project.projectId === entry.projectId)
    );
  }
  return false;
}

function validateProjectRegistry(registry, mappingState, { resolveDiaryRead } = {}) {
  if (!exactKeys(registry, [
    'schemaVersion', 'registryReference', 'mappingReference', 'mappingDigest',
    'defaultPolicy', 'projects'
  ])) reject('r4_project_registry_shape_invalid');
  if (registry.schemaVersion !== REGISTRY_SCHEMA_VERSION || registry.defaultPolicy !== 'deny' ||
      !isSafeReferenceName(registry.registryReference)) {
    reject('r4_project_registry_header_invalid');
  }
  if (!mappingState?.accepted || !mappingState.mapping ||
      registry.mappingReference !== mappingState.mappingReference ||
      registry.mappingDigest !== mappingState.mappingDigest) {
    reject('r4_project_registry_mapping_binding_mismatch');
  }
  if (typeof resolveDiaryRead !== 'function') reject('r4_project_registry_resolver_missing');
  if (!Array.isArray(registry.projects) || registry.projects.length < 1 ||
      registry.projects.length > MAX_PROJECTS || registry.projects.some(entry => !validateProject(entry))) {
    reject('r4_project_registry_entries_invalid');
  }

  const aliases = new Set();
  const projectIds = new Set();
  for (const project of registry.projects) {
    const normalizedAlias = aliasKey(project.safeProjectAlias);
    if (aliases.has(normalizedAlias) || projectIds.has(project.projectId)) {
      reject('r4_project_registry_ambiguous');
    }
    aliases.add(normalizedAlias);
    projectIds.add(project.projectId);
  }

  if (mappingState.mapping.entries.some(entry =>
    entry.classification === 'client_private' && entry.clientId === 'ChatGPT')) {
    reject('r4_project_registry_chatgpt_private_forbidden');
  }
  if (mappingState.mapping.entries.some(entry => !mappingEntryBelongsToRegistry(entry, registry.projects))) {
    reject('r4_project_registry_unregistered_mapping_entry');
  }

  for (const project of registry.projects) {
    for (const requested of project.allowedVisibilities) {
      const { visibility, recallProfile } = visibilityScope(requested);
      const resolution = resolveDiaryRead({
        mapping: mappingState.mapping,
        trustedScope: {
          clientId: 'Codex',
          projectId: project.projectId,
          workspaceId: project.workspaceId,
          visibility
        },
        recallProfile
      });
      if (!resolution.accepted || resolution.allowedDiaryCount < 1) {
        reject('r4_project_registry_visibility_unmapped');
      }
    }
    const privateResolution = resolveDiaryRead({
      mapping: mappingState.mapping,
      trustedScope: {
        clientId: 'ChatGPT',
        projectId: project.projectId,
        workspaceId: project.workspaceId,
        visibility: 'private'
      },
      recallProfile: 'exact_visibility'
    });
    if (privateResolution.accepted) reject('r4_project_registry_chatgpt_private_forbidden');
  }

  const normalized = {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    registryReference: registry.registryReference,
    mappingReference: registry.mappingReference,
    mappingDigest: registry.mappingDigest,
    defaultPolicy: 'deny',
    projects: registry.projects.map(project => ({
      safeProjectAlias: project.safeProjectAlias,
      projectId: project.projectId,
      workspaceId: project.workspaceId,
      allowedVisibilities: [...project.allowedVisibilities].sort()
    })).sort((left, right) => left.safeProjectAlias.localeCompare(right.safeProjectAlias))
  };
  return deepFreeze({
    accepted: true,
    registry: normalized,
    registryReference: normalized.registryReference,
    registryDigest: sha256(canonicalJson(normalized)),
    mappingReference: normalized.mappingReference,
    mappingDigest: normalized.mappingDigest,
    projectCount: normalized.projects.length,
    startupOnly: true,
    hotReloadAllowed: false
  });
}

function resolveRegisteredProject(registryState, safeProjectAlias, requestedVisibility) {
  if (!registryState?.accepted || typeof safeProjectAlias !== 'string' ||
      !CONTEXT_VISIBILITIES.includes(requestedVisibility)) return null;
  const normalizedAlias = aliasKey(safeProjectAlias);
  const project = registryState.registry.projects.find(entry =>
    aliasKey(entry.safeProjectAlias) === normalizedAlias
  );
  if (!project || !project.allowedVisibilities.includes(requestedVisibility)) return null;
  return project;
}

module.exports = {
  MAX_PROJECTS,
  REGISTRY_SCHEMA_VERSION,
  resolveRegisteredProject,
  validateProjectRegistry,
  visibilityScope
};
