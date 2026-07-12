'use strict';

const { encodeMessage } = require('../adapters/codex-mcp/stdio');

function createCm2113StdioMcpFrameClient({ input, output, processBoundary = false, timeoutMs = 30_000 }) {
  if (!input || typeof input.write !== 'function' || !output || typeof output.on !== 'function') {
    throw new Error('cm2113_stdio_streams_required');
  }
  let buffer = Buffer.alloc(0);
  const pending = new Map();
  let framesSent = 0;
  let framesReceived = 0;

  function failAll(error) {
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    pending.clear();
  }

  function settleMessage(message) {
    const waiter = pending.get(message?.id);
    if (!waiter) return;
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    waiter.resolve(message);
  }

  function drain() {
    while (true) {
      const separator = buffer.indexOf('\r\n\r\n');
      if (separator < 0) return;
      const header = buffer.slice(0, separator).toString('utf8');
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) throw new Error('cm2113_stdio_content_length_missing');
      const length = Number.parseInt(match[1], 10);
      const start = separator + 4;
      const end = start + length;
      if (buffer.length < end) return;
      const body = buffer.slice(start, end);
      buffer = buffer.slice(end);
      framesReceived += 1;
      settleMessage(JSON.parse(body.toString('utf8')));
    }
  }

  function onData(chunk) {
    try {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      if (buffer.length > 1024 * 1024) throw new Error('cm2113_stdio_response_budget_exceeded');
      drain();
    } catch {
      failAll(new Error('cm2113_stdio_response_framing_failed'));
    }
  }
  output.on('data', onData);

  async function request(message) {
    if (!Number.isInteger(message?.id)) throw new Error('cm2113_stdio_request_id_required');
    if (pending.has(message.id)) throw new Error('cm2113_stdio_request_id_reused');
    const response = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(message.id);
        reject(new Error('cm2113_stdio_response_timeout'));
      }, timeoutMs);
      if (typeof timer.unref === 'function') timer.unref();
      pending.set(message.id, { resolve, reject, timer });
    });
    framesSent += 1;
    try {
      input.write(encodeMessage(message));
    } catch {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(waiter?.timer);
      throw new Error('cm2113_stdio_request_write_failed');
    }
    return response;
  }

  function close() {
    output.off('data', onData);
    failAll(new Error('cm2113_stdio_client_closed'));
  }

  function receipt() {
    return {
      outerTransport: 'stdio_mcp',
      contentLengthFramingUsed: true,
      processBoundary: processBoundary === true,
      framesSent,
      framesReceived,
      rawRequestDisclosed: false,
      rawResponseDisclosed: false,
      endpointDisclosed: false,
      tokenMaterialDisclosed: false
    };
  }

  return { request, receipt, close };
}

async function executeCm2113RecordMemoryStdioSequence({ client, arguments: args }) {
  const initialize = await client.request({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'cm2113-proof-client', version: '1' } }
  });
  if (initialize?.id !== 1 || initialize?.error) throw new Error('cm2113_stdio_initialize_failed');
  const toolsList = await client.request({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const toolNames = Array.isArray(toolsList?.result?.tools)
    ? toolsList.result.tools.map(tool => tool?.name).filter(Boolean).sort()
    : [];
  if (JSON.stringify(toolNames) !== JSON.stringify(['record_memory'])) {
    throw new Error('cm2113_stdio_tool_surface_mismatch');
  }
  const call = await client.request({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'record_memory', arguments: args }
  });
  if (call?.id !== 3 || call?.error || !call?.result?.structuredContent) {
    throw new Error('cm2113_stdio_tools_call_failed');
  }
  return {
    result: call.result.structuredContent,
    receipt: {
      ...client.receipt(),
      initializeResponseIdMatched: true,
      toolsListResponseIdMatched: true,
      toolsCallResponseIdMatched: true,
      exposedToolNames: toolNames,
      recordMemoryCallCount: 1,
      directApplicationCallByClient: false
    }
  };
}

module.exports = {
  createCm2113StdioMcpFrameClient,
  executeCm2113RecordMemoryStdioSequence
};
