'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createCodexMemoryApplication } = require('../src/app');
const {
  summarizeRecordMemoryPrincipalScopeAuthorizationPreflight
} = require('../src/core/RecordMemoryPrincipalScopeAuthorizationPreflight');

async function withApp(handler, appOverrides = {}) {
  const tempBasePath = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-memory-principal-scope-'));
  const app = createCodexMemoryApplication({
    projectBasePath: tempBasePath,
    dailyNoteRootPath: path.join(tempBasePath, 'dailynote'),
    logsDir: path.join(tempBasePath, 'logs'),
    dataDir: path.join(tempBasePath, 'data'),
    ...appOverrides
  });

  await app.initialize();

  try {
    await handler({ app });
  } finally {
    await app.close();
    await fs.rm(tempBasePath, { recursive: true, force: true });
  }
}

const policy = {
  allowedAgentAlias: 'Codex',
  allowedAgentIds: ['codex-desktop'],
  allowedRequestSources: ['codex-memory-mcp'],
  allowedProjectIds: ['codex-memory'],
  allowedWorkspaceIds: ['workspace-alpha'],
  allowedClientIds: ['codex']
};

test('CM1633 observe-only principal scope preflight does not block accepted record_memory writes', async () => {
  await withApp(async ({ app }) => {
    const observed = [];
    app.services.writeService.recordMemoryPrincipalScopeAuthorizationPreflight =
      summarizeRecordMemoryPrincipalScopeAuthorizationPreflight;
    app.services.writeService.recordMemoryPrincipalScopeAuthorizationObserver =
      summary => observed.push(summary);

    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint observe-only principal scope',
      content: 'Type: checkpoint\nrisk: observe-only authorization should not block runtime write',
      evidence: 'CM-1633 temp-local integration regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      recordMemoryPrincipalScopeAuthorizationPolicy: policy,
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'codex-memory-mcp',
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(result.agentAlias, 'Codex');
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, true);
    assert.equal(observed[0].currentRuntimeAuthorizationChanged, false);
    assert.equal(observed[0].recordMemoryRuntimeIntegrated, true);
    assert.equal(observed[0].runtimeApplied, false);
    assert.equal(observed[0].recordMemoryCalled, false);
    assert.equal(observed[0].providerCalls, 0);
    assert.equal(observed[0].durableMutationExecuted, false);
    assert.equal(observed[0].publicMcpExpanded, false);

    const publicResult = JSON.stringify(result);
    assert.doesNotMatch(publicResult, /PrincipalScopeAuthorizationPreflight/);

    const observedSummary = JSON.stringify(observed[0]);
    assert.doesNotMatch(observedSummary, /workspace-alpha/);
  });
});

test('CM1636 app override wires observe-only principal scope preflight without strict rejection', async () => {
  const observed = [];

  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint app override principal scope observe-only',
      content: 'Type: checkpoint\nrisk: app override preflight should stay observe-only by default',
      evidence: 'CM-1636 app override observe-only regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'codex-memory-mcp',
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, true);
    assert.equal(observed[0].recordMemoryRuntimeIntegrated, true);
    assert.equal(observed[0].currentRuntimeAuthorizationChanged, false);
    assert.equal(result.principalScopeAuthorization, undefined);

    const publicResult = JSON.stringify(result);
    assert.doesNotMatch(publicResult, /workspace-alpha/);
  }, {
    recordMemoryPrincipalScopeAuthorizationPreflight:
      summarizeRecordMemoryPrincipalScopeAuthorizationPreflight,
    recordMemoryPrincipalScopeAuthorizationPolicy: policy,
    recordMemoryPrincipalScopeAuthorizationObserver: summary => observed.push(summary)
  });
});

