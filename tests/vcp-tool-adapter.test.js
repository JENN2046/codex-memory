'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { createConfig } = require('../src/config/createConfig');
const { VcpToolAdapter } = require('../src/vcp-adapter/VcpToolAdapter');
const {
  MAX_VCP_INBOUND_FRAME_BYTES,
  VcpToolBridgeClient
} = require('../src/vcp-adapter/VcpToolBridgeClient');
const {
  MAX_OUTPUT_PROJECTION_DEPTH,
  MAX_OUTPUT_PROJECTION_NODES,
  MAX_OUTPUT_PROJECTION_STRING_BYTES,
  MAX_OUTPUT_PROJECTION_TOTAL_BYTES,
  projectToolExecution,
  projectToolList
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

function asNativePlugins(manifests) {
  return (Array.isArray(manifests) ? manifests : []).map(manifest => {
    const nativeManifest = manifest?.nativeManifest || manifest;
    const invocationCommands = Array.isArray(nativeManifest?.capabilities?.invocationCommands)
      ? nativeManifest.capabilities.invocationCommands
      : Array.isArray(nativeManifest?.invocationCommands)
        ? nativeManifest.invocationCommands
        : [];
    return {
      name: nativeManifest.name,
      displayName: nativeManifest.displayName || nativeManifest.name,
      description: nativeManifest.description || '',
      version: nativeManifest.version || '1.0.0',
      capabilities: { invocationCommands },
      nativeManifest
    };
  });
}

class FakeVcpToolBridge {
  constructor({ manifests, manifestResponseFactory, executionResponseFactory } = {}) {
    this.received = [];
    this.manifestResponseFactory = manifestResponseFactory;
    this.executionResponseFactory = executionResponseFactory;
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
      const nativeV1Requested = message.data?.manifestSurface === 'native-v1';
      const response = this.manifestResponseFactory
        ? this.manifestResponseFactory(message)
        : {
            type: 'vcp_manifest_response',
            data: {
              requestId: message.data.requestId,
              ...(nativeV1Requested ? { manifestSurface: 'native-v1' } : {}),
              plugins: nativeV1Requested ? asNativePlugins(this.manifests) : this.manifests,
              vcpVersion: 'fake-1'
            }
          };
      this.respond(socket, response);
      return;
    }

    if (message.type !== 'execute_vcp_tool') return;
    if (this.executionResponseFactory) {
      this.respond(socket, this.executionResponseFactory(message));
      return;
    }
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
  manifestResponseFactory,
  executionResponseFactory,
  key = SYNTHETIC_BRIDGE_KEY,
  requestIdFactory
} = {}) {
  const bridge = new FakeVcpToolBridge({
    manifests,
    manifestResponseFactory,
    executionResponseFactory
  });
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

function createWideJsonObject(keyCount) {
  const value = {};
  for (let index = 0; index < keyCount; index += 1) {
    value[`field_${index}`] = true;
  }
  return value;
}

function captureOwnDescriptorReads(operation) {
  const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  let descriptorReads = 0;
  let caughtError = null;
  Object.getOwnPropertyDescriptor = (...args) => {
    descriptorReads += 1;
    return Reflect.apply(originalGetOwnPropertyDescriptor, Object, args);
  };
  try {
    operation();
  } catch (error) {
    caughtError = error;
  } finally {
    Object.getOwnPropertyDescriptor = originalGetOwnPropertyDescriptor;
  }
  return { caughtError, descriptorReads };
}

function connectionAckFrameAtUtf8Bytes(targetBytes) {
  const prefix = '{"type":"connection_ack","data":{"padding":"';
  const suffix = '"}}';
  const framingBytes = Buffer.byteLength(prefix + suffix, 'utf8');
  assert.equal(targetBytes >= framingBytes, true);
  return `${prefix}${'a'.repeat(targetBytes - framingBytes)}${suffix}`;
}

function createOffsetView(text, { dataView = false } = {}) {
  const source = Buffer.from(text, 'utf8');
  const backing = new ArrayBuffer(source.byteLength + 16);
  const bytes = new Uint8Array(backing, 8, source.byteLength);
  bytes.set(source);
  return dataView
    ? new DataView(backing, 8, source.byteLength)
    : bytes;
}

async function observeInboundFrame(data, { pendingRequest = false } = {}) {
  const socket = {
    readyState: 1,
    closeCalls: [],
    close(code, reason) {
      this.closeCalls.push({ code, reason });
      this.readyState = 3;
    }
  };
  const client = new VcpToolBridgeClient({
    bridgeUrl: 'ws://127.0.0.1:1',
    key: SYNTHETIC_BRIDGE_KEY,
    requestTimeoutMs: 100,
    WebSocketImpl: class {}
  });
  client.socket = socket;
  client.connected = true;

  let rejectedError = null;
  if (pendingRequest) {
    client.requestStates.set('frame-admission-request', {
      requestId: 'frame-admission-request',
      kind: 'manifest',
      manifestSurface: 'native-v1',
      status: 'running',
      progress: null,
      result: null,
      error: null
    });
    const timer = setTimeout(() => {}, 1_000);
    timer.unref?.();
    client.pending.set('frame-admission-request', {
      timer,
      resolve() {},
      reject(error) {
        rejectedError = error;
      }
    });
  }

  const originalParse = JSON.parse;
  const originalMessageText = client._messageText.bind(client);
  let jsonParseCalls = 0;
  let messageTextCalls = 0;
  JSON.parse = (...args) => {
    jsonParseCalls += 1;
    return Reflect.apply(originalParse, JSON, args);
  };
  client._messageText = async (...args) => {
    messageTextCalls += 1;
    return originalMessageText(...args);
  };
  try {
    await client._handleMessage({ data }, socket);
  } finally {
    JSON.parse = originalParse;
    client._messageText = originalMessageText;
  }

  return {
    client,
    jsonParseCalls,
    messageTextCalls,
    rejectedError,
    socket
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

test('inbound VCP frames enforce the inclusive 4 MiB boundary before JSON.parse', async () => {
  for (const admittedBytes of [
    MAX_VCP_INBOUND_FRAME_BYTES - 1,
    MAX_VCP_INBOUND_FRAME_BYTES
  ]) {
    const frame = connectionAckFrameAtUtf8Bytes(admittedBytes);
    assert.equal(Buffer.byteLength(frame, 'utf8'), admittedBytes);
    const observed = await observeInboundFrame(frame);
    assert.equal(observed.messageTextCalls, 1);
    assert.equal(observed.jsonParseCalls, 1);
    assert.equal(observed.client.connected, true);
    assert.deepEqual(observed.socket.closeCalls, []);
  }

  const oversizedFrame = connectionAckFrameAtUtf8Bytes(
    MAX_VCP_INBOUND_FRAME_BYTES + 1
  );
  const rejected = await observeInboundFrame(oversizedFrame, {
    pendingRequest: true
  });
  assert.equal(Buffer.byteLength(oversizedFrame, 'utf8'), 4_194_305);
  assert.equal(rejected.messageTextCalls, 0);
  assert.equal(rejected.jsonParseCalls, 0);
  assert.equal(rejected.client.socket, null);
  assert.equal(rejected.client.connected, false);
  assert.equal(rejected.client.pending.size, 0);
  assert.equal(
    rejected.client.requestStates.get('frame-admission-request').status,
    'failed'
  );
  assert.equal(
    rejected.client.requestStates.get('frame-admission-request').error,
    'vcp_response_too_complex'
  );
  assert.equal(rejected.rejectedError?.code, 'VCP_RESPONSE_TOO_COMPLEX');
  assert.equal(rejected.rejectedError?.message, 'vcp_response_too_complex');
  assert.deepEqual(rejected.socket.closeCalls, [{
    code: 1009,
    reason: 'vcp_response_too_complex'
  }]);
});

test('frame admission uses the native byte semantics of every supported WebSocket data form', async () => {
  const smallFrame = JSON.stringify({
    type: 'connection_ack',
    data: { serverId: 'frame-form-synthetic' }
  });
  const smallBytes = Buffer.from(smallFrame, 'utf8');
  const smallArrayBuffer = Uint8Array.from(smallBytes).buffer;
  const admittedForms = [
    ['string', smallFrame],
    ['Buffer', smallBytes],
    ['ArrayBuffer', smallArrayBuffer],
    ['Uint8Array view with offset', createOffsetView(smallFrame)],
    ['DataView with offset', createOffsetView(smallFrame, { dataView: true })],
    ['Blob', new Blob([smallBytes])]
  ];

  for (const [name, data] of admittedForms) {
    const observed = await observeInboundFrame(data);
    assert.equal(observed.messageTextCalls, 1, name);
    assert.equal(observed.jsonParseCalls, 1, name);
    assert.equal(observed.client.connected, true, name);
  }

  let oversizedBlobTextCalls = 0;
  const oversizedBlob = new Blob([
    new Uint8Array(MAX_VCP_INBOUND_FRAME_BYTES + 1)
  ]);
  oversizedBlob.text = async () => {
    oversizedBlobTextCalls += 1;
    return '{}';
  };
  const oversizedForms = [
    ['string', () => connectionAckFrameAtUtf8Bytes(MAX_VCP_INBOUND_FRAME_BYTES + 1)],
    ['Buffer', () => Buffer.alloc(MAX_VCP_INBOUND_FRAME_BYTES + 1)],
    ['ArrayBuffer', () => new ArrayBuffer(MAX_VCP_INBOUND_FRAME_BYTES + 1)],
    ['ArrayBufferView', () => new Uint8Array(
      new ArrayBuffer(MAX_VCP_INBOUND_FRAME_BYTES + 33),
      16,
      MAX_VCP_INBOUND_FRAME_BYTES + 1
    )],
    ['Blob', () => oversizedBlob]
  ];

  for (const [name, createData] of oversizedForms) {
    const observed = await observeInboundFrame(createData());
    assert.equal(observed.messageTextCalls, 0, name);
    assert.equal(observed.jsonParseCalls, 0, name);
    assert.deepEqual(observed.socket.closeCalls, [{
      code: 1009,
      reason: 'vcp_response_too_complex'
    }], name);
  }
  assert.equal(oversizedBlobTextCalls, 0);
});

test('normalized UTF-8 size is rechecked and multibyte strings cannot bypass frame admission', async () => {
  const unicodeFrame = JSON.stringify({
    type: 'connection_ack',
    data: { padding: '界'.repeat(100) }
  });
  assert.equal(Buffer.byteLength(unicodeFrame, 'utf8') > unicodeFrame.length, true);
  const admittedUnicode = await observeInboundFrame(unicodeFrame);
  assert.equal(admittedUnicode.jsonParseCalls, 1);

  const prefix = '{"type":"connection_ack","data":{"padding":"';
  const suffix = '"}}';
  const unicodeCount = Math.ceil(
    (MAX_VCP_INBOUND_FRAME_BYTES + 1 - Buffer.byteLength(prefix + suffix, 'utf8')) / 3
  );
  const oversizedUnicode = `${prefix}${'界'.repeat(unicodeCount)}${suffix}`;
  assert.equal(oversizedUnicode.length < MAX_VCP_INBOUND_FRAME_BYTES, true);
  assert.equal(
    Buffer.byteLength(oversizedUnicode, 'utf8') > MAX_VCP_INBOUND_FRAME_BYTES,
    true
  );
  const unicodeRejected = await observeInboundFrame(oversizedUnicode);
  assert.equal(unicodeRejected.messageTextCalls, 0);
  assert.equal(unicodeRejected.jsonParseCalls, 0);

  const normalizedOversized = connectionAckFrameAtUtf8Bytes(
    MAX_VCP_INBOUND_FRAME_BYTES + 1
  );
  const textLikeRejected = await observeInboundFrame({
    text: async () => normalizedOversized
  });
  assert.equal(textLikeRejected.messageTextCalls, 1);
  assert.equal(textLikeRejected.jsonParseCalls, 0);

  let mismatchedBlobTextCalls = 0;
  const mismatchedBlob = new Blob(['{}']);
  mismatchedBlob.text = async () => {
    mismatchedBlobTextCalls += 1;
    return normalizedOversized;
  };
  const blobRejected = await observeInboundFrame(mismatchedBlob);
  assert.equal(blobRejected.messageTextCalls, 1);
  assert.equal(mismatchedBlobTextCalls, 1);
  assert.equal(blobRejected.jsonParseCalls, 0);
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
  assert.equal(bridge.received[0].data.manifestSurface, 'native-v1');
  assert.match(bridge.socket.url, /\/vcp-distributed-server\/VCP_Key=/u);

  adapter.close();
});

test('native-v1 transport requires the selector and preserves complete JSON manifest semantics', async () => {
  const nativeManifest = JSON.parse(`{
    "name": "FutureTool",
    "parameters": {
      "type": "object",
      "properties": { "query": { "type": "string" } }
    },
    "parameterSchema": {
      "type": "object",
      "properties": {
        "query": { "type": "string" },
        "options": {
          "type": "object",
          "properties": { "mode": { "enum": ["one", "two"] } }
        }
      }
    },
    "inputSchema": {
      "type": "object",
      "required": ["query"]
    },
    "configSchema": { "enabled": { "type": "boolean" } },
    "configSchemaDescriptions": { "enabled": "Synthetic flag" },
    "defaults": { "enabled": true },
    "x-future-extension": {
      "nested": { "alpha": [1, true, null, "future-value"] }
    },
    "__proto__": {
      "nested": [1, true, null, "proto-value"],
      "fmsNativePrototypePollution": "data-only"
    },
    "constructor": { "nested": { "x": "constructor-value" } },
    "prototype": ["prototype-value", 7],
    "toJSON": { "kind": "plain-data" }
  }`);
  const futureOnlyNativeManifest = JSON.parse(`{
    "name": "FutureOnlyTool",
    "x-future-only": {
      "opaque": [null, false, 2046, "preserved"]
    }
  }`);
  const { bridge, client } = createFixture({
    manifestResponseFactory: message => ({
      type: 'vcp_manifest_response',
      data: {
        requestId: message.data.requestId,
        manifestSurface: 'native-v1',
        plugins: [
          {
            name: 'FutureTool',
            displayName: 'Future Tool',
            description: 'Synthetic native-v1 manifest',
            version: '1.0.0',
            capabilities: { invocationCommands: [{ command: 'Future' }] },
            nativeManifest
          },
          {
            name: 'FutureOnlyTool',
            nativeManifest: futureOnlyNativeManifest
          }
        ],
        vcpVersion: 'fake-native-v1'
      }
    })
  });

  const discovered = await client.discoverManifests({ manifestSurface: 'native-v1' });

  assert.deepEqual(bridge.received[0], {
    type: 'get_vcp_manifests',
    data: {
      manifestSurface: 'native-v1',
      requestId: 'adapter-request-1'
    }
  });
  assert.equal(discovered.manifestSurface, 'native-v1');
  assert.equal(discovered.vcpVersion, 'fake-native-v1');
  assert.deepEqual(discovered.plugins[0].nativeManifest, nativeManifest);
  assert.deepEqual(discovered.plugins[1], {
    name: 'FutureOnlyTool',
    nativeManifest: futureOnlyNativeManifest
  });
  for (const key of ['__proto__', 'constructor', 'prototype', 'toJSON']) {
    assert.equal(Object.hasOwn(discovered.plugins[0].nativeManifest, key), true);
    assert.deepEqual(discovered.plugins[0].nativeManifest[key], nativeManifest[key]);
  }
  assert.equal(Object.getPrototypeOf(discovered.plugins[0].nativeManifest), Object.prototype);
  assert.equal(Object.prototype.fmsNativePrototypePollution, undefined);
  assert.equal(Array.prototype.fmsNativePrototypePollution, undefined);
  client.disconnect();
});

test('native-v1 transport fails closed on incompatible or incomplete Bridge responses', async t => {
  const completeNativePlugin = {
    name: 'SyntheticNativeTool',
    nativeManifest: {
      name: 'SyntheticNativeTool',
      'x-future-extension': { preserved: true }
    }
  };
  const scenarios = [
    {
      name: 'old Bridge response has neither marker nor native manifest',
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: { requestId, plugins: [{ name: 'LegacyTool' }] }
      })
    },
    {
      name: 'marker is missing even when nativeManifest is present',
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: { requestId, plugins: [completeNativePlugin] }
      })
    },
    ...['legacy-v1', 'native-v2'].map(manifestSurface => ({
      name: `wrong surface ${manifestSurface}`,
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: { requestId, manifestSurface, plugins: [completeNativePlugin] }
      })
    })),
    {
      name: 'response type is not vcp_manifest_response',
      response: requestId => ({
        type: 'vcp_tool_result',
        data: { requestId, status: 'success', result: { plugins: [completeNativePlugin] } }
      })
    },
    {
      name: 'native-v1 marker is present but nativeManifest is missing',
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: {
          requestId,
          manifestSurface: 'native-v1',
          plugins: [{ name: 'MissingNativeManifestTool' }]
        }
      })
    },
    {
      name: 'declared native-v1 producer errors cannot become successful empty discovery',
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: {
          requestId,
          manifestSurface: 'native-v1',
          status: 'error',
          error: 'SYNTHETIC_NATIVE_ERROR_SENTINEL',
          plugins: []
        }
      })
    },
    {
      name: 'empty native manifest authority is rejected',
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: {
          requestId,
          manifestSurface: 'native-v1',
          plugins: [{ name: 'EmptyAuthorityTool', nativeManifest: {} }]
        }
      })
    },
    {
      name: 'compatibility identity must match native manifest authority',
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: {
          requestId,
          manifestSurface: 'native-v1',
          plugins: [{ name: 'WrapperTool', nativeManifest: { name: 'DifferentTool' } }]
        }
      })
    },
    {
      name: 'one incomplete plugin rejects the entire response',
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: {
          requestId,
          manifestSurface: 'native-v1',
          plugins: [completeNativePlugin, { name: 'IncompleteTool' }]
        }
      })
    },
    {
      name: 'plugins must be an array',
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: { requestId, manifestSurface: 'native-v1', plugins: null }
      })
    },
    {
      name: 'nativeManifest must be a JSON object container',
      response: requestId => ({
        type: 'vcp_manifest_response',
        data: {
          requestId,
          manifestSurface: 'native-v1',
          plugins: [{ name: 'InvalidNativeManifestTool', nativeManifest: [] }]
        }
      })
    }
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const { client } = createFixture({
        manifestResponseFactory: message => scenario.response(message.data.requestId)
      });
      await assert.rejects(
        client.discoverManifests({ manifestSurface: 'native-v1' }),
        error => error.code === 'VCP_NATIVE_MANIFEST_SURFACE_UNAVAILABLE'
      );
      const state = client.getRequestStatus('adapter-request-1');
      assert.equal(state.status, 'failed');
      assert.equal(state.error, 'vcp_native_manifest_surface_unavailable');
      assert.equal(state.result, null);
      assert.equal(client.getStatus().protocol_ready, false);
      assert.equal(client.getStatus().tools_discovered, 0);
      assert.equal(JSON.stringify(client.getStatus()).includes('SYNTHETIC_NATIVE_ERROR_SENTINEL'), false);
      client.disconnect();
    });
  }
});

