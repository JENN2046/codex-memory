'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  PROFILE_SCHEMA_VERSION,
  validateProfile
} = require('./codex-memory-stack');

const MAX_PROFILE_BYTES = 16_384;
const OWNER_FILE_MODE = 0o600;
const FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const TRANSACTION_SCHEMA = PROFILE_SCHEMA_VERSION;

const CURRENT_STATE = Object.freeze({
  EXPECTED_OLD: 'CURRENT_IS_EXPECTED_OLD',
  EXACT_NEW: 'CURRENT_IS_EXACT_NEW',
  STALE_CONFLICT: 'CURRENT_IS_STALE_CONFLICT',
  INVALID: 'CURRENT_IS_INVALID'
});

function codedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function currentUid() {
  return typeof process.getuid === 'function' ? process.getuid() : null;
}

function isOwnerOnlyStat(stat) {
  const uid = currentUid();
  return uid !== null && stat.uid === uid && (stat.mode & 0o077) === 0;
}

function normalizedAbsolutePath(value, code) {
  if (typeof value !== 'string' || !path.isAbsolute(value) ||
      path.resolve(value) !== value) {
    throw codedError(code);
  }
  return value;
}

function assertOwnerOnlyDirectory(directory, fsModule) {
  const normalized = normalizedAbsolutePath(
    directory,
    'owner_profile_target_directory_invalid'
  );
  let resolved;
  let stat;
  try {
    resolved = fsModule.realpathSync(normalized);
    stat = fsModule.statSync(resolved);
  } catch {
    throw codedError('owner_profile_target_directory_invalid');
  }
  if (resolved !== normalized || !stat.isDirectory() ||
      !isOwnerOnlyStat(stat)) {
    throw codedError('owner_profile_target_directory_invalid');
  }
  return normalized;
}

