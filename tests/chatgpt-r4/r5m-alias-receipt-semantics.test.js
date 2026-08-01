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

const EXPECTED_PUBLIC_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context: 'sha256:5e978d8e56d53de05c048bd1273a028ffccc75779916ad9858e86743b4bb8fe5',
  memory_overview: 'sha256:e4d89bb2c92a82465ecf77bc041a6a07d14eff7fcc1be34441cf39da78adf893',
  search_memory: 'sha256:fe367042ee3029f616e4f5f96df560f1d51be4fbc568aab69fb787711a479c05',
  audit_memory: 'sha256:a30070847cee6b1b17fb10fbd74f117d013f65516a933de8d1e034cf69e61414',
  prepare_memory_context: 'sha256:8e480e2edbca8513015a35e0152455ccdb0ce277eba7e318e7a7b9a9588e5bdf',
  render_memory_scope: 'sha256:07308f75e3ed7ecc950bf97c0496a598a0582194527d43a1df093223bc626a1a'
});

test('R5-M accepts an explicitly labelled alias even when it resembles the App or repository name', () => {
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /explicitly labelled project_alias and requested_visibility/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /unlabelled App or repository names as absent; a labelled alias may match those names/u
  );
  assert.match(
    MODEL_WORKFLOW_INSTRUCTIONS,
    /current, default, this project/u
  );
  assert.match(
    toolDescriptors.resolve_memory_context.description,
    /Copy both values exactly and call once/u
  );
});

test('current profile keeps six tool names and matches the R5-O schema digests', () => {
  assert.deepEqual(Object.keys(toolDescriptors), Object.keys(EXPECTED_PUBLIC_SCHEMA_DIGESTS));
  for (const [name, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(digestObject({
      inputSchema: descriptor.inputSchema,
      outputSchema: descriptor.outputSchema
    }), EXPECTED_PUBLIC_SCHEMA_DIGESTS[name], name);
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
  assert.match(text, /workflow is consumed/u);
  assert.match(text, /Never infer or report the status or availability of an uncalled tool/u);
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
