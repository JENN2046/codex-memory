const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  applyLifecycleScopeGovernanceReadPolicy,
  createCodexMemoryApplication
} = require('../src/app');

function buildMetadata(records = []) {
  return {
    lifecycleColumnAvailable: true,
    records: new Map(records.map(record => [record.memoryId, record]))
  };
}

const exactScope = {
  project_id: 'project-alpha',
  workspace_id: 'workspace-alpha',
  client_id: 'codex',
  visibility: 'project'
};

const exactExecutionContext = {
  requestSource: 'memory-lifecycle-scope-runtime-integration-test',
  taskId: 'task-alpha',
  conversationId: 'conversation-alpha',
  retentionPolicy: 'standard'
};

const exactRecordScope = {
  projectId: 'project-alpha',
  workspaceId: 'workspace-alpha',
  clientId: 'codex',
  taskId: 'task-alpha',
  conversationId: 'conversation-alpha',
  visibility: 'project',
  retentionPolicy: 'standard'
};

async function withApp(handler) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-lifecycle-scope-runtime-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data')
  });

  await app.initialize();
  try {
    await handler({ app });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

test('lifecycle scope governance bridge is default-disabled and preserves results', async () => {
  let metadataLookups = 0;
  const results = [
    { memoryId: 'mem-active', title: 'Active', content: 'raw synthetic content' }
  ];

  const filtered = await applyLifecycleScopeGovernanceReadPolicy(results, {
    requestContext: { executionContext: exactExecutionContext },
    scope: exactScope,
    shadowStore: {
      async getRecordsLifecycleScopeGovernanceMap() {
        metadataLookups += 1;
        return buildMetadata([]);
      }
    }
  });

  assert.equal(metadataLookups, 0);
  assert.equal(filtered.audit.lifecycleScopeGovernancePolicyApplied, false);
  assert.equal(filtered.results, results);
});

test('lifecycle scope governance bridge suppresses inactive, malformed, and out-of-scope results with sanitized metadata', async () => {
  const results = [
    { memoryId: 'mem-active', title: 'Active', content: 'raw active content', snippet: 'raw active snippet' },
    { memoryId: 'mem-proposal', title: 'Proposal', content: 'raw proposal content' },
    { memoryId: 'mem-project-drift', title: 'Project Drift', text: 'raw drift text' },
    { memoryId: 'mem-malformed', title: 'Malformed', sourceFile: 'raw/path/malformed.jsonl' }
  ];

  const filtered = await applyLifecycleScopeGovernanceReadPolicy(results, {
    requestContext: {
      noTokenReadOnly: true,
      executionContext: {
        ...exactExecutionContext,
        lifecycleScopeGovernanceReadPolicy: true
      }
    },
    scope: exactScope,
    shadowStore: {
      async getRecordsLifecycleScopeGovernanceMap(memoryIds) {
        assert.deepEqual(memoryIds.sort(), ['mem-active', 'mem-malformed', 'mem-project-drift', 'mem-proposal']);
        return buildMetadata([
          {
            memoryId: 'mem-active',
            lifecycleStatus: 'active',
            scope: exactRecordScope
          },
          {
            memoryId: 'mem-proposal',
            lifecycleStatus: 'proposal',
            scope: exactRecordScope
          },
          {
            memoryId: 'mem-project-drift',
            lifecycleStatus: 'active',
            scope: {
              ...exactRecordScope,
              projectId: 'project-beta'
            }
          },
          {
            memoryId: 'mem-malformed',
            lifecycleStatus: 'active',
            malformedScope: true,
            scope: exactRecordScope
          }
        ]);
      }
    }
  });

  assert.deepEqual(filtered.results.map(item => item.memoryId), ['mem-active']);
  assert.equal(filtered.audit.lifecycleScopeGovernancePolicyApplied, true);
  assert.equal(filtered.audit.acceptedCount, 1);
  assert.equal(filtered.audit.suppressedCount, 3);
  assert.equal(filtered.audit.rawContentExposed, false);
  assert.equal(filtered.audit.durableMutationExecuted, false);
  assert.equal(filtered.audit.publicMcpExpanded, false);

  const serializedAudit = JSON.stringify(filtered.audit.sanitizedAuditMetadata);
  assert.match(serializedAudit, /mem-proposal/);
  assert.match(serializedAudit, /scope_mismatch_excluded/);
  assert.match(serializedAudit, /malformed_scope_metadata_excluded/);
  assert.doesNotMatch(serializedAudit, /raw proposal content|raw drift text|raw\/path|title|snippet|content|sourceFile/);
});

test('internal runtime bridge filters search_memory post-results without changing public arguments', async () => {
  await withApp(async ({ app }) => {
    let passiveSearchCount = 0;

    app.services.passiveRecallService.search = async () => {
      passiveSearchCount += 1;
      return [
        { memoryId: 'mem-active', title: 'Active candidate' },
        { memoryId: 'mem-tombstoned', title: 'Tombstoned candidate' },
        { memoryId: 'mem-other-task', title: 'Other task candidate' }
      ];
    };
    app.stores.shadowStore.getRecordsLifecycleScopeGovernanceMap = async () => buildMetadata([
      {
        memoryId: 'mem-active',
        lifecycleStatus: 'active',
        scope: exactRecordScope
      },
      {
        memoryId: 'mem-tombstoned',
        lifecycleStatus: 'tombstoned',
        scope: exactRecordScope
      },
      {
        memoryId: 'mem-other-task',
        lifecycleStatus: 'active',
        scope: {
          ...exactRecordScope,
          taskId: 'task-beta'
        }
      }
    ]);

    const search = await app.callTool('search_memory', {
      query: 'synthetic lifecycle scope bridge',
      target: 'process',
      limit: 3
    }, {
      noTokenReadOnly: true,
      executionContext: {
        ...exactExecutionContext,
        projectId: 'project-alpha',
        workspaceId: 'workspace-alpha',
        clientId: 'codex',
        visibility: 'project',
        lifecycleScopeGovernanceReadPolicy: true
      }
    });

    assert.equal(passiveSearchCount, 1);
    assert.deepEqual(search.results.map(item => item.memoryId), ['mem-active']);
  });
});
