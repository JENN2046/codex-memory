'use strict';

const crypto = require('node:crypto');

const SCHEMA_VERSION = 1;
const DEFAULT_MAPPING_REFERENCE = 'jenn-vcp-diary-scope-v1';
const MAX_ENTRIES = 128;
const MAX_ALLOWED_DIARIES = 8;
const MAX_DIARY_NAME_LENGTH = 120;
const CLASSIFICATIONS = Object.freeze([
  'client_private',
  'project_shared',
  'workspace_shared',
  'compatibility_only',
  'ambiguous'
]);
const READ_PROFILES = Object.freeze(['exact_visibility', 'task_start_context']);
const VISIBILITIES = Object.freeze(['private', 'project', 'workspace', 'shared']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isPlainObject(value)) return value;
  const output = {};
  for (const key of Object.keys(value).sort()) output[key] = canonicalize(value[key]);
  return output;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function digestMapping(mapping) {
  return `sha256:${crypto.createHash('sha256').update(canonicalJson(mapping)).digest('hex')}`;
}

function validDiaryName(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > MAX_DIARY_NAME_LENGTH) {
    return false;
  }
  if (value !== value.normalize('NFC')) return false;
  if (/[\\/\u0000-\u001f\u007f]/u.test(value)) return false;
  if (value === '.' || value === '..' || value.includes('..')) return false;
  return value.trim() === value && value.length > 0;
}

function rejected(reasonCode, invalidEntries = []) {
  return {
    accepted: false,
    reasonCode,
    invalidEntries: [...new Set(invalidEntries)].sort(),
    mapping: null,
    mappingReference: null,
    mappingDigest: null
  };
}

function normalizeEntry(entry) {
  return {
    partitionReference: normalizeId(entry.partitionReference),
    diaryName: entry.diaryName,
    classification: entry.classification,
    clientId: normalizeId(entry.clientId),
    projectId: normalizeId(entry.projectId),
    workspaceId: normalizeId(entry.workspaceId),
    readProfiles: [...new Set(entry.readProfiles)].sort(),
    writeEligible: entry.writeEligible === true
  };
}

function validateEntry(entry, index) {
  const invalid = [];
  const prefix = `entries[${index}]`;
  if (!isPlainObject(entry)) return [`${prefix}`];
  const allowedKeys = new Set([
    'partitionReference',
    'diaryName',
    'classification',
    'clientId',
    'projectId',
    'workspaceId',
    'readProfiles',
    'writeEligible'
  ]);
  for (const key of Object.keys(entry)) {
    if (!allowedKeys.has(key)) invalid.push(`${prefix}.${key}`);
  }
  if (!normalizeId(entry.partitionReference)) invalid.push(`${prefix}.partitionReference`);
  if (!validDiaryName(entry.diaryName)) invalid.push(`${prefix}.diaryName`);
  if (!CLASSIFICATIONS.includes(entry.classification)) invalid.push(`${prefix}.classification`);
  for (const key of ['clientId', 'projectId', 'workspaceId']) {
    if (entry[key] !== null && entry[key] !== undefined && !normalizeId(entry[key])) {
      invalid.push(`${prefix}.${key}`);
    }
  }
  if (!Array.isArray(entry.readProfiles) || entry.readProfiles.length < 1) {
    invalid.push(`${prefix}.readProfiles`);
  } else if (
    new Set(entry.readProfiles).size !== entry.readProfiles.length ||
    entry.readProfiles.some(profile => !READ_PROFILES.includes(profile))
  ) {
    invalid.push(`${prefix}.readProfiles`);
  }
  if (typeof entry.writeEligible !== 'boolean') invalid.push(`${prefix}.writeEligible`);

  const clientId = normalizeId(entry.clientId);
  const projectId = normalizeId(entry.projectId);
  const workspaceId = normalizeId(entry.workspaceId);
  if (entry.classification === 'client_private' && !clientId) invalid.push(`${prefix}.clientId`);
  if (entry.classification === 'project_shared' && !projectId) invalid.push(`${prefix}.projectId`);
  if (entry.classification === 'workspace_shared' && !workspaceId) invalid.push(`${prefix}.workspaceId`);
  if (
    ['compatibility_only', 'ambiguous'].includes(entry.classification) &&
    entry.writeEligible === true
  ) {
    invalid.push(`${prefix}.writeEligible`);
  }
  return invalid;
}

