'use strict';

const http = require('node:http');

const {
  InMemoryReplayGuard,
  LIMITS,
  createOpaqueId,
  reject
} = require('../../packages/chatgpt-r4-contracts');

const LOOPBACK_HOST = '127.0.0.1';
const MAX_CONTROL_BODY_BYTES = LIMITS.maxResponseBytes + LIMITS.maxRequestBytes + 4096;
const TERMINAL_STATES = new Set(['completed', 'cancelled', 'expired']);

function createLoopbackEdgeRuntime({
  verifyRequest,
  verifyResponse,
  clock = () => new Date(),
  claimLeaseMs = 5_000,
  terminalRetentionMs = 5_000,
  maxInFlight = 64,
  maxRecords = 256,
  eventSink
} = {}) {
  if (typeof verifyRequest !== 'function') reject('edge_request_verifier_missing');
  if (typeof verifyResponse !== 'function') reject('edge_response_verifier_missing');
  if (!Number.isInteger(claimLeaseMs) || claimLeaseMs < 10 || claimLeaseMs > 30_000) {
    reject('edge_claim_lease_invalid');
  }
  if (!Number.isInteger(terminalRetentionMs) || terminalRetentionMs < 10 || terminalRetentionMs > 30_000) {
    reject('edge_terminal_retention_invalid');
  }
  if (!Number.isInteger(maxInFlight) || maxInFlight < 1 || maxInFlight > 1024) {
    reject('edge_inflight_limit_invalid');
  }
  if (!Number.isInteger(maxRecords) || maxRecords < maxInFlight || maxRecords > 4096) {
    reject('edge_record_limit_invalid');
  }
  if (eventSink !== undefined && typeof eventSink !== 'function') reject('edge_event_sink_invalid');

  const records = new Map();
  const submissionReplayGuard = new InMemoryReplayGuard({
    maxEntries: maxRecords * 2,
    clock
  });
  let started = false;

  function emit(event, record, extra = {}) {
    if (!eventSink) return;
    eventSink(Object.freeze({
      component: 'loopback_edge',
      event,
      request_id: record?.request.request_id || null,
      status: record?.status || null,
      attempt: record?.attempt || 0,
      ...extra
    }));
  }

  function nowMs() {
    const value = clock();
    const milliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();
    if (!Number.isFinite(milliseconds)) reject('edge_clock_invalid');
    return milliseconds;
  }

  function refresh(record) {
    if (TERMINAL_STATES.has(record.status)) return;
    const currentMs = nowMs();
    const requestExpiresMs = Date.parse(record.request.expires_at);
    if (requestExpiresMs <= currentMs) {
      record.status = 'expired';
      record.claim = null;
      record.purge_after_ms = requestExpiresMs + terminalRetentionMs;
      emit('request_expired', record);
      return;
    }
    if (record.status === 'claimed' && record.claim.expires_ms <= currentMs) {
      const acknowledged = record.claim.acked;
      const claimExpiresMs = record.claim.expires_ms;
      record.status = acknowledged ? 'expired' : 'queued';
      record.claim = null;
      if (acknowledged) record.purge_after_ms = claimExpiresMs + terminalRetentionMs;
      emit(acknowledged ? 'acknowledged_claim_expired' : 'claim_expired', record);
    }
  }

  function pruneTerminals() {
    const currentMs = nowMs();
    for (const [requestId, record] of records) {
      if (TERMINAL_STATES.has(record.status) && record.purge_after_ms <= currentMs) {
        records.delete(requestId);
      }
    }
  }

  function requireRecord(requestId) {
    pruneTerminals();
    const record = records.get(requestId);
    if (!record) reject('edge_request_not_found');
    refresh(record);
    return record;
  }

  function requireLiveClaim(record, claimToken) {
    if (record.status === 'cancelled') reject('edge_request_cancelled');
    if (record.status === 'expired') reject('edge_request_expired');
    if (record.status !== 'claimed' || !record.claim) reject('edge_claim_missing');
    if (record.claim.token !== claimToken) reject('edge_claim_token_mismatch');
    if (record.claim.expires_ms <= nowMs()) {
      refresh(record);
      reject('edge_claim_expired');
    }
    return record.claim;
  }

  async function submit(request) {
    await verifyRequest(request);
    for (const record of records.values()) refresh(record);
    pruneTerminals();
    if (records.has(request.request_id)) reject('replay_detected');
    if (records.size >= maxRecords) reject('edge_record_capacity_exceeded');
    const activeCount = [...records.values()].filter(record => {
      refresh(record);
      return !TERMINAL_STATES.has(record.status);
    }).length;
    if (activeCount >= maxInFlight) reject('edge_inflight_capacity_exceeded');
    submissionReplayGuard.consumeMany([
      { namespace: 'edge_submission_request_id', key: request.request_id, expiresAt: request.expires_at },
      { namespace: 'edge_submission_nonce', key: request.nonce, expiresAt: request.expires_at }
    ]);
    const record = {
      request: structuredClone(request),
      response: null,
      status: 'queued',
      attempt: 0,
      claim: null,
      purge_after_ms: null
    };
    records.set(request.request_id, record);
    emit('request_queued', record);
    return { request_id: request.request_id, status: record.status };
  }

  function claim(relayId) {
    if (typeof relayId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u.test(relayId)) {
      reject('edge_relay_id_invalid');
    }
    pruneTerminals();
    for (const record of records.values()) {
      refresh(record);
      if (record.status !== 'queued') continue;
      const expiresMs = nowMs() + claimLeaseMs;
      record.status = 'claimed';
      record.attempt += 1;
      record.claim = {
        token: createOpaqueId('clm_', undefined, 18),
        relay_id: relayId,
        expires_ms: expiresMs,
        acked: false
      };
      emit('request_claimed', record);
      return {
        request_id: record.request.request_id,
        request: structuredClone(record.request),
        claim_token: record.claim.token,
        lease_expires_at: new Date(expiresMs).toISOString(),
        attempt: record.attempt
      };
    }
    return null;
  }

  function acknowledge(requestId, claimToken) {
    const record = requireRecord(requestId);
    const activeClaim = requireLiveClaim(record, claimToken);
    if (activeClaim.acked) reject('edge_claim_ack_replay');
    activeClaim.acked = true;
    emit('claim_acknowledged', record);
    return { request_id: requestId, status: 'acked', attempt: record.attempt };
  }

  async function complete(requestId, claimToken, response) {
    const record = requireRecord(requestId);
    const activeClaim = requireLiveClaim(record, claimToken);
    if (!activeClaim.acked) reject('edge_claim_not_acknowledged');
    await verifyResponse(response, record.request);
    const currentRecord = requireRecord(requestId);
    const currentClaim = requireLiveClaim(currentRecord, claimToken);
    if (!currentClaim.acked) reject('edge_claim_not_acknowledged');
    currentRecord.response = structuredClone(response);
    currentRecord.status = 'completed';
    currentRecord.claim = null;
    currentRecord.purge_after_ms = nowMs() + terminalRetentionMs;
    emit('request_completed', currentRecord);
    return { request_id: requestId, status: currentRecord.status };
  }

  function cancel(requestId) {
    const record = requireRecord(requestId);
    if (TERMINAL_STATES.has(record.status)) reject('edge_request_terminal');
    record.status = 'cancelled';
    record.claim = null;
    record.purge_after_ms = nowMs() + terminalRetentionMs;
    emit('request_cancelled', record);
    return { request_id: requestId, status: record.status };
  }

  function state(requestId, claimToken) {
    const record = requireRecord(requestId);
    if (record.status === 'claimed') requireLiveClaim(record, claimToken);
    return {
      request_id: requestId,
      status: record.status,
      attempt: record.attempt,
      claim_state: record.status === 'claimed'
        ? (record.claim.acked ? 'acked' : 'claimed')
        : 'none'
    };
  }

  function result(requestId) {
    const record = requireRecord(requestId);
    if (record.status !== 'completed') {
      return { request_id: requestId, status: record.status };
    }
    return {
      request_id: requestId,
      status: record.status,
      response: structuredClone(record.response)
    };
  }

  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const parsedUrl = new URL(incoming.url || '/', 'http://loopback.invalid');
      if (parsedUrl.search || parsedUrl.hash) reject('edge_route_query_forbidden');
      const route = `${incoming.method || ''} ${parsedUrl.pathname}`;
      if (route === 'POST /v1/requests/submit') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request']);
        return sendJson(outgoing, 202, await submit(body.request));
      }
      if (route === 'POST /v1/relay/claim') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['relay_id']);
        const claimed = claim(body.relay_id);
        return claimed ? sendJson(outgoing, 200, claimed) : sendEmpty(outgoing, 204);
      }
      if (route === 'POST /v1/relay/ack') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request_id', 'claim_token']);
        return sendJson(outgoing, 200, acknowledge(body.request_id, body.claim_token));
      }
      if (route === 'POST /v1/relay/complete') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request_id', 'claim_token', 'response']);
        return sendJson(outgoing, 200, await complete(body.request_id, body.claim_token, body.response));
      }
      if (route === 'POST /v1/relay/state') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request_id', 'claim_token']);
        return sendJson(outgoing, 200, state(body.request_id, body.claim_token));
      }
      if (route === 'POST /v1/requests/cancel') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request_id']);
        return sendJson(outgoing, 200, cancel(body.request_id));
      }
      if (route === 'POST /v1/requests/result') {
        const body = await readJsonBody(incoming);
        assertControlKeys(body, ['request_id']);
        return sendJson(outgoing, 200, result(body.request_id));
      }
      return sendJson(outgoing, 404, { error: 'edge_route_not_found' });
    } catch (error) {
      const code = safeErrorCode(error?.code, 'edge_request_rejected');
      const statusCode = code === 'replay_detected' || code.endsWith('_replay') ? 409 :
        (code.includes('expired') || code.includes('cancelled') ? 410 : 400);
      return sendJson(outgoing, statusCode, { error: code });
    }
  });

  return Object.freeze({
    async start() {
      if (started) reject('edge_runtime_already_started');
      await new Promise((resolve, rejectStart) => {
        const onError = error => {
          server.off('listening', onListening);
          rejectStart(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(0, '127.0.0.1');
      });
      started = true;
      const address = server.address();
      if (!address || typeof address === 'string' || address.address !== LOOPBACK_HOST) {
        await stopServer(server);
        started = false;
        reject('edge_loopback_bind_failed');
      }
      return Object.freeze({
        host: address.address,
        port: address.port,
        url: `http://${address.address}:${address.port}`
      });
    },
    async stop() {
      if (!started) return;
      await stopServer(server);
      started = false;
    },
    snapshot() {
      pruneTerminals();
      const counts = { queued: 0, claimed: 0, completed: 0, cancelled: 0, expired: 0 };
      for (const record of records.values()) {
        refresh(record);
        counts[record.status] += 1;
      }
      return Object.freeze({ in_memory_only: true, request_count: records.size, states: counts });
    }
  });
}

function readJsonBody(incoming) {
  return new Promise((resolve, rejectRead) => {
    const chunks = [];
    let bytes = 0;
    incoming.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_CONTROL_BODY_BYTES) {
        rejectRead(Object.assign(new Error('edge_http_body_too_large'), { code: 'edge_http_body_too_large' }));
        incoming.destroy();
        return;
      }
      chunks.push(chunk);
    });
    incoming.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!body || typeof body !== 'object' || Array.isArray(body)) reject('edge_http_body_invalid');
        resolve(body);
      } catch (error) {
        rejectRead(error);
      }
    });
    incoming.on('error', rejectRead);
  });
}

function safeErrorCode(value, fallback) {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(value) ? value : fallback;
}

function assertControlKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    reject('edge_control_shape_invalid');
  }
}

function sendJson(outgoing, statusCode, value) {
  if (outgoing.destroyed || outgoing.headersSent) return;
  const body = JSON.stringify(value);
  outgoing.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  outgoing.end(body);
}

function sendEmpty(outgoing, statusCode) {
  if (outgoing.destroyed || outgoing.headersSent) return;
  outgoing.writeHead(statusCode, { 'cache-control': 'no-store' });
  outgoing.end();
}

function stopServer(server) {
  return new Promise((resolve, rejectStop) => {
    server.close(error => error ? rejectStop(error) : resolve());
  });
}

module.exports = {
  LOOPBACK_HOST,
  createLoopbackEdgeRuntime
};
