#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { createConfig } = require('../config/createConfig');
const { AuditLogStore } = require('../storage/AuditLogStore');
const {
  collectReport: collectGovernanceReport,
  buildGovernanceSurface,
  buildReadPolicySurface
} = require('./governance-report');

function parseArgs(argv = []) {
  const options = {
    json: false,
    healthUrl: '',
    logTail: 20,
    auditTail: 5,
    showRenderedOperatorArtifactText: false,
    showRenderedOperatorPacketText: false,
    showRenderedOperatorBriefText: false,
    showRenderedWideningReviewText: false,
    showRenderedWideningAdoptionText: false,
    showRenderedBoundedRecallText: false,
    showRenderedBoundedRecallCloseoutText: false,
    autoAuthorizationAssertionRecordPath: '',
    autoAuthorizationLatestReboundOutcomeClass: '',
    wideningReviewFixturePath: '',
    wideningReviewRoutingOutcomeRecordPath: '',
    wideningAdoptionFixturePath: '',
    wideningAdoptionReviewRecordPath: '',
    wideningAdoptionRecordPath: '',
    boundedRecallPreparationFixturePath: '',
    boundedRecallCloseoutFixturePath: '',
    cm0595IssuanceRecordPath: '',
    cm0595ExecutionEvidenceRecordPath: '',
    boundedRecallIssuanceRecordPath: '',
    boundedRecallExecutionEvidenceRecordPath: ''
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--rendered-operator-artifact-text') {
      options.showRenderedOperatorArtifactText = true;
      continue;
    }
    if (token === '--rendered-operator-packet-text') {
      options.showRenderedOperatorPacketText = true;
      continue;
    }
    if (token === '--rendered-operator-brief-text') {
      options.showRenderedOperatorBriefText = true;
      continue;
    }
    if (token === '--rendered-widening-review-text') {
      options.showRenderedWideningReviewText = true;
      continue;
    }
    if (token === '--rendered-widening-adoption-text') {
      options.showRenderedWideningAdoptionText = true;
      continue;
    }
    if (token === '--rendered-bounded-recall-text') {
      options.showRenderedBoundedRecallText = true;
      continue;
    }
    if (token === '--rendered-bounded-recall-closeout-text') {
      options.showRenderedBoundedRecallCloseoutText = true;
      continue;
    }
    if (token === '--health-url') {
      options.healthUrl = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--tail') {
      options.logTail = normalizePositiveInteger(argv[index + 1], options.logTail);
      index += 1;
      continue;
    }
    if (token === '--audit-tail') {
      options.auditTail = normalizePositiveInteger(argv[index + 1], options.auditTail);
      index += 1;
      continue;
    }
    if (token === '--auto-auth-assertion-record') {
      options.autoAuthorizationAssertionRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--widening-review-fixture') {
      options.wideningReviewFixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--widening-review-routing-outcome-record') {
      options.wideningReviewRoutingOutcomeRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--widening-adoption-fixture') {
      options.wideningAdoptionFixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--widening-adoption-review-record') {
      options.wideningAdoptionReviewRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--widening-adoption-record') {
      options.wideningAdoptionRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--bounded-recall-preparation-fixture') {
      options.boundedRecallPreparationFixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--bounded-recall-closeout-fixture') {
      options.boundedRecallCloseoutFixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--cm0595-issuance-record') {
      options.cm0595IssuanceRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--cm0595-execution-evidence-record') {
      options.cm0595ExecutionEvidenceRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--bounded-recall-issuance-record') {
      options.boundedRecallIssuanceRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--bounded-recall-execution-evidence-record') {
      options.boundedRecallExecutionEvidenceRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--auto-auth-latest-rebound-outcome-class') {
      options.autoAuthorizationLatestReboundOutcomeClass = String(argv[index + 1] || '').trim();
      index += 1;
    }
  }

  return options;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveHealthUrl(config, options) {
  if (options.healthUrl) return options.healthUrl;
  return `http://${config.httpHost}:${config.httpPort}/health`;
}

async function runHealthCheck(url) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url);
    const text = await response.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    return {
      status: response.ok && payload?.ok === true ? 'ok' : 'error',
      url,
      httpStatus: response.status,
      payload,
      error: null,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      status: 'error',
      url,
      httpStatus: null,
      payload: null,
      error: error.message,
      durationMs: Date.now() - startedAt
    };
  }
}

async function readFileSnapshot(filePath, tailLines) {
  try {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content
      .split(/\r?\n/)
      .map(line => line.trimEnd())
      .filter(Boolean);
    const tail = lines.slice(-tailLines);

    return {
      exists: true,
      path: filePath,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      lineCount: lines.length,
      tail
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {
        exists: false,
        path: filePath,
        size: 0,
        lastModified: null,
        lineCount: 0,
        tail: []
      };
    }

    return {
      exists: false,
      path: filePath,
      size: 0,
      lastModified: null,
      lineCount: 0,
      tail: [],
      error: error.message
    };
  }
}

function summarizeHttpLog(snapshot) {
  const errorCount = snapshot.tail.filter(line => /\bERROR\b/i.test(line)).length;
  const infoCount = snapshot.tail.filter(line => /\bINFO\b/i.test(line)).length;
  const listening = snapshot.tail.some(line => /HTTP MCP listening on/i.test(line));

  return {
    ...snapshot,
    errorCount,
    infoCount,
    listening,
    lastLine: snapshot.tail[snapshot.tail.length - 1] || null
  };
}

