'use strict';

const CANDIDATE_KEYS = Object.freeze([
  'repositoryHead',
  'controllerSourceManifestDigest',
  'controllerSourceManifestVersion'
]);

const IDENTITY_FIELDS = Object.freeze([
  'adoptedRepositoryHead',
  'controllerSourceManifestDigest',
  'controllerSourceManifestVersion'
]);

const P1_CLASSIFICATIONS = new Set([
  'COMMITTED',
  'COMMITTED_WITH_UNCERTAIN_DURABILITY',
  'ALREADY_COMMITTED',
  'ALREADY_COMMITTED_WITH_UNCERTAIN_DURABILITY',
  'STALE_CURRENT',
  'INVALID_CURRENT',
  'INPUT_REJECTED',
  'NOT_COMMITTED',
  'COMMIT_RESULT_UNKNOWN'
]);

const CLEANUP_ERROR_CODE = 'stack_lifecycle_acquisition_cleanup_failed';
const LOCK_RELEASE_FAILURE_REASON =
  'stopped_profile_transition_lock_release_failed';
const LIFECYCLE_LOCK_ERROR_CODES = new Set([
  'stack_lifecycle_busy',
  'stack_lifecycle_lock_failed',
  'stack_lifecycle_lock_identity_changed',
  'stack_lifecycle_lock_identity_unavailable',
  'stack_lifecycle_lock_invalid',
  'stack_lifecycle_lock_path_invalid',
  'stack_lifecycle_lock_recovery_failed',
  'stack_lifecycle_lock_release_failed',
  'stack_lifecycle_lock_close_failed',
  'stack_lifecycle_lock_unlink_failed'
]);

function codedError(code, fields = {}) {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, fields);
  return error;
}

function safeCode(error, fallback = 'stopped_profile_transition_failed') {
  const candidate = error?.code;
  return typeof candidate === 'string' &&
    /^[a-z][a-z0-9_]{0,95}$/u.test(candidate)
    ? candidate
    : fallback;
}

function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function normalizeCandidateBinding(binding, {
  manifestSchemaVersion = 1
} = {}) {
  if (!exactKeys(binding, CANDIDATE_KEYS) ||
      !/^[a-f0-9]{40}$/u.test(binding.repositoryHead || '') ||
      !/^sha256:[a-f0-9]{64}$/u.test(
        binding.controllerSourceManifestDigest || ''
      ) ||
      !Number.isSafeInteger(binding.controllerSourceManifestVersion) ||
      binding.controllerSourceManifestVersion !== manifestSchemaVersion) {
    throw codedError('stopped_profile_transition_candidate_binding_invalid');
  }
  return Object.freeze({
    repositoryHead: binding.repositoryHead,
    controllerSourceManifestDigest:
      binding.controllerSourceManifestDigest,
    controllerSourceManifestVersion:
      binding.controllerSourceManifestVersion
  });
}

function emptyProjection({
  classification,
  stableReason,
  underlyingClassification = classification,
  p1Called = false,
  profileTransactionClassification = null,
  profileTransactionErrorCode = null,
  profileMutated = false,
  durabilityConfirmed = false,
  committedProfileMatchesNext = false,
  currentProfileFingerprint = null,
  nextProfileFingerprint = null,
  readBackProfileFingerprint = null,
  lifecycleLockAcquired = false,
  lifecycleLockReleaseAttempted = false,
  lifecycleLockReleased = true,
  lifecycleLockErrorCode = null,
  preconditionErrorCode = null,
  initialStoppedVerified = false,
  finalStoppedVerified = false,
  candidateBinding = null
} = {}) {
  return {
    classification,
    stableReason: stableReason || null,
    underlyingClassification,
    p1Called,
    profileTransactionClassification,
    profileTransactionErrorCode,
    profileMutated,
    durabilityConfirmed,
    committedProfileMatchesNext,
    currentProfileFingerprint,
    nextProfileFingerprint,
    readBackProfileFingerprint,
    lifecycleLockAcquired,
    lifecycleLockReleaseAttempted,
    lifecycleLockReleased,
    lifecycleLockErrorCode,
    preconditionErrorCode,
    initialStoppedVerified,
    finalStoppedVerified,
    runtimeMutated: false,
    candidateBinding
  };
}

function freezeResult(value) {
  return Object.freeze(value);
}

