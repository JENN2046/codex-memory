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

test('oversized header first then body later: no desync, valid frame after', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const app = createMockApp();
  createStdioServer({ app, input, output });

  const oversizedLength = 1024 * 1024 + 1;

  // Send oversized header first (no body)
  input.write(`Content-Length: ${oversizedLength}\r\n\r\n`);

  // Collect error response
  const errorPromise = new Promise(resolve => {
    output.on('data', chunk => {
      const text = chunk.toString();
      if (text.includes('Message too large')) resolve(text);
    });
  });

  // Now send the oversized body — must be discarded, not parsed as next frame
  input.write(Buffer.alloc(oversizedLength).fill('x'));

  await errorPromise;

  // After oversized frame is fully discarded, send a valid ping
  const validBody = JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'ping' });
  input.write(`Content-Length: ${Buffer.byteLength(validBody)}\r\n\r\n${validBody}`);

  const validResult = await new Promise(resolve => {
    output.on('data', chunk => {
      const text = chunk.toString();
      if (text.includes('"jsonrpc":"2.0"') && text.includes('"id":99')) resolve(text);
    });
  });

  assert.ok(validResult, 'valid request after oversized discard must receive response');
  assert.ok(validResult.includes('"result"'));
});

test('oversized frame then valid frame in same chunk: process both', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const app = createMockApp();
  createStdioServer({ app, input, output });

  const oversizedLength = 1024 * 1024 + 1;

  // Build oversized frame + valid frame in one chunk
  const oversizedFrame = `Content-Length: ${oversizedLength}\r\n\r\n${'x'.repeat(oversizedLength)}`;
  const validBody = JSON.stringify({ jsonrpc: '2.0', id: 100, method: 'ping' });
  const validFrame = `Content-Length: ${Buffer.byteLength(validBody)}\r\n\r\n${validBody}`;

  input.write(oversizedFrame + validFrame);

  const validResult = await new Promise(resolve => {
    output.on('data', chunk => {
      const text = chunk.toString();
      if (text.includes('"jsonrpc":"2.0"') && text.includes('"id":100')) resolve(text);
    });
  });

  assert.ok(validResult, 'valid frame after oversized in same chunk must be processed');
  assert.ok(validResult.includes('"result"'));
});

test('headerless garbage triggers buffer overflow safety', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const app = createMockApp();
  createStdioServer({ app, input, output });

  // Write 2MB+ of garbage that never produces a valid header
  const garbage = Buffer.alloc(2 * 1024 * 1024 + 1).fill('G');
  input.write(garbage);

  const result = await new Promise(resolve => {
    output.on('data', chunk => {
      resolve(chunk.toString());
    });
  });

  assert.ok(result.includes('Buffer overflow'));
});