function summarizeWatchdogLog(snapshot) {
  const recoveryCount = snapshot.tail.filter(line => /service recovered:/i.test(line)).length;
  const ensureFailureCount = snapshot.tail.filter(line => /ensure failed/i.test(line)).length;
  const duplicateCount = snapshot.tail.filter(line => /duplicate instance/i.test(line)).length;

  return {
    ...snapshot,
    recoveryCount,
    ensureFailureCount,
    duplicateCount,
    lastLine: snapshot.tail[snapshot.tail.length - 1] || null
  };
}

function summarizeWriteAudit(entries = []) {
  const decisionBreakdown = {};
  let lastAcceptedAt = null;
  let lastRejectedAt = null;

  for (const entry of entries) {
    const decision = String(entry?.decision || 'unknown');
    decisionBreakdown[decision] = (decisionBreakdown[decision] || 0) + 1;
    if (decision === 'accepted' && !lastAcceptedAt) {
      lastAcceptedAt = entry.timestamp || null;
    }
    if (decision !== 'accepted' && !lastRejectedAt) {
      lastRejectedAt = entry.timestamp || null;
    }
  }

  return {
    recentCount: entries.length,
    decisionBreakdown,
    lastAcceptedAt,
    lastRejectedAt,
    recentEntries: entries.map(entry => ({
      timestamp: entry.timestamp || null,
      decision: entry.decision || 'unknown',
      target: entry.target || null,
      title: entry.title || null,
      memoryId: entry.memoryId || null
    }))
  };
}

function pickLaterTimestamp(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  const currentTime = new Date(current).getTime();
  const candidateTime = new Date(candidate).getTime();
  if (Number.isNaN(currentTime)) return candidate;
  if (Number.isNaN(candidateTime)) return current;
  return candidateTime > currentTime ? candidate : current;
}

function incrementBreakdown(map, key) {
  if (!key) return;
  map[key] = (map[key] || 0) + 1;
}

function isSafeScopeDimension(dimension) {
  return typeof dimension === 'string' && dimension !== 'workspace_id';
}

function summarizeRecallAudit(entries = []) {
  const recallTypeBreakdown = {};
  let lastRecallAt = null;
  const scoped = {
    scopedRecallCount: 0,
    strictScopedRecallCount: 0,
    latestScopedHitAt: null,
    scopeModeBreakdown: {},
    scopeDimensionBreakdown: {},
    projectBreakdown: {},
    clientBreakdown: {},
    visibilityBreakdown: {}
  };

  for (const entry of entries) {
    const recallType = String(entry?.recallType || 'unknown');
    recallTypeBreakdown[recallType] = (recallTypeBreakdown[recallType] || 0) + 1;
    if (!lastRecallAt) {
      lastRecallAt = entry.timestamp || null;
    }

    if (!entry?.scopeApplied) {
      continue;
    }

    scoped.scopedRecallCount += 1;
    scoped.latestScopedHitAt = pickLaterTimestamp(scoped.latestScopedHitAt, entry.timestamp || null);
    if (entry.scopeStrict) {
      scoped.strictScopedRecallCount += 1;
    }
    incrementBreakdown(scoped.scopeModeBreakdown, typeof entry.scopeMode === 'string' ? entry.scopeMode : 'unknown');
    for (const dimension of Array.isArray(entry.scopeDimensions) ? entry.scopeDimensions : []) {
      incrementBreakdown(scoped.scopeDimensionBreakdown, isSafeScopeDimension(dimension) ? dimension : null);
    }
    incrementBreakdown(scoped.projectBreakdown, typeof entry.scopeProjectId === 'string' ? entry.scopeProjectId : null);
    incrementBreakdown(scoped.clientBreakdown, typeof entry.scopeClientId === 'string' ? entry.scopeClientId : null);
    for (const visibility of Array.isArray(entry.scopeVisibility) ? entry.scopeVisibility : []) {
      incrementBreakdown(scoped.visibilityBreakdown, typeof visibility === 'string' ? visibility : null);
    }
  }

  return {
    recentCount: entries.length,
    recallTypeBreakdown,
    lastRecallAt,
    ...scoped,
    recentEntries: entries.map(entry => ({
      timestamp: entry.timestamp || null,
      target: entry.target || null,
      recallType: entry.recallType || 'unknown',
      resultCount: entry.resultCount ?? null,
      topMemoryId: entry.topMemoryId || null,
      topSourceFile: entry.topSourceFile || null
    }))
  };
}

function collectGovernance(options = {}) {
  const report = collectGovernanceReport({
    autoAuthorizationAssertionRecordPath: options.autoAuthorizationAssertionRecordPath,
    autoAuthorizationLatestReboundOutcomeClass: options.autoAuthorizationLatestReboundOutcomeClass,
    wideningReviewFixturePath: options.wideningReviewFixturePath,
    wideningReviewRoutingOutcomeRecordPath: options.wideningReviewRoutingOutcomeRecordPath,
    wideningAdoptionFixturePath: options.wideningAdoptionFixturePath,
    wideningAdoptionReviewRecordPath: options.wideningAdoptionReviewRecordPath,
    wideningAdoptionRecordPath: options.wideningAdoptionRecordPath,
    boundedRecallPreparationFixturePath: options.boundedRecallPreparationFixturePath,
    boundedRecallCloseoutFixturePath: options.boundedRecallCloseoutFixturePath,
    cm0595IssuanceRecordPath: options.cm0595IssuanceRecordPath,
    cm0595ExecutionEvidenceRecordPath: options.cm0595ExecutionEvidenceRecordPath,
    boundedRecallIssuanceRecordPath: options.boundedRecallIssuanceRecordPath,
    boundedRecallExecutionEvidenceRecordPath: options.boundedRecallExecutionEvidenceRecordPath
  });
  return {
    ...buildGovernanceSurface(report, { tolerateUnavailable: true }),
    sourceStatus: report.error ? 'unavailable' : 'ok',
    paths: report.paths || {}
  };
}

function normalizeNullableNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeWorkerLastResultSummary(summary) {
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  return {
    success: summary.success === true,
    decision: summary.decision || null,
    workerDecision: summary.workerDecision || null,
    dryRun: summary.dryRun === true,
    limit: summary.limit ?? null,
    scannedTaskCount: normalizeNullableNumber(summary.scannedTaskCount) ?? 0,
    replayedCount: normalizeNullableNumber(summary.replayedCount) ?? 0,
    wouldReplayCount: normalizeNullableNumber(summary.wouldReplayCount) ?? 0,
    clearedCount: normalizeNullableNumber(summary.clearedCount) ?? 0,
    failedCount: normalizeNullableNumber(summary.failedCount) ?? 0,
    skippedCount: normalizeNullableNumber(summary.skippedCount) ?? 0,
    hasError: summary.hasError === true
  };
}

function buildWriteReconcileWorkerRuntimeSurface(health) {
  const status = health?.payload?.runtime?.writeReconcileWorker;
  if (!status || typeof status !== 'object') {
    return {
      healthFieldAvailable: false,
      available: false,
      running: false,
      timerScheduled: false,
      tickInFlight: false,
      runCount: null,
      intervalMs: null,
      limit: null,
      dryRun: null,
      maxRuns: null,
      lastResultSummary: null,
      rawMemoryIdExposed: false
    };
  }

  return {
    healthFieldAvailable: true,
    available: status.available === true,
    running: status.running === true,
    timerScheduled: status.timerScheduled === true,
    tickInFlight: status.tickInFlight === true,
    runCount: normalizeNullableNumber(status.runCount),
    intervalMs: normalizeNullableNumber(status.intervalMs),
    limit: status.limit ?? null,
    dryRun: typeof status.dryRun === 'boolean' ? status.dryRun : null,
    maxRuns: status.maxRuns ?? null,
    lastResultSummary: normalizeWorkerLastResultSummary(status.lastResultSummary),
    rawMemoryIdExposed: JSON.stringify(status).includes('memoryId')
  };
}

function buildRuntimeSurface(health) {
  return {
    writeReconcileWorker: buildWriteReconcileWorkerRuntimeSurface(health)
  };
}

