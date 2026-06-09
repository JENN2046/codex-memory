'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_PUBLIC_TOOLS,
  buildPhaseF1Plan,
  runPhaseF1LiveClientNoWriteEvidence
} = require('../src/core/PhaseF1LiveClientNoWriteEvidenceRunner');

const COMMIT = 'be980d157cbc88b00fc2e641bc66a527538faae9';
const ENDPOINT = 'http://127.0.0.1:7605';
const APPROVAL = `I approve A5-GAP-4 live-client no-write contract refresh for codex-memory on branch main at commit ${COMMIT}, endpoint ${ENDPOINT}, using current-session bearer token if already present, without printing or persisting token material, allow tools/call memory_overview and no-token rejection checks for record_memory/search_memory only, no provider, no durable write, no config/watchdog/startup change.`;
const CLEAN_CURRENT_FACTS = {
  currentBranch: 'main',
  currentHead: COMMIT,
  originHead: COMMIT,
  dirtyStatusLineCount: 0
};

test('Phase F1 runner public tools expectation matches current seven-tool surface', () => {
  assert.deepEqual(REQUIRED_PUBLIC_TOOLS, [
    'audit_memory',
    'memory_overview',
    'record_memory',
    'search_memory',
    'supersede_memory',
    'tombstone_memory',
    'validate_memory'
  ]);
});

test('Phase F1 plan accepts current exact no-write approval without executing', () => {
  const plan = buildPhaseF1Plan({
    branch: 'main',
    commit: COMMIT,
    endpoint: ENDPOINT,
    approvalLine: APPROVAL
  });

  assert.equal(plan.status, 'PHASE_F1_LIVE_CLIENT_NO_WRITE_PLAN_READY_NOT_EXECUTED');
  assert.equal(plan.approvalAccepted, true);
  assert.equal(plan.liveClientRefreshExecuted, false);
  assert.equal(plan.safetyCounters.providerCalls, 0);
  assert.equal(plan.safetyCounters.durableMemoryWrites, 0);
  assert.equal(plan.safetyCounters.durableAuditWrites, 0);
  assert.equal(plan.runtimeReady, false);
  assert.equal(plan.rcReady, false);
});

test('Phase F1 plan rejects endpoint drift fail-closed', () => {
  const plan = buildPhaseF1Plan({
    branch: 'main',
    commit: COMMIT,
    endpoint: 'http://127.0.0.1:7606/mcp/codex-memory',
    approvalLine: APPROVAL
  });

  assert.equal(plan.approvalAccepted, false);
  assert.equal(plan.failClosedReasons.includes('endpoint_mismatch'), true);
  assert.equal(plan.liveClientRefreshExecuted, false);
});

test('Phase F1 execution blocks before network when token is missing', async () => {
  const report = await runPhaseF1LiveClientNoWriteEvidence({
    branch: 'main',
    commit: COMMIT,
    endpoint: ENDPOINT,
    approvalLine: APPROVAL,
    currentFacts: CLEAN_CURRENT_FACTS,
    execute: true,
    bearerToken: '',
    httpJsonClient: async () => {
      throw new Error('should not call HTTP JSON client');
    },
    healthClient: async () => {
      throw new Error('should not call health client');
    }
  });

  assert.equal(report.status, 'PHASE_F1_LIVE_CLIENT_NO_WRITE_EXECUTION_BLOCKED_FAIL_CLOSED');
  assert.equal(report.liveClientRefreshExecuted, false);
  assert.equal(report.failClosedReasons.includes('missing_current_session_bearer_token'), true);
});

test('Phase F1 execution blocks before network when current facts are missing', async () => {
  const report = await runPhaseF1LiveClientNoWriteEvidence({
    branch: 'main',
    commit: COMMIT,
    endpoint: ENDPOINT,
    approvalLine: APPROVAL,
    execute: true,
    bearerToken: 'present-token',
    httpJsonClient: async () => {
      throw new Error('should not call HTTP JSON client');
    },
    healthClient: async () => {
      throw new Error('should not call health client');
    }
  });

  assert.equal(report.status, 'PHASE_F1_LIVE_CLIENT_NO_WRITE_PLAN_REJECTED_FAIL_CLOSED');
  assert.equal(report.liveClientRefreshExecuted, false);
  assert.equal(report.failClosedReasons.includes('missing_current_branch'), true);
  assert.equal(report.failClosedReasons.includes('missing_current_head'), true);
  assert.equal(report.failClosedReasons.includes('missing_origin_head'), true);
  assert.equal(report.failClosedReasons.includes('missing_dirty_status_line_count'), true);
});

test('Phase F1 execution blocks before network when current facts drift', async () => {
  const report = await runPhaseF1LiveClientNoWriteEvidence({
    branch: 'main',
    commit: COMMIT,
    endpoint: ENDPOINT,
    approvalLine: APPROVAL,
    currentFacts: {
      currentBranch: 'main',
      currentHead: COMMIT,
      originHead: '4fc75d68b79d2fe2bee7bcb576360b508cacb5c6',
      dirtyStatusLineCount: 1
    },
    execute: true,
    bearerToken: 'present-token',
    httpJsonClient: async () => {
      throw new Error('should not call HTTP JSON client');
    },
    healthClient: async () => {
      throw new Error('should not call health client');
    }
  });

  assert.equal(report.approvalAccepted, false);
  assert.equal(report.liveClientRefreshExecuted, false);
  assert.equal(report.failClosedReasons.includes('local_origin_head_mismatch'), true);
  assert.equal(report.failClosedReasons.includes('dirty_worktree'), true);
});