function validateMapping(mapping) {
  if (!isPlainObject(mapping)) return rejected('mapping_not_plain_object', ['mapping']);
  const allowedKeys = new Set(['schemaVersion', 'mappingReference', 'defaultPolicy', 'entries']);
  const invalid = Object.keys(mapping)
    .filter(key => !allowedKeys.has(key))
    .map(key => `mapping.${key}`);
  if (mapping.schemaVersion !== SCHEMA_VERSION) invalid.push('mapping.schemaVersion');
  if (normalizeId(mapping.mappingReference) !== DEFAULT_MAPPING_REFERENCE) {
    invalid.push('mapping.mappingReference');
  }
  if (mapping.defaultPolicy !== 'deny') invalid.push('mapping.defaultPolicy');
  if (!Array.isArray(mapping.entries) || mapping.entries.length < 1 || mapping.entries.length > MAX_ENTRIES) {
    invalid.push('mapping.entries');
  }
  if (invalid.length > 0) return rejected('invalid_mapping_contract', invalid);

  mapping.entries.forEach((entry, index) => invalid.push(...validateEntry(entry, index)));
  if (invalid.length > 0) return rejected('invalid_mapping_entry', invalid);

  const entries = mapping.entries.map(normalizeEntry);
  const partitions = new Map();
  const diaryNames = new Map();
  const ownershipByDiary = new Map();
  entries.forEach((entry, index) => {
    const partitionKey = entry.partitionReference;
    const diaryKey = entry.diaryName.normalize('NFKC').toLocaleLowerCase('en-US');
    const ownershipKey = canonicalJson({
      classification: entry.classification,
      clientId: entry.clientId,
      projectId: entry.projectId,
      workspaceId: entry.workspaceId
    });
    if (partitions.has(partitionKey)) invalid.push(`entries[${index}].partitionReference`);
    if (diaryNames.has(diaryKey)) invalid.push(`entries[${index}].diaryName`);
    if (ownershipByDiary.has(entry.diaryName) && ownershipByDiary.get(entry.diaryName) !== ownershipKey) {
      invalid.push(`entries[${index}].diaryName`);
    }
    partitions.set(partitionKey, index);
    diaryNames.set(diaryKey, index);
    ownershipByDiary.set(entry.diaryName, ownershipKey);
  });
  if (invalid.length > 0) return rejected('mapping_ownership_conflict', invalid);

  const normalizedMapping = {
    schemaVersion: SCHEMA_VERSION,
    mappingReference: DEFAULT_MAPPING_REFERENCE,
    defaultPolicy: 'deny',
    entries: entries.sort((left, right) => {
      const byPartition = left.partitionReference.localeCompare(right.partitionReference);
      return byPartition || canonicalJson(left).localeCompare(canonicalJson(right));
    })
  };
  return {
    accepted: true,
    reasonCode: 'mapping_valid',
    invalidEntries: [],
    mapping: normalizedMapping,
    mappingReference: normalizedMapping.mappingReference,
    mappingDigest: digestMapping(normalizedMapping)
  };
}

function normalizeTrustedScope(scope) {
  if (!isPlainObject(scope)) return null;
  const clientId = normalizeId(scope.clientId ?? scope.client_id);
  const projectId = normalizeId(scope.projectId ?? scope.project_id);
  const workspaceId = normalizeId(scope.workspaceId ?? scope.workspace_id);
  const scopeId = normalizeId(scope.scopeId ?? scope.scope_id);
  const visibility = typeof scope.visibility === 'string' ? scope.visibility.trim() : '';
  if (!clientId || !VISIBILITIES.includes(visibility)) return null;
  return { clientId, projectId, workspaceId, scopeId, visibility };
}

