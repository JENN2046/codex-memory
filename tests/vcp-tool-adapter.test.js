'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createConfig } = require('../src/config/createConfig');
const { VcpToolAdapter } = require('../src/vcp-adapter/VcpToolAdapter');
const { VcpToolBridgeClient } = require('../src/vcp-adapter/VcpToolBridgeClient');
const {
  MAX_OUTPUT_PROJECTION_DEPTH,
  MAX_OUTPUT_PROJECTION_NODES,
  MAX_OUTPUT_PROJECTION_STRING_BYTES,
  MAX_OUTPUT_PROJECTION_TOTAL_BYTES
} = require('../src/vcp-adapter/VcpOutputProjection');

const SYNTHETIC_BRIDGE_KEY = 'synthetic-key-not-a-real-secret';
const DEFAULT_FAKE_ALLOWED_TOOLS = Object.freeze([
  'ArbitraryWeatherTool',
  'DailyNoteSearcher',
  'AsyncTool',
  'FailingTool',
  'TimeoutTool',
  'DisconnectTool',
  'DifferentTool'
]);

class FakeVcpToolBridge {
  constructor({ manifests } = {}) {
    this.received = [];
    this.manifests = manifests || [
      {
        name: 'ArbitraryWeatherTool',
        displayName: 'Arbitrary Weather',
        description: 'Synthetic generic tool',
        capabilities: {
          invocationCommands: [{ command: 'Forecast', example: { city: 'Shanghai' } }]
        },
        extraField: { preserved: true }
      },
      {
        name: 'DailyNoteSearcher',
        displayName: 'Daily Note Searcher',
        description: 'Synthetic manifest only',
        capabilities: {
          invocationCommands: [{ command: 'Search', example: { query: 'VCP' } }]
        }
      }
    ];
  }

  WebSocket = class {
    constructor(url) {
      this.url = url;
      this.readyState = 0;
      this.listeners = new Map();
      const bridge = FakeVcpToolBridge.active;
      this.bridge = bridge;
      bridge.socket = this;
      queueMicrotask(() => {
        this.readyState = 1;
        this.emit('message', {
          data: JSON.stringify({ type: 'connection_ack', data: { serverId: 'synthetic' } })
        });
      });
    }

    addEventListener(type, handler) {
      const handlers = this.listeners.get(type) || [];
      handlers.push(handler);
      this.listeners.set(type, handlers);
    }

    emit(type, event = {}) {
      for (const handler of this.listeners.get(type) || []) handler(event);
    }

    send(payload) {
      this.bridge.handle(this, JSON.parse(payload));
    }

    close() {
      if (this.readyState >= 2) return;
      this.readyState = 3;
      this.emit('close', {});
    }

    serverClose() {
      this.close();
    }
  };

  activate() {
    FakeVcpToolBridge.active = this;
    return this.WebSocket;
  }

  respond(socket, payload) {
    queueMicrotask(() => socket.emit('message', { data: JSON.stringify(payload) }));
  }

  handle(socket, message) {
    this.received.push(message);
    if (message.type === 'get_vcp_manifests') {
      this.respond(socket, {
        type: 'vcp_manifest_response',
        data: {
          requestId: message.data.requestId,
          plugins: this.manifests,
          vcpVersion: 'fake-1'
        }
      });
      return;
    }

    if (message.type !== 'execute_vcp_tool') return;
    const { requestId, toolName, toolArgs } = message.data;
    if (toolName === 'TimeoutTool') return;
    if (toolName === 'DisconnectTool') {
      queueMicrotask(() => socket.serverClose());
      return;
    }
    if (toolName === 'FailingTool') {
      this.respond(socket, {
        type: 'vcp_tool_result',
        data: { requestId, status: 'error', error: 'synthetic_tool_failure' }
      });
      return;
    }
    if (toolName === 'AsyncTool') {
      const taskId = 'synthetic-async-task';
      this.respond(socket, {
        type: 'vcp_tool_result',
        data: { requestId, status: 'success', result: { taskId, accepted: true } }
      });
      setTimeout(() => {
        socket.emit('message', {
          data: JSON.stringify({
            type: 'vcp_tool_status',
            data: { job_id: taskId, stage: 'halfway' }
          })
        });
      }, 5);
      setTimeout(() => {
        socket.emit('message', {
          data: JSON.stringify({
            type: 'vcp_tool_result',
            data: { requestId: taskId, status: 'success', result: { done: true, toolArgs } }
          })
        });
      }, 12);
      return;
    }

    this.respond(socket, {
      type: 'vcp_tool_result',
      data: {
        requestId,
        status: 'success',
        result: { executedTool: toolName, receivedArgs: toolArgs }
      }
    });
  }
}

function createFixture({
  timeout = 40,
  allowedTools = DEFAULT_FAKE_ALLOWED_TOOLS,
  manifests,
  key = SYNTHETIC_BRIDGE_KEY,
  requestIdFactory
} = {}) {
  const bridge = new FakeVcpToolBridge({ manifests });
  const generatedRequestIdFactory = requestIdFactory || (() => {
    let sequence = 0;
    return () => `adapter-request-${++sequence}`;
  })();
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key,
    requestTimeoutMs: timeout,
    WebSocketImpl: bridge.activate(),
    requestIdFactory: generatedRequestIdFactory
  });
  return {
    bridge,
    client,
    adapter: new VcpToolAdapter({ client, allowedTools })
  };
}

function createConnectHarness(onConnect = () => {}) {
  const harness = {
    socketCount: 0,
    sockets: []
  };
  harness.WebSocket = class {
    constructor() {
      harness.socketCount += 1;
      harness.sockets.push(this);
      this.readyState = 0;
      this.listeners = new Map();
      this.sent = [];
      queueMicrotask(() => onConnect(this, harness));
    }

    addEventListener(type, handler) {
      const handlers = this.listeners.get(type) || [];
      handlers.push(handler);
      this.listeners.set(type, handlers);
    }

    emit(type, event = {}) {
      for (const handler of this.listeners.get(type) || []) handler(event);
    }

    acknowledge() {
      this.readyState = 1;
      this.emit('message', {
        data: JSON.stringify({ type: 'connection_ack', data: { serverId: 'synthetic' } })
      });
    }

    send(payload) {
      this.sent.push(JSON.parse(payload));
    }

    close() {
      if (this.readyState >= 2) return;
      this.readyState = 3;
      this.emit('close', {});
    }
  };
  return harness;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function bridgeMessage(type, data) {
  return JSON.stringify({ type, data });
}

function nextTurn() {
  return new Promise(resolve => setImmediate(resolve));
}

async function captureUnhandledRejections(run) {
  const unhandled = [];
  const listener = reason => unhandled.push(reason);
  process.on('unhandledRejection', listener);
  try {
    await run(unhandled);
    await new Promise(resolve => setImmediate(resolve));
  } finally {
    process.off('unhandledRejection', listener);
  }
  return unhandled;
}

test('synchronous configuration failure preserves the original rejection without an unhandled rejection', async () => {
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: '',
    requestTimeoutMs: 20
  });
  const unhandled = await captureUnhandledRejections(async () => {
    await assert.rejects(
      client.connect(),
      error => error.code === 'VCP_BRIDGE_KEY_REQUIRED'
    );
  });

  assert.deepEqual(unhandled, []);
  assert.equal(client.connected, false);
  assert.equal(client.connectPromise, null);
  assert.equal(client.socket, null);
});

test('synchronous WebSocket constructor failure rejects once and clears the connection attempt', async () => {
  let socketCount = 0;
  class ThrowingWebSocket {
    constructor() {
      socketCount += 1;
      throw new Error('synthetic_constructor_failure');
    }
  }
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 20,
    WebSocketImpl: ThrowingWebSocket
  });
  const unhandled = await captureUnhandledRejections(async () => {
    await assert.rejects(
      client.connect(),
      error => error.code === 'VCP_BRIDGE_CONNECTION_ERROR' &&
        error.message === 'synthetic_constructor_failure'
    );
  });

  assert.equal(socketCount, 1);
  assert.deepEqual(unhandled, []);
  assert.equal(client.connectPromise, null);
  assert.equal(client.socket, null);
});

