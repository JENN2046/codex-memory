'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  COUNTER_MODES,
  InMemoryReplayGuard,
  ZERO_MEMORY_COUNTERS,
  createPrincipalAssertion,
  createRequestEnvelope,
  createResponseEnvelope,
  digestObject,
  validateRequestEnvelope,
  validateResponseEnvelope
} = require('../../packages/chatgpt-r4-contracts');
const {
  createTransientRequestBroker,
  normalizeBrokerResult
} = require('../../apps/chatgpt-edge');
const {
  createRelayProcessor,
  createGovernedContextResolutionObserver
} = require('../../apps/local-recall-relay');
const {
  createContextAuthority,
  createGovernanceAdapter,
  createGovernedReadV2Runtime,
  validateProjectRegistry
} = require('../../src/adapters/chatgpt-r4');
const {
  loadDiaryScopeMapping
} = require('../../src/core/DiaryScopeMappingLoader');
const {
  resolveRead
} = require('../../src/core/DiaryScopeMapping');

const NOW = new Date('2026-07-31T10:00:00.000Z');
const ISSUER = 'https://issuer.context-resolution.example/';
const AUDIENCE = 'https://edge.context-resolution.example/mcp';
const PROJECT_ALIAS = 'codex-memory';

function identity(keyId) {
  const pair = crypto.generateKeyPairSync('ed25519');
  return Object.freeze({
    keyId,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey
  });
}

function signing(value) {
  return Object.freeze({
    keyId: value.keyId,
    privateKey: value.privateKey
  });
}

function mapping() {
  return {
    schemaVersion: 1,
    mappingReference: 'jenn-vcp-diary-scope-v1',
    defaultPolicy: 'deny',
    entries: [{
      partitionReference: 'synthetic-context-resolution-partition',
      diaryName: 'Synthetic-Context-Resolution',
      classification: 'project_shared',
      clientId: null,
      projectId: 'synthetic-context-resolution-project',
      workspaceId: 'synthetic-context-resolution-workspace',
      readProfiles: ['exact_visibility'],
      writeEligible: true
    }]
  };
}

function registry(mappingState) {
  return {
    schemaVersion: 1,
    registryReference: 'synthetic-context-resolution-registry-v1',
    mappingReference: mappingState.mappingReference,
    mappingDigest: mappingState.mappingDigest,
    defaultPolicy: 'deny',
    projects: [{
      safeProjectAlias: PROJECT_ALIAS,
      projectId: 'synthetic-context-resolution-project',
      workspaceId: 'synthetic-context-resolution-workspace',
      allowedVisibilities: ['project']
    }]
  };
}

