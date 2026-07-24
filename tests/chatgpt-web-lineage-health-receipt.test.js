'use strict';

const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const test = require('node:test');

const {
  LINEAGE_EVIDENCE_FIELDS,
  LINEAGE_RECEIPT_SCHEMA_VERSION,
  buildReceiptDigest,
  buildTunnelLineageReceipt,
  isBoundedLineageReceipt
} = require('../src/core/ChatGptWebLineageReceipt');
const {
  HEALTH_RECEIPT_SCHEMA_VERSION,
  buildHealthCloseoutReceipt
} = require('../src/core/ChatGptWebHealthReceipt');

const OBSERVED_AT = '2026-07-17T00:00:00.000Z';

function digest(label) {
  return `sha256:${crypto.createHash('sha256').update(label, 'utf8').digest('hex')}`;
}

function completeLineageEvidence(overrides = {}) {
  const evidence = Object.fromEntries(LINEAGE_EVIDENCE_FIELDS.map(field => [
    field,
    digest(`synthetic-${field}`)
  ]));
  return {
    ...evidence,
    tunnelAppBindingMatched: true,
    ...overrides
  };
}

function healthyLayers(overrides = {}) {
  return {
    local_mcp: { status: 'healthy', evidenceDigest: digest('synthetic-local-mcp') },
    tunnel_control_plane: { status: 'healthy', evidenceDigest: digest('synthetic-control-plane') },
    chatgpt_app_reachability: { status: 'healthy', evidenceDigest: digest('synthetic-chatgpt-app') },
    ...overrides
  };
}

function assertReceiptEnvelope(receipt, schemaVersion) {
  assert.equal(receipt.schemaVersion, schemaVersion);
  assert.equal(receipt.observedAt, OBSERVED_AT);
  assert.equal(receipt.lowDisclosure, true);
  assert.equal(receipt.secretMaterialIncluded, false);
  assert.ok(Array.isArray(receipt.evidenceRefs));
  assert.ok(receipt.evidenceRefs.length > 0);
}

test('M3-T2 builds bounded candidate lineage and three-layer health receipts from synthetic digests', () => {
  const lineage = buildTunnelLineageReceipt({
    evidence: completeLineageEvidence(),
    observedAt: OBSERVED_AT
  });
  const health = buildHealthCloseoutReceipt({
    lineageReceipt: lineage,
    layers: healthyLayers(),
    observedAt: OBSERVED_AT
  });

  assertReceiptEnvelope(lineage, LINEAGE_RECEIPT_SCHEMA_VERSION);
  assert.equal(lineage.status, 'candidate');
  assert.equal(lineage.lineageVerified, true);
  assert.equal(lineage.liveEvidenceVerified, false);
  assert.equal(lineage.closeoutEligible, false);
  assert.equal(lineage.failureCodes.length, 0);
  assert.equal(isBoundedLineageReceipt(lineage), true);
  assert.match(buildReceiptDigest(lineage), /^sha256:[a-f0-9]{64}$/);
  assert.equal(
    buildReceiptDigest({ z: 1, a: { y: true, x: false } }),
    buildReceiptDigest({ a: { x: false, y: true }, z: 1 })
  );

  assertReceiptEnvelope(health, HEALTH_RECEIPT_SCHEMA_VERSION);
  assert.equal(health.status, 'candidate');
  assert.equal(health.lineageBound, true);
  assert.equal(health.threeLayerHealthRequired, true);
  assert.equal(health.allLayersHealthy, true);
  assert.equal(health.liveEvidenceVerified, false);
  assert.equal(health.closeoutEligible, false);
  assert.equal(health.failureCodes.length, 0);
  assert.equal(health.healthLayers.local_mcp.evidencePresent, true);
  assert.equal(health.healthLayers.tunnel_control_plane.evidencePresent, true);
  assert.equal(health.healthLayers.chatgpt_app_reachability.evidencePresent, true);
});

