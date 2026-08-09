'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { VcpToolAdapter } = require('../src/vcp-adapter/VcpToolAdapter');
const { VcpToolBridgeClient } = require('../src/vcp-adapter/VcpToolBridgeClient');

class FakeVcpToolBridge {
  constructor() {
    this.received = [];
    this.manifests = [
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

function createFixture({ timeout = 40 } = {}) {
  const bridge = new FakeVcpToolBridge();
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: 'synthetic-key-not-a-real-secret',
    requestTimeoutMs: timeout,
    WebSocketImpl: bridge.activate(),
    requestIdFactory: (() => {
      let sequence = 0;
      return () => `adapter-request-${++sequence}`;
    })()
  });
  return { bridge, client, adapter: new VcpToolAdapter({ client }) };
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

    close() {
      if (this.readyState >= 2) return;
      this.readyState = 3;
      this.emit('close', {});
    }
  };
  return harness;
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
