const { CodexMemoryMcpServer } = require('./server');

function encodeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const headers = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8');
  return Buffer.concat([headers, body]);
}

const MAX_STDIO_MESSAGE_BYTES = 1024 * 1024;
const MAX_STDIO_BUFFER_BYTES = 2 * 1024 * 1024;

function createStdioServer({ app, input = process.stdin, output = process.stdout, baseRequestContext = {} }) {
  const server = new CodexMemoryMcpServer({ app });
  let buffer = Buffer.alloc(0);
  let drainScheduled = false;
  let oversizedDiscardRemainingBytes = 0;

  async function processOneMessage(messageBuffer) {
    let message;
    try {
      message = JSON.parse(messageBuffer.toString('utf8'));
    } catch (error) {
      output.write(encodeMessage({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: error.message
        }
      }));
      return;
    }

    const result = await server.handleJsonRpc(message, {
      ...baseRequestContext,
      executionContext: {
        agentAlias: process.env.CODEX_MEMORY_AGENT_ALIAS || baseRequestContext.executionContext?.agentAlias || 'Codex',
        agentId: process.env.CODEX_MEMORY_AGENT_ID || baseRequestContext.executionContext?.agentId || app.config.defaultAgentId,
        requestSource: process.env.CODEX_MEMORY_REQUEST_SOURCE || baseRequestContext.executionContext?.requestSource || app.config.defaultRequestSource
      }
    });

    if (result && !result.notification && result.response) {
      output.write(encodeMessage(result.response));
    }
  }

  function discardOversizedFrameBytes(data) {
    if (oversizedDiscardRemainingBytes <= 0) return data;

    const discardCount = Math.min(oversizedDiscardRemainingBytes, data.length);
    oversizedDiscardRemainingBytes -= discardCount;
    return data.slice(discardCount);
  }

  async function drainBuffer() {
    if (drainScheduled) return;
    drainScheduled = true;

    try {
      while (true) {
        const separatorIndex = buffer.indexOf('\r\n\r\n');
        if (separatorIndex < 0) return;

        const headerText = buffer.slice(0, separatorIndex).toString('utf8');
        const lengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);
        if (!lengthMatch) {
          throw new Error('Missing Content-Length header');
        }

        const contentLength = Number.parseInt(lengthMatch[1], 10);
        const bodyStart = separatorIndex + 4;
        const bodyEnd = bodyStart + contentLength;
        if (contentLength > MAX_STDIO_MESSAGE_BYTES) {
          const availableBodyBytes = Math.max(0, buffer.length - bodyStart);
          const discardNow = Math.min(availableBodyBytes, contentLength);
          const currentFrameEnd = bodyStart + discardNow;

          oversizedDiscardRemainingBytes = contentLength - discardNow;
          buffer = buffer.slice(currentFrameEnd);

          output.write(encodeMessage({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32603,
              message: 'Transport error',
              data: 'Message too large'
            }
          }));

          // If more oversized body bytes are still in flight, wait for them
          // via discardOversizedFrameBytes (in input.on('data')) before
          // resuming normal parse. Continue looking for the next valid frame
          // if the current buffer already has one.
          if (oversizedDiscardRemainingBytes > 0) return;
          continue;
        }
        if (buffer.length < bodyEnd) return;

        const body = buffer.slice(bodyStart, bodyEnd);
        buffer = buffer.slice(bodyEnd);
        await processOneMessage(body);
      }
    } catch (error) {
      output.write(encodeMessage({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Transport error',
          data: error.message
        }
      }));
    } finally {
      drainScheduled = false;
    }
  }

  input.on('data', chunk => {
    let data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

    // If we are in oversized frame discard mode, consume body bytes without
    // adding them to the parse buffer. This prevents oversized body fragments
    // from being misinterpreted as the next frame header.
    if (oversizedDiscardRemainingBytes > 0) {
      data = discardOversizedFrameBytes(data);
      if (data.length === 0) return;
    }

    buffer = Buffer.concat([buffer, data]);

    if (buffer.length > MAX_STDIO_BUFFER_BYTES) {
      buffer = Buffer.alloc(0);
      output.write(encodeMessage({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Transport error',
          data: 'Buffer overflow'
        }
      }));
      return;
    }

    drainBuffer().catch(error => {
      output.write(encodeMessage({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Unhandled transport error',
          data: error.message
        }
      }));
    });
  });

  return server;
}

module.exports = {
  createStdioServer,
  encodeMessage
};
