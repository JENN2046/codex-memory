'use strict';

const {
  GOVERNED_READ_ATTEMPT_READ_TOOLS,
  InMemoryReplayGuard,
  ZERO_MEMORY_COUNTERS,
  digestObject,
  projectLegacyCountersFromGovernedReadAttemptWorkingSet,
  reject,
  validateProjectContextClaim,
  validatePublicStructuredContent,
  validateRequestEnvelope
} = require('../../../packages/chatgpt-r4-contracts');
const {
  createGovernanceAdapter,
  validateRelayReceipt
} = require('./governance-adapter');
const {
  MAX_AUTHORIZED_TOOL_CALLS,
  MAX_INACTIVE_REQUEST_ATTEMPTS,
  MAX_R5A_AUTHORIZED_TOOL_CALLS,
  NATIVE_SHARED_READ_CLIENT_ID,
  R4_LIVE_READ_MODE,
  R4_SESSION_SCOPED_LIVE_READ_MODE,
  createContextAuthority,
  effectiveVisibility
} = require('./governed-live-read-runtime');
const {
  createGovernedReadAttemptGovernanceRuntime,
  deriveGovernedReadExecutionParameters,
  deriveGovernedReadReceiptDigests
} = require('./governed-read-attempt-runtime');
const {
  structuredProjection
} = require('./governed-read-public-projection');
const {
  visibilityScope
} = require('./project-registry');

const OBSERVED_TOOL_NAMES = new Set([
  'resolve_memory_context',
  ...GOVERNED_READ_ATTEMPT_READ_TOOLS
]);

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw codedError('governed_read_attempt_cancelled');
  }
}

function unavailableReadProjection(toolName, status = 'unavailable') {
  if (!['denied', 'unavailable'].includes(status)) {
    throw codedError('governed_read_failure_projection_invalid');
  }
  const value = toolName === 'search_memory'
    ? { status, result_count: 0, results: [] }
    : {
        status,
        kind: {
          memory_overview: 'overview',
          audit_memory: 'audit',
          prepare_memory_context: 'context'
        }[toolName],
        item_count: 0
      };
  if (!value.kind && toolName !== 'search_memory') {
    throw codedError('governed_read_failure_projection_invalid');
  }
  validatePublicStructuredContent(value);
  return Object.freeze(value);
}

function createDeniedDecision({
  request,
  relayReceipt,
  governedReadAttempt
}) {
  const invocation = {
    status: 'denied',
    structured_content: unavailableReadProjection(
      request.tool_request.name,
      'denied'
    ),
    counters: {
      provider_calls: 0,
      native_invocations: 0,
      local_fallbacks: null,
      primary_memory_writes: null,
      derived_index_writes: null,
      other_durable_mutations: 0,
      unrestricted_native_searches: 0
    }
  };
  const decision = {
    accepted: false,
    invocation
  };
  return Object.freeze({
    accepted: false,
    invocation: Object.freeze({
      ...invocation,
      receipt_digests: deriveGovernedReadReceiptDigests({
        request,
        relayReceipt,
        decision,
        governedReadAttempt
      })
    })
  });
}

function projectedResultCount(structuredContent) {
  const value = structuredContent?.result_count ??
    structuredContent?.item_count ?? 0;
  return Number.isSafeInteger(value) && value >= 0 && value <= 5
    ? value
    : 0;
}

function projectedRelevance(structuredContent) {
  const values = Array.isArray(structuredContent?.results)
    ? structuredContent.results
      .map(item => item?.relevance)
      .filter(value => typeof value === 'number' &&
        Number.isFinite(value) && value >= 0 && value <= 1)
    : [];
  return values.length > 0 ? Math.max(...values) : null;
}

function completeCanonicalCounters(counters) {
  return counters &&
    Object.values(counters).every(value =>
      Number.isSafeInteger(value) && value >= 0
    );
}