test('manifest responses only settle active manifest requests with an exact requestId', async t => {
  const validNativeData = requestId => ({
    requestId,
    manifestSurface: 'native-v1',
    plugins: [{ name: 'CorrelatedTool', nativeManifest: { name: 'CorrelatedTool' } }]
  });

  await t.test('an unrelated request id cannot activate discovery', async () => {
    const harness = createConnectHarness(socket => socket.acknowledge());
    const client = new VcpToolBridgeClient({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: SYNTHETIC_BRIDGE_KEY,
      requestTimeoutMs: 100,
      WebSocketImpl: harness.WebSocket,
      requestIdFactory: () => 'native-active-request'
    });
    await client.connect();
    const discovery = client.discoverManifests({ manifestSurface: 'native-v1' });
    await nextTurn();
    const socket = harness.sockets[0];
    socket.emit('message', {
      data: bridgeMessage('vcp_manifest_response', {
        requestId: 'unrelated-request',
        plugins: [{ name: 'InjectedLegacyTool' }]
      })
    });
    await nextTurn();

    assert.equal(client.getRequestStatus('native-active-request').status, 'running');
    assert.equal(client.getStatus().protocol_ready, false);
    assert.equal(client.getStatus().tools_discovered, 0);

    socket.emit('message', {
      data: bridgeMessage('vcp_manifest_response', validNativeData('native-active-request'))
    });
    const discovered = await discovery;
    assert.equal(discovered.plugins[0].name, 'CorrelatedTool');
    client.disconnect();
  });

  await t.test('job and task aliases cannot substitute for manifest requestId', async () => {
    const harness = createConnectHarness(socket => socket.acknowledge());
    const client = new VcpToolBridgeClient({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: SYNTHETIC_BRIDGE_KEY,
      requestTimeoutMs: 100,
      WebSocketImpl: harness.WebSocket,
      requestIdFactory: () => 'native-exact-correlation'
    });
    await client.connect();
    const discovery = client.discoverManifests({ manifestSurface: 'native-v1' });
    await nextTurn();
    const socket = harness.sockets[0];
    socket.emit('message', {
      data: bridgeMessage('vcp_manifest_response', {
        ...validNativeData(undefined),
        requestId: undefined,
        job_id: 'native-exact-correlation'
      })
    });
    await nextTurn();

    assert.equal(client.getRequestStatus('native-exact-correlation').status, 'running');
    assert.equal(client.getStatus().protocol_ready, false);

    socket.emit('message', {
      data: bridgeMessage('vcp_manifest_response', validNativeData('native-exact-correlation'))
    });
    await discovery;
    client.disconnect();
  });

  await t.test('manifest requestId echo is matched without trimming', async () => {
    const harness = createConnectHarness(socket => socket.acknowledge());
    const client = new VcpToolBridgeClient({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: SYNTHETIC_BRIDGE_KEY,
      requestTimeoutMs: 100,
      WebSocketImpl: harness.WebSocket,
      requestIdFactory: () => 'native-exact-whitespace'
    });
    await client.connect();
    const discovery = client.discoverManifests({ manifestSurface: 'native-v1' });
    await nextTurn();
    const socket = harness.sockets[0];
    socket.emit('message', {
      data: bridgeMessage(
        'vcp_manifest_response',
        validNativeData(' native-exact-whitespace ')
      )
    });
    await nextTurn();

    assert.equal(client.getRequestStatus('native-exact-whitespace').status, 'running');
    assert.equal(client.getStatus().protocol_ready, false);

    socket.emit('message', {
      data: bridgeMessage('vcp_manifest_response', validNativeData('native-exact-whitespace'))
    });
    await discovery;
    client.disconnect();
  });

  await t.test('a manifest frame cannot complete an execute request', async () => {
    const harness = createConnectHarness(socket => socket.acknowledge());
    const client = new VcpToolBridgeClient({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: SYNTHETIC_BRIDGE_KEY,
      requestTimeoutMs: 100,
      WebSocketImpl: harness.WebSocket
    });
    await client.connect();
    const execution = client.executeTool({
      toolName: 'CorrelationTool',
      toolArgs: {},
      requestId: 'execute-correlation-request'
    });
    await nextTurn();
    const socket = harness.sockets[0];
    socket.emit('message', {
      data: bridgeMessage(
        'vcp_manifest_response',
        validNativeData('execute-correlation-request')
      )
    });
    await nextTurn();

    assert.equal(client.getRequestStatus('execute-correlation-request').status, 'running');
    assert.equal(client.getStatus().protocol_ready, false);
    assert.equal(client.getStatus().tools_discovered, 0);

    socket.emit('message', {
      data: bridgeMessage('vcp_tool_result', {
        requestId: 'execute-correlation-request',
        status: 'success',
        result: { executed: true }
      })
    });
    const completed = await execution;
    assert.equal(completed.status, 'completed');
    client.disconnect();
  });
});

