const {
  CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
  EXPECTED_CONTROLLING_MAP,
  EXPECTED_OPERATOR_STATE,
  EXPECTED_TARGET_BASELINE,
  evaluateAuthorizedWritePathAutoAuthorizationPreflight
} = require('./AuthorizedWritePathAutoAuthorizationPreflight');
const {
  EXPECTED_ROUTED_OUTCOME_DECISION,
  REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS
} = require('./AuthorizedWritePathWideningReview');

const BRIDGE_SOURCE_FORMAT = 'cm0662_auto_authorization_escalation_bridge_v1';
const BRIDGE_SOURCE = 'cm0662_explicit_input_fixture_plus_auto_authorization_escalation_bridge_v1';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildDerivedRoutingOutcomeRecordId(assertionRecordInputTrace = null) {
  const sourceWorkspaceRelativePath = normalizeString(
    assertionRecordInputTrace?.sourceWorkspaceRelativePath || ''
  );
  if (sourceWorkspaceRelativePath) {
    return `${sourceWorkspaceRelativePath}#cm0662-derived-cm0615-routing-outcome`;
  }

  const sourceArtifactRef = normalizeString(
    assertionRecordInputTrace?.sourceArtifactRef || ''
  );
  if (sourceArtifactRef) {
    return `${sourceArtifactRef}#cm0662-derived-cm0615-routing-outcome`;
  }

  return 'derived:auto_authorization_escalation_to_widening_review';
}

function buildDerivedTokenPresentEvidenceId({
  autoAuthorizationInput = {},
  assertionRecordInputTrace = null
} = {}) {
  const sourceWorkspaceRelativePath = normalizeString(
    assertionRecordInputTrace?.sourceWorkspaceRelativePath || ''
  );
  if (sourceWorkspaceRelativePath) {
    return `${sourceWorkspaceRelativePath}#token_present_same_baseline`;
  }

  const sourceArtifactRef = normalizeString(
    assertionRecordInputTrace?.sourceArtifactRef || ''
  );
  if (sourceArtifactRef) {
    return `${sourceArtifactRef}#token_present_same_baseline`;
  }

  const latestReboundEvidenceId = normalizeString(
    autoAuthorizationInput.latestReboundEvidenceId || ''
  );
  if (latestReboundEvidenceId) {
    return `${latestReboundEvidenceId}#token_present_same_baseline`;
  }

  return 'derived:token_present_same_baseline_from_auto_authorization';
}

function buildRoutingOutcomeRecordInputTrace({
  autoAuthorizationEvaluation = null,
  autoAuthorizationInput = {},
  assertionRecordInputTrace = null
} = {}) {
  return {
    traceAvailable: true,
    sourceFormat: BRIDGE_SOURCE_FORMAT,
    sourcePath: normalizeString(assertionRecordInputTrace?.sourcePath || ''),
    sourceFileName: normalizeString(assertionRecordInputTrace?.sourceFileName || ''),
    sourceWorkspaceRelativePath: normalizeString(
      assertionRecordInputTrace?.sourceWorkspaceRelativePath || ''
    ),
    sourceArtifactRef: normalizeString(
      assertionRecordInputTrace?.sourceArtifactRef || CM0615_ROUTING_OUTCOME_TEMPLATE_REF
    ) || CM0615_ROUTING_OUTCOME_TEMPLATE_REF,
    sourceMode: 'derived_from_auto_authorization_escalation',
    decision: EXPECTED_ROUTED_OUTCOME_DECISION,
    routingOutcome: 'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
    targetBaseline: normalizeString(
      autoAuthorizationInput.targetBaseline || EXPECTED_TARGET_BASELINE
    ) || EXPECTED_TARGET_BASELINE,
    tokenPresenceResult: normalizeString(
      autoAuthorizationInput.latestReboundOutcomeClass || 'token_present'
    ) || 'token_present',
    wideningGateSatisfied:
      autoAuthorizationEvaluation?.allowedGovernanceOutput ===
      'ESCALATE_FOR_FUTURE_WIDENING_REVIEW',
    wideningAdopted: false
  };
}

