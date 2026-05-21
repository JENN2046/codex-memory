#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  EXPECTED_WIDENING_ADOPTION_DECISION,
  EXPECTED_CM0595_ISSUANCE_DECISION,
  EXPECTED_CM0595_EXECUTION_DECISION
} = require('../core/AuthorizedWritePathCm0595CloseoutReview');
const {
  evaluateAuthorizedWritePathBoundedRecallPreparationReview,
  REQUIRED_STILL_FORBIDDEN_ACTIONS
} = require('../core/AuthorizedWritePathBoundedRecallPreparationReview');
const {
  buildWideningAdoptionRecordInputTrace,
  loadWideningAdoptionRecordFile,
  validateWideningAdoptionRecord
} = require('../core/WideningAdoptionRecordAdapter');
const {
  buildCm0595ApprovalIssuanceRecordInputTrace,
  loadCm0595ApprovalIssuanceRecordFile,
  validateCm0595ApprovalIssuanceRecord
} = require('../core/Cm0595ApprovalIssuanceRecordAdapter');
const {
  buildCm0595ExecutionEvidenceInputTrace,
  loadCm0595ExecutionEvidenceRecordFile,
  validateCm0595ExecutionEvidenceRecord
} = require('../core/Cm0595ExecutionEvidenceRecordAdapter');