function stoppedFailureReason(error) {
  const code = safeCode(error);
  if (code === 'stopped_profile_transition_schema_unsupported' ||
      code === 'stack_profile_schema_unsupported') {
    return 'stopped_profile_transition_schema_unsupported';
  }
  if (code === 'stopped_profile_transition_runtime_not_stopped') {
    return code;
  }
  if (code === 'stopped_profile_transition_edge_not_stopped') {
    return code;
  }
  if (code === 'stack_source_manifest_rebind_stack_not_stopped' ||
      code.startsWith('stack_process_') ||
      code.startsWith('stack_managed_')) {
    return 'stopped_profile_transition_runtime_not_stopped';
  }
  if (code.includes('edge') || code === 'stack_edge_container_unavailable') {
    return 'stopped_profile_transition_edge_not_stopped';
  }
  if (code.includes('candidate_binding')) {
    return 'stopped_profile_transition_candidate_binding_mismatch';
  }
  if (code.includes('candidate_changed')) {
    return 'stopped_profile_transition_candidate_changed_after_validation';
  }
  if (code.includes('candidate') || code.includes('source_manifest')) {
    return 'stopped_profile_transition_candidate_invalid';
  }
  if (code.includes('next_profile')) {
    return 'stopped_profile_transition_next_profile_invalid';
  }
  return 'stopped_profile_transition_precondition_rejected';
}

function projectP1Result(transaction, context) {
  if (!transaction || !P1_CLASSIFICATIONS.has(transaction.classification)) {
    return emptyProjection({
      ...context,
      classification: 'PRECONDITION_REJECTED',
      stableReason: 'stopped_profile_transition_profile_transaction_failed',
      underlyingClassification: 'PRECONDITION_REJECTED',
      p1Called: true,
      profileTransactionClassification: null,
      profileTransactionErrorCode: safeCode(
        transaction,
        'stopped_profile_transition_profile_transaction_failed'
      ),
      profileMutated: null
    });
  }
  return emptyProjection({
    ...context,
    classification: transaction.classification,
    stableReason: null,
    underlyingClassification: transaction.classification,
    p1Called: true,
    profileTransactionClassification: transaction.classification,
    profileTransactionErrorCode: transaction.errorCode || null,
    profileMutated: transaction.mutated,
    durabilityConfirmed: transaction.durabilityConfirmed,
    committedProfileMatchesNext: transaction.committedProfileMatchesNext,
    currentProfileFingerprint: transaction.oldFingerprint || null,
    nextProfileFingerprint: transaction.nextFingerprint ||
      context.nextProfileFingerprint || null,
    readBackProfileFingerprint: transaction.readBackFingerprint || null
  });
}

function acquisitionFailureReason(error, structured) {
  if (!structured) return stoppedFailureReason(error);
  if (error.cleanupPhase === 'owner_lock_initialization') {
    return 'stopped_profile_transition_lock_failed';
  }
  if (error.cleanupPhase === 'lifecycle_profile_acquisition') {
    if (error.primaryErrorCode === 'stack_profile_schema_unsupported') {
      return 'stopped_profile_transition_schema_unsupported';
    }
    return 'stopped_profile_transition_current_profile_invalid';
  }
  return stoppedFailureReason(error);
}

function optionalStableCode(code) {
  return typeof code === 'string' &&
    /^[a-z][a-z0-9_]{0,95}$/u.test(code)
    ? code
    : null;
}

function isLifecycleLockErrorCode(code) {
  return LIFECYCLE_LOCK_ERROR_CODES.has(code);
}

function projectAcquisitionFailure(error, context) {
  const structured = error?.lifecycleLockAcquired === true &&
    error?.lifecycleLockReleaseAttempted === true &&
    typeof error.lifecycleLockReleased === 'boolean';
  if (!structured && context.lifecycleLockAcquired === true) {
    return emptyProjection({
      ...context,
      classification: 'PRECONDITION_REJECTED',
      stableReason: stoppedFailureReason(error),
      underlyingClassification: 'PRECONDITION_REJECTED',
      p1Called: false,
      profileTransactionClassification: null,
      profileTransactionErrorCode: null,
      profileMutated: false,
      lifecycleLockAcquired: true,
      lifecycleLockReleaseAttempted: false,
      lifecycleLockReleased: false,
      lifecycleLockErrorCode: null,
      preconditionErrorCode: safeCode(error)
    });
  }
  const acquired = structured;
  const attempted = structured;
  const released = structured
    ? error.lifecycleLockReleased === true
    : true;
  const cleanupFailed = structured && !released &&
    error.code === CLEANUP_ERROR_CODE &&
    error.residualLockPossible === true;
  const rawErrorCode = safeCode(error);
  const lifecycleLockErrorCode = cleanupFailed
    ? isLifecycleLockErrorCode(error.cleanupErrorCode)
      ? error.cleanupErrorCode
      : null
    : structured
      ? null
      : isLifecycleLockErrorCode(rawErrorCode)
        ? rawErrorCode
        : null;
  const preconditionErrorCode = structured
    ? optionalStableCode(error.primaryErrorCode)
    : lifecycleLockErrorCode === null
      ? rawErrorCode
      : null;
  return emptyProjection({
    ...context,
    classification: cleanupFailed
      ? 'LOCK_RELEASE_FAILED'
      : 'PRECONDITION_REJECTED',
    stableReason: cleanupFailed
      ? LOCK_RELEASE_FAILURE_REASON
      : structured
        ? acquisitionFailureReason(error, true)
        : lifecycleLockErrorCode !== null
          ? 'stopped_profile_transition_lock_failed'
          : stoppedFailureReason(error),
    underlyingClassification: 'PRECONDITION_REJECTED',
    p1Called: false,
    profileTransactionClassification: null,
    profileTransactionErrorCode: null,
    profileMutated: false,
    lifecycleLockAcquired: acquired,
    lifecycleLockReleaseAttempted: attempted,
    lifecycleLockReleased: released,
    lifecycleLockErrorCode,
    preconditionErrorCode,
    candidateBinding: context.candidateBinding
  });
}