function assertOwnerOnlyProfileFile(file, fsModule) {
  const normalized = normalizedAbsolutePath(
    file,
    'owner_profile_current_invalid'
  );
  let linkStat;
  let resolved;
  let stat;
  try {
    linkStat = fsModule.lstatSync(normalized);
    resolved = fsModule.realpathSync(normalized);
    stat = fsModule.statSync(resolved);
  } catch {
    throw codedError('owner_profile_current_invalid');
  }
  if (resolved !== normalized || linkStat.isSymbolicLink() ||
      !stat.isFile() || !isOwnerOnlyStat(stat) || stat.size < 1 ||
      stat.size > MAX_PROFILE_BYTES) {
    throw codedError('owner_profile_current_invalid');
  }
  return normalized;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function validatedProfile(value, errorCode = 'owner_profile_profile_invalid') {
  try {
    return validateProfile(value);
  } catch {
    throw codedError(errorCode);
  }
}

function fingerprintForValidatedProfile(profile) {
  const canonicalBytes = Buffer.from(
    JSON.stringify(canonicalize(profile)),
    'utf8'
  );
  return `sha256:${crypto.createHash('sha256').update(canonicalBytes).digest('hex')}`;
}

function canonicalProfileFingerprint(profile) {
  return fingerprintForValidatedProfile(validatedProfile(profile));
}

function validateTransactionProfile(profile) {
  const validated = validatedProfile(
    profile,
    'owner_profile_next_invalid'
  );
  if (validated.schemaVersion !== TRANSACTION_SCHEMA) {
    throw codedError('owner_profile_transaction_schema_unsupported');
  }
  return validated;
}

function readValidatedProfile(profilePath, fsModule) {
  try {
    const file = normalizedAbsolutePath(
      profilePath,
      'owner_profile_current_invalid'
    );
    assertOwnerOnlyDirectory(path.dirname(file), fsModule);
    assertOwnerOnlyProfileFile(file, fsModule);
    const parsed = JSON.parse(fsModule.readFileSync(file, 'utf8'));
    const profile = validatedProfile(parsed, 'owner_profile_current_invalid');
    return {
      valid: true,
      profile,
      fingerprint: fingerprintForValidatedProfile(profile),
      supported: profile.schemaVersion === TRANSACTION_SCHEMA
    };
  } catch (error) {
    return {
      valid: false,
      errorCode: error?.code === 'owner_profile_transaction_schema_unsupported'
        ? error.code
        : 'owner_profile_current_invalid'
    };
  }
}

function result({
  classification,
  errorCode,
  oldFingerprint,
  nextFingerprint,
  readBackFingerprint,
  mutated,
  durabilityConfirmed,
  committedProfileMatchesNext,
  validationFailed = false
}) {
  return Object.freeze({
    classification,
    errorCode,
    oldFingerprint: oldFingerprint || null,
    nextFingerprint,
    readBackFingerprint: readBackFingerprint || null,
    mutated,
    durabilityConfirmed,
    committedProfileMatchesNext,
    validationFailed
  });
}

function faultError(point) {
  return codedError(`owner_profile_fault_${point}`);
}

function invokeFault(faultInjector, point) {
  if (!faultInjector) return;
  let decision;
  try {
    decision = typeof faultInjector === 'function'
      ? faultInjector(point)
      : faultInjector === point || faultInjector?.[point];
  } catch {
    throw faultError(point);
  }
  if (decision === true || decision === point) throw faultError(point);
  if (decision instanceof Error) throw faultError(point);
}

function temporaryPath(directory) {
  return path.join(
    directory,
    `.full-stack-control.json.${process.pid}.${crypto.randomBytes(12).toString('hex')}.tmp`
  );
}

function closeQuietly(fsModule, descriptor) {
  if (descriptor === undefined) return;
  try {
    fsModule.closeSync(descriptor);
  } catch {}
}

function cleanupTemporary(fsModule, temporary) {
  if (!temporary) return;
  try {
    fsModule.unlinkSync(temporary);
  } catch {}
}

function confirmCurrentProfileDurability({
  profilePath,
  fsModule,
  faultInjector
}) {
  const file = normalizedAbsolutePath(
    profilePath,
    'owner_profile_profile_path_invalid'
  );
  const directory = path.dirname(file);
  let profileDescriptor;
  let directoryDescriptor;
  try {
    profileDescriptor = fsModule.openSync(file, fs.constants.O_RDONLY);
    fsModule.fsyncSync(profileDescriptor);
    fsModule.closeSync(profileDescriptor);
    profileDescriptor = undefined;
    if (typeof fs.constants.O_DIRECTORY !== 'number') {
      throw codedError('owner_profile_directory_fsync_unsupported');
    }
    directoryDescriptor = fsModule.openSync(
      directory,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY
    );
    invokeFault(faultInjector, 'parent_directory_fsync');
    fsModule.fsyncSync(directoryDescriptor);
    fsModule.closeSync(directoryDescriptor);
    directoryDescriptor = undefined;
    return {
      confirmed: true,
      errorCode: null
    };
  } catch (error) {
    return {
      confirmed: false,
      errorCode: error?.code === 'owner_profile_directory_fsync_unsupported'
        ? error.code
        : error?.code === 'owner_profile_fault_parent_directory_fsync'
          ? 'owner_profile_parent_directory_fsync_failed'
          : profileDescriptor !== undefined
            ? 'owner_profile_profile_fsync_failed'
            : 'owner_profile_parent_directory_fsync_failed'
    };
  } finally {
    closeQuietly(fsModule, profileDescriptor);
    closeQuietly(fsModule, directoryDescriptor);
  }
}

function readBackAfterCommit({
  profilePath,
  fsModule,
  expectedFingerprint,
  nextFingerprint,
  oldFingerprint,
  durabilityConfirmed,
  errorCode,
  mutated
}) {
  const current = readValidatedProfile(profilePath, fsModule);
  if (!current.valid) {
    return result({
      classification: 'COMMIT_RESULT_UNKNOWN',
      errorCode: errorCode || 'owner_profile_commit_result_unknown',
      oldFingerprint,
      nextFingerprint,
      readBackFingerprint: null,
      mutated: null,
      durabilityConfirmed: false,
      committedProfileMatchesNext: false
    });
  }
  if (!current.supported) {
    return result({
      classification: 'COMMIT_RESULT_UNKNOWN',
      errorCode: errorCode || 'owner_profile_commit_result_unknown',
      oldFingerprint,
      nextFingerprint,
      readBackFingerprint: current.fingerprint,
      mutated: null,
      durabilityConfirmed: false,
      committedProfileMatchesNext: false
    });
  }
  if (current.fingerprint === nextFingerprint) {
    return result({
      classification: durabilityConfirmed
        ? (mutated ? 'COMMITTED' : 'ALREADY_COMMITTED')
        : 'COMMITTED_WITH_UNCERTAIN_DURABILITY',
      errorCode: errorCode || null,
      oldFingerprint,
      nextFingerprint,
      readBackFingerprint: current.fingerprint,
      mutated: mutated === null ? null : mutated,
      durabilityConfirmed,
      committedProfileMatchesNext: true
    });
  }
  if (current.fingerprint === expectedFingerprint) {
    return result({
      classification: 'NOT_COMMITTED',
      errorCode: errorCode || 'owner_profile_not_committed',
      oldFingerprint,
      nextFingerprint,
      readBackFingerprint: current.fingerprint,
      mutated: false,
      durabilityConfirmed: false,
      committedProfileMatchesNext: false
    });
  }
  return result({
    classification: 'COMMIT_RESULT_UNKNOWN',
    errorCode: errorCode || 'owner_profile_post_commit_state_conflict',
    oldFingerprint,
    nextFingerprint,
    readBackFingerprint: current.fingerprint,
    mutated: null,
    durabilityConfirmed: false,
    committedProfileMatchesNext: false
  });
}

function commitOwnerProfileTransaction({
  profilePath,
  expectedCurrentFingerprint,
  nextProfile,
  fsModule = fs,
  faultInjector
} = {}) {
  const file = normalizedAbsolutePath(
    profilePath,
    'owner_profile_profile_path_invalid'
  );
  if (!FINGERPRINT_PATTERN.test(expectedCurrentFingerprint || '')) {
    throw codedError('owner_profile_expected_fingerprint_invalid');
  }
  const validatedNext = validateTransactionProfile(nextProfile);
  const nextFingerprint = fingerprintForValidatedProfile(validatedNext);
  const current = readValidatedProfile(file, fsModule);
  if (!current.valid) {
    return result({
      classification: 'INVALID_CURRENT',
      errorCode: current.errorCode,
      oldFingerprint: expectedCurrentFingerprint,
      nextFingerprint,
      readBackFingerprint: null,
      mutated: false,
      durabilityConfirmed: false,
      committedProfileMatchesNext: false,
      validationFailed: true
    });
  }
  if (!current.supported) {
    return result({
      classification: 'INVALID_CURRENT',
      errorCode: 'owner_profile_transaction_schema_unsupported',
      oldFingerprint: expectedCurrentFingerprint,
      nextFingerprint,
      readBackFingerprint: current.fingerprint,
      mutated: false,
      durabilityConfirmed: false,
      committedProfileMatchesNext: false,
      validationFailed: true
    });
  }
  if (current.fingerprint === nextFingerprint) {
    const durability = confirmCurrentProfileDurability({
      profilePath: file,
      fsModule,
      faultInjector
    });
    return result({
      classification: durability.confirmed
        ? 'ALREADY_COMMITTED'
        : 'ALREADY_COMMITTED_WITH_UNCERTAIN_DURABILITY',
      errorCode: durability.errorCode,
      oldFingerprint: expectedCurrentFingerprint,
      nextFingerprint,
      readBackFingerprint: current.fingerprint,
      mutated: false,
      durabilityConfirmed: durability.confirmed,
      committedProfileMatchesNext: true
    });
  }
  if (current.fingerprint !== expectedCurrentFingerprint) {
    return result({
      classification: 'STALE_CURRENT',
      errorCode: 'owner_profile_stale_conflict',
      oldFingerprint: expectedCurrentFingerprint,
      nextFingerprint,
      readBackFingerprint: current.fingerprint,
      mutated: false,
      durabilityConfirmed: false,
      committedProfileMatchesNext: false
    });
  }

  const directory = path.dirname(file);
  const body = Buffer.from(
    `${JSON.stringify(canonicalize(validatedNext))}\n`,
    'utf8'
  );
  const temporary = temporaryPath(directory);
  let temporaryDescriptor;
  let directoryDescriptor;
  let renameAttempted = false;
  let renamed = false;
  let directoryDurabilityConfirmed = false;
  let readbackFaulted = false;

  try {
    invokeFault(faultInjector, 'before_temp_write');
    temporaryDescriptor = fsModule.openSync(
      temporary,
      fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY,
      OWNER_FILE_MODE
    );
    fsModule.writeFileSync(temporaryDescriptor, body);
    fsModule.fsyncSync(temporaryDescriptor);
    invokeFault(faultInjector, 'after_temp_fsync');
    fsModule.closeSync(temporaryDescriptor);
    temporaryDescriptor = undefined;
    fsModule.chmodSync(temporary, OWNER_FILE_MODE);
    invokeFault(faultInjector, 'before_rename');
    renameAttempted = true;
    fsModule.renameSync(temporary, file);
    renamed = true;
    invokeFault(faultInjector, 'after_rename');
    if (typeof fs.constants.O_DIRECTORY !== 'number') {
      throw codedError('owner_profile_directory_fsync_unsupported');
    }
    directoryDescriptor = fsModule.openSync(
      directory,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY
    );
    invokeFault(faultInjector, 'parent_directory_fsync');
    fsModule.fsyncSync(directoryDescriptor);
    directoryDurabilityConfirmed = true;
    fsModule.closeSync(directoryDescriptor);
    directoryDescriptor = undefined;
    invokeFault(faultInjector, 'readback');
    return readBackAfterCommit({
      profilePath: file,
      fsModule,
      expectedFingerprint: expectedCurrentFingerprint,
      nextFingerprint,
      oldFingerprint: expectedCurrentFingerprint,
      durabilityConfirmed: true,
      mutated: true
    });
  } catch (error) {
    readbackFaulted = error?.code === 'owner_profile_fault_readback';
    closeQuietly(fsModule, temporaryDescriptor);
    closeQuietly(fsModule, directoryDescriptor);
    if (!renamed && !renameAttempted) {
      cleanupTemporary(fsModule, temporary);
      return result({
        classification: 'NOT_COMMITTED',
        errorCode: error?.code === 'owner_profile_directory_fsync_unsupported'
          ? error.code
          : 'owner_profile_not_committed',
        oldFingerprint: expectedCurrentFingerprint,
        nextFingerprint,
        readBackFingerprint: expectedCurrentFingerprint,
        mutated: false,
        durabilityConfirmed: false,
        committedProfileMatchesNext: false
      });
    }
    if (readbackFaulted) {
      return result({
        classification: 'COMMIT_RESULT_UNKNOWN',
        errorCode: 'owner_profile_commit_result_unknown',
        oldFingerprint: expectedCurrentFingerprint,
        nextFingerprint,
        readBackFingerprint: null,
        mutated: null,
        durabilityConfirmed: false,
        committedProfileMatchesNext: false
      });
    }
    return readBackAfterCommit({
      profilePath: file,
      fsModule,
      expectedFingerprint: expectedCurrentFingerprint,
      nextFingerprint,
      oldFingerprint: expectedCurrentFingerprint,
      durabilityConfirmed: directoryDurabilityConfirmed,
      errorCode: directoryDurabilityConfirmed
        ? null
        : error?.code === 'owner_profile_directory_fsync_unsupported'
          ? error.code
          : error?.code === 'owner_profile_fault_parent_directory_fsync'
            ? 'owner_profile_parent_directory_fsync_failed'
            : 'owner_profile_commit_result_unknown',
      mutated: renamed ? true : null
    });
  } finally {
    closeQuietly(fsModule, temporaryDescriptor);
    closeQuietly(fsModule, directoryDescriptor);
    if (!renamed) cleanupTemporary(fsModule, temporary);
  }
}

module.exports = {
  CURRENT_STATE,
  canonicalProfileFingerprint,
  commitOwnerProfileTransaction
};