test('asynchronous socket error rejects and cleans the active connection attempt', async () => {
  const harness = createConnectHarness(socket => {
    socket.emit('error', { error: new Error('synthetic_async_connection_failure') });
  });
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 20,
    WebSocketImpl: harness.WebSocket
  });
  const unhandled = await captureUnhandledRejections(async () => {
    await assert.rejects(
      client.connect(),
      error => error.code === 'VCP_BRIDGE_CONNECTION_ERROR' &&
        error.message === 'synthetic_async_connection_failure'
    );
  });

  assert.equal(harness.socketCount, 1);
  assert.deepEqual(unhandled, []);
  assert.equal(client.connected, false);
  assert.equal(client.connectPromise, null);
  assert.equal(client.socket, null);
});

test('handshake timeout rejects and leaves no stale connection attempt', async () => {
  const harness = createConnectHarness();
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 10,
    WebSocketImpl: harness.WebSocket
  });

  await assert.rejects(
    client.connect(),
    error => error.code === 'VCP_BRIDGE_CONNECT_TIMEOUT'
  );
  assert.equal(client.connected, false);
  assert.equal(client.connectPromise, null);
  assert.equal(client.socket, null);
  assert.equal(harness.sockets[0].readyState, 3);
});

test('concurrent connect callers share one successful physical connection attempt', async () => {
  const harness = createConnectHarness(socket => {
    setTimeout(() => socket.acknowledge(), 5);
  });
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 30,
    WebSocketImpl: harness.WebSocket
  });

  const first = client.connect();
  const second = client.connect();
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(harness.socketCount, 1);
  assert.equal(client.connected, true);
  assert.equal(client.connectPromise, null);
  client.disconnect();
});

test('concurrent connect callers share one failed physical connection attempt', async () => {
  const failure = new Error('synthetic_shared_connection_failure');
  const harness = createConnectHarness(socket => {
    setTimeout(() => socket.emit('error', { error: failure }), 5);
  });
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 30,
    WebSocketImpl: harness.WebSocket
  });

  const unhandled = await captureUnhandledRejections(async () => {
    const first = client.connect();
    const second = client.connect();
    assert.equal(first, second);
    const outcomes = await Promise.allSettled([first, second]);
    assert.equal(outcomes[0].status, 'rejected');
    assert.equal(outcomes[1].status, 'rejected');
    assert.equal(outcomes[0].reason, outcomes[1].reason);
    assert.equal(outcomes[0].reason.code, 'VCP_BRIDGE_CONNECTION_ERROR');
  });

  assert.equal(harness.socketCount, 1);
  assert.deepEqual(unhandled, []);
  assert.equal(client.connectPromise, null);
});

test('a failed connection attempt can be retried successfully', async () => {
  const client = new VcpToolBridgeClient({ bridgeUrl: '', key: '', requestTimeoutMs: 30 });
  await assert.rejects(
    client.connect(),
    error => error.code === 'VCP_BRIDGE_URL_REQUIRED'
  );
  assert.equal(client.connectPromise, null);

  const harness = createConnectHarness(socket => socket.acknowledge());
  client.bridgeUrl = 'ws://127.0.0.1:1';
  client.key = 'synthetic-key-not-a-real-secret';
  client.WebSocketImpl = harness.WebSocket;
  await client.connect();

  assert.equal(harness.socketCount, 1);
  assert.equal(client.connected, true);
  assert.equal(client.connectPromise, null);
  client.disconnect();
});

test('a delayed acknowledgement from a stale socket cannot settle a retry', async () => {
  const delayedAck = createDeferred();
  const harness = createConnectHarness((socket, state) => {
    if (state.socketCount !== 1) return;
    socket.emit('message', {
      data: { text: () => delayedAck.promise }
    });
  });
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 100,
    WebSocketImpl: harness.WebSocket
  });

  const unhandled = await captureUnhandledRejections(async () => {
    const firstAttempt = client.connect();
    await new Promise(resolve => setImmediate(resolve));
    const staleSocket = harness.sockets[0];
    staleSocket.close();
    await assert.rejects(
      firstAttempt,
      error => error.code === 'VCP_BRIDGE_DISCONNECTED'
    );

    const secondAttempt = client.connect();
    const currentSocket = harness.sockets[1];
    let secondSettled = false;
    secondAttempt.then(
      () => { secondSettled = true; },
      () => { secondSettled = true; }
    );

    delayedAck.resolve(JSON.stringify({
      type: 'connection_ack',
      data: { serverId: 'stale-synthetic' }
    }));
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(currentSocket.readyState, 0);
    assert.equal(secondSettled, false);
    assert.equal(client.connected, false);

    currentSocket.acknowledge();
    await secondAttempt;
    assert.equal(client.connected, true);
    client.disconnect();
  });

  assert.deepEqual(unhandled, []);
  assert.equal(harness.socketCount, 2);
});

test('a delayed tool result from a stale socket cannot revive a disconnected request', async () => {
  const harness = createConnectHarness(socket => socket.acknowledge());
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 100,
    WebSocketImpl: harness.WebSocket
  });

  await client.connect();
  const staleSocket = harness.sockets[0];
  const execution = client.executeTool({
    toolName: 'ArbitraryTool',
    toolArgs: { arbitrary: true },
    requestId: 'stale-result-request'
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(staleSocket.sent.length, 1);

  const delayedResult = createDeferred();
  staleSocket.emit('message', {
    data: { text: () => delayedResult.promise }
  });
  await new Promise(resolve => setImmediate(resolve));
  staleSocket.close();

  const disconnected = await execution;
  assert.equal(disconnected.status, 'failed');
  assert.equal(disconnected.error, 'vcp_bridge_disconnected');

  await client.connect();
  assert.equal(client.connected, true);
  delayedResult.resolve(JSON.stringify({
    type: 'vcp_tool_result',
    data: {
      requestId: 'stale-result-request',
      status: 'success',
      result: { stale: true }
    }
  }));
  await new Promise(resolve => setImmediate(resolve));

  const state = client.getRequestStatus('stale-result-request');
  assert.equal(state.status, 'failed');
  assert.equal(state.error, 'vcp_bridge_disconnected');
  assert.equal(state.result, null);
  assert.equal(client.connected, true);
  assert.equal(harness.sockets[1].readyState, 1);
  client.disconnect();
});

test('same-socket progress messages are applied in arrival order despite async decode latency', async () => {
  const harness = createConnectHarness(socket => socket.acknowledge());
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 100,
    WebSocketImpl: harness.WebSocket
  });

  await client.connect();
  const socket = harness.sockets[0];
  const execution = client.executeTool({
    toolName: 'OrderedProgressTool',
    toolArgs: {},
    requestId: 'ordered-progress-request'
  });
  await nextTurn();

  const slowFirstDecode = createDeferred();
  let secondDecodeStarted = false;
  socket.emit('message', {
    data: { text: () => slowFirstDecode.promise }
  });
  socket.emit('message', {
    data: {
      text: () => {
        secondDecodeStarted = true;
        return Promise.resolve(bridgeMessage('vcp_tool_status', {
          requestId: 'ordered-progress-request',
          progress: 20
        }));
      }
    }
  });
  await nextTurn();
  assert.equal(secondDecodeStarted, false);

  slowFirstDecode.resolve(bridgeMessage('vcp_tool_status', {
    requestId: 'ordered-progress-request',
    progress: 10
  }));
  await nextTurn();

  assert.equal(secondDecodeStarted, true);
  assert.equal(client.getRequestStatus('ordered-progress-request').progress.progress, 20);

  socket.emit('message', {
    data: bridgeMessage('vcp_tool_result', {
      requestId: 'ordered-progress-request',
      status: 'success',
      result: { done: true }
    })
  });
  const completed = await execution;
  assert.equal(completed.status, 'completed');
  client.disconnect();
});