test('CM1636 app override wires strict principal scope rejection with low disclosure', async () => {
  const observed = [];

  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint app override strict principal scope rejected',
      content: 'Type: checkpoint\nrisk: app override strict mode should reject mismatched scope',
      evidence: 'CM-1636 app override strict rejection regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'unexpected-agent',
        requestSource: 'codex-memory-mcp',
        project_id: 'codex-memory',
        workspace_id: 'workspace-beta',
        client_id: 'claude'
      }
    });

    assert.equal(result.decision, 'rejected');
    assert.equal(result.filePath, null);
    assert.match(result.reason, /principal\/scope authorization rejected/);
    assert.match(result.reason, /agentId/);
    assert.match(result.reason, /workspaceId/);
    assert.match(result.reason, /clientId/);
    assert.equal(result.principalScopeAuthorization.strictMode, true);
    assert.equal(result.principalScopeAuthorization.accepted, false);
    assert.deepEqual(result.principalScopeAuthorization.mismatchedFields, [
      'agentId',
      'workspaceId',
      'clientId'
    ]);
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, false);
    assert.equal(observed[0].recordMemoryRuntimeIntegrated, true);
    assert.equal(observed[0].currentRuntimeAuthorizationChanged, false);

    const publicResult = JSON.stringify(result);
    assert.doesNotMatch(publicResult, /workspace-beta/);
    assert.doesNotMatch(publicResult, /unexpected-agent/);
    assert.doesNotMatch(publicResult, /claude/);

    const auditText = await fs.readFile(app.config.auditLogPath, 'utf8');
    assert.match(auditText, /principal\/scope authorization rejected/);
    assert.doesNotMatch(auditText, /workspace-beta/);
    assert.doesNotMatch(auditText, /unexpected-agent/);
    assert.doesNotMatch(auditText, /claude/);
  }, {
    recordMemoryPrincipalScopeAuthorizationPreflight:
      summarizeRecordMemoryPrincipalScopeAuthorizationPreflight,
    recordMemoryPrincipalScopeAuthorizationPolicy: policy,
    recordMemoryPrincipalScopeAuthorizationObserver: summary => observed.push(summary),
    recordMemoryPrincipalScopeAuthorizationStrictMode: true
  });
});

test('CM1640 default config keeps principal scope authorization disabled', async () => {
  await withApp(async ({ app }) => {
    assert.equal(app.config.recordMemoryPrincipalScopeAuthorization.mode, 'off');
    assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationPreflight, null);
    assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationPolicy, null);
    assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationStrictMode, false);

    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint default principal scope config off',
      content: 'Type: checkpoint\nrisk: default principal scope config should not alter current alias-only write behavior',
      evidence: 'CM-1640 default-off source regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'unexpected-agent',
        requestSource: 'codex-memory-mcp',
        project_id: 'codex-memory',
        workspace_id: 'workspace-beta',
        client_id: 'claude'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(result.principalScopeAuthorization, undefined);
  });
});

test('CM1640 observe config runs preflight without rejecting missing scope', async () => {
  const observed = [];

  await withApp(async ({ app }) => {
    assert.equal(app.config.recordMemoryPrincipalScopeAuthorization.mode, 'observe');
    assert.equal(typeof app.services.writeService.recordMemoryPrincipalScopeAuthorizationPreflight, 'function');
    assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationStrictMode, false);

    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint observe config principal scope',
      content: 'Type: checkpoint\nrisk: observe config should report but not reject missing scope',
      evidence: 'CM-1640 observe config regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'codex-memory-mcp',
        project_id: 'codex-memory'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(result.principalScopeAuthorization, undefined);
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, false);
    assert.deepEqual(observed[0].missingRequiredContextFields, ['workspaceId', 'clientId']);
    assert.equal(observed[0].recordMemoryRuntimeIntegrated, true);
  }, {
    recordMemoryPrincipalScopeAuthorization: {
      mode: 'observe',
      policy
    },
    recordMemoryPrincipalScopeAuthorizationObserver: summary => observed.push(summary)
  });
});

