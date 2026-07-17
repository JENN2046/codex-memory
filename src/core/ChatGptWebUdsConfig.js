'use strict';

const path = require('node:path');

const {
  CHATGPT_WEB_PROFILE_IDS,
  normalizeChatGptWebProfileId
} = require('./ChatGptWebProfile');

const PRIVATE_CONFIG_KEY = '__chatgptWebUdsPrivateConfig';
const DEFAULT_SOCKET_NAME = 'chatgpt-web-mcp.sock';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveAbsolutePath(basePath, value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  return path.isAbsolute(normalized)
    ? path.normalize(normalized)
    : path.resolve(basePath, normalized);
}

function normalizeSocketName(value) {
  const normalized = normalizeString(value) || DEFAULT_SOCKET_NAME;
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(normalized)
    ? normalized
    : DEFAULT_SOCKET_NAME;
}

function normalizeOrigins(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,|，]/)
      : [];
  return [...new Set(values
    .map(normalizeString)
    .filter(origin => /^https?:\/\/[^\s/]+$/i.test(origin)))];
}

function normalizeEnabledProfileIds(value, fallbackProfileId = CHATGPT_WEB_PROFILE_IDS.OFF) {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,|，]/)
      : [];
  const normalized = values
    .map(normalizeChatGptWebProfileId)
    .filter(profileId => profileId !== CHATGPT_WEB_PROFILE_IDS.OFF);
  if (normalized.length > 0) return [...new Set(normalized)];

  const fallback = normalizeChatGptWebProfileId(fallbackProfileId);
  return fallback === CHATGPT_WEB_PROFILE_IDS.OFF ? [] : [fallback];
}

function normalizeChatGptWebUdsConfig({
  basePath = process.cwd(),
  enabled = false,
  socketDirectory,
  socketName,
  bridgeAuthSecretFile,
  allowedOrigins,
  enabledProfileIds,
  fallbackProfileId = CHATGPT_WEB_PROFILE_IDS.OFF
} = {}) {
  const resolvedSocketDirectory = resolveAbsolutePath(basePath, socketDirectory);
  const resolvedBridgeAuthSecretFile = resolveAbsolutePath(basePath, bridgeAuthSecretFile);
  const profiles = normalizeEnabledProfileIds(enabledProfileIds, fallbackProfileId);
  const active = enabled === true;

  return {
    publicConfig: Object.freeze({
      enabled: active,
      transport: 'unix_domain_socket_streamable_http',
      publicListener: false,
      tcpLoopbackFallback: false,
      authorizationHeaderAccepted: false,
      socketConfigured: resolvedSocketDirectory !== null,
      bridgeAuthSecretFileConfigured: resolvedBridgeAuthSecretFile !== null,
      socketName: normalizeSocketName(socketName),
      enabledProfileIds: Object.freeze(profiles),
      allowedOriginCount: normalizeOrigins(allowedOrigins).length
    }),
    privateConfig: Object.freeze({
      socketDirectory: resolvedSocketDirectory,
      socketName: normalizeSocketName(socketName),
      bridgeAuthSecretFile: resolvedBridgeAuthSecretFile,
      allowedOrigins: Object.freeze(normalizeOrigins(allowedOrigins))
    })
  };
}

function attachChatGptWebUdsPrivateConfig(config, privateConfig) {
  Object.defineProperty(config, PRIVATE_CONFIG_KEY, {
    value: privateConfig,
    enumerable: false,
    configurable: false,
    writable: false
  });
  return config;
}

function getChatGptWebUdsPrivateConfig(config = {}) {
  const privateConfig = config?.[PRIVATE_CONFIG_KEY];
  return privateConfig && typeof privateConfig === 'object'
    ? privateConfig
    : Object.freeze({
        socketDirectory: null,
        socketName: DEFAULT_SOCKET_NAME,
        bridgeAuthSecretFile: null,
        allowedOrigins: Object.freeze([])
      });
}

module.exports = {
  DEFAULT_SOCKET_NAME,
  attachChatGptWebUdsPrivateConfig,
  getChatGptWebUdsPrivateConfig,
  normalizeChatGptWebUdsConfig,
  normalizeEnabledProfileIds,
  normalizeOrigins,
  normalizeSocketName
};