test('an earlier completed result remains terminal when a later running status decodes faster', async () => {
  const harness = createConnectHarness(socket => socket.acknowledge());
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 100,
    WebSocketImpl: harness.WebSocket
  });

  await client.connect();
  const socket = harness.sockets[0];
  const execution = client.executeTool({
    toolName: 'TerminalOrderingTool',
    toolArgs: {},
    requestId: 'terminal-order-request'
  });
  await nextTurn();

  const slowCompletedDecode = createDeferred();
  let laterStatusDecodeStarted = false;
  socket.emit('message', {
    data: { text: () => slowCompletedDecode.promise }
  });
  socket.emit('message', {
    data: {
      text: () => {
        laterStatusDecodeStarted = true;
        return Promise.resolve(bridgeMessage('vcp_tool_status', {
          requestId: 'terminal-order-request',
          stage: 'must-not-regress'
        }));
      }
    }
  });
  await nextTurn();
  assert.equal(laterStatusDecodeStarted, false);

  slowCompletedDecode.resolve(bridgeMessage('vcp_tool_result', {
    requestId: 'terminal-order-request',
    status: 'success',
    result: { firstTerminal: 'completed' }
  }));
  const completed = await execution;
  await nextTurn();

  assert.equal(laterStatusDecodeStarted, true);
  assert.equal(completed.status, 'completed');
  assert.equal(client.getRequestStatus('terminal-order-request').status, 'completed');

  socket.emit('message', {
    data: bridgeMessage('vcp_tool_result', {
      requestId: 'terminal-order-request',
      status: 'error',
      error: 'later_terminal_conflict'
    })
  });
  await nextTurn();
  const firstTerminal = client.getRequestStatus('terminal-order-request');
  assert.equal(firstTerminal.status, 'completed');
  assert.deepEqual(firstTerminal.result, { firstTerminal: 'completed' });
  assert.equal(firstTerminal.error, null);
  client.disconnect();
});

test('an earlier running status is applied before a later completed result', async () => {
  const harness = createConnectHarness(socket => socket.acknowledge());
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 100,
    WebSocketImpl: harness.WebSocket
  });

  await client.connect();
  const socket = harness.sockets[0];
  const execution = client.executeTool({
    toolName: 'ProgressThenResultTool',
    toolArgs: {},
    requestId: 'progress-then-result-request'
  });
  await nextTurn();

  const slowProgressDecode = createDeferred();
  let resultDecodeStarted = false;
  socket.emit('message', {
    data: { text: () => slowProgressDecode.promise }
  });
  socket.emit('message', {
    data: {
      text: () => {
        resultDecodeStarted = true;
        return Promise.resolve(bridgeMessage('vcp_tool_result', {
          requestId: 'progress-then-result-request',
          status: 'success',
          result: { done: true }
        }));
      }
    }
  });
  await nextTurn();
  assert.equal(resultDecodeStarted, false);

  slowProgressDecode.resolve(bridgeMessage('vcp_tool_status', {
    requestId: 'progress-then-result-request',
    stage: 'before-completion'
  }));
  const completed = await execution;

  assert.equal(resultDecodeStarted, true);
  assert.equal(completed.status, 'completed');
  const state = client.getRequestStatus('progress-then-result-request');
  assert.equal(state.status, 'completed');
  assert.equal(state.progress.stage, 'before-completion');
  client.disconnect();
});

test('failed and timeout request states ignore later nonterminal and terminal messages', async () => {
  {
    const harness = createConnectHarness(socket => socket.acknowledge());
    const client = new VcpToolBridgeClient({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: 'synthetic-key-not-a-real-secret',
      requestTimeoutMs: 100,
      WebSocketImpl: harness.WebSocket
    });
    await client.connect();
    const socket = harness.sockets[0];
    const execution = client.executeTool({
      toolName: 'FirstFailureWinsTool',
      toolArgs: {},
      requestId: 'failed-terminal-request'
    });
    await nextTurn();
    socket.emit('message', {
      data: bridgeMessage('vcp_tool_result', {
        requestId: 'failed-terminal-request',
        status: 'error',
        error: 'first_failure'
      })
    });
    const failed = await execution;
    assert.equal(failed.status, 'failed');

    socket.emit('message', {
      data: bridgeMessage('vcp_tool_status', {
        requestId: 'failed-terminal-request',
        stage: 'must-not-run'
      })
    });
    socket.emit('message', {
      data: bridgeMessage('vcp_tool_result', {
        requestId: 'failed-terminal-request',
        status: 'success',
        result: { mustNotWin: true }
      })
    });
    await nextTurn();

    const state = client.getRequestStatus('failed-terminal-request');
    assert.equal(state.status, 'failed');
    assert.equal(state.error, 'first_failure');
    assert.equal(state.progress, null);
    assert.equal(state.result, null);
    client.disconnect();
  }

  {
    const harness = createConnectHarness(socket => socket.acknowledge());
    const client = new VcpToolBridgeClient({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: 'synthetic-key-not-a-real-secret',
      requestTimeoutMs: 15,
      WebSocketImpl: harness.WebSocket
    });
    await client.connect();
    const socket = harness.sockets[0];
    const timedOut = await client.executeTool({
      toolName: 'TimeoutFirstWinsTool',
      toolArgs: {},
      requestId: 'timeout-terminal-request'
    });
    assert.equal(timedOut.status, 'timeout');

    socket.emit('message', {
      data: bridgeMessage('vcp_tool_status', {
        requestId: 'timeout-terminal-request',
        stage: 'must-not-run'
      })
    });
    socket.emit('message', {
      data: bridgeMessage('vcp_tool_result', {
        requestId: 'timeout-terminal-request',
        status: 'success',
        result: { mustNotWin: true }
      })
    });
    await nextTurn();

    const state = client.getRequestStatus('timeout-terminal-request');
    assert.equal(state.status, 'timeout');
    assert.equal(state.error, 'vcp_bridge_request_timeout');
    assert.equal(state.progress, null);
    assert.equal(state.result, null);
    client.disconnect();
  }
});

test('a slow old-socket decode does not block the replacement socket message chain', async () => {
  const slowOldAck = createDeferred();
  const harness = createConnectHarness((socket, state) => {
    if (state.socketCount === 1) {
      socket.emit('message', { data: { text: () => slowOldAck.promise } });
    } else {
      socket.acknowledge();
    }
  });
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 100,
    WebSocketImpl: harness.WebSocket
  });

  const firstAttempt = client.connect();
  await nextTurn();
  harness.sockets[0].close();
  await assert.rejects(firstAttempt, error => error.code === 'VCP_BRIDGE_DISCONNECTED');

  await client.connect();
  assert.equal(client.connected, true);
  assert.equal(harness.sockets[1].readyState, 1);

  slowOldAck.resolve(bridgeMessage('connection_ack', { serverId: 'stale-synthetic' }));
  await nextTurn();
  assert.equal(client.connected, true);
  assert.equal(client.socket, harness.sockets[1]);
  client.disconnect();
});

test('a message decode failure does not poison the socket chain or create an unhandled rejection', async () => {
  const harness = createConnectHarness(socket => socket.acknowledge());
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: 100,
    WebSocketImpl: harness.WebSocket
  });

  const unhandled = await captureUnhandledRejections(async () => {
    await client.connect();
    const socket = harness.sockets[0];
    const execution = client.executeTool({
      toolName: 'DecodeRecoveryTool',
      toolArgs: {},
      requestId: 'decode-recovery-request'
    });
    await nextTurn();

    socket.emit('message', {
      data: { text: () => Promise.reject(new Error('synthetic_decode_failure')) }
    });
    socket.emit('message', {
      data: bridgeMessage('vcp_tool_result', {
        requestId: 'decode-recovery-request',
        status: 'success',
        result: { recovered: true }
      })
    });

    const completed = await execution;
    assert.equal(completed.status, 'completed');
    assert.deepEqual(completed.result, { recovered: true });
    client.disconnect();
  });

  assert.deepEqual(unhandled, []);
});

