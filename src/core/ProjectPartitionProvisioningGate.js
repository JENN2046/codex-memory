'use strict';

const {
  DEFAULT_MAPPING_REFERENCE,
  validateMapping
} = require('./DiaryScopeMapping');

const REGISTRY_REFERENCE = 'jenn-project-partition-registry-v1';
const MAX_PROJECTS = 64;
const MAX_CLIENTS_PER_PROJECT = 8;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CLIENT_PATTERN = /^[A-Za-z][A-Za-z0-9-]{0,29}$/;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalKey(value) {
  return value.normalize('NFKC').toLocaleLowerCase('en-US');
}

function validSlug(value) {
  return typeof value === 'string' &&
    value.length <= 80 &&
    value === value.normalize('NFC') &&
    SLUG_PATTERN.test(value);
}

function validClientId(value) {
  return typeof value === 'string' &&
    value.length <= 30 &&
    value === value.normalize('NFC') &&
    CLIENT_PATTERN.test(value);
}

function expectedPartitionNames({ projectId, workspaceId, clients }) {
  return {
    privateByClient: Object.fromEntries(
      clients.map(clientId => [clientId, `Jenn-${clientId}-Project-${projectId}-Private`])
    ),
    projectShared: `Jenn-Project-${projectId}-Shared`,
    workspaceShared: `Jenn-Workspace-${workspaceId}-Shared`
  };
}

function validateProjectRegistry(registry) {
  if (!isPlainObject(registry)) {
    return { accepted: false, reasonCode: 'project_registry_not_plain_object' };
  }
  const allowedKeys = new Set(['schemaVersion', 'registryReference', 'defaultPolicy', 'projects']);
  if (
    Object.keys(registry).some(key => !allowedKeys.has(key)) ||
    registry.schemaVersion !== 1 ||
    registry.registryReference !== REGISTRY_REFERENCE ||
    registry.defaultPolicy !== 'deny' ||
    !Array.isArray(registry.projects) ||
    registry.projects.length < 1 ||
    registry.projects.length > MAX_PROJECTS
  ) {
    return { accepted: false, reasonCode: 'project_registry_contract_invalid' };
  }

  const projects = [];
  const identities = new Set();
  for (const project of registry.projects) {
    if (
      !isPlainObject(project) ||
      Object.keys(project).some(key => !['projectId', 'workspaceId', 'clients'].includes(key)) ||
      !validSlug(project.projectId) ||
      !validSlug(project.workspaceId) ||
      !Array.isArray(project.clients) ||
      project.clients.length < 1 ||
      project.clients.length > MAX_CLIENTS_PER_PROJECT ||
      project.clients.some(clientId => !validClientId(clientId))
    ) {
      return { accepted: false, reasonCode: 'project_registry_entry_invalid' };
    }
    const clientKeys = new Set(project.clients.map(canonicalKey));
    const clients = [...project.clients].sort();
    if (clientKeys.size !== project.clients.length) {
      return { accepted: false, reasonCode: 'project_registry_client_duplicate' };
    }
    const names = expectedPartitionNames({
      projectId: project.projectId,
      workspaceId: project.workspaceId,
      clients
    });
    if ([...Object.values(names.privateByClient), names.projectShared, names.workspaceShared]
      .some(name => name.length > 120)) {
      return { accepted: false, reasonCode: 'project_registry_partition_name_too_long' };
    }
    const identity = canonicalKey(project.projectId);
    if (identities.has(identity)) {
      return { accepted: false, reasonCode: 'project_registry_identity_conflict' };
    }
    identities.add(identity);
    projects.push({ projectId: project.projectId, workspaceId: project.workspaceId, clients });
  }

  projects.sort((left, right) =>
    left.workspaceId.localeCompare(right.workspaceId) || left.projectId.localeCompare(right.projectId)
  );
  return {
    accepted: true,
    reasonCode: 'project_registry_valid',
    registry: {
      schemaVersion: 1,
      registryReference: REGISTRY_REFERENCE,
      defaultPolicy: 'deny',
      projects
    }
  };
}

function hasProfiles(entry) {
  return entry.readProfiles.includes('exact_visibility') &&
    entry.readProfiles.includes('task_start_context');
}

