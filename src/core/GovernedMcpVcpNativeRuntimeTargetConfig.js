'use strict';

const { TARGET_KINDS } = require('./VcpToolBoxFullCapabilityBridgePlan');
const { isSafeReferenceName } = require('./VcpToolBoxSafeReference');

const SOURCE_AUTHORITY = 'bridge_runtime_or_static_config';
const DEFAULT_TARGET_KIND = 'mcp_server';

const FORBIDDEN_RUNTIME_TARGET_KEYS = Object.freeze([
  'endpoint',
  'url',
  'baseUrl',
  'runtimeEndpoint',
  'runtimeUrl',
  'locatorValue',
  'path',
  'absolutePath',
  'configEnv',
  'configEnvPath',
  'env',
  'token',
  'bearerToken',
  'apiKey',
  'providerApiKey',
  'secret',
  'secrets',
  'credential',
  'credentials',
  'password',
  'privateKey'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstString(...values) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return '';
}

function collectForbiddenKeys(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectForbiddenKeys(item, `${prefix}[${index}]`));
  }
  if (!isPlainObject(value)) return [];

  const found = [];
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (FORBIDDEN_RUNTIME_TARGET_KEYS.includes(key)) {
      found.push(path);
      continue;
    }
    found.push(...collectForbiddenKeys(nested, path));
  }
  return found;
}

function normalizeTargetKind(value) {
  const normalized = normalizeString(value);
  return TARGET_KINDS.includes(normalized) ? normalized : '';
}

function normalizeGovernedMcpVcpNativeRuntimeTargetConfig(source = {}) {
  const input = isPlainObject(source) ? source : {};
  const targetReferenceName = firstString(
    input.targetReferenceName,
    input.target_reference_name,
    input.referenceName,
    input.reference_name
  );
  const targetKind = normalizeTargetKind(firstString(
    input.targetKind,
    input.target_kind,
    input.kind,
    DEFAULT_TARGET_KIND
  ));
  const forbiddenFields = collectForbiddenKeys(input);
  const configured = Boolean(targetReferenceName);
  const invalidFields = [];

  if (configured && !isSafeReferenceName(targetReferenceName)) {
    invalidFields.push('targetReferenceName');
  }
  if (!targetKind) {
    invalidFields.push('targetKind');
  }
  if (forbiddenFields.length > 0) {
    invalidFields.push(...forbiddenFields);
  }

  const accepted = configured && invalidFields.length === 0;

  return {
    accepted,
    configured,
    sourceAuthority: SOURCE_AUTHORITY,
    targetReferenceName: accepted ? targetReferenceName : null,
    targetKind: targetKind || null,
    invalidFields,
    forbiddenFields,
    locatorValueIncluded: false,
    endpointIncluded: false,
    tokenMaterialIncluded: false,
    locatorDisclosed: false,
    endpointDisclosed: false,
    tokenMaterialDisclosed: false,
    configEnvRead: false,
    runtimeCalled: false,
    vcpToolBoxCalled: false,
    providerApiCalled: false,
    publicMcpExpanded: false
  };
}

module.exports = {
  DEFAULT_TARGET_KIND,
  FORBIDDEN_RUNTIME_TARGET_KEYS,
  SOURCE_AUTHORITY,
  normalizeGovernedMcpVcpNativeRuntimeTargetConfig
};
