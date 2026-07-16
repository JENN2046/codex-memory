'use strict';

const SOURCE_RUNTIMES = Object.freeze([
  'vcp_native',
  'local_fallback',
  'local_compatibility'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inferSourceRuntime(result = {}) {
  if (SOURCE_RUNTIMES.includes(result.source_runtime)) return result.source_runtime;
  if (
    result?.access?.localMemoryFallbackUsed === true ||
    result?.governedNativeReadFallback?.used === true
  ) {
    return 'local_fallback';
  }
  if (String(result?.status || '').startsWith('GOVERNED_MCP_VCP_NATIVE_')) {
    return 'vcp_native';
  }
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