test('M3-T2 lineage receipt fails closed for incomplete or mismatched evidence without echoing raw material', () => {
  const rawMaterial = 'synthetic-non-digest-value-should-not-echo';
  const receipt = buildTunnelLineageReceipt({
    evidence: completeLineageEvidence({
      tunnelAppBindingMatched: false,
      runtimeKeyReferenceFingerprint: rawMaterial,
      runtimeKeyReference: rawMaterial
    }),
    observedAt: OBSERVED_AT
  });
  const serialized = JSON.stringify(receipt);

  assertReceiptEnvelope(receipt, LINEAGE_RECEIPT_SCHEMA_VERSION);
  assert.equal(receipt.status, 'blocked');
  assert.equal(receipt.lineageVerified, false);
  assert.equal(receipt.tunnelAppBindingMatched, false);
  assert.ok(receipt.failureCodes.includes('LINEAGE_UNVERIFIED'));
  assert.ok(receipt.failureCodes.includes('LINEAGE_TUNNEL_APP_MISMATCH'));
  assert.ok(receipt.blockers.includes('required_lineage_fingerprints_missing'));
  assert.ok(receipt.blockers.includes('unexpected_lineage_evidence_fields'));
  assert.equal(serialized.includes(rawMaterial), false);
  assert.equal(isBoundedLineageReceipt(receipt), false);
});

test('M3-T2 health receipt requires a bounded lineage receipt and every independent layer', () => {
  const blockedLineage = buildTunnelLineageReceipt({
    evidence: completeLineageEvidence({ tunnelAppBindingMatched: false }),
    observedAt: OBSERVED_AT
  });
  const receipt = buildHealthCloseoutReceipt({
    lineageReceipt: blockedLineage,
    layers: healthyLayers({
      local_mcp: { status: 'unhealthy', evidenceDigest: digest('synthetic-local-bad') },
      tunnel_control_plane: { status: 'unverified' },
      chatgpt_app_reachability: { status: 'unhealthy', evidenceDigest: digest('synthetic-app-bad') }
    }),
    observedAt: OBSERVED_AT
  });

  assertReceiptEnvelope(receipt, HEALTH_RECEIPT_SCHEMA_VERSION);
  assert.equal(receipt.status, 'blocked');
  assert.equal(receipt.lineageBound, false);
  assert.equal(receipt.allLayersHealthy, false);
  assert.equal(receipt.closeoutEligible, false);
  assert.ok(receipt.failureCodes.includes('LINEAGE_UNVERIFIED'));
  assert.ok(receipt.failureCodes.includes('HEALTH_LOCAL_MCP_UNHEALTHY'));
  assert.ok(receipt.failureCodes.includes('HEALTH_CONTROL_PLANE_UNVERIFIED'));
  assert.ok(receipt.failureCodes.includes('HEALTH_CHATGPT_REACHABILITY_FAILED'));
  assert.ok(receipt.blockers.includes('bounded_lineage_receipt_required'));
  assert.ok(receipt.blockers.includes('three_layer_health_evidence_incomplete'));
});

test('M3-T2 health receipt rejects extra layer material without echoing it', () => {
  const rawMaterial = 'synthetic-endpoint-should-not-echo';
  const lineage = buildTunnelLineageReceipt({
    evidence: completeLineageEvidence(),
    observedAt: OBSERVED_AT
  });
  const receipt = buildHealthCloseoutReceipt({
    lineageReceipt: lineage,
    layers: healthyLayers({
      local_mcp: {
        status: 'healthy',
        evidenceDigest: digest('synthetic-local-clean'),
        endpoint: rawMaterial
      }
    }),
    observedAt: OBSERVED_AT
  });

  assert.equal(receipt.status, 'blocked');
  assert.equal(receipt.allLayersHealthy, false);
  assert.ok(receipt.blockers.includes('unexpected_health_layer_fields'));
  assert.ok(receipt.unexpectedHealthLayerFields.includes('local_mcp.endpoint'));
  assert.equal(JSON.stringify(receipt).includes(rawMaterial), false);
});
