const { TOOL_DEFINITIONS } = require('./constants');

class ToolArgumentValidationError extends Error {
  constructor(message, path = 'arguments') {
    super(message);
    this.name = 'ToolArgumentValidationError';
    this.path = path;
  }
}

const TOOL_SCHEMA_BY_NAME = new Map(
  TOOL_DEFINITIONS.map(tool => [tool.name, tool.inputSchema])
);

function formatPath(parentPath, key) {
  return parentPath ? `${parentPath}.${key}` : key;
}

function getType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function validateEnum(value, schema, path) {
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    throw new ToolArgumentValidationError(`${path} must be one of: ${schema.enum.join(', ')}`, path);
  }
}

function validateNumberBounds(value, schema, path) {
  if (typeof schema.minimum === 'number' && value < schema.minimum) {
    throw new ToolArgumentValidationError(`${path} must be >= ${schema.minimum}`, path);
  }
  if (typeof schema.maximum === 'number' && value > schema.maximum) {
    throw new ToolArgumentValidationError(`${path} must be <= ${schema.maximum}`, path);
  }
}

function validateValue(value, schema, path) {
  if (schema.oneOf) {
    const errors = [];
    for (const option of schema.oneOf) {
      try {
        validateValue(value, option, path);
        return;
      } catch (error) {
        errors.push(error.message);
      }
    }
    throw new ToolArgumentValidationError(`${path} does not match any allowed schema: ${errors.join('; ')}`, path);
  }

  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ToolArgumentValidationError(`${path} must be an object`, path);
    }

    const properties = schema.properties || {};
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) {
          throw new ToolArgumentValidationError(`${formatPath(path, key)} is not allowed`, formatPath(path, key));
        }
      }
    }

    for (const requiredKey of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, requiredKey)) {
        throw new ToolArgumentValidationError(`${formatPath(path, requiredKey)} is required`, formatPath(path, requiredKey));
      }
    }

    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        validateValue(value[key], childSchema, formatPath(path, key));
      }
    }
    return;
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      throw new ToolArgumentValidationError(`${path} must be an array`, path);
    }
    const itemSchema = schema.items || {};
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      throw new ToolArgumentValidationError(`${path} must have at least ${schema.minItems} items`, path);
    }
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
      throw new ToolArgumentValidationError(`${path} must have at most ${schema.maxItems} items`, path);
    }
    for (let index = 0; index < value.length; index += 1) {
      validateValue(value[index], itemSchema, `${path}[${index}]`);
    }
    return;
  }

  if (schema.type) {
    const actualType = getType(value);
    if (actualType !== schema.type) {
      throw new ToolArgumentValidationError(`${path} must be ${schema.type}`, path);
    }
  }

  validateEnum(value, schema, path);
  if (schema.type === 'integer') {
    validateNumberBounds(value, schema, path);
  }
  if (schema.type === 'string' && typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
      throw new ToolArgumentValidationError(`${path} must be at least ${schema.minLength} characters`, path);
    }
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
      throw new ToolArgumentValidationError(`${path} must be at most ${schema.maxLength} characters`, path);
    }
    if (typeof schema.pattern === 'string') {
      let pattern;
      try {
        pattern = new RegExp(schema.pattern);
      } catch (_error) {
        throw new ToolArgumentValidationError(`${path} has an invalid schema pattern`, path);
      }
      if (!pattern.test(value)) {
        throw new ToolArgumentValidationError(`${path} must match the required pattern`, path);
      }
    }
  }
}

function validateToolArguments(toolName, args = {}) {
  const schema = TOOL_SCHEMA_BY_NAME.get(toolName);
  if (!schema) {
    throw new ToolArgumentValidationError(`Unknown tool: ${toolName}`, 'name');
  }
  validateValue(args, schema, 'arguments');
}

function validateArgumentsAgainstSchema(schema, args = {}, path = 'arguments') {
  validateValue(args, schema, path);
}

module.exports = {
  ToolArgumentValidationError,
  validateArgumentsAgainstSchema,
  validateToolArguments
};
