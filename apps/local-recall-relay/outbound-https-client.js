'use strict';

const https = require('node:https');

const {
  LIMITS,
  assertCanonicalPublicOrigin,
  reject
} = require('../../packages/chatgpt-r4-contracts');

const MAX_EDGE_RESPONSE_BYTES = LIMITS.maxResponseBytes + LIMITS.maxRequestBytes + 4096;

function createOutboundEdgeClient(edgeOrigin, {
  authToken,
  timeoutMs = 5_000,
  request = https.request
} = {}) {
  const baseUrl = assertCanonicalPublicOrigin(edgeOrigin);
  if (typeof authToken !== 'string' || authToken.length < 32 || authToken.length > 2048 ||
      !/^[A-Za-z0-9._~+/-]+$/u.test(authToken)) {
    reject('relay_edge_auth_token_invalid');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 30_000) {
    reject('relay_edge_timeout_invalid');
  }
  if (typeof request !== 'function') reject('relay_https_request_invalid');

  const invoke = (pathname, body, { signal } = {}) => requestJson({
    baseUrl,
    pathname,
    body,
    authToken,
    timeoutMs,
    request,
    signal
  });

  return Object.freeze({
    claim(relayId, options) {
      return invoke('/v1/relay/claim', { relay_id: relayId }, options);
    },
    acknowledge(claim, options) {
      return invoke('/v1/relay/ack', claimControl(claim), options);
    },
    complete(claim, response, options) {
      return invoke(
        '/v1/relay/complete',
        { ...claimControl(claim), response },
        options
      );
    },
    state(claim, options) {
      return invoke('/v1/relay/state', claimControl(claim), options);
    }
  });
}

function claimControl(claim) {
  if (!claim || typeof claim !== 'object' || Array.isArray(claim) ||
      typeof claim.request_id !== 'string' || typeof claim.claim_token !== 'string') {
    reject('relay_claim_invalid');
  }
  return { request_id: claim.request_id, claim_token: claim.claim_token };
}

function requestJson({
  baseUrl,
  pathname,
  body,
  authToken,
  timeoutMs,
  request,
  signal
}) {
  return new Promise((resolve, rejectRequest) => {
    let settled = false;
    let outgoing = null;
    validateAbortSignal(signal);
    function cleanup() {
      signal?.removeEventListener('abort', onAbort);
    }
    function fail(code) {
      if (settled) return;
      settled = true;
      cleanup();
      rejectRequest(Object.assign(new Error(code), { code }));
    }
    function succeed(value) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    }
    function onAbort() {
      if (settled) return;
      fail('relay_cancelled');
      outgoing?.destroy();
    }
    if (signal?.aborted) {
      fail('relay_cancelled');
      return;
    }
    let encoded;
    try {
      encoded = Buffer.from(JSON.stringify(body), 'utf8');
    } catch {
      fail('relay_edge_request_invalid');
      return;
    }
    if (encoded.length > MAX_EDGE_RESPONSE_BYTES) {
      fail('relay_edge_request_too_large');
      return;
    }
    outgoing = request({
      protocol: 'https:',
      hostname: baseUrl.hostname,
      port: baseUrl.port || 443,
      path: pathname,
      method: 'POST',
      headers: {
        authorization: `Bearer ${authToken}`,
        'content-type': 'application/json',
        'content-length': encoded.length,
        'cache-control': 'no-store',
        accept: 'application/json'
      },
      agent: false
    }, incoming => {
      if (settled) {
        incoming.destroy();
        return;
      }
      if (incoming.statusCode === 204) {
        incoming.resume();
        succeed(null);
        return;
      }
      const chunks = [];
      let bytes = 0;
      incoming.on('data', chunk => {
        if (settled) return;
        bytes += chunk.length;
        if (bytes > MAX_EDGE_RESPONSE_BYTES) {
          incoming.destroy();
          fail('relay_edge_response_too_large');
          return;
        }
        chunks.push(chunk);
      });
      incoming.on('end', () => {
        if (settled) return;
        const statusCode = incoming.statusCode || 500;
        if (statusCode >= 500) {
          fail('relay_edge_unavailable');
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          fail('relay_edge_response_invalid');
          return;
        }
        if (statusCode < 200 || statusCode >= 300) {
          const code = typeof parsed?.error === 'string' ? parsed.error : 'relay_edge_rejected';
          fail(/^[a-z][a-z0-9_]{0,79}$/u.test(code) ? code : 'relay_edge_rejected');
          return;
        }
        succeed(parsed);
      });
      incoming.on('error', () => fail('relay_edge_unavailable'));
    });
    outgoing.on('error', error => {
      fail(error?.code === 'relay_edge_timeout' ? 'relay_edge_timeout' : 'relay_edge_unavailable');
    });
    outgoing.setTimeout(timeoutMs, () => {
      outgoing.destroy(Object.assign(new Error('relay_edge_timeout'), { code: 'relay_edge_timeout' }));
    });
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }
    outgoing.end(encoded);
  });
}

function validateAbortSignal(signal) {
  if (signal === undefined) return;
  if (!signal || typeof signal !== 'object' ||
      typeof signal.aborted !== 'boolean' ||
      typeof signal.addEventListener !== 'function' ||
      typeof signal.removeEventListener !== 'function') {
    reject('relay_abort_signal_invalid');
  }
}

module.exports = {
  MAX_EDGE_RESPONSE_BYTES,
  claimControl,
  createOutboundEdgeClient,
  requestJson
};
