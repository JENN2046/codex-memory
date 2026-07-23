'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  digestObject,
  sha256
} = require('../../packages/chatgpt-r4-contracts');
const {
  MODEL_WORKFLOW_INSTRUCTIONS,
  modelVisibleResultText,
  toolDescriptors
} = require('../../apps/chatgpt-edge');
const {
  MEMORY_SCOPE_WIDGET_HTML,
  parseToolResultNotification,
  receiptPresentationFromMetadata,
  receiptPresentationFromToolResult,
  structuredContentFromToolResult
} = require('../../apps/chatgpt-memory-scope-widget');
const {
  createContextAuthority,
  createSessionReadActivationController,
  searchProjection
} = require('../../src/adapters/chatgpt-r4');

const PUBLIC_SCHEMA_DIGESTS_FROM_R5K_MAIN = Object.freeze({
  resolve_memory_context: 'sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6',
  memory_overview: 'sha256:a9314eb1604641ae76d95132bf73ed28c3136afe5c9a8352fb2474b695f372d1',
  search_memory: 'sha256:c301306bf253377183d8dc4d660dd09d527db4c361d8aba96137c72234f8f324',
  audit_memory: 'sha256:498956aa48b7e2c8ef30c2e1dd622fbc7df0c359786bcfc74b958d37ea2eab9f',
  prepare_memory_context: 'sha256:7c190bbeda945a6cfad8726d0705f4f723b1103867e3c9605b2180a502d2b99c',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-M accepts an explicitly labelled alias even when it resembles the App or repository name', () => {
  const leading = MODEL_WORKFLOW_INSTRUCTIONS.slice(0, 512);
  assert.match(leading, /explicitly labels a value as project_alias, copy it verbatim/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /An unlabelled App display name.+is not a project_alias/u);
  assert.match(MODEL_WORKFLOW_INSTRUCTIONS, /Never use current, default, this-project/u);
  assert.match(
    toolDescriptors.resolve_memory_context.description,
    /explicitly labels a value as project_alias, accept it verbatim/u
  );
  assert.match(
    toolDescriptors.resolve_memory_context.description,
    /An unlabelled App name, connector name/u
  );
});

test('R5-M keeps all six public tool names and exact input/output schemas frozen', () => {
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(PUBLIC_SCHEMA_DIGESTS_FROM_R5K_MAIN));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), PUBLIC_SCHEMA_DIGESTS_FROM_R5K_MAIN[name], name);
  }
});

test('R5-M classifies an active exact-scope authorization mismatch as denied, not unavailable', async () => {
  const principalFingerprint = sha256('r5m-single-operator');
  const controller = createSessionReadActivationController({
    expectedPrincipalFingerprint: principalFingerprint,
    selectedProjectAlias: 'codex-memory'
  });
  controller.activate({
    requestId: 'op_r5m_scope_classification_000001',
    requestedVisibility: 'project',
    ttlSeconds: 60
  });

  for (const input of [
    {
      principalFingerprint,
      safeProjectAlias: 'codex-memory',
      requestedVisibility: 'workspace'
    },
    {
      principalFingerprint,
      safeProjectAlias: 'another-project',
      requestedVisibility: 'project'
    },
    {
      principalFingerprint: sha256('r5m-other-operator'),
      safeProjectAlias: 'codex-memory',
      requestedVisibility: 'project'
    }
  ]) {
    const result = controller.checkContextIssueAuthorization(input);
    assert.equal(result.accepted, false);
    assert.equal(result.status, 'active');
    assert.equal(result.governed_status, 'denied');
  }

  const pair = crypto.generateKeyPairSync('ed25519');
  const authority = createContextAuthority({
    registryState: {
      accepted: true,
      registry: {
        projects: [{ safeProjectAlias: 'codex-memory', projectId: 'codex-memory' }]
      }
    },
    mappingState: { accepted: true },
    selectedProjectAlias: 'codex-memory',
    signing: { privateKey: pair.privateKey, keyId: 'r5m-context-key' },
    activationController: {
      checkContextIssueAuthorization() {
        return {
          accepted: false,
          status: 'active',
          governed_status: 'denied',
          receipt_digest: `sha256:${'a'.repeat(64)}`
        };
      },
      authorizeContextIssue() {},
      bindContext() {},
      checkReadAuthorization() {}
    }
  });
  assert.deepEqual(await authority.issue({
    principalFingerprint,
    safeProjectAlias: 'codex-memory',
    requestedVisibility: 'workspace',
    now: new Date('2026-07-23T08:00:00.000Z')
  }), {
    status: 'denied',
    activation_receipt_digest: `sha256:${'a'.repeat(64)}`
  });
});

test('R5-M excludes unscored and below-floor candidates instead of fabricating relevance 0.5', () => {
  const projection = {
    memoryContextProjection: {
      lowDisclosure: true,
      statement: 'Bounded retrieval candidate.'
    }
  };
  for (const score of [undefined, null, '0.9', Number.NaN, 0.49]) {
    const item = score === undefined ? projection : { ...projection, score };
    assert.deepEqual(searchProjection({ results: [item] }, 'pctx_r5m'), {
      status: 'empty',
      result_count: 0,
      results: []
    });
  }
  const boundary = searchProjection({
    results: [{ ...projection, score: 0.5 }]
  }, 'pctx_r5m');
  assert.equal(boundary.status, 'found');
  assert.equal(boundary.results[0].relevance, 0.5);

  const text = modelVisibleResultText('search_memory', {
    status: 'ok',
    structured_content: boundary
  });
  assert.match(text, /retrieval candidates, not proof/u);
  assert.match(text, /relevance 0\.5 is low-confidence and inconclusive/u);
  assert.match(text, /TERMINAL RECEIPT-BOUND GOVERNED READ/u);
});

test('R5-M unwraps canonical ChatGPT result envelopes for Widget data and receipt metadata', () => {
  const dto = {
    schema_version: 1,
    safe_project_alias: 'codex-memory',
    context_status: 'resolved',
    expires_at: '2026-07-23T08:05:00.000Z',
    visibility_labels: ['project'],
    receipt_status: 'bound'
  };
  const presentation = {
    result_receipt_status: 'bound',
    context_reference_status: 'issued',
    raw_receipt_values_returned: false
  };
  const envelope = {
    status: 'completed',
    call_tool_result: {
      result: {
        mcp_tool_result: {
          structuredContent: { scope: dto },
          _meta: { 'codex-memory/receiptPresentation': presentation }
        }
      }
    }
  };

  assert.deepEqual(structuredContentFromToolResult(envelope), { scope: dto });
  assert.equal(receiptPresentationFromMetadata(envelope), presentation);
  assert.equal(receiptPresentationFromToolResult(
    { structuredContent: { scope: dto } },
    { 'codex-memory/receiptPresentation': presentation }
  ), presentation);
  assert.deepEqual(parseToolResultNotification({
    jsonrpc: '2.0',
    method: 'ui/notifications/tool-result',
    params: envelope
  }), dto);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /Waiting for governed result/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /fallbackMetadata/u);
  assert.match(MEMORY_SCOPE_WIDGET_HTML, /structuredContentFromToolResult/u);
  assert.doesNotMatch(MEMORY_SCOPE_WIDGET_HTML, /<dd id="status">Missing<\/dd>/u);
});
