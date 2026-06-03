const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

const {
  RESULT_STATUS_FAILED,
  RESULT_STATUS_OK,
  runQueryQualityTempDbGate
} = require('../src/core/QueryQualityTempDbGate');

const cliPath = path.join('src', 'cli', 'query-quality-temp-db-gate.js');

function runCli(args = []) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 20000
  });
}

test('CM1415 temp DB query quality gate passes with synthetic recall records', async () => {
  const cleanupEvents = [];
  const report = await runQueryQualityTempDbGate({
    onCleanup: event => cleanupEvents.push(event)
  });

  assert.equal(report.status, RESULT_STATUS_OK);
  assert.equal(report.ok, true);
  assert.equal(report.tempDb.created, true);
  assert.equal(report.tempDb.sqliteFileName, 'codex-memory.sqlite');
  assert.equal(report.syntheticRecordsWritten, 6);
  assert.equal(report.recallPipelineExecuted, true);
  assert.equal(report.caseCount, 5);
  assert.equal(report.passedCount, 5);
  assert.equal(report.failedCount, 0);
  assert.equal(report.sideEffects.providerCalls, 0);
  assert.equal(report.sideEffects.externalProviderAllowed, false);
  assert.equal(report.sideEffects.mcpToolCalls, 0);
  assert.equal(report.sideEffects.liveMcpCalls, 0);
  assert.equal(report.sideEffects.realMemoryReads, 0);
  assert.equal(report.sideEffects.realMemoryWrites, 0);
  assert.equal(report.sideEffects.rawStoreScans, 0);
  assert.equal(report.sideEffects.durableAuditWrites, 0);
  assert.equal(report.sideEffects.publicMcpExpansion, false);
  assert.equal(report.sideEffects.configWatchdogStartupChanges, 0);
  assert.equal(report.sideEffects.remoteActions, 0);
  assert.equal(report.sideEffects.readinessClaimed, false);

  const betaCase = report.cases.find(item => item.id === 'must-contain-beta-safe');
  assert.ok(betaCase.resultIds.includes('qq-temp-beta-safe'));
  assert.equal(betaCase.resultIds.includes('qq-temp-tombstoned-hidden'), false);
  assert.equal(betaCase.resultIds.includes('qq-temp-private-claude-hidden'), false);

  assert.equal(cleanupEvents.length, 1);
  assert.equal(cleanupEvents[0].cleanupCompleted, true);
  await assert.rejects(fs.stat(cleanupEvents[0].tempBasePath), /ENOENT/);
});

test('CM1415 temp DB query quality gate fails bad top_k_order expectations', async () => {
  const report = await runQueryQualityTempDbGate({
    cases: [
      {
        id: 'bad-order',
        query: 'atlas primary decisive quality',
        target: 'process',
        limit: 5,
        expected: {
          topKOrder: ['qq-temp-alpha-secondary', 'qq-temp-alpha-primary']
        }
      }
    ]
  });

  assert.equal(report.status, RESULT_STATUS_FAILED);
  assert.equal(report.ok, false);
  assert.equal(report.failedCount, 1);
  assert.match(report.cases[0].issues.join('\n'), /top_k_order/);
});

test('CM1415 temp DB query quality gate suppresses tombstoned and cross-client private records', async () => {
  const report = await runQueryQualityTempDbGate({
    cases: [
      {
        id: 'suppression',
        query: 'hidden retrieval target',
        target: 'process',
        limit: 10,
        expected: {
          mustNotContain: [
            'qq-temp-tombstoned-hidden',
            'qq-temp-private-claude-hidden'
          ]
        }
      }
    ]
  });

  assert.equal(report.status, RESULT_STATUS_OK);
  assert.deepEqual(report.cases[0].issues, undefined);
  assert.equal(report.cases[0].resultIds.includes('qq-temp-tombstoned-hidden'), false);
  assert.equal(report.cases[0].resultIds.includes('qq-temp-private-claude-hidden'), false);
});

test('CM1415 query-quality-temp-db CLI emits JSON and exits zero on default gate', () => {
  const result = runCli(['--json']);

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, RESULT_STATUS_OK);
  assert.equal(report.ok, true);
  assert.equal(report.tempDb.created, true);
  assert.equal(report.sideEffects.providerCalls, 0);
  assert.equal(report.sideEffects.durableAuditWrites, 0);
  assert.equal(report.sideEffects.publicMcpExpansion, false);
});
