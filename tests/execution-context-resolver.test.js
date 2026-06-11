const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ExecutionContextResolver } = require('../src/core/ExecutionContextResolver');

function createResolver(overrides = {}) {
  return new ExecutionContextResolver({
    allowedAgentAlias: 'Codex',
    defaultAgentId: 'codex-default-agent',
    defaultRequestSource: 'mcp',
    ...overrides
  });
}

test('ExecutionContextResolver resolves principal and scope fields for write context evidence', () => {
  const resolver = createResolver();
  const context = resolver.resolve({
    executionContext: {
      agentAlias: ' Codex ',
      agentId: 'agent-a',
      requestSource: 'http-mcp',
      user_id: 'user-a',
      project_id: 'project-a',
      workspace_id: 'workspace-a',
      client_id: 'client-a',
      task_id: 'task-a',
      conversation_id: 'thread-a',
      visibility_policy: 'project',
      retention_policy: 'retain'
    }
  });

  assert.equal(context.agentAlias, 'Codex');
  assert.equal(context.agentId, 'agent-a');
  assert.equal(context.requestSource, 'http-mcp');
  assert.equal(context.userId, 'user-a');
  assert.equal(context.projectId, 'project-a');
  assert.equal(context.workspaceId, 'workspace-a');
  assert.equal(context.clientId, 'client-a');
  assert.equal(context.taskId, 'task-a');
  assert.equal(context.conversationId, 'thread-a');
  assert.equal(context.visibility, 'project');
  assert.equal(context.retentionPolicy, 'retain');
});

test('ExecutionContextResolver current write authorization is alias-only, not principal or scope bound', () => {
  const resolver = createResolver();

  assert.equal(resolver.isWritableByCodex({
    agentAlias: 'Codex',
    agentId: 'unexpected-agent',
    clientId: 'unknown-client',
    projectId: 'unexpected-project',
    workspaceId: 'unexpected-workspace'
  }), true);

  assert.equal(resolver.isWritableByCodex({
    agentAlias: 'Claude',
    agentId: 'codex-default-agent',
    clientId: 'codex',
    projectId: 'codex-memory',
    workspaceId: 'workspace-a'
  }), false);
});
