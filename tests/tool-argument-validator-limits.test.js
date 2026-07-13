'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ToolArgumentValidationError,
  validateToolArguments,
  validateArgumentsAgainstSchema
} = require('../src/core/ToolArgumentValidator');

test('validateToolArguments rejects title exceeding maxLength', () => {
  assert.throws(
    () => validateToolArguments('record_memory', {
      target: 'process',
      title: 'x'.repeat(201),
      content: 'valid content',
      evidence: 'valid evidence',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }),
    (err) => err instanceof ToolArgumentValidationError && err.message.includes('200')
  );
});

test('validateToolArguments accepts title at exactly maxLength', () => {
  assert.doesNotThrow(
    () => validateToolArguments('record_memory', {
      target: 'process',
      title: 'x'.repeat(200),
      content: 'valid content',
      evidence: 'valid evidence',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    })
  );
});

test('validateToolArguments rejects content exceeding maxLength', () => {
  assert.throws(
    () => validateToolArguments('record_memory', {
      target: 'process',
      title: 'valid title',
      content: 'x'.repeat(20001),
      evidence: 'valid evidence',
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }),
    (err) => err instanceof ToolArgumentValidationError && err.message.includes('20000')
  );
});

test('validateToolArguments rejects evidence exceeding maxLength', () => {
  assert.throws(
    () => validateToolArguments('record_memory', {
      target: 'process',
      title: 'valid title',
      content: 'valid content',
      evidence: 'x'.repeat(8001),
      validated: true,
      reusable: false,
      sensitivity: 'none'
    }),
    (err) => err instanceof ToolArgumentValidationError && err.message.includes('8000')
  );
});

test('validateToolArguments rejects sensitivity exceeding maxLength', () => {
  assert.throws(
    () => validateToolArguments('record_memory', {
      target: 'process',
      title: 'valid title',
      content: 'valid content',
      evidence: 'valid evidence',
      validated: true,
      reusable: false,
      sensitivity: 'x'.repeat(81)
    }),
    (err) => err instanceof ToolArgumentValidationError
  );
});

test('validateToolArguments rejects tags array exceeding maxItems', () => {
  const manyTags = Array.from({ length: 31 }, (_, i) => `tag-${i}`);
  assert.throws(
    () => validateToolArguments('record_memory', {
      target: 'process',
      title: 'valid title',
      content: 'valid content',
      evidence: 'valid evidence',
      validated: true,
      reusable: false,
      sensitivity: 'none',
      tags: manyTags
    }),
    (err) => err instanceof ToolArgumentValidationError && err.message.includes('30')
  );
});

test('validateToolArguments rejects tag string exceeding maxLength', () => {
  assert.throws(
    () => validateToolArguments('record_memory', {
      target: 'process',
      title: 'valid title',
      content: 'valid content',
      evidence: 'valid evidence',
      validated: true,
      reusable: false,
      sensitivity: 'none',
      tags: ['x'.repeat(81)]
    }),
    (err) => err instanceof ToolArgumentValidationError
  );
});

test('validateToolArguments accepts valid tags array within limits', () => {
  assert.doesNotThrow(
    () => validateToolArguments('record_memory', {
      target: 'process',
      title: 'valid title',
      content: 'valid content',
      evidence: 'valid evidence',
      validated: true,
      reusable: false,
      sensitivity: 'none',
      tags: ['valid-tag']
    })
  );
});

test('validateToolArguments rejects record_memory scope fields exceeding maxLength', () => {
  for (const field of ['project_id', 'workspace_id', 'task_id', 'conversation_id', 'retention_policy']) {
    assert.throws(
      () => validateToolArguments('record_memory', {
        target: 'process',
        title: 'valid title',
        content: 'valid content',
        evidence: 'valid evidence',
        validated: true,
        reusable: false,
        sensitivity: 'none',
        [field]: 'x'.repeat(201)
      }),
      (err) => err instanceof ToolArgumentValidationError && err.path === `arguments.${field}`
    );
  }
});

test('validateToolArguments accepts record_memory scope fields within limits', () => {
  assert.doesNotThrow(
    () => validateToolArguments('record_memory', {
      target: 'process',
      title: 'valid title',
      content: 'valid content',
      evidence: 'valid evidence',
      validated: true,
      reusable: false,
      sensitivity: 'none',
      project_id: 'p'.repeat(200),
      workspace_id: 'w'.repeat(200),
      client_id: 'codex',
      visibility: 'project',
      task_id: 't'.repeat(200),
      conversation_id: 'c'.repeat(200),
      retention_policy: 'r'.repeat(200)
    })
  );
});

test('validateToolArguments rejects search_memory query exceeding maxLength', () => {
  assert.throws(
    () => validateToolArguments('search_memory', {
      query: 'x'.repeat(1001),
      target: 'process'
    }),
    (err) => err instanceof ToolArgumentValidationError && err.message.includes('1000')
  );
});

test('validateToolArguments accepts search_memory query at exactly minLength', () => {
  assert.doesNotThrow(
    () => validateToolArguments('search_memory', {
      query: 'a'
    })
  );
});

test('validateToolArguments rejects search_memory context_text exceeding maxLength', () => {
  assert.throws(
    () => validateToolArguments('search_memory', {
      query: 'valid query',
      context_text: 'x'.repeat(8001)
    }),
    (err) => err instanceof ToolArgumentValidationError && err.message.includes('8000')
  );
});

test('validateToolArguments rejects scope fields exceeding maxLength', () => {
  assert.throws(
    () => validateToolArguments('search_memory', {
      query: 'valid query',
      scope: { project_id: 'x'.repeat(201) }
    }),
    (err) => err instanceof ToolArgumentValidationError
  );
});

test('validateToolArguments accepts scope fields within limits', () => {
  assert.doesNotThrow(
    () => validateToolArguments('search_memory', {
      query: 'valid query',
      scope: {
        project_id: 'project-123',
        client_id: 'codex'
      }
    })
  );
});

test('minItems validation works when added to schemas', () => {
  const schema = {
    type: 'object',
    properties: {
      items: { type: 'array', items: { type: 'string' }, minItems: 2 }
    }
  };

  assert.throws(
    () => validateArgumentsAgainstSchema(schema, { items: ['one'] }),
    (err) => err instanceof ToolArgumentValidationError && err.message.includes('2')
  );

  assert.doesNotThrow(
    () => validateArgumentsAgainstSchema(schema, { items: ['one', 'two'] })
  );
});

test('maxItems validation works when added to schemas', () => {
  const schema = {
    type: 'object',
    properties: {
      items: { type: 'array', items: { type: 'string' }, maxItems: 2 }
    }
  };

  assert.throws(
    () => validateArgumentsAgainstSchema(schema, { items: ['one', 'two', 'three'] }),
    (err) => err instanceof ToolArgumentValidationError && err.message.includes('2')
  );

  assert.doesNotThrow(
    () => validateArgumentsAgainstSchema(schema, { items: ['one', 'two'] })
  );
});

test('pattern validation rejects non-matching strings and accepts matching strings', () => {
  const schema = { type: 'string', pattern: '^CM-[0-9]{4}$' };

  assert.throws(
    () => validateArgumentsAgainstSchema(schema, 'BAD', 'arguments.task_id'),
    err => err instanceof ToolArgumentValidationError && err.path === 'arguments.task_id'
  );
  assert.doesNotThrow(
    () => validateArgumentsAgainstSchema(schema, 'CM-2011', 'arguments.task_id')
  );
});
