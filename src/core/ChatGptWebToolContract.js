'use strict';

const crypto = require('node:crypto');
const frozenContractPack = require('../../schemas/chatgpt_web_tool_contracts_v2.json');
const {
  ToolArgumentValidationError,
  validateArgumentsAgainstSchema
} = require('./ToolArgumentValidator');

const CHATGPT_WEB_TOOL_CONTRACT_VERSION = frozenContractPack.schemaVersion;

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const nestedValue of Object.values(value)) {
      deepFreeze(nestedValue);
    }
    Object.freeze(value);
  }
  return value;
}

const CHATGPT_WEB_TOOL_CONTRACTS = deepFreeze(frozenContractPack.tools);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
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

const CHATGPT_WEB_TOOL_CONTRACT_DIGEST = `sha256:${crypto
  .createHash('sha256')
  .update(JSON.stringify(canonicalize(frozenContractPack)))
  .digest('hex')}`;

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getChatGptWebToolContract(toolName) {
  return Object.prototype.hasOwnProperty.call(CHATGPT_WEB_TOOL_CONTRACTS, toolName)
    ? CHATGPT_WEB_TOOL_CONTRACTS[toolName]
    : null;
}

function buildChatGptWebToolDefinition(toolName) {
  const contract = getChatGptWebToolContract(toolName);
  if (!contract) return null;
  return {
    name: toolName,
    title: contract.title,
    description: contract.description,
    inputSchema: cloneJson(contract.inputSchema),
    outputSchema: cloneJson(contract.outputSchema),
    annotations: cloneJson(contract.annotations)
  };
}

function validateChatGptWebToolInput(toolName, argumentsValue = {}) {
  const contract = getChatGptWebToolContract(toolName);
  if (!contract) {
    throw new ToolArgumentValidationError(`Unknown ChatGPT web tool: ${toolName}`, 'name');
  }
  validateArgumentsAgainstSchema(contract.inputSchema, argumentsValue, 'arguments');
}

function validateChatGptWebStructuredContent(toolName, structuredContent) {
  const contract = getChatGptWebToolContract(toolName);
  if (!contract) {
    throw new ToolArgumentValidationError(`Unknown ChatGPT web tool: ${toolName}`, 'name');
  }
  validateArgumentsAgainstSchema(contract.outputSchema, structuredContent, 'structuredContent');
}

module.exports = {
  CHATGPT_WEB_TOOL_CONTRACTS,
  CHATGPT_WEB_TOOL_CONTRACT_DIGEST,
  CHATGPT_WEB_TOOL_CONTRACT_VERSION,
  buildChatGptWebToolDefinition,
  getChatGptWebToolContract,
  validateChatGptWebStructuredContent,
  validateChatGptWebToolInput
};