function entryMatchesOptionalClient(entry, scope) {
  return entry.clientId === null || entry.clientId === scope.clientId;
}

function mostSpecificClientPrivate(entries, scope, profile) {
  const candidates = entries
    .filter(entry => entry.classification === 'client_private')
    .filter(entry => entry.clientId === scope.clientId)
    .filter(entry => entry.readProfiles.includes(profile))
    .filter(entry => !entry.projectId || entry.projectId === scope.projectId)
    .filter(entry => !entry.workspaceId || entry.workspaceId === scope.workspaceId)
    .map(entry => ({
      entry,
      priority: 1 + (entry.projectId ? 2 : 0) + (entry.workspaceId ? 4 : 0)
    }));
  if (candidates.length === 0) return { accepted: false, reasonCode: 'client_private_missing' };
  const highest = Math.max(...candidates.map(candidate => candidate.priority));
  const selected = candidates.filter(candidate => candidate.priority === highest);
  if (selected.length !== 1) return { accepted: false, reasonCode: 'client_private_ambiguous' };
  return { accepted: true, entry: selected[0].entry };
}

function matchingProjectShared(entries, scope, profile) {
  if (!scope.projectId) return [];
  return entries.filter(entry =>
    entry.classification === 'project_shared' &&
    entry.projectId === scope.projectId &&
    entryMatchesOptionalClient(entry, scope) &&
    (!entry.workspaceId || entry.workspaceId === scope.workspaceId) &&
    entry.readProfiles.includes(profile)
  );
}

function matchingWorkspaceShared(entries, scope, profile) {
  if (!scope.workspaceId) return [];
  return entries.filter(entry =>
    entry.classification === 'workspace_shared' &&
    entry.workspaceId === scope.workspaceId &&
    entryMatchesOptionalClient(entry, scope) &&
    (!entry.projectId || entry.projectId === scope.projectId) &&
    entry.readProfiles.includes(profile)
  );
}

function acceptedResolution(validation, scope, entries, omittedCategories = []) {
  if (entries.length < 1) return { accepted: false, reasonCode: 'empty_diary_allowlist' };
  if (entries.length > MAX_ALLOWED_DIARIES) return { accepted: false, reasonCode: 'diary_allowlist_limit_exceeded' };
  const names = entries.map(entry => entry.diaryName);
  if (new Set(names).size !== names.length) return { accepted: false, reasonCode: 'ambiguous_diary_allowlist' };
  return {
    accepted: true,
    reasonCode: 'diary_allowlist_resolved',
    mappingReference: validation.mappingReference,
    mappingDigest: validation.mappingDigest,
    allowedDiaryNames: names,
    allowedDiaryCount: names.length,
    selectedPartitions: entries.map(entry => entry.partitionReference),
    omittedCategories,
    scopeIdAccepted: scope.scopeId !== null,
    scopeIdAudited: scope.scopeId !== null,
    scopeIdFingerprintBound: scope.scopeId !== null,
    scopeIdAffectsDiaryAcl: false,
    scopeIdEnforcementClaimed: false,
    rawDiaryNamesReturned: false
  };
}

function validatedMapping(mapping) {
  const validation = validateMapping(mapping);
  return validation.accepted ? validation : null;
}