function buildSummary({ health, httpLog, watchdogLog, writeAudit, recallAudit, governance, readPolicy, runtime }) {
  const hints = [];
  let status = 'ok';
  const autoAuthorizationBundleSummary = formatAutoAuthorizationBundleSummary(governance.autoAuthorization);
  const autoAuthorizationCommandSummary = formatAutoAuthorizationCommandSummary(governance.autoAuthorization);
  const autoAuthorizationPacketSummary = formatAutoAuthorizationPacketSummary(governance.autoAuthorization);
  const autoAuthorizationInputSummary = formatAutoAuthorizationInputTraceSummary(governance.autoAuthorization);

  if (health.status !== 'ok') {
    status = 'error';
    hints.push('HTTP /health 未通过，先运行 `npm run start:http:ensure`。');
  }

  if (runtime.writeReconcileWorker.rawMemoryIdExposed === true) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push('HTTP /health 的 writeReconcileWorker 状态疑似暴露 memoryId，请先检查 bounded status surface。');
  }

  if (watchdogLog.ensureFailureCount > 0 || httpLog.errorCount > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push('最近日志里出现了 HTTP / watchdog 异常行，建议先看 `codex-memory-http.log` 和 `codex-memory-http-watchdog.log`。');
  }

  if (watchdogLog.recoveryCount > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push('watchdog 最近做过恢复，说明服务曾经掉过一次。');
  }

  if (writeAudit.recentCount === 0) {
    hints.push('最近没有 bridge audit 写入，若你在排查写记忆问题，优先核对 `record_memory` 调用链。');
  }

  if (recallAudit.recentCount === 0) {
    hints.push('最近没有 recall audit，若你在排查召回问题，优先核对 `search_memory` 或被动召回入口。');
  }

  if (governance.counts.proposalCount > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push(`${governance.counts.proposalCount} 条 proposal 仍待审查，治理层面建议跟进 review。`);
  }

  if (governance.counts.stale90d > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push(`${governance.counts.stale90d} 条 active memory 超过 90 天未更新，建议安排治理复核。`);
  } else if (governance.counts.stale30d > 0) {
    if (status === 'ok') {
      status = 'warn';
    }
    hints.push(`${governance.counts.stale30d} 条 active memory 超过 30 天未更新，可纳入常规治理观察。`);
  }

  if (governance.counts.tombstonedCount > 0 || governance.counts.supersededCount > 0 || governance.counts.supersessionInitiated > 0) {
    hints.push('治理快照里存在 tombstone/supersession 留痕，可继续保持只读跟踪。');
  }

  if (governance.autoAuthorization?.allowedGovernanceOutput === 'NO_AUTO_APPROVAL_ISSUED') {
    hints.push(`authorized write-path auto-authorization 仍是 fail-closed：${governance.autoAuthorization.currentBlockedOn || 'unspecified'}；${autoAuthorizationBundleSummary}；${autoAuthorizationCommandSummary}；${autoAuthorizationPacketSummary}；${autoAuthorizationInputSummary}`);
  } else if (governance.autoAuthorization?.allowedGovernanceOutput === 'AUTO_REUSE_CM0601_LINE_ONLY') {
    hints.push(`authorized write-path auto-authorization 最多只允许复用精确 CM-0601 line，仍不触达 CM-0595；${autoAuthorizationBundleSummary}；${autoAuthorizationCommandSummary}；${autoAuthorizationPacketSummary}；${autoAuthorizationInputSummary}。`);
  } else if (governance.autoAuthorization?.allowedGovernanceOutput === 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW') {
    hints.push(`authorized write-path auto-authorization 已可进入 widening review，但仍不自动授权 CM-0595；${autoAuthorizationBundleSummary}；${autoAuthorizationCommandSummary}；${autoAuthorizationPacketSummary}；${autoAuthorizationInputSummary}。`);
  }
  if (governance.wideningReview?.decision === 'WIDENING_REVIEW_NOT_READY') {
    hints.push(`authorized write-path widening review 仍是 fail-closed：${governance.wideningReview.failClosedReasons?.[0] || 'unspecified'}。`);
  } else if (governance.wideningReview?.decision === 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED') {
    hints.push('authorized write-path widening review 已通过 CM-0604 gate，但 adoption 尚未 granted。');
  } else if (governance.wideningReview?.decision === 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607') {
    hints.push('authorized write-path widening review 已通过并只可继续到 CM-0607 adoption record，仍不自动授权 CM-0595。');
  }
  if (governance.wideningAdoption?.decision === 'WIDENING_ADOPTION_NOT_READY') {
    hints.push(`authorized write-path widening adoption 仍是 fail-closed：${governance.wideningAdoption.failClosedReasons?.[0] || 'unspecified'}。`);
  } else if (governance.wideningAdoption?.decision === 'WIDENING_ADOPTION_DENIED') {
    hints.push('authorized write-path widening adoption 已进入显式审查，但当前仍未 granted。');
  } else if (governance.wideningAdoption?.decision === 'WIDENING_ADOPTION_GRANTED_CM0595_ONLY') {
    hints.push(`authorized write-path widening adoption 已 granted，但仍只允许 future CM-0595 narrow boundary；preview=${governance.wideningAdoption.cm0595ApprovalLinePreview?.previewUsableNow === true ? 'ready' : 'not-ready'}。`);
  }
  if (governance.boundedRecallPreparation?.decision === 'BOUNDED_RECALL_APPROVAL_NOT_READY') {
    hints.push(`authorized write-path bounded recall preparation 仍是 fail-closed：${governance.boundedRecallPreparation.failClosedReasons?.[0] || 'unspecified'}。`);
  } else if (governance.boundedRecallPreparation?.decision === 'BOUNDED_RECALL_APPROVAL_ABORTED_DRIFT') {
    hints.push('authorized write-path bounded recall preparation 已因 drift fail-closed，仍不得进入 bounded recall。');
  } else if (governance.boundedRecallPreparation?.decision === 'BOUNDED_RECALL_APPROVAL_PREPARED_EXACT_ONLY') {
    hints.push('authorized write-path bounded recall preparation 仅已准备 future exact approval；当前仍不得执行 bounded recall 或 runtime。');
  }
  if (governance.boundedRecallCloseout?.decision === 'BOUNDED_RECALL_CLOSEOUT_NOT_READY') {
    hints.push(`authorized write-path bounded recall closeout 仍是 fail-closed：${governance.boundedRecallCloseout.failClosedReasons?.[0] || 'unspecified'}。`);
  } else if (governance.boundedRecallCloseout?.decision === 'BOUNDED_RECALL_CLOSEOUT_ABORTED_DRIFT') {
    hints.push('authorized write-path bounded recall closeout 已因 drift fail-closed，仍不得准备 future runtime bounded recall approval。');
  } else if (governance.boundedRecallCloseout?.decision === 'BOUNDED_RECALL_CLOSEOUT_RECORDED_PREPARED_LATER_APPROVAL_ONLY') {
    hints.push('authorized write-path bounded recall closeout 已记录为 prepared-later-approval-only；当前仍只可准备 future exact bounded-recall runtime approval。');
  }

  if (hints.length === 0) {
    hints.push('运行态没有看到明显异常信号。');
  }

  const message = status === 'ok'
    ? 'HTTP MCP runtime looks healthy.'
    : status === 'warn'
      ? 'HTTP MCP runtime is healthy but recent logs show recoverable anomalies.'
      : 'HTTP MCP runtime is unhealthy.';

  return {
    status,
    message,
    healthStatus: health.status,
    writeReconcileWorkerHealthFieldAvailable: runtime.writeReconcileWorker.healthFieldAvailable,
    writeReconcileWorkerAvailable: runtime.writeReconcileWorker.available,
    writeReconcileWorkerRunning: runtime.writeReconcileWorker.running,
    writeReconcileWorkerTimerScheduled: runtime.writeReconcileWorker.timerScheduled,
    writeReconcileWorkerTickInFlight: runtime.writeReconcileWorker.tickInFlight,
    writeReconcileWorkerRunCount: runtime.writeReconcileWorker.runCount,
    writeReconcileWorkerRawMemoryIdExposed: runtime.writeReconcileWorker.rawMemoryIdExposed,
    httpLogErrorCount: httpLog.errorCount,
    watchdogRecoveryCount: watchdogLog.recoveryCount,
    watchdogEnsureFailureCount: watchdogLog.ensureFailureCount,
    bridgeRecentCount: writeAudit.recentCount,
    recallRecentCount: recallAudit.recentCount,
    scopedRecallCount: recallAudit.scopedRecallCount,
    strictScopedRecallCount: recallAudit.strictScopedRecallCount,
    lifecyclePolicyEnabled: readPolicy.lifecyclePolicyEnabled,
    softReadPolicyEnabled: readPolicy.softReadPolicyEnabled,
    readPolicyStatus: readPolicy.status,
    lifecyclePolicyAppliedCount: readPolicy.recentLifecyclePolicyAppliedCount,
    hiddenByLifecycleCount: readPolicy.recentHiddenByLifecycleCount,
    staleResultCount: readPolicy.recentStaleResultCount,
    lifecycleColumnAvailable: readPolicy.lifecycleColumnAvailable,
    rawWorkspaceIdExposed: readPolicy.rawWorkspaceIdExposed,
    governanceStatus: governance.status,
    governanceReviewLevel: governance.reviewLevel,
    governanceProposalCount: governance.counts.proposalCount,
    governanceStale30d: governance.counts.stale30d,
    governanceStale90d: governance.counts.stale90d,
    governanceAutoAuthorizationOutput: governance.autoAuthorization?.allowedGovernanceOutput || 'NO_AUTO_APPROVAL_ISSUED',
    governanceAutoAuthorizationBlockedOn: governance.autoAuthorization?.currentBlockedOn || null,
    governanceCm0601LineReusable: governance.autoAuthorization?.exactCm0601LineReusable === true,
    governanceWideningReviewDecision: governance.wideningReview?.decision || 'WIDENING_REVIEW_NOT_READY',
    governanceWideningReviewBlockedOn: governance.wideningReview?.failClosedReasons?.[0] || null,
    governanceWideningReviewProceedToCm0607: governance.wideningReview?.proceedToCm0607AdoptionRecord === true,
    governanceWideningAdoptionDecision: governance.wideningAdoption?.decision || 'WIDENING_ADOPTION_NOT_READY',
    governanceWideningAdoptionBlockedOn: governance.wideningAdoption?.failClosedReasons?.[0] || null,
    governanceCm0595AutoAuthorizationReady: governance.wideningAdoption?.canAutoAuthorizeCm0595 === true,
    governanceBoundedRecallPreparationDecision:
      governance.boundedRecallPreparation?.decision || 'BOUNDED_RECALL_APPROVAL_NOT_READY',
    governanceBoundedRecallPreparationBlockedOn:
      governance.boundedRecallPreparation?.failClosedReasons?.[0] || null,
    governanceBoundedRecallPrepared:
      governance.boundedRecallPreparation?.boundedRecallApprovalPrepared === true,
    governanceBoundedRecallCloseoutDecision:
      governance.boundedRecallCloseout?.decision || 'BOUNDED_RECALL_CLOSEOUT_NOT_READY',
    governanceBoundedRecallCloseoutBlockedOn:
      governance.boundedRecallCloseout?.failClosedReasons?.[0] || null,
    governanceBoundedRecallCloseoutReady:
      governance.boundedRecallCloseout?.boundedRecallCloseoutReady === true,
    hints
  };
}

