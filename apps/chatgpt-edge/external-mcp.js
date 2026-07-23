'use strict';

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

const {
  DATA_TOOL_NAMES,
  RENDER_TOOL_NAMES,
  createPrincipalAssertion,
  createRequestEnvelope,
  digestObject,
  validateToolArguments,
  validateWidgetDto,
  reject
} = require('../../packages/chatgpt-r4-contracts');
const {
  MEMORY_SCOPE_WIDGET_HTML,
  widgetResource
} = require('../chatgpt-memory-scope-widget');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  candidateToolProfile,
  toolDescriptors
} = require('./candidate-tool-profile');

function createExternalMcpHandler({
  broker,
  issuer,
  audience,
  edgeSigning,
  clock = () => new Date(),
  requestTtlSeconds = 30,
  responseTimeoutMs = 30_000
} = {}) {
  if (!broker || typeof broker.submit !== 'function' || typeof broker.waitForResult !== 'function') {
    reject('edge_broker_invalid');
  }
  if (!edgeSigning || !edgeSigning.privateKey || typeof edgeSigning.keyId !== 'string') {
    reject('edge_signing_invalid');
  }
  if (!Number.isInteger(requestTtlSeconds) || requestTtlSeconds < 1 || requestTtlSeconds > 60) {
    reject('edge_request_ttl_invalid');
  }
  if (!Number.isInteger(responseTimeoutMs) || responseTimeoutMs < 10 || responseTimeoutMs > 60_000) {
    reject('edge_response_timeout_invalid');
  }
  if (responseTimeoutMs > requestTtlSeconds * 1000) {
    reject('edge_response_timeout_exceeds_request_ttl');
  }

  async function handle(incoming, outgoing, parsedBody, authInfo) {
    const server = createMcpProtocolServer({
      broker,
      issuer,
      audience,
      edgeSigning,
      clock,
      requestTtlSeconds,
      responseTimeoutMs
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });
    incoming.auth = authInfo;
    try {
      await server.connect(transport);
      await transport.handleRequest(incoming, outgoing, parsedBody);
    } finally {
      await transport.close().catch(() => {});
      await server.close().catch(() => {});
    }
  }

  return Object.freeze({ handle });
}

function createMcpProtocolServer({
  broker,
  issuer,
  audience,
  edgeSigning,
  clock,
  requestTtlSeconds,
  responseTimeoutMs
}) {
  const server = new Server({
    name: 'codex-memory-chatgpt-r4-edge',
    version: '0.1.0'
  }, {
    capabilities: {
      tools: {},
      resources: {}
    },
    instructions: MODEL_WORKFLOW_INSTRUCTIONS
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.entries(toolDescriptors).map(([name, descriptor]) => ({
      name,
      ...descriptor
    }))
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [{
      uri: widgetResource.uri,
      name: widgetResource.name,
      mimeType: widgetResource.mimeType,
      _meta: widgetResource._meta
    }]
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    if (request.params.uri !== widgetResource.uri) reject('edge_widget_resource_not_found');
    return {
      contents: [{
        uri: widgetResource.uri,
        mimeType: widgetResource.mimeType,
        text: MEMORY_SCOPE_WIDGET_HTML,
        _meta: widgetResource._meta
      }]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const name = request.params.name;
    const args = request.params.arguments || {};
    if (RENDER_TOOL_NAMES.includes(name)) return renderScopeTool(name, args);
    if (!DATA_TOOL_NAMES.includes(name)) reject('edge_tool_not_found');
    const authInfo = requireAuthInfo(extra.authInfo);
    validateToolArguments(name, args);
    const principalAssertion = createPrincipalAssertion({
      issuer,
      audience,
      subjectFingerprint: authInfo.extra.subjectFingerprint,
      scopes: authInfo.scopes,
      now: clock(),
      signing: edgeSigning
    });
    const envelope = createRequestEnvelope({
      principalAssertion,
      toolName: name,
      toolArguments: args,
      now: clock(),
      ttlSeconds: requestTtlSeconds,
      signing: edgeSigning
    });
    let response;
    try {
      await broker.submit(envelope);
      response = await broker.waitForResult(envelope.request_id, {
        signal: extra.signal,
        timeoutMs: responseTimeoutMs
      });
    } catch (error) {
      throw safeMcpError(error, 'edge_governed_read_unavailable');
    }
    const result = {
      content: [{
        type: 'text',
        text: modelVisibleResultText(name, response)
      }],
      structuredContent: response.structured_content,
      _meta: {
        'codex-memory/receiptChainDigest': digestObject(response.receipt_chain),
        'codex-memory/receiptPresentation': receiptPresentation(name, response),
        'codex-memory/counters': { ...response.counters }
      }
    };
    if (response.status !== 'ok') result.isError = true;
    return result;
  });

  return server;
}

function renderScopeTool(name, args) {
  if (name !== candidateToolProfile.renderTools[0] ||
      !args || typeof args !== 'object' || Array.isArray(args) ||
      Object.keys(args).length !== 1 || !Object.hasOwn(args, 'scope')) {
    reject('edge_render_arguments_invalid');
  }
  validateWidgetDto(args.scope);
  return {
    content: [{
      type: 'text',
      text: 'Memory scope status is ready. This display does not authorize or perform another memory read.'
    }],
    structuredContent: { scope: structuredClone(args.scope) }
  };
}

function requireAuthInfo(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !Array.isArray(value.scopes) || !value.scopes.includes('memory.read') ||
      !value.extra || typeof value.extra.subjectFingerprint !== 'string') {
    reject('edge_mcp_auth_context_missing');
  }
  return value;
}