test('fake bridge connects and exposes arbitrary manifests without a second registry', async () => {
  const { bridge, adapter } = createFixture();
  const listed = await adapter.listTools();

  assert.equal(adapter.getStatus().connected, true);
  assert.equal(adapter.getStatus().protocol_ready, true);
  assert.equal(JSON.stringify(adapter.getStatus()).includes('synthetic-key-not-a-real-secret'), false);
  assert.equal(JSON.stringify(adapter.getStatus()).includes('127.0.0.1'), false);
  assert.equal(listed.tools.length, 2);
  assert.equal(listed.tools[0].name, 'ArbitraryWeatherTool');
  assert.deepEqual(listed.tools[0].invocation_commands, bridge.manifests[0].capabilities.invocationCommands);
  assert.equal(listed.tools[0].raw_manifest.extraField.preserved, true);
  assert.equal(bridge.received[0].type, 'get_vcp_manifests');
  assert.match(bridge.socket.url, /\/vcp-distributed-server\/VCP_Key=/u);

  adapter.close();
});

test('generic execution forwards arbitrary tool names, JSON arguments, and request ids', async () => {
  const { bridge, adapter } = createFixture();
  const toolArgs = { city: 'Shanghai', nested: { units: ['celsius'] }, enabled: true };
  const result = await adapter.executeTool({
    tool_name: 'ArbitraryWeatherTool',
    tool_args: toolArgs,
    request_id: 'caller-request-1'
  });

  assert.deepEqual(bridge.received[0], {
    type: 'execute_vcp_tool',
    data: {
      toolName: 'ArbitraryWeatherTool',
      toolArgs,
      requestId: 'caller-request-1'
    }
  });
  assert.equal(result.request_id, 'caller-request-1');
  assert.equal(result.tool_name, 'ArbitraryWeatherTool');
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.result.receivedArgs, toolArgs);

  await assert.rejects(
    adapter.executeTool({
      tool_name: 'DifferentTool',
      tool_args: { shouldNotRun: true },
      request_id: 'caller-request-1'
    }),
    error => error.code === 'VCP_REQUEST_ID_CONFLICT'
  );
  assert.equal(bridge.received.length, 1);

  adapter.close();
});

test('async progress and final result remain correlated to the adapter request id', async () => {
  const { adapter } = createFixture();
  const initial = await adapter.executeTool({
    tool_name: 'AsyncTool',
    tool_args: { arbitrary: 42 },
    request_id: 'caller-async-1'
  });
  assert.equal(initial.status, 'running');

  await new Promise(resolve => setTimeout(resolve, 8));
  const progress = adapter.getToolStatus({ request_id: 'caller-async-1' });
  assert.equal(progress.status, 'running');
  assert.equal(progress.progress.stage, 'halfway');

  await new Promise(resolve => setTimeout(resolve, 10));
  const completed = adapter.getToolStatus({ request_id: 'caller-async-1' });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.result.done, true);

  adapter.close();
});

test('tool errors, timeouts, and disconnects return correlated terminal states', async () => {
  {
    const { adapter } = createFixture();
    const failed = await adapter.executeTool({
      tool_name: 'FailingTool',
      tool_args: {},
      request_id: 'caller-failure-1'
    });
    assert.equal(failed.status, 'failed');
    assert.equal(failed.error, 'synthetic_tool_failure');
    adapter.close();
  }

  {
    const { adapter } = createFixture({ timeout: 15 });
    const timedOut = await adapter.executeTool({
      tool_name: 'TimeoutTool',
      tool_args: {},
      request_id: 'caller-timeout-1'
    });
    assert.equal(timedOut.status, 'timeout');
    assert.equal(timedOut.error, 'vcp_bridge_request_timeout');
    adapter.close();
  }

  {
    const { adapter } = createFixture();
    const disconnected = await adapter.executeTool({
      tool_name: 'DisconnectTool',
      tool_args: {},
      request_id: 'caller-disconnect-1'
    });
    assert.equal(disconnected.status, 'failed');
    assert.equal(disconnected.error, 'vcp_bridge_disconnected');
    assert.equal(adapter.getStatus().connected, false);
  }
});

test('VCP adapter allowlist config is exact, deduplicated, and fail-closed', () => {
  const configured = createConfig({
    projectBasePath: process.cwd(),
    vcpAdapterAllowedTools: ' ToolA,ToolB|ToolA，ToolC '
  });
  assert.deepEqual(configured.vcpAdapter.allowedTools, ['ToolA', 'ToolB', 'ToolC']);

  const explicitEmpty = createConfig({
    projectBasePath: process.cwd(),
    vcpAdapterAllowedTools: []
  });
  assert.deepEqual(explicitEmpty.vcpAdapter.allowedTools, []);

  const invalid = createConfig({
    projectBasePath: process.cwd(),
    vcpAdapterAllowedTools: ['ToolA', 7]
  });
  assert.deepEqual(invalid.vcpAdapter.allowedTools, []);
});

test('default-deny discovers manifests but exposes and executes no tools', async () => {
  const { bridge, adapter } = createFixture({ allowedTools: [] });
  const listed = await adapter.listTools();

  assert.deepEqual(listed, { tools: [] });
  assert.equal(adapter.getStatus().tools_discovered, 0);
  assert.equal(bridge.received.length, 1);
  assert.equal(bridge.received[0].type, 'get_vcp_manifests');
  await assert.rejects(
    adapter.executeTool({ tool_name: 'ArbitraryWeatherTool', tool_args: {} }),
    error => error.code === 'VCP_TOOL_NOT_ALLOWED' && error.jsonRpcCode === -32001
  );
  assert.equal(bridge.received.length, 1);
  adapter.close();
});

test('allowlist filters discovered manifests and remains data-driven across tools', async () => {
  const manifests = ['ToolA', 'ToolB', 'ToolC'].map(name => ({
    name,
    description: `Synthetic ${name}`
  }));
  const first = createFixture({ allowedTools: ['ToolA'], manifests });
  const listed = await first.adapter.listTools();
  assert.deepEqual(listed.tools.map(tool => tool.name), ['ToolA']);

  const allowed = await first.adapter.executeTool({
    tool_name: 'ToolA',
    tool_args: { nested: { values: [1, true, null] } },
    request_id: 'allow-tool-a'
  });
  assert.equal(allowed.status, 'completed');
  const bridgeMessagesBeforeDeny = first.bridge.received.length;
  await assert.rejects(
    first.adapter.executeTool({
      tool_name: 'ToolB',
      tool_args: {},
      request_id: 'deny-tool-b'
    }),
    error => error.code === 'VCP_TOOL_NOT_ALLOWED'
  );
  assert.equal(first.bridge.received.length, bridgeMessagesBeforeDeny);
  first.adapter.close();

  const second = createFixture({ allowedTools: ['ToolB'], manifests });
  const secondResult = await second.adapter.executeTool({
    tool_name: 'ToolB',
    tool_args: { arbitrary: true }
  });
  assert.equal(secondResult.result.executedTool, 'ToolB');
  assert.equal(second.bridge.received[0].data.toolName, 'ToolB');
  second.adapter.close();
});

test('generic argument validation rejects unsafe or non-JSON requests before the Bridge', async () => {
  const circular = {};
  circular.self = circular;
  const unsafePrototypeKey = JSON.parse('{"__proto__":{"polluted":true}}');
  const unsafeNestedConstructor = { nested: JSON.parse('{"constructor":{"value":true}}') };
  const invalidCases = [
    { tool_args: null, code: 'VCP_TOOL_ARGS_INVALID' },
    { tool_args: [], code: 'VCP_TOOL_ARGS_INVALID' },
    { tool_args: circular, code: 'VCP_TOOL_ARGS_INVALID' },
    { tool_args: unsafePrototypeKey, code: 'VCP_TOOL_ARGS_UNSAFE' },
    { tool_args: unsafeNestedConstructor, code: 'VCP_TOOL_ARGS_UNSAFE' },
    { tool_args: { callback() {} }, code: 'VCP_TOOL_ARGS_INVALID' },
    { tool_args: { value: Symbol('invalid') }, code: 'VCP_TOOL_ARGS_INVALID' },
    { tool_args: { value: 1n }, code: 'VCP_TOOL_ARGS_INVALID' },
    { tool_args: { value: Number.NaN }, code: 'VCP_TOOL_ARGS_INVALID' },
    { tool_args: { payload: 'x'.repeat(64 * 1024) }, code: 'VCP_TOOL_ARGS_TOO_LARGE' }
  ];

  for (const [index, invalid] of invalidCases.entries()) {
    const { bridge, adapter } = createFixture({ allowedTools: ['ToolA'] });
    await assert.rejects(
      adapter.executeTool({
        tool_name: 'ToolA',
        tool_args: invalid.tool_args,
        request_id: `invalid-args-${index}`
      }),
      error => error.code === invalid.code
    );
    assert.equal(bridge.received.length, 0);
    adapter.close();
  }
});

