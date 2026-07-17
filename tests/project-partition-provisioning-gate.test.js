'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { DEFAULT_MAPPING_REFERENCE } = require('../src/core/DiaryScopeMapping');
const {
  REGISTRY_REFERENCE,
  evaluateProjectPartitionProvisioning,
  expectedPartitionNames,
  validateProjectRegistry
} = require('../src/core/ProjectPartitionProvisioningGate');

function registry(projects = [{
  projectId: 'codex-memory',
  workspaceId: 'agents-os',
  clients: ['Codex', 'Claude']
}]) {
  return {
    schemaVersion: 1,
    registryReference: REGISTRY_REFERENCE,
    defaultPolicy: 'deny',
    projects
  };
}

function mapping(entries) {
  return {
    schemaVersion: 1,
    mappingReference: DEFAULT_MAPPING_REFERENCE,
    defaultPolicy: 'deny',
    entries
  };
}

function entry(partitionReference, diaryName, classification, overrides = {}) {
  return {
    partitionReference,
    diaryName,
    classification,
    clientId: null,
    projectId: null,
    workspaceId: null,
    readProfiles: ['exact_visibility', 'task_start_context'],
    writeEligible: true,
    ...overrides
  };
}

function completeMapping(projects) {
  const entries = [];
  const workspaces = new Set();
  for (const project of projects) {
    const names = expectedPartitionNames(project);
    for (const clientId of project.clients) {
      entries.push(entry(
        `${clientId.toLowerCase()}-${project.projectId}-private-v1`,
        names.privateByClient[clientId],
        'client_private',
        {
          clientId,
          projectId: project.projectId,
          workspaceId: project.workspaceId
        }
      ));
    }
    entries.push(entry(
      `${project.projectId}-shared-v1`,
      names.projectShared,
      'project_shared',
      { projectId: project.projectId, workspaceId: project.workspaceId }
    ));
    if (!workspaces.has(project.workspaceId)) {
      workspaces.add(project.workspaceId);
      entries.push(entry(
        `${project.workspaceId}-shared-v1`,
        names.workspaceShared,
        'workspace_shared',
        { workspaceId: project.workspaceId }
      ));
    }
  }
  return mapping(entries);
}

test('registry requires stable slug identities and emits deterministic safe names', () => {
  const result = validateProjectRegistry(registry());
  assert.equal(result.accepted, true);
  assert.deepEqual(expectedPartitionNames(result.registry.projects[0]), {
    privateByClient: {
      Claude: 'Jenn-Claude-Project-codex-memory-Private',
      Codex: 'Jenn-Codex-Project-codex-memory-Private'
    },
    projectShared: 'Jenn-Project-codex-memory-Shared',
    workspaceShared: 'Jenn-Workspace-agents-os-Shared'
  });

  assert.equal(validateProjectRegistry(registry([{
    projectId: 'Codex Memory',
    workspaceId: 'agents-os',
    clients: ['Codex']
  }])).reasonCode, 'project_registry_entry_invalid');
});

test('registry rejects duplicate project identities and clients', () => {
  const project = { projectId: 'project-a', workspaceId: 'agents-os', clients: ['Codex'] };
  assert.equal(validateProjectRegistry(registry([
    project,
    { ...project, workspaceId: 'other-workspace' }
  ])).reasonCode,
    'project_registry_identity_conflict');
  assert.equal(validateProjectRegistry(registry([{
    ...project,
    clients: ['Codex', 'codex']
  }])).reasonCode, 'project_registry_client_duplicate');
});

test('provisioning gate accepts complete multi-project isolation without duplicating workspace partition', () => {
  const projects = [
    { projectId: 'codex-memory', workspaceId: 'agents-os', clients: ['Codex', 'Claude'] },
    { projectId: 'colameta', workspaceId: 'agents-os', clients: ['Codex', 'Claude'] }
  ];
  const result = evaluateProjectPartitionProvisioning({
    registry: registry(projects),
    mapping: completeMapping(projects)
  });
  assert.equal(result.accepted, true);
  assert.equal(result.writeActivationAllowed, true);
  assert.equal(result.projectCount, 2);
  assert.equal(result.requiredPartitionCount, 7);
  assert.equal(result.rawPartitionNamesReturned, false);
});

test('provisioning gate fails closed when project-private partitions are absent', () => {
  const projects = registry().projects;
  const value = completeMapping(projects);
  value.entries = value.entries.filter(item => item.classification !== 'client_private');
  const result = evaluateProjectPartitionProvisioning({ registry: registry(), mapping: value });
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'project_partition_provisioning_incomplete');
  assert.deepEqual(result.missingCategories, ['project_client_private']);
  assert.equal(result.writeActivationAllowed, false);
  assert.equal(result.rawPartitionNamesReturned, false);
  assert.equal(JSON.stringify(result).includes('Jenn-'), false);
});

test('provisioning gate rejects every write-eligible target outside the registry allowlist', () => {
  const projects = registry().projects;
  for (const extra of [
    entry('global-codex-private-v1', 'Jenn-Codex-Private', 'client_private', { clientId: 'Codex' }),
    entry('unregistered-project-v1', 'Jenn-Project-other-Shared', 'project_shared', {
      projectId: 'other',
      workspaceId: 'agents-os'
    })
  ]) {
    const value = completeMapping(projects);
    value.entries.push(extra);
    const result = evaluateProjectPartitionProvisioning({ registry: registry(), mapping: value });
    assert.equal(result.accepted, false);
    assert.equal(result.reasonCode, 'project_partition_write_allowlist_invalid');
    assert.equal(result.unexpectedWriteEligibleCount, 1);
    assert.equal(result.writeActivationAllowed, false);
    assert.equal(JSON.stringify(result).includes(extra.diaryName), false);
  }
});

test('provisioning gate permits excluded non-writable legacy or client-only partitions', () => {
  const projects = registry().projects;
  const value = completeMapping(projects);
  value.entries.push(entry(
    'global-codex-private-v1',
    'Jenn-Codex-Private',
    'client_private',
    { clientId: 'Codex', writeEligible: false }
  ));
  const result = evaluateProjectPartitionProvisioning({ registry: registry(), mapping: value });
  assert.equal(result.accepted, true);
  assert.equal(result.writeActivationAllowed, true);
});

test('provisioning gate rejects ownership profile and write eligibility drift', () => {
  const projects = registry().projects;
  for (const mutate of [
    value => { value.entries[0].projectId = 'other-project'; },
    value => { value.entries[0].readProfiles = ['exact_visibility']; },
    value => { value.entries[0].writeEligible = false; }
  ]) {
    const value = completeMapping(projects);
    mutate(value);
    const result = evaluateProjectPartitionProvisioning({ registry: registry(), mapping: value });
    assert.equal(result.accepted, false);
    assert.equal(result.writeActivationAllowed, false);
  }
});
