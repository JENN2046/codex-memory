'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CHATGPT_EDGE_DATA_SCHEMA_VERSION,
  GOVERNED_READ_ATTEMPT_READ_TOOLS,
  appendGovernedReadAttemptStage,
  createAttemptHeader,
  createChatGptEdgeDataResponseV2,
  createGovernedReadAttemptProtocol,
  createGovernedReadFailureLegacyContent,
  createStageReceipt,
  createTerminalEnvelope,
  digestObject,
  validateToolStructuredContent
} = require('../../packages/chatgpt-r4-contracts');
const {
  toolDescriptors
} = require('../../apps/chatgpt-edge');

const NOW = new Date('2026-07-31T00:00:00.000Z');
const INPUT_SCHEMA_DIGESTS = Object.freeze({
  resolve_memory_context:
    'sha256:4b1d17734e4475ea3ef8a9c36b15dc9909d316462567b2963735360bc5716590',
  memory_overview:
    'sha256:c628addc376ede1b087428dc855fb7ab2254b87b15c4e50e77a5530f7548e56c',
  search_memory:
    'sha256:66df29a1fefe9dd0b7a07df63d9c85ffff6973e78b39197815d3da29f980b437',
  audit_memory:
    'sha256:a93f2adfa2b15ed27dd8a6c31bfb602f798b7b0f2c30efb4519985e9d8c408ea',
  prepare_memory_context:
    'sha256:a9b75deef756b6f2b9eeb1bce2913abc7fa486fcbfdfb44aae60274e2e594b3a',
  render_memory_scope:
    'sha256:d1eb449243b47275afbd6e5e0a9c73b18ae0b4fec1bd5fd8bdc5257ddc4edce5'
});

function successProtocol(toolName, suffix) {
  const header = createAttemptHeader({
    attemptRef: `grat_${suffix.repeat(32)}`,
    toolName,
    requestDigest: digestObject(`request-${suffix}`),
    contextBindingDigest: digestObject(`context-${suffix}`),
    now: NOW
  });
  let workingSet = { header, receipts: [] };
  for (const stage of [
    'CREATED',
    'EDGE_VALIDATED',
    'RELAY_CLAIMED',
    'AUTHORIZED',
    'BRIDGE_DELEGATED',
    'NATIVE_DISPATCHED',
    'SOURCE_PREFLIGHT',
    'PROVIDER_EMBEDDING',
    'HYDRATION',
    'INDEX_RECOVERY',
    'VECTOR_SEARCH',
    'SCOPE_POSTCHECK',
    'RESPONSE_FINALIZATION'
  ]) {
    const counterFacts = {
      BRIDGE_DELEGATED: {
        fallback: { attempts: 0 }
      },
      NATIVE_DISPATCHED: {
        native_invocation: { started: 1 },
        primary_memory: {
          write_attempts: 0,
          writes_committed: 0
        }
      },
      PROVIDER_EMBEDDING: {
        provider: {
          started: 1,
          succeeded: 1,
          failed: 0
        }
      },
      HYDRATION: {
        derived_transaction: {
          started: 1,
          committed: 1,
          rolled_back: 0
        }
      },
      VECTOR_SEARCH: {
        native_invocation: {
          succeeded: 1,
          failed: 0
        }
      }
    }[stage] || {};
    workingSet = appendGovernedReadAttemptStage(workingSet, {
      stage,
      counterFacts
    });
  }
  const terminal = createTerminalEnvelope({
    header,
    receipts: workingSet.receipts,
    outcome: 'success',
    evidenceComplete: true
  });
  return createGovernedReadAttemptProtocol({
    header,
    receipts: workingSet.receipts,
    terminal
  });
}

function governanceFailureProtocol() {
  const header = createAttemptHeader({
    attemptRef: `grat_${'f'.repeat(32)}`,
    toolName: 'search_memory',
    requestDigest: digestObject('failure-request'),
    contextBindingDigest: digestObject('failure-context'),
    now: NOW
  });
  const receipts = [];
  for (const stage of [
    'CREATED',
    'EDGE_VALIDATED',
    'RELAY_CLAIMED'
  ]) {
    receipts.push(createStageReceipt({ header, receipts, stage }));
  }
  receipts.push(createStageReceipt({
    header,
    receipts,
    stage: 'AUTHORIZED',
    outcome: 'failed',
    reasonCode: 'governance_denied',
    counterFacts: {
      provider: {
        started: 0,
        succeeded: 0,
        failed: 0
      },
      native_invocation: {
        started: 0,
        succeeded: 0,
        failed: 0
      }
    }
  }));
  const terminal = createTerminalEnvelope({
    header,
    receipts,
    outcome: 'failure',
    reasonCode: 'governance_denied',
    evidenceComplete: false,
    failureOrigin: 'governance'
  });
  return createGovernedReadAttemptProtocol({
    header,
    receipts,
    terminal
  });
}

function successContent(toolName) {
  if (toolName === 'search_memory') {
    return {
      status: 'empty',
      result_count: 0,
      results: []
    };
  }
  return {
    status: 'empty',
    kind: {
      memory_overview: 'overview',
      audit_memory: 'audit',
      prepare_memory_context: 'context'
    }[toolName],
    item_count: 0
  };
}

