'use strict';

const {
  MEMORY_ID_ALIASES,
  firstNonEmptyAliasString,
  isPlainObject,
  normalizeScopeTuple,
  normalizeString
} = require('./FieldAliasNormalizer');

const CLIENT_SCOPE_PRIVATE_READ_CONSISTENCY_VERSION =
  'phase-h-client-scope-private-read-consistency-v1';

function normalizeLower(value) {
  return normalizeString(value).toLowerCase().replace(/-/g, '_');
}

function cloneArray(values) {
  return Array.isArray(values) ? [...values] : [];
}

function normalizeRequestScope(requestContext = {}) {
  const safeContext = isPlainObject(requestContext) ? requestContext : {};
  const executionContext = isPlainObject(safeContext.executionContext)
    ? safeContext.executionContext
    : {};
  return normalizeScopeTuple(executionContext);
}

function normalizeCandidate(candidate = {}) {
  const safeCandidate = isPlainObject(candidate) ? candidate : {};
  const candidateScope = normalizeScopeTuple(safeCandidate.scope || safeCandidate);
  const visibility = normalizeLower(
    candidateScope.visibility ||
    firstNonEmptyAliasString(safeCandidate, ['visibility', 'visibilityPolicy', 'visibility_policy'])
  );

  return {
    memoryId: firstNonEmptyAliasString(safeCandidate, MEMORY_ID_ALIASES) || null,
    lifecycleStatus: normalizeLower(firstNonEmptyAliasString(
      safeCandidate,
      ['lifecycleStatus', 'lifecycle_status', 'status']
    ) || 'active'),
    classification: normalizeLower(firstNonEmptyAliasString(
      safeCandidate,
      ['classification', 'privateReadCase', 'private_read_case']
    )),
    visibility,
    scope: {
      ...candidateScope,
      visibility
    }
  };
}

function sanitizeSuppressedCandidate(candidate, blockers = []) {
  return {
    memoryId: candidate.memoryId,
    lifecycleStatus: candidate.lifecycleStatus,
    visibility: candidate.visibility,
    ownerClientIdPresent: Boolean(candidate.scope.clientId),
    blockers
  };
}

function evaluateCandidates(candidates = [], requestScope = {}) {
  const acceptedPrivateCandidates = [];
  const acceptedSharedCandidates = [];
  const suppressedPrivateCandidates = [];
  const requestClientId = normalizeString(requestScope.clientId);

  for (const rawCandidate of cloneArray(candidates)) {
    const candidate = normalizeCandidate(rawCandidate);
    const blockers = [];
    const privateCandidate = candidate.visibility === 'private';

    if (privateCandidate && !requestClientId) {
      blockers.push('request_client_id_missing_fail_closed');
    }

    if (privateCandidate && !normalizeString(candidate.scope.clientId)) {
      blockers.push('owner_client_id_missing_fail_closed');
    }

    if (
      privateCandidate &&
      requestClientId &&
      normalizeString(candidate.scope.clientId) &&
      normalizeString(candidate.scope.clientId) !== requestClientId
    ) {
      blockers.push('cross_client_private_suppressed');
    }

    if (blockers.length > 0) {
      suppressedPrivateCandidates.push(sanitizeSuppressedCandidate(candidate, blockers));
      continue;
    }

    if (privateCandidate) {
      acceptedPrivateCandidates.push({
        memoryId: candidate.memoryId,
        lifecycleStatus: candidate.lifecycleStatus,
        visibility: candidate.visibility,
        clientId: candidate.scope.clientId
      });
      continue;
    }

    acceptedSharedCandidates.push({
      memoryId: candidate.memoryId,
      lifecycleStatus: candidate.lifecycleStatus,
      visibility: candidate.visibility || 'shared',
      clientId: candidate.scope.clientId || null
    });
  }

  return {
    acceptedPrivateCandidates,
    acceptedSharedCandidates,
    suppressedPrivateCandidates
  };
}

function serializedIncludesRawPrivateData(value) {
  const rawFieldNames = new Set([
    'content',
    'snippet',
    'text',
    'sourceFile',
    'source_file',
    'filePath',
    'file_path',
    'raw'
  ]);

  function inspect(candidate) {
    if (Array.isArray(candidate)) {
      return candidate.some(inspect);
    }
    if (!isPlainObject(candidate)) {
      return false;
    }
    return Object.entries(candidate).some(([key, nested]) => {
      return rawFieldNames.has(key) || inspect(nested);
    });
  }

  return inspect(value);
}