function createCharacterizationFixture({
  issueOutcome = 'production',
  responseFinalizationHook
} = {}) {
  const edge = identity('gcr-characterization-edge');
  const relayIdentity = identity('gcr-characterization-relay');
  const context = identity('gcr-characterization-context');
  const principal = createPrincipalAssertion({
    issuer: ISSUER,
    audience: AUDIENCE,
    subjectFingerprint: digestObject('gcr-characterization-principal'),
    now: NOW,
    nonce: 'gcr_characterization_principal_nonce_01',
    signing: signing(edge)
  });
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const registryState = validateProjectRegistry(
    registry(mappingState),
    mappingState,
    { resolveDiaryRead: resolveRead }
  );
  const observations = {
    relay_calls: 0,
    governance_calls: 0,
    bridge_calls: 0,
    last_terminal_reason: null,
    last_terminal: null
  };
  const resolutionObserver = createGovernedContextResolutionObserver({
    clock: () => NOW
  });
  const resolveEdgeKey = keyId =>
    keyId === edge.keyId ? edge.publicKey : null;
  const resolvePrincipalKey = candidate =>
    candidate?.issuer === ISSUER && candidate?.key_id === edge.keyId
      ? edge.publicKey
      : null;
  const resolveRelayKey = keyId =>
    keyId === relayIdentity.keyId ? relayIdentity.publicKey : null;
  const verifyResponse = (response, request) =>
    validateResponseEnvelope(response, {
      now: NOW,
      resolveResponsePublicKey: resolveRelayKey,
      expectedRequest: request,
      counterMode: COUNTER_MODES.governedLiveReadV1
    });

  let governance;
  let runtime = null;
  if (issueOutcome === 'production') {
    runtime = createGovernedReadV2Runtime({
      expectedIssuer: ISSUER,
      expectedAudience: AUDIENCE,
      resolveRequestPublicKey: resolveEdgeKey,
      resolvePrincipalPublicKey: resolvePrincipalKey,
      registryState,
      mappingState,
      selectedProjectAlias: PROJECT_ALIAS,
      resolveDiaryRead: resolveRead,
      contextSigning: signing(context),
      counterMode: COUNTER_MODES.governedLiveReadV1,
      clock: () => NOW,
      async invokeBridge() {
        observations.bridge_calls += 1;
        throw Object.assign(new Error('resolver_reached_read_bridge'), {
          code: 'resolver_reached_read_bridge'
        });
      }
    });
    governance = runtime;
  } else {
    const issueProjectContext = async ({ onResolutionStage }) => {
      if (issueOutcome === 'failure_before_resolution') {
        throw Object.assign(new Error('synthetic_context_issuer_preflight_failed'), {
          code: 'synthetic_context_issuer_preflight_failed'
        });
      }
      onResolutionStage?.('REGISTRY_RESOLVED');
      onResolutionStage?.('SCOPE_RESOLVED');
      if (issueOutcome === 'unavailable') {
        return { status: 'unavailable' };
      }
      if (issueOutcome === 'issuance_denied') {
        return {
          status: 'denied',
          resolution_reason: 'context_issuance_denied'
        };
      }
      if (issueOutcome === 'invalid') return null;
      throw Object.assign(new Error('synthetic_context_issuance_failed'), {
        code: 'synthetic_context_issuance_failed'
      });
    };
    governance = createGovernanceAdapter({
      expectedIssuer: ISSUER,
      expectedAudience: AUDIENCE,
      resolveRequestPublicKey: resolveEdgeKey,
      resolvePrincipalPublicKey: resolvePrincipalKey,
      resolveContextPublicKey: keyId =>
        keyId === context.keyId ? context.publicKey : null,
      issueProjectContext,
      async resolveProjectContext() {
        throw new Error('resolver_only_fixture_must_not_resolve_context');
      },
      contextReplayGuard: new InMemoryReplayGuard({ clock: () => NOW }),
      async invokeGovernance() {
        observations.bridge_calls += 1;
        throw new Error('resolver_only_fixture_must_not_invoke_read');
      },
      clock: () => NOW
    });
  }

  const relay = createRelayProcessor({
    expectedIssuer: ISSUER,
    expectedAudience: AUDIENCE,
    resolveRequestPublicKey: resolveEdgeKey,
    resolvePrincipalPublicKey: resolvePrincipalKey,
    requestReplayGuard: new InMemoryReplayGuard({ clock: () => NOW }),
    responseSigning: signing(relayIdentity),
    counterMode: COUNTER_MODES.governedLiveReadV1,
    clock: () => NOW,
    governedContextResolutions: true,
    governedContextResolutionStageHooks:
      responseFinalizationHook === undefined
        ? undefined
        : { RESPONSE_FINALIZED: responseFinalizationHook },
    async forwardToUds(payload) {
      observations.governance_calls += 1;
      return governance.handle(payload);
    }
  });
  const broker = createTransientRequestBroker({
    verifyRequest(request) {
      return validateRequestEnvelope(request, {
        now: NOW,
        resolveRequestPublicKey: resolveEdgeKey,
        resolvePrincipalPublicKey: resolvePrincipalKey,
        expectedIssuer: ISSUER,
        expectedAudience: AUDIENCE,
        consumeReplay: false
      });
    },
    verifyResponse,
    clock: () => NOW,
    eventComponent: 'gcr_characterization_edge',
    contextResolutionEventSink: event => resolutionObserver.observe(event)
  });
  let sequence = 0;

  function request(projectAlias, requestedVisibility) {
    sequence += 1;
    return createRequestEnvelope({
      principalAssertion: principal,
      toolName: 'resolve_memory_context',
      toolArguments: {
        project_alias: projectAlias,
        requested_visibility: requestedVisibility
      },
      now: NOW,
      requestId: `req_gcr_characterization_${String(sequence).padStart(8, '0')}`,
      nonce: `gcr_characterization_request_nonce_${String(sequence).padStart(8, '0')}`,
      signing: signing(edge)
    });
  }

  async function resolve({
    projectAlias = PROJECT_ALIAS,
    requestedVisibility = 'project',
    transformResponse = value => value
  } = {}) {
    const signedRequest = request(projectAlias, requestedVisibility);
    await broker.submit(signedRequest);
    const claim = broker.claim('gcr-characterization-relay');
    assert.ok(claim);
    broker.acknowledge(claim.request_id, claim.claim_token);
    observations.relay_calls += 1;
    const relayResult = await relay.handle(claim.request, {
      governedContextResolution: claim.governed_context_resolution
    });
    if (relayResult.governed_context_resolution_failure_candidate) {
      observations.last_terminal_reason =
        relayResult.governed_context_resolution_failure_candidate
          .terminal.reason_code;
      observations.last_terminal =
        relayResult.governed_context_resolution_failure_candidate.terminal;
      broker.fail(
        claim.request_id,
        claim.claim_token,
        relayResult.governed_context_resolution_failure_candidate,
        relayResult.error_code
      );
      return broker.waitForResult(signedRequest.request_id, {
        timeoutMs: 100
      });
    }
    const relayResponse = relayResult.response;
    const response = transformResponse(relayResponse, {
      request: signedRequest
    });
    await broker.complete(
      claim.request_id,
      claim.claim_token,
      response,
      null,
      relayResult.governed_context_resolution_candidate
    );
    const brokerResult = await broker.waitForResult(signedRequest.request_id, {
      timeoutMs: 100
    });
    const publicResult = normalize(signedRequest, brokerResult);
    return Object.freeze({
      request: signedRequest,
      response: publicResult,
      terminal: relayResult.governed_context_resolution_candidate.terminal
    });
  }

  function resign(response, structuredContent, suffix, responseNow = NOW) {
    return createResponseEnvelope({
      requestId: response.request_id,
      requestDigest: response.request_digest,
      toolName: response.tool_name,
      status: response.status,
      structuredContent,
      counters: response.counters,
      receiptChain: response.receipt_chain,
      now: responseNow,
      responseId: `res_gcr_characterization_${suffix.padEnd(24, 'x')}`,
      signing: signing(relayIdentity)
    });
  }

  function normalize(signedRequest, response) {
    return normalizeBrokerResult(
      'resolve_memory_context',
      signedRequest,
      response,
      { verifyBrokerResponse: verifyResponse }
    );
  }

  return Object.freeze({
    observations,
    normalize,
    resolve,
    resign,
    snapshot() {
      return Object.freeze({
        ...observations,
        resolution_observer: resolutionObserver.snapshot(),
        ...(runtime ? { runtime: runtime.snapshot() } : {})
      });
    }
  });
}

