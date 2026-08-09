'use strict';

const crypto = require('node:crypto');

const PROTOCOL = Object.freeze({
  manifestRequestType: 'get_vcp_manifests',
  manifestResponseType: 'vcp_manifest_response',
  executeRequestType: 'execute_vcp_tool',
  resultMessageType: 'vcp_tool_result',
  statusMessageTypes: Object.freeze(['vcp_tool_status']),
  connectionAckType: 'connection_ack'
});

class VcpToolBridgeClientError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'VcpToolBridgeClientError';
    this.code = code;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeTimeout(value, fallback = 30000) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeRequestId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function publicRequestState(state) {
  if (!state) return null;
  return {
    request_id: state.requestId,
    status: state.status,
    progress: state.progress ?? null,
    result: state.result ?? null,
    error: state.error ?? null
  };
}

class VcpToolBridgeClient {
  constructor({
    bridgeUrl,
    key,
    requestTimeoutMs = 30000,
    WebSocketImpl = globalThis.WebSocket,
    requestIdFactory = () => crypto.randomUUID()
  } = {}) {
    this.bridgeUrl = typeof bridgeUrl === 'string' ? bridgeUrl.trim() : '';
    this.key = typeof key === 'string' ? key : '';
    this.requestTimeoutMs = normalizeTimeout(requestTimeoutMs);
    this.WebSocketImpl = WebSocketImpl;
    this.requestIdFactory = requestIdFactory;

    this.socket = null;
    this.connectPromise = null;
    this.connectResolve = null;
    this.connectReject = null;
    this.connectTimer = null;
    this.disconnectRequested = false;
    this.pending = new Map();
    this.requestStates = new Map();
    this.bridgeRequestAliases = new Map();
    this.connected = false;
    this.bridgeEnabled = false;
    this.protocolReady = false;
    this.toolsDiscovered = 0;
    this.lastError = null;
  }

  _safeErrorMessage(error, fallback = 'vcp_bridge_error') {
    let message = typeof error?.message === 'string' && error.message.trim()
      ? error.message.trim()
      : fallback;
    if (this.key) {
      message = message.split(this.key).join('[REDACTED]');
      message = message.split(encodeURIComponent(this.key)).join('[REDACTED]');
    }
    message = message
      .replace(/VCP_Key=[^\s/&]+/giu, 'VCP_Key=[REDACTED]')
      .replace(/(?:https?|wss?):\/\/[^\s]+/giu, '[REDACTED_URL]');
    return message.slice(0, 500);
  }

  _connectionUrl() {
    if (!this.bridgeUrl) {
      throw new VcpToolBridgeClientError('VCP adapter bridge URL is not configured', 'VCP_BRIDGE_URL_REQUIRED');
    }
    if (!this.key) {
      throw new VcpToolBridgeClientError('VCP adapter key is not configured', 'VCP_BRIDGE_KEY_REQUIRED');
    }

    let target;
    try {
      target = new URL(this.bridgeUrl);
    } catch {
      throw new VcpToolBridgeClientError('VCP adapter bridge URL is invalid', 'VCP_BRIDGE_URL_INVALID');
    }
    if (!['ws:', 'wss:'].includes(target.protocol)) {
      throw new VcpToolBridgeClientError('VCP adapter bridge URL must use ws or wss', 'VCP_BRIDGE_URL_INVALID');
    }
    if (target.username || target.password || /VCP_Key=/iu.test(target.pathname)) {
      throw new VcpToolBridgeClientError(
        'VCP adapter bridge URL must not embed credentials',
        'VCP_BRIDGE_URL_CONTAINS_CREDENTIALS'
      );
    }

    const basePath = target.pathname.replace(/\/+$/u, '');
    target.pathname = `${basePath}/vcp-distributed-server/VCP_Key=${encodeURIComponent(this.key)}`;
    target.search = '';
    target.hash = '';
    return target.toString();
  }

  _clearConnectWaiter() {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
    this.connectResolve = null;
    this.connectReject = null;
    this.connectPromise = null;
  }

  _settleConnect(error = null) {
    const resolve = this.connectResolve;
    const reject = this.connectReject;
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
    this.connectResolve = null;
    this.connectReject = null;
    if (error) {
      if (reject) reject(error);
    } else if (resolve) {
      resolve();
    }
  }