test('terminal native-v1 requests ignore late manifest frames and failed refreshes clear readiness', async t => {
  const validResponse = requestId => bridgeMessage('vcp_manifest_response', {
    requestId,
    manifestSurface: 'native-v1',
    plugins: [{ name: 'LateTool', nativeManifest: { name: 'LateTool' } }]
  });

  await t.test('a late response cannot revive a timed-out manifest request', async () => {
    const harness = createConnectHarness(socket => socket.acknowledge());
    const client = new VcpToolBridgeClient({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: SYNTHETIC_BRIDGE_KEY,
      requestTimeoutMs: 10,
      WebSocketImpl: harness.WebSocket,
      requestIdFactory: () => 'native-timeout-request'
    });
    await client.connect();
    await assert.rejects(
      client.discoverManifests({ manifestSurface: 'native-v1' }),
      error => error.code === 'VCP_REQUEST_TIMEOUT'
    );
    const socket = harness.sockets[0];
    socket.emit('message', { data: validResponse('native-timeout-request') });
    await nextTurn();

    assert.equal(client.getRequestStatus('native-timeout-request').status, 'timeout');
    assert.equal(client.getStatus().protocol_ready, false);
    assert.equal(client.getStatus().tools_discovered, 0);
    client.disconnect();
  });

  await t.test('a late response cannot revive a failed manifest request', async () => {
    const harness = createConnectHarness(socket => socket.acknowledge());
    const client = new VcpToolBridgeClient({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: SYNTHETIC_BRIDGE_KEY,
      requestTimeoutMs: 100,
      WebSocketImpl: harness.WebSocket,
      requestIdFactory: () => 'native-failed-request'
    });
    await client.connect();
    const discovery = client.discoverManifests({ manifestSurface: 'native-v1' });
    await nextTurn();
    const socket = harness.sockets[0];
    socket.emit('message', {
      data: bridgeMessage('vcp_manifest_response', {
        requestId: 'native-failed-request',
        plugins: [{ name: 'LegacyTool' }]
      })
    });
    await assert.rejects(
      discovery,
      error => error.code === 'VCP_NATIVE_MANIFEST_SURFACE_UNAVAILABLE'
    );
    socket.emit('message', { data: validResponse('native-failed-request') });
    await nextTurn();

    assert.equal(client.getRequestStatus('native-failed-request').status, 'failed');
    assert.equal(client.getStatus().bridge_enabled, false);
    assert.equal(client.getStatus().protocol_ready, false);
    assert.equal(client.getStatus().tools_discovered, 0);
    client.disconnect();
  });

  await t.test('a failed refresh clears prior native-v1 readiness', async () => {
    let responseCount = 0;
    const { client } = createFixture({
      manifestResponseFactory: message => {
        responseCount += 1;
        if (responseCount === 1) {
          return {
            type: 'vcp_manifest_response',
            data: {
              requestId: message.data.requestId,
              manifestSurface: 'native-v1',
              plugins: [
                { name: 'FirstTool', nativeManifest: { name: 'FirstTool' } },
                { name: 'SecondTool', nativeManifest: { name: 'SecondTool' } }
              ]
            }
          };
        }
        return {
          type: 'vcp_manifest_response',
          data: {
            requestId: message.data.requestId,
            plugins: [{ name: 'LegacyFallbackTool' }]
          }
        };
      }
    });

    await client.discoverManifests({ manifestSurface: 'native-v1' });
    assert.equal(client.getStatus().protocol_ready, true);
    assert.equal(client.getStatus().tools_discovered, 2);

    await assert.rejects(
      client.discoverManifests({ manifestSurface: 'native-v1' }),
      error => error.code === 'VCP_NATIVE_MANIFEST_SURFACE_UNAVAILABLE'
    );
    assert.equal(client.getStatus().bridge_enabled, false);
    assert.equal(client.getStatus().protocol_ready, false);
    assert.equal(client.getStatus().tools_discovered, 0);
    client.disconnect();
  });

  await t.test('an uncorrelated refresh timeout clears prior native-v1 readiness', async () => {
    let responseCount = 0;
    const { client } = createFixture({
      timeout: 15,
      manifestResponseFactory: message => {
        responseCount += 1;
        if (responseCount === 1) {
          return {
            type: 'vcp_manifest_response',
            data: {
              requestId: message.data.requestId,
              manifestSurface: 'native-v1',
              plugins: [{ name: 'ReadyTool', nativeManifest: { name: 'ReadyTool' } }]
            }
          };
        }
        return {
          type: 'vcp_manifest_response',
          data: {
            job_id: message.data.requestId,
            manifestSurface: 'native-v1',
            plugins: [{ name: 'UncorrelatedTool', nativeManifest: { name: 'UncorrelatedTool' } }]
          }
        };
      }
    });

    await client.discoverManifests({ manifestSurface: 'native-v1' });
    assert.equal(client.getStatus().protocol_ready, true);
    assert.equal(client.getStatus().tools_discovered, 1);

    await assert.rejects(
      client.discoverManifests({ manifestSurface: 'native-v1' }),
      error => error.code === 'VCP_REQUEST_TIMEOUT'
    );
    assert.equal(client.getStatus().bridge_enabled, false);
    assert.equal(client.getStatus().protocol_ready, false);
    assert.equal(client.getStatus().tools_discovered, 0);
    client.disconnect();
  });
});

