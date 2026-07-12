'use strict';

const {
  DECISION_MARKDOWN_PATH: CONTENT_DECISION_MARKDOWN_PATH,
  DECISION_PATH: CONTENT_DECISION_PATH
} = require('./Cm2125ExactBranchCasContentDecision');
const {
  EXPECTED_OLD,
  EXPECTED_OLD_TREE,
  NEW_COMMIT,
  NEW_TREE,
  STATUS_ENTRIES,
  STATUS_PATHS,
  TARGET_REF
} = require('./Cm2125ExactBranchCasApplication');

const TASK_ID = 'CM-2126';
const FINAL_RELEASE_TASK_ID = 'CM-2127';
const ACTION = 'update_exact_local_status_branch_ref_cas';

const CONTENT_DECISION_FREEZE = Object.freeze({
  reference: 'CM-2125-EXACT-BRANCH-CAS-CONTENT-DECISION-EA3DCE0C-869D9D6E-EB016872',
  commit: 'c4ff57c645a04f484f55a16efdd62bd40b4dc576',
  tree: 'c6ffd0c33f14ef46fb11e86029cba944ac036df9',
  parentCommit: 'f8483a1d189f444d7481032252e17003680006a6',
  parentTree: '4129d827ac1eea43e9efe2ddc531a244fcaedd76',
  canonicalPayloadSha256: '905f9fd9401fb569f8da248cbf6a54b881d744ba89e9e4c06df1bfec6fa7b03a',
  json: Object.freeze({
    path: CONTENT_DECISION_PATH,
    blobOid: 'bfac77653207455d31948fa8b1c4768e2395e338',
    bytes: 19335,
    sha256: '8abb9c85bbaf37c2bccb792f0ca5eb2aebea52da44eb236ac1fbaf486a8b10a4'
  }),
  markdown: Object.freeze({
    path: CONTENT_DECISION_MARKDOWN_PATH,
    blobOid: '1fbe4158ab73047766aa067b9c88e2c526d9c3f5',
    bytes: 20027,
    sha256: '28421d939fd347ad6305fcbbd2196696497fff2b03b702a9c36f3feff0814091'
  })
});

const IMPLEMENTATION_PARENT_FREEZE = Object.freeze({
  commit: CONTENT_DECISION_FREEZE.commit,
  tree: CONTENT_DECISION_FREEZE.tree
});

const IMPLEMENTATION_DIFF_PATHS = Object.freeze([
  'scripts/generate-cm2126-exact-branch-cas-execution-packet.js',
  'scripts/generate-cm2127-exact-branch-cas-final-release.js',
  'src/cli/cm2126-exact-branch-cas.js',
  'src/core/Cm2126ExactBranchCasClaimRegistry.js',
  'src/core/Cm2126ExactBranchCasConstants.js',
  'src/core/Cm2126ExactBranchCasExecution.js',
  'src/core/Cm2126ExactBranchCasReceiptContract.js',
  'tests/cm2126-exact-branch-cas-execution.test.js'
].sort());

const IMPLEMENTATION_DIFF_ENTRIES = Object.freeze(IMPLEMENTATION_DIFF_PATHS.map(sourcePath => ({
  status: 'A',
  path: sourcePath
})));

const IMPLEMENTATION_DEPENDENCY_PATHS = Object.freeze([
  'scripts/cm2115-r2-git.js',
  'scripts/generate-cm2116-exact-full-plan-application-gate.js',
  'src/core/Cm2115CanonicalFullPlanEvidenceSnapshot.js',
  'src/core/Cm2117ExactFullPlanApplicationDecision.js',
  'src/core/Cm2120FullPlanApplicationReceiptReview.js',
  'src/core/Cm2122FullPlanStatusSyncExecution.js',
  'src/core/Cm2125ExactBranchCasApplication.js',
  'src/core/Cm2125ExactBranchCasContentDecision.js'
].sort());

const IMPLEMENTATION_ARTIFACT_PATHS = Object.freeze([
  ...IMPLEMENTATION_DIFF_PATHS,
  ...IMPLEMENTATION_DEPENDENCY_PATHS
].sort());

const PACKET_PATH = 'docs/near-model-memory-plan-pack/cm2126_exact_branch_cas_execution_packet.json';
const PACKET_MARKDOWN_PATH = PACKET_PATH.replace(/\.json$/, '.md');
const PACKET_DIFF_PATHS = Object.freeze([PACKET_MARKDOWN_PATH, PACKET_PATH].sort());
const PACKET_DIFF_ENTRIES = Object.freeze(PACKET_DIFF_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath })));

const FINAL_RELEASE_PATH = 'docs/near-model-memory-plan-pack/cm2127_exact_branch_cas_final_release.json';
const FINAL_RELEASE_MARKDOWN_PATH = FINAL_RELEASE_PATH.replace(/\.json$/, '.md');
const FINAL_RELEASE_DIFF_PATHS = Object.freeze([FINAL_RELEASE_MARKDOWN_PATH, FINAL_RELEASE_PATH].sort());
const FINAL_RELEASE_DIFF_ENTRIES = Object.freeze(
  FINAL_RELEASE_DIFF_PATHS.map(sourcePath => ({ status: 'A', path: sourcePath }))
);

const REGISTRY_REFERENCE = 'cm2125-exact-branch-cas-registry-001';
const NONCE = 'cm2125-exact-branch-cas-001';
const RECEIPT_ID = 'cm2125-exact-branch-cas-receipt-001';
const EXECUTION_RECEIPT_FILENAME = 'cm2125-exact-branch-cas-execution-receipt-001.json';

const GOVERNANCE_ROOT_IDENTITY = Object.freeze({
  registryRootInstanceId: 'cm2093-phase8-governance-root-instance-001',
  registryRootReference: 'codex-memory-phase8-governance-root',
  registryRootReinitializationAllowed: false,
  registryRootReplacementAllowed: false
});
const GOVERNANCE_ROOT_IDENTITY_SHA256 = '240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0';

module.exports = {
  ACTION,
  CONTENT_DECISION_FREEZE,
  EXECUTION_RECEIPT_FILENAME,
  EXPECTED_OLD,
  EXPECTED_OLD_TREE,
  FINAL_RELEASE_DIFF_ENTRIES,
  FINAL_RELEASE_DIFF_PATHS,
  FINAL_RELEASE_MARKDOWN_PATH,
  FINAL_RELEASE_PATH,
  FINAL_RELEASE_TASK_ID,
  GOVERNANCE_ROOT_IDENTITY,
  GOVERNANCE_ROOT_IDENTITY_SHA256,
  IMPLEMENTATION_ARTIFACT_PATHS,
  IMPLEMENTATION_DIFF_ENTRIES,
  IMPLEMENTATION_DIFF_PATHS,
  IMPLEMENTATION_PARENT_FREEZE,
  NEW_COMMIT,
  NEW_TREE,
  NONCE,
  PACKET_DIFF_ENTRIES,
  PACKET_DIFF_PATHS,
  PACKET_MARKDOWN_PATH,
  PACKET_PATH,
  RECEIPT_ID,
  REGISTRY_REFERENCE,
  STATUS_ENTRIES,
  STATUS_PATHS,
  TARGET_REF,
  TASK_ID
};
