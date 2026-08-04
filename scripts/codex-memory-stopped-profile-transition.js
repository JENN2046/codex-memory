'use strict';

const SAFE_GIT_OBJECT = /^[a-f0-9]{40}$/u;
const SAFE_SHA256_DIGEST = /^sha256:[a-f0-9]{64}$/u;

const CANDIDATE_KEYS = Object.freeze([
  'controllerSourceManifestDigest',
  'controllerSourceManifestVersion',
  'repositoryHead'
]);
const IDENTITY_FIELDS = Object.freeze([
  'adoptedRepositoryHead',
  'controllerSourceManifestDigest',
  'controllerSourceManifestVersion'
]);
const P1_CLASSIFICATIONS = new Set([
  'COMMITTED',
  'ALREADY_COMMITTED',
  'ALREADY_COMMITTED_WITH_UNCERTAIN_DURABILITY',
  'STALE_CURRENT',
  'INVALID_CURRENT',
  'INPUT_REJECTED',
  'NOT_COMMITTED',
  'COMMIT_RESULT_UNKNOWN'
]);

function codedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function exactKeys(value, keys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('\u0000') ===
      [...keys].sort().join('\u0000')
  );
}

function normalizeCandidateBinding(value) {
  if (!exactKeys(value, CANDIDATE_KEYS) ||
      !SAFE_GIT_OBJECT.test(value.repositoryHead || '') ||
      !SAFE_SHA256_DIGEST.test(
        value.controllerSourceManifestDigest || ''
      ) ||
      !Number.isSafeInteger(value.controllerSourceManifestVersion) ||
      value.controllerSourceManifestVersion < 1) {
    return null;
  }
  return Object.freeze({
    repositoryHead: value.repositoryHead,
    controllerSourceManifestDigest: value.controllerSourceManifestDigest,
    controllerSourceManifestVersion: value.controllerSourceManifestVersion
  });
}

function sourceIdentity(source) {
  return Object.freeze({
    repositoryHead: source?.head || null,
    controllerSourceManifestDigest: source?.manifestDigest || null,
    controllerSourceManifestVersion:
      Number.isSafeInteger(source?.manifestVersion)
        ? source.manifestVersion
        : null
  });
}

function sameIdentity(left, right) {
  return left?.repositoryHead === right?.repositoryHead &&
    left?.controllerSourceManifestDigest ===
      right?.controllerSourceManifestDigest &&
    left?.controllerSourceManifestVersion ===
      right?.controllerSourceManifestVersion;
}

function sourceBaseValid(source) {
  return Boolean(
    source &&
    source.identityMode === 'manifest_v1' &&
    source.clean === true &&
    source.baselineExists === true &&
    source.currentMain === true &&
    source.repositoryMatch === true &&
    source.manifestRecognized === true &&
    source.manifestComplete === true &&
    source.manifestScopeClean === true &&
    source.adoptedHeadReadable === true &&
    source.adoptedHeadAncestor === true &&
    SAFE_GIT_OBJECT.test(source.head || '') &&
    SAFE_SHA256_DIGEST.test(source.manifestDigest || '') &&
    Number.isSafeInteger(source.manifestVersion) &&
    source.manifestVersion >= 1
  );
}

function evaluateSource(source, binding, {
  requireProfileCompatibility = false
} = {}) {
  if (!sourceBaseValid(source)) {
    return Object.freeze({
      valid: false,
      reason: 'stopped_profile_transition_candidate_invalid'
    });
  }
  const identity = sourceIdentity(source);
  if (!sameIdentity(identity, binding)) {
    return Object.freeze({
      valid: false,
      reason: 'stopped_profile_transition_candidate_binding_mismatch'
    });
  }
  if (requireProfileCompatibility &&
      (source.controllerSourceMatch !== true ||
       source.compatible !== true)) {
    return Object.freeze({
      valid: false,
      reason: 'stopped_profile_transition_candidate_invalid'
    });
  }
  return Object.freeze({ valid: true, identity });
}

function changedProfileFields(current, next) {
  if (!exactKeys(current, Object.keys(next))) return null;
  return Object.keys(current).filter(key => current[key] !== next[key]);
}

function profileShapeIsAllowed(current, next, profileSchemaVersion) {
  const changed = changedProfileFields(current, next);
  return changed !== null &&
    changed.every(key => IDENTITY_FIELDS.includes(key)) &&
    changed.length <= IDENTITY_FIELDS.length &&
    next.schemaVersion === profileSchemaVersion;
}

