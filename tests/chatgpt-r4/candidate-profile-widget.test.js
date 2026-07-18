'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DATA_TOOL_NAMES,
  PROJECT_CONTEXT_REF_PATTERN_SOURCE,
  RENDER_TOOL_NAMES,
  WIDGET_RESOURCE_URI
} = require('../../packages/chatgpt-r4-contracts');
const { candidateToolProfile } = require('../../apps/chatgpt-edge');
const {
  buildResolveContextCall,
  createMemoryScopeDto,
  parseToolResultNotification,
  widgetResource
} = require('../../apps/chatgpt-memory-scope-widget');

test('R4-B candidate profile is non-default, non-activated, read-only, and has no write/proposal tools', () => {
  assert.equal(candidateToolProfile.default, false);
  assert.equal(candidateToolProfile.activated, false);
  assert.equal(candidateToolProfile.publicToolSurfaceExpanded, false);
  assert.deepEqual(candidateToolProfile.dataTools, DATA_TOOL_NAMES);
  assert.deepEqual(candidateToolProfile.renderTools, RENDER_TOOL_NAMES);
  assert.deepEqual(candidateToolProfile.writeTools, []);
  assert.deepEqual(candidateToolProfile.proposalTools, []);
  for (const [name, descriptor] of Object.entries(candidateToolProfile.toolDescriptors)) {
    assert.match(descriptor.description, /^Use this when/u, name);
    assert.deepEqual(descriptor.annotations, {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: name === 'render_memory_scope'
    });
    assert.ok(descriptor.outputSchema, `${name} output schema`);
    assert.deepEqual(descriptor._meta.securitySchemes, descriptor.securitySchemes);
    if (name === 'render_memory_scope') {
      assert.equal(descriptor._meta.ui.resourceUri, WIDGET_RESOURCE_URI);
    } else {
      assert.equal(descriptor._meta.ui, undefined);
    }
  }
  for (const name of ['memory_overview', 'search_memory', 'audit_memory', 'prepare_memory_context']) {
    assert.equal(
      candidateToolProfile.toolDescriptors[name].inputSchema.properties.project_context_ref.pattern,
      PROJECT_CONTEXT_REF_PATTERN_SOURCE
    );
  }
  assert.deepEqual(
    candidateToolProfile.toolDescriptors.resolve_memory_context.outputSchema.oneOf.map(
      variant => variant.properties.context_status.const
    ),
    ['resolved', 'denied', 'unavailable']
  );
});

test('widget resource uses MCP Apps MIME, empty CSP domains, and no authorization authority', () => {
  assert.equal(widgetResource.uri, WIDGET_RESOURCE_URI);
  assert.equal(widgetResource.mimeType, 'text/html;profile=mcp-app');
  assert.deepEqual(widgetResource._meta.ui.csp, { connectDomains: [], resourceDomains: [] });
  assert.match(widgetResource._meta['openai/widgetDescription'], /never displays raw memory/u);
});

test('widget DTO renders only safe scope status and bridge uses tools/call', () => {
  const dto = createMemoryScopeDto({
    safeProjectAlias: 'project-alpha',
    contextStatus: 'resolved',
    expiresAt: '2026-07-18T00:05:00.000Z',
    visibilityLabels: ['project', 'workspace'],
    receiptStatus: 'bound'
  });
  const parsed = parseToolResultNotification({
    jsonrpc: '2.0',
    method: 'ui/notifications/tool-result',
    params: { structuredContent: { scope: dto } }
  });
  assert.deepEqual(parsed, dto);
  assert.deepEqual(buildResolveContextCall({
    id: 1,
    projectAlias: 'project-alpha',
    requestedVisibility: 'project'
  }), {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'resolve_memory_context',
      arguments: { project_alias: 'project-alpha', requested_visibility: 'project' }
    }
  });
  assert.throws(() => createMemoryScopeDto({
    safeProjectAlias: 'project-alpha',
    contextStatus: 'resolved',
    expiresAt: '2026-07-18T00:05:00.000Z',
    visibilityLabels: ['private'],
    receiptStatus: 'bound'
  }), { code: 'widget_visibility_labels_invalid' });
  for (const invalidResolved of [
    { expiresAt: null, visibilityLabels: ['project'], receiptStatus: 'bound', code: 'widget_expiry_invalid' },
    { expiresAt: '2026-07-18T00:05:00.000Z', visibilityLabels: [], receiptStatus: 'bound', code: 'widget_visibility_labels_invalid' },
    { expiresAt: '2026-07-18T00:05:00.000Z', visibilityLabels: ['project'], receiptStatus: 'not_available', code: 'widget_receipt_status_invalid' }
  ]) {
    assert.throws(() => createMemoryScopeDto({
      safeProjectAlias: 'project-alpha',
      contextStatus: 'resolved',
      expiresAt: invalidResolved.expiresAt,
      visibilityLabels: invalidResolved.visibilityLabels,
      receiptStatus: invalidResolved.receiptStatus
    }), { code: invalidResolved.code });
  }
  for (const nonResolved of [
    { contextStatus: 'missing', expiresAt: null, receiptStatus: 'not_available' },
    { contextStatus: 'denied', expiresAt: null, receiptStatus: 'invalid' },
    { contextStatus: 'expired', expiresAt: '2026-07-18T00:05:00.000Z', receiptStatus: 'invalid' }
  ]) {
    assert.doesNotThrow(() => createMemoryScopeDto({
      safeProjectAlias: 'project-alpha',
      contextStatus: nonResolved.contextStatus,
      expiresAt: nonResolved.expiresAt,
      visibilityLabels: [],
      receiptStatus: nonResolved.receiptStatus
    }));
  }
  assert.throws(() => createMemoryScopeDto({
    safeProjectAlias: 'project-alpha',
    contextStatus: 'denied',
    expiresAt: null,
    visibilityLabels: ['project'],
    receiptStatus: 'invalid'
  }), { code: 'widget_visibility_labels_invalid' });
  assert.throws(() => createMemoryScopeDto({
    safeProjectAlias: 'project-alpha',
    contextStatus: 'expired',
    expiresAt: null,
    visibilityLabels: [],
    receiptStatus: 'invalid'
  }), { code: 'widget_expiry_invalid' });
  assert.throws(() => createMemoryScopeDto({
    safeProjectAlias: 'project-alpha',
    contextStatus: 'missing',
    expiresAt: null,
    visibilityLabels: [],
    receiptStatus: 'bound'
  }), { code: 'widget_receipt_status_invalid' });
  for (const safeProjectAlias of ['project alpha', '<project>', 'project/alpha']) {
    assert.throws(() => createMemoryScopeDto({
      safeProjectAlias,
      contextStatus: 'resolved',
      expiresAt: '2026-07-18T00:05:00.000Z',
      visibilityLabels: ['project'],
      receiptStatus: 'bound'
    }), { code: 'widget_project_alias_invalid' });
  }
  assert.throws(() => parseToolResultNotification({
    jsonrpc: '2.0',
    method: 'ui/notifications/tool-result',
    params: { structuredContent: { scope: { ...dto, safe_project_alias: 'project alpha' } } }
  }), { code: 'widget_project_alias_invalid' });
});
