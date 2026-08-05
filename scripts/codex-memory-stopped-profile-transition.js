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
const LOCK_RELEASE_REASON = 'stopped_profile_transition_lock_release_failed';
const LOCK_ERROR_CODES = new Set([
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

function codedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function stableCode(value, fallback = null) {
  const candidate = typeof value === 'string' ? value : value?.code;
  return typeof candidate === 'string' &&
    /^[a-z][a-z0-9_]{0,95}$/u.test(candidate)
    ? candidate
    : fallback;
}

function exactKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function normalizeCandidateBinding(value, {
  manifestSchemaVersion = 1
} = {}) {
  if (!exactKeys(value, CANDIDATE_KEYS) ||
      !/^[a-f0-9]{40}$/u.test(value.repositoryHead || '') ||
      !/^sha256:[a-f0-9]{64}$/u.test(
        value.controllerSourceManifestDigest || ''
      ) ||
      value.controllerSourceManifestVersion !== manifestSchemaVersion) {
    throw codedError('stopped_profile_transition_candidate_binding_invalid');
  }
  return Object.freeze({ ...value });
}

function projection({
  classification,
  stableReason = null,
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
    stableReason,
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

function preconditionReason(error) {
  const code = stableCode(error, 'stopped_profile_transition_failed');
  if (code === 'stopped_profile_transition_schema_unsupported' ||
      code === 'stack_profile_schema_unsupported') {
    return 'stopped_profile_transition_schema_unsupported';
  }
  if (code === 'stack_source_manifest_rebind_stack_not_stopped' ||
      code.startsWith('stack_process_') ||
      code.startsWith('stack_managed_')) {
    return 'stopped_profile_transition_runtime_not_stopped';
  }
  if (code.includes('edge')) {
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
  if (code.startsWith('stack_profile_') ||
      code.includes('current_profile')) {
    return 'stopped_profile_transition_current_profile_invalid';
  }
  return 'stopped_profile_transition_precondition_rejected';
}

function acquisitionReason(error) {
  if (error?.cleanupPhase === 'owner_lock_initialization') {
    return 'stopped_profile_transition_lock_failed';
  }
  if (error?.cleanupPhase === 'lifecycle_profile_acquisition') {
    return error.primaryErrorCode === 'stack_profile_schema_unsupported'
      ? 'stopped_profile_transition_schema_unsupported'
      : 'stopped_profile_transition_current_profile_invalid';
  }
  return preconditionReason(error);
}

function projectAcquisitionFailure(error, context) {
  const structured = error?.lifecycleLockAcquired === true &&
    error?.lifecycleLockReleaseAttempted === true &&
    typeof error.lifecycleLockReleased === 'boolean';
  const cleanupFailed = structured && error.code === CLEANUP_ERROR_CODE &&
    error.lifecycleLockReleased === false &&
    error.residualLockPossible === true;
  const rawCode = stableCode(error, 'stopped_profile_transition_failed');
  const lifecycleCode = cleanupFailed
    ? stableCode(error.cleanupErrorCode)
    : structured ? null : LOCK_ERROR_CODES.has(rawCode) ? rawCode : null;
  const preconditionCode = cleanupFailed
    ? stableCode(error.primaryErrorCode)
    : structured
      ? stableCode(error.primaryErrorCode || rawCode)
      : lifecycleCode === null ? rawCode : null;
  return projection({
    ...context,
    classification: cleanupFailed ? 'LOCK_RELEASE_FAILED' : 'PRECONDITION_REJECTED',
    stableReason: cleanupFailed
      ? LOCK_RELEASE_REASON
      : structured
        ? acquisitionReason(error)
        : lifecycleCode ? 'stopped_profile_transition_lock_failed'
          : preconditionReason(error),
    underlyingClassification: 'PRECONDITION_REJECTED',
    lifecycleLockAcquired: structured
      ? error.lifecycleLockAcquired
      : context.lifecycleLockAcquired === true,
    lifecycleLockReleaseAttempted: structured
      ? error.lifecycleLockReleaseAttempted
      : context.lifecycleLockReleaseAttempted === true,
    lifecycleLockReleased: structured
      ? error.lifecycleLockReleased
      : context.lifecycleLockAcquired === true
        ? context.lifecycleLockReleased === true
        : true,
    lifecycleLockErrorCode: lifecycleCode,
    preconditionErrorCode: preconditionCode
  });
}

function projectP1Result(result, context) {
  if (!result || !P1_CLASSIFICATIONS.has(result.classification)) {
    return projection({
      ...context,
      classification: 'PRECONDITION_REJECTED',
      stableReason: 'stopped_profile_transition_profile_transaction_failed',
      underlyingClassification: 'PRECONDITION_REJECTED',
      p1Called: true,
      profileTransactionErrorCode: stableCode(
        result,
        'stopped_profile_transition_profile_transaction_failed'
      ),
      profileMutated: null
    });
  }
  return projection({
    ...context,
    classification: result.classification,
    underlyingClassification: result.classification,
    p1Called: true,
    profileTransactionClassification: result.classification,
    profileTransactionErrorCode: stableCode(result.errorCode),
    profileMutated: result.mutated,
    durabilityConfirmed: result.durabilityConfirmed,
    committedProfileMatchesNext: result.committedProfileMatchesNext,
    currentProfileFingerprint: result.oldFingerprint ||
      context.currentProfileFingerprint,
    nextProfileFingerprint: result.nextFingerprint ||
      context.nextProfileFingerprint,
    readBackProfileFingerprint: result.readBackFingerprint || null
  });
}

function projectReleaseFailure(previous, releaseError, context) {
  return projection({
    ...context,
    ...previous,
    classification: 'LOCK_RELEASE_FAILED',
    stableReason: LOCK_RELEASE_REASON,
    underlyingClassification: previous?.classification ||
      'PRECONDITION_REJECTED',
    lifecycleLockAcquired: true,
    lifecycleLockReleaseAttempted: true,
    lifecycleLockReleased: false,
    lifecycleLockErrorCode: LOCK_ERROR_CODES.has(releaseError?.code)
      ? releaseError.code
      : 'stack_lifecycle_lock_release_failed'
  });
}

function requireStopped(value) {
  if (!value || value.inspectionComplete !== true) {
    throw codedError('stopped_profile_transition_runtime_not_stopped');
  }
}

function assertCandidateSource(source, binding, previous = null) {
  if (!source || typeof source !== 'object' ||
      source.head !== binding.repositoryHead ||
      source.manifestDigest !== binding.controllerSourceManifestDigest ||
      source.manifestVersion !== binding.controllerSourceManifestVersion) {
    throw codedError('stopped_profile_transition_candidate_binding_mismatch');
  }
  if (previous && (
    source.head !== previous.head ||
    source.manifestDigest !== previous.manifestDigest ||
    source.manifestVersion !== previous.manifestVersion
  )) {
    throw codedError('stopped_profile_transition_candidate_changed_after_validation');
  }
  if (source.clean !== true || source.currentMain !== true ||
      source.repositoryMatch !== true || source.baselineExists !== true ||
      source.manifestRecognized !== true || source.manifestComplete !== true ||
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

function nextProfile(current, binding, validateProfile) {
  let next;
  try {
    next = validateProfile({
      ...current,
      adoptedRepositoryHead: binding.repositoryHead,
      controllerSourceManifestDigest: binding.controllerSourceManifestDigest,
      controllerSourceManifestVersion: binding.controllerSourceManifestVersion
    });
  } catch {
    throw codedError('stopped_profile_transition_next_profile_invalid');
  }
  if (next.schemaVersion !== 6 ||
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
  for (const value of [
    acquireLifecycleProfile,
    inspectSourceCompatibility,
    inspectStoppedState,
    validateProfile,
    canonicalProfileFingerprint,
    commitOwnerProfileTransaction
  ]) {
    if (typeof value !== 'function') {
      throw codedError('stopped_profile_transition_contract_invalid');
    }
  }
  const context = {
    candidateBinding: binding,
    initialStoppedVerified: false,
    finalStoppedVerified: false,
    lifecycleLockAcquired: false,
    lifecycleLockReleaseAttempted: false,
    lifecycleLockReleased: true,
    lifecycleLockErrorCode: null,
    preconditionErrorCode: null
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

    const first = assertCandidateSource(
      inspectSourceCompatibility(current),
      binding
    );
    const candidate = nextProfile(current, binding, validateProfile);
    nextFingerprint = canonicalProfileFingerprint(candidate);
    context.nextProfileFingerprint = nextFingerprint;

    assertCandidateSource(
      inspectSourceCompatibility(candidate),
      binding,
      first
    );
    if (typeof profilePath !== 'string' || profilePath.length === 0) {
      throw codedError('stopped_profile_transition_profile_path_invalid');
    }
    requireStopped(inspectStoppedState(candidate));
    context.finalStoppedVerified = true;

    let transaction;
    try {
      transaction = commitOwnerProfileTransaction({
        profilePath,
        expectedCurrentFingerprint: currentFingerprint,
        nextProfile: candidate
      });
      result = projectP1Result(transaction, context);
    } catch (error) {
      result = projection({
        ...context,
        classification: 'PRECONDITION_REJECTED',
        stableReason: 'stopped_profile_transition_profile_transaction_failed',
        underlyingClassification: 'PRECONDITION_REJECTED',
        p1Called: true,
        profileTransactionErrorCode: stableCode(
          error,
          'stopped_profile_transition_profile_transaction_failed'
        ),
        profileMutated: null
      });
    }
  } catch (error) {
    result = projectAcquisitionFailure(error, {
      ...context,
      currentProfileFingerprint: currentFingerprint,
      nextProfileFingerprint: nextFingerprint
    });
  } finally {
    if (lifecycle && typeof lifecycle.release === 'function') {
      context.lifecycleLockReleaseAttempted = true;
      try {
        lifecycle.release();
        context.lifecycleLockReleased = true;
        if (result) {
          result.lifecycleLockAcquired = true;
          result.lifecycleLockReleaseAttempted = true;
          result.lifecycleLockReleased = true;
          result.lifecycleLockErrorCode = null;
        }
      } catch (releaseError) {
        context.lifecycleLockReleased = false;
        result = projectReleaseFailure(result, releaseError, {
          ...context,
          currentProfileFingerprint: currentFingerprint,
          nextProfileFingerprint: nextFingerprint
        });
      }
    }
  }
  return Object.freeze({
    ...context,
    ...result,
    currentProfileFingerprint: currentFingerprint,
    nextProfileFingerprint: nextFingerprint
  });
}

module.exports = {
  CANDIDATE_KEYS,
  CLEANUP_ERROR_CODE,
  IDENTITY_FIELDS,
  P1_CLASSIFICATIONS,
  coordinateStoppedOwnerProfileTransition,
  normalizeCandidateBinding,
  projectAcquisitionFailure,
  projectP1Result,
  projectReleaseFailure
};
