'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildPhaseF1SyncApprovalPacket
} = require('../src/core/PhaseF1SyncApprovalPacket');

test('Phase F1 sync packet renders exact non-authorizing push approval template', () => {
  const packet = buildPhaseF1SyncApprovalPacket({
    workspace: 'A:\\codex-memory',
    branch: 'main',
    remoteRef: 'origin/main',
    currentHead: '16b02bbdd5366b6108b8c476f91543c3c5e6f111',
    originHead: 'be980d157cbc88b00fc2e641bc66a527538faae9',
    ahead: 8,
    behind: 0,
    worktreeClean: true,
    commits: [
      '16b02bb docs: prepare phase f1 sync approval packet',
      'c28170a docs: prepare conditional phase f5 closeout matrix'
    ]
  });

  assert.equal(packet.status, 'PHASE_F1_SYNC_APPROVAL_PACKET_READY_NOT_EXECUTED');
  assert.equal(packet.pushCommand, 'git push origin main');
  assert.equal(packet.pushApproved, false);
  assert.equal(packet.pushExecuted, false);
  assert.equal(packet.f1LiveExecutionAllowed, false);
  assert.equal(packet.ahead, 8);
  assert.equal(packet.behind, 0);
  assert.equal(packet.worktreeClean, true);
  assert.equal(packet.failClosedReasons.length, 0);
  assert.match(packet.approvalTemplate, /normal non-force push to origin main only/);
  assert.match(packet.approvalTemplate, /no tags, no PR, no deploy, no release, no merge, no rebase/);
  assert.match(packet.approvalTemplate, /no MCP call, no real memory read\/write/);
  assert.equal(packet.safetyCounters.push, 0);
  assert.equal(packet.safetyCounters.providerCalls, 0);
  assert.equal(packet.safetyCounters.mcpCalls, 0);
  assert.equal(packet.safetyCounters.realMemoryWrites, 0);
  assert.equal(packet.safetyCounters.readinessClaims, 0);
});

test('Phase F1 sync packet fail-closes when remote has commits or worktree is dirty', () => {
  const packet = buildPhaseF1SyncApprovalPacket({
    workspace: 'A:\\codex-memory',
    branch: 'main',
    remoteRef: 'origin/main',
    currentHead: '16b02bbdd5366b6108b8c476f91543c3c5e6f111',
    originHead: 'be980d157cbc88b00fc2e641bc66a527538faae9',
    ahead: 8,
    behind: 1,
    worktreeClean: false
  });

  assert.equal(packet.pushExecuted, false);
  assert.equal(packet.f1LiveExecutionAllowed, false);
  assert.equal(packet.failClosedReasons.includes('remote_has_unmerged_commits'), true);
  assert.equal(packet.failClosedReasons.includes('dirty_worktree'), true);
  assert.equal(packet.nextRequiredAction, 'review_fail_closed_reasons_before_sync');
});