test('Phase F1 execution blocks before network when runtime fingerprint expectation is missing', async () => {
  const report = await runPhaseF1LiveClientNoWriteEvidence({
    branch: 'main',
    commit: COMMIT,
    endpoint: ENDPOINT,
    approvalLine: APPROVAL,
    currentFacts: CLEAN_CURRENT_FACTS,
    execute: true,
    bearerToken: 'present-token',
    httpJsonClient: async () => {
      throw new Error('should not call HTTP JSON client');
    },
    healthClient: async () => {
      throw new Error('should not call health client');
    }
  });

  assert.equal(report.status, 'PHASE_F1_LIVE_CLIENT_NO_WRITE_EXECUTION_BLOCKED_FAIL_CLOSED');
  assert.equal(report.liveClientRefreshExecuted, false);
  assert.equal(report.failClosedReasons.includes('missing_expected_runtime_source_fingerprint'), true);
});

test('Phase F1 injected execution captures sanitized no-write evidence', async () => {
  const calls = [];
  const report = await runPhaseF1LiveClientNoWriteEvidence({
    branch: 'main',
    commit: COMMIT,
    endpoint: ENDPOINT,
    approvalLine: APPROVAL,
    currentFacts: CLEAN_CURRENT_FACTS,
    execute: true,
    expectedRuntimeSourceFingerprint: 'expected-runtime-fingerprint',
    bearerToken: 'secret-token-that-must-not-appear',
    healthClient: async () => ({
      status: 200,
      payload: {
        ok: true,
        service: 'vcp_codex_memory',
        auth: { required: true },
        runtimeFreshness: {
          sourceFingerprint: 'expected-runtime-fingerprint',
          sourceFileCount: 7
        },
        runtime: { writeReconcileWorker: { running: false } }
      }
    }),
    httpJsonClient: async request => {
      calls.push({
        bearerTokenPassed: Boolean(request.bearerToken),
        method: request.body.method,
        tool: request.body.params?.name || ''
      });
      if (request.body.method === 'initialize') {
        return {
          status: 200,
          payload: {
            result: {
              protocolVersion: '2025-06-18',
              serverInfo: { name: 'vcp_codex_memory', version: '0.1.0' }
            }
          }
        };
      }
      if (request.body.method === 'tools/list') {
        return {
          status: 200,
          payload: {
            result: {
              tools: [
                { name: 'audit_memory' },
                { name: 'memory_overview' },
                { name: 'record_memory' },
                { name: 'search_memory' },
                { name: 'supersede_memory' },
                { name: 'tombstone_memory' },
                { name: 'validate_memory' }
              ]
            }
          }
        };
      }
      if (request.body.params?.name === 'memory_overview' && request.bearerToken) {
        return {
          status: 200,
          payload: {
            result: {
              isError: false,
              structuredContent: {
                summary: { total: 0 },
                shadowSync: { available: true }
              }
            }
          }
        };
      }
      if (request.body.params?.name === 'memory_overview') {
        return {
          status: 200,
          payload: {
            result: {
              isError: false,
              structuredContent: {
                access: {
                  mode: 'public_selected_overview',
                  selectedProjection: true,
                  selectedProjectionVersion: 2,
                  pathsReturned: false,
                  recentAuditReturned: false,
                  memoryLinksReturned: false,
                  recallRecentReturned: false,
                  detailFieldsReturned: false
                }
              }
            }
          }
        };
      }
      if (request.body.params?.name === 'record_memory') {
        return {
          status: 403,
          payload: {
            error: {
              code: -32001,
              data: { code: 'PUBLIC_REQUEST_BLOCKED' }
            }
          }
        };
      }
      return {
        status: 403,
        payload: {
          error: {
            code: -32001,
            data: { code: 'PUBLIC_REQUEST_BLOCKED' }
          }
        }
      };
    }
  });

  assert.equal(report.status, 'PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY');
  assert.equal(report.evidenceAccepted, true);
  assert.equal(report.evidence.health.runtimeFreshness.matchesExpected, true);
  assert.equal(report.liveClientRefreshExecuted, true);
  assert.equal(report.tokenMaterialPrinted, false);
  assert.equal(report.tokenMaterialPersisted, false);
  assert.equal(JSON.stringify(report).includes('secret-token-that-must-not-appear'), false);
  assert.equal(report.evidence.toolsList.publicToolsFrozen, true);
  assert.equal(report.evidence.toolsList.publicToolCount, 7);
  assert.deepEqual(report.evidence.toolsList.publicTools, REQUIRED_PUBLIC_TOOLS);
  assert.equal(report.evidence.noTokenOverview.ok, true);
  assert.equal(report.evidence.noTokenRecordMemory.rejected, true);
  assert.equal(report.evidence.noTokenSearchMemory.rejected, true);
  assert.equal(report.safetyCounters.providerCalls, 0);
  assert.equal(report.safetyCounters.durableMemoryWrites, 0);
  assert.equal(report.safetyCounters.durableAuditWrites, 0);
  assert.equal(report.runtimeReady, false);
  assert.equal(report.rcReady, false);
  assert.deepEqual(calls.map(call => call.method || call.tool), [
    'initialize',
    'tools/list',
    'tools/call',
    'tools/call',
    'tools/call',
    'tools/call'
  ]);
});
