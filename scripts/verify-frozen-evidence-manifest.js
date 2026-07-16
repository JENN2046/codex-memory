#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const MANIFEST_DIRECTORY = 'docs/near-model-memory-plan-pack';
const DEFAULT_MANIFEST =
  `${MANIFEST_DIRECTORY}/cm2130_final_main_full_plan_revalidation.json`;

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

function realGitResolver(root = process.cwd()) {
  const git = (args, options = {}) => execFileSync('git', args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Frozen status surfaces can exceed Node's 1 MiB child-process default.
    // Keep this bounded while allowing the largest CM-2130 artifact to be read.
    maxBuffer: 16 * 1024 * 1024,
    ...options
  });
  return {
    resolveCommit(commit) {
      const output = git(
        ['show', '-s', '--format=%H%x00%T%x00%P%x00%s', commit],
        { encoding: 'utf8' }
      ).trim();
      const [resolvedCommit, tree, parents, subject] = output.split('\0');
      return {
        commit: resolvedCommit,
        tree,
        parents: parents.split(' ').filter(Boolean),
        subject
      };
    },
    resolveGitFile(commit, sourcePath) {
      const content = git(['show', `${commit}:${sourcePath}`]);
      const blobOid = git(['rev-parse', `${commit}:${sourcePath}`], { encoding: 'utf8' }).trim();
      return {
        blobOid,
        bytes: content.length,
        sha256: sha256(content)
      };
    },
    isCommitAncestor(ancestor, descendant) {
      const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
        cwd: root,
        stdio: 'ignore'
      });
      if (result.status === 0) return true;
      if (result.status === 1) return false;
      throw new Error('frozen_evidence_manifest_ancestor_check_failed');
    }
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
  if (manifest.canonicalPayloadSha256 !== sha256Canonical(payload)) {
    blockers.push('manifest.canonicalPayloadSha256');
  }
  const baseline = payload.baseline || {};
  const resolvedBaseline = resolver.resolveCommit(baseline.commit);
  if (resolvedBaseline.commit !== baseline.commit || resolvedBaseline.tree !== baseline.tree) {
    blockers.push('baseline.identity');
  }

  const mergeProof = Array.isArray(payload.mergeProof) ? payload.mergeProof : [];
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

  return {
    accepted: blockers.length === 0,
    blockers: [...new Set(blockers)],
    baselineCommit: baseline.commit || null,
    baselineTree: baseline.tree || null,
    mergeCount: mergeProof.length,
    artifactCount,
    repositoryWrites: 0,
    providerCalls: 0,
    memoryReads: 0,
    memoryWrites: 0,
    readinessClaimed: false
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
  MANIFEST_DIRECTORY,
  canonicalize,
  isSafeManifestPath,
  parseArgs,
  realGitResolver,
  resolveManifestPath,
  sha256Canonical,
  verifyFrozenEvidenceManifest
};
