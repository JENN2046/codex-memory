'use strict';

const {
  createRequestEnvelope,
  validateRequestEnvelope
} = require('../../packages/chatgpt-r4-contracts');

function buildCandidateEdgeRequest({
  principalAssertion,
  toolName,
  toolArguments,
  now,
  requestId,
  nonce,
  signing
}) {
  return createRequestEnvelope({
    principalAssertion,
    toolName,
    toolArguments,
    now,
    requestId,
    nonce,
    signing
  });
}

function verifyCandidateEdgeRequest(request, options) {
  return validateRequestEnvelope(request, { ...options, consumeReplay: false });
}

module.exports = {
  buildCandidateEdgeRequest,
  verifyCandidateEdgeRequest
};
