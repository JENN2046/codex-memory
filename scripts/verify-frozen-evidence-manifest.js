#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const MANIFEST_DIRECTORY = 'docs/near-model-memory-plan-pack';
const DEFAULT_MANIFEST =
  `${MANIFEST_DIRECTORY}/cm2130_final_main_full_plan_revalidation.json`;
const SHA40 = /^[0-9a-f]{40}$/;
const DANGEROUS_GIT_ENV = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CEILING_DIRECTORIES',
  'GIT_COMMON_DIR',
  'GIT_CONFIG',
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_SYSTEM',
  'GIT_DIR',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_REPLACE_REF_BASE',
  'GIT_WORK_TREE'
];

function isSafeManifestPath(manifestPath) {
  const normalized = String(manifestPath || '').replace(/\\/g, '/');
  return normalized.startsWith(`${MANIFEST_DIRECTORY}/`) &&
    normalized.endsWith('.json') &&
    !normalized.split('/').includes('..');
}

function parseArgs(argv = []) {
  if (argv.length === 0) return { manifestPath: DEFAULT_MANIFEST };
  if (argv.length === 2 && argv[0] === '--manifest') {
    const manifestPath = String(argv[1] || '').trim();
    if (!manifestPath || path.isAbsolute(manifestPath) || !isSafeManifestPath(manifestPath)) {
      throw new Error('frozen_evidence_manifest_path_must_be_plan_pack_json');
    }
    return { manifestPath };
  }
  throw new Error('usage: verify-frozen-evidence-manifest [--manifest <safe-relative-path>]');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
  );
}

function sha256Canonical(value) {
  return sha256(JSON.stringify(canonicalize(value)));
}

function resolveManifestPath(root, manifestPath) {
  if (!isSafeManifestPath(manifestPath)) {
    throw new Error('frozen_evidence_manifest_path_must_be_plan_pack_json');
  }
  const allowedDirectory = path.resolve(root, MANIFEST_DIRECTORY);
  const resolvedPath = path.resolve(root, manifestPath);
  if (!resolvedPath.startsWith(`${allowedDirectory}${path.sep}`)) {
    throw new Error('frozen_evidence_manifest_path_outside_plan_pack');
  }
  const stat = fs.lstatSync(resolvedPath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error('frozen_evidence_manifest_must_be_regular_file');
  }
  return resolvedPath;
}

function assertSafeGitEnvironment(env = process.env) {
  const present = DANGEROUS_GIT_ENV.filter(key => env[key] !== undefined && env[key] !== '');
  if (present.length > 0) throw new Error(`frozen_evidence_dangerous_git_env:${present.join(',')}`);
}

