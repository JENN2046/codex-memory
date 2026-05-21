#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  evaluateAuthorizedWritePathAutoAuthorizationPreflight
} = require('../core/AuthorizedWritePathAutoAuthorizationPreflight');
const {
  applyAssertionRecordToPreflightInput,
  ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES,
  buildAssertionRecordInputTrace,
  loadAssertionRecordFile
} = require('../core/ExternalTokenMaterialAssertionRecordAdapter');

const DEFAULT_FIXTURE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'tests',
  'fixtures',
  'authorized-write-path-auto-authorization-preflight-v1.json'
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
    showRenderedOperatorArtifactText: false,
    showRenderedOperatorPacketText: false,
    showRenderedOperatorBriefText: false,
    fixturePath: DEFAULT_FIXTURE_PATH,
    assertionRecordPath: '',
    latestReboundOutcomeClass: '',
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
    if (token === '--fixture') {
      options.fixturePath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--assertion-record') {
      options.assertionRecordPath = path.resolve(argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--latest-rebound-outcome-class') {
      options.latestReboundOutcomeClass = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (REJECTED_FLAGS.has(token)) {
      options.rejectedFlag = token;
      continue;
    }
  }

  return options;
}

function loadFixture(fixturePath = DEFAULT_FIXTURE_PATH) {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function loadAssertionRecord(assertionRecordPath = '') {
  if (!assertionRecordPath) {
    return null;
  }
  return loadAssertionRecordFile(assertionRecordPath);
}

function buildUsageText() {
  return [
    'Usage: node src/cli/authorized-write-path-auto-authorization.js [--json] [--pretty] [--rendered-operator-artifact-text] [--rendered-operator-packet-text] [--rendered-operator-brief-text] [--fixture PATH] [--assertion-record PATH(.json|.md)] [--latest-rebound-outcome-class CLASS]',
    '',
    'This governance-only CLI evaluates whether the current docs-defined chain may:',
    '  - issue no auto-approval,',
    '  - auto-reuse the exact CM-0601 line only, or',
    '  - escalate for future widening review.',
    '',
    `Allowed latest rebound outcome overrides: ${ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES.filter(Boolean).join(', ')}`,
    '',
    'It never executes runtime actions, never checks real token presence, never starts HTTP,',
    'never writes memory, and never auto-authorizes CM-0595.'
  ].join('\n');
}

function buildRejectedReport(rejectedFlag) {
  return {
    status: 'error',
    sourceMode: 'explicit_input_fixture',
    rejectedFlag,
    mutated: false,
    error: `${rejectedFlag} is outside the authorized write-path auto-authorization CLI boundary.`,
    nextStep: 'Re-run without execute/write/provider/start-service/CM-0595 flags.'
  };
}

function buildReport(options = {}) {
  if (options.rejectedFlag) {
    return buildRejectedReport(options.rejectedFlag);
  }

  const input = loadFixture(options.fixturePath);
  let effectiveInput = input;
  let sourceMode = 'explicit_input_fixture';
  let assertionRecordInputTrace = null;

  if (options.assertionRecordPath) {
    const loadResult = loadAssertionRecord(options.assertionRecordPath);
    const adapted = applyAssertionRecordToPreflightInput(input, loadResult.record, {
      latestReboundOutcomeClass: options.latestReboundOutcomeClass
    });
    if (adapted.ok !== true) {
      return {
        status: 'error',
        sourceMode: 'explicit_input_fixture_plus_assertion_record',
        mutated: false,
        error: 'failed to apply explicit assertion record to authorized write-path auto-authorization input',
        failClosedReasons: adapted.failClosedReasons || ['assertion_record_apply_failed'],
        nextStep: 'Fix the explicit assertion record or rebound outcome override and re-run.'
      };
    }
    effectiveInput = adapted.mergedInput;
    sourceMode = 'explicit_input_fixture_plus_assertion_record';
    assertionRecordInputTrace = buildAssertionRecordInputTrace({
      loadResult,
      normalizedAssertionRecord: adapted.normalizedAssertionRecord,
      assertionAcceptedForC6: adapted.assertionAcceptedForC6 === true,
      latestReboundOutcomeClass: options.latestReboundOutcomeClass
    });
  } else if (options.latestReboundOutcomeClass) {
    if (!ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES.includes(options.latestReboundOutcomeClass)) {
      return {
        status: 'error',
        sourceMode: 'explicit_input_fixture',
        mutated: false,
        error: 'unsupported latest rebound outcome override',
        nextStep: `Use one of: ${ALLOWED_LATEST_REBOUND_OUTCOME_CLASSES.filter(Boolean).join(', ')}`
      };
    }
    effectiveInput = {
      ...input,
      latestReboundOutcomeClass: options.latestReboundOutcomeClass
    };
    sourceMode = 'explicit_input_fixture_plus_outcome_override';
  }

  const evaluation = evaluateAuthorizedWritePathAutoAuthorizationPreflight(effectiveInput, {
    assertionRecordInputTrace
  });

  return {
    ...evaluation,
    assertionRecordInputTrace,
    sourceMode
  };
}

function renderText(report, options = {}) {
  const lines = [
    `status: ${report.status}`,
    `decision: ${report.decision}`,
    `allowedGovernanceOutput: ${report.allowedGovernanceOutput}`,
    `operatorActionStage: ${report.operatorActionPlan?.currentStage || 'unknown'}`,
    `assertionRecordPreviewAvailable: ${report.assertionRecordPreview?.previewAvailable === true}`,
    `assertionRecordPreviewUsableNow: ${report.assertionRecordPreview?.previewUsableNow === true}`,
    `approvalLinePreviewAvailable: ${report.approvalLinePreview?.previewAvailable === true}`,
    `approvalLinePreviewUsableNow: ${report.approvalLinePreview?.previewUsableNow === true}`,
    `issuanceRecordPreviewAvailable: ${report.issuanceRecordPreview?.previewAvailable === true}`,
    `routingOutcomePreviewAvailable: ${report.routingOutcomePreview?.previewAvailable === true}`,
    `wideningReviewPreviewAvailable: ${report.wideningReviewPreview?.previewAvailable === true}`,
    `recordDraftsAvailable: ${report.recordDrafts?.cm0614Issuance?.draftAvailable === true}`,
    `renderedArtifactTextSurfaceAvailable: ${report.renderedArtifactTextSurface?.previewAvailable === true}`,
    `renderedOperatorPacketTextSurfaceAvailable: ${report.renderedOperatorPacketTextSurface?.previewAvailable === true}`,
    `renderedOperatorBriefTextSurfaceAvailable: ${report.renderedOperatorBriefTextSurface?.previewAvailable === true}`,
    `artifactBundleKind: ${report.artifactBundleDraft?.bundleKind || 'unknown'}`,
    `artifactBundleUsableNow: ${report.artifactBundleDraft?.bundleUsableNow === true}`,
    `commandPreviewKind: ${report.commandPreviewBundle?.bundleKind || 'unknown'}`,
    `commandPreviewUsableNow: ${report.commandPreviewBundle?.previewUsableNow === true}`,
    `operatorPacketKind: ${report.operatorPacketDraft?.packetKind || 'unknown'}`,
    `operatorPacketUsableNow: ${report.operatorPacketDraft?.packetUsableNow === true}`,
    `checklistPassed: ${report.checklistPassed}`,
    `exactCm0601LineReusable: ${report.exactCm0601LineReusable}`,
    `canAutoAuthorizeCm0595: ${report.canAutoAuthorizeCm0595}`,
    `canExecuteRuntimeNow: ${report.canExecuteRuntimeNow}`
  ];

  if (Array.isArray(report.checklistFailures) && report.checklistFailures.length > 0) {
    lines.push(`checklistFailures: ${report.checklistFailures.join(', ')}`);
  }
  if (Array.isArray(report.failClosedReasons) && report.failClosedReasons.length > 0) {
    lines.push(`failClosedReasons: ${report.failClosedReasons.join(', ')}`);
  }
  if (report.approvalLinePreview?.sourceRef) {
    lines.push(`approvalLineSourceRef: ${report.approvalLinePreview.sourceRef}`);
  }
  if (report.operatorActionPlan?.nextStepRef) {
    lines.push(`operatorNextStepRef: ${report.operatorActionPlan.nextStepRef}`);
  }
  if (report.commandPreviewBundle?.primaryCommand) {
    lines.push(`operatorPrimaryCommand: ${report.commandPreviewBundle.primaryCommand}`);
  }
  if (report.renderedArtifactTextSurface?.selectedDraftId) {
    lines.push(`renderedArtifactDraftId: ${report.renderedArtifactTextSurface.selectedDraftId}`);
    lines.push(`renderedArtifactDraftUsableNow: ${report.renderedArtifactTextSurface.selectedDraftUsableNow === true}`);
  }
  if (report.renderedOperatorPacketTextSurface?.packetKind) {
    lines.push(`renderedOperatorPacketKind: ${report.renderedOperatorPacketTextSurface.packetKind}`);
    lines.push(`renderedOperatorPacketUsableNow: ${report.renderedOperatorPacketTextSurface.previewUsableNow === true}`);
  }
  if (report.renderedOperatorBriefTextSurface?.briefKind) {
    lines.push(`renderedOperatorBriefKind: ${report.renderedOperatorBriefTextSurface.briefKind}`);
    lines.push(`renderedOperatorBriefUsableNow: ${report.renderedOperatorBriefTextSurface.previewUsableNow === true}`);
  }
  if (report.assertionRecordInputTrace?.traceAvailable === true) {
    lines.push(`assertionRecordInputFormat: ${report.assertionRecordInputTrace.sourceFormat}`);
    lines.push(`assertionRecordInputFile: ${report.assertionRecordInputTrace.sourceFileName || 'n/a'}`);
    lines.push(`assertionRecordInputAcceptedForC6: ${report.assertionRecordInputTrace.assertionAcceptedForC6 === true}`);
  }
  lines.push(`nextStep: ${report.nextStep}`);

  if (options.showRenderedOperatorArtifactText === true && report.renderedArtifactTextSurface?.selectedDraftMarkdown) {
    lines.push('');
    lines.push('[rendered-operator-artifact-text]');
    lines.push(report.renderedArtifactTextSurface.selectedDraftMarkdown.trimEnd());
  }

  if (options.showRenderedOperatorPacketText === true && report.renderedOperatorPacketTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-operator-packet-text]');
    lines.push(report.renderedOperatorPacketTextSurface.markdown.trimEnd());
  }

  if (options.showRenderedOperatorBriefText === true && report.renderedOperatorBriefTextSurface?.markdown) {
    lines.push('');
    lines.push('[rendered-operator-brief-text]');
    lines.push(report.renderedOperatorBriefTextSurface.markdown.trimEnd());
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
      sourceMode: 'explicit_input_fixture',
      mutated: false,
      error: error.message || 'failed to evaluate authorized write-path auto-authorization preflight',
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
  loadAssertionRecord,
  buildRejectedReport,
  buildReport,
  buildUsageText,
  loadFixture,
  parseArgs,
  renderText
};