const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-bounded-recall-preparation-review-v1.json'
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
    showRenderedBoundedRecallText: false,
    fixturePath: DEFAULT_FIXTURE_PATH,
    wideningAdoptionRecordPath: '',
    cm0595IssuanceRecordPath: '',
    cm0595ExecutionEvidenceRecordPath: '',
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
    if (token === '--rendered-bounded-recall-text') {
      options.showRenderedBoundedRecallText = true;
      continue;
    }
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--widening-adoption-record') {
      options.wideningAdoptionRecordPath = path.resolve(argv[index + 1] || '');
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
  let source = 'cm0655_explicit_input_fixture_v1';
  let wideningAdoptionRecordInputTrace = null;
  let cm0595IssuanceRecordInputTrace = null;
  let cm0595ExecutionEvidenceInputTrace = null;

  if (options.wideningAdoptionRecordPath) {
    const loadResult = loadWideningAdoptionRecordFile(options.wideningAdoptionRecordPath);
    const validation = validateWideningAdoptionRecord(loadResult.record);
    if (validation.valid !== true) {
      const error = new Error(
        validation.failClosedReasons?.[0] || 'widening_adoption_record_apply_failed'
      );
      error.failClosedReason =
        validation.failClosedReasons?.[0] || 'widening_adoption_record_apply_failed';
      throw error;
    }

    input = {
      ...input,
      sameBaselineEndpointStartupEvidenceAvailable:
        validation.normalized.sameBaselineEndpointStartupEvidenceResult.toLowerCase() === 'accepted',
      endpointStartupEvidenceId:
        validation.normalized.sameBaselineEndpointStartupEvidenceDoc
          || input.endpointStartupEvidenceId,
      sameBaselineTokenPresentEvidenceAvailable:
        validation.normalized.sameBaselineTokenPresenceEvidenceResult.toLowerCase() === 'accepted',
      tokenPresentEvidenceSameBaseline:
        validation.normalized.sameBaselineTokenPresenceEvidenceResult.toLowerCase() === 'accepted',
      latestTokenPresentEvidenceId:
        validation.normalized.sameBaselineTokenPresenceEvidenceDoc
          || input.latestTokenPresentEvidenceId,
      wideningAdoptionGrantedCm0595Only:
        validation.normalized.decision === EXPECTED_WIDENING_ADOPTION_DECISION &&
        validation.normalized.futureAutoAuthorizationWideningAdopted === true,
      wideningAdoptionDecision: validation.normalized.decision,
      wideningAdoptionRecordId:
        validation.normalized._sourcePath || validation.normalized.sameBaselineTokenPresenceEvidenceDoc
    };
    source = 'cm0655_explicit_input_fixture_plus_widening_adoption_record_v1';
    wideningAdoptionRecordInputTrace = buildWideningAdoptionRecordInputTrace({
      loadResult,
      normalizedWideningAdoptionRecord: validation.normalized
    });
  }

  if (options.cm0595IssuanceRecordPath) {
    const loadResult = loadCm0595ApprovalIssuanceRecordFile(options.cm0595IssuanceRecordPath);
    const validation = validateCm0595ApprovalIssuanceRecord(loadResult.record);
    if (validation.valid !== true) {
      const error = new Error(
        validation.failClosedReasons?.[0] || 'cm0595_issuance_record_apply_failed'
      );
      error.failClosedReason =
        validation.failClosedReasons?.[0] || 'cm0595_issuance_record_apply_failed';
      throw error;
    }

    input = {
      ...input,
      targetBaseline: validation.normalized.targetBaseline || input.targetBaseline,
      cm0595IssuanceRecordAvailable: true,
      cm0595IssuanceDecision: validation.normalized.decision,
      cm0595IssuedExactLineMatches:
        validation.normalized.decision === EXPECTED_CM0595_ISSUANCE_DECISION,
      cm0595RuntimeExecutionStartedBeforeEvidence:
        validation.normalized.runtimeExecutionStarted === true,
      cm0595IssuanceRecordId:
        validation.normalized._sourcePath || validation.normalized.issuanceRoute
    };
    source = options.wideningAdoptionRecordPath
      ? 'cm0655_explicit_input_fixture_plus_widening_adoption_record_plus_cm0595_issuance_record_v1'
      : 'cm0655_explicit_input_fixture_plus_cm0595_issuance_record_v1';
    cm0595IssuanceRecordInputTrace = buildCm0595ApprovalIssuanceRecordInputTrace({
      loadResult,
      normalizedCm0595ApprovalIssuanceRecord: validation.normalized
    });
  }

  if (options.cm0595ExecutionEvidenceRecordPath) {
    const loadResult = loadCm0595ExecutionEvidenceRecordFile(
      options.cm0595ExecutionEvidenceRecordPath
    );
    const validation = validateCm0595ExecutionEvidenceRecord(loadResult.record);
    if (validation.valid !== true) {
      const error = new Error(
        validation.failClosedReasons?.[0] || 'cm0595_execution_evidence_record_apply_failed'
      );
      error.failClosedReason =
        validation.failClosedReasons?.[0] || 'cm0595_execution_evidence_record_apply_failed';
      throw error;
    }

    const executedExactlyOneWrite = validation.normalized.durableMemoryWriteCount === 1;
    input = {
      ...input,
      targetBaseline: validation.normalized.targetBaseline || input.targetBaseline,
      sameBaselineTokenPresentEvidenceAvailable: true,
      tokenPresentEvidenceSameBaseline: true,
      latestTokenPresentEvidenceId:
        validation.normalized.observedTokenPresenceEvidenceSource
          || input.latestTokenPresentEvidenceId,
      cm0595ExecutionEvidenceAvailable: true,
      cm0595ExecutionEvidenceDecision: validation.normalized.decision,
      cm0595DurableMemoryWriteCount: validation.normalized.durableMemoryWriteCount,
      cm0595WritePathAuditSideEffectCount:
        validation.normalized.writePathAuditSideEffectCount,
      cm0595ExecutedExactlyOneWrite: executedExactlyOneWrite,
      cm0595FailedClosedWithZeroWrites:
        validation.normalized.durableMemoryWriteCount === 0,
      cm0595ExecutionEvidenceRecordId:
        validation.normalized._sourcePath || validation.normalized.executionRoute,
      noAdditionalDurableWriteBeyondCm0595: executedExactlyOneWrite,
      boundedRecallNotYetEntered: true,
      noSearchProviderConfigStartupPersistenceDriftSinceWrite: true,
      boundedRecallPrepareOnlyScopeStillBounded: true
    };
    source = options.cm0595IssuanceRecordPath
      ? 'cm0655_explicit_input_fixture_plus_widening_adoption_record_plus_cm0595_issuance_record_plus_cm0595_execution_evidence_record_v1'
      : options.wideningAdoptionRecordPath
        ? 'cm0655_explicit_input_fixture_plus_widening_adoption_record_plus_cm0595_execution_evidence_record_v1'
        : 'cm0655_explicit_input_fixture_plus_cm0595_execution_evidence_record_v1';
    cm0595ExecutionEvidenceInputTrace = buildCm0595ExecutionEvidenceInputTrace({
      loadResult,
      normalizedCm0595ExecutionEvidenceRecord: validation.normalized
    });
  }

  return {
    input,
    source,
    wideningAdoptionRecordInputTrace,
    cm0595IssuanceRecordInputTrace,
    cm0595ExecutionEvidenceInputTrace
  };
}

function buildUsageText() {
  return [
    'Usage: node src/cli/authorized-write-path-bounded-recall-preparation-review.js [--json] [--pretty] [--rendered-bounded-recall-text] [--fixture PATH] [--widening-adoption-record PATH] [--cm0595-issuance-record PATH] [--cm0595-execution-evidence-record PATH]',
    '',
    'This governance-only CLI evaluates whether future bounded recall exact-approval preparation is auditable',
    'after later CM-0595 closeout artifacts exist, but it never issues approval and never executes bounded recall.',
    '',
    `Expected widening-adoption decision: ${EXPECTED_WIDENING_ADOPTION_DECISION}`,
    `Expected CM-0595 issuance decision: ${EXPECTED_CM0595_ISSUANCE_DECISION}`,
    `Expected CM-0595 execution decision: ${EXPECTED_CM0595_EXECUTION_DECISION}`,
    `Required still-forbidden actions: ${REQUIRED_STILL_FORBIDDEN_ACTIONS.join(', ')}`
  ].join('\n');
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    rejectedFlag,
    mutated: false,
    error: `${rejectedFlag} is outside the authorized write-path bounded-recall preparation CLI boundary.`,
    nextStep: 'Re-run without execute/write/provider/bounded-recall flags.'
  };
}