function formatTextReport(report, options = {}) {
  const lines = [
    `status: ${report.summary.status}`,
    report.summary.message,
    `health: ${report.health.status} (${report.health.httpStatus ?? 'n/a'})`,
    `healthUrl: ${report.health.url}`,
    ''
  ];

  lines.push('[runtime]');
  lines.push(`  writeReconcileWorkerHealthFieldAvailable: ${report.runtime.writeReconcileWorker.healthFieldAvailable}`);
  lines.push(`  writeReconcileWorkerAvailable: ${report.runtime.writeReconcileWorker.available}`);
  lines.push(`  writeReconcileWorkerRunning: ${report.runtime.writeReconcileWorker.running}`);
  lines.push(`  writeReconcileWorkerTimerScheduled: ${report.runtime.writeReconcileWorker.timerScheduled}`);
  lines.push(`  writeReconcileWorkerTickInFlight: ${report.runtime.writeReconcileWorker.tickInFlight}`);
  lines.push(`  writeReconcileWorkerRunCount: ${report.runtime.writeReconcileWorker.runCount ?? 'n/a'}`);
  lines.push(`  writeReconcileWorkerRawMemoryIdExposed: ${report.runtime.writeReconcileWorker.rawMemoryIdExposed}`);
  lines.push('');

  lines.push('[http-log]');
  lines.push(`  path: ${report.logs.http.path}`);
  lines.push(`  exists: ${report.logs.http.exists}`);
  lines.push(`  lastModified: ${report.logs.http.lastModified || 'n/a'}`);
  lines.push(`  errorCount: ${report.logs.http.errorCount}`);
  lines.push(`  lastLine: ${report.logs.http.lastLine || 'n/a'}`);
  lines.push('');

  lines.push('[watchdog-log]');
  lines.push(`  path: ${report.logs.watchdog.path}`);
  lines.push(`  exists: ${report.logs.watchdog.exists}`);
  lines.push(`  lastModified: ${report.logs.watchdog.lastModified || 'n/a'}`);
  lines.push(`  recoveryCount: ${report.logs.watchdog.recoveryCount}`);
  lines.push(`  ensureFailureCount: ${report.logs.watchdog.ensureFailureCount}`);
  lines.push(`  lastLine: ${report.logs.watchdog.lastLine || 'n/a'}`);
  lines.push('');

  lines.push('[bridge-audit]');
  lines.push(`  path: ${report.audits.write.path}`);
  lines.push(`  exists: ${report.audits.write.exists}`);
  lines.push(`  lastModified: ${report.audits.write.lastModified || 'n/a'}`);
  lines.push(`  recentCount: ${report.audits.write.recentCount}`);
  lines.push(`  lastAcceptedAt: ${report.audits.write.lastAcceptedAt || 'n/a'}`);
  lines.push(`  decisionBreakdown: ${JSON.stringify(report.audits.write.decisionBreakdown)}`);
  lines.push('');

  lines.push('[recall-audit]');
  lines.push(`  path: ${report.audits.recall.path}`);
  lines.push(`  exists: ${report.audits.recall.exists}`);
  lines.push(`  lastModified: ${report.audits.recall.lastModified || 'n/a'}`);
  lines.push(`  recentCount: ${report.audits.recall.recentCount}`);
  lines.push(`  lastRecallAt: ${report.audits.recall.lastRecallAt || 'n/a'}`);
  lines.push(`  scopedRecallCount: ${report.audits.recall.scopedRecallCount}`);
  lines.push(`  strictScopedRecallCount: ${report.audits.recall.strictScopedRecallCount}`);
  lines.push(`  recallTypeBreakdown: ${JSON.stringify(report.audits.recall.recallTypeBreakdown)}`);
  lines.push(`  scopeModeBreakdown: ${JSON.stringify(report.audits.recall.scopeModeBreakdown)}`);
  lines.push(`  scopeDimensionBreakdown: ${JSON.stringify(report.audits.recall.scopeDimensionBreakdown)}`);
  lines.push('');

  lines.push('[read-policy]');
  lines.push(`  status: ${report.readPolicy.status}`);
  lines.push(`  lifecyclePolicyEnabled: ${report.readPolicy.lifecyclePolicyEnabled}`);
  lines.push(`  softReadPolicyEnabled: ${report.readPolicy.softReadPolicyEnabled}`);
  lines.push(`  lifecycleIncludedStatuses: ${JSON.stringify(report.readPolicy.lifecycleIncludedStatuses)}`);
  lines.push(`  lifecycleExcludedStatuses: ${JSON.stringify(report.readPolicy.lifecycleExcludedStatuses)}`);
  lines.push(`  recentHiddenByLifecycleCount: ${report.readPolicy.recentHiddenByLifecycleCount}`);
  lines.push(`  recentStaleResultCount: ${report.readPolicy.recentStaleResultCount}`);
  lines.push(`  lifecycleColumnAvailable: ${report.readPolicy.lifecycleColumnAvailable ?? 'unavailable'}`);
  lines.push(`  rawWorkspaceIdExposed: ${report.readPolicy.rawWorkspaceIdExposed}`);
  lines.push('');

  lines.push('[governance]');
  lines.push(`  status: ${report.governance.status}`);
  lines.push(`  reviewLevel: ${report.governance.reviewLevel}`);
  lines.push(`  sourceStatus: ${report.governance.sourceStatus}`);
  lines.push(`  proposals: ${report.governance.counts.proposalCount}`);
  lines.push(`  stale30d: ${report.governance.counts.stale30d}`);
  lines.push(`  stale90d: ${report.governance.counts.stale90d}`);
  lines.push(`  tombstoned: ${report.governance.counts.tombstonedCount}`);
  lines.push(`  superseded: ${report.governance.counts.supersededCount}`);
  lines.push(`  autoAuthorization: ${report.governance.autoAuthorization?.allowedGovernanceOutput || 'NO_AUTO_APPROVAL_ISSUED'}`);
  lines.push(`  autoAuthorizationStage: ${report.governance.autoAuthorization?.operatorActionPlan?.currentStage || 'unknown'}`);
  lines.push(`  autoAuthorizationBlockedOn: ${report.governance.autoAuthorization?.currentBlockedOn || 'none'}`);
  lines.push(`  autoAuthorizationBundle: ${report.governance.autoAuthorization?.artifactBundleDraft?.bundleKind || 'unknown'}`);
  lines.push(`  autoAuthorizationCommand: ${report.governance.autoAuthorization?.commandPreviewBundle?.bundleKind || 'unknown'}`);
  lines.push(`  autoAuthorizationPacket: ${report.governance.autoAuthorization?.operatorPacketDraft?.packetKind || 'unknown'}`);
  lines.push(`  autoAuthorizationDraft: ${report.governance.autoAuthorization?.renderedArtifactTextSurface?.selectedDraftId || 'unknown'}`);
  lines.push(`  autoAuthorizationPacketText: ${report.governance.autoAuthorization?.renderedOperatorPacketTextSurface?.packetKind || 'unknown'}`);
  lines.push(`  autoAuthorizationBrief: ${report.governance.autoAuthorization?.renderedOperatorBriefTextSurface?.briefKind || 'unknown'}`);
  lines.push(`  autoAuthorizationInput: ${formatAutoAuthorizationInputTraceSummary(report.governance.autoAuthorization)}`);
  lines.push(`  autoAuthorizationNextStep: ${report.governance.autoAuthorization?.operatorActionPlan?.nextStepRef || 'none'}`);
  lines.push(`  wideningReview: ${report.governance.wideningReview?.decision || 'unknown'}`);
  lines.push(`  wideningReviewStatus: ${report.governance.wideningReview?.status || 'unknown'}`);
  lines.push(`  wideningReviewBlockedOn: ${report.governance.wideningReview?.failClosedReasons?.[0] || 'none'}`);
  lines.push(`  wideningReviewNext: ${report.governance.wideningReview?.reviewRecordDraft?.nextBoundary || report.governance.wideningReview?.nextStep || 'none'}`);
  lines.push(`  wideningReviewText: ${report.governance.wideningReview?.renderedReviewTextSurface?.reviewKind || 'unknown'}`);
  lines.push(`  wideningAdoption: ${report.governance.wideningAdoption?.decision || 'unknown'}`);
  lines.push(`  wideningAdoptionStatus: ${report.governance.wideningAdoption?.status || 'unknown'}`);
  lines.push(`  wideningAdoptionBlockedOn: ${report.governance.wideningAdoption?.failClosedReasons?.[0] || 'none'}`);
  lines.push(`  wideningAdoptionNext: ${report.governance.wideningAdoption?.adoptionRecordDraft?.nextBoundary || report.governance.wideningAdoption?.nextStep || 'none'}`);
  lines.push(`  wideningAdoptionText: ${report.governance.wideningAdoption?.renderedAdoptionTextSurface?.adoptionKind || 'unknown'}`);
  lines.push(`  wideningAdoptionCm0595: ${report.governance.wideningAdoption?.cm0595ApprovalLinePreview?.previewUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.wideningAdoption?.cm0595OperatorPacketDraft?.packetKind || 'unknown'})`);
  lines.push(`  wideningAdoptionCm0595Issue: ${report.governance.wideningAdoption?.cm0595IssuanceRecordDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.wideningAdoption?.cm0595IssuanceRecordDraft?.draftKind || 'unknown'})`);
  lines.push(`  wideningAdoptionCm0595Exec: ${report.governance.wideningAdoption?.cm0595ExecutionEvidenceDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.wideningAdoption?.cm0595ExecutionEvidenceDraft?.draftKind || 'unknown'})`);
  lines.push(`  wideningAdoptionCm0595Record: ${report.governance.wideningAdoption?.cm0595IssuanceRecordInputTrace?.traceAvailable === true ? report.governance.wideningAdoption.cm0595IssuanceRecordInputTrace.sourceFileName : 'none'}`);
  lines.push(`  wideningAdoptionCm0595Evidence: ${report.governance.wideningAdoption?.cm0595ExecutionEvidenceInputTrace?.traceAvailable === true ? report.governance.wideningAdoption.cm0595ExecutionEvidenceInputTrace.sourceFileName : 'none'}`);
  lines.push(`  boundedRecallPreparation: ${report.governance.boundedRecallPreparation?.decision || 'unknown'}`);
  lines.push(`  boundedRecallPreparationStatus: ${report.governance.boundedRecallPreparation?.status || 'unknown'}`);
  lines.push(`  boundedRecallPreparationBlockedOn: ${report.governance.boundedRecallPreparation?.failClosedReasons?.[0] || 'none'}`);
  lines.push(`  boundedRecallPreparationNext: ${report.governance.boundedRecallPreparation?.nextStep || 'none'}`);
  lines.push(`  boundedRecallPreparationText: ${report.governance.boundedRecallPreparation?.renderedBoundedRecallTextSurface?.previewKind || 'unknown'}`);
  lines.push(`  boundedRecallPreparationPacket: ${report.governance.boundedRecallPreparation?.boundedRecallOperatorPacketDraft?.status || 'unknown'}`);
  lines.push(`  boundedRecallPreparationCommand: ${report.governance.boundedRecallPreparation?.boundedRecallCommandPreviewBundle?.bundleKind || 'unknown'} (${report.governance.boundedRecallPreparation?.boundedRecallCommandPreviewBundle?.resolvedRecordPathMode || 'unknown'})`);
  lines.push(`  boundedRecallPreparationIssueDraft: ${report.governance.boundedRecallPreparation?.boundedRecallApprovalIssuanceRecordDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.boundedRecallPreparation?.boundedRecallApprovalIssuanceRecordDraft?.draftKind || 'unknown'})`);
  lines.push(`  boundedRecallPreparationExecDraft: ${report.governance.boundedRecallPreparation?.boundedRecallExecutionEvidenceDraft?.draftUsableNow === true ? 'ready' : 'not-ready'} (${report.governance.boundedRecallPreparation?.boundedRecallExecutionEvidenceDraft?.draftKind || 'unknown'})`);
  lines.push(`  boundedRecallPreparationIssue: ${report.governance.boundedRecallPreparation?.cm0595IssuanceRecordInputTrace?.traceAvailable === true ? report.governance.boundedRecallPreparation.cm0595IssuanceRecordInputTrace.sourceFileName : 'none'}`);
  lines.push(`  boundedRecallPreparationEvidence: ${report.governance.boundedRecallPreparation?.cm0595ExecutionEvidenceInputTrace?.traceAvailable === true ? report.governance.boundedRecallPreparation.cm0595ExecutionEvidenceInputTrace.sourceFileName : 'none'}`);
  lines.push(`  boundedRecallCloseout: ${report.governance.boundedRecallCloseout?.decision || 'unknown'}`);
  lines.push(`  boundedRecallCloseoutStatus: ${report.governance.boundedRecallCloseout?.status || 'unknown'}`);
  lines.push(`  boundedRecallCloseoutBlockedOn: ${report.governance.boundedRecallCloseout?.failClosedReasons?.[0] || 'none'}`);
  lines.push(`  boundedRecallCloseoutNext: ${report.governance.boundedRecallCloseout?.nextStep || 'none'}`);
  lines.push(`  boundedRecallCloseoutText: ${report.governance.boundedRecallCloseout?.renderedCloseoutTextSurface?.closeoutKind || 'unknown'}`);
  lines.push(`  boundedRecallCloseoutReady: ${report.governance.boundedRecallCloseout?.boundedRecallCloseoutReady === true ? 'ready' : 'not-ready'} (${report.governance.boundedRecallCloseout?.closeoutRecordDraft?.status || 'unknown'})`);
  lines.push(`  boundedRecallCloseoutIssue: ${report.governance.boundedRecallCloseout?.boundedRecallApprovalIssuanceRecordInputTrace?.traceAvailable === true ? report.governance.boundedRecallCloseout.boundedRecallApprovalIssuanceRecordInputTrace.sourceFileName : 'none'}`);
  lines.push(`  boundedRecallCloseoutEvidence: ${report.governance.boundedRecallCloseout?.boundedRecallExecutionEvidenceInputTrace?.traceAvailable === true ? report.governance.boundedRecallCloseout.boundedRecallExecutionEvidenceInputTrace.sourceFileName : 'none'}`);
  lines.push(`  hints: ${JSON.stringify(report.governance.hints)}`);
  lines.push('');

  lines.push('[hints]');
  for (const hint of report.summary.hints) {
    lines.push(`  - ${hint}`);
  }

  if (options.showRenderedOperatorArtifactText === true && report.governance.autoAuthorization?.renderedArtifactTextSurface?.selectedDraftMarkdown) {
    lines.push('');
    lines.push('[rendered-operator-artifact-text]');
    lines.push(report.governance.autoAuthorization.renderedArtifactTextSurface.selectedDraftMarkdown.trimEnd());
  }
  if (options.showRenderedOperatorPacketText === true && report.governance.autoAuthorization?.renderedOperatorPacketTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-operator-packet-text]');
    lines.push(report.governance.autoAuthorization.renderedOperatorPacketTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedOperatorBriefText === true && report.governance.autoAuthorization?.renderedOperatorBriefTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-operator-brief-text]');
    lines.push(report.governance.autoAuthorization.renderedOperatorBriefTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedWideningReviewText === true && report.governance.wideningReview?.renderedReviewTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-widening-review-text]');
    lines.push(report.governance.wideningReview.renderedReviewTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedWideningAdoptionText === true && report.governance.wideningAdoption?.renderedAdoptionTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-widening-adoption-text]');
    lines.push(report.governance.wideningAdoption.renderedAdoptionTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedBoundedRecallText === true && report.governance.boundedRecallPreparation?.renderedBoundedRecallTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-bounded-recall-text]');
    lines.push(report.governance.boundedRecallPreparation.renderedBoundedRecallTextSurface.markdown.trimEnd());
  }
  if (options.showRenderedBoundedRecallCloseoutText === true && report.governance.boundedRecallCloseout?.renderedCloseoutTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-bounded-recall-closeout-text]');
    lines.push(report.governance.boundedRecallCloseout.renderedCloseoutTextSurface.markdown.trimEnd());
  }

  return `${lines.join('\n')}\n`;
}