test('CM1640 strict config rejects missing scope before persistence with low disclosure', async () => {
  const observed = [];

  await withApp(async ({ app }) => {
    assert.equal(app.config.recordMemoryPrincipalScopeAuthorization.mode, 'strict');
    assert.equal(typeof app.services.writeService.recordMemoryPrincipalScopeAuthorizationPreflight, 'function');
    assert.equal(app.services.writeService.recordMemoryPrincipalScopeAuthorizationStrictMode, true);

    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint strict config principal scope rejected',
      content: 'Type: checkpoint\nrisk: strict config should reject missing scope before persistence',
      evidence: 'CM-1640 strict config rejection regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'codex-memory-mcp',
        project_id: 'codex-memory'
      }
    });

    assert.equal(result.decision, 'rejected');
    assert.equal(result.filePath, null);
    assert.equal(result.shadowWrite.status, 'skipped');
    assert.deepEqual(result.principalScopeAuthorization.missingRequiredContextFields, [
      'workspaceId',
      'clientId'
    ]);
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, false);

    const publicResult = JSON.stringify(result);
    assert.doesNotMatch(publicResult, /workspace-alpha/);
    assert.doesNotMatch(publicResult, /workspace-beta/);
    assert.doesNotMatch(publicResult, /claude/);
  }, {
    recordMemoryPrincipalScopeAuthorization: {
      mode: 'strict',
      policy
    },
    recordMemoryPrincipalScopeAuthorizationObserver: summary => observed.push(summary)
  });
});

test('CM1642 observe config accepts matching temp-local context without rejecting', async () => {
  const observed = [];

  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint observe config matching principal scope',
      content: 'Type: checkpoint\nrisk: observe mode should accept matching temp-local context',
      evidence: 'CM-1642 observe matching regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'codex-memory-mcp',
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        clientId: 'codex'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(result.principalScopeAuthorization, undefined);
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, true);
    assert.equal(observed[0].recordMemoryRuntimeIntegrated, true);
  }, {
    recordMemoryPrincipalScopeAuthorization: {
      mode: 'observe',
      policy
    },
    recordMemoryPrincipalScopeAuthorizationObserver: summary => observed.push(summary)
  });
});

test('CM1642 strict config accepts complete matching temp-local context', async () => {
  const observed = [];

  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint strict config matching principal scope',
      content: 'Type: checkpoint\nrisk: strict config should accept complete matching temp-local context',
      evidence: 'CM-1642 strict matching regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'codex-memory-mcp',
        projectId: 'codex-memory',
        workspaceId: 'workspace-alpha',
        clientId: 'codex'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(result.principalScopeAuthorization, undefined);
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, true);
    assert.equal(observed[0].allPrincipalScopeMatched, true);
  }, {
    recordMemoryPrincipalScopeAuthorization: {
      mode: 'strict',
      policy
    },
    recordMemoryPrincipalScopeAuthorizationObserver: summary => observed.push(summary)
  });
});

test('CM1642 strict config rejects mismatched context before persistence with low disclosure', async () => {
  const observed = [];

  await withApp(async ({ app }) => {
    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint strict config mismatched principal scope rejected',
      content: 'Type: checkpoint\nrisk: strict config should reject mismatched context before persistence',
      evidence: 'CM-1642 strict mismatched regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'unexpected-agent',
        requestSource: 'codex-memory-mcp',
        projectId: 'codex-memory',
        workspaceId: 'workspace-beta',
        clientId: 'claude'
      }
    });

    assert.equal(result.decision, 'rejected');
    assert.equal(result.filePath, null);
    assert.equal(result.shadowWrite.status, 'skipped');
    assert.deepEqual(result.principalScopeAuthorization.mismatchedFields, [
      'agentId',
      'workspaceId',
      'clientId'
    ]);
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, false);

    const publicResult = JSON.stringify(result);
    assert.doesNotMatch(publicResult, /workspace-beta/);
    assert.doesNotMatch(publicResult, /unexpected-agent/);
    assert.doesNotMatch(publicResult, /claude/);

    const auditText = await fs.readFile(app.config.auditLogPath, 'utf8');
    assert.doesNotMatch(auditText, /workspace-beta/);
    assert.doesNotMatch(auditText, /unexpected-agent/);
    assert.doesNotMatch(auditText, /claude/);
  }, {
    recordMemoryPrincipalScopeAuthorization: {
      mode: 'strict',
      policy
    },
    recordMemoryPrincipalScopeAuthorizationObserver: summary => observed.push(summary)
  });
});