test('validation error paths escape attacker controls and redact the Bridge credential before logging', async () => {
  const syntheticCredential = 'synthetic-validation-log-secret';
  const attackerKey = `${syntheticCredential}-普通字段\r\nFAKE_FIXED_LOG_FIELD\t\u0001`;
  const toolArgs = Object.create(null);
  Object.defineProperty(toolArgs, attackerKey, {
    value: JSON.parse('{"constructor":{"polluted":true}}'),
    enumerable: true,
    configurable: true
  });
  const { bridge, adapter } = createFixture({
    allowedTools: ['ToolA'],
    key: syntheticCredential
  });

  let observedError;
  await assert.rejects(
    adapter.executeTool({
      tool_name: 'ToolA',
      tool_args: toolArgs,
      request_id: 'safe-error-path'
    }),
    error => {
      observedError = error;
      return error.code === 'VCP_TOOL_ARGS_UNSAFE';
    }
  );

  assert.equal(bridge.received.length, 0);
  assert.equal(observedError.message.includes(syntheticCredential), false);
  assert.equal(observedError.message.includes('\r'), false);
  assert.equal(observedError.message.includes('\n'), false);
  assert.equal(observedError.message.includes('\t'), false);
  assert.equal(observedError.message.includes('\u0001'), false);
  assert.match(
    observedError.message,
    /tool_args\.\[REDACTED\]-普通字段\\r\\nFAKE_FIXED_LOG_FIELD\\t\\u0001\.constructor is not allowed/u
  );
  assert.equal(observedError.stack.includes(syntheticCredential), false);
  assert.equal(observedError.stack.includes(`\nFAKE_FIXED_LOG_FIELD`), false);

  let unknownToolError;
  await assert.rejects(
    adapter.callTool(`${syntheticCredential}\r\nUNKNOWN_FAKE_LOG_FIELD\t`),
    error => {
      unknownToolError = error;
      return error.code === 'VCP_ADAPTER_TOOL_UNKNOWN';
    }
  );
  assert.equal(unknownToolError.message.includes(syntheticCredential), false);
  assert.equal(unknownToolError.message.includes('\r'), false);
  assert.equal(unknownToolError.message.includes('\n'), false);
  assert.equal(unknownToolError.message.includes('\t'), false);
  assert.match(unknownToolError.message, /\[REDACTED\]\\r\\nUNKNOWN_FAKE_LOG_FIELD\\t/u);
  assert.equal(bridge.received.length, 0);
  adapter.close();
});

test('boundary-aware credential redaction preserves protocol envelopes and redacts payload values', async () => {
  const fixedKeys = ['status', 'error', 'result', 'request_id', 'tool_name', 'connected'];

  for (const secret of fixedKeys) {
    const syntheticError = Object.assign(new Error(`failure-${secret}`), {
      code: `code-${secret}`
    });
    const client = {
      key: secret,
      getStatus() {
        return {
          connected: true,
          bridge_enabled: true,
          protocol_ready: true,
          tools_discovered: 1,
          pending_requests: 0,
          last_error: `last-${secret}\r\nstatus-line`
        };
      },
      getRequestStatus() {
        return {
          request_id: `request-${secret}`,
          status: `state-${secret}`,
          progress: [secret, { nested: `progress-${secret}` }],
          result: {
            tool_name: `result-${secret}`,
            failure: syntheticError
          },
          error: `error-${secret}`
        };
      },
      async executeTool() {
        return this.getRequestStatus();
      },
      disconnect() {}
    };
    const adapter = new VcpToolAdapter({ client, allowedTools: [secret] });
    const status = adapter.getStatus();
    const requestStatus = adapter.getToolStatus({ request_id: 'lookup-request' });
    const executed = await adapter.executeTool({
      tool_name: secret,
      tool_args: { nested: { allowed: true } },
      request_id: `execute-${secret}`
    });

    for (const key of ['connected', 'last_error']) {
      assert.equal(Object.prototype.hasOwnProperty.call(status, key), true);
    }
    for (const key of ['request_id', 'status', 'progress', 'result', 'error']) {
      assert.equal(Object.prototype.hasOwnProperty.call(requestStatus, key), true);
    }
    for (const key of ['request_id', 'tool_name', 'status', 'result', 'error']) {
      assert.equal(Object.prototype.hasOwnProperty.call(executed, key), true);
    }

    assert.equal(status.last_error.includes(secret), false);
    assert.equal(status.last_error.includes('\r'), false);
    assert.equal(status.last_error.includes('\n'), false);
    assert.equal(status.last_error.includes('\\r\\n'), true);
    assert.equal(requestStatus.request_id, `request-${secret}`);
    assert.equal(requestStatus.status, `state-${secret}`);
    assert.deepEqual(requestStatus.progress, [
      '[REDACTED]',
      { nested: 'progress-[REDACTED]' }
    ]);
    assert.equal(requestStatus.result.tool_name.includes(secret), false);
    assert.equal(requestStatus.result.tool_name.includes('[REDACTED]'), true);
    assert.equal(requestStatus.result.failure.name, 'Error');
    assert.equal(requestStatus.result.failure.message, 'failure-[REDACTED]');
    assert.equal(requestStatus.result.failure.stack.includes(secret), false);
    assert.equal(requestStatus.result.failure.code, 'code-[REDACTED]');
    assert.equal(requestStatus.error.includes(secret), false);
    assert.equal(requestStatus.error.includes('[REDACTED]'), true);
    assert.equal(executed.tool_name, secret);
    assert.equal(executed.request_id, `request-${secret}`);
    assert.equal(executed.status, `state-${secret}`);
    adapter.close();
  }

  const unchanged = {
    request_id: 'request-1',
    status: 'completed',
    progress: [10, { nested: true }],
    result: { ordinary: 'value' },
    error: null
  };
  for (const key of ['', undefined, null, 'unused-secret']) {
    const adapter = new VcpToolAdapter({
      client: {
        key,
        getRequestStatus() {
          return unchanged;
        },
        disconnect() {}
      },
      allowedTools: []
    });
    assert.deepEqual(adapter.getToolStatus({ request_id: 'request-1' }), unchanged);
    adapter.close();
  }
});

test('generated and caller-supplied request ids survive credential collisions and remain queryable', async () => {
  const generatedRequestId = '123e4567-e89b-12d3-a456-426614174000';
  const generated = createFixture({
    allowedTools: ['ToolA'],
    key: '-',
    requestIdFactory: () => generatedRequestId
  });
  const generatedResult = await generated.adapter.executeTool({
    tool_name: 'ToolA',
    tool_args: { source: 'generated' }
  });
  assert.equal(generatedResult.request_id, generatedRequestId);
  assert.equal(generatedResult.request_id.includes('[REDACTED]'), false);
  const generatedStatus = generated.adapter.getToolStatus({
    request_id: generatedResult.request_id
  });
  assert.equal(generatedStatus.request_id, generatedRequestId);
  assert.equal(generatedStatus.status, 'completed');
  assert.equal(generatedStatus.error, null);
  generated.adapter.close();

  for (const requestId of ['status', 'status-123', 'abc-status-def']) {
    const fixture = createFixture({
      allowedTools: ['ToolA'],
      key: 'status'
    });
    const executed = await fixture.adapter.executeTool({
      tool_name: 'ToolA',
      tool_args: { source: 'caller' },
      request_id: requestId
    });
    assert.equal(executed.request_id, requestId);
    assert.equal(executed.request_id.includes('[REDACTED]'), false);
    const status = fixture.adapter.getToolStatus({ request_id: executed.request_id });
    assert.equal(status.request_id, requestId);
    assert.equal(status.status, 'completed');
    assert.equal(status.error, null);
    fixture.adapter.close();
  }
});

