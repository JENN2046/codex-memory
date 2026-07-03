'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_DECISIONS,
  ALLOWED_EVIDENCE_CLASSES,
  ALLOWED_EVIDENCE_TYPES,
  ALLOWED_PROJECT_STATUS_LABELS,
  ALLOWED_RC_STATUS_LABELS,
  ALLOWED_READINESS_LABELS,
  FORBIDDEN_FIELD_NAMES,
  FORBIDDEN_STRING_VALUE_PATTERN_NAMES,
  REQUIRED_CONTEXT_BOOLEAN_FIELDS,
  REQUIRED_SECTION_BOOLEAN_FIELDS,
  REQUIRED_SECTION_IDS,
  REQUIRED_READINESS_BOOLEAN_FIELDS,
  SAFE_REQUEST_ID_PATTERN,
  SECTION_SOURCE_TYPES,
  ZERO_COUNTER_FIELDS,
  validateVcpMemoryHealthReportSchemaContract
} = require('../src/core/VcpMemoryHealthReportSchemaContract');

function zeroCounters(overrides = {}) {
  return Object.fromEntries(ZERO_COUNTER_FIELDS.map(field => [field, overrides[field] || 0]));
}

function section(sectionId, overrides = {}) {
  return {
    section_id: sectionId,
    source_type: SECTION_SOURCE_TYPES[sectionId],
    evidence_class: sectionId === 'fallback_status' ? 'fixture_dry_run' : 'fixture_only',
    low_disclosure: true,
    fixture_or_dry_run_only: true,
    live_runtime_evidence_present: false,
    raw_private_material_present: false,
    secret_material_present: false,
    provider_payload_present: false,
    raw_audit_or_store_rows_present: false,
    missing_live_evidence_blocker_visible: true,
    ...overrides
  };
}

function healthReportContract(overrides = {}) {
  const reportContext = {
    request_id: 'm14_health_report_schema_001',
    evidence_type: 'fixture_schema',
    source_plan_present: true,
    m13_hardening_report_present: true,
    dashboard_runtime_requested: false,
    dashboard_cli_requested: false,
    vcp_toolbox_runtime_requested: false,
    mcp_memory_tool_requested: false,
    private_runtime_read_requested: false,
    raw_store_read_requested: false,
    real_query_requested: false,
    provider_api_requested: false,
    approval_request_requested: false,
    approval_line_generation_requested: false
  };

  const sections = Object.fromEntries(REQUIRED_SECTION_IDS.map(sectionId => [
    sectionId,
    section(sectionId, (overrides.sections && overrides.sections[sectionId]) || {})
  ]));

  const readiness = {
    project_status: 'NOT_READY_BLOCKED',
    rc_status: 'RC_NOT_READY_BLOCKED',
    production_ready: false,
    release_ready: false,
    cutover_ready: false,
    complete_v8_claimed: false,
    full_bridge_completion_claimed: false,
    missing_live_evidence_visible: true,
    exact_approval_required_for_live_evidence: true
  };

  return {
    schemaVersion: 1,
    reportContext: {
      ...reportContext,
      ...(overrides.reportContext || {})
    },
    sections,
    readiness: {
      ...readiness,
      ...(overrides.readiness || {})
    },
    expectedDecision: overrides.expectedDecision || 'schema_pass',
    counters: zeroCounters(overrides.counters || {}),
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => ![
      'reportContext',
      'sections',
      'readiness',
      'expectedDecision',
      'counters'
    ].includes(key)))
  };
}

test('CM1772 accepts fixture-only M14 health report schema without runtime execution', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract());

  assert.equal(result.accepted, true);
  assert.equal(result.contractMode, 'fixture_health_report_schema_contract_only');
  assert.equal(result.computedDecision, 'schema_pass');
  assert.equal(result.readinessStatus, 'NOT_READY_BLOCKED');
  assert.equal(result.rcStatus, 'RC_NOT_READY_BLOCKED');
  assert.equal(result.sectionCount, 5);
  assert.equal(result.dashboardRuntimeImplemented, false);
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.realQueryExecuted, false);
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1772 denies schema when missing live evidence blocker is hidden', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    sections: {
      fallback_status: {
        missing_live_evidence_blocker_visible: false
      }
    },
    expectedDecision: 'deny'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'deny');
});

