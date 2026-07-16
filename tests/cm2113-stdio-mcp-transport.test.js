'use strict';

const { PassThrough } = require('node:stream');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStdioServer } = require('../src/adapters/codex-mcp/stdio');
const {
  createCm2113StdioMcpFrameClient,
  executeCm2113RecordMemoryStdioSequence
} = require('../src/core/Cm2113StdioMcpTransport');

test('CM-2113 client uses real MCP Content-Length stdio frames for initialize, list, and one write call', async t => {
  const input = new PassThrough();
  const output = new PassThrough();
  t.after(() => { input.destroy(); output.destroy(); });
  let calls = 0;
  const app = {
    config: {
      securityProfile: 'default',
      mcpPublicToolNames: ['record_memory'],
      allowedAgentAlias: 'Codex'
    },
    async callTool(name, args, context) {
      calls += 1;
      assert.equal(name, 'record_memory');
      assert.equal(args.title, 'synthetic');
      assert.equal(context.executionContext.agentAlias, 'Codex');
      return { decision: 'accepted', status: 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED' };
    }
  };
  createStdioServer({ app, input, output, baseRequestContext: { executionContext: { agentAlias: 'Codex' } } });
  const client = createCm2113StdioMcpFrameClient({ input, output, processBoundary: false });
  t.after(() => client.close());
  const result = await executeCm2113RecordMemoryStdioSequence({
    client,
    arguments: {
      target: 'knowledge',
      title: 'synthetic',
      content: 'Synthetic proof only.',
      evidence: 'CM-2113 transport test.',
      validated: true,
      reusable: false,
      sensitivity: 'internal'
    }
  });
  assert.equal(result.result.status, 'GOVERNED_MCP_VCP_NATIVE_WRITE_DELEGATED');
  assert.equal(result.receipt.outerTransport, 'stdio_mcp');
  assert.equal(result.receipt.contentLengthFramingUsed, true);
  assert.equal(result.receipt.framesSent, 3);
  assert.equal(result.receipt.framesReceived, 3);
  assert.equal(result.receipt.recordMemoryCallCount, 1);
  assert.equal(result.receipt.directApplicationCallByClient, false);
  assert.deepEqual(result.receipt.exposedToolNames, ['record_memory']);
  assert.equal(calls, 1);
});

test('CM-2113 stdio sequence fails closed when isolated tool surface expands', async t => {
  const input = new PassThrough();
  const output = new PassThrough();
  t.after(() => { input.destroy(); output.destroy(); });
  const app = {
    config: { securityProfile: 'default', mcpPublicToolNames: ['record_memory', 'search_memory'] },
    async callTool() { throw new Error('must_not_call'); }
  };
  createStdioServer({ app, input, output });
  const client = createCm2113StdioMcpFrameClient({ input, output });
  t.after(() => client.close());
  await assert.rejects(
    executeCm2113RecordMemoryStdioSequence({ client, arguments: { title: 'synthetic' } }),
    /tool_surface_mismatch/
  );
});

test('CM-2113 stdio client rejects pending request when child transport closes', async t => {
  const input = new PassThrough();
  const output = new PassThrough();
  t.after(() => { input.destroy(); output.destroy(); });
  const client = createCm2113StdioMcpFrameClient({ input, output, timeoutMs: 60_000 });
  t.after(() => client.close());
  const pending = client.request({ jsonrpc: '2.0', id: 99, method: 'initialize', params: {} });
  output.end();
  await assert.rejects(pending, /transport_closed/);
});