test('unsupported requested manifest surfaces do not retry or fall back to legacy discovery', async () => {
  const { bridge, client } = createFixture();
  await assert.rejects(
    client.discoverManifests({ manifestSurface: 'native-v2' }),
    error => error.code === 'VCP_NATIVE_MANIFEST_SURFACE_UNAVAILABLE'
  );
  assert.equal(bridge.received.length, 0);
  assert.equal(client.socket, null);
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
  assert.equal(observedError.message, 'tool_args.[property].[property] is not allowed');
  assert.equal(observedError.message.includes('FAKE_FIXED_LOG_FIELD'), false);
  assert.equal(observedError.stack.includes(syntheticCredential), false);
  assert.equal(observedError.stack.includes(`\nFAKE_FIXED_LOG_FIELD`), false);

  const encodedCredential = [...Buffer.from(syntheticCredential, 'utf8')]
    .map(byte => `%${byte.toString(16).padStart(2, '0')}`)
    .join('');
  const encodedAttackerKey = `${encodedCredential}\r\nENCODED_FAKE_LOG_FIELD\t`;
  const encodedArgs = Object.create(null);
  Object.defineProperty(encodedArgs, encodedAttackerKey, {
    value: JSON.parse('{"prototype":{"polluted":true}}'),
    enumerable: true,
    configurable: true
  });
  let encodedError;
  await assert.rejects(
    adapter.executeTool({
      tool_name: 'ToolA',
      tool_args: encodedArgs,
      request_id: 'safe-encoded-error-path'
    }),
    error => {
      encodedError = error;
      return error.code === 'VCP_TOOL_ARGS_UNSAFE';
    }
  );
  assert.equal(encodedError.message, 'tool_args.[property].[property] is not allowed');
  assert.equal(encodedError.message.includes(encodedCredential), false);
  assert.equal(encodedError.stack.includes(encodedCredential), false);
  assert.equal(encodedError.stack.includes('ENCODED_FAKE_LOG_FIELD'), false);

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
  assert.equal(unknownToolError.message, 'Unknown VCP adapter tool');
  assert.equal(unknownToolError.message.includes('UNKNOWN_FAKE_LOG_FIELD'), false);
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
            payload_value: `result-${secret}`,
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
    assert.equal(requestStatus.result.payload_value.includes(secret), false);
    assert.equal(requestStatus.result.payload_value.includes('[REDACTED]'), true);
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

test('payload and error projections cannot recreate supported credential representations', async () => {
  const credential = 'x[R';
  const encodedCredentialWithPrefix = 'x%78%5b%52';
  const client = {
    key: credential,
    getStatus() {
      return {
        connected: true,
        bridge_enabled: true,
        protocol_ready: true,
        tools_discovered: 1,
        pending_requests: 0,
        last_error: encodedCredentialWithPrefix
      };
    },
    getRequestStatus(requestId) {
      return {
        request_id: requestId,
        status: 'completed',
        progress: encodedCredentialWithPrefix,
        result: { message: encodedCredentialWithPrefix },
        error: encodedCredentialWithPrefix
      };
    },
    async executeTool({ requestId }) {
      return this.getRequestStatus(requestId);
    },
    disconnect() {}
  };
  const adapter = new VcpToolAdapter({ client, allowedTools: ['ToolA'] });
  assert.equal(adapter.getStatus().last_error, '');
  const status = adapter.getToolStatus({ request_id: 'boundary-status' });
  assert.equal(status.progress, '');
  assert.equal(status.result.message, '');
  assert.equal(status.error, '');
  const executed = await adapter.executeTool({
    tool_name: 'ToolA',
    tool_args: {},
    request_id: 'boundary-execute'
  });
  assert.equal(executed.result.message, '');
  assert.equal(executed.error, '');
  assert.equal(JSON.stringify({ status, executed }).includes(credential), false);
  adapter.close();

  const controlCredentialAdapter = new VcpToolAdapter({
    client: {
      key: 'x\\n',
      getStatus() {
        return {
          connected: false,
          bridge_enabled: false,
          protocol_ready: false,
          tools_discovered: 0,
          pending_requests: 0,
          last_error: 'x\n'
        };
      },
      disconnect() {}
    },
    allowedTools: []
  });
  assert.equal(controlCredentialAdapter.getStatus().last_error, '');
  controlCredentialAdapter.close();
});

test('payload object keys fail closed on raw and single-percent credential representations', async () => {
  const credential = 'SECRET';
  const encodedCredential = '%53%45%43%52%45%54';
  const client = {
    key: credential,
    getRequestStatus(requestId) {
      return {
        request_id: requestId,
        status: 'failed',
        progress: null,
        result: { [credential]: 'safe-value' },
        error: { [encodedCredential]: 'safe-error-value' }
      };
    },
    async executeTool({ requestId }) {
      return this.getRequestStatus(requestId);
    },
    disconnect() {}
  };
  const adapter = new VcpToolAdapter({ client, allowedTools: ['ToolA'] });

  await assert.rejects(
    adapter.executeTool({
      tool_name: 'ToolA',
      tool_args: {},
      request_id: 'payload-key-execute'
    }),
    error => {
      assert.equal(error.code, 'VCP_RESPONSE_UNSAFE_TO_PROJECT');
      assert.equal(error.message.includes(credential), false);
      assert.equal(error.message.includes(encodedCredential), false);
      return true;
    }
  );
  assert.throws(
    () => adapter.getToolStatus({ request_id: 'payload-key-status' }),
    error => {
      assert.equal(error.code, 'VCP_RESPONSE_UNSAFE_TO_PROJECT');
      assert.equal(error.message.includes(credential), false);
      assert.equal(error.message.includes(encodedCredential), false);
      return true;
    }
  );
  adapter.close();
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
    name: 'PayloadTool',
    displayName: 'status tool',
    description: 'server credential is status',
    capabilities: {
      invocationCommands: [{ command: 'safe-command', example: { token: 'safe' } }]
    },
    parameters: { type: 'object', title: 'status schema' },
    metadata: { request_id: 'safe-contract-value' }
  }];
  const fixture = createFixture({
    allowedTools: ['PayloadTool'],
    key: secret,
    manifests
  });

  const listed = await fixture.adapter.listTools();
  assert.equal(listed.tools[0].name, 'PayloadTool');
  assert.equal(listed.tools[0].display_name, '[REDACTED] tool');
  assert.equal(listed.tools[0].description, 'server credential is [REDACTED]');
  assert.deepEqual(listed.tools[0].invocation_commands, [
    { command: 'safe-command', example: { token: 'safe' } }
  ]);
  assert.deepEqual(listed.tools[0].parameters, {
    type: 'object',
    title: '[REDACTED] schema'
  });
  assert.equal(listed.tools[0].raw_manifest.metadata.request_id, 'safe-contract-value');

  const executed = await fixture.adapter.executeTool({
    tool_name: 'PayloadTool',
    tool_args: {
      request_id: 'credential=status',
      nested: { message: 'payload status value' }
    },
    request_id: 'status-123'
  });
  assert.equal(executed.request_id, 'status-123');
  assert.equal(executed.tool_name, 'PayloadTool');
  assert.equal(executed.status, 'completed');
  assert.equal(fixture.bridge.received[1].data.toolName, 'PayloadTool');
  assert.equal(executed.result.executedTool, 'PayloadTool');
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
        credentialField: {
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
    invocationCommands: ['root-tool --mode safe'],
    capabilities: {
      invocationCommands: [
        'curl https://example.invalid/run?mode=safe',
        {
          command: 'tool --mode safe',
          description: 'safe command contract',
          metadata: { endpoint: 'wss://example.invalid/tool' }
        }
      ]
    },
    metadata: {
      description: 'nested opaque contract description',
      arbitrary: { request_id: 'safe-contract-id' }
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
    Object.prototype.hasOwnProperty.call(tool.parameters.properties, 'credentialField'),
    true
  );
  assert.equal(tool.parameters.properties.credentialField.type, 'string');
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
    'curl https://example.invalid/run?mode=safe'
  );
  assert.deepEqual(tool.invocation_commands[1], {
    command: 'tool --mode safe',
    description: 'safe command contract',
    metadata: { endpoint: 'wss://example.invalid/tool' }
  });
  assert.deepEqual(tool.raw_manifest.invocationCommands, [
    'root-tool --mode safe'
  ]);
  assert.equal(
    tool.raw_manifest.metadata.description,
    'nested opaque contract description'
  );
  assert.equal(
    tool.raw_manifest.metadata.arbitrary.request_id,
    'safe-contract-id'
  );
  fixture.adapter.close();
});

