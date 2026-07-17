'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_MAPPING_REFERENCE,
  MAX_ALLOWED_DIARIES,
  digestMapping,
  resolveRead,
  resolveWrite,
  validateMapping
} = require('../src/core/DiaryScopeMapping');

function entry(overrides = {}) {
  return {
    partitionReference: 'codex-private-base-v1',
    diaryName: 'DIARY_CODEX_PRIVATE',
    classification: 'client_private',
    clientId: 'Codex',
    projectId: null,
    workspaceId: null,
    readProfiles: ['exact_visibility', 'task_start_context'],
    writeEligible: true,
    ...overrides
  };
}

function mapping(entries = [entry()]) {
  return {
    schemaVersion: 1,
    mappingReference: DEFAULT_MAPPING_REFERENCE,
    defaultPolicy: 'deny',
    entries
  };
}

function fullMapping() {
  return mapping([
    entry(),
    entry({
      partitionReference: 'codex-private-project-v1',
      diaryName: 'DIARY_CODEX_PROJECT_PRIVATE',
      projectId: 'project-alpha'
    }),
    entry({
      partitionReference: 'codex-private-workspace-v1',
      diaryName: 'DIARY_CODEX_WORKSPACE_PRIVATE',
      workspaceId: 'workspace-alpha'
    }),
    entry({
      partitionReference: 'codex-private-project-workspace-v1',
      diaryName: 'DIARY_CODEX_PROJECT_WORKSPACE_PRIVATE',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha'
    }),
    entry({
      partitionReference: 'claude-private-base-v1',
      diaryName: 'DIARY_CLAUDE_PRIVATE',
      clientId: 'Claude'
    }),
    entry({
      partitionReference: 'project-alpha-shared-v1',
      diaryName: 'DIARY_PROJECT_ALPHA',
      classification: 'project_shared',
      clientId: null,
      projectId: 'project-alpha',
      workspaceId: null
    }),
    entry({
      partitionReference: 'workspace-alpha-shared-v1',
      diaryName: 'DIARY_WORKSPACE_ALPHA',
      classification: 'workspace_shared',
      clientId: null,
      projectId: null,
      workspaceId: 'workspace-alpha'
    }),
    entry({
      partitionReference: 'legacy-compat-v1',
      diaryName: 'DIARY_LEGACY_COMPAT',
      classification: 'compatibility_only',
      clientId: null,
      writeEligible: false
    }),
    entry({
      partitionReference: 'ambiguous-v1',
      diaryName: 'DIARY_AMBIGUOUS',
      classification: 'ambiguous',
      clientId: null,
      writeEligible: false
    })
  ]);
}

test('mapping validation canonicalizes full mapping and binds stable digest', () => {
  const original = fullMapping();
  const reversed = { ...original, entries: [...original.entries].reverse() };
  const first = validateMapping(original);
  const second = validateMapping(reversed);

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, true);
  assert.match(first.mappingDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.mappingDigest, second.mappingDigest);
  assert.equal(first.mappingDigest, digestMapping(first.mapping));
  assert.equal(first.mapping.entries[0].partitionReference, 'ambiguous-v1');
});

test('mapping digest changes for internal diary values ownership and profiles', () => {
  const baseline = validateMapping(fullMapping()).mappingDigest;
  for (const mutate of [
    value => { value.entries[0].diaryName = 'DIARY_CODEX_PRIVATE_CHANGED'; },
    value => { value.entries[0].clientId = 'Claude'; },
    value => { value.entries[0].readProfiles = ['exact_visibility']; },
    value => { value.entries[0].writeEligible = false; }
  ]) {
    const value = structuredClone(fullMapping());
    mutate(value);
    const result = validateMapping(value);
    assert.equal(result.accepted, true);
    assert.notEqual(result.mappingDigest, baseline);
  }
});

test('mapping validation rejects missing invalid empty oversized and unsafe names', () => {
  assert.equal(validateMapping(null).accepted, false);
  assert.equal(validateMapping({}).accepted, false);
  assert.equal(validateMapping(mapping([])).accepted, false);
  for (const diaryName of ['', '../escape', 'bad/name', 'bad\\name', 'bad\u0000name', 'e\u0301']) {
    const result = validateMapping(mapping([entry({ diaryName })]));
    assert.equal(result.accepted, false, JSON.stringify(diaryName));
  }
  const oversized = Array.from({ length: 129 }, (_, index) => entry({
    partitionReference: `partition-${index}`,
    diaryName: `DIARY_${index}`
  }));
  assert.equal(validateMapping(mapping(oversized)).accepted, false);
});