test('CM1772 stops runtime dashboard MCP private read provider and approval requests as L4', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    reportContext: {
      dashboard_runtime_requested: true,
      dashboard_cli_requested: true,
      vcp_toolbox_runtime_requested: true,
      mcp_memory_tool_requested: true,
      private_runtime_read_requested: true,
      raw_store_read_requested: true,
      real_query_requested: true,
      provider_api_requested: true,
      approval_request_requested: true,
      approval_line_generation_requested: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.dashboardRuntimeImplemented, false);
  assert.equal(result.mcpMemoryToolCalled, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
});

test('CM1772 stops raw private provider and audit row material in sections as L4', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    sections: {
      receipt_status: {
        live_runtime_evidence_present: true,
        raw_private_material_present: true,
        secret_material_present: true,
        provider_payload_present: true,
        raw_audit_or_store_rows_present: true
      }
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.rawStoreRead, false);
  assert.equal(result.durableAuditWritten, false);
});

test('CM1772 stops readiness overclaims as L4', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    readiness: {
      production_ready: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1772 rejects section source drift and invalid evidence class', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    sections: {
      target_status: {
        source_type: 'live_runtime_target',
        evidence_class: 'live_runtime'
      }
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_health_report_schema_contract');
  assert.ok(result.invalidFields.includes('sections.target_status.source_type'));
  assert.ok(result.invalidFields.includes('sections.target_status.evidence_class'));
});

test('CM1772 rejects forbidden raw private secret approval and overclaim fields without echoing values', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    rawPrivateMemory: 'SYNTHETIC_RAW_PRIVATE_MEMORY_SHOULD_NOT_ECHO',
    approvalLineValue: 'SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO',
    sections: {
      policy_status: {
        dashboardRuntimePayload: 'SYNTHETIC_DASHBOARD_PAYLOAD_SHOULD_NOT_ECHO'
      }
    },
    RC_READY: true
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_raw_private_runtime_secret_approval_or_overclaim_fields');
  assert.ok(result.forbiddenFields.includes('rawPrivateMemory'));
  assert.ok(result.forbiddenFields.includes('approvalLineValue'));
  assert.ok(result.forbiddenFields.includes('sections.policy_status.dashboardRuntimePayload'));
  assert.ok(result.forbiddenFields.includes('RC_READY'));
  assert.equal(serialized.includes('SYNTHETIC_RAW_PRIVATE_MEMORY_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_APPROVAL_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_DASHBOARD_PAYLOAD_SHOULD_NOT_ECHO'), false);
});

test('CM1773 rejects sensitive string value shapes in allowed fields without echoing values', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    reportContext: {
      request_id: 'https://example.invalid/raw-private-health-report'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_sensitive_value_shapes');
  assert.ok(result.forbiddenStringValueFields.includes('reportContext.request_id'));
  assert.equal(result.lowDisclosureProjection.requestId, null);
  assert.equal(serialized.includes('https://example.invalid/raw-private-health-report'), false);
});

test('CM1773 rejects recursive sensitive string values before shape validation without echoing values', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    sections: {
      target_status: {
        source_type: 'C:\\Users\\Jenn\\secret\\target-runtime.txt'
      }
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'forbidden_sensitive_value_shapes');
  assert.ok(result.forbiddenStringValueFields.includes('sections.target_status.source_type'));
  assert.equal(serialized.includes('C:\\Users\\Jenn\\secret\\target-runtime.txt'), false);
});

test('CM1773 keeps malformed but non-sensitive request ids out of low-disclosure projection', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    reportContext: {
      request_id: 'unsafe request id with spaces'
    }
  }));
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_health_report_schema_contract');
  assert.ok(result.invalidFields.includes('reportContext.request_id'));
  assert.equal(result.lowDisclosureProjection.requestId, null);
  assert.equal(serialized.includes('unsafe request id with spaces'), false);
});