function sanitizedGitEnvironment(env = process.env) {
  assertSafeGitEnvironment(env);
  const sanitized = Object.fromEntries(
    Object.entries(env).filter(([key]) => !key.startsWith('GIT_'))
  );
  return { ...sanitized, GIT_NO_REPLACE_OBJECTS: '1' };
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function realGitResolver(root = process.cwd(), { env = process.env } = {}) {
  const gitEnv = sanitizedGitEnvironment(env);
  const git = (args, options = {}) => execFileSync('git', args, {
    cwd: root,
    env: gitEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Frozen status surfaces can exceed Node's 1 MiB child-process default.
    // Keep this bounded while allowing the largest CM-2130 artifact to be read.
    maxBuffer: 16 * 1024 * 1024,
    ...options
  });
  const gitText = args => git(args, { encoding: 'utf8' }).trim();
  const requireOid = (oid, label) => {
    if (!SHA40.test(String(oid || ''))) throw new Error(`frozen_evidence_${label}_must_be_sha40`);
  };
  const requireObjectType = (oid, expectedType, label) => {
    requireOid(oid, label);
    if (gitText(['cat-file', '-t', oid]) !== expectedType) {
      throw new Error(`frozen_evidence_${label}_object_type_mismatch`);
    }
  };

  const topLevel = fs.realpathSync(gitText(['rev-parse', '--show-toplevel']));
  const commonDirRaw = gitText(['rev-parse', '--git-common-dir']);
  const commonDir = fs.realpathSync(path.isAbsolute(commonDirRaw)
    ? commonDirRaw
    : path.resolve(root, commonDirRaw));
  const gitDirRaw = gitText(['rev-parse', '--git-dir']);
  const gitDir = fs.realpathSync(path.isAbsolute(gitDirRaw) ? gitDirRaw : path.resolve(root, gitDirRaw));
  const normalCommonDir = path.join(topLevel, '.git');
  const trustedCommonDir = commonDir === normalCommonDir ||
    (isInside(commonDir, gitDir) && path.basename(path.dirname(gitDir)) === 'worktrees');
  if (!trustedCommonDir) throw new Error('frozen_evidence_untrusted_git_common_dir');

  const replaceRefs = gitText(['for-each-ref', '--format=%(refname)', 'refs/replace']);
  if (replaceRefs !== '') throw new Error('frozen_evidence_replace_refs_forbidden');
  const graftsPath = path.join(commonDir, 'info', 'grafts');
  if (fs.existsSync(graftsPath)) throw new Error('frozen_evidence_grafts_forbidden');
  const alternatesPath = path.join(commonDir, 'objects', 'info', 'alternates');
  if (fs.existsSync(alternatesPath)) throw new Error('frozen_evidence_alternates_forbidden');
  const objectDirectoryRaw = gitText(['rev-parse', '--git-path', 'objects']);
  const objectDirectory = fs.realpathSync(path.isAbsolute(objectDirectoryRaw)
    ? objectDirectoryRaw
    : path.resolve(root, objectDirectoryRaw));
  if (objectDirectory !== path.join(commonDir, 'objects')) {
    throw new Error('frozen_evidence_external_object_directory_forbidden');
  }

  return {
    resolveCommit(commit) {
      requireObjectType(commit, 'commit', 'commit');
      const output = git(
        ['show', '-s', '--format=%H%x00%T%x00%P%x00%s', commit],
        { encoding: 'utf8' }
      ).trim();
      const [resolvedCommit, tree, parents, subject] = output.split('\0');
      requireObjectType(tree, 'tree', 'tree');
      for (const parent of parents.split(' ').filter(Boolean)) {
        requireObjectType(parent, 'commit', 'parent');
      }
      return {
        commit: resolvedCommit,
        tree,
        parents: parents.split(' ').filter(Boolean),
        subject
      };
    },
    resolveGitFile(commit, sourcePath) {
      requireObjectType(commit, 'commit', 'commit');
      const content = git(['show', `${commit}:${sourcePath}`]);
      const blobOid = git(['rev-parse', `${commit}:${sourcePath}`], { encoding: 'utf8' }).trim();
      requireObjectType(blobOid, 'blob', 'blob');
      return {
        blobOid,
        bytes: content.length,
        sha256: sha256(content)
      };
    },
    isCommitAncestor(ancestor, descendant) {
      requireObjectType(ancestor, 'commit', 'ancestor');
      requireObjectType(descendant, 'commit', 'descendant');
      const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
        cwd: root,
        env: gitEnv,
        stdio: 'ignore'
      });
      if (result.status === 0) return true;
      if (result.status === 1) return false;
      throw new Error('frozen_evidence_manifest_ancestor_check_failed');
    },
    gitTrust: Object.freeze({
      noReplaceObjects: gitEnv.GIT_NO_REPLACE_OBJECTS === '1',
      replaceRefsAbsent: true,
      graftsAbsent: true,
      alternatesAbsent: true,
      objectDirectoryBound: true,
      commonDirTrusted: true
    })
  };
}

function sameIdentity(actual = {}, expected = {}) {
  return actual.blobOid === expected.blobOid &&
    actual.bytes === expected.bytes &&
    actual.sha256 === expected.sha256;
}

