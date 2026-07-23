'use strict';

const {
  computeGovernanceRuntimeBindingDigest,
  validateLoopbackEndpoint
} = require('./governance-runtime-authority');
const { reject } = require('../../../packages/chatgpt-r4-contracts');

const ISOLATED_SHIM_TARGET_KEYS = Object.freeze([
  'schema_version',
  'target_reference',
  'bind_host',
  'bind_port',
  'mcp_path',
  'listener_observed',
  'loopback_only',
  'native_write_enabled'
]);

function preparePrivateRuntimeEnvironment({
  baseEnvironment,
  isolatedShimTarget
} = {}) {
  if (!isPlainObject(baseEnvironment) || !isPlainObject(isolatedShimTarget)) {
    reject('r5k_private_runtime_preparation_invalid');
  }
  assertExactKeys(isolatedShimTarget, ISOLATED_SHIM_TARGET_KEYS);
  if (isolatedShimTarget.schema_version !== 1 ||
      isolatedShimTarget.listener_observed !== true ||
      isolatedShimTarget.loopback_only !== true ||
      isolatedShimTarget.native_write_enabled !== false) {
    reject('r5k_isolated_shim_target_untrusted');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(isolatedShimTarget.target_reference) ||
      /placeholder|example|todo|secret|token/iu.test(isolatedShimTarget.target_reference)) {
    reject('r5k_isolated_shim_target_reference_invalid');
  }
  if (!['127.0.0.1', '::1'].includes(isolatedShimTarget.bind_host) ||
      !Number.isInteger(isolatedShimTarget.bind_port) ||
      isolatedShimTarget.bind_port < 1 ||
      isolatedShimTarget.bind_port > 65_535 ||
      isolatedShimTarget.mcp_path !== '/mcp/vcp-native') {
    reject('r5k_isolated_shim_listener_invalid');
  }
  const host = isolatedShimTarget.bind_host === '::1'
    ? '[::1]'
    : isolatedShimTarget.bind_host;
  const endpoint = validateLoopbackEndpoint(
    `http://${host}:${isolatedShimTarget.bind_port}${isolatedShimTarget.mcp_path}`
  );
  const previousTargetReference =
    baseEnvironment.CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE;
  const previousEndpoint =
    baseEnvironment.CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT;
  const privateEnvironment = {
    ...baseEnvironment,
    CODEX_MEMORY_R4_NATIVE_TARGET_REFERENCE: isolatedShimTarget.target_reference,
    CODEX_MEMORY_R4_NATIVE_HTTP_ENDPOINT: endpoint
  };
  privateEnvironment.CODEX_MEMORY_R4_GOVERNANCE_BINDING_DIGEST =
    computeGovernanceRuntimeBindingDigest(privateEnvironment);

  return Object.freeze({
    private_environment: Object.freeze(privateEnvironment),
    receipt: Object.freeze({
      schema_version: 1,
      stage: 'R5-K',
      isolated_shim_target_bound: true,
      listener_observed_before_preparation: true,
      loopback_only: true,
      native_write_enabled: false,
      target_reference_bound: true,
      endpoint_bound: true,
      governance_binding_digest_recomputed: true,
      previous_target_replaced:
        previousTargetReference !== isolatedShimTarget.target_reference ||
        previousEndpoint !== endpoint,
      endpoint_disclosed: false,
      target_reference_disclosed: false,
      secret_values_returned: false
    })
  });
}

function assertExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (actual.length !== sortedExpected.length ||
      actual.some((key, index) => key !== sortedExpected[index])) {
    reject('r5k_isolated_shim_target_shape_invalid');
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

module.exports = {
  ISOLATED_SHIM_TARGET_KEYS,
  preparePrivateRuntimeEnvironment
};
