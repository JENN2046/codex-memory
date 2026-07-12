#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  AUTHORITY_PATH,
  buildAuthorityIntake,
  evaluateAuthorityIntake,
  serializeArtifact,
  sha256
} = require('../src/core/Cm2115R2Phase2CompletionAuditApplication');
const { ensureCleanWorktree } = require('./cm2115-r2-git');

const MARKDOWN_PATH = AUTHORITY_PATH.replace(/\.json$/, '.md');

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 0) throw new Error('cm2115_r2_authority_intake_arguments_forbidden');
  ensureCleanWorktree();
  if (fs.existsSync(AUTHORITY_PATH) || fs.existsSync(MARKDOWN_PATH)) throw new Error('cm2115_r2_authority_intake_exists');
  const intake = buildAuthorityIntake();
  const evaluation = evaluateAuthorityIntake(intake);
  if (!evaluation.accepted) throw new Error(`cm2115_r2_authority_intake_rejected:${evaluation.blockers.join(',')}`);
  const jsonText = serializeArtifact(intake);
  const markdownText = [
    '# CM-2115-R2 Direct Authority Intake',
    '',
    'This low-disclosure intake records Jenn’s direct authorization for the exact',
    'repository evidence application repair. It stores no raw authority text and',
    'authorizes no runtime, native memory, provider, real-memory, remote, full-plan,',
    'or readiness action.',
    '',
    '## Exact JSON mirror',
    '',
    '```json',
    jsonText.trimEnd(),
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(AUTHORITY_PATH, jsonText, { flag: 'wx' });
  fs.writeFileSync(MARKDOWN_PATH, markdownText, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({status:'PASS_AUTHORITY_INTAKE_PREPARED',jsonPath:AUTHORITY_PATH,jsonBytes:Buffer.byteLength(jsonText),jsonSha256:sha256(jsonText),canonicalPayloadSha256:intake.canonicalPayloadSha256,applicationExecuted:false,fullPlanPackCompleted:false,readinessClaimed:false})}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exit(1); }
}

module.exports = { MARKDOWN_PATH, main };
