'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const freeze = require('../scripts/freeze-cm2124-status-sync-receipts');

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

test('CM-2124 release revalidation is pinned to the exact receipt claim window', () => {
  const receipt = {
    payload: {
      registry: {
        claimedAt: '2026-07-12T01:00:00.000Z',
        finalReleaseApprovedAt: '2026-07-12T00:00:00.000Z',
        finalReleaseExpiresAt: '2026-07-19T15:59:59.000Z'
      }
    }
  };
  assert.equal(freeze.claimBoundReviewTime(receipt).toISOString(), receipt.payload.registry.claimedAt);

  for (const claimedAt of [
    'invalid',
    '2026-07-11T23:59:59.999Z',
    receipt.payload.registry.finalReleaseExpiresAt
  ]) {
    const changed = JSON.parse(JSON.stringify(receipt));
    changed.payload.registry.claimedAt = claimedAt;
    assert.throws(() => freeze.claimBoundReviewTime(changed), /receipt_claim_time_invalid/);
  }
});

test('CM-2124 and CM-2125 clean gates see untracked files hidden by Git config', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'cm2124-clean-gate-'));
  try {
    git(['init', '--quiet'], repo);
    git(['config', 'status.showUntrackedFiles', 'no'], repo);
    fs.writeFileSync(path.join(repo, 'hidden-sentinel'), 'fixture only\n');

    for (const [modulePath, functionName, expectedError] of [
      ['scripts/freeze-cm2124-status-sync-receipts.js', 'assertCm2124FreezeCleanWorktree', 'cm2124_clean_worktree_required'],
      ['scripts/review-cm2124-status-sync-receipts.js', 'assertCm2124ReviewCleanWorktree', 'cm2124_review_clean_worktree_required'],
      ['scripts/generate-cm2125-exact-branch-cas-content-decision.js', 'assertCm2125ContentDecisionCleanWorktree', 'cm2125_content_decision_clean_worktree_required']
    ]) {
      const absoluteModule = path.join(ROOT, modulePath);
      const source = [
        `const target=require(${JSON.stringify(absoluteModule)});`,
        `try{target[${JSON.stringify(functionName)}]();process.exit(0);}`,
        `catch(error){process.stderr.write(error.message+'\\n');process.exit(1);}`
      ].join('');
      const result = spawnSync(process.execPath, ['-e', source], {
        cwd: repo,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      });
      assert.equal(result.status, 1, `${modulePath}: ${result.stderr}`);
      assert.match(result.stderr, new RegExp(expectedError), modulePath);
    }
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