  connect() {
    if (this.connected && this.socket?.readyState === 1) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    this.disconnectRequested = false;
    const attempt = new Promise((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;
    });
    this.connectPromise = attempt;
    attempt.then(
      () => {
        if (this.connectPromise === attempt) this._clearConnectWaiter();
      },
      () => {
        if (this.connectPromise === attempt) this._clearConnectWaiter();
      }
    );

    try {
      if (typeof this.WebSocketImpl !== 'function') {
        throw new VcpToolBridgeClientError(
          'WebSocket client is unavailable',
          'VCP_WEBSOCKET_UNAVAILABLE'
        );
      }
      const socket = new this.WebSocketImpl(this._connectionUrl());
      this.socket = socket;
      socket.addEventListener('message', event => this._handleMessage(event, socket));
      socket.addEventListener('close', () => this._handleDisconnect('vcp_bridge_disconnected', socket));
      socket.addEventListener('error', event => {
        const error = new VcpToolBridgeClientError(
          this._safeErrorMessage(event?.error, 'vcp_bridge_connection_error'),
          'VCP_BRIDGE_CONNECTION_ERROR'
        );
        this.lastError = error.message;
        if (this.connectReject && this.socket === socket) {
          this.connected = false;
          this.protocolReady = false;
          this.socket = null;
          this._settleConnect(error);
          if (socket.readyState < 2) {
            try {
              socket.close();
            } catch {
              // The connection attempt is already rejected and detached.
            }
          }
        }
      });
      this.connectTimer = setTimeout(() => {
        const error = new VcpToolBridgeClientError(
          'Timed out waiting for VCP bridge connection acknowledgement',
          'VCP_BRIDGE_CONNECT_TIMEOUT'
        );
        this.lastError = error.message;
        this.connected = false;
        this.protocolReady = false;
        if (this.socket === socket) this.socket = null;
        this._settleConnect(error);
        try {
          if (socket.readyState < 2) socket.close();
        } catch {
          // Ignore close failures after a connection timeout.
        }
      }, this.requestTimeoutMs);
    } catch (error) {
      const wrapped = error instanceof VcpToolBridgeClientError
        ? error
        : new VcpToolBridgeClientError(
            this._safeErrorMessage(error, 'vcp_bridge_connection_error'),
            'VCP_BRIDGE_CONNECTION_ERROR'
          );
      this.lastError = wrapped.message;
      this.connected = false;
      this.protocolReady = false;
      this.socket = null;
      this._settleConnect(wrapped);
    }

    return attempt;
  }

  disconnect() {
    this.disconnectRequested = true;
    if (this.socket && this.socket.readyState < 2) {
      try {
        this.socket.close(1000, 'adapter disconnect');
      } catch {
        this._handleDisconnect('vcp_bridge_disconnected');
      }
    } else {
      this._handleDisconnect('vcp_bridge_disconnected');
    }
  }

