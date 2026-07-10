'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluatePhase2NativeReadProofEvidenceGate
} = require('../src/core/Phase2NativeReadProofEvidenceGate');

const DEFAULT_PUBLIC_TOOLS = Object.freeze([
  'search_memory',
  'memory_overview',
  'audit_memory',
  'prepare_memory_context',
  'propose_memory_delta'
]);

function fullPhase2Evidence() {
  return {
    defaultReadOnlySurfacePassed: true,
    hiddenToolsHardRejectPassed: true,
    nativeTargetBindingPassed: true,
    nativeReadProofPassed: true,
    fallbackDistinctionPassed: true,
    lowDisclosureProofPassed: true,
    auditReceiptPassed: true,
    scopeVisibilityIsolationPassed: true,
    wslLinuxProofPassed: true,
    windowsWslSmokePassed: true
  };
}

test('CM2019 accepts Phase 2 receipt-only native read evidence with current safe default tools', () => {
  const result = evaluatePhase2NativeReadProofEvidenceGate({
    publicToolNames: DEFAULT_PUBLIC_TOOLS,
    evidence: fullPhase2Evidence()
  });

  assert.equal(result.accepted, true, result.blockers.join(', '));
  assert.equal(result.status, 'phase2_native_read_proof_evidence_accepted');
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.stopReasons, []);
  assert.equal(result.publicSurface.requiredReadOnlyBridgeToolsPresent, true);
  assert.equal(result.publicSurface.hiddenMutationToolsAbsent, true);
  assert.equal(result.policy.evaluatesReceiptOnly, true);
  assert.equal(result.policy.executesLiveRead, false);
  assert.equal(result.policy.startsOrStopsServices, false);
  assert.equal(result.policy.readsRealMemory, false);
  assert.equal(result.policy.performsDurableMutation, false);
  assert.equal(result.policy.nativeWriteProofAccepted, false);
});

test('CM2019 reports current missing live proof evidence without claiming Phase 2 completion', () => {
  const evidence = fullPhase2Evidence();
  evidence.nativeReadProofPassed = false;
  evidence.nativeTargetBindingPassed = false;
  evidence.wslLinuxProofPassed = false;
  evidence.windowsWslSmokePassed = false;

  const result = evaluatePhase2NativeReadProofEvidenceGate({
    publicToolNames: DEFAULT_PUBLIC_TOOLS,
    evidence
  });

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'phase2_native_read_proof_evidence_incomplete');
  assert.ok(result.blockers.includes('missing_phase2_evidence_nativeReadProofPassed'));
  assert.ok(result.blockers.includes('missing_phase2_evidence_nativeTargetBindingPassed'));
  assert.ok(result.blockers.includes('missing_phase2_evidence_wslLinuxProofPassed'));
  assert.ok(result.blockers.includes('missing_phase2_evidence_windowsWslSmokePassed'));
  assert.equal(result.policy.executesLiveRead, false);
  assert.equal(result.nextGate, 'collect_exact_authorized_low_disclosure_native_read_receipts');
});

test('CM2019 requires the read-only bridge tools even when later safe context tools exist', () => {
  const result = evaluatePhase2NativeReadProofEvidenceGate({
    publicToolNames: ['prepare_memory_context', 'propose_memory_delta'],
    evidence: fullPhase2Evidence()
  });

  assert.equal(result.accepted, false);
  assert.ok(result.blockers.includes('missing_readonly_bridge_tool_search_memory'));
  assert.ok(result.blockers.includes('missing_readonly_bridge_tool_memory_overview'));
  assert.ok(result.blockers.includes('missing_readonly_bridge_tool_audit_memory'));
});

test('CM2019 stops L4 when default surface includes mutation tools', () => {
  const result = evaluatePhase2NativeReadProofEvidenceGate({
    publicToolNames: [...DEFAULT_PUBLIC_TOOLS, 'record_memory', 'commit_memory_delta'],
    evidence: fullPhase2Evidence()
  });

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'phase2_native_read_proof_stop_l4');
  assert.ok(result.stopReasons.includes('default_surface_mutation_tool_not_allowed_record_memory'));
  assert.ok(result.stopReasons.includes('default_surface_mutation_tool_not_allowed_commit_memory_delta'));
  assert.equal(result.policy.expandsPublicMcp, false);
});

test('CM2019 stops L4 for requests to run live runtime proof inside the evidence gate', () => {
  const result = evaluatePhase2NativeReadProofEvidenceGate({
    publicToolNames: DEFAULT_PUBLIC_TOOLS,
    evidence: fullPhase2Evidence(),
    request: {
      runLiveReadNow: true,
      serviceStartRequested: true,
      providerApiCallRequested: true
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'phase2_native_read_proof_stop_l4');
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.runLiveReadNow'));
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.serviceStartRequested'));
  assert.ok(result.stopReasons.includes('stop_l4_flag_request.providerApiCallRequested'));
  assert.equal(result.nextGate, 'stop_before_live_runtime_private_state_or_readiness_boundary');
});

test('CM2019 rejects raw private or locator-shaped evidence by path without echoing values', () => {
  const result = evaluatePhase2NativeReadProofEvidenceGate({
    publicToolNames: DEFAULT_PUBLIC_TOOLS,
    evidence: {
      ...fullPhase2Evidence(),
      rawResponseBody: 'ECHO_GUARD_A',
      nested: {
        endpointLocator: 'ECHO_GUARD_B',
        privateMemoryContent: 'ECHO_GUARD_C'
      }
    },
    request: {
      bearerToken: 'ECHO_GUARD_D'
    }
  });
  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'phase2_native_read_proof_stop_l4');
  assert.ok(result.stopReasons.includes('forbidden_input_field_evidence.rawResponseBody'));
  assert.ok(result.stopReasons.includes('forbidden_input_field_evidence.nested.endpointLocator'));
  assert.ok(result.stopReasons.includes('forbidden_input_field_evidence.nested.privateMemoryContent'));
  assert.ok(result.stopReasons.includes('forbidden_input_field_request.bearerToken'));
  assert.equal(serialized.includes('ECHO_GUARD_A'), false);
  assert.equal(serialized.includes('ECHO_GUARD_B'), false);
  assert.equal(serialized.includes('ECHO_GUARD_C'), false);
  assert.equal(serialized.includes('ECHO_GUARD_D'), false);
});
