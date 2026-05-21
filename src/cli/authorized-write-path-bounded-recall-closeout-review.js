#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  EXPECTED_BOUNDED_RECALL_ISSUANCE_DECISION,
  EXPECTED_BOUNDED_RECALL_EXECUTION_DECISION,
  REQUIRED_STILL_FORBIDDEN_ACTIONS,
  evaluateAuthorizedWritePathBoundedRecallCloseoutReview
} = require('../core/AuthorizedWritePathBoundedRecallCloseoutReview');
const {
  buildBoundedRecallApprovalIssuanceRecordInputTrace,
  loadBoundedRecallApprovalIssuanceRecordFile,
  validateBoundedRecallApprovalIssuanceRecord
} = require('../core/BoundedRecallApprovalIssuanceRecordAdapter');
const {
  buildBoundedRecallExecutionEvidenceInputTrace,
  loadBoundedRecallExecutionEvidenceRecordFile,
  validateBoundedRecallExecutionEvidenceRecord
} = require('../core/BoundedRecallExecutionEvidenceRecordAdapter');

const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-bounded-recall-closeout-review-v1.json'
);

const REJECTED_FLAGS = new Set([
  '--execute',
  '--record-memory',
  '--search-memory',
  '--provider',
  '--start-service',
  '--write',
  '--apply',
  '--bounded-recall',
  '--execute-bounded-recall'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    showRenderedCloseoutText: false,
    fixturePath: DEFAULT_FIXTURE_PATH,
    boundedRecallIssuanceRecordPath: '',
    boundedRecallExecutionEvidenceRecordPath: '',
    rejectedFlag: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--pretty') {
      options.pretty = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--rendered-closeout-text') {
      options.showRenderedCloseoutText = true;
      continue;
    }
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--bounded-recall-issuance-record') {
      options.boundedRecallIssuanceRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--bounded-recall-execution-evidence-record') {
      options.boundedRecallExecutionEvidenceRecordPath = path.resolve(
        argv[index + 1] || ''
      );
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
    }
  }

  return options;
}