test('public aliases and safe meta keys derive only from the projected native authority', async () => {
  const credential = 'wrapper-only-secret';
  const nativeManifest = JSON.parse(`{
    "name": "AuthorityTool",
    "version": "2.0.0",
    "displayName": "Authority display",
    "description": "Authority description",
    "parameters": false,
    "parameterSchema": {"type":"object","properties":{"query":{"type":"string"}}},
    "inputSchema": true,
    "configSchema": {"mode":{"type":"string","description":"safe config mode"}},
    "capabilities": {
      "invocationCommands": [{"command":"authority-command"}]
    },
    "x-future-extension": {
      "nested": {
        "alpha":[1,true,null,"value"],
        "meta": {
          "__proto__":{"array":[1,true,null,"nested-proto"]},
          "constructor":{"object":{"value":"nested-constructor"}},
          "prototype":[{"toJSON":{"kind":"nested-plain-data"}}]
        }
      }
    },
    "__proto__": {"nested":[1,true,null,"proto-value"]},
    "constructor": {"nested":{"x":"constructor-value"}},
    "prototype": ["prototype-value",7],
    "toJSON": {"kind":"plain-data"}
  }`);
  const fixture = createFixture({
    allowedTools: ['AuthorityTool'],
    key: credential,
    manifestResponseFactory(message) {
      return {
        type: 'vcp_manifest_response',
        data: {
          requestId: message.data.requestId,
          manifestSurface: 'native-v1',
          plugins: [{
            name: 'AuthorityTool',
            displayName: `wrapper ${credential}`,
            description: `wrapper ${credential}`,
            version: credential,
            capabilities: {
              invocationCommands: [{ command: `wrapper-${credential}` }]
            },
            nativeManifest
          }]
        }
      };
    }
  });

  const listed = await fixture.adapter.listTools();
  const tool = listed.tools[0];
  assert.equal(tool.name, 'AuthorityTool');
  assert.equal(tool.display_name, 'Authority display');
  assert.equal(tool.description, 'Authority description');
  assert.equal(tool.parameters, false);
  assert.deepEqual(tool.raw_manifest.parameterSchema, {
    type: 'object',
    properties: { query: { type: 'string' } }
  });
  assert.equal(tool.raw_manifest.inputSchema, true);
  assert.deepEqual(tool.raw_manifest.configSchema, {
    mode: { type: 'string', description: 'safe config mode' }
  });
  assert.strictEqual(tool.invocation_commands, tool.raw_manifest.capabilities.invocationCommands);
  assert.deepEqual(tool.invocation_commands, [{ command: 'authority-command' }]);
  assert.deepEqual(tool.raw_manifest['x-future-extension'], {
    nested: {
      alpha: [1, true, null, 'value'],
      meta: JSON.parse(`{
        "__proto__":{"array":[1,true,null,"nested-proto"]},
        "constructor":{"object":{"value":"nested-constructor"}},
        "prototype":[{"toJSON":{"kind":"nested-plain-data"}}]
      }`)
    }
  });
  for (const [key, expected] of [
    ['__proto__', { nested: [1, true, null, 'proto-value'] }],
    ['constructor', { nested: { x: 'constructor-value' } }],
    ['prototype', ['prototype-value', 7]],
    ['toJSON', { kind: 'plain-data' }]
  ]) {
    assert.equal(Object.prototype.hasOwnProperty.call(tool.raw_manifest, key), true, key);
    assert.deepEqual(tool.raw_manifest[key], expected, key);
  }
  assert.equal(Object.getPrototypeOf(tool.raw_manifest), Object.prototype);
  const nestedMeta = tool.raw_manifest['x-future-extension'].nested.meta;
  assert.equal(Object.prototype.hasOwnProperty.call(nestedMeta, '__proto__'), true);
  assert.deepEqual(nestedMeta.__proto__, {
    array: [1, true, null, 'nested-proto']
  });
  assert.deepEqual(nestedMeta.prototype[0].toJSON, {
    kind: 'nested-plain-data'
  });
  assert.equal(Object.getPrototypeOf(nestedMeta), Object.prototype);
  assert.equal(Object.getPrototypeOf(nestedMeta.prototype[0]), Object.prototype);
  assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, 'nested'), false);
  assert.equal(JSON.stringify(listed).includes(credential), false);
  fixture.adapter.close();
});

test('all parameter-schema aliases preserve fallback order and semantic class rules', async () => {
  const credential = 'schema-alias-secret';
  const paths = [
    ['parameters'],
    ['parameterSchema'],
    ['inputSchema'],
    ['input_schema'],
    ['capabilities', 'parameters'],
    ['capabilities', 'parameterSchema'],
    ['capabilities', 'inputSchema'],
    ['capabilities', 'input_schema']
  ];
  const setPath = (target, path, value) => {
    let parent = target;
    for (const segment of path.slice(0, -1)) {
      parent[segment] ||= {};
      parent = parent[segment];
    }
    parent[path.at(-1)] = value;
  };
  const getPath = (target, path) => path.reduce((value, segment) => value[segment], target);

  for (let firstIndex = 0; firstIndex < paths.length; firstIndex += 1) {
    const manifest = { name: 'AliasTool' };
    for (let index = firstIndex; index < paths.length; index += 1) {
      setPath(manifest, paths[index], {
        type: 'string',
        title: `${credential} title ${index}`,
        description: `description ${credential} ${index}`,
        default: `safe-default-${index}`
      });
    }
    const fixture = createFixture({
      allowedTools: ['AliasTool'],
      key: credential,
      manifests: [manifest]
    });
    const tool = (await fixture.adapter.listTools()).tools[0];
    const projectedSchema = getPath(tool.raw_manifest, paths[firstIndex]);
    assert.strictEqual(tool.parameters, projectedSchema, paths[firstIndex].join('.'));
    assert.equal(projectedSchema.title, `[REDACTED] title ${firstIndex}`);
    assert.equal(projectedSchema.description, `description [REDACTED] ${firstIndex}`);
    assert.equal(projectedSchema.default, `safe-default-${firstIndex}`);
    fixture.adapter.close();

    const unsafeManifest = { name: 'AliasTool' };
    setPath(unsafeManifest, paths[firstIndex], {
      type: 'string',
      const: credential
    });
    const unsafeFixture = createFixture({
      allowedTools: ['AliasTool'],
      key: credential,
      manifests: [unsafeManifest]
    });
    await assert.rejects(
      unsafeFixture.adapter.listTools(),
      error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT',
      paths[firstIndex].join('.')
    );
    unsafeFixture.adapter.close();
  }
});

test('root and capabilities configSchema maps redact annotations and preserve contracts', async () => {
  const credential = 'config-schema-secret';
  for (const location of ['root', 'capabilities']) {
    const schema = {
      mode: {
        type: 'string',
        title: `${credential} title`,
        description: `description ${credential}`,
        default: 'safe-default'
      }
    };
    const manifest = location === 'root'
      ? { name: 'ConfigTool', configSchema: schema }
      : { name: 'ConfigTool', capabilities: { configSchema: schema } };
    const fixture = createFixture({
      allowedTools: ['ConfigTool'],
      key: credential,
      manifests: [manifest]
    });
    const projected = (await fixture.adapter.listTools()).tools[0].raw_manifest;
    const projectedSchema = location === 'root'
      ? projected.configSchema
      : projected.capabilities.configSchema;
    assert.equal(projectedSchema.mode.title, '[REDACTED] title', location);
    assert.equal(projectedSchema.mode.description, 'description [REDACTED]', location);
    assert.equal(projectedSchema.mode.default, 'safe-default', location);
    fixture.adapter.close();

    const unsafeSchema = {
      mode: { type: 'string', default: credential }
    };
    const unsafeManifest = location === 'root'
      ? { name: 'ConfigTool', configSchema: unsafeSchema }
      : { name: 'ConfigTool', capabilities: { configSchema: unsafeSchema } };
    const unsafeFixture = createFixture({
      allowedTools: ['ConfigTool'],
      key: credential,
      manifests: [unsafeManifest]
    });
    await assert.rejects(
      unsafeFixture.adapter.listTools(),
      error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT',
      location
    );
    unsafeFixture.adapter.close();
  }
});

