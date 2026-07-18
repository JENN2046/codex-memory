'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  ZERO_MEMORY_COUNTERS,
  createResponseEnvelope,
  digestObject,
  sha256
} = require('../../packages/chatgpt-r4-contracts');
const {
  createLoopbackEdgeClient,
  createUdsForwarder
} = require('../../apps/local-recall-relay');
const { signing } = require('./synthetic-harness');
const {
  createLocalIntegrationHarness,
  runR4CLocalIntegrationProof
} = require('./local-integration-harness');

test('R4-C uses actual loopback HTTP and temporary UDS with zero memory counters and no body events', async () => {
  const result = await runR4CLocalIntegrationProof();
  assert.deepEqual(result.artifact.counters, ZERO_MEMORY_COUNTERS);
  assert.equal(result.artifact.accepted, true);
  assert.equal(result.artifact.stage, 'R4-C');
  assert.equal(result.artifact.loopback_host_exact, true);
  assert.equal(result.artifact.edge_port_ephemeral, true);
  assert.equal(result.artifact.temporary_uds_used, true);
  assert.equal(result.artifact.claim_ack_passed, true);
  assert.equal(result.artifact.response_correlation_passed, true);
  assert.equal(result.artifact.body_log_absence_passed, true);
  assert.equal(result.artifact.context_resolution_count, 1);
  assert.equal(result.artifact.governed_invocation_count, 1);
  assert.equal(result.artifact.uds_connection_count, 2);
  assert.equal(result.artifact.durable_remote_state_written, false);
  assert.equal(result.artifact.external_runtime_used, false);
  assert.equal(result.artifact.provider_call_performed, false);
  assert.equal(result.artifact.real_memory_read_performed, false);
  assert.equal(result.artifact.public_tool_surface_expanded, false);
  assert.deepEqual(result.harnessSnapshot.states, {
    queued: 0,
    claimed: 0,
    completed: 2,
    cancelled: 0,
    expired: 0
  });
});

test('R4-C request expiry fails closed before claim or UDS forwarding', async t => {
  const harness = await createLocalIntegrationHarness({ terminalRetentionMs: 50 });
  t.after(() => harness.close());
  const request = harness.buildRequest('resolve_memory_context', {
    project_alias: 'project-alpha'
  }, { ttlSeconds: 1 });
  await harness.edgeClient.submit(request);
  harness.advance(1_001);
  assert.equal(await harness.edgeClient.claim('expiry-relay'), null);
  assert.deepEqual(await harness.edgeClient.result(request.request_id), {
    request_id: request.request_id,
    status: 'expired'
  });
  assert.equal(harness.observations.uds_connections, 0);
  assert.equal(harness.observations.governance_invocations, 0);
  harness.advance(51);
  await assert.rejects(() => harness.edgeClient.result(request.request_id), {
    code: 'edge_request_not_found'
  });
});

test('R4-C reconnect reclaims an unacknowledged request only after the claim lease expires', async t => {
  const harness = await createLocalIntegrationHarness({ claimLeaseMs: 50 });
  t.after(() => harness.close());
  const request = harness.buildRequest('resolve_memory_context', {
    project_alias: 'project-alpha'
  });
  await harness.edgeClient.submit(request);
  const abandoned = await harness.edgeClient.claim('abandoned-relay');
  assert.equal(abandoned.attempt, 1);
  assert.equal(await harness.edgeClient.claim('early-relay'), null);
  harness.advance(51);
  const recovered = await harness.relayRuntime.processNext();
  assert.equal(recovered.status, 'completed');
  assert.equal(recovered.attempt, 2);
  await assert.rejects(() => harness.edgeClient.acknowledge(abandoned), {
    code: 'edge_claim_missing'
  });
});

test('R4-C never requeues an acknowledged in-flight request after its claim lease expires', async t => {
  const harness = await createLocalIntegrationHarness({
    claimLeaseMs: 50,
    governanceDelayMs: 150,
    cancelPollMs: 2
  });
  t.after(() => harness.close());
  const request = harness.buildRequest('resolve_memory_context', {
    project_alias: 'project-alpha'
  });
  await harness.edgeClient.submit(request);
  const processing = harness.relayRuntime.processNext();
  await waitFor(() => harness.relayEvents.some(event => event.event === 'uds_forward_started'));
  harness.advance(51);
  const result = await processing;
  assert.equal(result.status, 'expired');
  assert.equal(await harness.edgeClient.claim('second-relay'), null);
  assert.equal((await harness.edgeClient.result(request.request_id)).status, 'expired');
  assert.equal(harness.observations.uds_connections, 1);
  assert.equal(harness.observations.governance_invocations, 0);
});

test('R4-C rejects duplicate submission and duplicate claim acknowledgement as replay', async t => {
  const harness = await createLocalIntegrationHarness();
  t.after(() => harness.close());
  const request = harness.buildRequest('resolve_memory_context', {
    project_alias: 'project-alpha'
  });
  await harness.edgeClient.submit(request);
  await assert.rejects(() => harness.edgeClient.submit(request), { code: 'replay_detected' });
  const claim = await harness.edgeClient.claim('replay-relay');
  await harness.edgeClient.acknowledge(claim);
  await assert.rejects(() => harness.edgeClient.acknowledge(claim), { code: 'edge_claim_ack_replay' });
  await harness.edgeClient.cancel(request.request_id);
  harness.advance(5_001);
  await assert.rejects(() => harness.edgeClient.submit(request), { code: 'replay_detected' });
  assert.equal(harness.observations.uds_connections, 0);
});