test('tool and status identities stay exact while arbitrary manifest and result payloads are redacted', async () => {
  const secret = 'status';
  const manifests = [{
    name: 'status-tool',
    displayName: 'status tool',
    description: 'server credential is status',
    capabilities: {
      invocationCommands: [{ command: 'status-command', example: { token: 'status' } }]
    },
    parameters: { type: 'object', title: 'status schema' },
    metadata: { request_id: 'credential=status' }
  }];
  const fixture = createFixture({
    allowedTools: ['status-tool'],
    key: secret,
    manifests
  });

  const listed = await fixture.adapter.listTools();
  assert.equal(listed.tools[0].name, 'status-tool');
  assert.equal(listed.tools[0].display_name, '[REDACTED] tool');
  assert.equal(listed.tools[0].description, 'server credential is [REDACTED]');
  assert.deepEqual(listed.tools[0].invocation_commands, [
    { command: '[REDACTED]-command', example: { token: '[REDACTED]' } }
  ]);
  assert.deepEqual(listed.tools[0].parameters, {
    type: 'object',
    title: '[REDACTED] schema'
  });
  assert.equal(listed.tools[0].raw_manifest.metadata.request_id, 'credential=[REDACTED]');

  const executed = await fixture.adapter.executeTool({
    tool_name: 'status-tool',
    tool_args: {
      request_id: 'credential=status',
      nested: { message: 'payload status value' }
    },
    request_id: 'status-123'
  });
  assert.equal(executed.request_id, 'status-123');
  assert.equal(executed.tool_name, 'status-tool');
  assert.equal(executed.status, 'completed');
  assert.equal(fixture.bridge.received[1].data.toolName, 'status-tool');
  assert.equal(executed.result.executedTool, '[REDACTED]-tool');
  assert.equal(
    Object.prototype.hasOwnProperty.call(executed.result.receivedArgs, 'request_id'),
    true
  );
  assert.equal(executed.result.receivedArgs.request_id, 'credential=[REDACTED]');
  assert.equal(executed.result.receivedArgs.nested.message, 'payload [REDACTED] value');
  assert.equal(
    fixture.adapter.getToolStatus({ request_id: executed.request_id }).request_id,
    'status-123'
  );
  fixture.adapter.close();

  const completed = createFixture({
    allowedTools: ['ToolA'],
    key: 'completed'
  });
  const completedResult = await completed.adapter.executeTool({
    tool_name: 'ToolA',
    tool_args: {},
    request_id: 'completed-state'
  });
  assert.equal(completedResult.status, 'completed');
  assert.equal(completedResult.status.includes('[REDACTED]'), false);
  completed.adapter.close();

  const failed = createFixture({
    allowedTools: ['FailingTool'],
    key: 'synthetic'
  });
  const failedResult = await failed.adapter.executeTool({
    tool_name: 'FailingTool',
    tool_args: {},
    request_id: 'error-payload'
  });
  assert.equal(failedResult.request_id, 'error-payload');
  assert.equal(failedResult.status, 'failed');
  assert.equal(failedResult.error, '[REDACTED]_tool_failure');
  failed.adapter.close();
});

test('tool name and request id bounds are enforced before the Bridge', async () => {
  const invalidCases = [
    { tool_name: null, request_id: 'valid-id', code: 'VCP_TOOL_NAME_INVALID' },
    { tool_name: '   ', request_id: 'valid-id', code: 'VCP_TOOL_NAME_REQUIRED' },
    { tool_name: 'x'.repeat(257), request_id: 'valid-id', code: 'VCP_TOOL_NAME_INVALID' },
    { tool_name: 'ToolA', request_id: ' ', code: 'VCP_REQUEST_ID_INVALID' },
    { tool_name: 'ToolA', request_id: 'x'.repeat(129), code: 'VCP_REQUEST_ID_INVALID' }
  ];

  for (const invalid of invalidCases) {
    const { bridge, adapter } = createFixture({ allowedTools: ['ToolA'] });
    await assert.rejects(
      adapter.executeTool({
        tool_name: invalid.tool_name,
        tool_args: {},
        request_id: invalid.request_id
      }),
      error => error.code === invalid.code
    );
    assert.equal(bridge.received.length, 0);
    adapter.close();
  }

  const { bridge, adapter } = createFixture({ allowedTools: ['ToolA'] });
  const valid = await adapter.executeTool({
    tool_name: '  ToolA  ',
    tool_args: { options: { limit: 10 } },
    request_id: '  bounded-id  '
  });
  assert.equal(valid.tool_name, 'ToolA');
  assert.equal(valid.request_id, 'bounded-id');
  assert.equal(bridge.received[0].data.toolName, 'ToolA');
  assert.equal(bridge.received[0].data.requestId, 'bounded-id');
  adapter.close();
});

test('tool manifests use one bounded safe source for parameters, commands, and raw output', async () => {
  const credential = 'bridge-secret';
  const safeUnknownContract = {
    mode: 'strict',
    identifier: 'future-value',
    nested: { route: 'semantic-value' }
  };
  const manifests = [{
    name: 'SchemaTool',
    version: '1.0.0',
    displayName: `Schema ${credential} tool`,
    description: `uses credential ${credential}`,
    parameters: {
      $id: 'urn:vcp:schema-tool',
      type: 'object',
      $defs: {
        futureType: { type: 'string' }
      },
      patternProperties: {
        '^future-[a-z]+$': { type: 'string' }
      },
      properties: {
        [credential]: {
          type: 'string'
        },
        mode: {
          $ref: 'https://schemas.invalid/mode',
          type: 'string',
          const: 'one',
          enum: ['one', 'two'],
          title: `credential ${credential} mode`,
          description: `enter credential ${credential}`,
          default: 'safe-default',
          example: 'safe-example',
          examples: ['safe-example', 'future-value'],
          'x-future-vcp-scalar-2046': 'future-string-value',
          'x-future-vcp-contract-2046': safeUnknownContract
        }
      },
      required: ['mode']
    },
    invocationCommands: [`root-tool --key ${credential}`],
    capabilities: {
      invocationCommands: [
        `curl http://127.0.0.1/run?VCP_Key=${credential}`,
        {
          command: `tool --key ${credential}`,
          description: `uses ${credential}`,
          metadata: { endpoint: `ws://host/${credential}` }
        }
      ]
    },
    metadata: {
      description: `nested ${credential} credential`,
      arbitrary: { request_id: `credential=${credential}` }
    }
  }];
  const fixture = createFixture({
    allowedTools: ['SchemaTool'],
    key: credential,
    manifests
  });

  const listed = await fixture.adapter.listTools();
  assert.equal(listed.tools.length, 1);
  const tool = listed.tools[0];
  assert.equal(tool.name, 'SchemaTool');
  assert.equal(tool.raw_manifest.name, 'SchemaTool');
  assert.equal(tool.raw_manifest.version, '1.0.0');
  assert.equal(tool.display_name, 'Schema [REDACTED] tool');
  assert.equal(tool.description, 'uses credential [REDACTED]');
  assert.equal(tool.description, tool.raw_manifest.description);

  assert.strictEqual(tool.parameters, tool.raw_manifest.parameters);
  assert.equal(tool.parameters.$id, 'urn:vcp:schema-tool');
  assert.equal(tool.parameters.type, 'object');
  assert.deepEqual(tool.parameters.$defs, {
    futureType: { type: 'string' }
  });
  assert.deepEqual(tool.parameters.patternProperties, {
    '^future-[a-z]+$': { type: 'string' }
  });
  assert.equal(
    Object.prototype.hasOwnProperty.call(tool.parameters.properties, credential),
    true
  );
  assert.equal(tool.parameters.properties[credential].type, 'string');
  assert.deepEqual(tool.parameters.required, ['mode']);
  const mode = tool.parameters.properties.mode;
  assert.equal(mode.$ref, 'https://schemas.invalid/mode');
  assert.equal(mode.type, 'string');
  assert.equal(mode.const, 'one');
  assert.deepEqual(mode.enum, ['one', 'two']);
  assert.equal(mode.title, 'credential [REDACTED] mode');
  assert.equal(mode.description, 'enter credential [REDACTED]');
  assert.equal(mode.default, 'safe-default');
  assert.equal(mode.example, 'safe-example');
  assert.deepEqual(mode.examples, ['safe-example', 'future-value']);
  assert.equal(mode['x-future-vcp-scalar-2046'], 'future-string-value');
  assert.deepEqual(mode['x-future-vcp-contract-2046'], safeUnknownContract);
  assert.equal(
    JSON.stringify(mode['x-future-vcp-contract-2046']).includes('[REDACTED]'),
    false
  );

  assert.strictEqual(
    tool.invocation_commands,
    tool.raw_manifest.capabilities.invocationCommands
  );
  assert.equal(
    tool.invocation_commands[0],
    'curl http://127.0.0.1/run?VCP_Key=[REDACTED]'
  );
  assert.deepEqual(tool.invocation_commands[1], {
    command: 'tool --key [REDACTED]',
    description: 'uses [REDACTED]',
    metadata: { endpoint: 'ws://host/[REDACTED]' }
  });
  assert.deepEqual(tool.raw_manifest.invocationCommands, [
    'root-tool --key [REDACTED]'
  ]);
  assert.equal(tool.raw_manifest.metadata.description, 'nested [REDACTED] credential');
  assert.equal(
    tool.raw_manifest.metadata.arbitrary.request_id,
    'credential=[REDACTED]'
  );
  fixture.adapter.close();
});