function formatAutoAuthorizationBundleSummary(autoAuthorization) {
  const bundleKind = autoAuthorization?.artifactBundleDraft?.bundleKind || 'unknown';
  const nextStepRef = autoAuthorization?.operatorActionPlan?.nextStepRef || 'none';
  const draftId = autoAuthorization?.renderedArtifactTextSurface?.selectedDraftId || 'unknown';
  return `bundle=${bundleKind}, draft=${draftId}, next=${nextStepRef}`;
}

function formatAutoAuthorizationCommandSummary(autoAuthorization) {
  const commandKind = autoAuthorization?.commandPreviewBundle?.bundleKind || 'unknown';
  const primaryCommandId = autoAuthorization?.commandPreviewBundle?.primaryCommandId || 'none';
  return `cmd=${commandKind}, primary=${primaryCommandId}`;
}

function formatAutoAuthorizationPacketSummary(autoAuthorization) {
  const packetKind = autoAuthorization?.operatorPacketDraft?.packetKind || 'unknown';
  const currentStage = autoAuthorization?.operatorPacketDraft?.currentStage || 'unknown';
  return `packet=${packetKind}, stage=${currentStage}`;
}

function formatAutoAuthorizationInputTraceSummary(autoAuthorization) {
  const trace = autoAuthorization?.assertionRecordInputTrace;
  if (!trace || trace.traceAvailable !== true) {
    return 'input=default_fixture_only';
  }
  return `input=${trace.sourceFormat || 'unknown'}, file=${trace.sourceFileName || 'unknown'}, c6Accepted=${trace.assertionAcceptedForC6 === true}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = createConfig();
  const auditLogStore = new AuditLogStore(config);

  const health = await runHealthCheck(resolveHealthUrl(config, options));
  const [httpSnapshot, watchdogSnapshot, writeStats, recallStats, writeEntries, recallEntries] = await Promise.all([
    readFileSnapshot(config.httpLogPath, options.logTail),
    readFileSnapshot(path.join(config.logsDir, 'codex-memory-http-watchdog.log'), options.logTail),
    readFileSnapshot(config.auditLogPath, 1),
    readFileSnapshot(config.recallLogPath, 1),
    auditLogStore.readRecentWriteAudit(options.auditTail),
    auditLogStore.readRecentRecallAudit(options.auditTail)
  ]);

  const httpLog = summarizeHttpLog(httpSnapshot);
  const watchdogLog = summarizeWatchdogLog(watchdogSnapshot);
  const writeAudit = {
    path: config.auditLogPath,
    exists: writeStats.exists,
    size: writeStats.size,
    lastModified: writeStats.lastModified,
    ...summarizeWriteAudit(writeEntries)
  };
  const recallAudit = {
    path: config.recallLogPath,
    exists: recallStats.exists,
    size: recallStats.size,
    lastModified: recallStats.lastModified,
    ...summarizeRecallAudit(recallEntries)
  };
  const governance = collectGovernance(options);
  const readPolicy = buildReadPolicySurface({
    config,
    recallEntries,
    auditTailLimit: options.auditTail
  });
  const runtime = buildRuntimeSurface(health);

  const summary = buildSummary({
    health,
    httpLog,
    watchdogLog,
    writeAudit,
    recallAudit,
    governance,
    readPolicy,
    runtime
  });

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    health,
    config: {
      httpHost: config.httpHost,
      httpPort: config.httpPort,
      httpMcpPath: config.httpMcpPath,
      logsDir: config.logsDir
    },
    logs: {
      http: httpLog,
      watchdog: watchdogLog
    },
    runtime,
    governance,
    readPolicy,
    audits: {
      write: writeAudit,
      recall: recallAudit
    }
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(formatTextReport(report, options));
  }

  if (summary.status === 'error') {
    process.exitCode = 1;
  }
}

main().catch(error => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
