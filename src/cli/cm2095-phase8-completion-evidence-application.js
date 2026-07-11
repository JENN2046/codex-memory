#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { executeCm2095Phase8CompletionEvidenceApplication, sha256 } = require('../core/Cm2095Phase8CompletionEvidenceApplication');

const DECISION_PATH = 'docs/near-model-memory-plan-pack/phase8_completion_evidence_application_decision_cm2095.json';
const REQUEST_PATH = 'docs/near-model-memory-plan-pack/phase8_completion_evidence_application_request_cm2095.json';
const EXECUTION_RECEIPT_PATH = 'docs/near-model-memory-plan-pack/phase8_native_write_execution_receipt_cm2094.json';
const COMPLETION_AUDIT_PATH = 'docs/near-model-memory-plan-pack/completion_audit_report.md';
const TRACE_MATRIX_PATH = 'docs/near-model-memory-plan-pack/evidence_trace_matrix_report.md';
const APPLICATION_RECEIPT_PATH = 'docs/near-model-memory-plan-pack/phase8_completion_evidence_application_receipt_cm2095.json';

function git(args, encoding = 'utf8') {
  return execFileSync('git', args, { encoding, maxBuffer: 1024 * 1024 });
}

function gitBytes(commit, file) {
  return Buffer.from(execFileSync('git', ['show', `${commit}:${file}`], { maxBuffer: 1024 * 1024 }));
}

function buildInput() {
  const decisionCommit = '83ac6f8d45a92d04453e9f280d5dbd054a663132';
  const requestCommit = 'a593b73fe1b53a4d00d572d5f72157acf033285c';
  const receiptCommit = '91c20ce4c9b85966ef2da6b7c37563ebbce0f365';
  const head = git(['rev-parse', 'HEAD']).trim();
  const tree = git(['rev-parse', 'HEAD^{tree}']).trim();
  const clean = git(['status', '--porcelain']).trim() === '';
  const decisionBytes = gitBytes(decisionCommit, DECISION_PATH);
  const requestBytes = gitBytes(requestCommit, REQUEST_PATH);
  const receiptBytes = gitBytes(receiptCommit, EXECUTION_RECEIPT_PATH);
  const completionAuditBytes = fs.readFileSync(COMPLETION_AUDIT_PATH);
  const traceMatrixBytes = fs.readFileSync(TRACE_MATRIX_PATH);
  const completionAuditHeadBytes = gitBytes(head, COMPLETION_AUDIT_PATH);
  const traceMatrixHeadBytes = gitBytes(head, TRACE_MATRIX_PATH);
  return {
    decision: JSON.parse(decisionBytes.toString('utf8')),
    bindings: {
      decisionCommit,
      decisionBlobOid: git(['rev-parse', `${decisionCommit}:${DECISION_PATH}`]).trim(),
      decisionSha256: sha256(decisionBytes),
      applicationRequestCommit: requestCommit,
      applicationRequestBlobOid: git(['rev-parse', `${requestCommit}:${REQUEST_PATH}`]).trim(),
      applicationRequestSha256: sha256(requestBytes),
      executionReceiptCommit: receiptCommit,
      executionReceiptBlobOid: git(['rev-parse', `${receiptCommit}:${EXECUTION_RECEIPT_PATH}`]).trim(),
      executionReceiptSha256: sha256(receiptBytes)
    },
    runtimeFacts: { clean, commit: head, tree },
    baseline: {
      completionAuditBlobOid: git(['rev-parse', `${head}:${COMPLETION_AUDIT_PATH}`]).trim(),
      traceMatrixBlobOid: git(['rev-parse', `${head}:${TRACE_MATRIX_PATH}`]).trim(),
      completionAuditWorktreeMatchesHead: sha256(completionAuditBytes) === sha256(completionAuditHeadBytes),
      traceMatrixWorktreeMatchesHead: sha256(traceMatrixBytes) === sha256(traceMatrixHeadBytes),
      applicationReceiptAbsent: !fs.existsSync(APPLICATION_RECEIPT_PATH)
    }
  };
}

if (require.main === module) {
  const result = executeCm2095Phase8CompletionEvidenceApplication(buildInput());
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.accepted) process.exitCode = 1;
}

module.exports = { buildInput };
