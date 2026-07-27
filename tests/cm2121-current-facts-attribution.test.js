'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const PRE_COMPACTION_BASELINE = 'ef62d4819ece3d93cb90e2d55fa84973cf43b7d1';

test('pre-compaction Git baseline keeps CM-2117 content-only and attributes execution effects to CM-2118', () => {
  const snapshot = childProcess.execFileSync(
    'git',
    ['show', `${PRE_COMPACTION_BASELINE}:.agent_board/CURRENT_FACTS.json`],
    { cwd: repoRoot, encoding: 'utf8' }
  );
  const facts = JSON.parse(snapshot);
  const evidence = facts.evidenceBaseline;

  assert.equal(facts.schemaVersion, 4);
  assert.equal(evidence.cm2117AuthorizationContentApproved, true);
  assert.equal(evidence.cm2117ApplicationExecutionAuthorized, false);
  assert.equal(evidence.cm2117FinalExecutionReleasePresent, false);
  assert.equal(evidence.cm2117ClaimCreated, false);
  assert.equal(evidence.cm2117ApplicationExecuted, false);
  assert.equal(evidence.cm2117ApplicationCommitBound, false);

  assert.equal(evidence.cm2118FinalExecutionReleasePresent, true);
  assert.equal(evidence.cm2118ClaimCreated, true);
  assert.equal(evidence.cm2118ApplicationExecuted, true);
  assert.equal(evidence.cm2118ApplicationCommitBound, true);
  assert.equal(evidence.cm2118ApplicationClaimFinalState, 'CONSUMED_SUCCESS');
  assert.equal(evidence.cm2118ApplicationAuthorizationReplayAllowed, false);
  assert.equal(facts.planPackCompletion.readinessClaimed, false);
});