function applyAutoAuthorizationEscalationToWideningReviewInput(
  wideningReviewInput = {},
  autoAuthorizationInput = {},
  { assertionRecordInputTrace = null } = {}
) {
  if (!isPlainObject(wideningReviewInput) || !isPlainObject(autoAuthorizationInput)) {
    return {
      ok: false,
      failClosedReasons: ['malformed_auto_authorization_bridge_input']
    };
  }

  const autoAuthorizationEvaluation =
    evaluateAuthorizedWritePathAutoAuthorizationPreflight(autoAuthorizationInput, {
      assertionRecordInputTrace
    });

  if (
    autoAuthorizationEvaluation.allowedGovernanceOutput !==
    'ESCALATE_FOR_FUTURE_WIDENING_REVIEW'
  ) {
    return {
      ok: false,
      failClosedReasons: ['auto_authorization_not_escalated_for_widening_review'],
      autoAuthorizationEvaluation
    };
  }

  const routingOutcomeRecordInputTrace = buildRoutingOutcomeRecordInputTrace({
    autoAuthorizationEvaluation,
    autoAuthorizationInput,
    assertionRecordInputTrace
  });
  const mergedInput = {
    ...wideningReviewInput,
    controllingMap:
      normalizeString(autoAuthorizationInput.controllingMap) || EXPECTED_CONTROLLING_MAP,
    operatorFacingState:
      normalizeString(autoAuthorizationInput.operatorFacingState) || EXPECTED_OPERATOR_STATE,
    targetBaseline:
      normalizeString(autoAuthorizationInput.targetBaseline) || EXPECTED_TARGET_BASELINE,
    reboundBaselineRecorded: autoAuthorizationInput.reboundBaselineRecorded === true,
    routingOutcomeRecordAvailable: true,
    routingOutcomeDecision: EXPECTED_ROUTED_OUTCOME_DECISION,
    routingOutcomeRecordId: buildDerivedRoutingOutcomeRecordId(assertionRecordInputTrace),
    sameBaselineEndpointStartupEvidenceAvailable:
      autoAuthorizationInput.sameBaselineEndpointStartupEvidenceAvailable === true,
    endpointStartupEvidenceId: normalizeString(
      autoAuthorizationInput.endpointStartupEvidenceId || ''
    ),
    sameBaselineTokenPresentEvidenceAvailable: true,
    tokenPresentEvidenceSameBaseline: true,
    latestTokenPresentEvidenceId: buildDerivedTokenPresentEvidenceId({
      autoAuthorizationInput,
      assertionRecordInputTrace
    }),
    noProviderConfigStartupPersistenceDriftSinceEvidence:
      autoAuthorizationInput.contradictoryWritePathDrift !== true,
    packetFamilyDriftDetected: autoAuthorizationInput.contradictoryWritePathDrift === true,
    noBroadScanJsonlReadOrAdditionalWriteNeeded:
      wideningReviewInput.noBroadScanJsonlReadOrAdditionalWriteNeeded !== false,
    currentWritePathStillNotValidated:
      wideningReviewInput.currentWritePathStillNotValidated !== false,
    narrowestNextProofStillOneSanitizedWriteValidation:
      wideningReviewInput.narrowestNextProofStillOneSanitizedWriteValidation !== false,
    governanceMayCrossIntoOneBoundedDurableWriteProof:
      wideningReviewInput.governanceMayCrossIntoOneBoundedDurableWriteProof === true,
    stillOutOfScopeActions: Array.isArray(wideningReviewInput.stillOutOfScopeActions)
      ? [...wideningReviewInput.stillOutOfScopeActions]
      : [...REQUIRED_STILL_OUT_OF_SCOPE_ACTIONS]
  };

  return {
    ok: true,
    source: BRIDGE_SOURCE,
    mergedInput,
    autoAuthorizationEvaluation,
    routingOutcomeRecordInputTrace
  };
}

module.exports = {
  BRIDGE_SOURCE,
  BRIDGE_SOURCE_FORMAT,
  applyAutoAuthorizationEscalationToWideningReviewInput,
  buildRoutingOutcomeRecordInputTrace
};
