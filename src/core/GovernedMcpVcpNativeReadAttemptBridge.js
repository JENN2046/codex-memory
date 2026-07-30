'use strict';

const http = require('node:http');

const {
  LIMITS,
  appendGovernedReadAttemptStage,
  isGovernedReadAttemptWorkingSetExtension,
  validateGovernedReadAttemptWorkingSet
} = require('../../packages/chatgpt-r4-contracts');

const MAX_HTTP_BODY_BYTES =
  LIMITS.maxRequestBytes + LIMITS.maxResponseBytes + 64 * 1024;
const DEFAULT_HTTP_TIMEOUT_MS = 20_000;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;

function codedError(code) {
  return Object.assign(new Error(code), { code });
}

function failedDelegation(workingSet) {
  return Object.freeze({
    accepted: false,
    working_set: appendGovernedReadAttemptStage(workingSet, {
      stage: 'BRIDGE_DELEGATED',
      outcome: 'failed',
      reasonCode: 'bridge_delegation_failed',
      counterFacts: {
        fallback: { attempts: 0 }
      }
    }),
    evidence_complete: false,
    result: null,
    terminal_failure: null,
    cleanup_complete: false
  });
}

function createGovernedReadAttemptBridge({
  invokeShim
} = {}) {
  if (typeof invokeShim !== 'function') {
    throw codedError('governed_read_bridge_invoker_invalid');
  }

  return Object.freeze({
    async invoke({
      workingSet,
      authorization,
      query,
      limit
    } = {}) {
      validateGovernedReadAttemptWorkingSet(workingSet);
      const lastReceipt = workingSet.receipts.at(-1);
      if (lastReceipt?.stage !== 'AUTHORIZED' ||
          lastReceipt.outcome !== 'completed') {
        throw codedError('governed_read_bridge_stage_invalid');
      }
      const delegated = appendGovernedReadAttemptStage(workingSet, {
        stage: 'BRIDGE_DELEGATED',
        counterFacts: {
          fallback: { attempts: 0 }
        }
      });
      try {
        const response = await invokeShim({
          workingSet: delegated,
          authorization,
          query,
          limit
        });
        if (!response ||
            typeof response !== 'object' ||
            Array.isArray(response) ||
            !response.working_set ||
            !isGovernedReadAttemptWorkingSetExtension(
              delegated,
              response.working_set
            ) ||
            (response.terminal_failure !== null &&
              response.terminal_failure?.reason_code !==
                'worker_shutdown_incomplete')) {
          throw codedError('governed_read_bridge_response_invalid');
        }
        return response;
      } catch {
        return failedDelegation(workingSet);
      }
    }
  });
}

function validateLoopbackEndpoint(value) {
  let endpoint;
  try {
    endpoint = new URL(value);
  } catch {
    throw codedError('governed_read_bridge_endpoint_invalid');
  }
  if (endpoint.protocol !== 'http:' ||
      endpoint.hostname !== '127.0.0.1' ||
      !endpoint.port ||
      endpoint.pathname !== '/v1/governed-read-attempt' ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash) {
    throw codedError('governed_read_bridge_endpoint_invalid');
  }
  return endpoint;
}

function createGovernedReadShimHttpClient({
  endpoint,
  runtimeBindingDigest,
  timeoutMs = DEFAULT_HTTP_TIMEOUT_MS,
  request = http.request
} = {}) {
  const target = validateLoopbackEndpoint(endpoint);
  if (typeof runtimeBindingDigest !== 'string' ||
      !DIGEST_PATTERN.test(runtimeBindingDigest)) {
    throw codedError('governed_read_bridge_runtime_binding_invalid');
  }
  if (!Number.isInteger(timeoutMs) ||
      timeoutMs < 10 ||
      timeoutMs > 60_000 ||
      typeof request !== 'function') {
    throw codedError('governed_read_bridge_http_config_invalid');
  }

  return function invokeShim(input) {
    let encoded;
    try {
      encoded = Buffer.from(JSON.stringify({
        authorization: input.authorization,
        limit: input.limit,
        query: input.query,
        working_set: input.workingSet
      }), 'utf8');
    } catch {
      return Promise.reject(
        codedError('governed_read_bridge_request_invalid')
      );
    }
    if (encoded.length > MAX_HTTP_BODY_BYTES) {
      return Promise.reject(
        codedError('governed_read_bridge_request_too_large')
      );
    }
    return new Promise((resolve, rejectRequest) => {
      let settled = false;
      const outgoing = request({
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': encoded.length,
          'cache-control': 'no-store',
          'x-governed-runtime-binding': runtimeBindingDigest
        },
        agent: false
      }, incoming => {
        const chunks = [];
        let bytes = 0;
        incoming.on('data', chunk => {
          if (settled) return;
          bytes += chunk.length;
          if (bytes > MAX_HTTP_BODY_BYTES) {
            settled = true;
            incoming.destroy();
            rejectRequest(
              codedError('governed_read_bridge_response_too_large')
            );
            return;
          }
          chunks.push(chunk);
        });
        incoming.on('end', () => {
          if (settled) return;
          settled = true;
          try {
            const value = JSON.parse(
              Buffer.concat(chunks, bytes).toString('utf8')
            );
            if ((incoming.statusCode || 500) < 200 ||
                (incoming.statusCode || 500) >= 300) {
              throw codedError('governed_read_bridge_http_rejected');
            }
            resolve(value);
          } catch {
            rejectRequest(
              codedError('governed_read_bridge_response_invalid')
            );
          }
        });
        incoming.on('error', () => {
          if (!settled) {
            settled = true;
            rejectRequest(
              codedError('governed_read_bridge_http_unavailable')
            );
          }
        });
      });
      outgoing.on('error', () => {
        if (!settled) {
          settled = true;
          rejectRequest(
            codedError('governed_read_bridge_http_unavailable')
          );
        }
      });
      outgoing.setTimeout(timeoutMs, () => {
        outgoing.destroy();
        if (!settled) {
          settled = true;
          rejectRequest(
            codedError('governed_read_bridge_http_timeout')
          );
        }
      });
      outgoing.end(encoded);
    });
  };
}

module.exports = {
  DEFAULT_HTTP_TIMEOUT_MS,
  MAX_HTTP_BODY_BYTES,
  createGovernedReadAttemptBridge,
  createGovernedReadShimHttpClient,
  validateLoopbackEndpoint
};
