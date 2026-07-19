'use strict';

const http = require('node:http');

const { LIMITS, reject } = require('../../packages/chatgpt-r4-contracts');

const MAX_EDGE_RESPONSE_BYTES = LIMITS.maxResponseBytes + LIMITS.maxRequestBytes + 4096;

function createLoopbackEdgeClient(edgeUrl, { timeoutMs = 1_000 } = {}) {
  const baseUrl = validateLoopbackUrl(edgeUrl);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 30_000) {
    reject('relay_edge_timeout_invalid');
  }

  return Object.freeze({
    submit(request) {
      return requestJson(baseUrl, '/v1/requests/submit', { request }, timeoutMs);
    },
    claim(relayId) {
      return requestJson(baseUrl, '/v1/relay/claim', { relay_id: relayId }, timeoutMs);
    },
    acknowledge(claim) {
      return requestJson(baseUrl, '/v1/relay/ack', claimControl(claim), timeoutMs);
    },
    complete(claim, response) {
      return requestJson(baseUrl, '/v1/relay/complete', { ...claimControl(claim), response }, timeoutMs);
    },
    state(claim) {
      return requestJson(baseUrl, '/v1/relay/state', claimControl(claim), timeoutMs);
    },
    cancel(requestId) {
      return requestJson(baseUrl, '/v1/requests/cancel', { request_id: requestId }, timeoutMs);
    },
    result(requestId) {
      return requestJson(baseUrl, '/v1/requests/result', { request_id: requestId }, timeoutMs);
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

function validateLoopbackUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    reject('relay_edge_url_invalid');
  }
  if (parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1' || !parsed.port ||
      parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    reject('relay_edge_not_loopback');
  }
  const canonical = `http://127.0.0.1:${parsed.port}`;
  if (value !== canonical && value !== `${canonical}/`) reject('relay_edge_not_loopback');
  return parsed;
}

function requestJson(baseUrl, pathname, body, timeoutMs) {
  return new Promise((resolve, rejectRequest) => {
    function fail(code) {
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
    const outgoing = http.request({
      protocol: baseUrl.protocol,
      hostname: baseUrl.hostname,
      port: baseUrl.port,
      path: pathname,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': encoded.length,
        'cache-control': 'no-store'
      },
      agent: false
    }, incoming => {
      if (incoming.statusCode === 204) {
        incoming.resume();
        resolve(null);
        return;
      }
      const chunks = [];
      let bytes = 0;
      incoming.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_EDGE_RESPONSE_BYTES) {
          incoming.destroy();
          fail('relay_edge_response_too_large');
          return;
        }
        chunks.push(chunk);
      });
      incoming.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          if ((incoming.statusCode || 500) < 200 || (incoming.statusCode || 500) >= 300) {
            const code = typeof parsed?.error === 'string' ? parsed.error : 'relay_edge_rejected';
            fail(/^[a-z][a-z0-9_]{0,79}$/u.test(code) ? code : 'relay_edge_rejected');
            return;
          }
          resolve(parsed);
        } catch (error) {
          fail('relay_edge_response_invalid');
        }
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
  createLoopbackEdgeClient,
  validateLoopbackUrl
};