test('R4-C cancellation aborts an in-flight UDS request before governance invocation', async t => {
  const harness = await createLocalIntegrationHarness({ governanceDelayMs: 150, cancelPollMs: 2 });
  t.after(() => harness.close());
  const request = harness.buildRequest('resolve_memory_context', {
    project_alias: 'project-alpha'
  });
  await harness.edgeClient.submit(request);
  const processing = harness.relayRuntime.processNext();
  await waitFor(() => harness.relayEvents.some(event => event.event === 'uds_forward_started'));
  await harness.edgeClient.cancel(request.request_id);
  const result = await processing;
  assert.equal(result.status, 'cancelled');
  assert.equal((await harness.edgeClient.result(request.request_id)).status, 'cancelled');
  assert.equal(harness.observations.uds_connections, 1);
  assert.equal(harness.observations.governance_invocations, 0);
});

test('R4-C completion cannot overwrite cancellation during asynchronous response verification', async t => {
  const harness = await createLocalIntegrationHarness({
    responseVerificationDelayMs: 100,
    cancelPollMs: 2
  });
  t.after(() => harness.close());
  const request = harness.buildRequest('resolve_memory_context', {
    project_alias: 'project-alpha'
  });
  await harness.edgeClient.submit(request);
  const processing = harness.relayRuntime.processNext();
  await waitFor(() => harness.relayEvents.some(event => event.event === 'uds_forward_completed'));
  await harness.edgeClient.cancel(request.request_id);
  const result = await processing;
  assert.equal(result.status, 'cancelled');
  assert.equal((await harness.edgeClient.result(request.request_id)).status, 'cancelled');
  assert.equal(harness.observations.uds_connections, 1);
  assert.equal(harness.observations.context_resolutions, 1);
  assert.equal(harness.observations.governance_invocations, 0);
});

test('R4-C rejects completion before ack and a signed response with the wrong request correlation', async t => {
  const harness = await createLocalIntegrationHarness();
  t.after(() => harness.close());
  const request = harness.buildRequest('memory_overview', {
    project_context_ref: `pctx_${'x'.repeat(32)}`
  });
  await harness.edgeClient.submit(request);
  const claim = await harness.edgeClient.claim('correlation-relay');
  const forged = createResponseEnvelope({
    requestId: 'req_wrong_response_correlation_0001',
    requestDigest: digestObject(request),
    toolName: 'memory_overview',
    status: 'ok',
    structuredContent: { status: 'empty', kind: 'overview', item_count: 0 },
    counters: { ...ZERO_MEMORY_COUNTERS },
    receiptChain: {
      edge_request: digestObject(request),
      relay: sha256('r4c-forged-relay'),
      governance: sha256('r4c-forged-governance'),
      context: sha256('r4c-forged-context')
    },
    now: harness.clock(),
    signing: signing(harness.identities.relayIdentity)
  });
  await assert.rejects(() => harness.edgeClient.complete(claim, forged), {
    code: 'edge_claim_not_acknowledged'
  });
  await harness.edgeClient.acknowledge(claim);
  await assert.rejects(() => harness.edgeClient.complete(claim, forged), {
    code: 'response_request_id_mismatch'
  });
  assert.equal((await harness.edgeClient.state(claim)).status, 'claimed');
  await harness.edgeClient.cancel(request.request_id);
});

test('R4-C Relay client rejects non-loopback Edge URLs before any network call', () => {
  for (const value of [
    'http://0.0.0.0:8080',
    'http://localhost:8080',
    'http://127.1:8080',
    'http://[::1]:8080',
    'https://127.0.0.1:8080',
    'http://127.0.0.1:8080/path',
    'http://user@127.0.0.1:8080'
  ]) {
    assert.throws(() => createLoopbackEdgeClient(value), { code: 'relay_edge_not_loopback' });
  }
});

test('R4-C Relay client accepts either canonical spelling of the loopback root URL', () => {
  assert.doesNotThrow(() => createLoopbackEdgeClient('http://127.0.0.1:8080'));
  assert.doesNotThrow(() => createLoopbackEdgeClient('http://127.0.0.1:8080/'));
});

test('R4-C UDS forwarding preserves UTF-8 split across socket chunks', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-memory-r4c-utf8-'));
  const socketPath = path.join(directory, 'governance.sock');
  const expected = { status: 'ok', structured_content: { summary: '受治理记忆' } };
  const encoded = Buffer.from(`${JSON.stringify(expected)}\n`, 'utf8');
  const multibyteStart = encoded.indexOf(Buffer.from('受', 'utf8'));
  const server = net.createServer(socket => {
    socket.once('data', () => {
      socket.write(encoded.subarray(0, multibyteStart + 1));
      setImmediate(() => socket.end(encoded.subarray(multibyteStart + 1)));
    });
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  await new Promise((resolve, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(socketPath, resolve);
  });

  const forward = createUdsForwarder({ socketPath });
  assert.deepEqual(await forward({ request: 'synthetic' }), expected);
});

async function waitFor(predicate, timeoutMs = 1_000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error('condition_timeout');
    await new Promise(resolve => setTimeout(resolve, 2));
  }
}