function resolveRead({ mapping, trustedScope, recallProfile = 'exact_visibility' } = {}) {
  const validation = validatedMapping(mapping);
  if (!validation) return { accepted: false, reasonCode: 'mapping_invalid_or_missing' };
  const scope = normalizeTrustedScope(trustedScope);
  if (!scope || !READ_PROFILES.includes(recallProfile)) {
    return { accepted: false, reasonCode: 'trusted_scope_invalid' };
  }
  const entries = validation.mapping.entries;
  const omitted = [];

  if (recallProfile === 'task_start_context') {
    const privateResult = mostSpecificClientPrivate(entries, scope, recallProfile);
    if (!privateResult.accepted) return privateResult;
    const selected = [privateResult.entry];
    if (scope.projectId) selected.push(...matchingProjectShared(entries, scope, recallProfile));
    else omitted.push('project_shared');
    if (scope.workspaceId) selected.push(...matchingWorkspaceShared(entries, scope, recallProfile));
    else omitted.push('workspace_shared');
    return acceptedResolution(validation, scope, selected, omitted);
  }

  if (scope.visibility === 'private') {
    const privateResult = mostSpecificClientPrivate(entries, scope, recallProfile);
    return privateResult.accepted
      ? acceptedResolution(validation, scope, [privateResult.entry])
      : privateResult;
  }
  if (scope.visibility === 'project') {
    if (!scope.projectId) return { accepted: false, reasonCode: 'trusted_project_id_required' };
    return acceptedResolution(validation, scope, matchingProjectShared(entries, scope, recallProfile));
  }
  if (scope.visibility === 'workspace') {
    if (!scope.workspaceId) return { accepted: false, reasonCode: 'trusted_workspace_id_required' };
    return acceptedResolution(validation, scope, matchingWorkspaceShared(entries, scope, recallProfile));
  }
  const shared = [
    ...matchingProjectShared(entries, scope, recallProfile),
    ...matchingWorkspaceShared(entries, scope, recallProfile)
  ];
  return acceptedResolution(validation, scope, shared);
}

function resolveWrite({ mapping, trustedScope, deltaType } = {}) {
  const scope = normalizeTrustedScope({ ...(trustedScope || {}), visibility: deltaType });
  const validation = validatedMapping(mapping);
  if (!validation) return { accepted: false, reasonCode: 'mapping_invalid_or_missing' };
  if (!scope || !VISIBILITIES.includes(deltaType)) {
    return { accepted: false, reasonCode: 'trusted_scope_invalid' };
  }
  let candidates = [];
  if (deltaType === 'private') {
    const privateResult = mostSpecificClientPrivate(validation.mapping.entries, scope, 'exact_visibility');
    if (!privateResult.accepted) return privateResult;
    if (scope.projectId && privateResult.entry.projectId !== scope.projectId) {
      return { accepted: false, reasonCode: 'scoped_private_write_target_required' };
    }
    if (scope.workspaceId && privateResult.entry.workspaceId !== scope.workspaceId) {
      return { accepted: false, reasonCode: 'scoped_private_write_target_required' };
    }
    candidates = [privateResult.entry];
  } else if (deltaType === 'project' || deltaType === 'shared') {
    if (!scope.projectId) return { accepted: false, reasonCode: 'trusted_project_id_required' };
    candidates = matchingProjectShared(validation.mapping.entries, scope, 'exact_visibility');
  } else {
    if (!scope.workspaceId) return { accepted: false, reasonCode: 'trusted_workspace_id_required' };
    candidates = matchingWorkspaceShared(validation.mapping.entries, scope, 'exact_visibility');
  }
  candidates = candidates.filter(entry => entry.writeEligible === true);
  if (candidates.length !== 1) {
    return { accepted: false, reasonCode: candidates.length ? 'write_target_ambiguous' : 'write_target_missing' };
  }
  const readScope = { ...scope, visibility: deltaType };
  const readResolution = resolveRead({
    mapping: validation.mapping,
    trustedScope: readScope,
    recallProfile: 'exact_visibility'
  });
  if (
    !readResolution.accepted ||
    !readResolution.allowedDiaryNames.includes(candidates[0].diaryName)
  ) {
    return { accepted: false, reasonCode: 'write_target_outside_read_allowlist' };
  }
  return {
    ...acceptedResolution(validation, scope, candidates),
    reasonCode: 'diary_write_target_resolved',
    writeTargetPartition: candidates[0].partitionReference
  };
}

module.exports = {
  CLASSIFICATIONS,
  DEFAULT_MAPPING_REFERENCE,
  MAX_ALLOWED_DIARIES,
  MAX_DIARY_NAME_LENGTH,
  MAX_ENTRIES,
  READ_PROFILES,
  canonicalJson,
  digestMapping,
  resolveRead,
  resolveWrite,
  validateMapping
};