function projectReleaseFailure(previous, releaseError, context) {
  const underlyingClassification =
    previous?.classification || 'PRECONDITION_REJECTED';
  return emptyProjection({
    ...previous,
    ...context,
    classification: 'LOCK_RELEASE_FAILED',
    stableReason: LOCK_RELEASE_FAILURE_REASON,
    underlyingClassification,
    lifecycleLockAcquired: true,
    lifecycleLockReleaseAttempted: true,
    lifecycleLockReleased: false,
    lifecycleLockErrorCode: isLifecycleLockErrorCode(releaseError?.code)
      ? releaseError.code
      : 'stack_lifecycle_lock_release_failed'
  });
}

function synchronizeLifecycleLockContext(context, result) {
  if (!context || !result) return;
  context.lifecycleLockAcquired = result.lifecycleLockAcquired;
  context.lifecycleLockReleaseAttempted =
    result.lifecycleLockReleaseAttempted;
  context.lifecycleLockReleased = result.lifecycleLockReleased;
  context.lifecycleLockErrorCode = result.lifecycleLockErrorCode;
}

function requireStopped(inspection) {
  if (inspection === false || inspection?.verified === false ||
      inspection?.stopped === false || inspection?.accepted === false) {
    throw codedError('stopped_profile_transition_runtime_not_stopped');
  }
  return true;
}

function assertCandidateSource(source, binding, {
  identity = null
} = {}) {
  if (!source || typeof source !== 'object') {
    throw codedError('stopped_profile_transition_candidate_invalid');
  }
  if (identity && (
    identity.head !== source.head ||
    identity.manifestDigest !== source.manifestDigest ||
    identity.manifestVersion !== source.manifestVersion
  )) {
    throw codedError(
      'stopped_profile_transition_candidate_changed_after_validation'
    );
  }
  if (source.head !== binding.repositoryHead ||
      source.manifestDigest !== binding.controllerSourceManifestDigest ||
      source.manifestVersion !== binding.controllerSourceManifestVersion) {
    throw codedError('stopped_profile_transition_candidate_binding_mismatch');
  }
  if (source.clean !== true || source.currentMain !== true ||
      source.repositoryMatch !== true || source.baselineExists !== true ||
      source.manifestRecognized !== true ||
      source.manifestComplete !== true ||
      source.manifestScopeClean !== true ||
      source.adoptedHeadReadable !== true ||
      source.adoptedHeadAncestor !== true) {
    throw codedError('stopped_profile_transition_candidate_invalid');
  }
  return Object.freeze({
    head: source.head,
    manifestDigest: source.manifestDigest,
    manifestVersion: source.manifestVersion
  });
}

function buildNextProfile(current, binding, validateProfile) {
  let next;
  try {
    next = validateProfile({
      ...current,
      adoptedRepositoryHead: binding.repositoryHead,
      controllerSourceManifestDigest:
        binding.controllerSourceManifestDigest,
      controllerSourceManifestVersion:
        binding.controllerSourceManifestVersion
    });
  } catch {
    throw codedError('stopped_profile_transition_next_profile_invalid');
  }
  if (next?.schemaVersion !== 6 ||
      !exactKeys(next, Object.keys(current)) ||
      Object.keys(current).some(key =>
        !IDENTITY_FIELDS.includes(key) && next[key] !== current[key]
      )) {
    throw codedError('stopped_profile_transition_next_profile_invalid');
  }
  return next;
}