test('data response v2 keeps resolve outside attempts and binds every read', () => {
  assert.deepEqual(
    Object.keys(toolDescriptors),
    Object.keys(INPUT_SCHEMA_DIGESTS)
  );
  for (const [toolName, descriptor] of Object.entries(toolDescriptors)) {
    assert.equal(
      digestObject(descriptor.inputSchema),
      INPUT_SCHEMA_DIGESTS[toolName],
      toolName
    );
  }
  const resolved = createChatGptEdgeDataResponseV2({
    toolName: 'resolve_memory_context',
    structuredContent: {
      project_context_ref: `pctx_${'r'.repeat(32)}`,
      safe_project_alias: 'project-alpha',
      expires_at: '2026-07-31T00:01:00.000Z',
      visibility_labels: ['project'],
      context_status: 'resolved'
    }
  });
  assert.equal(
    resolved.schema_version,
    CHATGPT_EDGE_DATA_SCHEMA_VERSION
  );
  assert.equal(Object.hasOwn(resolved, 'attempt'), false);
  assert.doesNotThrow(() => validateToolStructuredContent(
    'resolve_memory_context',
    resolved
  ));
  assert.throws(() => createChatGptEdgeDataResponseV2({
    toolName: 'resolve_memory_context',
    structuredContent: { context_status: 'denied' },
    governedReadAttempt: successProtocol('memory_overview', 'z')
  }), { code: 'edge_data_response_attempt_forbidden' });
  assert.throws(() => createChatGptEdgeDataResponseV2({
    toolName: 'resolve_memory_context',
    structuredContent: {
      schema_version: 1,
      context_status: 'denied'
    }
  }), { code: 'response_structured_content_shape_invalid' });

  GOVERNED_READ_ATTEMPT_READ_TOOLS.forEach((toolName, index) => {
    const protocol = successProtocol(
      toolName,
      String.fromCharCode(97 + index)
    );
    const content = createChatGptEdgeDataResponseV2({
      toolName,
      structuredContent: successContent(toolName),
      governedReadAttempt: protocol
    });
    assert.equal(content.schema_version, 2);
    assert.equal(content.attempt.protocol, 'governed_read_attempt.v1');
    assert.equal(content.attempt.outcome, 'success');
    assert.equal(content.attempt.reason_code, null);
    assert.equal(content.attempt.evidence_complete, true);
    assert.deepEqual(content.attempt.counters.provider, {
      started: 1,
      succeeded: 1,
      failed: 0
    });
    assert.doesNotThrow(() =>
      validateToolStructuredContent(toolName, content)
    );
  });
  assert.throws(() => createChatGptEdgeDataResponseV2({
    toolName: 'search_memory',
    structuredContent: {
      ...successContent('search_memory'),
      attempt: {}
    },
    governedReadAttempt: successProtocol('search_memory', 'y')
  }), { code: 'response_structured_content_shape_invalid' });
});

test('failure v2 preserves unknown evidence and rejects contradictory projections', () => {
  const protocol = governanceFailureProtocol();
  const content = createChatGptEdgeDataResponseV2({
    toolName: 'search_memory',
    structuredContent: createGovernedReadFailureLegacyContent(
      'search_memory',
      protocol.terminal
    ),
    governedReadAttempt: protocol
  });
  assert.equal(content.status, 'denied');
  assert.equal(content.attempt.outcome, 'failure');
  assert.equal(content.attempt.failed_stage, 'AUTHORIZED');
  assert.equal(content.attempt.reason_code, 'governance_denied');
  assert.equal(content.attempt.failure_category, 'authorization');
  assert.equal(
    content.attempt.counters.primary_memory.write_attempts,
    null
  );
  assert.doesNotThrow(() => validateToolStructuredContent(
    'search_memory',
    content,
    { status: 'denied' }
  ));

  const contradictory = structuredClone(content);
  contradictory.attempt.counters.provider.failed = 1;
  assert.throws(() => validateToolStructuredContent(
    'search_memory',
    contradictory,
    { status: 'denied' }
  ), { code: 'attempt_counter_reconciliation_invalid' });

  const wrongCategory = structuredClone(content);
  wrongCategory.attempt.failure_category = 'provider';
  assert.throws(() => validateToolStructuredContent(
    'search_memory',
    wrongCategory,
    { status: 'denied' }
  ), { code: 'attempt_public_projection_invalid' });

  const unknownReason = structuredClone(content);
  unknownReason.attempt.reason_code = 'unknown_failure';
  assert.throws(() => validateToolStructuredContent(
    'search_memory',
    unknownReason,
    { status: 'denied' }
  ), { code: 'attempt_reason_unknown' });
});

test('data response v2 rejects legacy output and attempt/status disagreement', () => {
  assert.throws(() => validateToolStructuredContent(
    'memory_overview',
    { status: 'empty', kind: 'overview', item_count: 0 }
  ), { code: 'response_data_schema_version_invalid' });

  const protocol = successProtocol('memory_overview', 's');
  const content = createChatGptEdgeDataResponseV2({
    toolName: 'memory_overview',
    structuredContent: successContent('memory_overview'),
    governedReadAttempt: protocol
  });
  assert.throws(() => validateToolStructuredContent(
    'memory_overview',
    content,
    { status: 'unavailable' }
  ), { code: 'response_attempt_status_mismatch' });
});
