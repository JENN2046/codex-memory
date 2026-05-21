const { redactSensitiveFragments } = require('./SensitiveFragmentRedaction');
const {
  EXPECTED_CONTROLLING_MAP,
  EXPECTED_OPERATOR_STATE,
  EXPECTED_TARGET_BASELINE,
  CM0604_WIDENING_GATE_REF,
  CM0606_WIDENING_ADOPTION_BRIDGE_REF,
  CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
  CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
  CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');

const EXPECTED_SCHEMA_VERSION = 'cm64-authorized-write-path-widening-review-v1';
const EXPECTED_MODE = 'cm0604_widening_review';
const EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID =
  'docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md';
const CM0595_FUTURE_WRITE_BOUNDARY_REF =
  'docs/CM-0595_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_PACKET.md';
const EXPECTED_ROUTED_OUTCOME_DECISION =
  'CM0605_ROUTED_ESCALATE_FOR_FUTURE_WIDENING_REVIEW';

const REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS = Object.freeze([
  'record_memory',
  'search_memory',
  'marker_search',
  'second_write',
  'token_binding',
  'start_http_ensure',
  'health_probe',
  'observe_http',
  'jsonl_read',
  'provider_call',
  'config_edit',
  'env_edit',
  'watchdog_startup_persistence',
  'public_mcp_expansion',
  'migration_apply',
  'durable_write',
  'readiness_claim'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? redactSensitiveFragments(value.trim()) : '';
}

function normalizeBoolean(value) {
  return value === true;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? uniqueValues(values.map(normalizeString).filter(Boolean))
    : [];
}

function hasSubset(values, requiredValues) {
  return requiredValues.every(value => values.includes(value));
}

function normalizeAuthorizedWritePathWideningReviewInput(input) {
  const malformedInput = !isPlainObject(input);
  const source = malformedInput ? {} : input;

  return {
    malformedInput,
    schemaVersion: normalizeString(source.schemaVersion),
    mode: normalizeString(source.mode),
    controllingMap: normalizeString(source.controllingMap),
    operatorFacingState: normalizeString(source.operatorFacingState),
    targetBaseline: normalizeString(source.targetBaseline),
    reboundBaselineRecorded: normalizeBoolean(source.reboundBaselineRecorded),
    routingOutcomeRecordAvailable: normalizeBoolean(source.routingOutcomeRecordAvailable),
    routingOutcomeDecision: normalizeString(source.routingOutcomeDecision),
    routingOutcomeRecordId: normalizeString(source.routingOutcomeRecordId),
    sameBaselineEndpointStartupEvidenceAvailable: normalizeBoolean(source.sameBaselineEndpointStartupEvidenceAvailable),
    endpointStartupEvidenceId: normalizeString(source.endpointStartupEvidenceId),
    sameBaselineTokenPresentEvidenceAvailable: normalizeBoolean(source.sameBaselineTokenPresentEvidenceAvailable),
    tokenPresentEvidenceSameBaseline: normalizeBoolean(source.tokenPresentEvidenceSameBaseline),
    latestTokenPresentEvidenceId: normalizeString(source.latestTokenPresentEvidenceId),
    noProviderConfigStartupPersistenceDriftSinceEvidence: normalizeBoolean(source.noProviderConfigStartupPersistenceDriftSinceEvidence),
    packetFamilyDriftDetected: normalizeBoolean(source.packetFamilyDriftDetected),
    noBroadScanJsonlReadOrAdditionalWriteNeeded: normalizeBoolean(source.noBroadScanJsonlReadOrAdditionalWriteNeeded),
    currentWritePathStillNotValidated: normalizeBoolean(source.currentWritePathStillNotValidated),
    narrowestNextProofStillOneSanitizedWriteValidation: normalizeBoolean(source.narrowestNextProofStillOneSanitizedWriteValidation),
    governanceMayCrossIntoOneBoundedDurableWriteProof: normalizeBoolean(source.governanceMayCrossIntoOneBoundedDurableWriteProof),
    stillOutOfScopeActions: normalizeStringArray(source.stillOutOfScopeActions)
  };
}

function buildReviewRecordDraft({
  decision,
  normalized,
  cm0604Satisfied,
  cm0606BridgeActivated,
  proceedToCm0607AdoptionRecord
} = {}) {
  let status = 'DRAFT_REVIEW_NOT_READY';
  if (decision === 'WIDENING_REVIEW_ABORTED_DRIFT') {
    status = 'DRAFT_REVIEW_ABORTED_DRIFT';
  } else if (decision === 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED') {
    status = 'DRAFT_REVIEW_PASSED_ADOPTION_NOT_GRANTED';
  } else if (decision === 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607') {
    status = 'DRAFT_REVIEW_PASSED_PROCEED_TO_CM0607';
  }

  const nextBoundary = decision === 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607'
    ? CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF
    : decision === 'WIDENING_REVIEW_ABORTED_DRIFT'
      ? 'keep_rc_not_ready_blocked_and_refresh_drift_inputs'
      : CM0604_WIDENING_GATE_REF;

  return {
    draftAvailable: true,
    draftUsableNow: true,
    status,
    decision,
    targetBaseline: normalized.targetBaseline || EXPECTED_TARGET_BASELINE,
    reviewSource: 'CM-0604',
    routingOutcomeRecord: normalized.routingOutcomeRecordId || CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
    cm0604Satisfied: cm0604Satisfied === true ? 'yes' : 'no',
    cm0606BridgeActivated: cm0606BridgeActivated === true ? 'yes' : 'no',
    proceedToCm0607AdoptionRecord: proceedToCm0607AdoptionRecord === true ? 'yes' : 'no',
    nextBoundary,
    outOfScopeActionsExecuted: 'none'
  };
}

function buildRenderedReviewTextSurface({
  decision,
  normalized,
  reviewChecklist,
  reviewChecklistFailures,
  failClosedReasons,
  reviewRecordDraft,
  cm0604Satisfied,
  cm0606BridgeActivated,
  proceedToCm0607AdoptionRecord
} = {}) {
  const lines = [
    `Status: ${reviewRecordDraft.status}`,
    `Decision: ${reviewRecordDraft.decision}`,
    'Date: <fill>',
    `Target baseline: ${reviewRecordDraft.targetBaseline || '<fill>'}`,
    `Review source: ${reviewRecordDraft.reviewSource}`,
    `Routing outcome record: ${reviewRecordDraft.routingOutcomeRecord || '<fill>'}`,
    `CM-0604 satisfied: ${reviewRecordDraft.cm0604Satisfied}`,
    `CM-0606 bridge activated: ${reviewRecordDraft.cm0606BridgeActivated}`,
    `Proceed to CM-0607 adoption record: ${reviewRecordDraft.proceedToCm0607AdoptionRecord}`,
    `Next boundary: ${reviewRecordDraft.nextBoundary}`,
    `Out-of-scope actions executed: ${reviewRecordDraft.outOfScopeActionsExecuted}`,
    '',
    '## Review snapshot',
    '',
    `- controlling map: \`${EXPECTED_CONTROLLING_MAP}\``,
    `- operator-facing state: \`${EXPECTED_OPERATOR_STATE}\``,
    `- routed outcome record available: \`${normalized.routingOutcomeRecordAvailable === true}\``,
    `- routed outcome decision: \`${normalized.routingOutcomeDecision || 'none'}\``,
    '',
    '## CM-0604 gate review',
    '',
    `- \`CM-0604\` satisfied: \`${cm0604Satisfied === true ? 'yes' : 'no'}\``,
    `- same-baseline endpoint/startup evidence: \`${normalized.sameBaselineEndpointStartupEvidenceAvailable === true}\``,
    `- same-baseline token-present evidence: \`${normalized.sameBaselineTokenPresentEvidenceAvailable === true}\``,
    `- token-present evidence still same baseline: \`${normalized.tokenPresentEvidenceSameBaseline === true}\``,
    `- packet family drift detected: \`${normalized.packetFamilyDriftDetected === true}\``,
    `- provider/config/startup-persistence drift since evidence: \`${normalized.noProviderConfigStartupPersistenceDriftSinceEvidence === true ? 'no' : 'yes'}\``,
    `- narrowest next proof still one sanitized write validation: \`${normalized.narrowestNextProofStillOneSanitizedWriteValidation === true}\``,
    '',
    '## CM-0606 bridge state',
    '',
    `- \`CM-0606\` bridge activated: \`${cm0606BridgeActivated === true ? 'yes' : 'no'}\``,
    `- proceed to \`CM-0607\` adoption record: \`${proceedToCm0607AdoptionRecord === true ? 'yes' : 'no'}\``,
    '',
    '## Review outcome',
    '',
    `- review decision: \`${decision}\``,
    `- checklist failures: \`${reviewChecklistFailures.join(', ') || 'none'}\``,
    `- fail-closed reasons: \`${failClosedReasons.join(', ') || 'none'}\``,
    '',
    '## Forbidden actions not run',
    '',
    '- no `record_memory`',
    '- no `search_memory`',
    '- no marker search',
    '- no second write',
    '- no token binding',
    '- no `start:http:ensure`',
    '- no `/health` probe',
    '- no `observe:http`',
    '- no `.jsonl` read',
    '- no provider call',
    '- no config or `.env` edit',
    '- no watchdog/startup persistence change',
    '- no public MCP expansion',
    '- no migration/import/export/backup/restore apply',
    '- no durable write',
    '- no readiness claim',
    '',
    '## Result and next boundary',
    '',
    `- current result: \`${decision}\``,
    `- controlling state: \`${EXPECTED_OPERATOR_STATE}\``,
    `- future write boundary ref: \`${CM0595_FUTURE_WRITE_BOUNDARY_REF}\``
  ];

  if (Object.keys(reviewChecklist || {}).length > 0) {
    lines.push('');
    lines.push('## Review Checklist');
    lines.push('');
    for (const [id, item] of Object.entries(reviewChecklist)) {
      lines.push(`- ${id}: ${item.question} => \`${item.passed === true ? 'yes' : 'no'}\``);
    }
  }

  return {
    previewAvailable: true,
    previewUsableNow: true,
    reviewKind: decision.toLowerCase(),
    markdown: lines.join('\n')
  };
}

function evaluateAuthorizedWritePathWideningReview(input) {
  const normalized = normalizeAuthorizedWritePathWideningReviewInput(input);

  const invalidSchema = normalized.schemaVersion !== EXPECTED_SCHEMA_VERSION;
  const invalidMode = normalized.mode !== EXPECTED_MODE;

  const reviewChecklist = {
    W1: {
      question: 'Does docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md remain the controlling map?',
      passed: normalized.controllingMap === EXPECTED_CONTROLLING_MAP
    },
    W2: {
      question: 'Does operator-facing state remain RC_NOT_READY_BLOCKED?',
      passed: normalized.operatorFacingState === EXPECTED_OPERATOR_STATE
    },
    W3: {
      question: 'Is the target baseline still current or explicitly rebound in docs/board?',
      passed: normalized.targetBaseline === EXPECTED_TARGET_BASELINE ||
        (Boolean(normalized.targetBaseline) && normalized.reboundBaselineRecorded === true)
    },
    W4: {
      question: 'Does a routed CM-0615 outcome already exist with ESCALATE_FOR_FUTURE_WIDENING_REVIEW?',
      passed: normalized.routingOutcomeRecordAvailable === true &&
        normalized.routingOutcomeDecision === EXPECTED_ROUTED_OUTCOME_DECISION &&
        Boolean(normalized.routingOutcomeRecordId)
    },
    W5: {
      question: 'Does same-baseline endpoint/startup evidence still exist through CM-0592?',
      passed: normalized.sameBaselineEndpointStartupEvidenceAvailable === true &&
        normalized.endpointStartupEvidenceId === EXPECTED_ENDPOINT_STARTUP_EVIDENCE_ID
    },
    W6: {
      question: 'Does same-baseline token-present evidence already exist and stay bound to the same baseline?',
      passed: normalized.sameBaselineTokenPresentEvidenceAvailable === true &&
        normalized.tokenPresentEvidenceSameBaseline === true &&
        Boolean(normalized.latestTokenPresentEvidenceId)
    },
    W7: {
      question: 'Has drift stayed closed since the proving evidence and is the write path still not validated?',
      passed: normalized.noProviderConfigStartupPersistenceDriftSinceEvidence === true &&
        normalized.packetFamilyDriftDetected === false &&
        normalized.currentWritePathStillNotValidated === true
    },
    W8: {
      question: 'Does the review still avoid broad scan, .jsonl read, and any additional durable write beyond one sanitized write-validation unit?',
      passed: normalized.noBroadScanJsonlReadOrAdditionalWriteNeeded === true &&
        normalized.narrowestNextProofStillOneSanitizedWriteValidation === true
    },
    W9: {
      question: 'Are record_memory/search/provider/config/startup-persistence/public-MCP/migration/readiness actions still out of scope at this review stage?',
      passed: hasSubset(normalized.stillOutOfScopeActions, REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS)
    },
    W10: {
      question: 'Has governance explicitly agreed that the chain may cross from no-write proof into one bounded durable-write proof?',
      passed: normalized.governanceMayCrossIntoOneBoundedDurableWriteProof === true
    }
  };

  const reviewChecklistFailures = Object.entries(reviewChecklist)
    .filter(([, item]) => item.passed !== true)
    .map(([id]) => id);

  const gatePreconditionsPassed = reviewChecklist.W1.passed === true &&
    reviewChecklist.W2.passed === true &&
    reviewChecklist.W3.passed === true &&
    reviewChecklist.W4.passed === true &&
    reviewChecklist.W5.passed === true &&
    reviewChecklist.W6.passed === true &&
    reviewChecklist.W7.passed === true &&
    reviewChecklist.W8.passed === true &&
    reviewChecklist.W9.passed === true;

  const driftDetected = reviewChecklist.W3.passed !== true ||
    normalized.packetFamilyDriftDetected === true ||
    normalized.noProviderConfigStartupPersistenceDriftSinceEvidence !== true ||
    normalized.currentWritePathStillNotValidated !== true;

  let decision = 'WIDENING_REVIEW_NOT_READY';
  if (gatePreconditionsPassed && reviewChecklist.W10.passed === true) {
    decision = 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607';
  } else if (gatePreconditionsPassed && reviewChecklist.W10.passed !== true) {
    decision = 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED';
  } else if (driftDetected && !normalized.malformedInput && !invalidSchema && !invalidMode) {
    decision = 'WIDENING_REVIEW_ABORTED_DRIFT';
  }

  const cm0604Satisfied = gatePreconditionsPassed;
  const cm0606BridgeActivated = decision === 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607';
  const proceedToCm0607AdoptionRecord = cm0606BridgeActivated;

  const failClosedReasons = [];
  if (normalized.malformedInput) failClosedReasons.push('malformed_input');
  if (invalidSchema) failClosedReasons.push('schema_version_mismatch');
  if (invalidMode) failClosedReasons.push('mode_mismatch');
  if (reviewChecklist.W1.passed !== true) failClosedReasons.push('controlling_map_drift');
  if (reviewChecklist.W2.passed !== true) failClosedReasons.push('operator_state_drift');
  if (reviewChecklist.W3.passed !== true) failClosedReasons.push('baseline_drift');
  if (reviewChecklist.W4.passed !== true) failClosedReasons.push('routing_outcome_not_escalated');
  if (reviewChecklist.W5.passed !== true) failClosedReasons.push('endpoint_startup_evidence_missing');
  if (reviewChecklist.W6.passed !== true) failClosedReasons.push('token_present_same_baseline_evidence_missing');
  if (reviewChecklist.W7.passed !== true) failClosedReasons.push('write_path_or_environment_drift');
  if (reviewChecklist.W8.passed !== true) failClosedReasons.push('narrow_write_validation_scope_not_proven');
  if (reviewChecklist.W9.passed !== true) failClosedReasons.push('out_of_scope_boundary_not_preserved');
  if (reviewChecklist.W10.passed !== true) failClosedReasons.push('bounded_durable_write_crossing_not_granted');

  const status = decision === 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607'
    ? 'passed_proceed_to_cm0607'
    : decision === 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED'
      ? 'passed_adoption_not_granted'
      : decision === 'WIDENING_REVIEW_ABORTED_DRIFT'
        ? 'aborted_drift'
        : 'blocked_fail_closed';

  const reviewRecordDraft = buildReviewRecordDraft({
    decision,
    normalized,
    cm0604Satisfied,
    cm0606BridgeActivated,
    proceedToCm0607AdoptionRecord
  });
  const renderedReviewTextSurface = buildRenderedReviewTextSurface({
    decision,
    normalized,
    reviewChecklist,
    reviewChecklistFailures,
    failClosedReasons,
    reviewRecordDraft,
    cm0604Satisfied,
    cm0606BridgeActivated,
    proceedToCm0607AdoptionRecord
  });

  return {
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    sourceMode: 'explicit_input',
    status,
    decision,
    controllingState: EXPECTED_OPERATOR_STATE,
    cm0604Satisfied,
    cm0606BridgeActivated,
    proceedToCm0607AdoptionRecord,
    canAutoAuthorizeCm0595: false,
    canExecuteRuntimeNow: false,
    reviewChecklist,
    reviewChecklistFailures,
    failClosedReasons: uniqueValues(failClosedReasons),
    reviewRecordDraft,
    renderedReviewTextSurface,
    nextStep: decision === 'WIDENING_REVIEW_PASSED_PROCEED_TO_CM0607'
      ? 'record_cm0616_and_continue_to_cm0607_only'
      : decision === 'WIDENING_REVIEW_PASSED_ADOPTION_NOT_GRANTED'
        ? 'record_cm0616_and_keep_widening_unadopted'
        : decision === 'WIDENING_REVIEW_ABORTED_DRIFT'
          ? 'refresh_drift_inputs_and_keep_rc_not_ready_blocked'
          : 'keep_rc_not_ready_blocked_and_do_not_open_cm0607',
    refs: {
      wideningGateRef: CM0604_WIDENING_GATE_REF,
      routingOutcomeTemplateRef: CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
      wideningReviewOutcomeTemplateRef: CM0616_WIDENING_REVIEW_OUTCOME_TEMPLATE_REF,
      wideningAdoptionBridgeRef: CM0606_WIDENING_ADOPTION_BRIDGE_REF,
      wideningAdoptionRecordTemplateRef: CM0607_WIDENING_ADOPTION_RECORD_TEMPLATE_REF,
      futureWriteBoundaryRef: CM0595_FUTURE_WRITE_BOUNDARY_REF
    },
    safety: {
      readsFiles: false,
      scansDirectories: false,
      executesCommands: false,
      startsServices: false,
      writesDurableState: false,
      callsProviders: false,
      expandsPublicMcp: false,
      remoteWrites: false,
      rawSensitiveOutputExposed: false
    },
    readiness: {
      cm0604ReviewPassed: cm0604Satisfied,
      cm0607AdoptionRecordReady: proceedToCm0607AdoptionRecord,
      cm0595AutoAuthorizationReady: false,
      runtimeReady: false,
      rcReady: false
    }
  };
}

module.exports = {
  EXPECTED_SCHEMA_VERSION,
  EXPECTED_MODE,
  EXPECTED_ROUTED_OUTCOME_DECISION,
  REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS,
  evaluateAuthorizedWritePathWideningReview,
  normalizeAuthorizedWritePathWideningReviewInput
};
