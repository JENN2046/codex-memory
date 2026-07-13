'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createConfig } = require('../src/config/createConfig');
const {
  getPublicToolDefinitions
} = require('../src/adapters/codex-mcp/server');
const {
  DEFAULT_RUNTIME_ALLOWED_TOOLS,
  DEFAULT_RUNTIME_FORBIDDEN_TOOLS,
  evaluateDefaultRuntimePolicyObservationGate
} = require('../src/core/DefaultRuntimePolicyObservationGate');

const ENV_KEYS = [
  'CODEX_MEMORY_SECURITY_PROFILE',
  'CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE',
  'CODEX_MEMORY_EXPOSE_CONTROLLED_MUTATION_TOOLS',
  'CODEX_MEMORY_EXPOSE_WRITE_TOOLS',
  'CODEX_MEMORY_MCP_PUBLIC_TOOLS'
];

function withEnv(envVars, fn) {
  const restore = {};
  for (const key of ENV_KEYS) {
    restore[key] = process.env[key];
    if (Object.prototype.hasOwnProperty.call(envVars, key)) {
      process.env[key] = envVars[key];
    } else {
      delete process.env[key];
    }
  }

  try {
    return fn();
  } finally {
    for (const key of ENV_KEYS) {
      if (restore[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = restore[key];
      }
    }
  }
}

function sorted(values) {
  return [...values].sort();
}

function defaultPublicToolNames() {
  const config = createConfig();
  return getPublicToolDefinitions(config).map(tool => tool.name);
}

test('CM2015 accepts current default read context proposal policy hold', () => {
  withEnv({}, () => {
    const publicToolNames = defaultPublicToolNames();
    const result = evaluateDefaultRuntimePolicyObservationGate({
      publicToolNames,
      policy: {
        expansionRequested: false,
        requestedDefaultTools: DEFAULT_RUNTIME_ALLOWED_TOOLS
      },
      observation: {
        observationWindowDays: 0,
        equivalentDogfoodReviewAccepted: false
      },
      review: {
        externalReviewAccepted: false
      }
    });

    assert.equal(result.accepted, true, result.blockers.join(', '));
    assert.equal(result.status, 'default_runtime_policy_hold_read_context_proposal_accepted');
    assert.deepEqual(sorted(publicToolNames), sorted(DEFAULT_RUNTIME_ALLOWED_TOOLS));
    assert.equal(result.policy.defaultExpansionAllowed, false);
    assert.equal(result.policy.productionWriteDefaultAllowed, false);
    assert.equal(result.policy.durableMutationPerformed, false);
    assert.equal(result.policy.providerApiCalled, false);
    assert.equal(result.policy.readinessClaimed, false);
    assert.equal(result.observation.observationWindowRequired, true);
    assert.equal(result.externalReview.externalReviewRequired, true);
    assert.equal(result.nextGate, 'continue_observation_without_default_write_expansion');
  });
});

test('CM2015 rejects default runtime expansion without observation and external review', () => {
  const result = evaluateDefaultRuntimePolicyObservationGate({
    publicToolNames: DEFAULT_RUNTIME_ALLOWED_TOOLS,
    policy: {
      expansionRequested: true,
      requestedDefaultTools: [...DEFAULT_RUNTIME_ALLOWED_TOOLS, 'future_readonly_context_tool']
    },
    observation: {
      observationWindowDays: 7,
      equivalentDogfoodReviewAccepted: false
    },
    review: {
      externalReviewAccepted: false
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'default_runtime_policy_rejected');
  assert.ok(result.blockers.includes('default_runtime_expansion_request_not_accepted_by_current_policy'));
  assert.ok(result.blockers.includes('missing_30_day_observation_or_equivalent_dogfood_review'));
  assert.ok(result.blockers.includes('missing_external_review_acceptance'));
  assert.equal(result.policy.defaultExpansionAllowed, false);
  assert.equal(result.policy.productionWriteDefaultAllowed, false);
});

test('CM2015 keeps completed observation from auto-expanding default runtime', () => {
  const result = evaluateDefaultRuntimePolicyObservationGate({
    publicToolNames: DEFAULT_RUNTIME_ALLOWED_TOOLS,
    policy: {
      expansionRequested: true,
      requestedDefaultTools: [...DEFAULT_RUNTIME_ALLOWED_TOOLS, 'future_readonly_context_tool']
    },
    observation: {
      observationWindowDays: 30,
      equivalentDogfoodReviewAccepted: false
    },
    review: {
      externalReviewAccepted: true
    }
  });

  assert.equal(result.accepted, false);
  assert.deepEqual(result.blockers, [
    'default_runtime_expansion_request_not_accepted_by_current_policy'
  ]);
  assert.equal(result.observation.observationComplete, true);
  assert.equal(result.externalReview.externalReviewAccepted, true);
  assert.equal(result.nextGate, 'external_review_and_observation_required_before_any_future_policy_reconsideration');
});

test('CM2015 stops L4 when write or destructive tools are requested as default', () => {
  const result = evaluateDefaultRuntimePolicyObservationGate({
    publicToolNames: DEFAULT_RUNTIME_ALLOWED_TOOLS,
    policy: {
      expansionRequested: true,
      requestedDefaultTools: [
        ...DEFAULT_RUNTIME_ALLOWED_TOOLS,
        'record_memory',
        'tombstone_memory',
        'commit_memory_delta'
      ]
    },
    observation: {
      observationWindowDays: 30
    },
    review: {
      externalReviewAccepted: true
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'default_runtime_policy_stop_l4');
  assert.ok(result.stopReasons.includes('requested_default_runtime_tool_not_allowed_record_memory'));
  assert.ok(result.stopReasons.includes('requested_default_runtime_tool_not_allowed_tombstone_memory'));
  assert.ok(result.stopReasons.includes('requested_default_runtime_tool_not_allowed_commit_memory_delta'));
  assert.equal(result.policy.productionWriteDefaultAllowed, false);
  assert.equal(result.nextGate, 'stop_before_runtime_or_write_boundary');
});

test('CM2015 stops L4 if current public surface is treated as default full surface', () => {
  withEnv({
    CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE: 'full',
    CODEX_MEMORY_EXPOSE_CONTROLLED_MUTATION_TOOLS: '1',
    CODEX_MEMORY_EXPOSE_WRITE_TOOLS: '1'
  }, () => {
    const config = createConfig();
    const publicToolNames = getPublicToolDefinitions(config).map(tool => tool.name);
    const result = evaluateDefaultRuntimePolicyObservationGate({
      publicToolNames,
      policy: {
        expansionRequested: false,
        requestedDefaultTools: DEFAULT_RUNTIME_ALLOWED_TOOLS
      },
      observation: {},
      review: {}
    });

    assert.equal(result.accepted, false);
    assert.equal(result.status, 'default_runtime_policy_stop_l4');
    for (const toolName of DEFAULT_RUNTIME_FORBIDDEN_TOOLS.filter(tool => tool !== 'commit_memory_delta')) {
      assert.ok(result.stopReasons.includes(`default_runtime_tool_not_allowed_${toolName}`));
    }
    assert.equal(result.publicSurface.commitMemoryDeltaPublicRegistered, false);
  });
});

test('CM2015 stops L4 when the observed public surface contains an unknown tool', () => {
  const unexpectedTool = 'future_unreviewed_public_tool';
  const result = evaluateDefaultRuntimePolicyObservationGate({
    publicToolNames: [...DEFAULT_RUNTIME_ALLOWED_TOOLS, unexpectedTool],
    policy: {
      expansionRequested: false,
      requestedDefaultTools: DEFAULT_RUNTIME_ALLOWED_TOOLS
    },
    observation: {
      observationWindowDays: 30
    },
    review: {
      externalReviewAccepted: true
    }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'default_runtime_policy_stop_l4');
  assert.ok(result.stopReasons.includes(`default_runtime_tool_not_allowed_${unexpectedTool}`));
  assert.ok(result.blockers.includes('default_runtime_expansion_request_not_accepted_by_current_policy'));
  assert.deepEqual(result.publicSurface.unexpectedDefaultTools, [unexpectedTool]);
  assert.deepEqual(result.publicSurface.forbiddenDefaultTools, [unexpectedTool]);
  assert.equal(result.requestedSurface.expansionRequested, true);
  assert.equal(result.policy.defaultExpansionAllowed, false);
});

test('CM2015 rejects raw or readiness-shaped evidence without echoing values', () => {
  const result = evaluateDefaultRuntimePolicyObservationGate({
    publicToolNames: DEFAULT_RUNTIME_ALLOWED_TOOLS,
    policy: {
      expansionRequested: false,
      requestedDefaultTools: DEFAULT_RUNTIME_ALLOWED_TOOLS,
      readinessClaimed: true
    },
    observation: {
      rawResponseBody: 'SYNTHETIC_ECHO_GUARD_RAW_VALUE'
    },
    review: {
      reviewerToken: 'SYNTHETIC_ECHO_GUARD_TOKEN_VALUE'
    }
  });

  const serialized = JSON.stringify(result);

  assert.equal(result.accepted, false);
  assert.equal(result.status, 'default_runtime_policy_stop_l4');
  assert.ok(result.stopReasons.includes('stop_l4_flag_policy.readinessClaimed'));
  assert.ok(result.stopReasons.includes('forbidden_input_field_observation.rawResponseBody'));
  assert.ok(result.stopReasons.includes('forbidden_input_field_review.reviewerToken'));
  assert.equal(serialized.includes('SYNTHETIC_ECHO_GUARD_RAW_VALUE'), false);
  assert.equal(serialized.includes('SYNTHETIC_ECHO_GUARD_TOKEN_VALUE'), false);
});
