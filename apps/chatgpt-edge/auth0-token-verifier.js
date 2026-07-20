'use strict';

const { sha256, reject } = require('../../packages/chatgpt-r4-contracts');

const SUBJECT_FINGERPRINT_PATTERN = /^sha256:[a-f0-9]{64}$/u;

let joseModulePromise;

function loadJose() {
  if (!joseModulePromise) joseModulePromise = import('jose');
  return joseModulePromise;
}

function createAuth0TokenVerifier({
  issuer,
  audience,
  jwksUri,
  expectedClientId,
  operatorSubjectFingerprint,
  requiredScope = 'memory.read',
  clockToleranceSeconds = 5,
  jwks
} = {}) {
  const issuerUrl = parseCanonicalHttpsRoot(issuer, 'edge_oauth_issuer_invalid', true);
  const audienceUrl = parseCanonicalHttpsMcpResource(audience, 'edge_oauth_audience_invalid');
  const jwksUrl = parseHttpsUrl(jwksUri, 'edge_oauth_jwks_uri_invalid');
  if (jwksUrl.origin !== issuerUrl.origin || jwksUrl.pathname !== '/.well-known/jwks.json' ||
      jwksUrl.search || jwksUrl.hash) {
    reject('edge_oauth_jwks_uri_mismatch');
  }
  if (typeof expectedClientId !== 'string' || expectedClientId.length < 8 ||
      expectedClientId.length > 160 || expectedClientId.trim() !== expectedClientId) {
    reject('edge_oauth_client_id_invalid');
  }
  if (typeof operatorSubjectFingerprint !== 'string' ||
      !SUBJECT_FINGERPRINT_PATTERN.test(operatorSubjectFingerprint)) {
    reject('edge_operator_subject_fingerprint_invalid');
  }
  if (typeof requiredScope !== 'string' || !/^[A-Za-z0-9._:-]{1,120}$/u.test(requiredScope)) {
    reject('edge_oauth_required_scope_invalid');
  }
  if (!Number.isInteger(clockToleranceSeconds) || clockToleranceSeconds < 0 || clockToleranceSeconds > 30) {
    reject('edge_oauth_clock_tolerance_invalid');
  }
  const keySetPromise = jwks
    ? Promise.resolve(jwks)
    : loadJose().then(({ createRemoteJWKSet }) => createRemoteJWKSet(jwksUrl, {
      timeoutDuration: 5_000,
      cooldownDuration: 30_000,
      cacheMaxAge: 10 * 60_000
    }));

  return async function verifyAccessToken(token) {
    if (typeof token !== 'string' || token.length < 32 || token.length > 16_384 ||
        !/^[A-Za-z0-9._~+/-]+$/u.test(token)) {
      reject('edge_oauth_token_invalid');
    }
    let verified;
    try {
      const [{ jwtVerify }, keySet] = await Promise.all([loadJose(), keySetPromise]);
      verified = await jwtVerify(token, keySet, {
        issuer,
        audience,
        algorithms: ['RS256'],
        clockTolerance: clockToleranceSeconds,
        requiredClaims: ['iss', 'aud', 'sub', 'exp', 'iat']
      });
    } catch {
      reject('edge_oauth_token_invalid');
    }
    const payload = verified.payload;
    if (payload.aud !== audience) reject('edge_oauth_audience_mismatch');
    if (typeof payload.sub !== 'string' || payload.sub.length < 1 || payload.sub.length > 255) {
      reject('edge_oauth_subject_invalid');
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) ||
        payload.iat > nowSeconds + clockToleranceSeconds || payload.exp <= payload.iat) {
      reject('edge_oauth_token_time_invalid');
    }
    const clientId = typeof payload.azp === 'string'
      ? payload.azp
      : (typeof payload.client_id === 'string' ? payload.client_id : null);
    if (clientId !== expectedClientId) reject('edge_oauth_client_mismatch');
    const scopes = parseScopes(payload.scope);
    if (!scopes.includes(requiredScope)) reject('edge_oauth_scope_missing');
    const subjectFingerprint = sha256(`${issuer}\n${payload.sub}`);
    if (subjectFingerprint !== operatorSubjectFingerprint) reject('edge_oauth_operator_mismatch');
    return Object.freeze({
      clientId,
      scopes: Object.freeze(scopes),
      expiresAt: payload.exp,
      issuer,
      audience,
      subjectFingerprint
    });
  };
}

function parseScopes(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048) {
    reject('edge_oauth_scope_invalid');
  }
  const scopes = value.split(' ').filter(Boolean);
  if (scopes.length < 1 || new Set(scopes).size !== scopes.length ||
      scopes.some(scope => !/^[A-Za-z0-9._:-]{1,120}$/u.test(scope))) {
    reject('edge_oauth_scope_invalid');
  }
  return scopes.sort();
}

function parseCanonicalHttpsRoot(value, code, trailingSlashRequired) {
  const parsed = parseHttpsUrl(value, code);
  if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.origin !== value.replace(/\/$/u, '')) {
    reject(code);
  }
  if (trailingSlashRequired !== value.endsWith('/')) reject(code);
  return parsed;
}

function parseCanonicalHttpsMcpResource(value, code) {
  const parsed = parseHttpsUrl(value, code);
  if (parsed.pathname !== '/mcp' || parsed.search || parsed.hash || parsed.href !== value) reject(code);
  return parsed;
}

function parseHttpsUrl(value, code) {
  if (typeof value !== 'string' || value.trim() !== value || value.length > 2048) reject(code);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    reject(code);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) reject(code);
  return parsed;
}

module.exports = {
  SUBJECT_FINGERPRINT_PATTERN,
  createAuth0TokenVerifier,
  parseScopes
};
