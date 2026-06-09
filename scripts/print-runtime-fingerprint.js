#!/usr/bin/env node
'use strict';

const { computeRuntimeSourceFingerprint } = require('../src/core/RuntimeFreshness');

const fingerprint = computeRuntimeSourceFingerprint();

process.stdout.write(`${fingerprint.sourceFingerprint}\n`);
