'use strict';

const SOURCE_RUNTIMES = Object.freeze([
  'vcp_native',
  'vcp_native_unavailable',
  'local_fallback',
  'local_compatibility'
]);

const NATIVE_DELEGATED_STATUS = 'GOVERNED_MCP_VCP_NATIVE_READ_DELEGATED';
const NATIVE_STATUS_PREFIX = 'GOVERNED_MCP_VCP_NATIVE_';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inferSourceRuntime(result = {}) {
  if (
    result?.access?.localMemoryFallbackUsed === true ||
    result?.governedNativeReadFallback?.used === true
  ) {
    return 'local_fallback';
  }
  const status = String(result?.status || '');
  const nativeAccepted = result?.accepted === true &&
    result?.decision !== 'rejected' &&
    status === NATIVE_DELEGATED_STATUS;
  if (nativeAccepted) {
    return 'vcp_native';
  }
  if (
    status.startsWith(NATIVE_STATUS_PREFIX) ||
    result?.source_runtime === 'vcp_native' ||
    result?.source_runtime === 'vcp_native_unavailable'
  ) {
    return 'vcp_native_unavailable';
  }
  if (SOURCE_RUNTIMES.includes(result.source_runtime)) return result.source_runtime;
  return 'local_compatibility';
}

function bindSourceRuntime(result = {}) {
  const safeResult = isPlainObject(result) ? result : { results: [] };
  const sourceRuntime = inferSourceRuntime(safeResult);
  const access = isPlainObject(safeResult.access) ? safeResult.access : {};
  return {
    ...safeResult,
    source_runtime: sourceRuntime,
    access: {
      ...access,
      sourceRuntime,
      resultCanBeMistakenForVcpNative: false
    }
  };
}

class GovernedRecallGateway {
  constructor({ callSearchMemory }) {
    if (typeof callSearchMemory !== 'function') {
      throw new TypeError('GovernedRecallGateway requires callSearchMemory.');
    }
    this.callSearchMemory = callSearchMemory;
  }

  async search(args = {}, requestContext = {}) {
    return bindSourceRuntime(await this.callSearchMemory(args, requestContext));
  }
}

module.exports = {
  GovernedRecallGateway,
  SOURCE_RUNTIMES,
  bindSourceRuntime,
  inferSourceRuntime
};