function coordinateStoppedOwnerProfileTransition({
  candidateBinding,
  profilePath,
  manifestSchemaVersion = 1,
  acquireLifecycleProfile,
  inspectSourceCompatibility,
  inspectStoppedState,
  validateProfile,
  canonicalProfileFingerprint,
  commitOwnerProfileTransaction
} = {}) {
  const binding = normalizeCandidateBinding(candidateBinding, {
    manifestSchemaVersion
  });
  if (typeof acquireLifecycleProfile !== 'function' ||
      typeof inspectSourceCompatibility !== 'function' ||
      typeof inspectStoppedState !== 'function' ||
      typeof validateProfile !== 'function' ||
      typeof canonicalProfileFingerprint !== 'function' ||
      typeof commitOwnerProfileTransaction !== 'function') {
    throw codedError('stopped_profile_transition_contract_invalid');
  }
  const context = {
    candidateBinding: binding,
    initialStoppedVerified: false,
    finalStoppedVerified: false,
    lifecycleLockAcquired: false,
    lifecycleLockReleaseAttempted: false,
    lifecycleLockReleased: true
  };
  let lifecycle = null;
  let result = null;
  let currentFingerprint = null;
  let nextFingerprint = null;
  try {
    lifecycle = acquireLifecycleProfile();
    context.lifecycleLockAcquired = true;
    context.lifecycleLockReleased = false;
    if (!lifecycle || typeof lifecycle.release !== 'function') {
      throw codedError('stopped_profile_transition_lock_contract_invalid');
    }
    let current;
    try {
      current = validateProfile(lifecycle.profile);
    } catch {
      throw codedError('stopped_profile_transition_current_profile_invalid');
    }
    if (current.schemaVersion !== 6) {
      throw codedError('stopped_profile_transition_schema_unsupported');
    }
    currentFingerprint = canonicalProfileFingerprint(current);
    context.currentProfileFingerprint = currentFingerprint;

    requireStopped(inspectStoppedState(current));
    context.initialStoppedVerified = true;

    const firstSource = inspectSourceCompatibility(current);
    const firstIdentity = assertCandidateSource(firstSource, binding);
    const nextProfile = buildNextProfile(
      current,
      binding,
      validateProfile
    );
    nextFingerprint = canonicalProfileFingerprint(nextProfile);
    context.nextProfileFingerprint = nextFingerprint;

    const secondSource = inspectSourceCompatibility(nextProfile);
    assertCandidateSource(secondSource, binding, {
      identity: firstIdentity
    });

    requireStopped(inspectStoppedState(nextProfile));
    context.finalStoppedVerified = true;

    if (typeof profilePath !== 'string' || profilePath.length === 0) {
      throw codedError('stopped_profile_transition_profile_path_invalid');
    }
    let transaction;
    try {
      transaction = commitOwnerProfileTransaction({
        profilePath,
        expectedCurrentFingerprint: currentFingerprint,
        nextProfile
      });
    } catch (error) {
      result = emptyProjection({
        ...context,
        classification: 'PRECONDITION_REJECTED',
        stableReason:
          'stopped_profile_transition_profile_transaction_failed',
        underlyingClassification: 'PRECONDITION_REJECTED',
        p1Called: true,
        profileTransactionClassification: null,
        profileTransactionErrorCode: safeCode(
          error,
          'stopped_profile_transition_profile_transaction_failed'
        ),
        profileMutated: null
      });
    }
    if (!result) {
      result = projectP1Result(transaction, {
        ...context,
        p1Called: true,
        currentProfileFingerprint: currentFingerprint,
        nextProfileFingerprint: nextFingerprint
      });
    }
  } catch (error) {
    result = projectAcquisitionFailure(error, {
      ...context,
      currentProfileFingerprint: currentFingerprint,
      nextProfileFingerprint: nextFingerprint
    });
    synchronizeLifecycleLockContext(context, result);
  } finally {
    if (lifecycle) {
      context.lifecycleLockReleaseAttempted = true;
      try {
        lifecycle.release();
        context.lifecycleLockReleased = true;
      } catch (releaseError) {
        context.lifecycleLockReleased = false;
        result = projectReleaseFailure(result, releaseError, {
          ...context,
          currentProfileFingerprint: currentFingerprint,
          nextProfileFingerprint: nextFingerprint
        });
        synchronizeLifecycleLockContext(context, result);
      }
    }
  }
  return freezeResult({
    ...result,
    ...context,
    currentProfileFingerprint: currentFingerprint,
    nextProfileFingerprint: nextFingerprint
  });
}

module.exports = {
  CLEANUP_ERROR_CODE,
  CANDIDATE_KEYS,
  IDENTITY_FIELDS,
  P1_CLASSIFICATIONS,
  coordinateStoppedOwnerProfileTransition,
  normalizeCandidateBinding,
  projectP1Result
};