test('all invocation-command aliases preserve fallback order and fail closed on collisions', async () => {
  const credential = 'invocation-alias-secret';
  const paths = [
    ['capabilities', 'invocationCommands'],
    ['capabilities', 'invocation_commands'],
    ['invocationCommands'],
    ['invocation_commands']
  ];
  const setPath = (target, path, value) => {
    let parent = target;
    for (const segment of path.slice(0, -1)) {
      parent[segment] ||= {};
      parent = parent[segment];
    }
    parent[path.at(-1)] = value;
  };
  const getPath = (target, path) => path.reduce((value, segment) => value[segment], target);

  for (let firstIndex = 0; firstIndex < paths.length; firstIndex += 1) {
    const manifest = { name: 'InvocationTool' };
    for (let index = firstIndex; index < paths.length; index += 1) {
      setPath(manifest, paths[index], [`safe-command-${index}`]);
    }
    const fixture = createFixture({
      allowedTools: ['InvocationTool'],
      key: credential,
      manifests: [manifest]
    });
    const tool = (await fixture.adapter.listTools()).tools[0];
    const projectedCommands = getPath(tool.raw_manifest, paths[firstIndex]);
    assert.strictEqual(tool.invocation_commands, projectedCommands, paths[firstIndex].join('.'));
    assert.deepEqual(projectedCommands, [`safe-command-${firstIndex}`]);
    fixture.adapter.close();

    const unsafeManifest = { name: 'InvocationTool' };
    setPath(unsafeManifest, paths[firstIndex], [`run ${credential}`]);
    const unsafeFixture = createFixture({
      allowedTools: ['InvocationTool'],
      key: credential,
      manifests: [unsafeManifest]
    });
    await assert.rejects(
      unsafeFixture.adapter.listTools(),
      error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT',
      paths[firstIndex].join('.')
    );
    unsafeFixture.adapter.close();
  }
});

test('single percent decoding protects non-ASCII credentials without changing JSON scalars', async () => {
  const credential = '密钥';
  const encodedLower = [...Buffer.from(credential, 'utf8')]
    .map(byte => `%${byte.toString(16).padStart(2, '0')}`)
    .join('');
  const encodedUpper = encodedLower.toUpperCase();
  const encodedMixed = [...encodedLower].map((character, index) => (
    /[a-f]/u.test(character) && index % 2 === 0 ? character.toUpperCase() : character
  )).join('');
  const manifest = {
    name: 'UnicodeTool',
    description: `${encodedUpper}|${encodedLower}|${encodedMixed}`,
    'x-json-scalars': {
      number: 123,
      boolean: true,
      nothing: null,
      array: [123, false, null]
    }
  };
  const fixture = createFixture({
    allowedTools: ['UnicodeTool'],
    key: credential,
    manifests: [manifest]
  });
  const tool = (await fixture.adapter.listTools()).tools[0];
  assert.equal(tool.description, '[REDACTED]|[REDACTED]|[REDACTED]');
  assert.deepEqual(tool.raw_manifest['x-json-scalars'], {
    number: 123,
    boolean: true,
    nothing: null,
    array: [123, false, null]
  });
  fixture.adapter.close();

  const unsafeFixture = createFixture({
    allowedTools: ['UnicodeTool'],
    key: credential,
    manifests: [{
      name: 'UnicodeTool',
      'x-future-contract': { encoded: encodedMixed }
    }]
  });
  await assert.rejects(
    unsafeFixture.adapter.listTools(),
    error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT'
  );
  unsafeFixture.adapter.close();

  const numericCredentialFixture = createFixture({
    allowedTools: ['ScalarTool'],
    key: '123',
    manifests: [{
      name: 'ScalarTool',
      'x-json-scalars': { number: 123, boolean: true, nothing: null }
    }]
  });
  assert.deepEqual(
    (await numericCredentialFixture.adapter.listTools())
      .tools[0].raw_manifest['x-json-scalars'],
    { number: 123, boolean: true, nothing: null }
  );
  numericCredentialFixture.adapter.close();

  for (const [scalarCredential, scalar] of [
    ['123', 123],
    ['true', true],
    ['false', false],
    ['null', null]
  ]) {
    const scalarFixture = createFixture({
      allowedTools: ['ScalarTool'],
      key: scalarCredential,
      manifests: [{
        name: 'ScalarTool',
        'x-json-scalar': scalar
      }]
    });
    assert.equal(
      (await scalarFixture.adapter.listTools())
        .tools[0].raw_manifest['x-json-scalar'],
      scalar,
      scalarCredential
    );
    scalarFixture.adapter.close();
  }
});

test('single percent decoding preserves UTF-8 BOM bytes for credential matching', async () => {
  const credential = '\uFEFFX';
  const encodedCredential = '%EF%BB%BF%58';
  const descriptiveFixture = createFixture({
    allowedTools: ['BomTool'],
    key: credential,
    manifests: [{ name: 'BomTool', description: encodedCredential }]
  });
  assert.equal(
    (await descriptiveFixture.adapter.listTools()).tools[0].description,
    '[REDACTED]'
  );
  descriptiveFixture.adapter.close();

  for (const manifest of [
    { name: 'BomTool', 'x-future-contract': { value: encodedCredential } },
    { name: 'BomTool', [encodedCredential]: 'safe-value' }
  ]) {
    const unsafeFixture = createFixture({
      allowedTools: ['BomTool'],
      key: credential,
      manifests: [manifest]
    });
    await assert.rejects(
      unsafeFixture.adapter.listTools(),
      error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT'
    );
    unsafeFixture.adapter.close();
  }
});

test('descriptive fields redact raw and single-percent representations exactly once', async () => {
  const credential = 'Jazz';
  const encodedUpper = '%4A%61%7A%7A';
  const encodedLower = '%4a%61%7a%7a';
  const encodedMixed = 'J%61z%7A';
  const encodedAfterInvalidUtf8 = `%FF${encodedUpper}`;
  const encodedAfterMalformed = `%ZZ${encodedLower}`;
  const doubleEncoded = '%254A%2561%257A%257A';
  const manifests = [{
    name: 'RepresentationTool',
    displayName: encodedUpper,
    title: encodedLower,
    description: `raw ${credential}`,
    parameters: {
      type: 'object',
      properties: {
        mixed: { type: 'string', description: encodedMixed },
        invalid: { type: 'string', description: encodedAfterInvalidUtf8 },
        malformed: { type: 'string', description: encodedAfterMalformed },
        parsedUnicode: {
          type: 'string',
          description: JSON.parse('"\\u004a\\u0061\\u007a\\u007a"')
        }
      }
    },
    metadata: {
      caseSensitive: 'jazz',
      markerData: '[REDACTED]',
      doubleEncoded,
      base64Text: 'SmF6eg==',
      hexadecimalText: '4a617a7a',
      literalUnicodeEscape: '\\u004a\\u0061\\u007a\\u007a',
      crossNode: ['Ja', 'zz']
    }
  }];
  const fixture = createFixture({
    allowedTools: ['RepresentationTool'],
    key: credential,
    manifests
  });

  const firstProjection = await fixture.adapter.listTools();
  const tool = firstProjection.tools[0];
  assert.equal(tool.display_name, '[REDACTED]');
  assert.equal(tool.description, 'raw [REDACTED]');
  assert.equal(tool.raw_manifest.title, '[REDACTED]');
  assert.equal(tool.parameters.properties.mixed.description, '[REDACTED]');
  assert.equal(tool.parameters.properties.invalid.description, '%FF[REDACTED]');
  assert.equal(tool.parameters.properties.malformed.description, '%ZZ[REDACTED]');
  assert.equal(tool.parameters.properties.parsedUnicode.description, '[REDACTED]');
  assert.equal(tool.raw_manifest.metadata.caseSensitive, 'jazz');
  assert.equal(tool.raw_manifest.metadata.markerData, '[REDACTED]');
  assert.equal(tool.raw_manifest.metadata.doubleEncoded, doubleEncoded);
  assert.equal(tool.raw_manifest.metadata.base64Text, 'SmF6eg==');
  assert.equal(tool.raw_manifest.metadata.hexadecimalText, '4a617a7a');
  assert.equal(
    tool.raw_manifest.metadata.literalUnicodeEscape,
    '\\u004a\\u0061\\u007a\\u007a'
  );
  assert.deepEqual(tool.raw_manifest.metadata.crossNode, ['Ja', 'zz']);
  assert.deepEqual(await fixture.adapter.listTools(), firstProjection);
  fixture.adapter.close();
});

