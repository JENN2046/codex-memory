'use strict';

const fs = require('node:fs');
const path = require('node:path');

const configuredTarget = process.env.CM2122_TEST_FAIL_WORKTREE_WRITE_PATH;
if (!configuredTarget) throw new Error('cm2122_test_fault_target_required');

const target = path.resolve(configuredTarget);
const originalWriteFileSync = fs.writeFileSync;
let injected = false;

fs.writeFileSync = function writeFileSyncWithCm2122PostCasFault(filePath, ...args) {
  if (!injected && path.resolve(String(filePath)) === target) {
    injected = true;
    const error = new Error('cm2122_test_post_cas_worktree_write_failure');
    error.code = 'EIO';
    throw error;
  }
  return originalWriteFileSync.call(this, filePath, ...args);
};
