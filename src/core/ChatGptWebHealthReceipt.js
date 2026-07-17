'use strict';

const {
  C5_CONTRACT_ID,
  buildReceiptDigest,
  isBoundedLineageReceipt,
  normalizeSha256Digest
} = require('./ChatGptWebLineageReceipt');

const HEALTH_RECEIPT_SCHEMA_VERSION = 'health_closeout_receipt_v2';
const FALLBACK_OBSERVED_AT = '1970-01-01T00:00:00.000Z';
const HEALTH_LAYER_IDS = Object.freeze([
  'local_mcp',
  'tunnel_control_plane',
  'chatgpt_app_reachability'
]);

const HEALTH_FAILURE_CODES = Object.freeze({
  local_mcp: 'HEALTH_LOCAL_MCP_UNHEALTHY',
  tunnel_control_plane: 'HEALTH_CONTROL_PLANE_UNVERIFIED',
  chatgpt_app_reachability: 'HEALTH_CHATGPT_REACHABILITY_FAILED'
});

const ALLOWED_LAYER_STATUSES = new Set([
  'healthy',
  'unhealthy',
  'unverified'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeObservedAt(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stableUnique(values) {
  return [...new Set(values)];
}

function normalizeHealthLayers(layers = {}) {
  const safeLayers = isPlainObject(layers) ? layers : {};
  const normalized = {};
  const missingLayers = [];

  for (const layerId of HEALTH_LAYER_IDS) {
    const layer = isPlainObject(safeLayers[layerId]) ? safeLayers[layerId] : {};
    const status = ALLOWED_LAYER_STATUSES.has(layer.status) ? layer.status : 'unverified';
    const evidenceDigest = normalizeSha256Digest(layer.evidenceDigest);
    const evidencePresent = evidenceDigest !== null;
    if (status !== 'healthy' || !evidencePresent) missingLayers.push(layerId);
    normalized[layerId] = {
      status,
      evidencePresent,
      evidenceDigest,
      unexpectedFields: Object.keys(layer)
        .filter(field => !['status', 'evidenceDigest'].includes(field))
        .sort()
    };
  }

  const unexpectedLayers = Object.keys(safeLayers)
    .filter(layerId => !HEALTH_LAYER_IDS.includes(layerId))
    .sort();
  return {
    layers: normalized,
    missingLayers,
    unexpectedLayers,
    unexpectedLayerFields: HEALTH_LAYER_IDS.flatMap(layerId =>
      normalized[layerId].unexpectedFields.map(field => `${layerId}.${field}`)
    )
  };
}

function buildHealthCloseoutReceipt({
  lineageReceipt,
  layers,
  observedAt
} = {}) {
  const normalizedLayers = normalizeHealthLayers(layers);
  const normalizedObservedAt = normalizeObservedAt(observedAt);
  const lineageBound = isBoundedLineageReceipt(lineageReceipt);
  const failureCodes = [];
  const blockers = [];

  if (!lineageBound) {
    failureCodes.push('LINEAGE_UNVERIFIED');
    blockers.push('bounded_lineage_receipt_required');
  }
  if (!normalizedObservedAt) {
    blockers.push('observed_at_invalid');
  }
  if (normalizedLayers.unexpectedLayers.length > 0) {
    blockers.push('unexpected_health_layers');
  }
  if (normalizedLayers.unexpectedLayerFields.length > 0) {
    blockers.push('unexpected_health_layer_fields');
  }

  for (const layerId of HEALTH_LAYER_IDS) {
    const layer = normalizedLayers.layers[layerId];
    if (layer.status !== 'healthy' || !layer.evidencePresent) {
      failureCodes.push(HEALTH_FAILURE_CODES[layerId]);
    }
  }
  if (normalizedLayers.missingLayers.length > 0) {
    blockers.push('three_layer_health_evidence_incomplete');
  }

  const allLayersHealthy = normalizedLayers.missingLayers.length === 0 &&
    normalizedLayers.unexpectedLayerFields.length === 0;
  const status = blockers.length === 0 ? 'candidate' : 'blocked';
  const layerEvidenceDigests = Object.fromEntries(HEALTH_LAYER_IDS
    .filter(layerId => normalizedLayers.layers[layerId].evidenceDigest)
    .map(layerId => [layerId, normalizedLayers.layers[layerId].evidenceDigest]));
  const evidenceRefs = [
    ...(lineageBound ? ['lineage_receipt_digest'] : []),
    ...Object.keys(layerEvidenceDigests).sort()
  ];

  return {
    schemaVersion: HEALTH_RECEIPT_SCHEMA_VERSION,
    contractId: C5_CONTRACT_ID,
    status,
    observedAt: normalizedObservedAt || FALLBACK_OBSERVED_AT,
    lowDisclosure: true,
    secretMaterialIncluded: false,
    rawIdentifiersIncluded: false,
    endpointOrLocatorIncluded: false,
    evidenceRefs: evidenceRefs.length > 0 ? evidenceRefs : ['health_evidence_missing'],
    lineageReceiptDigest: lineageBound ? buildReceiptDigest(lineageReceipt) : null,
    lineageBound,
    threeLayerHealthRequired: true,
    allLayersHealthy,
    healthLayers: Object.fromEntries(HEALTH_LAYER_IDS.map(layerId => [
      layerId,
      {
        status: normalizedLayers.layers[layerId].status,
        evidencePresent: normalizedLayers.layers[layerId].evidencePresent
      }
    ])),
    layerEvidenceDigests,
    liveEvidenceVerified: false,
    runtimeProbePerformed: false,
    closeoutEligible: false,
    readinessClaimed: false,
    failureCodes: stableUnique(failureCodes),
    blockers,
    missingHealthLayers: normalizedLayers.missingLayers,
    unexpectedHealthLayers: normalizedLayers.unexpectedLayers,
    unexpectedHealthLayerFields: normalizedLayers.unexpectedLayerFields
  };
}

module.exports = {
  HEALTH_FAILURE_CODES,
  HEALTH_LAYER_IDS,
  HEALTH_RECEIPT_SCHEMA_VERSION,
  buildHealthCloseoutReceipt,
  normalizeHealthLayers
};