test('identity, contract, invocation, and opaque credential collisions fail closed', async () => {
  const cases = [
    {
      name: 'schema-property-name',
      credential: 'SECRET',
      manifest: {
        name: 'ToolA',
        parameters: {
          type: 'object',
          properties: { SECRET: { type: 'string' } }
        }
      }
    },
    {
      name: 'manifest-version',
      credential: 'SECRET',
      manifest: { name: 'ToolA', manifestVersion: 'SECRET' }
    },
    {
      name: 'config-schema-contract',
      credential: 'SECRET',
      manifest: {
        name: 'ToolA',
        configSchema: {
          mode: { type: 'string', default: 'SECRET' }
        }
      }
    },
    {
      name: 'manifest-name',
      credential: 'ToolA',
      manifest: { name: 'ToolA' }
    },
    {
      name: 'unknown-key-percent-lower',
      credential: 'Jazz',
      manifest: { name: 'ToolA', '%4a%61%7a%7a': 'safe' }
    },
    {
      name: 'unknown-nested-percent-mixed',
      credential: 'Jazz',
      manifest: {
        name: 'ToolA',
        'x-future-contract': { mode: 'J%61z%7A' }
      }
    },
    {
      name: 'unknown-description-is-not-descriptive',
      credential: 'SECRET',
      manifest: {
        name: 'ToolA',
        'x-future-contract': { description: 'SECRET' }
      }
    },
    {
      name: 'invocation-command',
      credential: 'SECRET',
      manifest: {
        name: 'ToolA',
        capabilities: { invocationCommands: ['run SECRET'] }
      }
    }
  ];

  for (const testCase of cases) {
    const fixture = createFixture({
      allowedTools: [testCase.manifest.name],
      key: testCase.credential,
      manifests: [testCase.manifest]
    });
    await assert.rejects(
      fixture.adapter.listTools(),
      error => {
        assert.equal(error.code, 'VCP_MANIFEST_UNSAFE_TO_PROJECT');
        assert.equal(error.message.includes(testCase.credential), false);
        return true;
      },
      testCase.name
    );
    assert.equal(fixture.adapter.manifestsLoaded, false, testCase.name);
    assert.deepEqual(fixture.adapter.latestTools, [], testCase.name);
    fixture.adapter.close();
  }
});

test('redaction marker collisions fail the entire manifest projection', async () => {
  const fixture = createFixture({
    allowedTools: ['ToolA'],
    key: 'REDACTED',
    manifests: [{ name: 'ToolA', description: 'credential REDACTED' }]
  });
  await assert.rejects(
    fixture.adapter.listTools(),
    error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT'
  );
  assert.equal(fixture.adapter.manifestsLoaded, false);
  assert.deepEqual(fixture.adapter.latestTools, []);
  fixture.adapter.close();
});

test('final egress assertion rejects a credential created by redaction boundaries', async () => {
  const credential = 'x[REDACTED]y';
  const encodedCredential = [...Buffer.from(credential, 'utf8')]
    .map(byte => `%${byte.toString(16).padStart(2, '0')}`)
    .join('');
  const fixture = createFixture({
    allowedTools: ['ToolA'],
    key: credential,
    manifests: [{
      name: 'ToolA',
      description: `x${encodedCredential}y`
    }]
  });
  await assert.rejects(
    fixture.adapter.listTools(),
    error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT'
  );
  assert.equal(fixture.adapter.manifestsLoaded, false);
  assert.deepEqual(fixture.adapter.latestTools, []);
  fixture.adapter.close();
});

test('high-frequency descriptive matches are streamed and bounded during redaction', async () => {
  const adjacentFixture = createFixture({
    allowedTools: ['DenseTool'],
    key: 'q',
    manifests: [{
      name: 'DenseTool',
      description: 'q'.repeat(MAX_OUTPUT_PROJECTION_STRING_BYTES)
    }]
  });
  assert.equal(
    (await adjacentFixture.adapter.listTools()).tools[0].description,
    '[REDACTED]'
  );
  adjacentFixture.adapter.close();

  const percentFixture = createFixture({
    allowedTools: ['DenseTool'],
    key: 'q',
    manifests: [{
      name: 'DenseTool',
      description: '%71'.repeat(Math.floor(MAX_OUTPUT_PROJECTION_STRING_BYTES / 3))
    }]
  });
  assert.equal(
    (await percentFixture.adapter.listTools()).tools[0].description,
    '[REDACTED]'
  );
  percentFixture.adapter.close();

  const alternatingFixture = createFixture({
    allowedTools: ['DenseTool'],
    key: 'q',
    manifests: [{
      name: 'DenseTool',
      description: 'qx'.repeat(MAX_OUTPUT_PROJECTION_STRING_BYTES / 2)
    }]
  });
  await assert.rejects(
    alternatingFixture.adapter.listTools(),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  alternatingFixture.adapter.close();
});

test('one unsafe allowed manifest fails the cohort and clears a previously safe snapshot', async () => {
  const credential = 'unsafe-contract-secret';
  const fixture = createFixture({
    allowedTools: ['SafeTool', 'UnsafeTool'],
    key: credential,
    manifests: [{ name: 'SafeTool', description: 'safe manifest' }]
  });
  assert.equal((await fixture.adapter.listTools()).tools.length, 1);
  assert.equal(fixture.adapter.getStatus().protocol_ready, true);

  fixture.bridge.manifests = [
    { name: 'SafeTool', description: 'safe manifest' },
    { name: 'UnsafeTool', manifestVersion: credential }
  ];
  await assert.rejects(
    fixture.adapter.listTools(),
    error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT'
  );
  assert.equal(fixture.adapter.manifestsLoaded, false);
  assert.deepEqual(fixture.adapter.latestTools, []);
  assert.equal(fixture.adapter.getStatus().protocol_ready, false);
  assert.equal(fixture.adapter.getStatus().tools_discovered, 0);

  fixture.bridge.manifests = [{ name: 'SafeTool', description: 'safe again' }];
  assert.equal((await fixture.adapter.listTools()).tools.length, 1);
  assert.equal(fixture.adapter.getStatus().protocol_ready, true);
  fixture.adapter.close();
});

test('unsafe disallowed manifests do not change exact allowlist filtering', async () => {
  const credential = 'unsafe-disallowed-secret';
  const fixture = createFixture({
    allowedTools: ['SafeTool'],
    key: credential,
    manifests: [
      { name: 'SafeTool', description: 'safe manifest' },
      { name: 'DisallowedTool', manifestVersion: credential }
    ]
  });
  const listed = await fixture.adapter.listTools();
  assert.deepEqual(listed.tools.map(tool => tool.name), ['SafeTool']);
  fixture.adapter.close();
});

test('manifest traversal rejects non-JSON hooks without invoking them', () => {
  let getterCalls = 0;
  let toJSONCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, 'value', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'unsafe';
    }
  });
  const withAccessor = { name: 'HookTool', extension: accessor };
  assert.throws(
    () => projectToolList(
      [{ name: 'HookTool', nativeManifest: withAccessor }],
      { credential: 'credential', allowedTools: new Set(['HookTool']) }
    ),
    error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT'
  );
  assert.equal(getterCalls, 0);

  const withExecutableToJSON = {
    name: 'HookTool',
    toJSON() {
      toJSONCalls += 1;
      return { name: 'HookTool' };
    }
  };
  assert.throws(
    () => projectToolList(
      [{ name: 'HookTool', nativeManifest: withExecutableToJSON }],
      { credential: 'credential', allowedTools: new Set(['HookTool']) }
    ),
    error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT'
  );
  assert.equal(toJSONCalls, 0);

  const sparse = [];
  sparse.length = 2;
  sparse[1] = 'value';
  assert.throws(
    () => projectToolList(
      [{
        name: 'HookTool',
        nativeManifest: { name: 'HookTool', extension: sparse }
      }],
      { credential: 'credential', allowedTools: new Set(['HookTool']) }
    ),
    error => error.code === 'VCP_MANIFEST_UNSAFE_TO_PROJECT'
  );
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

