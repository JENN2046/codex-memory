'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRecordMarkdown } = require('../src/core/GovernedMcpVcpNativeVcpToolBoxMcpShim');
const { serializeCm2096DurableTombstoneMarker } = require('../src/core/Cm2096TombstonePayloadSerializer');
const { IDENTITY_FILENAME, expectedIdentityBytes, verifyCm2096TargetStoreIdentity } = require('../src/core/Cm2096TargetStoreIdentity');
const { collectCm2096RealStoreProjection } = require('../src/core/Cm2096RealStoreProjectionCollector');

const proofPayload = require('../docs/near-model-memory-plan-pack/phase8_native_write_proof_record_cm2089.json');

async function fixtureStore() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2096-store-'));
  const dir = path.join(root, 'codex-memory-governed');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(root, IDENTITY_FILENAME), expectedIdentityBytes(), { flag: 'wx' });
  await fs.writeFile(path.join(dir, 'synthetic-target-4f863f52455147c6.md'), createRecordMarkdown(proofPayload), { flag: 'wx' });
  return { root, dir };
}

test('CM-2096 target store identity is exact and never auto-created', async () => {
  const missing = await fs.mkdtemp(path.join(os.tmpdir(), 'cm2096-store-missing-'));
  assert.equal((await verifyCm2096TargetStoreIdentity(missing)).reasonCode, 'target_store_identity_missing');
  const { root } = await fixtureStore();
  const result = await verifyCm2096TargetStoreIdentity(root);
  assert.equal(result.accepted, true);
  assert.equal(result.identitySha256, 'e28d9b2ffae919aeb2f49a5882badac92a0df20d6886400137cdbf3527000a13');
  assert.equal(result.rawPathDisclosed, false);
});

test('CM-2096 collector verifies exact pre/post store state without returning content or paths', async () => {
  const { root, dir } = await fixtureStore();
  const pre = await collectCm2096RealStoreProjection({ knowledgeBaseRootPath: root, stage: 'pre_rollback' });
  assert.equal(pre.accepted, true, pre.reasonCode);
  assert.equal(pre.markerAbsent, true);
  assert.equal(pre.targetRecordProjection.durableBytes, 269);
  assert.equal(JSON.stringify(pre).includes(root), false);
  const marker = serializeCm2096DurableTombstoneMarker();
  await fs.writeFile(path.join(dir, 'synthetic-marker-27a5e58649908bbc.md'), marker.markdown, { flag: 'wx' });
  const post = await collectCm2096RealStoreProjection({ knowledgeBaseRootPath: root, stage: 'post_rollback' });
  assert.equal(post.accepted, true, post.reasonCode);
  assert.equal(post.receiptCorrelationRequired, true);
  assert.equal(post.tombstoneMarkerProjection.receiptBindingMatched, false);
  assert.equal(post.targetRecordProjection.durableSha256, '4f863f52455147c691c873cc5821f82e9904b6df554d6aeaf2ac960a1baa3828');
  assert.equal(post.tombstoneMarkerProjection.durableSha256, '27a5e58649908bbc4f835d891149d028e71dcc5042dcb13daaa597bd4286263a');
  assert.equal(post.otherRealMemoryRead, false);
  assert.equal(JSON.stringify(post).includes(root), false);
});

test('CM-2096 collector fails closed on unexpected files or marker drift', async () => {
  const { root, dir } = await fixtureStore();
  await fs.writeFile(path.join(dir, 'unexpected.md'), 'not read', { flag: 'wx' });
  assert.equal((await collectCm2096RealStoreProjection({ knowledgeBaseRootPath: root, stage: 'pre_rollback' })).accepted, false);
});