function assertResolverOnly(snapshot) {
  assert.equal(snapshot.bridge_calls, 0);
  if (snapshot.runtime) {
    assert.equal(snapshot.runtime.successful_read_calls, 0);
    assert.equal(snapshot.runtime.non_empty_read_calls, 0);
    assert.deepEqual(snapshot.runtime.counters, ZERO_MEMORY_COUNTERS);
  }
}

test('resolver-only signed vertical slice issues and client-validates one v2 context ref', async () => {
  const fixture = createCharacterizationFixture();
  const result = await fixture.resolve();

  assert.equal(result.request.tool_request.name, 'resolve_memory_context');
  assert.equal(result.response.status, 'ok');
  assert.equal(result.response.structured_content.schema_version, 2);
  assert.equal(result.response.structured_content.context_status, 'resolved');
  assert.equal(result.response.structured_content.safe_project_alias, PROJECT_ALIAS);
  assert.deepEqual(result.response.structured_content.visibility_labels, ['project']);
  assert.match(
    result.response.structured_content.project_context_ref,
    /^pctx_[A-Za-z0-9_-]{32,96}$/u
  );
  assert.equal(Object.hasOwn(result.response.structured_content, 'attempt'), false);
  assert.deepEqual(result.response.counters, ZERO_MEMORY_COUNTERS);
  assert.deepEqual(Object.keys(result.response.receipt_chain).sort(), [
    'context', 'edge_request', 'governance', 'relay'
  ]);
  assert.equal(result.terminal.outcome, 'success');
  assert.equal(result.terminal.last_completed_stage, 'RESPONSE_FINALIZED');
  assert.equal(result.terminal.read_attempt_created, false);

  const snapshot = fixture.snapshot();
  assert.equal(snapshot.relay_calls, 1);
  assert.equal(snapshot.governance_calls, 1);
  assert.equal(snapshot.runtime.active_context_count, 1);
  assert.equal(snapshot.runtime.completed_requests, 1);
  assert.equal(snapshot.resolution_observer.terminal_successes, 1);
  assertResolverOnly(snapshot);
});