test('schema semantic credential collisions fail closed without publishing a false manifest', async () => {
  const credential = 'bridge-secret';
  const unsafeSchemas = [
    {
      name: 'const',
      parameters: {
        type: 'object',
        properties: { mode: { type: 'string', const: credential } }
      }
    },
    {
      name: 'enum',
      parameters: {
        type: 'object',
        properties: { mode: { type: 'string', enum: ['safe', credential] } }
      }
    },
    {
      name: 'enum-substring',
      parameters: {
        type: 'string',
        enum: ['safe', `prefix-${credential}-suffix`]
      }
    },
    {
      name: 'nested-const',
      parameters: {
        type: 'array',
        items: {
          type: 'object',
          properties: { kind: { type: 'string', const: credential } }
        }
      }
    },
    {
      name: 'pattern',
      parameters: {
        type: 'string',
        pattern: `^prefix-${credential}-suffix$`
      }
    },
    {
      name: 'pattern-properties-key',
      parameters: {
        type: 'object',
        patternProperties: {
          [`^prefix-${credential}-suffix$`]: { type: 'string' }
        }
      }
    },
    {
      name: 'ref',
      parameters: { $ref: `https://schemas.invalid/tool?key=${credential}` }
    },
    {
      name: 'id',
      parameters: { $id: `urn:vcp:${credential}:tool`, type: 'string' }
    },
    {
      name: 'schema-identifier',
      parameters: { $schema: `https://schemas.invalid/${credential}` }
    },
    {
      name: 'known-contract-format',
      parameters: { type: 'string', format: `format-${credential}` }
    },
    {
      name: 'malformed-root-schema-string',
      parameters: credential
    },
    {
      name: 'malformed-container-string',
      parameters: { type: 'array', items: credential }
    },
    {
      name: 'malformed-schema-map-string',
      parameters: { type: 'object', properties: credential }
    },
    {
      name: 'malformed-property-schema-string',
      parameters: {
        type: 'object',
        properties: { mode: credential }
      }
    },
    {
      name: 'default',
      parameters: { type: 'string', default: `prefix-${credential}-suffix` }
    },
    {
      name: 'example',
      parameters: { type: 'string', example: credential }
    },
    {
      name: 'examples',
      parameters: { type: 'string', examples: ['safe', credential] }
    },
    {
      name: 'unknown-string',
      parameters: {
        type: 'string',
        'x-future-vcp-scalar-2046': `prefix-${credential}-suffix`
      }
    },
    {
      name: 'unknown-nested-object',
      parameters: {
        type: 'string',
        'x-future-vcp-contract-2046': {
          mode: 'strict',
          nested: { identifier: `prefix-${credential}-suffix` }
        }
      }
    }
  ];

  for (const { name, parameters } of unsafeSchemas) {
    const fixture = createFixture({
      allowedTools: ['ToolA'],
      key: credential,
      manifests: [{ name: 'ToolA', parameters }]
    });

    await assert.rejects(
      fixture.adapter.listTools(),
      error => {
        assert.equal(error.code, 'VCP_MANIFEST_UNSAFE_TO_PROJECT');
        assert.equal(error.jsonRpcCode, -32603);
        assert.equal(error.jsonRpcData.code, 'VCP_MANIFEST_UNSAFE_TO_PROJECT');
        assert.equal(error.message.includes(credential), false);
        return true;
      },
      name
    );
    assert.equal(fixture.adapter.manifestsLoaded, false);
    assert.deepEqual(fixture.adapter.latestTools, []);
    assert.equal(
      JSON.stringify(fixture.adapter.latestTools)
        .includes(`prefix-[REDACTED]-suffix`),
      false,
      name
    );
    fixture.adapter.close();
  }
});