test('CM1634 strict principal scope mode accepts exact temp-local principal and scope', async () => {
  await withApp(async ({ app }) => {
    const observed = [];
    app.services.writeService.recordMemoryPrincipalScopeAuthorizationPreflight =
      summarizeRecordMemoryPrincipalScopeAuthorizationPreflight;
    app.services.writeService.recordMemoryPrincipalScopeAuthorizationObserver =
      summary => observed.push(summary);

    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint strict principal scope accepted',
      content: 'Type: checkpoint\nrisk: strict principal scope should accept exact temp-local context',
      evidence: 'CM-1634 temp-local strict accepted regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      recordMemoryPrincipalScopeAuthorizationPolicy: policy,
      recordMemoryPrincipalScopeAuthorizationStrictMode: true,
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'codex-desktop',
        requestSource: 'codex-memory-mcp',
        project_id: 'codex-memory',
        workspace_id: 'workspace-alpha',
        client_id: 'codex'
      }
    });

    assert.equal(result.decision, 'accepted');
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, true);
    assert.equal(observed[0].recordMemoryRuntimeIntegrated, true);
    assert.equal(observed[0].currentRuntimeAuthorizationChanged, false);
    assert.equal(result.principalScopeAuthorization, undefined);
  });
});

test('CM1634 strict principal scope mode rejects mismatched temp-local scope with low disclosure', async () => {
  await withApp(async ({ app }) => {
    const observed = [];
    app.services.writeService.recordMemoryPrincipalScopeAuthorizationPreflight =
      summarizeRecordMemoryPrincipalScopeAuthorizationPreflight;
    app.services.writeService.recordMemoryPrincipalScopeAuthorizationObserver =
      summary => observed.push(summary);

    const result = await app.callTool('record_memory', {
      target: 'process',
      title: 'Checkpoint strict principal scope rejected',
      content: 'Type: checkpoint\nrisk: strict principal scope should reject mismatched temp-local scope',
      evidence: 'CM-1634 temp-local strict rejection regression',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }, {
      recordMemoryPrincipalScopeAuthorizationPolicy: policy,
      recordMemoryPrincipalScopeAuthorizationStrictMode: true,
      executionContext: {
        agentAlias: 'Codex',
        agentId: 'unexpected-agent',
        requestSource: 'codex-memory-mcp',
        project_id: 'codex-memory',
        workspace_id: 'workspace-beta',
        client_id: 'claude'
      }
    });

    assert.equal(result.decision, 'rejected');
    assert.equal(result.filePath, null);
    assert.match(result.reason, /principal\/scope authorization rejected/);
    assert.match(result.reason, /agentId/);
    assert.match(result.reason, /workspaceId/);
    assert.match(result.reason, /clientId/);
    assert.equal(result.principalScopeAuthorization.strictMode, true);
    assert.equal(result.principalScopeAuthorization.accepted, false);
    assert.deepEqual(result.principalScopeAuthorization.mismatchedFields, [
      'agentId',
      'workspaceId',
      'clientId'
    ]);
    assert.equal(observed.length, 1);
    assert.equal(observed[0].acceptedForPrincipalScopeAuthorizationPreflight, false);
    assert.equal(observed[0].recordMemoryRuntimeIntegrated, true);
    assert.equal(observed[0].currentRuntimeAuthorizationChanged, false);

    const publicResult = JSON.stringify(result);
    assert.doesNotMatch(publicResult, /workspace-beta/);
    assert.doesNotMatch(publicResult, /unexpected-agent/);
    assert.doesNotMatch(publicResult, /claude/);

    const auditText = await fs.readFile(app.config.auditLogPath, 'utf8');
    assert.match(auditText, /principal\/scope authorization rejected/);
    assert.doesNotMatch(auditText, /workspace-beta/);
    assert.doesNotMatch(auditText, /unexpected-agent/);
    assert.doesNotMatch(auditText, /claude/);
  });
});
