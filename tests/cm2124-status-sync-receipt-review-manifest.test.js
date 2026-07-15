'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertExactFreezeManifest
} = require('../scripts/review-cm2124-status-sync-receipts');
const {
  OUTPUTS,
  renderMarkdown
} = require('../scripts/freeze-cm2124-status-sync-receipts');
const {
  serializeArtifact
} = require('../src/core/Cm2117ExactFullPlanApplicationDecision');

const repoRoot = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, OUTPUTS.manifest), 'utf8'));

function markdownIdentity(value = manifest) {
  return {
    gitObjectType: 'blob',
    gitMode: '100644',
    content: Buffer.from(renderMarkdown(value, serializeArtifact(value)), 'utf8')
  };
}

test('CM-2124 review requires the exact full freeze projection and markdown mirror', () => {
  assert.doesNotThrow(() => assertExactFreezeManifest(
    manifest,
    structuredClone(manifest.payload),
    markdownIdentity()
  ));

  for (const mutate of [
    value => { value.claim.authorizationReplayAllowed = true; },
    value => { value.verification.exactNineModifiedPaths = false; },
    value => { value.currentState.readinessClaimed = true; }
  ]) {
    const drift = structuredClone(manifest);
    mutate(drift.payload);
    assert.throws(
      () => assertExactFreezeManifest(drift, manifest.payload, markdownIdentity(drift)),
      /manifest_projection_rejected/
    );
  }

  const expanded = { ...structuredClone(manifest), readinessClaimed: true };
  assert.throws(
    () => assertExactFreezeManifest(expanded, manifest.payload, markdownIdentity(expanded)),
    /manifest_projection_rejected/
  );

  assert.throws(
    () => assertExactFreezeManifest(manifest, manifest.payload, {
      ...markdownIdentity(),
      content: Buffer.from('drifted markdown\n')
    }),
    /freeze_markdown_mirror_rejected/
  );
});