test('single-string and aggregate UTF-8 output byte budgets fail with no partial result', async () => {
  const cases = [
    {
      name: 'single-1MiB-string',
      value: { message: 'a'.repeat(1024 * 1024) }
    },
    {
      name: 'utf8-string-bytes',
      value: {
        message: '界'.repeat(Math.floor(MAX_OUTPUT_PROJECTION_STRING_BYTES / 2))
      }
    },
    {
      name: 'aggregate-string-bytes',
      value: {
        items: Array.from(
          { length: Math.floor(MAX_OUTPUT_PROJECTION_TOTAL_BYTES / (64 * 1024)) + 1 },
          () => 'b'.repeat(64 * 1024)
        )
      }
    }
  ];

  assert.equal(
    cases[1].value.message.length < MAX_OUTPUT_PROJECTION_STRING_BYTES,
    true
  );
  assert.equal(
    Buffer.byteLength(cases[1].value.message, 'utf8') >
      MAX_OUTPUT_PROJECTION_STRING_BYTES,
    true
  );
  assert.equal(
    Buffer.byteLength(cases[2].value.items[0], 'utf8') <
      MAX_OUTPUT_PROJECTION_STRING_BYTES,
    true
  );
  assert.equal(
    cases[2].value.items.reduce(
      (total, item) => total + Buffer.byteLength(item, 'utf8'),
      0
    ) > MAX_OUTPUT_PROJECTION_TOTAL_BYTES,
    true
  );

  for (const outputCase of cases) {
    let result = outputCase.value;
    const client = {
      key: 'synthetic-output-secret',
      async executeTool({ toolName, requestId }) {
        return {
          request_id: requestId,
          tool_name: toolName,
          status: 'completed',
          result,
          error: null
        };
      },
      disconnect() {}
    };
    const adapter = new VcpToolAdapter({ client, allowedTools: ['ToolA'] });

    await assert.rejects(
      adapter.executeTool({
        tool_name: 'ToolA',
        tool_args: {},
        request_id: outputCase.name
      }),
      error => {
        assert.equal(error instanceof RangeError, false);
        assert.equal(error.code, 'VCP_RESPONSE_TOO_COMPLEX');
        assert.equal(error.jsonRpcCode, -32603);
        assert.equal(error.jsonRpcData.code, 'VCP_RESPONSE_TOO_COMPLEX');
        return true;
      }
    );

    result = { process_survived: true };
    const recovered = await adapter.executeTool({
      tool_name: 'ToolA',
      tool_args: {},
      request_id: `${outputCase.name}-recovery`
    });
    assert.deepEqual(recovered.result, { process_survived: true });
    adapter.close();
  }

  let progress = { message: 'p'.repeat(1024 * 1024) };
  const statusAdapter = new VcpToolAdapter({
    client: {
      key: 'synthetic-output-secret',
      getRequestStatus(requestId) {
        return {
          request_id: requestId,
          status: 'running',
          progress,
          result: null,
          error: null
        };
      },
      disconnect() {}
    },
    allowedTools: []
  });
  assert.throws(
    () => statusAdapter.getToolStatus({ request_id: 'oversized-progress' }),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  progress = { stage: 'recovered' };
  assert.deepEqual(
    statusAdapter.getToolStatus({ request_id: 'safe-progress' }).progress,
    { stage: 'recovered' }
  );
  statusAdapter.close();

  let manifests = [{ name: 'ToolA', description: 'm'.repeat(1024 * 1024) }];
  const manifestAdapter = new VcpToolAdapter({
    client: {
      key: 'synthetic-output-secret',
      async discoverManifests() {
        return { plugins: manifests };
      },
      disconnect() {}
    },
    allowedTools: ['ToolA']
  });
  await assert.rejects(
    manifestAdapter.listTools(),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  assert.equal(manifestAdapter.manifestsLoaded, false);
  assert.deepEqual(manifestAdapter.latestTools, []);
  const oversizedContractKey =
    `synthetic-output-secret-${'k'.repeat(1024 * 1024)}`;
  manifests = [{
    name: 'ToolA',
    parameters: {
      type: 'string',
      'x-future-vcp-contract-2046': {
        [oversizedContractKey]: 'safe-value'
      }
    }
  }];
  await assert.rejects(
    manifestAdapter.listTools(),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  assert.equal(manifestAdapter.manifestsLoaded, false);
  assert.deepEqual(manifestAdapter.latestTools, []);
  manifests = [{ name: 'ToolA', description: 'safe manifest' }];
  assert.equal((await manifestAdapter.listTools()).tools.length, 1);
  manifestAdapter.close();
});

test('deep and wide Bridge outputs fail with a stable bounded projection error', async () => {
  function nestedObject(depth) {
    let value = 'leaf';
    for (let index = 0; index < depth; index += 1) value = { nested: value };
    return value;
  }

  function nestedArray(depth) {
    let value = 'leaf';
    for (let index = 0; index < depth; index += 1) value = [value];
    return value;
  }

  for (const overBudgetResult of [
    nestedObject(MAX_OUTPUT_PROJECTION_DEPTH + 2),
    nestedArray(MAX_OUTPUT_PROJECTION_DEPTH + 2),
    Array.from({ length: MAX_OUTPUT_PROJECTION_NODES + 1 }, () => true)
  ]) {
    let result = overBudgetResult;
    const client = {
      key: 'synthetic-output-secret',
      async executeTool({ toolName, requestId }) {
        return {
          request_id: requestId || 'bounded-output-request',
          tool_name: toolName,
          status: 'completed',
          result,
          error: null
        };
      },
      disconnect() {}
    };
    const adapter = new VcpToolAdapter({ client, allowedTools: ['ToolA'] });
    await assert.rejects(
      adapter.executeTool({
        tool_name: 'ToolA',
        tool_args: {},
        request_id: 'bounded-output-request'
      }),
      error => {
        assert.equal(error instanceof RangeError, false);
        assert.equal(error.code, 'VCP_RESPONSE_TOO_COMPLEX');
        assert.equal(error.jsonRpcCode, -32603);
        assert.equal(error.jsonRpcData.code, 'VCP_RESPONSE_TOO_COMPLEX');
        return true;
      }
    );

    result = { process_survived: true };
    const recovered = await adapter.executeTool({
      tool_name: 'ToolA',
      tool_args: {},
      request_id: 'bounded-output-recovery'
    });
    assert.deepEqual(recovered.result, { process_survived: true });
    adapter.close();
  }

  const statusAdapter = new VcpToolAdapter({
    client: {
      key: 'synthetic-output-secret',
      getRequestStatus(requestId) {
        return {
          request_id: requestId,
          status: 'completed',
          progress: null,
          result: nestedObject(MAX_OUTPUT_PROJECTION_DEPTH + 2),
          error: null
        };
      },
      disconnect() {}
    },
    allowedTools: []
  });
  assert.throws(
    () => statusAdapter.getToolStatus({ request_id: 'deep-status-output' }),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  statusAdapter.close();
});

test('deep Bridge manifests fail closed without publishing a partial tool list', async () => {
  function nestedValue(depth, wrap) {
    let value = { type: 'string' };
    for (let index = 0; index < depth; index += 1) value = wrap(value);
    return value;
  }

  const overBudgetParameters = [
    nestedValue(
      MAX_OUTPUT_PROJECTION_DEPTH + 2,
      value => ({ type: 'object', properties: { nested: value } })
    ),
    {
      type: 'string',
      'x-future-vcp-contract-2046': nestedValue(
        MAX_OUTPUT_PROJECTION_DEPTH + 2,
        value => ({ nested: value })
      )
    }
  ];
  let manifests = [];
  const client = {
    key: 'synthetic-manifest-secret',
    async discoverManifests() {
      return { plugins: manifests };
    },
    getStatus() {
      return {
        connected: true,
        bridge_enabled: true,
        protocol_ready: true,
        tools_discovered: manifests.length,
        pending_requests: 0,
        last_error: null
      };
    },
    disconnect() {}
  };
  const adapter = new VcpToolAdapter({ client, allowedTools: ['ToolA'] });

  for (const parameters of overBudgetParameters) {
    manifests = [{ name: 'ToolA', description: 'safe manifest', parameters }];
    await assert.rejects(
      adapter.listTools(),
      error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
    );
    assert.equal(adapter.manifestsLoaded, false);
    assert.deepEqual(adapter.latestTools, []);
  }

  manifests = [{ name: 'ToolA', description: 'safe manifest' }];
  const recovered = await adapter.listTools();
  assert.equal(recovered.tools.length, 1);
  assert.equal(recovered.tools[0].name, 'ToolA');
  adapter.close();
});

test('server-side Bridge credentials and endpoint cannot be overridden or exposed', async () => {
  const manifests = [{
    name: 'ToolA',
    description: `Synthetic manifest ${SYNTHETIC_BRIDGE_KEY}`,
    metadata: { credentialEcho: SYNTHETIC_BRIDGE_KEY }
  }];
  const { bridge, client, adapter } = createFixture({
    allowedTools: ['ToolA'],
    manifests
  });
  const listed = await adapter.listTools();
  assert.equal(JSON.stringify(listed).includes(SYNTHETIC_BRIDGE_KEY), false);

  const attackerEndpoint = 'ws://attacker.invalid/override';
  const result = await adapter.executeTool({
    tool_name: 'ToolA',
    tool_args: {
      vcp_key: 'attacker-value',
      bridge_url: attackerEndpoint,
      authentication_path: '/attacker-auth',
      echo: SYNTHETIC_BRIDGE_KEY
    },
    request_id: 'credential-boundary'
  });
  assert.equal(bridge.socket.url.includes('127.0.0.1'), true);
  assert.equal(bridge.socket.url.includes('attacker.invalid'), false);
  assert.equal(bridge.received[1].data.toolArgs.bridge_url, attackerEndpoint);
  assert.equal(JSON.stringify(result).includes(SYNTHETIC_BRIDGE_KEY), false);

  client.lastError = `Synthetic connection error ${SYNTHETIC_BRIDGE_KEY}`;
  assert.equal(JSON.stringify(adapter.getStatus()).includes(SYNTHETIC_BRIDGE_KEY), false);
  assert.equal(
    JSON.stringify(adapter.getToolStatus({ request_id: 'credential-boundary' }))
      .includes(SYNTHETIC_BRIDGE_KEY),
    false
  );
  adapter.close();
});

test('connection failures redact configured Bridge credentials before reaching callers', async () => {
  class ThrowingWebSocket {
    constructor() {
      throw new Error(`Synthetic setup failure ${SYNTHETIC_BRIDGE_KEY}`);
    }
  }
  const adapter = new VcpToolAdapter({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: SYNTHETIC_BRIDGE_KEY,
    allowedTools: ['ToolA'],
    requestTimeoutMs: 20,
    WebSocketImpl: ThrowingWebSocket
  });

  await assert.rejects(
    adapter.listTools(),
    error => error.code === 'VCP_BRIDGE_CONNECTION_ERROR' &&
      !error.message.includes(SYNTHETIC_BRIDGE_KEY)
  );
  adapter.close();
});
