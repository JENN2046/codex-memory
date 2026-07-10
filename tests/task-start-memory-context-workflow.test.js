'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TaskStartMemoryContextWorkflow,
  buildInjectableSummary,
  collectForbiddenKeys,
  deriveTaskFields
} = require('../src/core/TaskStartMemoryContextWorkflow');

function packageResult(overrides = {}) {
  return {
    accepted: true,
    access: {
      readOnly: true,
      durableMutationPerformed: false,
      productionWritePerformed: false,
      readinessClaimed: false,
      localMemoryFallbackUsed: false,
      resultCanBeMistakenForVcpNative: false,
      ...(overrides.access || {})
    },
    memory_context_package: {
      must_know: [{ statement: 'Use the plan pack as the active goal.' }],
      recent_decisions: [{ statement: 'Keep VCPToolBox as final memory intelligence owner.' }],
      current_state: [{ statement: 'Default runtime stays read-only plus context package.' }],
      blockers: [],
      risks: [],
      forbidden_assumptions: [{ statement: 'Do not claim production write readiness.' }],
      recommended_next_step: 'Verify current files before acting.',
      source_breakdown: {
        fallback_used: false,
        result_can_be_mistaken_for_native: false
      },
      audit_receipt: {
        receipt_id: 'pmc_test_receipt',
        read_only: true
      },
      ...(overrides.memory_context_package || {})
    },
    ...(overrides.root || {})
  };
}

test('deriveTaskFields uses explicit task fields before request context defaults', () => {
  const derived = deriveTaskFields({
    task: {
      title: 'Explicit title',
      user_request: 'Explicit request',
      project_id: 'codex-memory',
      client_id: 'codex',
      visibility: 'project',
      current_files: ['src/app.js']
    }
  }, {
    clientId: 'claude',
    executionContext: {
      taskTitle: 'Context title',
      userRequest: 'Context request'
    }
  });

  assert.equal(derived.title, 'Explicit title');
  assert.equal(derived.user_request, 'Explicit request');
  assert.equal(derived.client_id, 'codex');
  assert.deepEqual(derived.current_files, ['src/app.js']);
  assert.equal(derived.strict_scope, true);
});

test('task-start workflow calls prepare_memory_context and returns injectable context', async () => {
  const calls = [];
  const workflow = new TaskStartMemoryContextWorkflow({
    async prepareMemoryContext(args, requestContext) {
      calls.push({ args, requestContext });
      return packageResult();
    }
  });

  const result = await workflow.run({
    task: {
      title: 'Continue plan pack',
      user_request: 'Start with memory context.',
      project_id: 'codex-memory',
      client_id: 'codex',
      visibility: 'project'
    },
    options: {
      max_items: 4
    }
  }, {
    executionContext: { requestSource: 'unit-test' }
  });

  assert.equal(result.status, 'context_ready');
  assert.equal(result.memoryAvailable, true);
  assert.equal(result.contextInjected, true);
  assert.equal(result.taskStartAllowed, true);
  assert.equal(result.access.durableMutationPerformed, false);
  assert.match(result.injectedContext, /Memory context package:/);
  assert.match(result.injectedContext, /Use the plan pack as the active goal/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].args.task.title, 'Continue plan pack');
  assert.equal(calls[0].args.options.max_items, 4);
  assert.equal(calls[0].requestContext.noTokenReadOnly, true);
  assert.equal(calls[0].requestContext.taskStartMemoryContextWorkflow, true);
});

test('task-start workflow marks memory_unavailable when prepare_memory_context fails', async () => {
  const workflow = new TaskStartMemoryContextWorkflow({
    async prepareMemoryContext() {
      throw new Error('raw failure detail should not be echoed');
    }
  });

  const result = await workflow.run({
    task: {
      title: 'Failure path',
      client_id: 'codex',
      visibility: 'project'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.status, 'memory_unavailable');
  assert.equal(result.memoryAvailable, false);
  assert.equal(result.contextInjected, false);
  assert.equal(result.taskStartAllowed, true);
  assert.equal(result.mustNotPretendToRemember, true);
  assert.equal(result.prepareMemoryContextCalled, true);
  assert.equal(serialized.includes('raw failure detail'), false);
});

test('task-start workflow fails closed on unsafe context package output', async () => {
  const workflow = new TaskStartMemoryContextWorkflow({
    async prepareMemoryContext() {
      return packageResult({
        root: {
          rawMemory: 'private value'
        }
      });
    }
  });

  const result = await workflow.run({
    task: { title: 'Unsafe package' }
  });

  assert.equal(result.status, 'memory_unavailable');
  assert.equal(result.reasonCode, 'prepare_memory_context_unsafe_or_unusable');
  assert.equal(result.access.durableMutationPerformed, false);
  assert.equal(result.receipt.raw_memory_returned, false);
});

test('task-start workflow rejects package that implies mutation or readiness', async () => {
  const workflow = new TaskStartMemoryContextWorkflow({
    async prepareMemoryContext() {
      return packageResult({
        access: {
          durableMutationPerformed: true,
          readinessClaimed: true
        }
      });
    }
  });

  const result = await workflow.run({
    task: { title: 'Mutation drift' }
  });

  assert.equal(result.status, 'memory_unavailable');
  assert.equal(result.reasonCode, 'prepare_memory_context_unsafe_or_unusable');
  assert.equal(result.access.durableMutationPerformed, false);
  assert.equal(result.access.readinessClaimed, false);
});

test('task-start workflow rejects package that can be mistaken for native or returns raw payloads', async () => {
  const workflow = new TaskStartMemoryContextWorkflow({
    async prepareMemoryContext() {
      return packageResult({
        access: {
          resultCanBeMistakenForVcpNative: true,
          rawMemoryReturned: true
        }
      });
    }
  });

  const result = await workflow.run({
    task: { title: 'Fallback distinction drift' }
  });

  assert.equal(result.status, 'memory_unavailable');
  assert.equal(result.reasonCode, 'prepare_memory_context_unsafe_or_unusable');
  assert.equal(result.receipt.raw_memory_returned, false);
});

test('injectable summary stays bounded to package statements and next step', () => {
  const summary = buildInjectableSummary(packageResult().memory_context_package);

  assert.match(summary, /Must know/);
  assert.match(summary, /Forbidden assumptions/);
  assert.match(summary, /Recommended next step/);
});

test('forbidden key collector identifies raw memory and endpoint fields', () => {
  assert.deepEqual(
    collectForbiddenKeys({
      nested: {
        rawMemory: 'x',
        safe: [{ endpoint: 'http://example.invalid' }]
      }
    }),
    ['nested.rawMemory', 'nested.safe[0].endpoint']
  );
});