function isExactEntry(entry, expected) {
  return (
    entry.diaryName === expected.diaryName &&
    entry.classification === expected.classification &&
    entry.clientId === expected.clientId &&
    entry.projectId === expected.projectId &&
    entry.workspaceId === expected.workspaceId &&
    entry.writeEligible === true &&
    hasProfiles(entry)
  );
}

function exactEntries(entries, expected) {
  return entries.filter(entry => isExactEntry(entry, expected));
}

function evaluateProjectPartitionProvisioning({ mapping, registry } = {}) {
  const registryValidation = validateProjectRegistry(registry);
  if (!registryValidation.accepted) return registryValidation;
  const mappingValidation = validateMapping(mapping);
  if (!mappingValidation.accepted) {
    return { accepted: false, reasonCode: 'project_partition_mapping_invalid' };
  }

  const entries = mappingValidation.mapping.entries;
  const requiredPartitions = new Set();
  const requiredTargets = new Map();
  const missingCategories = new Set();
  for (const project of registryValidation.registry.projects) {
    const names = expectedPartitionNames(project);
    for (const clientId of project.clients) {
      requiredPartitions.add(names.privateByClient[clientId]);
      const expected = {
        diaryName: names.privateByClient[clientId],
        classification: 'client_private',
        clientId,
        projectId: project.projectId,
        workspaceId: project.workspaceId
      };
      requiredTargets.set(expected.diaryName, expected);
      if (exactEntries(entries, expected).length !== 1) {
        missingCategories.add('project_client_private');
      }
    }

    requiredPartitions.add(names.projectShared);
    const expectedProjectShared = {
      diaryName: names.projectShared,
      classification: 'project_shared',
      clientId: null,
      projectId: project.projectId,
      workspaceId: project.workspaceId
    };
    requiredTargets.set(expectedProjectShared.diaryName, expectedProjectShared);
    if (exactEntries(entries, expectedProjectShared).length !== 1) {
      missingCategories.add('project_shared');
    }

    requiredPartitions.add(names.workspaceShared);
    const expectedWorkspaceShared = {
      diaryName: names.workspaceShared,
      classification: 'workspace_shared',
      clientId: null,
      projectId: null,
      workspaceId: project.workspaceId
    };
    requiredTargets.set(expectedWorkspaceShared.diaryName, expectedWorkspaceShared);
    if (exactEntries(entries, expectedWorkspaceShared).length !== 1) {
      missingCategories.add('workspace_shared');
    }
  }

  const unexpectedWriteEligibleCount = entries.filter(entry => {
    if (entry.writeEligible !== true) return false;
    const expected = requiredTargets.get(entry.diaryName);
    return !expected || !isExactEntry(entry, expected);
  }).length;
  if (unexpectedWriteEligibleCount > 0) {
    return {
      accepted: false,
      reasonCode: 'project_partition_write_allowlist_invalid',
      projectCount: registryValidation.registry.projects.length,
      requiredPartitionCount: requiredPartitions.size,
      unexpectedWriteEligibleCount,
      rawPartitionNamesReturned: false,
      writeActivationAllowed: false
    };
  }

  if (missingCategories.size > 0) {
    return {
      accepted: false,
      reasonCode: 'project_partition_provisioning_incomplete',
      projectCount: registryValidation.registry.projects.length,
      requiredPartitionCount: requiredPartitions.size,
      missingCategories: [...missingCategories].sort(),
      rawPartitionNamesReturned: false,
      writeActivationAllowed: false
    };
  }
  return {
    accepted: true,
    reasonCode: 'project_partition_provisioning_complete',
    registryReference: REGISTRY_REFERENCE,
    mappingReference: DEFAULT_MAPPING_REFERENCE,
    projectCount: registryValidation.registry.projects.length,
    requiredPartitionCount: requiredPartitions.size,
    rawPartitionNamesReturned: false,
    writeActivationAllowed: true
  };
}

module.exports = {
  MAX_CLIENTS_PER_PROJECT,
  MAX_PROJECTS,
  REGISTRY_REFERENCE,
  evaluateProjectPartitionProvisioning,
  expectedPartitionNames,
  validateProjectRegistry
};