function normalizeInspectionFailure(error, fallback) {
  return [
    'stopped_profile_transition_runtime_not_stopped',
    'stopped_profile_transition_edge_not_stopped'
  ].includes(error?.code)
    ? error.code
    : fallback;
}

function normalizeExecutionFailure(error) {
  if (error?.code?.startsWith?.('stack_lifecycle_lock')) {
    return 'stopped_profile_transition_lock_failed';
  }
  if (error?.code?.startsWith?.('stack_profile_') ||
      error?.code?.startsWith?.('stack_private_')) {
    return 'stopped_profile_transition_profile_invalid';
  }
  return 'stopped_profile_transition_profile_transaction_failed';
}

function precondition({
  reason,
  candidateBinding,
  currentProfileFingerprint = null,
  nextProfileFingerprint = null,
  initialStoppedVerified = false,
  finalStoppedVerified = false,
  p1Called = false,
  profileTransactionClassification = null,
  profileTransactionErrorCode = null,
  readBackProfileFingerprint = null,
  profileMutated = false,
  durabilityConfirmed = false,
  committedProfileMatchesNext = false
}) {
  return {
    classification: 'PRECONDITION_REJECTED',
    underlyingClassification: 'PRECONDITION_REJECTED',
    stableReason: reason,
    candidateBinding,
    initialStoppedVerified,
    finalStoppedVerified,
    p1Called,
    profileTransactionClassification,
    profileTransactionErrorCode,
    currentProfileFingerprint,
    nextProfileFingerprint,
    readBackProfileFingerprint,
    profileMutated,
    durabilityConfirmed,
    committedProfileMatchesNext,
    runtimeMutated: false
  };
}

function projectP1Result(result, {
  candidateBinding,
  currentProfileFingerprint,
  nextProfileFingerprint,
  initialStoppedVerified,
  finalStoppedVerified
}) {
  const classification = result?.classification;
  if (!P1_CLASSIFICATIONS.has(classification)) {
    return precondition({
      reason: 'stopped_profile_transition_profile_transaction_failed',
      candidateBinding,
      currentProfileFingerprint,
      nextProfileFingerprint,
      initialStoppedVerified,
      finalStoppedVerified,
      p1Called: true
    });
  }
  return {
    classification,
    underlyingClassification: classification,
    stableReason:
      classification === 'COMMITTED' ||
      classification === 'ALREADY_COMMITTED'
        ? null
        : 'stopped_profile_transition_profile_transaction_failed',
    candidateBinding,
    initialStoppedVerified,
    finalStoppedVerified,
    p1Called: true,
    profileTransactionClassification: classification,
    profileTransactionErrorCode:
      typeof result.errorCode === 'string' ? result.errorCode : null,
    currentProfileFingerprint,
    nextProfileFingerprint: result.nextFingerprint || nextProfileFingerprint,
    readBackProfileFingerprint: result.readBackFingerprint || null,
    profileMutated:
      result.mutated === true || result.mutated === false
        ? result.mutated
        : null,
    durabilityConfirmed: result.durabilityConfirmed === true,
    committedProfileMatchesNext: result.committedProfileMatchesNext === true,
    runtimeMutated: false
  };
}

function finalize(outcome, candidateBinding, lifecycleLockReleased) {
  return Object.freeze({
    ...outcome,
    candidateBinding,
    lifecycleLockReleased
  });
}

/*
 * This is an internal orchestration seam. All supplied dependencies are
 * caller-owned so tests can use synthetic lock, stopped-state, source, and
 * P1 fixtures without touching a real runtime. Production binds it only to
 * the existing lifecycle lock/checkers and the dormant P1 primitive.
 */