function derivedMutationEvidence(counters) {
  if (!completeCanonicalCounters(counters) ||
      counters.native_invocations === 0) {
    return null;
  }
  const mutations = counters.derived_index_writes;
  return Object.freeze({
    policy: 'isolated_derived_runtime_mutation_v1',
    authorized: true,
    isolated_runtime_store: true,
    accounting_final: false,
    cumulative_count: mutations,
    receipt_delta: mutations,
    active_count: 0,
    completed_count: mutations,
    failed_count: 0,
    trigger_categories: Object.freeze(
      mutations > 0 ? ['hydration'] : []
    ),
    policy_violation: false,
    source_partition_mutation: false,
    legacy_partition_accessed: false,
    ambiguous_partition_accessed: false,
    unregistered_partition_accessed: false,
    unrestricted_native_search: false,
    raw_details_disclosed: false
  });
}

function createGovernedReadV2Runtime({
  expectedIssuer,
  expectedAudience,
  resolveRequestPublicKey,
  resolvePrincipalPublicKey,
  registryState,
  mappingState,
  selectedProjectAlias,
  resolveDiaryRead,
  contextSigning,
  invokeBridge,
  activationController = null,
  dogfoodObserver = null,
  counterMode = R4_LIVE_READ_MODE,
  clock = () => new Date(),
  monotonicClock = () => Math.floor(performance.now()),
  randomBytes
} = {}) {
  if ((counterMode === R4_SESSION_SCOPED_LIVE_READ_MODE) !==
        Boolean(activationController) ||
      ![R4_LIVE_READ_MODE, R4_SESSION_SCOPED_LIVE_READ_MODE]
        .includes(counterMode) ||
      typeof resolveDiaryRead !== 'function' ||
      typeof invokeBridge !== 'function' ||
      typeof monotonicClock !== 'function' ||
      (dogfoodObserver !== null && (
        !activationController ||
        typeof dogfoodObserver.beginToolAttempt !== 'function' ||
        typeof dogfoodObserver.observeToolResult !== 'function' ||
        typeof dogfoodObserver.observeToolError !== 'function' ||
        typeof dogfoodObserver.markEmergencyStop !== 'function' ||
        typeof dogfoodObserver.snapshot !== 'function'
      ))) {
    reject('governed_read_v2_runtime_invalid');
  }

  const contextAuthority = createContextAuthority({
    registryState,
    mappingState,
    selectedProjectAlias,
    signing: contextSigning,
    activationController,
    clock,
    randomBytes
  });
  const contextReplayGuard = new InMemoryReplayGuard({ clock });
  const activationByAttempt = new Map();
  const maxAuthorizedToolCalls = dogfoodObserver
    ? MAX_R5A_AUTHORIZED_TOOL_CALLS
    : MAX_AUTHORIZED_TOOL_CALLS;
  const observations = {
    request_attempts: 0,
    authorized_request_attempts: 0,
    inactive_request_attempts: 0,
    completed_requests: 0,
    denied_requests: 0,
    unavailable_requests: 0,
    successful_read_calls: 0,
    non_empty_read_calls: 0,
    counters: { ...ZERO_MEMORY_COUNTERS }
  };

  const resolveAdapter = createGovernanceAdapter({
    expectedIssuer,
    expectedAudience,
    resolveRequestPublicKey,
    resolvePrincipalPublicKey,
    resolveContextPublicKey: contextAuthority.resolvePublicKey,
    issueProjectContext: input => contextAuthority.issue(input),
    resolveProjectContext: reference =>
      contextAuthority.resolve(reference),
    contextReplayGuard,
    invokeGovernance() {
      reject('governed_read_v2_attempt_required');
    },
    counterMode,
    clock
  });

  async function authorizeRead({
    request,
    relayReceipt,
    attemptRef,
    governedReadAttempt,
    signal
  }) {
    throwIfAborted(signal);
    const now = clock();
    const validation = validateRequestEnvelope(request, {
      now,
      resolveRequestPublicKey,
      resolvePrincipalPublicKey,
      expectedIssuer,
      expectedAudience,
      consumeReplay: false
    });
    validateRelayReceipt(relayReceipt, validation.requestDigest);
    throwIfAborted(signal);
    if (!GOVERNED_READ_ATTEMPT_READ_TOOLS.includes(
      request.tool_request.name
    )) {
      throw codedError('governed_read_authorization_invalid');
    }
    const deny = () => createDeniedDecision({
      request,
      relayReceipt,
      governedReadAttempt
    });
    const contextRef =
      request.tool_request.arguments.project_context_ref;
    const authorizationInput = {
      principalFingerprint: validation.principalFingerprint,
      projectContextRef: contextRef,
      toolName: request.tool_request.name
    };
    try {
      let preauthorization =
        activationController?.checkReadAuthorization({
          ...authorizationInput,
          now
        });
      if (preauthorization &&
          preauthorization.accepted !== true) {
        return deny();
      }
      const claim = await contextAuthority.resolve(contextRef);
      throwIfAborted(signal);
      preauthorization =
        activationController?.checkReadAuthorization({
          ...authorizationInput,
          now: clock()
        });
      if (preauthorization &&
          preauthorization.accepted !== true) {
        return deny();
      }
      validateProjectContextClaim(claim, {
        now,
        resolvePublicKey: contextAuthority.resolvePublicKey,
        expectedPrincipalFingerprint:
          validation.principalFingerprint,
        expectedContextRef: contextRef
      });
      if (claim.registry_reference !==
            registryState.registryReference ||
          claim.mapping_reference !== mappingState.mappingReference ||
          claim.mapping_digest !== mappingState.mappingDigest) {
        return deny();
      }
      contextReplayGuard.consume({
        namespace: 'project_context_ref',
        key: contextRef,
        expiresAt: claim.expires_at
      });
      const visibility = effectiveVisibility(
        claim.visibility_allowlist
      );
      const resolution = resolveDiaryRead({
        mapping: mappingState.mapping,
        trustedScope: {
          clientId: NATIVE_SHARED_READ_CLIENT_ID,
          projectId: claim.project_id,
          workspaceId: claim.workspace_id,
          visibility
        },
        recallProfile:
          visibilityScope(visibility).recallProfile
      });
      if (!resolution.accepted ||
          resolution.allowedDiaryCount < 1) {
        return deny();
      }
      throwIfAborted(signal);
      const activation = activationController?.authorizeRead({
        ...authorizationInput,
        now: clock()
      });
      if (activation && activation.accepted !== true) {
        return deny();
      }
      if (activation) {
        activationByAttempt.set(attemptRef, Object.freeze({
          useToken: activation.use_token
        }));
      }
      const execution =
        deriveGovernedReadExecutionParameters(request);
      return Object.freeze({
        accepted: true,
        authorization: Object.freeze({
          accepted: true,
          allowedDiaryNames: Object.freeze([
            ...resolution.allowedDiaryNames
          ]),
          allowedDiaryCount: resolution.allowedDiaryCount
        }),
        query: execution.query,
        limit: execution.limit
      });
    } catch (error) {
      if (error?.code === 'governed_read_attempt_cancelled') {
        throw error;
      }
      return deny();
    }
  }

  function completePendingActivation(attemptRef) {
    const activation = activationByAttempt.get(attemptRef) || null;
    if (!activation) return null;
    activationByAttempt.delete(attemptRef);
    return activationController.completeRead({
      useToken: activation.useToken,
      now: clock()
    });
  }

  async function invokeAttemptBridge(input) {
    const attemptRef = input.workingSet.header.attempt_ref;
    const activation = activationByAttempt.get(attemptRef) || null;
    if (activation) activationByAttempt.delete(attemptRef);
    let bridgeResult;
    let bridgeError = null;
    try {
      bridgeResult = await invokeBridge(input);
    } catch (error) {
      bridgeError = error;
    }
    let completion = null;
    if (activation) {
      completion = activationController.completeRead({
        useToken: activation.useToken,
        now: clock()
      });
    }
    if (completion && completion.accepted !== true) {
      throw codedError(
        'governed_read_response_suppressed_after_activation_recheck'
      );
    }
    if (bridgeError) throw bridgeError;
    return bridgeResult;
  }

  const attemptRuntime =
    createGovernedReadAttemptGovernanceRuntime({
      authorizeRead,
      invokeBridge: invokeAttemptBridge,
      async projectInvocation({
        request,
        bridgeResult,
        receiptDigests
      }) {
        const structuredContent = bridgeResult.accepted === true
          ? structuredProjection(
            request.tool_request.name,
            bridgeResult.result,
            request.tool_request.arguments.project_context_ref
          )
          : unavailableReadProjection(request.tool_request.name);
        validatePublicStructuredContent(structuredContent);
        return Object.freeze({
          status: bridgeResult.accepted === true
            ? 'ok'
            : 'unavailable',
          structured_content:
            Object.freeze(structuredContent),
          counters:
            projectLegacyCountersFromGovernedReadAttemptWorkingSet(
              bridgeResult.working_set
            ),
          receipt_digests: receiptDigests
        });
      }
    });

  function beginObservation(toolName) {
    if (!dogfoodObserver ||
        !OBSERVED_TOOL_NAMES.has(toolName)) {
      return Object.freeze({
        ordinal: null,
        startedAt: 0
      });
    }
    const startedAt = Number(monotonicClock());
    if (!Number.isFinite(startedAt)) {
      reject('r5a_dogfood_monotonic_clock_invalid');
    }
    return Object.freeze({
      ordinal: dogfoodObserver.beginToolAttempt({ toolName }),
      startedAt
    });
  }

  function observationLatency(startedAt) {
    const endedAt = Number(monotonicClock());
    return Number.isFinite(endedAt)
      ? Math.max(
        0,
        Math.min(60_000, Math.round(endedAt - startedAt))
      )
      : 0;
  }

  function observeResult(toolName, result, observation) {
    if (!dogfoodObserver) return;
    const counters = result.counters;
    if (!completeCanonicalCounters(counters)) {
      observeError(
        toolName,
        codedError('governed_read_evidence_incomplete'),
        observation
      );
      return;
    }
    try {
      dogfoodObserver.observeToolResult({
        toolName,
        latencyMs:
          observationLatency(observation.startedAt),
        status: String(
          result.structured_content?.status ||
          result.structured_content?.context_status ||
          result.status
        ),
        resultCount:
          projectedResultCount(result.structured_content),
        relevance:
          projectedRelevance(result.structured_content),
        counters,
        derivedRuntimeMutationEvidence:
          derivedMutationEvidence(counters),
        activationSnapshot: activationController.snapshot(),
        sessionOrdinal: observation.ordinal
      });
    } catch (error) {
      const errorCode =
        typeof error?.code === 'string'
          ? error.code
          : 'r5a_dogfood_runtime_error';
      dogfoodObserver.markEmergencyStop({ errorCode });
      activationController.kill({ reason: 'emergency_stop' });
      throw error;
    }
  }

  function observeError(toolName, error, observation) {
    if (!dogfoodObserver ||
        !OBSERVED_TOOL_NAMES.has(toolName)) {
      return;
    }
    const errorCode =
      typeof error?.code === 'string' &&
      /^[a-z][a-z0-9_]{0,79}$/u.test(error.code)
        ? error.code
        : 'governed_read_runtime_error';
    dogfoodObserver.observeToolError({
      toolName,
      latencyMs: observationLatency(observation.startedAt),
      errorCode,
      activationSnapshot: activationController.snapshot(),
      sessionOrdinal: observation.ordinal
    });
  }

  return Object.freeze({
    async handle(payload, options = {}) {
      const toolName = payload?.request?.tool_request?.name;
      const attemptRef =
        payload?.governedReadAttempt?.header?.attempt_ref || null;
      const observation = beginObservation(toolName);
      let observationFinalized = false;
      try {
        const inactiveSessionRequest =
          activationController &&
          activationController.snapshot().active !== true;
        if (inactiveSessionRequest) {
          if (observations.inactive_request_attempts >=
              MAX_INACTIVE_REQUEST_ATTEMPTS) {
            reject(
              'r4_governance_inactive_request_budget_exhausted'
            );
          }
          observations.inactive_request_attempts += 1;
        } else {
          if (observations.authorized_request_attempts >=
              maxAuthorizedToolCalls) {
            reject(
              'r4_governance_authorized_call_budget_exhausted'
            );
          }
          observations.authorized_request_attempts += 1;
        }
        observations.request_attempts += 1;
        let result;
        if (toolName === 'resolve_memory_context') {
          if (payload?.governedReadAttempt !== undefined) {
            reject('governed_read_v2_attempt_forbidden');
          }
          result = await resolveAdapter.handle(payload);
        } else {
          if (!GOVERNED_READ_ATTEMPT_READ_TOOLS.includes(
            toolName
          ) || payload?.governedReadAttempt === undefined) {
            reject('governed_read_v2_attempt_required');
          }
          result = await attemptRuntime.handle(
            payload,
            options
          );
        }
        observations.completed_requests += 1;
        if (result.status === 'denied') {
          observations.denied_requests += 1;
        }
        if (result.status === 'unavailable') {
          observations.unavailable_requests += 1;
        }
        if (toolName !== 'resolve_memory_context') {
          if (result.status === 'ok') {
            observations.successful_read_calls += 1;
          }
          if (projectedResultCount(
            result.structured_content
          ) > 0) {
            observations.non_empty_read_calls += 1;
          }
          for (const [key, value] of Object.entries(
            result.counters
          )) {
            if (Number.isSafeInteger(value)) {
              observations.counters[key] += value;
            }
          }
        }
        if (result.status === 'ok' ||
            result.status === 'denied' ||
            toolName === 'resolve_memory_context') {
          observationFinalized = true;
          observeResult(toolName, result, observation);
        } else {
          observationFinalized = true;
          observeError(
            toolName,
            codedError(
              result.governed_read_attempt
                ?.terminal_failure?.reason_code ||
                'governed_read_terminal_failure'
            ),
            observation
          );
        }
        return result;
      } catch (error) {
        let surfacedError = error;
        if (attemptRef && activationByAttempt.has(attemptRef)) {
          try {
            const completion = completePendingActivation(attemptRef);
            if (completion?.accepted !== true) {
              surfacedError = codedError(
                'governed_read_response_suppressed_after_activation_recheck'
              );
            }
          } catch {
            surfacedError = codedError(
              'governed_read_activation_finalization_failed'
            );
          }
        }
        if (!observationFinalized) {
          observeError(toolName, surfacedError, observation);
        }
        throw surfacedError;
      }
    },
    snapshot() {
      return Object.freeze({
        ...contextAuthority.snapshot(),
        request_attempts: observations.request_attempts,
        authorized_request_attempts:
          observations.authorized_request_attempts,
        inactive_request_attempts:
          observations.inactive_request_attempts,
        max_authorized_tool_calls: maxAuthorizedToolCalls,
        max_inactive_request_attempts:
          MAX_INACTIVE_REQUEST_ATTEMPTS,
        completed_requests: observations.completed_requests,
        denied_requests: observations.denied_requests,
        unavailable_requests:
          observations.unavailable_requests,
        successful_read_calls:
          observations.successful_read_calls,
        non_empty_read_calls:
          observations.non_empty_read_calls,
        counters: Object.freeze({
          ...observations.counters
        }),
        request_bodies_logged: 0,
        response_bodies_logged: 0,
        raw_memory_persisted: false,
        governed_read_attempt_protocol:
          'governed_read_attempt.v1',
        chatgpt_edge_data_response_schema_version: 2,
        legacy_v1_read_path_active: false,
        ...(dogfoodObserver ? {
          private_dogfood_observation:
            dogfoodObserver.snapshot(
              activationController.snapshot()
            )
        } : {}),
        ...(activationController ? {
          session_activation:
            activationController.snapshot()
        } : {})
      });
    },
    counterMode
  });
}

module.exports = {
  createDeniedDecision,
  createGovernedReadV2Runtime,
  derivedMutationEvidence,
  unavailableReadProjection
};