test('resolver-only mapping miss and scope denial remain signed low-disclosure final statuses', async () => {
  const fixture = createCharacterizationFixture();
  for (const input of [
    { projectAlias: 'unmapped-project', requestedVisibility: 'project' },
    { projectAlias: PROJECT_ALIAS, requestedVisibility: 'workspace' }
  ]) {
    const result = await fixture.resolve(input);
    assert.equal(result.response.status, 'denied');
    assert.deepEqual(result.response.structured_content, {
      schema_version: 2,
      context_status: 'denied'
    });
    assert.deepEqual(result.response.counters, ZERO_MEMORY_COUNTERS);
  }

  const snapshot = fixture.snapshot();
  assert.equal(snapshot.runtime.active_context_count, 0);
  assert.equal(snapshot.runtime.denied_requests, 2);
  assertResolverOnly(snapshot);
});

test('resolver-only issuance unavailability does not create or disclose a context ref', async () => {
  const fixture = createCharacterizationFixture({ issueOutcome: 'unavailable' });
  const result = await fixture.resolve();

  assert.equal(result.response.status, 'unavailable');
  assert.deepEqual(result.response.structured_content, {
    schema_version: 2,
    context_status: 'unavailable'
  });
  assert.equal(
    Object.hasOwn(result.response.structured_content, 'project_context_ref'),
    false
  );
  assert.deepEqual(result.response.counters, ZERO_MEMORY_COUNTERS);
  assertResolverOnly(fixture.snapshot());
});

test('resolver-only final issuance denial preserves its denied terminal', async () => {
  const fixture = createCharacterizationFixture({
    issueOutcome: 'issuance_denied'
  });
  const result = await fixture.resolve();

  assert.equal(result.response.status, 'denied');
  assert.deepEqual(result.response.structured_content, {
    schema_version: 2,
    context_status: 'denied'
  });
  assert.equal(result.terminal.outcome, 'failure');
  assert.equal(result.terminal.reason_code, 'context_issuance_denied');
  assert.equal(result.terminal.last_completed_stage, 'SCOPE_RESOLVED');
  assert.equal(result.terminal.failed_stage, 'CONTEXT_ISSUED');
  assert.equal(result.terminal.context_ref_issued, false);
  assertResolverOnly(fixture.snapshot());
});

test('context authority labels final activation denial as issuance denial', async () => {
  const mappingState = loadDiaryScopeMapping({ mapping: mapping() });
  const registryState = validateProjectRegistry(
    registry(mappingState),
    mappingState,
    { resolveDiaryRead: resolveRead }
  );
  const context = identity('gcr-final-activation-denial-context');
  const stages = [];
  const authority = createContextAuthority({
    registryState,
    mappingState,
    selectedProjectAlias: PROJECT_ALIAS,
    signing: signing(context),
    activationController: {
      checkContextIssueAuthorization() {
        return {
          accepted: true,
          receipt_digest: `sha256:${'a'.repeat(64)}`
        };
      },
      authorizeContextIssue() {
        return {
          accepted: false,
          governed_status: 'denied',
          receipt_digest: `sha256:${'b'.repeat(64)}`
        };
      },
      bindContext() {},
      checkReadAuthorization() {}
    },
    clock: () => NOW
  });

  const result = await authority.issue({
    principalFingerprint: digestObject('gcr-final-activation-denial-principal'),
    safeProjectAlias: PROJECT_ALIAS,
    requestedVisibility: 'project',
    now: NOW,
    governedContextResolution: true,
    onResolutionStage: stage => stages.push(stage)
  });

  assert.deepEqual(stages, ['REGISTRY_RESOLVED', 'SCOPE_RESOLVED']);
  assert.deepEqual(result, {
    status: 'denied',
    activation_receipt_digest: `sha256:${'b'.repeat(64)}`,
    resolution_reason: 'context_issuance_denied'
  });
});

