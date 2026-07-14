'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('current facts keep CM-2117 content-only and attribute execution effects to CM-2118', () => {
  const facts = JSON.parse(fs.readFileSync('.agent_board/CURRENT_FACTS.json', 'utf8'));
  const evidence = facts.evidenceBaseline;

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
