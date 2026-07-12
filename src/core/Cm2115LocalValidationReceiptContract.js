'use strict';

const { sha256Canonical } = require('./Cm2115CanonicalFullPlanEvidenceSnapshot');

const RECEIPT_KEYS = Object.freeze([
  'schemaVersion',
  'taskId',
  'receiptType',
  'canonicalPayloadSha256',
  'payload'
]);
const PAYLOAD_KEYS = Object.freeze([
  'validationTarget',
  'commandResults',
  'evidenceSemantics',
  'currentState',
  'sideEffects',
  'nonClaims'
]);
const TARGET_KEYS_V1 = Object.freeze(['commit', 'tree', 'worktreeCleanAtStart']);
const TARGET_KEYS = Object.freeze(['commit', 'tree', 'worktreeCleanAtStart', 'worktreeCleanAfterCommands']);
const COMMAND_RESULT_KEYS = Object.freeze([
  'commandId',
  'command',
  'exitCode',
  'status',
  'tapSummaries',
  'stdoutSha256',
  'stderrSha256',
  'safeSummary'
]);
const TAP_KEYS = Object.freeze([
  'tests',
  'pass',
  'fail',
  'cancelled',
  'skipped',
  'todo'
]);
const SAFE_SUMMARY_KEYS = Object.freeze([
  'summaryOk',
  'fixtureOnly',
  'noNetwork',
  'noDaemon',
  'noProvider',
  'unsafeEnvOverrideDetected',
  'failedCheckCount',
  'checkStatusesSha256'
]);
const EVIDENCE_KEYS_V1 = Object.freeze([
  'phase1RegressionTestsPassed',
  'testAllPassed',
  'gateCiPassed',
  'snapshotContractTestsPassed'
]);
const EVIDENCE_KEYS = Object.freeze([
  'phase1RegressionTestsPassed',
  'testAllPassed',
  'gateCiPassed',
  'phase2ApplicationTestsPassed'
]);
const CURRENT_STATE_KEYS = Object.freeze([
  'phase8Completed',
  'fullPlanPackCompleted',
  'readinessClaimed'
]);
const SIDE_EFFECT_KEYS = Object.freeze([
  'nativeReads',
  'nativeWrites',
  'durableMutations',
  'providerCalls',
  'realMemoryReads',
  'remoteActions',
  'readinessClaims'
]);
const NON_CLAIM_KEYS = Object.freeze([
  'productionReady',
  'releaseReady',
  'deployReady',
  'cutoverReady',
  'rcReady',
  'completeV8',
  'fullPlanPackCompleted'
]);

const EXPECTED_COMMANDS_V1 = Object.freeze([
  Object.freeze({
    commandId: 'cm2115_snapshot_focused',
    command: 'node --test tests/cm2115-canonical-full-plan-evidence-snapshot.test.js'
  }),
  Object.freeze({
    commandId: 'test_all',
    command: 'npm run test:all'
  }),
  Object.freeze({
    commandId: 'gate_ci',
    command: 'npm run gate:ci -- --json'
  })
]);
const EXPECTED_COMMANDS = Object.freeze([
  Object.freeze({
    commandId: 'cm2115_r1_phase2_application_focused',
    command: 'node --test tests/cm2115-r1-phase2-completion-audit-application.test.js'
  }),
  Object.freeze({
    commandId: 'test_all',
    command: 'npm run test:all'
  }),
  Object.freeze({
    commandId: 'gate_ci',
    command: 'npm run gate:ci -- --json'
  })
]);

function sameKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function hex(value, length) {
  return typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`).test(value);
}

function evaluateCm2115LocalValidationReceipt(receipt) {
  const blockers = [];
  const legacyV1 = receipt?.taskId === 'CM-2115' &&
    receipt?.receiptType === 'canonical_full_plan_local_validation_receipt_v1';
  const currentV2 = receipt?.taskId === 'CM-2115-R1' &&
    receipt?.receiptType === 'canonical_full_plan_local_validation_receipt_v2';
  const expectedCommands = legacyV1 ? EXPECTED_COMMANDS_V1 : EXPECTED_COMMANDS;
  const targetKeys = legacyV1 ? TARGET_KEYS_V1 : TARGET_KEYS;
  const evidenceKeys = legacyV1 ? EVIDENCE_KEYS_V1 : EVIDENCE_KEYS;
  if (!sameKeys(receipt, RECEIPT_KEYS)) blockers.push('receipt.fields');
  if (receipt?.schemaVersion !== 1 || (!legacyV1 && !currentV2)) {
    blockers.push('receipt.identity');
  }
  if (!hex(receipt?.canonicalPayloadSha256, 64) ||
      sha256Canonical(receipt?.payload || {}) !== receipt?.canonicalPayloadSha256) {
    blockers.push('receipt.canonicalPayloadSha256');
  }
  const payload = receipt?.payload;
  if (!sameKeys(payload, PAYLOAD_KEYS)) blockers.push('payload.fields');
  if (!sameKeys(payload?.validationTarget, targetKeys) ||
      !hex(payload?.validationTarget?.commit, 40) ||
      !hex(payload?.validationTarget?.tree, 40) ||
      payload?.validationTarget?.worktreeCleanAtStart !== true ||
      (currentV2 && payload?.validationTarget?.worktreeCleanAfterCommands !== true)) {
    blockers.push('payload.validationTarget');
  }

  const results = Array.isArray(payload?.commandResults) ? payload.commandResults : [];
  if (!Array.isArray(payload?.commandResults) || results.length !== expectedCommands.length) {
    blockers.push('payload.commandResults.count');
  }
  expectedCommands.forEach((expected, index) => {
    const result = results[index];
    if (!sameKeys(result, COMMAND_RESULT_KEYS)) blockers.push(`command.fields.${expected.commandId}`);
    if (result?.commandId !== expected.commandId || result?.command !== expected.command ||
        result?.exitCode !== 0 || result?.status !== 'PASS' ||
        !hex(result?.stdoutSha256, 64) || !hex(result?.stderrSha256, 64)) {
      blockers.push(`command.result.${expected.commandId}`);
    }
    const tapSummaries = Array.isArray(result?.tapSummaries) ? result.tapSummaries : [];
    if (!Array.isArray(result?.tapSummaries) || tapSummaries.length === 0) {
      blockers.push(`command.tapSummaries.${expected.commandId}`);
    }
    for (const summary of tapSummaries) {
      if (!sameKeys(summary, TAP_KEYS) ||
          !Number.isInteger(summary.tests) || summary.tests <= 0 ||
          summary.pass !== summary.tests || summary.fail !== 0 ||
          !Number.isInteger(summary.cancelled) || summary.cancelled !== 0 ||
          !Number.isInteger(summary.skipped) || summary.skipped < 0 ||
          !Number.isInteger(summary.todo) || summary.todo < 0) {
        blockers.push(`command.tapSummary.${expected.commandId}`);
      }
    }
    if (expected.commandId === 'gate_ci') {
      if (!sameKeys(result?.safeSummary, SAFE_SUMMARY_KEYS) ||
          result?.safeSummary?.summaryOk !== true || result?.safeSummary?.fixtureOnly !== true ||
          result?.safeSummary?.noNetwork !== true || result?.safeSummary?.noDaemon !== true ||
          result?.safeSummary?.noProvider !== true ||
          result?.safeSummary?.unsafeEnvOverrideDetected !== false ||
          result?.safeSummary?.failedCheckCount !== 0 ||
          !hex(result?.safeSummary?.checkStatusesSha256, 64)) {
        blockers.push('command.safeSummary.gate_ci');
      }
    } else if (result?.safeSummary !== null) {
      blockers.push(`command.safeSummary.${expected.commandId}`);
    }
  });

  if (!sameKeys(payload?.evidenceSemantics, evidenceKeys) ||
      evidenceKeys.some(field => payload?.evidenceSemantics?.[field] !== true)) {
    blockers.push('payload.evidenceSemantics');
  }
  if (!sameKeys(payload?.currentState, CURRENT_STATE_KEYS) ||
      payload?.currentState?.phase8Completed !== true ||
      payload?.currentState?.fullPlanPackCompleted !== false ||
      payload?.currentState?.readinessClaimed !== false) {
    blockers.push('payload.currentState');
  }
  if (!sameKeys(payload?.sideEffects, SIDE_EFFECT_KEYS) ||
      SIDE_EFFECT_KEYS.some(field => payload?.sideEffects?.[field] !== 0)) {
    blockers.push('payload.sideEffects');
  }
  if (!sameKeys(payload?.nonClaims, NON_CLAIM_KEYS) ||
      NON_CLAIM_KEYS.some(field => payload?.nonClaims?.[field] !== false)) {
    blockers.push('payload.nonClaims');
  }

  const accepted = blockers.length === 0;
  return {
    accepted,
    blockers: [...new Set(blockers)],
    status: accepted
      ? 'cm2115_local_validation_receipt_accepted_for_snapshot_source_only'
      : 'cm2115_local_validation_receipt_rejected',
    phase1RegressionTestsPassed: accepted,
    testAllPassed: accepted,
    gateCiPassed: accepted,
    fullPlanPackCompleted: false,
    readinessClaimed: false
  };
}

module.exports = {
  COMMAND_RESULT_KEYS,
  CURRENT_STATE_KEYS,
  EVIDENCE_KEYS,
  EVIDENCE_KEYS_V1,
  EXPECTED_COMMANDS,
  EXPECTED_COMMANDS_V1,
  NON_CLAIM_KEYS,
  PAYLOAD_KEYS,
  RECEIPT_KEYS,
  SAFE_SUMMARY_KEYS,
  SIDE_EFFECT_KEYS,
  TAP_KEYS,
  TARGET_KEYS,
  TARGET_KEYS_V1,
  evaluateCm2115LocalValidationReceipt
};