function loadFixture(fixturePath = DEFAULT_FIXTURE_PATH) {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function prepareInput(options = {}) {
  let input = loadFixture(options.fixturePath);
  let source = 'cm0661_explicit_input_fixture_v1';
  let boundedRecallApprovalIssuanceRecordInputTrace = null;
  let boundedRecallExecutionEvidenceInputTrace = null;

  if (options.boundedRecallIssuanceRecordPath) {
    const loadResult = loadBoundedRecallApprovalIssuanceRecordFile(
      options.boundedRecallIssuanceRecordPath
    );
    const validation = validateBoundedRecallApprovalIssuanceRecord(loadResult.record);
    if (validation.valid !== true) {
      const error = new Error(
        validation.failClosedReasons?.[0] ||
          'bounded_recall_approval_issuance_record_apply_failed'
      );
      error.failClosedReason =
        validation.failClosedReasons?.[0] ||
        'bounded_recall_approval_issuance_record_apply_failed';
      throw error;
    }

    input = {
      ...input,
      targetBaseline: validation.normalized.targetBaseline || input.targetBaseline,
      boundedRecallIssuanceRecordAvailable: true,
      boundedRecallIssuanceDecision: validation.normalized.decision,
      boundedRecallIssuedExactLineMatches:
        validation.normalized.decision ===
          EXPECTED_BOUNDED_RECALL_ISSUANCE_DECISION &&
        Boolean(validation.normalized.issuedApprovalText),
      boundedRecallExecutionStartedBeforeEvidence:
        validation.normalized.boundedRecallExecutionStarted === true,
      boundedRecallIssuanceRecordId:
        validation.normalized._sourcePath || validation.normalized.issuanceRoute
    };
    source = 'cm0661_explicit_input_fixture_plus_bounded_recall_issuance_record_v1';
    boundedRecallApprovalIssuanceRecordInputTrace =
      buildBoundedRecallApprovalIssuanceRecordInputTrace({
        loadResult,
        normalizedBoundedRecallApprovalIssuanceRecord: validation.normalized
      });
  }

  if (options.boundedRecallExecutionEvidenceRecordPath) {
    const loadResult = loadBoundedRecallExecutionEvidenceRecordFile(
      options.boundedRecallExecutionEvidenceRecordPath
    );
    const validation = validateBoundedRecallExecutionEvidenceRecord(loadResult.record);
    if (validation.valid !== true) {
      const error = new Error(
        validation.failClosedReasons?.[0] ||
          'bounded_recall_execution_evidence_record_apply_failed'
      );
      error.failClosedReason =
        validation.failClosedReasons?.[0] ||
        'bounded_recall_execution_evidence_record_apply_failed';
      throw error;
    }

    const preparedExactlyOneLaterApproval =
      validation.normalized.preparedLaterApprovalLineCount === 1;
    input = {
      ...input,
      targetBaseline: validation.normalized.targetBaseline || input.targetBaseline,
      boundedRecallExecutionEvidenceAvailable: true,
      boundedRecallExecutionEvidenceDecision: validation.normalized.decision,
      preparedLaterApprovalLineCount:
        validation.normalized.preparedLaterApprovalLineCount,
      boundedRecallExecutionCount: validation.normalized.boundedRecallExecutionCount,
      boundedRecallPreparedExactlyOneLaterApproval:
        preparedExactlyOneLaterApproval,
      boundedRecallRuntimeStayedZero:
        validation.normalized.boundedRecallExecutionCount === 0,
      boundedRecallExecutionEvidenceRecordId:
        validation.normalized._sourcePath || validation.normalized.executionRoute,
      noSearchRecordProviderConfigStartupPersistenceDriftSincePreparation:
        validation.normalized.boundedRecallExecutionCount === 0,
      scopeStillLimitedToBoundedRecallPreparation: true,
      forbiddenActionsStillForbidden: true,
      stillForbiddenActions: REQUIRED_STILL_FORBIDDEN_ACTIONS
    };
    source = options.boundedRecallIssuanceRecordPath
      ? 'cm0661_explicit_input_fixture_plus_bounded_recall_issuance_record_plus_bounded_recall_execution_evidence_record_v1'
      : 'cm0661_explicit_input_fixture_plus_bounded_recall_execution_evidence_record_v1';
    boundedRecallExecutionEvidenceInputTrace =
      buildBoundedRecallExecutionEvidenceInputTrace({
        loadResult,
        normalizedBoundedRecallExecutionEvidenceRecord: validation.normalized
      });
  }

  return {
    input,
    source,
    boundedRecallApprovalIssuanceRecordInputTrace,
    boundedRecallExecutionEvidenceInputTrace
  };
}

function buildUsageText() {
  return [
    'Usage: node src/cli/authorized-write-path-bounded-recall-closeout-review.js [--json] [--pretty] [--rendered-closeout-text] [--fixture PATH] [--bounded-recall-issuance-record PATH] [--bounded-recall-execution-evidence-record PATH]',
    '',
    'This governance-only CLI evaluates whether later bounded-recall issuance/execution artifacts can be',
    'recorded as a closeout without entering bounded recall runtime execution or any runtime side effect.',
    '',
    `Expected bounded-recall issuance decision: ${EXPECTED_BOUNDED_RECALL_ISSUANCE_DECISION}`,
    `Expected bounded-recall execution decision: ${EXPECTED_BOUNDED_RECALL_EXECUTION_DECISION}`,
    `Required still-forbidden actions: ${REQUIRED_STILL_FORBIDDEN_ACTIONS.join(', ')}`
  ].join('\n');
}

function buildTextReport(report, source) {
  const lines = [
    `Status: ${report.status}`,
    `Decision: ${report.decision}`,
    `Source: ${source}`,
    `Controlling state: ${report.controllingState}`,
    `Bounded recall closeout ready: ${report.boundedRecallCloseoutReady === true ? 'yes' : 'no'}`,
    `Can prepare future bounded-recall runtime approval next: ${report.canPrepareFutureBoundedRecallRuntimeApprovalNext === true ? 'yes' : 'no'}`,
    `Can execute bounded recall now: ${report.canExecuteBoundedRecallNow === true ? 'yes' : 'no'}`,
    `Can execute runtime now: ${report.canExecuteRuntimeNow === true ? 'yes' : 'no'}`,
    `Fail-closed reasons: ${report.failClosedReasons.join(', ') || 'none'}`
  ];

  if (report.traces?.boundedRecallApprovalIssuanceRecordInputTrace?.traceAvailable === true) {
    lines.push(
      `Bounded-recall issuance input: ${report.traces.boundedRecallApprovalIssuanceRecordInputTrace.sourceFileName}`
    );
  }
  if (report.traces?.boundedRecallExecutionEvidenceInputTrace?.traceAvailable === true) {
    lines.push(
      `Bounded-recall execution-evidence input: ${report.traces.boundedRecallExecutionEvidenceInputTrace.sourceFileName}`
    );
  }
  if (report.closeoutRecordDraft?.status) {
    lines.push(`Closeout draft: ${report.closeoutRecordDraft.status}`);
  }

  return lines.join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`${buildUsageText()}\n`);
    process.exit(0);
  }

  if (options.rejectedFlag) {
    const payload = {
      status: 'error',
      decision: 'REJECTED_FLAG',
      rejectedFlag: options.rejectedFlag
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exit(1);
  }

  try {
    const prepared = prepareInput(options);
    const report = evaluateAuthorizedWritePathBoundedRecallCloseoutReview(
      prepared.input,
      {
        boundedRecallApprovalIssuanceRecordInputTrace:
          prepared.boundedRecallApprovalIssuanceRecordInputTrace,
        boundedRecallExecutionEvidenceInputTrace:
          prepared.boundedRecallExecutionEvidenceInputTrace
      }
    );

    if (options.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ...report,
            source: prepared.source,
            boundedRecallApprovalIssuanceRecordInputTrace:
              prepared.boundedRecallApprovalIssuanceRecordInputTrace,
            boundedRecallExecutionEvidenceInputTrace:
              prepared.boundedRecallExecutionEvidenceInputTrace
          },
          null,
          options.pretty ? 2 : 2
        )}\n`
      );
      return;
    }

    const blocks = [buildTextReport(report, prepared.source)];
    if (options.showRenderedCloseoutText) {
      blocks.push('[rendered-closeout-text]');
      blocks.push(report.renderedCloseoutTextSurface.markdown);
    }
    process.stdout.write(`${blocks.join('\n\n')}\n`);
  } catch (error) {
    const payload = {
      status: 'error',
      decision: 'INPUT_APPLY_FAILED',
      failClosedReason:
        error && typeof error === 'object' && 'failClosedReason' in error
          ? error.failClosedReason
          : 'input_apply_failed'
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exit(1);
  }
}

main();
