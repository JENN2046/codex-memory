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
      authToken.trim() !== authToken || /[\r\n]/u.test(authToken)) {
    reject('relay_edge_auth_token_invalid');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 30_000) {
    reject('relay_edge_timeout_invalid');
  }
  if (typeof request !== 'function') reject('relay_https_request_invalid');

  const invoke = (pathname, body) => requestJson({
    baseUrl,
    pathname,
    body,
    authToken,
    timeoutMs,
    request
  });

  return Object.freeze({
    claim(relayId) {
      return invoke('/v1/relay/claim', { relay_id: relayId });
    },
    acknowledge(claim) {
      return invoke('/v1/relay/ack', claimControl(claim));
    },
    complete(claim, response) {
      return invoke('/v1/relay/complete', { ...claimControl(claim), response });
    },
    state(claim) {
      return invoke('/v1/relay/state', claimControl(claim));
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

function requestJson({ baseUrl, pathname, body, authToken, timeoutMs, request }) {
  return new Promise((resolve, rejectRequest) => {
    let settled = false;
    function fail(code) {
      if (settled) return;
      settled = true;
      rejectRequest(Object.assign(new Error(code), { code }));
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
    const outgoing = request({
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
      if (incoming.statusCode === 204) {
        settled = true;
        incoming.resume();
        resolve(null);
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
        let parsed;
        try {
          parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          fail('relay_edge_response_invalid');
          return;
        }
        if ((incoming.statusCode || 500) < 200 || (incoming.statusCode || 500) >= 300) {
          const code = typeof parsed?.error === 'string' ? parsed.error : 'relay_edge_rejected';
          fail(/^[a-z][a-z0-9_]{0,79}$/u.test(code) ? code : 'relay_edge_rejected');
          return;
        }
        settled = true;
        resolve(parsed);
      });
      incoming.on('error', () => fail('relay_edge_unavailable'));
    });
    outgoing.on('error', error => {
      fail(error?.code === 'relay_edge_timeout' ? 'relay_edge_timeout' : 'relay_edge_unavailable');
    });
    outgoing.setTimeout(timeoutMs, () => {
      outgoing.destroy(Object.assign(new Error('relay_edge_timeout'), { code: 'relay_edge_timeout' }));
    });
    outgoing.end(encoded);
  });
}

module.exports = {
  MAX_EDGE_RESPONSE_BYTES,
  claimControl,
  createOutboundEdgeClient,
  requestJson
};
