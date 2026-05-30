'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createConfig } = require('../src/config/createConfig');

function withEnv(envVars, fn) {
  const restore = {};
  for (const key of Object.keys(envVars)) {
    restore[key] = process.env[key];
  }
  try {
    Object.assign(process.env, envVars);
    fn();
  } finally {
    for (const key of Object.keys(restore)) {
      if (restore[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = restore[key];
      }
    }
  }
}

test('default security profile is local', () => {
  const config = createConfig();
  assert.equal(config.securityProfile, 'local');
});

test('local profile does not enable security policies by default', () => {
  const config = createConfig();
  assert.equal(config.enableSoftReadPolicy, false);
  assert.equal(config.enableLifecycleReadPolicy, false);
  assert.equal(config.enableWritePreflight, false);
});

test('local profile allows external provider is false by default', () => {
  const config = createConfig();
  assert.equal(config.allowExternalProvider, false);
});

test('hardened profile enables soft read policy', () => {
  withEnv({ CODEX_MEMORY_SECURITY_PROFILE: 'hardened' }, () => {
    const config = createConfig();
    assert.equal(config.securityProfile, 'hardened');
    assert.equal(config.enableSoftReadPolicy, true);
    assert.equal(config.enableLifecycleReadPolicy, true);
    assert.equal(config.enableWritePreflight, true);
    assert.equal(config.allowExternalProvider, false);
  });
});

test('hardened profile uppercase value is normalized', () => {
  withEnv({ CODEX_MEMORY_SECURITY_PROFILE: 'HARDENED' }, () => {
    const config = createConfig();
    assert.equal(config.securityProfile, 'hardened');
    assert.equal(config.enableSoftReadPolicy, true);
  });
});

test('explicit env overrides hardened profile default for soft read policy', () => {
  withEnv({
    CODEX_MEMORY_SECURITY_PROFILE: 'hardened',
    CODEX_MEMORY_ENABLE_SOFT_READ_POLICY: 'false'
  }, () => {
    const config = createConfig();
    assert.equal(config.enableSoftReadPolicy, false);
  });
});

test('explicit env overrides hardened profile default for external provider', () => {
  withEnv({
    CODEX_MEMORY_SECURITY_PROFILE: 'hardened',
    CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER: 'true'
  }, () => {
    const config = createConfig();
    assert.equal(config.allowExternalProvider, true);
  });
});

test('explicit local profile behaves same as default', () => {
  withEnv({ CODEX_MEMORY_SECURITY_PROFILE: 'local' }, () => {
    const config = createConfig();
    assert.equal(config.securityProfile, 'local');
    assert.equal(config.enableSoftReadPolicy, false);
    assert.equal(config.allowExternalProvider, false);
  });
});