test('manifest source and projected-output byte budgets are enforced independently', async () => {
  const credential = 'source-secret';
  const sourceHeavyProperties = {};
  for (let index = 0; index < 4_000; index += 1) {
    sourceHeavyProperties[`field-${index}`] = {
      description: credential.repeat(100)
    };
  }
  const sourceHeavyManifest = {
    name: 'SourceBudgetTool',
    parameters: {
      type: 'object',
      properties: sourceHeavyProperties
    }
  };
  const sourceFixture = createFixture({
    timeout: 5_000,
    allowedTools: ['SourceBudgetTool'],
    key: credential,
    manifests: [sourceHeavyManifest]
  });
  assert.equal(
    Buffer.byteLength(JSON.stringify(sourceHeavyManifest), 'utf8') >
      MAX_OUTPUT_PROJECTION_TOTAL_BYTES,
    true
  );
  await assert.rejects(
    sourceFixture.adapter.listTools(),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  assert.deepEqual(sourceFixture.adapter.latestTools, []);
  sourceFixture.adapter.close();

  const repeatedContractValues = Array.from(
    { length: 9 },
    (_, index) => `${index}${'a'.repeat((240 * 1024) - 1)}`
  );
  const outputHeavyManifest = {
    name: 'OutputBudgetTool',
    parameters: {
      type: 'string',
      examples: repeatedContractValues
    }
  };
  assert.equal(
    Buffer.byteLength(JSON.stringify(outputHeavyManifest), 'utf8') <
      MAX_OUTPUT_PROJECTION_TOTAL_BYTES,
    true
  );
  const outputFixture = createFixture({
    timeout: 5_000,
    allowedTools: ['OutputBudgetTool'],
    key: 'different-secret',
    manifests: [outputHeavyManifest]
  });
  await assert.rejects(
    outputFixture.adapter.listTools(),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  assert.deepEqual(outputFixture.adapter.latestTools, []);
  outputFixture.adapter.close();

  const wideFixture = createFixture({
    timeout: 5_000,
    allowedTools: ['WideTool'],
    key: 'different-secret',
    manifests: [{
      name: 'WideTool',
      'x-future-wide': Array.from(
        { length: MAX_OUTPUT_PROJECTION_NODES + 1 },
        () => true
      )
    }]
  });
  await assert.rejects(
    wideFixture.adapter.listTools(),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  assert.deepEqual(wideFixture.adapter.latestTools, []);
  wideFixture.adapter.close();
});

test('budgeted projection avoids full-width reflection materializers', () => {
  const projectorSource = fs.readFileSync(
    require.resolve('../src/vcp-adapter/VcpOutputProjection'),
    'utf8'
  );
  const forbiddenMaterializers = [
    /Object\.getOwnPropertyDescriptors\s*\(/u,
    /Object\.(?:entries|keys|values|getOwnPropertyNames)\s*\(/u,
    /Reflect\.ownKeys\s*\(/u
  ];

  for (const pattern of forbiddenMaterializers) {
    assert.doesNotMatch(projectorSource, pattern);
  }
  assert.match(projectorSource, /function\s*\*\s*ownEnumerableKeyIterator/u);
  assert.match(projectorSource, /Object\.getOwnPropertyDescriptor\s*\(/u);
});

test('100,000-key admitted manifest and PAYLOAD stop at the node gate before full-width descriptor reads', async () => {
  const keyCount = 100_000;
  const wideObject = createWideJsonObject(keyCount);
  const wideNativeManifest = {
    name: 'WideObjectTool',
    'x-future-wide-object': wideObject
  };
  assert.equal(
    Buffer.byteLength(JSON.stringify(wideNativeManifest), 'utf8') <
      MAX_OUTPUT_PROJECTION_TOTAL_BYTES,
    true
  );

  let projectedManifest;
  const manifestObservation = captureOwnDescriptorReads(() => {
    projectedManifest = projectToolList(asNativePlugins([wideNativeManifest]), {
      credential: 'different-secret',
      allowedTools: new Set(['WideObjectTool'])
    });
  });
  assert.equal(projectedManifest, undefined);
  assert.equal(manifestObservation.caughtError instanceof RangeError, false);
  assert.equal(
    manifestObservation.caughtError?.code,
    'VCP_RESPONSE_TOO_COMPLEX'
  );
  assert.equal(
    manifestObservation.descriptorReads <= MAX_OUTPUT_PROJECTION_NODES + 64,
    true,
    `manifest descriptor reads were ${manifestObservation.descriptorReads}`
  );
  assert.equal(manifestObservation.descriptorReads < keyCount, true);

  let projectedExecution;
  const payloadObservation = captureOwnDescriptorReads(() => {
    projectedExecution = projectToolExecution({
      request_id: 'wide-payload-request',
      status: 'completed',
      result: wideObject,
      error: null
    }, 'WideObjectTool', {
      credential: 'different-secret'
    });
  });
  assert.equal(projectedExecution, undefined);
  assert.equal(payloadObservation.caughtError instanceof RangeError, false);
  assert.equal(
    payloadObservation.caughtError?.code,
    'VCP_RESPONSE_TOO_COMPLEX'
  );
  assert.equal(
    payloadObservation.descriptorReads <= MAX_OUTPUT_PROJECTION_NODES + 64,
    true,
    `PAYLOAD descriptor reads were ${payloadObservation.descriptorReads}`
  );
  assert.equal(payloadObservation.descriptorReads < keyCount, true);

  let manifestFrameBytes = 0;
  const manifestFixture = createFixture({
    timeout: 5_000,
    allowedTools: ['WideObjectTool'],
    key: 'different-secret',
    manifestResponseFactory(message) {
      const response = {
        type: 'vcp_manifest_response',
        data: {
          requestId: message.data.requestId,
          manifestSurface: 'native-v1',
          plugins: asNativePlugins([wideNativeManifest]),
          vcpVersion: 'fake-1'
        }
      };
      manifestFrameBytes = Buffer.byteLength(JSON.stringify(response), 'utf8');
      return response;
    }
  });
  await assert.rejects(
    manifestFixture.adapter.listTools(),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  assert.equal(manifestFrameBytes <= MAX_VCP_INBOUND_FRAME_BYTES, true);
  assert.deepEqual(manifestFixture.adapter.latestTools, []);
  manifestFixture.adapter.close();

  let payloadFrameBytes = 0;
  const payloadFixture = createFixture({
    timeout: 5_000,
    allowedTools: ['WideObjectTool'],
    key: 'different-secret',
    executionResponseFactory(message) {
      const response = {
        type: 'vcp_tool_result',
        data: {
          requestId: message.data.requestId,
          status: 'success',
          result: wideObject
        }
      };
      payloadFrameBytes = Buffer.byteLength(JSON.stringify(response), 'utf8');
      return response;
    }
  });
  await assert.rejects(
    payloadFixture.adapter.executeTool({
      tool_name: 'WideObjectTool',
      tool_args: {},
      request_id: 'wide-payload-admission'
    }),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
  assert.equal(payloadFrameBytes <= MAX_VCP_INBOUND_FRAME_BYTES, true);
  payloadFixture.adapter.close();
});

test('a many-key frame above 4 MiB is rejected before parsed traversal', async () => {
  const oversizedManifest = { name: 'OversizedWireTool' };
  for (let index = 0; index < 150_000; index += 1) {
    oversizedManifest[`oversized_contract_field_${index}`] = true;
  }
  const frame = JSON.stringify({
    type: 'vcp_manifest_response',
    data: {
      requestId: 'oversized-many-key-frame',
      manifestSurface: 'native-v1',
      plugins: asNativePlugins([oversizedManifest])
    }
  });
  assert.equal(Buffer.byteLength(frame, 'utf8') > MAX_VCP_INBOUND_FRAME_BYTES, true);

  const observed = await observeInboundFrame(frame);
  assert.equal(observed.messageTextCalls, 0);
  assert.equal(observed.jsonParseCalls, 0);
  assert.deepEqual(observed.socket.closeCalls, [{
    code: 1009,
    reason: 'vcp_response_too_complex'
  }]);
});

test('moderately wide plus over-depth manifest fails with the bounded complexity error', () => {
  let deepValue = 'leaf';
  for (let index = 0; index < MAX_OUTPUT_PROJECTION_DEPTH + 2; index += 1) {
    deepValue = { nested: deepValue };
  }
  const wideAndDeep = createWideJsonObject(256);
  wideAndDeep.deep = deepValue;

  assert.throws(
    () => projectToolList(asNativePlugins([{
      name: 'WideDeepTool',
      'x-future-wide-deep': wideAndDeep
    }]), {
      credential: 'different-secret',
      allowedTools: new Set(['WideDeepTool'])
    }),
    error => error.code === 'VCP_RESPONSE_TOO_COMPLEX' && !(error instanceof RangeError)
  );
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
        return { manifestSurface: 'native-v1', plugins: asNativePlugins(manifests) };
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
      return { manifestSurface: 'native-v1', plugins: asNativePlugins(manifests) };
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
    description: `Synthetic manifest ${SYNTHETIC_BRIDGE_KEY}`
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

  const encodedCredential = [...Buffer.from(SYNTHETIC_BRIDGE_KEY, 'utf8')]
    .map(byte => `%${byte.toString(16).padStart(2, '0')}`)
    .join('');
  class PercentThrowingWebSocket {
    constructor() {
      throw new Error(`Synthetic encoded setup failure ${encodedCredential}`);
    }
  }
  for (const operation of ['list', 'execute']) {
    const encodedAdapter = new VcpToolAdapter({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: SYNTHETIC_BRIDGE_KEY,
      allowedTools: ['ToolA'],
      requestTimeoutMs: 20,
      WebSocketImpl: PercentThrowingWebSocket
    });
    await assert.rejects(
      operation === 'list'
        ? encodedAdapter.listTools()
        : encodedAdapter.executeTool({
            tool_name: 'ToolA',
            tool_args: {},
            request_id: 'encoded-connection-error'
          }),
      error => {
        assert.equal(error.code, 'VCP_BRIDGE_CONNECTION_ERROR');
        assert.equal(error.message.includes(encodedCredential), false);
        assert.equal(error.stack.includes(encodedCredential), false);
        assert.equal(error.message.includes(SYNTHETIC_BRIDGE_KEY), false);
        return true;
      },
      operation
    );
    encodedAdapter.close();
  }

  const controlCredential = 'boundary\\nsecret';
  class ControlThrowingWebSocket {
    constructor() {
      throw new Error('boundary\nsecret');
    }
  }
  for (const operation of ['list', 'execute']) {
    const controlAdapter = new VcpToolAdapter({
      bridgeUrl: 'ws://127.0.0.1:1',
      key: controlCredential,
      allowedTools: ['ToolA'],
      requestTimeoutMs: 20,
      WebSocketImpl: ControlThrowingWebSocket
    });
    await assert.rejects(
      operation === 'list'
        ? controlAdapter.listTools()
        : controlAdapter.executeTool({
            tool_name: 'ToolA',
            tool_args: {},
            request_id: 'control-connection-error'
          }),
      error => {
        assert.equal(error.code, 'VCP_BRIDGE_CONNECTION_ERROR');
        assert.equal(error.message.includes(controlCredential), false);
        assert.equal(error.stack.includes(controlCredential), false);
        assert.equal(error.message.includes('boundary\nsecret'), false);
        return true;
      },
      operation
    );
    controlAdapter.close();
  }
});