function resultCount(content) {
  if (Number.isInteger(content?.result_count)) return content.result_count;
  if (Number.isInteger(content?.item_count)) return content.item_count;
  return content?.context_status === 'resolved' ? 1 : 0;
}

function modelVisibleResultText(name, response) {
  if (name === 'resolve_memory_context') {
    if (response.status === 'ok') {
      return 'Receipt-bound governed project context status: resolved. GOVERNED RESULT RECEIPT: bound. Project context reference: issued. Use it for exactly one read tool chosen by the user intent; do not resolve again.';
    }
    return `Receipt-bound governed resolve_memory_context returned ${response.status}; status: ${response.status}. TERMINAL GOVERNED RESULT. Result receipt: bound; project context reference: not issued. This is not a transport timeout or another transport failure. Answer now and call no codex-memory tool. Ask for one exact project_alias and one exact requested_visibility only when either was missing; do not retry alternative aliases or visibilities; do not retry the same value or probe alternative aliases or visibilities; never guess or use current/default.`;
  }
  if (response.status === 'ok') {
    const boundedStatus = response.structured_content?.status || 'completed';
    const candidateGuidance = name === 'search_memory' && boundedStatus === 'found'
      ? ' Search results are retrieval candidates, not proof by themselves; relevance 0.5 is low-confidence and inconclusive unless the returned summary explicitly supports the requested fact.'
      : '';
    return `Receipt-bound governed ${name} status: ${boundedStatus}; ${resultCount(response.structured_content)} item(s).${candidateGuidance} TERMINAL RECEIPT-BOUND GOVERNED READ: this is the terminal result for the current one-read workflow. Answer the user now and call no codex-memory tool again in this response, including render_memory_scope; do not call another memory read or resolve again; do not retry or switch read tools. Report exactly this one result and do not invent retries or attempts.`;
  }
  return `Receipt-bound governed ${name} status: ${response.status}. TERMINAL RECEIPT-BOUND GOVERNED READ: this is the terminal result for the current one-read workflow. This is not a transport timeout or another transport failure. Answer with exactly this bounded status and call no codex-memory tool again in this response, including render_memory_scope; do not call another memory read or resolve again; do not retry or switch read tools. Do not invent retries or attempts.`;
}

function modelVisibleErrorText(errorCode) {
  const safeErrorCode = typeof errorCode === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(errorCode)
    ? errorCode
    : 'edge_governed_read_unavailable';
  const category = transportFailureCategory(safeErrorCode);
  return `TERMINAL TRANSPORT FAILURE. Governed memory transport status: ${category} (${safeErrorCode}). No receipt-bound memory result was returned. This transport failure is terminal for the current one-read workflow. Answer now and call no codex-memory tool again in this response, including render_memory_scope; do not call another memory read or resolve again; do not retry or switch read tools. Do not describe it as an empty, denied, or unavailable memory result; do not invent retries; do not invent attempts.`;
}

function receiptPresentation(name, response) {
  const contextReferenceStatus = name === 'resolve_memory_context'
    ? (response.status === 'ok' ? 'issued' : 'not_issued')
    : 'not_applicable';
  return {
    result_receipt_status: 'bound',
    context_reference_status: contextReferenceStatus,
    raw_receipt_values_returned: false
  };
}

function transportFailureCategory(errorCode) {
  if (errorCode === 'edge_response_timeout') return 'transport_timeout';
  if (errorCode === 'edge_request_expired' || errorCode === 'edge_claim_expired') {
    return 'transport_expired';
  }
  if (errorCode === 'edge_request_cancelled') return 'transport_cancelled';
  return 'transport_unavailable';
}

function safeMcpError(error, fallback) {
  const code = typeof error?.code === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(error.code)
    ? error.code
    : fallback;
  return Object.assign(new Error(modelVisibleErrorText(code)), { code });
}

module.exports = {
  createExternalMcpHandler,
  createMcpProtocolServer,
  modelVisibleErrorText,
  modelVisibleResultText,
  receiptPresentation,
  renderScopeTool,
  requireAuthInfo,
  transportFailureCategory
};