function coordinateStoppedOwnerProfileTransition({
  candidateBinding,
  environment,
  profileSchemaVersion = 6,
  manifestSchemaVersion = 1,
  acquireLifecycleProfile,
  inspectSourceCompatibility,
  inspectStoppedState,
  validateProfile,
  canonicalProfileFingerprint,
  commitOwnerProfileTransaction,
  profilePath
} = {}) {
  const binding = normalizeCandidateBinding(candidateBinding);
  if (!binding) {
    return finalize(
      precondition({
        reason: 'stopped_profile_transition_candidate_binding_mismatch',
        candidateBinding: null
      }),
      null,
      true
    );
  }
  if (binding.controllerSourceManifestVersion !== manifestSchemaVersion) {
    return finalize(
      precondition({
        reason: 'stopped_profile_transition_candidate_invalid',
        candidateBinding: binding
      }),
      binding,
      true
    );
  }
  if (typeof acquireLifecycleProfile !== 'function' ||
      typeof inspectSourceCompatibility !== 'function' ||
      typeof inspectStoppedState !== 'function' ||
      typeof validateProfile !== 'function' ||
      typeof canonicalProfileFingerprint !== 'function' ||
      typeof commitOwnerProfileTransaction !== 'function' ||
      (typeof profilePath !== 'function' && typeof profilePath !== 'string')) {
    return finalize(
      precondition({
        reason: 'stopped_profile_transition_profile_transaction_failed',
        candidateBinding: binding
      }),
      binding,
      true
    );
  }

  let lifecycle = null;
  let lifecycleLockReleased = true;
  let outcome = null;
  let currentProfileFingerprint = null;
  let nextProfileFingerprint = null;
  let initialStoppedVerified = false;
  let finalStoppedVerified = false;
  let nextProfile = null;
  let resolvedProfilePath = null;

  try {
    lifecycle = acquireLifecycleProfile({ environment });
    lifecycleLockReleased = false;
    if (!lifecycle ||
        typeof lifecycle.release !== 'function' ||
        !lifecycle.profile ||
        typeof lifecycle.profile !== 'object') {
      outcome = precondition({
        reason: 'stopped_profile_transition_profile_transaction_failed',
        candidateBinding: binding
      });
    } else {
      let currentProfile;
      try {
        currentProfile = validateProfile(lifecycle.profile);
      } catch {
        currentProfile = null;
      }
      if (!currentProfile || currentProfile.schemaVersion !== profileSchemaVersion) {
        outcome = precondition({
          reason: currentProfile
            ? 'stopped_profile_transition_schema_unsupported'
            : 'stopped_profile_transition_profile_invalid',
          candidateBinding: binding
        });
      } else {
        try {
          currentProfileFingerprint =
            canonicalProfileFingerprint(currentProfile);
        } catch {
          outcome = precondition({
            reason: 'stopped_profile_transition_profile_invalid',
            candidateBinding: binding
          });
        }
      }

      if (!outcome) {
        let initialStopped;
        try {
          initialStopped = inspectStoppedState(
            currentProfile,
            { environment }
          );
        } catch (error) {
          initialStopped = {
            verified: false,
            reason: normalizeInspectionFailure(
              error,
              'stopped_profile_transition_runtime_not_stopped'
            )
          };
        }
        if (initialStopped?.verified !== true) {
          outcome = precondition({
            reason: initialStopped?.reason ||
              'stopped_profile_transition_runtime_not_stopped',
            candidateBinding: binding,
            currentProfileFingerprint,
            initialStoppedVerified: false
          });
        } else {
          initialStoppedVerified = true;
        }
      }

      let firstSource;
      let firstEvaluation;
      if (!outcome) {
        try {
          firstSource = inspectSourceCompatibility(
            currentProfile,
            { environment }
          );
          firstEvaluation = evaluateSource(firstSource, binding);
        } catch {
          firstEvaluation = {
            valid: false,
            reason: 'stopped_profile_transition_candidate_invalid'
          };
        }
        if (!firstEvaluation.valid) {
          outcome = precondition({
            reason: firstEvaluation.reason,
            candidateBinding: binding,
            currentProfileFingerprint,
            initialStoppedVerified
          });
        }
      }

      if (!outcome) {
        try {
          nextProfile = validateProfile({
            ...currentProfile,
            adoptedRepositoryHead: binding.repositoryHead,
            controllerSourceManifestDigest:
              binding.controllerSourceManifestDigest,
            controllerSourceManifestVersion:
              binding.controllerSourceManifestVersion
          });
          if (!profileShapeIsAllowed(
            currentProfile,
            nextProfile,
            profileSchemaVersion
          )) {
            throw codedError('stopped_profile_transition_next_profile_invalid');
          }
          nextProfileFingerprint =
            canonicalProfileFingerprint(nextProfile);
        } catch {
          outcome = precondition({
            reason: 'stopped_profile_transition_next_profile_invalid',
            candidateBinding: binding,
            currentProfileFingerprint,
            initialStoppedVerified
          });
        }
      }

      let secondSource;
      let secondEvaluation;
      if (!outcome) {
        try {
          secondSource = inspectSourceCompatibility(
            nextProfile,
            { environment }
          );
          secondEvaluation = evaluateSource(
            secondSource,
            binding,
            { requireProfileCompatibility: true }
          );
        } catch {
          secondEvaluation = {
            valid: false,
            reason: 'stopped_profile_transition_candidate_changed_after_validation'
          };
        }
        if (!secondEvaluation.valid ||
            !sameIdentity(firstEvaluation.identity, secondEvaluation.identity)) {
          outcome = precondition({
            reason: 'stopped_profile_transition_candidate_changed_after_validation',
            candidateBinding: binding,
            currentProfileFingerprint,
            nextProfileFingerprint,
            initialStoppedVerified
          });
        }
      }

      if (!outcome) {
        try {
          resolvedProfilePath = typeof profilePath === 'function'
            ? profilePath(environment)
            : profilePath;
        } catch {
          outcome = precondition({
            reason: 'stopped_profile_transition_profile_transaction_failed',
            candidateBinding: binding,
            currentProfileFingerprint,
            nextProfileFingerprint,
            initialStoppedVerified
          });
        }
      }

      if (!outcome) {
        let finalStopped;
        try {
          finalStopped = inspectStoppedState(
            currentProfile,
            { environment }
          );
        } catch (error) {
          finalStopped = {
            verified: false,
            reason: normalizeInspectionFailure(
              error,
              'stopped_profile_transition_runtime_not_stopped'
            )
          };
        }
        if (finalStopped?.verified !== true) {
          outcome = precondition({
            reason: finalStopped?.reason ||
              'stopped_profile_transition_runtime_not_stopped',
            candidateBinding: binding,
            currentProfileFingerprint,
            nextProfileFingerprint,
            initialStoppedVerified,
            finalStoppedVerified: false
          });
        } else {
          finalStoppedVerified = true;
        }
      }

      if (!outcome) {
        let transaction;
        try {
          transaction = commitOwnerProfileTransaction({
            profilePath: resolvedProfilePath,
            expectedCurrentFingerprint: currentProfileFingerprint,
            nextProfile
          });
        } catch {
          outcome = precondition({
            reason: 'stopped_profile_transition_profile_transaction_failed',
            candidateBinding: binding,
            currentProfileFingerprint,
            nextProfileFingerprint,
            initialStoppedVerified,
            finalStoppedVerified,
            p1Called: true
          });
        }
        if (!outcome) {
          outcome = projectP1Result(transaction, {
            candidateBinding: binding,
            currentProfileFingerprint,
            nextProfileFingerprint,
            initialStoppedVerified,
            finalStoppedVerified
          });
        }
      }
    }
  } catch (error) {
    if (!outcome) {
      outcome = precondition({
        reason: normalizeExecutionFailure(error),
        candidateBinding: binding,
        currentProfileFingerprint,
        nextProfileFingerprint,
        initialStoppedVerified,
        finalStoppedVerified
      });
    }
  } finally {
    if (lifecycle && typeof lifecycle.release === 'function') {
      try {
        lifecycle.release();
        lifecycleLockReleased = true;
      } catch {
        lifecycleLockReleased = false;
        const underlying = outcome || precondition({
          reason: 'stopped_profile_transition_profile_transaction_failed',
          candidateBinding: binding,
          currentProfileFingerprint,
          nextProfileFingerprint,
          initialStoppedVerified,
          finalStoppedVerified
        });
        outcome = {
          ...underlying,
          classification: 'LOCK_RELEASE_FAILED',
          underlyingClassification: underlying.classification,
          stableReason: 'stopped_profile_transition_lock_release_failed'
        };
      }
    }
  }

  return finalize(outcome || precondition({
    reason: 'stopped_profile_transition_profile_transaction_failed',
    candidateBinding: binding,
    currentProfileFingerprint,
    nextProfileFingerprint,
    initialStoppedVerified,
    finalStoppedVerified
  }), binding, lifecycleLockReleased);
}

module.exports = {
  coordinateStoppedOwnerProfileTransition,
  normalizeCandidateBinding
};