function buildReport(options = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const preparedInput = prepareInput(options);
  return {
    ...evaluateAuthorizedWritePathBoundedRecallPreparationReview(preparedInput.input, {
      wideningAdoptionRecordInputTrace:
        preparedInput.wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace:
        preparedInput.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace:
        preparedInput.cm0595ExecutionEvidenceInputTrace || null
    }),
    source: preparedInput.source,
    wideningAdoptionRecordInputTrace:
      preparedInput.wideningAdoptionRecordInputTrace || null,
    cm0595IssuanceRecordInputTrace:
      preparedInput.cm0595IssuanceRecordInputTrace || null,
    cm0595ExecutionEvidenceInputTrace:
      preparedInput.cm0595ExecutionEvidenceInputTrace || null
  };
}

function renderText(report, options = {}) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `controllingState: ${report.controllingState}`,
    `boundedRecallApprovalPrepared: ${report.boundedRecallApprovalPrepared}`,
    `canPrepareBoundedRecallExactApproval: ${report.canPrepareBoundedRecallExactApproval}`,
    `canExecuteBoundedRecallNow: ${report.canExecuteBoundedRecallNow}`,
    `canExecuteRuntimeNow: ${report.canExecuteRuntimeNow}`
  ];

  if (Array.isArray(report.boundedRecallChecklistFailures) &&
      report.boundedRecallChecklistFailures.length > 0) {
    lines.push(`boundedRecallChecklistFailures: ${report.boundedRecallChecklistFailures.join(', ')}`);
  }
  if (Array.isArray(report.failClosedReasons) && report.failClosedReasons.length > 0) {
    lines.push(`failClosedReasons: ${report.failClosedReasons.join(', ')}`);
  }
  if (report.wideningAdoptionRecordInputTrace?.sourceWorkspaceRelativePath) {
    lines.push(`wideningAdoptionRecord: ${report.wideningAdoptionRecordInputTrace.sourceWorkspaceRelativePath}`);
  }
  if (report.cm0595IssuanceRecordInputTrace?.sourceWorkspaceRelativePath) {
    lines.push(`cm0595IssuanceRecord: ${report.cm0595IssuanceRecordInputTrace.sourceWorkspaceRelativePath}`);
  }
  if (report.cm0595ExecutionEvidenceInputTrace?.sourceWorkspaceRelativePath) {
    lines.push(`cm0595ExecutionEvidenceRecord: ${report.cm0595ExecutionEvidenceInputTrace.sourceWorkspaceRelativePath}`);
  }
  if (report.boundedRecallCommandPreviewBundle?.bundleKind) {
    lines.push(`boundedRecallCommandBundle: ${report.boundedRecallCommandPreviewBundle.bundleKind}`);
  }
  if (report.boundedRecallCommandPreviewBundle?.resolvedRecordPathMode) {
    lines.push(`boundedRecallCommandPaths: ${report.boundedRecallCommandPreviewBundle.resolvedRecordPathMode}`);
  }
  if (report.boundedRecallApprovalIssuanceRecordDraft?.draftKind) {
    lines.push(`boundedRecallIssuanceDraft: ${report.boundedRecallApprovalIssuanceRecordDraft.draftKind}`);
  }
  if (report.boundedRecallExecutionEvidenceDraft?.draftKind) {
    lines.push(`boundedRecallExecutionDraft: ${report.boundedRecallExecutionEvidenceDraft.draftKind}`);
  }

  if (options.showRenderedBoundedRecallText &&
      report.renderedBoundedRecallTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-bounded-recall-text]');
    lines.push(report.renderedBoundedRecallTextSurface.markdown);
  }

  return lines.join('\n');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${buildUsageText()}\n`);
    return;
  }

  let report;
  try {
    report = buildReport(options);
  } catch (error) {
    report = {
      status: 'error',
      decision: 'BOUNDED_RECALL_APPROVAL_NOT_READY',
      controllingState: 'RC_NOT_READY_BLOCKED',
      boundedRecallApprovalPrepared: false,
      canPrepareBoundedRecallExactApproval: false,
      canExecuteBoundedRecallNow: false,
      canExecuteRuntimeNow: false,
      failClosedReasons: [error.failClosedReason || 'input_apply_failed'],
      error: error.message,
      mutated: false
    };
  }

  if (options.json) {
    const spacing = options.pretty ? 2 : 0;
    process.stdout.write(`${JSON.stringify(report, null, spacing)}\n`);
    if (report.status === 'error') {
      process.exitCode = 1;
    }
    return;
  }

  process.stdout.write(`${renderText(report, options)}\n`);
  if (report.status === 'error') {
    process.exitCode = 1;
  }
}

main();