function summarizeClientScopePrivateReadConsistency(input = {}) {
  const safeInput = isPlainObject(input) ? input : {};
  const sourceMode = normalizeLower(safeInput.sourceMode || 'explicit_input');
  const requestScope = normalizeRequestScope(safeInput.requestContext);
  const callerScope = normalizeScopeTuple(safeInput.callerScope || safeInput.scope || {});
  const lifecycleCurrentScope = normalizeRequestScope({
    executionContext: isPlainObject(safeInput.lifecycleExecutionContext)
      ? safeInput.lifecycleExecutionContext
      : isPlainObject(safeInput.requestContext)
        ? safeInput.requestContext.executionContext
        : {}
  });
  const sideEffects = isPlainObject(safeInput.sideEffects) ? safeInput.sideEffects : {};

  const primaryEvaluation = evaluateCandidates(safeInput.candidates, requestScope);
  const missingIdentityEvaluation = evaluateCandidates(
    safeInput.missingRequestIdentityProbeCandidates,
    {}
  );
  const suppressedPrivateCandidates = [
    ...primaryEvaluation.suppressedPrivateCandidates,
    ...missingIdentityEvaluation.suppressedPrivateCandidates
  ];

  const acceptedPrivateClientIds = new Set(primaryEvaluation.acceptedPrivateCandidates
    .map(candidate => normalizeString(candidate.clientId))
    .filter(Boolean));
  const suppressedBlockers = new Set(suppressedPrivateCandidates
    .flatMap(candidate => candidate.blockers));
  const requestClientId = normalizeString(requestScope.clientId);
  const callerClientId = normalizeString(callerScope.clientId);
  const lifecycleClientId = normalizeString(lifecycleCurrentScope.clientId);

  const sameClientPrivateAccepted = requestClientId && acceptedPrivateClientIds.has(requestClientId);
  const crossClientPrivateSuppressed = suppressedBlockers.has('cross_client_private_suppressed');
  const ownerlessPrivateSuppressed =
    suppressedBlockers.has('owner_client_id_missing_fail_closed');
  const missingRequestIdentityPrivateSuppressed =
    suppressedBlockers.has('request_client_id_missing_fail_closed');
  const callerScopeCandidateFilterOnly =
    Boolean(callerClientId) &&
    Boolean(requestClientId) &&
    callerClientId !== requestClientId &&
    lifecycleClientId === requestClientId;
  const lifecycleCurrentScopeFromExecutionContext =
    Boolean(requestClientId) &&
    lifecycleClientId === requestClientId &&
    lifecycleClientId !== callerClientId;
  const rawSuppressedMetadataExposed = serializedIncludesRawPrivateData(suppressedPrivateCandidates);
  const noApplyInvariant =
    sideEffects.runtimeApplied !== true &&
    sideEffects.durableMutationExecuted !== true &&
    sideEffects.durableAuditWritten !== true &&
    sideEffects.providerCalls !== true &&
    sideEffects.realMemoryScanned !== true &&
    sideEffects.publicMcpExpanded !== true &&
    sideEffects.readinessClaimed !== true &&
    sideEffects.reliabilityClaimed !== true;

  const acceptedForPrivateReadConsistency =
    sourceMode === 'explicit_input' &&
    sameClientPrivateAccepted === true &&
    crossClientPrivateSuppressed === true &&
    ownerlessPrivateSuppressed === true &&
    missingRequestIdentityPrivateSuppressed === true &&
    callerScopeCandidateFilterOnly === true &&
    lifecycleCurrentScopeFromExecutionContext === true &&
    rawSuppressedMetadataExposed === false &&
    noApplyInvariant === true;

  return {
    consistencyVersion: CLIENT_SCOPE_PRIVATE_READ_CONSISTENCY_VERSION,
    sourceMode,
    acceptedForPrivateReadConsistency,
    decision: acceptedForPrivateReadConsistency
      ? 'NO_APPLY_CLIENT_SCOPE_PRIVATE_READ_CONSISTENCY_ACCEPTED'
      : 'NOT_READY_BLOCKED',
    authority: {
      requestClientId,
      callerScopeClientId: callerClientId || null,
      lifecycleCurrentScopeClientId: lifecycleClientId || null,
      callerScopeCandidateFilterOnly,
      lifecycleCurrentScopeFromExecutionContext
    },
    privateReadPolicy: {
      sameClientPrivateAccepted,
      crossClientPrivateSuppressed,
      ownerlessPrivateSuppressed,
      missingRequestIdentityPrivateSuppressed,
      acceptedPrivateCount: primaryEvaluation.acceptedPrivateCandidates.length,
      suppressedPrivateCount: suppressedPrivateCandidates.length
    },
    sanitizedAuditMetadata: suppressedPrivateCandidates,
    rawSuppressedMetadataExposed,
    noApplyInvariant,
    runtimeApplied: false,
    durableMutationExecuted: false,
    durableAuditWritten: false,
    providerCalls: 0,
    realMemoryScanned: false,
    publicMcpExpanded: false,
    readinessClaimed: false,
    reliabilityClaimed: false,
    blockers: {
      blockingFindings: [
        sourceMode !== 'explicit_input' ? 'source_mode_not_explicit_input' : null,
        !sameClientPrivateAccepted ? 'same_client_private_not_accepted' : null,
        !crossClientPrivateSuppressed ? 'cross_client_private_not_suppressed' : null,
        !ownerlessPrivateSuppressed ? 'ownerless_private_not_suppressed' : null,
        !missingRequestIdentityPrivateSuppressed ? 'missing_request_identity_private_not_suppressed' : null,
        !callerScopeCandidateFilterOnly ? 'caller_scope_identity_spoof_not_proven_blocked' : null,
        !lifecycleCurrentScopeFromExecutionContext ? 'lifecycle_current_scope_not_execution_context' : null,
        rawSuppressedMetadataExposed ? 'raw_suppressed_metadata_exposed' : null,
        !noApplyInvariant ? 'no_apply_invariant_failed' : null
      ].filter(Boolean)
    },
    safety: {
      noSideEffects: true,
      readsFiles: false,
      executesCommands: false,
      startsServices: false,
      callsProviders: false,
      mutatesDurableState: false,
      scansRealMemory: false,
      rawPrivateMemoryExposed: rawSuppressedMetadataExposed
    }
  };
}

module.exports = {
  CLIENT_SCOPE_PRIVATE_READ_CONSISTENCY_VERSION,
  summarizeClientScopePrivateReadConsistency
};