test('resolver boundary preserves exact failure codes for issuance and public projection validation', async () => {
  const issuerFailure = createCharacterizationFixture({ issueOutcome: 'failure' });
  await assert.rejects(
    issuerFailure.resolve(),
    { code: 'synthetic_context_issuance_failed' }
  );
  assert.equal(
    issuerFailure.snapshot().last_terminal_reason,
    'context_issuance_failed'
  );
  assertResolverOnly(issuerFailure.snapshot());

  const invalidIssuance = createCharacterizationFixture({ issueOutcome: 'invalid' });
  await assert.rejects(
    invalidIssuance.resolve(),
    { code: 'context_issue_result_invalid' }
  );
  assert.equal(
    invalidIssuance.snapshot().last_terminal_reason,
    'context_issue_result_invalid'
  );
  assertResolverOnly(invalidIssuance.snapshot());

  const missingField = createCharacterizationFixture();
  let missingFieldResponse;
  let missingFieldRequest;
  await assert.rejects(
    missingField.resolve({
      transformResponse(response, context) {
        missingFieldRequest = context.request;
        const content = structuredClone(response.structured_content);
        delete content.project_context_ref;
        missingFieldResponse = missingField.resign(
          response,
          content,
          'missing-ref'
        );
        return missingFieldResponse;
      }
    }),
    { code: 'response_structured_content_shape_invalid' }
  );
  assert.throws(
    () => missingField.normalize(missingFieldRequest, missingFieldResponse),
    { code: 'response_structured_content_shape_invalid' }
  );
  assertResolverOnly(missingField.snapshot());

  const malformedReference = createCharacterizationFixture();
  let malformedResponse;
  let malformedRequest;
  await assert.rejects(
    malformedReference.resolve({
      transformResponse(response, context) {
        malformedRequest = context.request;
        malformedResponse = malformedReference.resign(response, {
          ...response.structured_content,
          project_context_ref: 'pctx_malformed'
        }, 'malformed-ref');
        return malformedResponse;
      }
    }),
    { code: 'project_context_ref_invalid' }
  );
  assert.throws(
    () => malformedReference.normalize(malformedRequest, malformedResponse),
    { code: 'project_context_ref_invalid' }
  );
  assertResolverOnly(malformedReference.snapshot());
});

test('issuer failure before resolution progress fails closed without invented stage receipts', async () => {
  const fixture = createCharacterizationFixture({
    issueOutcome: 'failure_before_resolution'
  });
  await assert.rejects(
    fixture.resolve(),
    { code: 'synthetic_context_issuer_preflight_failed' }
  );
  const snapshot = fixture.snapshot();
  assert.equal(snapshot.last_terminal_reason, 'context_registry_unavailable');
  assert.equal(snapshot.last_terminal.last_completed_stage, 'RELAY_CLAIMED');
  assert.equal(snapshot.last_terminal.failed_stage, 'REGISTRY_RESOLVED');
  assert.equal(snapshot.last_terminal.mapping_resolved, null);
  assert.equal(snapshot.last_terminal.scope_resolved, null);
  assertResolverOnly(snapshot);
});

test('resolver response-finalization failure commits a canonical terminal while preserving a safe error', async () => {
  const fixture = createCharacterizationFixture({
    responseFinalizationHook() {
      throw Object.assign(new Error('synthetic_response_finalization_failed'), {
        code: 'synthetic_response_finalization_failed'
      });
    }
  });
  await assert.rejects(
    fixture.resolve(),
    { code: 'context_response_finalization_failed' }
  );
  assert.equal(
    fixture.snapshot().last_terminal_reason,
    'context_response_finalization_failed'
  );
  assertResolverOnly(fixture.snapshot());
});

test('resolver client validation rejects an already expired issued context ref', async () => {
  const fixture = createCharacterizationFixture();
  let expiredResponse;
  let signedRequest;
  await assert.rejects(
    fixture.resolve({
      transformResponse(response, context) {
        signedRequest = context.request;
        expiredResponse = fixture.resign(response, {
          ...response.structured_content,
          expires_at: new Date(NOW.getTime() - 60_000).toISOString()
        }, 'expired-ref');
        return expiredResponse;
      }
    }),
    { code: 'response_context_expired' }
  );
  assert.throws(
    () => fixture.normalize(signedRequest, expiredResponse),
    { code: 'response_context_expired' }
  );
  assertResolverOnly(fixture.snapshot());
});

test('resolver client validation rejects a context ref expired when its response was issued', async () => {
  const fixture = createCharacterizationFixture();
  await assert.rejects(
    fixture.resolve({
      transformResponse(response) {
        return fixture.resign(response, {
          ...response.structured_content,
          expires_at: new Date(NOW.getTime() + 2_000).toISOString()
        }, 'stale-at-issue', new Date(NOW.getTime() + 4_000));
      }
    }),
    { code: 'response_context_expired' }
  );
  assertResolverOnly(fixture.snapshot());
});
