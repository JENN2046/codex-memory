'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');

const { createStdioServer, encodeMessage } = require('../src/adapters/codex-mcp/stdio');

function createMockApp() {
  return {
    config: {
      defaultAgentId: 'test-agent',
      defaultRequestSource: 'test'
    },
    callTool: async () => ({ decision: 'accepted' })
  };
}

test('stdio accepts normal-sized messages', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const app = createMockApp();
  createStdioServer({ app, input, output });

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'ping'
  });

  input.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);

  const result = await new Promise(resolve => {
    output.on('data', chunk => {
      resolve(chunk.toString());
    });
  });

  assert.ok(result.includes('Content-Length'));
  assert.ok(result.includes('"jsonrpc":"2.0"'));
});

test('stdio rejects oversized message (Content-Length > 1MB)', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const app = createMockApp();
  createStdioServer({ app, input, output });

  // A message with Content-Length claiming > 1MB
  const fakeLargeLength = 1024 * 1024 + 1;
  input.write(`Content-Length: ${fakeLargeLength}\r\n\r\n`);

  // Write enough data to satisfy the claimed Content-Length
  input.write(Buffer.alloc(fakeLargeLength).fill('x'));

  const result = await new Promise(resolve => {
    output.on('data', chunk => {
      resolve(chunk.toString());
    });
  });

  assert.ok(result.includes('Content-Length'));
  assert.ok(result.includes('Transport error'));
  assert.ok(result.includes('Message too large') || result.includes('too large'));
});

test('stdio rejects oversized buffer (> 2MB total)', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const app = createMockApp();
  createStdioServer({ app, input, output });

  // Write a chunk larger than the buffer limit directly
  const oversized = Buffer.alloc(2 * 1024 * 1024 + 1).fill('x');
  input.write(oversized);

  const result = await new Promise(resolve => {
    output.on('data', chunk => {
      resolve(chunk.toString());
    });
  });

  assert.ok(result.includes('Transport error'));
  assert.ok(result.includes('Buffer overflow'));
});

test('stdio error response does not include original payload', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const app = createMockApp();
  createStdioServer({ app, input, output });

  const fakeLargeLength = 1024 * 1024 + 1;
  input.write(`Content-Length: ${fakeLargeLength}\r\n\r\n`);
  input.write(Buffer.alloc(fakeLargeLength).fill('x'));

  const result = await new Promise(resolve => {
    output.on('data', chunk => {
      resolve(chunk.toString());
    });
  });

  // The error response should not contain the oversized payload content
  assert.doesNotMatch(result, /xxxxx/);
});

test('encodeMessage produces correct Content-Length header', () => {
  const message = { jsonrpc: '2.0', id: 1, result: {} };
  const encoded = encodeMessage(message);
  const asString = encoded.toString();
  const expectedLength = Buffer.byteLength(JSON.stringify(message));

  assert.ok(asString.includes(`Content-Length: ${expectedLength}`));
});
