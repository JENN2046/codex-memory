'use strict';

const crypto = require('node:crypto');
const { createMutationMarkdown } = require('./GovernedMcpVcpNativeVcpToolBoxMcpShim');

const CM2094_RECEIPT_COMMIT = '91c20ce4c9b85966ef2da6b7c37563ebbce0f365';
const CM2094_RECORD_BYTES = 269;
const CM2094_RECORD_SHA256 = '4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function deriveVcpMemoryIdRefFromDurableSha256(durableSha256) {
  if (typeof durableSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(durableSha256)) {
    throw new Error('invalid_durable_record_sha256');
  }
  return `vcp-kb-${durableSha256.slice(0, 16)}`;
}

function buildCm2096TombstonePayload() {
  return Object.freeze({
    memory_id: deriveVcpMemoryIdRefFromDurableSha256(CM2094_RECORD_SHA256),
    reason: 'CM-2096 append-only rollback drill for CM-2094 synthetic proof record',
    evidence: `CM-2094 receipt ${CM2094_RECEIPT_COMMIT}; durable SHA-256 ${CM2094_RECORD_SHA256}`,
    tombstone_reason: 'synthetic_proof_record_rollback_drill'
  });
}

function serializeCm2096DurableTombstoneMarker(payload = buildCm2096TombstonePayload()) {
  const expected = buildCm2096TombstonePayload();
  const keys = Object.keys(expected);
  if (Object.keys(payload).length !== keys.length || keys.some(key => payload[key] !== expected[key])) {
    throw new Error('cm2096_tombstone_payload_binding_mismatch');
  }
  const markdown = createMutationMarkdown('tombstone_memory', payload);
  const bytes = Buffer.byteLength(markdown, 'utf8');
  const durableMarkerSha256 = sha256(markdown);
  return Object.freeze({
    payload,
    markdown,
    bytes,
    durableMarkerSha256,
    markerMemoryIdRef: deriveVcpMemoryIdRefFromDurableSha256(durableMarkerSha256),
    targetMemoryIdRef: payload.memory_id,
    targetRecordBytes: CM2094_RECORD_BYTES,
    targetRecordSha256: CM2094_RECORD_SHA256,
    targetReceiptCommit: CM2094_RECEIPT_COMMIT,
    rawPathDisclosed: false
  });
}

module.exports = {
  CM2094_RECEIPT_COMMIT,
  CM2094_RECORD_BYTES,
  CM2094_RECORD_SHA256,
  deriveVcpMemoryIdRefFromDurableSha256,
  buildCm2096TombstonePayload,
  serializeCm2096DurableTombstoneMarker
};
