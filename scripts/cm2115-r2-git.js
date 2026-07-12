'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function gitText(args, { cwd = process.cwd() } = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024
  }).trim();
}

function gitBuffer(args, { cwd = process.cwd() } = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: null,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024
  });
}

function resolveCommitTree(commit, options) {
  return gitText(['rev-parse', `${commit}^{tree}`], options);
}

function resolveParentCommit(commit, options) {
  const fields = gitText(['rev-list', '--parents', '-n', '1', commit], options).split(/\s+/);
  if (fields.length !== 2) throw new Error('cm2115_r2_single_parent_commit_required');
  return fields[1];
}

function resolveGitPathState(sourceCommit, sourcePath, options) {
  const sourceTree = resolveCommitTree(sourceCommit, options);
  const treeLine = gitBuffer(['ls-tree', '-z', sourceCommit, '--', sourcePath], options).toString('utf8');
  if (treeLine === '') return { sourceCommit, sourceTree, sourcePath, exists: false };
  const match = treeLine.match(/^(\d{6}) (\w+) ([a-f0-9]{40})\t([^\0]+)\0$/);
  if (!match || match[4] !== sourcePath) throw new Error(`cm2115_r2_git_path_state_invalid:${sourcePath}`);
  return {
    sourceCommit,
    sourceTree,
    sourcePath,
    exists: true,
    gitMode: match[1],
    gitObjectType: match[2],
    objectOid: match[3]
  };
}

function resolveGitFile(sourceCommit, sourcePath, options) {
  const state = resolveGitPathState(sourceCommit, sourcePath, options);
  if (!state.exists || state.gitObjectType !== 'blob') {
    const error = new Error(`cm2115_r2_git_file_missing:${sourcePath}`);
    error.code = 'CM2115_R2_GIT_FILE_MISSING';
    throw error;
  }
  const content = gitBuffer(['cat-file', 'blob', state.objectOid], options);
  return {
    sourceCommit,
    sourceTree: state.sourceTree,
    sourcePath,
    gitMode: state.gitMode,
    gitObjectType: state.gitObjectType,
    blobOid: state.objectOid,
    bytes: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    content
  };
}

function resolveDiffPaths(parentCommit, commit, options) {
  const output = gitText(['diff-tree', '--no-renames', '--no-commit-id', '--name-only', '-r', parentCommit, commit], options);
  return output ? output.split('\n').filter(Boolean).sort() : [];
}

function resolveGitCommonDir(options) {
  return path.resolve(gitText(['rev-parse', '--git-common-dir'], options));
}

function resolveGovernanceRegistryRoot(options) {
  return path.join(resolveGitCommonDir(options), 'codex-memory-governance', 'phase8-one-shot-authorization-registries');
}

function ensureCleanWorktree(options) {
  if (gitText(['status', '--porcelain'], options) !== '') throw new Error('cm2115_r2_clean_worktree_required');
}

module.exports = {
  ensureCleanWorktree,
  gitBuffer,
  gitText,
  resolveCommitTree,
  resolveDiffPaths,
  resolveGitCommonDir,
  resolveGitFile,
  resolveGitPathState,
  resolveGovernanceRegistryRoot,
  resolveParentCommit
};