function verifyFrozenEvidenceManifest(manifest = {}, resolver) {
  const blockers = [];
  const payload = manifest && typeof manifest === 'object' ? manifest.payload : null;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { accepted: false, blockers: ['manifest.payload'], readinessClaimed: false };
  }
  if (manifest.schemaVersion !== 1) blockers.push('manifest.schemaVersion');
  if (typeof manifest.taskId !== 'string' || manifest.taskId.trim() === '') blockers.push('manifest.taskId');
  if (typeof manifest.validationId !== 'string' || manifest.validationId.trim() === '') {
    blockers.push('manifest.validationId');
  }
  if (manifest.canonicalPayloadSha256 !== sha256Canonical(payload)) {
    blockers.push('manifest.canonicalPayloadSha256');
  }
  const baseline = payload.baseline || {};
  const resolvedBaseline = resolver.resolveCommit(baseline.commit);
  if (resolvedBaseline.commit !== baseline.commit || resolvedBaseline.tree !== baseline.tree) {
    blockers.push('baseline.identity');
  }

  const mergeProof = Array.isArray(payload.mergeProof) ? payload.mergeProof : [];
  if (baseline.mergeCount !== mergeProof.length) blockers.push('baseline.mergeCount');
  if (baseline.mergeMethod !== 'regular_merge_commit_only') blockers.push('baseline.mergeMethod');
  for (const expected of mergeProof) {
    const actual = resolver.resolveCommit(expected.commit);
    if (actual.commit !== expected.commit || actual.tree !== expected.tree) {
      blockers.push(`merge.identity:${expected.pullRequest || 'unknown'}`);
    }
    if (Array.isArray(expected.parents) &&
      JSON.stringify(actual.parents) !== JSON.stringify(expected.parents)) {
      blockers.push(`merge.parents:${expected.pullRequest || 'unknown'}`);
    }
    if (expected.subject && actual.subject !== expected.subject) {
      blockers.push(`merge.subject:${expected.pullRequest || 'unknown'}`);
    }
    if (expected.regularMergeCommit !== true || actual.parents.length !== 2) {
      blockers.push(`merge.regularMergeCommit:${expected.pullRequest || 'unknown'}`);
    }
    if (expected.finalMainAncestor !== true) {
      blockers.push(`merge.finalMainAncestor:${expected.pullRequest || 'unknown'}`);
    }
    if (!resolver.isCommitAncestor(expected.commit, baseline.commit)) {
      blockers.push(`merge.ancestry:${expected.pullRequest || 'unknown'}`);
    }
  }

  const artifactGroups = [payload.evidenceArtifacts, payload.statusSurfaceArtifacts];
  let artifactCount = 0;
  for (const group of artifactGroups) {
    if (!Array.isArray(group)) {
      blockers.push('manifest.artifactGroup');
      continue;
    }
    for (const expected of group) {
      artifactCount += 1;
      const actual = resolver.resolveGitFile(baseline.commit, expected.path);
      if (!sameIdentity(actual, expected)) blockers.push(`artifact.identity:${expected.path}`);
    }
  }

  const authority = payload.currentAuthority || {};
  const authorityKeys = [
    'branchRefUpdateAuthorized', 'consumedAuthorizationReplayAuthorized', 'deployAuthorized',
    'forcePushAuthorized', 'readinessClaimAuthorized', 'releaseAuthorized', 'revalidationOnly',
    'statusSyncAuthorized'
  ];
  if (authority.revalidationOnly !== true) blockers.push('authority.revalidationOnly');
  for (const key of authorityKeys.filter(key => key !== 'revalidationOnly')) {
    if (authority[key] !== false) blockers.push(`authority.${key}`);
  }
  if (Object.keys(authority).sort().join(',') !== [...authorityKeys].sort().join(',')) {
    blockers.push('authority.exact_keys');
  }

  const sideEffects = payload.currentSideEffects || {};
  const sideEffectKeys = [
    'applicationCommits', 'branchRefUpdates', 'nativeReads', 'nativeWrites', 'providerCalls',
    'readinessClaims', 'realMemoryReads', 'receiptWrites', 'remoteActions', 'repositoryPatches'
  ];
  for (const key of sideEffectKeys) {
    if (!Number.isSafeInteger(sideEffects[key]) || sideEffects[key] < 0) {
      blockers.push(`sideEffects.${key}`);
    } else if (authority.revalidationOnly === true && sideEffects[key] !== 0) {
      blockers.push(`sideEffects.${key}.must_be_zero_for_revalidation`);
    }
  }
  if (Object.keys(sideEffects).sort().join(',') !== [...sideEffectKeys].sort().join(',')) {
    blockers.push('sideEffects.exact_keys');
  }

  const currentState = payload.currentState || {};
  const stateKeys = [
    'finalMainEvidenceRevalidated', 'fullPlanPackCompleted', 'fullPlanStatusSyncPerformed',
    'readinessClaimed', 'statusSyncStillSeparate'
  ];
  if (currentState.finalMainEvidenceRevalidated !== true) blockers.push('state.finalMainEvidenceRevalidated');
  if (currentState.fullPlanPackCompleted !== false) blockers.push('state.fullPlanPackCompleted');
  if (currentState.fullPlanStatusSyncPerformed !== false) blockers.push('state.fullPlanStatusSyncPerformed');
  if (currentState.readinessClaimed !== false) blockers.push('state.readinessClaimed');
  if (currentState.statusSyncStillSeparate !== true) blockers.push('state.statusSyncStillSeparate');
  if (Object.keys(currentState).sort().join(',') !== [...stateKeys].sort().join(',')) {
    blockers.push('state.exact_keys');
  }

  const revalidated = payload.revalidatedEvidence || {};
  const revalidatedKeys = [
    'historicalBranchCasCompleted', 'historicalBranchCasIndependentReviewPassed',
    'historicalBranchCasReceiptFreezePassed', 'historicalFullPlanApplicationApplied',
    'historicalFullPlanApplicationAuthorizationConsumed',
    'historicalFullPlanApplicationAuthorizationReplayAllowed',
    'historicalFullPlanApplicationCommitBound', 'historicalReceiptReviewPassed'
  ];
  for (const key of revalidatedKeys) {
    const expected = key === 'historicalFullPlanApplicationAuthorizationReplayAllowed' ? false : true;
    if (revalidated[key] !== expected) blockers.push(`revalidatedEvidence.${key}`);
  }
  if (Object.keys(revalidated).sort().join(',') !== [...revalidatedKeys].sort().join(',')) {
    blockers.push('revalidatedEvidence.exact_keys');
  }
  const nonClaims = payload.nonClaims || {};
  if (Object.keys(nonClaims).length === 0 || Object.values(nonClaims).some(value => value !== false)) {
    blockers.push('nonClaims.must_all_be_false');
  }
  if (typeof payload.verdict !== 'string' || !payload.verdict.endsWith('READINESS_FALSE')) {
    blockers.push('verdict.must_end_readiness_false');
  }

  const safeCounter = key => Number.isSafeInteger(sideEffects[key]) ? sideEffects[key] : null;
  const repositoryWrites = ['applicationCommits', 'branchRefUpdates', 'receiptWrites', 'repositoryPatches']
    .every(key => safeCounter(key) !== null)
    ? sideEffects.applicationCommits + sideEffects.branchRefUpdates +
      sideEffects.receiptWrites + sideEffects.repositoryPatches
    : null;
  const memoryReads = safeCounter('nativeReads') !== null && safeCounter('realMemoryReads') !== null
    ? sideEffects.nativeReads + sideEffects.realMemoryReads
    : null;

  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    baselineCommit: baseline.commit || null,
    baselineTree: baseline.tree || null,
    mergeCount: mergeProof.length,
    artifactCount,
    repositoryWrites,
    providerCalls: safeCounter('providerCalls'),
    memoryReads,
    memoryWrites: safeCounter('nativeWrites'),
    readinessClaimed: currentState.readinessClaimed === false ? false : null,
    sideEffects: canonicalize(sideEffects),
    verdict: typeof payload.verdict === 'string' ? payload.verdict : null,
    gitTrust: resolver.gitTrust || null
  };
}

function main(argv = process.argv.slice(2)) {
  const { manifestPath } = parseArgs(argv);
  const resolvedPath = resolveManifestPath(process.cwd(), manifestPath);
  const manifest = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  const result = verifyFrozenEvidenceManifest(manifest, realGitResolver());
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.accepted) process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_MANIFEST,
  DANGEROUS_GIT_ENV,
  MANIFEST_DIRECTORY,
  SHA40,
  assertSafeGitEnvironment,
  canonicalize,
  isSafeManifestPath,
  parseArgs,
  realGitResolver,
  resolveManifestPath,
  sanitizedGitEnvironment,
  sha256Canonical,
  verifyFrozenEvidenceManifest
};
