#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  EXPECTED_WIDENING_REVIEW_DECISION,
  REQUIRED_STILL_FORBIDDEN_ACTIONS,
  evaluateAuthorizedWritePathWideningAdoptionReview
} = require('../core/AuthorizedWritePathWideningAdoptionReview');
const {
  applyWideningReviewOutcomeRecordToAdoptionInput,
  buildWideningReviewRecordInputTrace,
  loadWideningReviewOutcomeRecordFile
} = require('../core/WideningReviewOutcomeRecordAdapter');
const {
  applyWideningAdoptionRecordToAdoptionInput,
  buildWideningAdoptionRecordInputTrace,
  loadWideningAdoptionRecordFile
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
  'authorized-write-path-widening-adoption-review-v1.json'
);

const REJECTED_FLAGS = new Set([
  '--execute',
  '--record-memory',
  '--search-memory',
  '--provider',
  '--start-service',
  '--write',
  '--apply',
  '--cm0595'
]);

function parseArgs(argv = []) {
  const options = {
    json: false,
    pretty: false,
    help: false,
    showRenderedAdoptionText: false,
    fixturePath: DEFAULT_FIXTURE_PATH,
    wideningReviewRecordPath: '',
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
    if (token === '--rendered-adoption-text') {
      options.showRenderedAdoptionText = true;
      continue;
    }
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--widening-review-record') {
      options.wideningReviewRecordPath = path.resolve(argv[index + 1] || '');
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
  const fixture = loadFixture(options.fixturePath);
  let input = fixture;
  let source = 'cm0646_explicit_input_fixture_v1';
  let wideningReviewRecordInputTrace = null;
  let wideningAdoptionRecordInputTrace = null;
  let cm0595IssuanceRecordInputTrace = null;
  let cm0595ExecutionEvidenceInputTrace = null;

  if (options.wideningReviewRecordPath) {
    const loadResult = loadWideningReviewOutcomeRecordFile(options.wideningReviewRecordPath);
    const adapted = applyWideningReviewOutcomeRecordToAdoptionInput(input, loadResult.record);
    if (adapted.ok !== true) {
      const error = new Error(adapted.failClosedReasons?.[0] || 'widening_review_record_apply_failed');
      error.failClosedReason = adapted.failClosedReasons?.[0] || 'widening_review_record_apply_failed';
      throw error;
    }

    input = adapted.mergedInput;
    source = 'cm0646_explicit_input_fixture_plus_widening_review_record_v1';
    wideningReviewRecordInputTrace = buildWideningReviewRecordInputTrace({
      loadResult,
      normalizedWideningReviewRecord: adapted.normalizedWideningReviewRecord
    });
  }

  if (options.wideningAdoptionRecordPath) {
    const loadResult = loadWideningAdoptionRecordFile(options.wideningAdoptionRecordPath);
    const adapted = applyWideningAdoptionRecordToAdoptionInput(input, loadResult.record);
    if (adapted.ok !== true) {
      const error = new Error(adapted.failClosedReasons?.[0] || 'widening_adoption_record_apply_failed');
      error.failClosedReason = adapted.failClosedReasons?.[0] || 'widening_adoption_record_apply_failed';
      throw error;
    }

    input = adapted.mergedInput;
    source = options.wideningReviewRecordPath
      ? 'cm0647_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_v1'
      : 'cm0647_explicit_input_fixture_plus_widening_adoption_record_v1';
    wideningAdoptionRecordInputTrace = buildWideningAdoptionRecordInputTrace({
      loadResult,
      normalizedWideningAdoptionRecord: adapted.normalizedWideningAdoptionRecord
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

    source = options.wideningAdoptionRecordPath
      ? 'cm0652_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_issuance_record_v1'
      : options.wideningReviewRecordPath
        ? 'cm0652_explicit_input_fixture_plus_widening_review_record_plus_cm0595_issuance_record_v1'
        : 'cm0652_explicit_input_fixture_plus_cm0595_issuance_record_v1';
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

    source = options.cm0595IssuanceRecordPath
      ? 'cm0653_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_issuance_record_plus_cm0595_execution_evidence_record_v1'
      : options.wideningAdoptionRecordPath
        ? 'cm0653_explicit_input_fixture_plus_widening_review_record_plus_widening_adoption_record_plus_cm0595_execution_evidence_record_v1'
        : options.wideningReviewRecordPath
          ? 'cm0653_explicit_input_fixture_plus_widening_review_record_plus_cm0595_execution_evidence_record_v1'
          : 'cm0653_explicit_input_fixture_plus_cm0595_execution_evidence_record_v1';
    cm0595ExecutionEvidenceInputTrace = buildCm0595ExecutionEvidenceInputTrace({
      loadResult,
      normalizedCm0595ExecutionEvidenceRecord: validation.normalized
    });
  }

  return {
    input,
    source,
    wideningReviewRecordInputTrace,
    wideningAdoptionRecordInputTrace,
    cm0595IssuanceRecordInputTrace,
    cm0595ExecutionEvidenceInputTrace
  };
}

function buildUsageText() {
  return [
    'Usage: node src/cli/authorized-write-path-widening-adoption-review.js [--json] [--pretty] [--rendered-adoption-text] [--fixture PATH] [--widening-review-record PATH] [--widening-adoption-record PATH] [--cm0595-issuance-record PATH] [--cm0595-execution-evidence-record PATH]',
    '',
    'This governance-only CLI evaluates whether a widened auto-authorization decision may ever grant CM-0595 only,',
    'but it never issues approval, never executes CM-0595, and never auto-executes record_memory.',
    '',
    `Expected widening-review decision: ${EXPECTED_WIDENING_REVIEW_DECISION}`,
    `Required still-forbidden actions: ${REQUIRED_STILL_FORBIDDEN_ACTIONS.join(', ')}`
  ].join('\n');
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    rejectedFlag,
    mutated: false,
    error: `${rejectedFlag} is outside the authorized write-path widening-adoption CLI boundary.`,
    nextStep: 'Re-run without execute/write/provider/start-service/CM-0595 flags.'
  };
}

function buildReport(options = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const preparedInput = prepareInput(options);
  return {
    ...evaluateAuthorizedWritePathWideningAdoptionReview(preparedInput.input, {
      wideningReviewRecordInputTrace: preparedInput.wideningReviewRecordInputTrace || null,
      wideningAdoptionRecordInputTrace: preparedInput.wideningAdoptionRecordInputTrace || null,
      cm0595IssuanceRecordInputTrace: preparedInput.cm0595IssuanceRecordInputTrace || null,
      cm0595ExecutionEvidenceInputTrace: preparedInput.cm0595ExecutionEvidenceInputTrace || null
    }),
    source: preparedInput.source,
    wideningReviewRecordInputTrace: preparedInput.wideningReviewRecordInputTrace || null,
    wideningAdoptionRecordInputTrace: preparedInput.wideningAdoptionRecordInputTrace || null,
    cm0595IssuanceRecordInputTrace: preparedInput.cm0595IssuanceRecordInputTrace || null,
    cm0595ExecutionEvidenceInputTrace: preparedInput.cm0595ExecutionEvidenceInputTrace || null
  };
}

function renderText(report, options = {}) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `controllingState: ${report.controllingState}`,
    `adoptionPrerequisitesSatisfied: ${report.adoptionPrerequisitesSatisfied}`,
    `cm0607AdoptionRecordReady: ${report.cm0607AdoptionRecordReady}`,
    `renderedAdoptionTextSurfaceAvailable: ${report.renderedAdoptionTextSurface?.previewAvailable === true}`,
    `renderedAdoptionTextSurfaceUsableNow: ${report.renderedAdoptionTextSurface?.previewUsableNow === true}`,
    `canAutoAuthorizeCm0595: ${report.canAutoAuthorizeCm0595}`,
    `cm0595ApprovalLinePreviewAvailable: ${report.cm0595ApprovalLinePreview?.previewAvailable === true}`,
    `cm0595ApprovalLinePreviewUsableNow: ${report.cm0595ApprovalLinePreview?.previewUsableNow === true}`,
    `cm0595OperatorPacketKind: ${report.cm0595OperatorPacketDraft?.packetKind || 'unknown'}`,
    `cm0595IssuanceRecordDraftUsableNow: ${report.cm0595IssuanceRecordDraft?.draftUsableNow === true}`,
    `cm0595ExecutionEvidenceDraftUsableNow: ${report.cm0595ExecutionEvidenceDraft?.draftUsableNow === true}`,
    `canExecuteRuntimeNow: ${report.canExecuteRuntimeNow}`
  ];

  if (Array.isArray(report.adoptionChecklistFailures) && report.adoptionChecklistFailures.length > 0) {
    lines.push(`adoptionChecklistFailures: ${report.adoptionChecklistFailures.join(', ')}`);
  }
  if (Array.isArray(report.failClosedReasons) && report.failClosedReasons.length > 0) {
    lines.push(`failClosedReasons: ${report.failClosedReasons.join(', ')}`);
  }
  if (report.wideningReviewRecordInputTrace?.sourceWorkspaceRelativePath) {
    lines.push(`wideningReviewRecord: ${report.wideningReviewRecordInputTrace.sourceWorkspaceRelativePath}`);
  }
  if (report.wideningAdoptionRecordInputTrace?.sourceWorkspaceRelativePath) {
    lines.push(`wideningAdoptionRecord: ${report.wideningAdoptionRecordInputTrace.sourceWorkspaceRelativePath}`);
  }
  if (report.cm0595IssuanceRecordInputTrace?.sourceWorkspaceRelativePath) {
    lines.push(`cm0595IssuanceRecord: ${report.cm0595IssuanceRecordInputTrace.sourceWorkspaceRelativePath}`);
  }
  if (report.cm0595ExecutionEvidenceInputTrace?.sourceWorkspaceRelativePath) {
    lines.push(`cm0595ExecutionEvidence: ${report.cm0595ExecutionEvidenceInputTrace.sourceWorkspaceRelativePath}`);
  }
  if (report.adoptionRecordDraft?.nextBoundary) {
    lines.push(`nextBoundary: ${report.adoptionRecordDraft.nextBoundary}`);
  }
  lines.push(`nextStep: ${report.nextStep}`);

  if (options.showRenderedAdoptionText === true && report.renderedAdoptionTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-adoption-text]');
    lines.push(report.renderedAdoptionTextSurface.markdown.trimEnd());
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${buildUsageText()}\n`);
    process.exitCode = 0;
    return;
  }

  let report;
  try {
    report = buildReport(options);
  } catch (error) {
    report = {
      status: 'error',
      mutated: false,
      failClosedReason: error.failClosedReason || '',
      error: error.message || 'failed to evaluate authorized write-path widening adoption review',
      nextStep: 'Check the fixture path and re-run.'
    };
  }

  const asJson = options.json || options.pretty || report.status === 'error';
  process.stdout.write(asJson
    ? `${JSON.stringify(report, null, options.pretty ? 2 : 0)}\n`
    : renderText(report, options));
  process.exitCode = report.status === 'error' ? 1 : 0;
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_FIXTURE_PATH,
  REJECTED_FLAGS,
  buildRejectedReport,
  buildReport,
  buildUsageText,
  loadFixture,
  parseArgs,
  renderText
};
