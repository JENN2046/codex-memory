'use strict';

const crypto = require('node:crypto');

const {
  CHATGPT_WEB_TOOL_CONTRACT_VERSION,
  getChatGptWebToolContract
} = require('./ChatGptWebToolContract');

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(item => canonicalize(item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function buildChatGptWebToolSnapshot(profile = {}, toolDefinitions = []) {
  const tools = (Array.isArray(toolDefinitions) ? toolDefinitions : [])
    .map(tool => {
      const contract = getChatGptWebToolContract(tool?.name) || {};
      return {
        name: tool?.name || null,
        title: tool?.title || null,
        description: tool?.description || null,
        annotations: tool?.annotations || {},
        inputSchema: tool?.inputSchema || {},
        outputSchema: tool?.outputSchema || {},
        contract: contract || {},
        outputBudgetBytes: Number.isInteger(contract.outputBudgetBytes)
          ? contract.outputBudgetBytes
          : null,
        profileGeneration: Array.isArray(contract.profileGeneration)
          ? [...contract.profileGeneration]
          : []
      };
    })
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
  const manifest = {
    schemaVersion: 'chatgpt_web_tool_snapshot_v1',
    contractVersion: CHATGPT_WEB_TOOL_CONTRACT_VERSION,
    profileId: typeof profile.profileId === 'string' ? profile.profileId : 'off',
    exposedToolNames: tools.map(tool => tool.name),
    tools
  };
  const canonicalManifest = canonicalJson(manifest);
  const digest = crypto.createHash('sha256').update(canonicalManifest).digest('hex');
  return Object.freeze({
    manifest,
    canonicalization: 'rfc8785_like_sorted_json_keys_v1',
    digest: `sha256:${digest}`
  });
}

module.exports = {
  buildChatGptWebToolSnapshot,
  canonicalJson,
  canonicalize
};