test('CM1774 rejects project readiness status when it uses an RC-only label', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    readiness: {
      project_status: 'RC_NOT_READY_BLOCKED'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_health_report_schema_contract');
  assert.ok(result.invalidFields.includes('readiness.project_status'));
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1774 rejects RC readiness status when it uses a project-only label', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    readiness: {
      rc_status: 'NOT_READY_BLOCKED'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_health_report_schema_contract');
  assert.ok(result.invalidFields.includes('readiness.rc_status'));
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1774 preserves L4 readiness overclaim detection for valid labels', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    readiness: {
      production_ready: true,
      release_ready: true,
      cutover_ready: true,
      complete_v8_claimed: true,
      full_bridge_completion_claimed: true
    },
    expectedDecision: 'stop_l4'
  }));

  assert.equal(result.accepted, true);
  assert.equal(result.computedDecision, 'stop_l4');
  assert.equal(result.readinessClaimAllowed, false);
});

test('CM1775 rejects missing required health report sections', () => {
  const fixture = healthReportContract();
  delete fixture.sections.receipt_status;

  const result = validateVcpMemoryHealthReportSchemaContract(fixture);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('sections.receipt_status'));
  assert.equal(result.sectionCount, undefined);
});

test('CM1775 rejects missing required fields inside health report sections', () => {
  const fixture = healthReportContract();
  delete fixture.sections.policy_status.low_disclosure;

  const result = validateVcpMemoryHealthReportSchemaContract(fixture);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'missing_required_fields');
  assert.ok(result.missingFields.includes('sections.policy_status.low_disclosure'));
});

test('CM1775 rejects extra health report sections outside the required set', () => {
  const fixture = healthReportContract();
  fixture.sections.unapproved_status = section('policy_status', {
    section_id: 'unapproved_status'
  });

  const result = validateVcpMemoryHealthReportSchemaContract(fixture);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('sections.unapproved_status'));
});

test('CM1772 rejects missing positive and malformed zero side-effect counters', () => {
  const missingFixture = healthReportContract();
  delete missingFixture.counters.providerApiCalls;

  const missingResult = validateVcpMemoryHealthReportSchemaContract(missingFixture);
  assert.equal(missingResult.accepted, false);
  assert.equal(missingResult.reasonCode, 'missing_required_fields');
  assert.ok(missingResult.missingFields.includes('counters.providerApiCalls'));

  const positiveResult = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    counters: {
      dashboardRuntimeCalls: 1,
      providerApiCalls: 1,
      readinessClaims: 1
    }
  }));
  assert.equal(positiveResult.accepted, false);
  assert.equal(positiveResult.reasonCode, 'forbidden_positive_side_effect_counters');
  assert.ok(positiveResult.forbiddenCounters.includes('dashboardRuntimeCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('providerApiCalls'));
  assert.ok(positiveResult.forbiddenCounters.includes('readinessClaims'));

  const malformedResult = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    counters: {
      providerApiCalls: '0'
    }
  }));
  assert.equal(malformedResult.accepted, false);
  assert.equal(malformedResult.reasonCode, 'invalid_health_report_schema_contract');
  assert.ok(malformedResult.invalidFields.includes('counters.providerApiCalls'));
});

test('CM1772 rejects non-boolean flags and non-string request id', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract({
    reportContext: {
      request_id: 1772,
      dashboard_runtime_requested: 'no'
    },
    sections: {
      query_quality_status: {
        low_disclosure: 'yes'
      }
    },
    readiness: {
      missing_live_evidence_visible: 'yes'
    }
  }));

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'invalid_health_report_schema_contract');
  assert.ok(result.invalidFields.includes('reportContext.request_id'));
  assert.ok(result.invalidFields.includes('reportContext.dashboard_runtime_requested'));
  assert.ok(result.invalidFields.includes('sections.query_quality_status.low_disclosure'));
  assert.ok(result.invalidFields.includes('readiness.missing_live_evidence_visible'));
});