  _handleDisconnect(reason, socket = this.socket) {
    if (socket && this.socket !== socket) return;
    const wasRequested = this.disconnectRequested;
    this.connected = false;
    this.protocolReady = false;
    this.socket = null;
    const error = new VcpToolBridgeClientError(reason, 'VCP_BRIDGE_DISCONNECTED');
    if (!wasRequested) this.lastError = reason;
    if (this.connectReject) this._settleConnect(error);

    for (const state of this.requestStates.values()) {
      if (state.status !== 'running') continue;
      state.status = 'failed';
      state.error = reason;
    }
    for (const [requestId, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  async _messageText(data) {
    if (typeof data === 'string') return data;
    if (Buffer.isBuffer(data)) return data.toString('utf8');
    if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
    if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
    if (data && typeof data.text === 'function') return data.text();
    return String(data ?? '');
  }

  async _handleMessage(event, socket = this.socket) {
    if (socket && this.socket !== socket) return;
    let text;
    try {
      text = await this._messageText(event?.data);
    } catch {
      if (socket && this.socket !== socket) return;
      this.lastError = 'vcp_bridge_invalid_json_message';
      return;
    }
    if (socket && this.socket !== socket) return;

    let message;
    try {
      message = JSON.parse(text);
    } catch {
      this.lastError = 'vcp_bridge_invalid_json_message';
      return;
    }

    if (message?.type === PROTOCOL.connectionAckType) {
      this.connected = true;
      this.lastError = null;
      this._settleConnect();
      return;
    }

    const bridgeRequestId = normalizeRequestId(
      message?.data?.requestId ?? message?.data?.job_id ?? message?.data?.taskId
    );
    if (!bridgeRequestId) return;
    const requestId = this.bridgeRequestAliases.get(bridgeRequestId) || bridgeRequestId;
    const state = this.requestStates.get(requestId);

    if (PROTOCOL.statusMessageTypes.includes(message.type)) {
      if (state) {
        state.status = 'running';
        state.progress = message.data;
      }
      return;
    }

    if (message.type === PROTOCOL.manifestResponseType) {
      const plugins = Array.isArray(message.data?.plugins) ? message.data.plugins : [];
      this.bridgeEnabled = true;
      this.protocolReady = true;
      this.toolsDiscovered = plugins.length;
      if (state) {
        state.status = 'completed';
        state.result = message.data;
      }
      this._resolvePending(requestId, message.data);
      return;
    }

    if (message.type !== PROTOCOL.resultMessageType) return;

    const success = message.data?.status === 'success';
    const bridgeTaskId = normalizeRequestId(message.data?.result?.taskId);
    if (success && bridgeTaskId && bridgeTaskId !== requestId) {
      this.bridgeRequestAliases.set(bridgeTaskId, requestId);
    }

    if (state) {
      if (!success) {
        state.status = 'failed';
        state.error = this._safeErrorMessage({ message: message.data?.error }, 'vcp_tool_execution_failed');
      } else if (bridgeTaskId && bridgeRequestId === requestId) {
        state.status = 'running';
        state.result = message.data.result;
      } else {
        state.status = 'completed';
        state.result = message.data?.result ?? null;
        state.error = null;
      }
    }

    if (!success) {
      this._rejectPending(
        requestId,
        new VcpToolBridgeClientError(
          state?.error || 'vcp_tool_execution_failed',
          'VCP_TOOL_EXECUTION_FAILED'
        )
      );
    } else {
      this._resolvePending(requestId, publicRequestState(state));
    }
  }

  _resolvePending(requestId, value) {
    const pending = this.pending.get(requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(requestId);
    pending.resolve(value);
  }

  _rejectPending(requestId, error) {
    const pending = this.pending.get(requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(requestId);
    pending.reject(error);
  }

  async _request(type, data = {}, { requestId, kind, toolName = null } = {}) {
    await this.connect();
    const normalizedRequestId = normalizeRequestId(requestId) || this.requestIdFactory();
    if (this.requestStates.has(normalizedRequestId)) {
      throw new VcpToolBridgeClientError('request_id is already in use', 'VCP_REQUEST_ID_CONFLICT');
    }

    const state = {
      requestId: normalizedRequestId,
      kind,
      toolName,
      status: 'running',
      progress: null,
      result: null,
      error: null
    };
    this.requestStates.set(normalizedRequestId, state);

    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(normalizedRequestId);
        state.status = 'timeout';
        state.error = 'vcp_bridge_request_timeout';
        const error = new VcpToolBridgeClientError(state.error, 'VCP_REQUEST_TIMEOUT');
        this.lastError = state.error;
        reject(error);
      }, this.requestTimeoutMs);
      this.pending.set(normalizedRequestId, { resolve, reject, timer });
    });

    try {
      if (!this.socket || this.socket.readyState !== 1) {
        throw new VcpToolBridgeClientError('VCP bridge is not connected', 'VCP_BRIDGE_NOT_CONNECTED');
      }
      this.socket.send(JSON.stringify({
        type,
        data: {
          ...data,
          requestId: normalizedRequestId
        }
      }));
    } catch (error) {
      state.status = 'failed';
      state.error = this._safeErrorMessage(error, 'vcp_bridge_send_failed');
      this._rejectPending(normalizedRequestId, error);
    }

    return promise;
  }

  async discoverManifests() {
    const data = await this._request(PROTOCOL.manifestRequestType, {}, { kind: 'manifest' });
    return {
      plugins: Array.isArray(data?.plugins) ? data.plugins : [],
      vcpVersion: data?.vcpVersion ?? null
    };
  }

  async executeTool({ toolName, toolArgs, requestId } = {}) {
    const effectiveRequestId = normalizeRequestId(requestId) || this.requestIdFactory();
    try {
      return await this._request(
        PROTOCOL.executeRequestType,
        { toolName, toolArgs },
        { requestId: effectiveRequestId, kind: 'execute', toolName }
      );
    } catch (error) {
      if (error?.code === 'VCP_REQUEST_ID_CONFLICT') throw error;
      const known = publicRequestState(this.requestStates.get(effectiveRequestId));
      if (known) return known;
      throw error;
    }
  }

  getRequestStatus(requestId) {
    const normalizedRequestId = normalizeRequestId(requestId);
    const state = normalizedRequestId ? this.requestStates.get(normalizedRequestId) : null;
    return publicRequestState(state) || {
      request_id: normalizedRequestId,
      status: 'failed',
      progress: null,
      result: null,
      error: 'unknown_request_id'
    };
  }

  getStatus() {
    let pendingRequests = 0;
    for (const state of this.requestStates.values()) {
      if (state.kind === 'execute' && state.status === 'running') pendingRequests += 1;
    }
    return {
      connected: this.connected && this.socket?.readyState === 1,
      bridge_enabled: this.bridgeEnabled,
      protocol_ready: this.protocolReady,
      tools_discovered: this.toolsDiscovered,
      pending_requests: pendingRequests,
      last_error: this.lastError
    };
  }
}

module.exports = {
  PROTOCOL,
  VcpToolBridgeClient,
  VcpToolBridgeClientError,
  isPlainObject,
  normalizeRequestId
};