test('mapping validation rejects duplicate partition diary Unicode and ownership conflicts', () => {
  const duplicatePartition = mapping([
    entry(),
    entry({ diaryName: 'DIARY_OTHER' })
  ]);
  assert.equal(validateMapping(duplicatePartition).reasonCode, 'mapping_ownership_conflict');

  const unicodeConflict = mapping([
    entry({ diaryName: 'Ａ' }),
    entry({ partitionReference: 'other-v1', diaryName: 'A' })
  ]);
  assert.equal(validateMapping(unicodeConflict).reasonCode, 'mapping_ownership_conflict');

  const duplicateDiary = mapping([
    entry(),
    entry({ partitionReference: 'other-v1', clientId: 'Claude' })
  ]);
  assert.equal(validateMapping(duplicateDiary).reasonCode, 'mapping_ownership_conflict');
});

test('private read selects the most specific current-client diary and never crosses clients', () => {
  const value = fullMapping();
  const both = resolveRead({
    mapping: value,
    trustedScope: {
      clientId: 'Codex',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      visibility: 'private'
    }
  });
  assert.equal(both.accepted, true);
  assert.deepEqual(both.allowedDiaryNames, ['DIARY_CODEX_PROJECT_WORKSPACE_PRIVATE']);

  const projectOnly = resolveRead({
    mapping: value,
    trustedScope: { clientId: 'Codex', projectId: 'project-alpha', visibility: 'private' }
  });
  assert.deepEqual(projectOnly.allowedDiaryNames, ['DIARY_CODEX_PROJECT_PRIVATE']);

  const clientOnly = resolveRead({
    mapping: value,
    trustedScope: { clientId: 'Claude', visibility: 'private' }
  });
  assert.deepEqual(clientOnly.allowedDiaryNames, ['DIARY_CLAUDE_PRIVATE']);
  assert.equal(clientOnly.allowedDiaryNames.includes('DIARY_CODEX_PRIVATE'), false);
});

test('private read rejects same-priority multi-target ambiguity', () => {
  const value = mapping([
    entry(),
    entry({ partitionReference: 'other-private-v1', diaryName: 'DIARY_OTHER_PRIVATE' })
  ]);
  const result = resolveRead({
    mapping: value,
    trustedScope: { clientId: 'Codex', visibility: 'private' }
  });
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'client_private_ambiguous');
});

test('project workspace and shared reads require trusted identifiers and registered targets', () => {
  const value = fullMapping();
  assert.equal(resolveRead({
    mapping: value,
    trustedScope: { clientId: 'Codex', visibility: 'project' }
  }).reasonCode, 'trusted_project_id_required');
  assert.equal(resolveRead({
    mapping: value,
    trustedScope: { clientId: 'Codex', visibility: 'workspace' }
  }).reasonCode, 'trusted_workspace_id_required');

  const project = resolveRead({
    mapping: value,
    trustedScope: { clientId: 'Codex', projectId: 'project-alpha', visibility: 'project' }
  });
  assert.deepEqual(project.allowedDiaryNames, ['DIARY_PROJECT_ALPHA']);

  const workspace = resolveRead({
    mapping: value,
    trustedScope: { clientId: 'Codex', workspaceId: 'workspace-alpha', visibility: 'workspace' }
  });
  assert.deepEqual(workspace.allowedDiaryNames, ['DIARY_WORKSPACE_ALPHA']);

  const shared = resolveRead({
    mapping: value,
    trustedScope: {
      clientId: 'Codex',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      visibility: 'shared'
    }
  });
  assert.deepEqual(shared.allowedDiaryNames, ['DIARY_PROJECT_ALPHA', 'DIARY_WORKSPACE_ALPHA']);
  assert.equal(shared.allowedDiaryNames.includes('DIARY_LEGACY_COMPAT'), false);
  assert.equal(shared.allowedDiaryNames.includes('DIARY_AMBIGUOUS'), false);

  assert.equal(resolveRead({
    mapping: value,
    trustedScope: { clientId: 'Codex', visibility: 'shared' }
  }).reasonCode, 'empty_diary_allowlist');
});

test('task start always requires private and conditionally appends trusted shared partitions', () => {
  const value = fullMapping();
  const clientOnly = resolveRead({
    mapping: value,
    trustedScope: { clientId: 'Codex', visibility: 'private' },
    recallProfile: 'task_start_context'
  });
  assert.deepEqual(clientOnly.allowedDiaryNames, ['DIARY_CODEX_PRIVATE']);
  assert.deepEqual(clientOnly.omittedCategories, ['project_shared', 'workspace_shared']);

  const full = resolveRead({
    mapping: value,
    trustedScope: {
      clientId: 'Codex',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha',
      visibility: 'private'
    },
    recallProfile: 'task_start_context'
  });
  assert.deepEqual(full.allowedDiaryNames, [
    'DIARY_CODEX_PROJECT_WORKSPACE_PRIVATE',
    'DIARY_PROJECT_ALPHA',
    'DIARY_WORKSPACE_ALPHA'
  ]);
  assert.deepEqual(full.omittedCategories, []);
});