test('CM1772 rejects unexpected non-allowlisted fields without echoing values', () => {
  const fixture = healthReportContract({
    unexpectedTop: 'SYNTHETIC_HEALTH_TOP_VALUE_SHOULD_NOT_ECHO',
    reportContext: {
      extraContextMarker: 'SYNTHETIC_CONTEXT_VALUE_SHOULD_NOT_ECHO'
    },
    sections: {
      fallback_status: {
        extraSectionMarker: 'SYNTHETIC_SECTION_VALUE_SHOULD_NOT_ECHO'
      }
    },
    readiness: {
      extraReadinessMarker: true
    }
  });
  fixture.counters.extraCounter = 0;

  const result = validateVcpMemoryHealthReportSchemaContract(fixture);
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.reasonCode, 'unexpected_fields');
  assert.ok(result.unexpectedFields.includes('unexpectedTop'));
  assert.ok(result.unexpectedFields.includes('reportContext.extraContextMarker'));
  assert.ok(result.unexpectedFields.includes('sections.fallback_status.extraSectionMarker'));
  assert.ok(result.unexpectedFields.includes('readiness.extraReadinessMarker'));
  assert.ok(result.unexpectedFields.includes('counters.extraCounter'));
  assert.equal(serialized.includes('SYNTHETIC_HEALTH_TOP_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_CONTEXT_VALUE_SHOULD_NOT_ECHO'), false);
  assert.equal(serialized.includes('SYNTHETIC_SECTION_VALUE_SHOULD_NOT_ECHO'), false);
});

test('CM1772 locks health report vocabulary and side-effect posture', () => {
  const result = validateVcpMemoryHealthReportSchemaContract(healthReportContract());

  assert.ok(ALLOWED_DECISIONS.includes('schema_pass'));
  assert.ok(ALLOWED_EVIDENCE_TYPES.includes('fixture_schema'));
  assert.ok(ALLOWED_EVIDENCE_CLASSES.includes('fixture_dry_run'));
  assert.ok(ALLOWED_READINESS_LABELS.includes('RC_NOT_READY_BLOCKED'));
  assert.ok(REQUIRED_CONTEXT_BOOLEAN_FIELDS.includes('private_runtime_read_requested'));
  assert.ok(REQUIRED_SECTION_BOOLEAN_FIELDS.includes('raw_audit_or_store_rows_present'));
  assert.ok(REQUIRED_READINESS_BOOLEAN_FIELDS.includes('exact_approval_required_for_live_evidence'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('rawPrivateMemory'));
  assert.ok(FORBIDDEN_FIELD_NAMES.includes('dashboardRuntimePayload'));
  assert.ok(FORBIDDEN_STRING_VALUE_PATTERN_NAMES.includes('url'));
  assert.ok(FORBIDDEN_STRING_VALUE_PATTERN_NAMES.includes('windows_path'));
  assert.deepEqual(ALLOWED_PROJECT_STATUS_LABELS, ['NOT_READY_BLOCKED']);
  assert.deepEqual(ALLOWED_RC_STATUS_LABELS, ['RC_NOT_READY_BLOCKED']);
  assert.equal(SAFE_REQUEST_ID_PATTERN.test('m14_health_report_schema_001'), true);
  assert.equal(SAFE_REQUEST_ID_PATTERN.test('unsafe request id with spaces'), false);
  assert.ok(ZERO_COUNTER_FIELDS.includes('dashboardRuntimeCalls'));
  assert.ok(ZERO_COUNTER_FIELDS.includes('readinessClaims'));
  assert.equal(result.dashboardRuntimeImplemented, false);
  assert.equal(result.dashboardCliCalled, false);
  assert.equal(result.vcpToolboxRuntimeCalled, false);
  assert.equal(result.mcpMemoryToolCalled, false);
  assert.equal(result.privateRuntimeRead, false);
  assert.equal(result.rawStoreRead, false);
  assert.equal(result.realQueryExecuted, false);
  assert.equal(result.providerApiCalled, false);
  assert.equal(result.memoryRead, false);
  assert.equal(result.memoryWritten, false);
  assert.equal(result.durableAuditWritten, false);
  assert.equal(result.durableMemoryWritten, false);
  assert.equal(result.publicMcpExpanded, false);
  assert.equal(result.approvalRequestSubmitted, false);
  assert.equal(result.approvalLineGenerated, false);
  assert.equal(result.readinessClaimAllowed, false);
});