test('scope_id is accepted audited and fingerprint-bound but never affects diary ACL', () => {
  const result = resolveRead({
    mapping: fullMapping(),
    trustedScope: { clientId: 'Codex', scopeId: 'task-123', visibility: 'private' }
  });
  assert.equal(result.scopeIdAccepted, true);
  assert.equal(result.scopeIdAudited, true);
  assert.equal(result.scopeIdFingerprintBound, true);
  assert.equal(result.scopeIdAffectsDiaryAcl, false);
  assert.equal(result.scopeIdEnforcementClaimed, false);
});

test('pure write resolver returns exactly one read-allowlisted eligible target', () => {
  const value = fullMapping();
  const cases = [
    ['private', { clientId: 'Codex' }, 'DIARY_CODEX_PRIVATE'],
    ['project', { clientId: 'Codex', projectId: 'project-alpha' }, 'DIARY_PROJECT_ALPHA'],
    ['workspace', { clientId: 'Codex', workspaceId: 'workspace-alpha' }, 'DIARY_WORKSPACE_ALPHA'],
    ['shared', { clientId: 'Codex', projectId: 'project-alpha' }, 'DIARY_PROJECT_ALPHA']
  ];
  for (const [deltaType, trustedScope, diaryName] of cases) {
    const result = resolveWrite({ mapping: value, trustedScope, deltaType });
    assert.equal(result.accepted, true, deltaType);
    assert.deepEqual(result.allowedDiaryNames, [diaryName], deltaType);
  }
});

test('private write with project context never falls back to client-only private', () => {
  const clientOnly = mapping([entry()]);
  const rejected = resolveWrite({
    mapping: clientOnly,
    trustedScope: {
      clientId: 'Codex',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha'
    },
    deltaType: 'private'
  });
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.reasonCode, 'scoped_private_write_target_required');

  const projectWithoutWorkspaceTarget = mapping([
    entry(),
    entry({
      partitionReference: 'codex-private-project-v1',
      diaryName: 'DIARY_CODEX_PROJECT_PRIVATE',
      projectId: 'project-alpha'
    })
  ]);
  assert.equal(resolveWrite({
    mapping: projectWithoutWorkspaceTarget,
    trustedScope: {
      clientId: 'Codex',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha'
    },
    deltaType: 'private'
  }).reasonCode, 'scoped_private_write_target_required');

  const accepted = resolveWrite({
    mapping: fullMapping(),
    trustedScope: {
      clientId: 'Codex',
      projectId: 'project-alpha',
      workspaceId: 'workspace-alpha'
    },
    deltaType: 'private'
  });
  assert.equal(accepted.accepted, true);
  assert.deepEqual(accepted.allowedDiaryNames, ['DIARY_CODEX_PROJECT_WORKSPACE_PRIVATE']);
});

test('write resolver rejects compatibility ambiguous ineligible missing and multi-target targets', () => {
  const noEligible = fullMapping();
  noEligible.entries.find(item => item.classification === 'project_shared').writeEligible = false;
  assert.equal(resolveWrite({
    mapping: noEligible,
    trustedScope: { clientId: 'Codex', projectId: 'project-alpha' },
    deltaType: 'project'
  }).reasonCode, 'write_target_missing');

  const ambiguous = fullMapping();
  ambiguous.entries.push(entry({
    partitionReference: 'project-alpha-shared-second-v1',
    diaryName: 'DIARY_PROJECT_ALPHA_SECOND',
    classification: 'project_shared',
    clientId: null,
    projectId: 'project-alpha'
  }));
  assert.equal(resolveWrite({
    mapping: ambiguous,
    trustedScope: { clientId: 'Codex', projectId: 'project-alpha' },
    deltaType: 'project'
  }).reasonCode, 'write_target_ambiguous');
});

test('read resolver rejects allowlists over the eight-diary cap', () => {
  const entries = [entry()];
  for (let index = 0; index < MAX_ALLOWED_DIARIES + 1; index += 1) {
    entries.push(entry({
      partitionReference: `project-shared-${index}`,
      diaryName: `DIARY_PROJECT_${index}`,
      classification: 'project_shared',
      clientId: null,
      projectId: 'project-alpha'
    }));
  }
  const result = resolveRead({
    mapping: mapping(entries),
    trustedScope: { clientId: 'Codex', projectId: 'project-alpha', visibility: 'project' }
  });
  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'diary_allowlist_limit_exceeded');
});
