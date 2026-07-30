'use strict';

const {
  aggregateAttemptCounters,
  appendGovernedReadAttemptStage,
  validateGovernedReadAttemptWorkingSet
} = require('../../../packages/chatgpt-r4-contracts/governed-read-attempt');
const {
  buildMemoryContextLowDisclosureProjection
} = require('../../core/MemoryContextPackageService');
const {
  postCheckNativeDiaryResults
} = require('../../core/NativeDiaryResultPostCheck');

const MAX_QUERY_VECTOR_DIMENSION = 65_536;
const MAX_RESULT_LIMIT = 5;

function validateLeaseTaskInput({
  workingSet,
  projection,
  projectionPlan,
  authorization,
  queryVector,
  queryLimit,
  knowledgeBaseManager,
  knowledgeBaseRootPath,
  knowledgeBaseStorePath
}) {
  validateGovernedReadAttemptWorkingSet(workingSet);
  const lastReceipt = workingSet.receipts.at(-1);
  if (lastReceipt?.stage !== 'PROVIDER_EMBEDDING' ||
      lastReceipt.outcome !== 'completed') {
    throw Object.assign(new Error('lease_task_stage_invalid'), {
      code: 'lease_task_stage_invalid'
    });
  }
  if (!projection ||
      typeof projection.materialize !== 'function' ||
      !projectionPlan ||
      authorization?.accepted !== true ||
      !Array.isArray(authorization.allowedDiaryNames) ||
      authorization.allowedDiaryNames.length < 1 ||
      authorization.allowedDiaryNames.length > 8 ||
      authorization.allowedDiaryCount !==
        authorization.allowedDiaryNames.length ||
      !knowledgeBaseManager ||
      typeof knowledgeBaseManager.search !== 'function' ||
      typeof knowledgeBaseManager._getOrLoadDiaryIndex !== 'function' ||
      typeof knowledgeBaseRootPath !== 'string' ||
      typeof knowledgeBaseStorePath !== 'string') {
    throw Object.assign(new Error('lease_task_input_invalid'), {
      code: 'lease_task_input_invalid'
    });
  }
  if (!Array.isArray(queryVector) ||
      queryVector.length < 1 ||
      queryVector.length > MAX_QUERY_VECTOR_DIMENSION ||
      queryVector.length !== projectionPlan.dimension ||
      queryVector.some(value => typeof value !== 'number' ||
        !Number.isFinite(value))) {
    throw Object.assign(new Error('lease_task_query_vector_invalid'), {
      code: 'lease_task_query_vector_invalid'
    });
  }
  if (!Number.isInteger(queryLimit) ||
      queryLimit < 1 ||
      queryLimit > MAX_RESULT_LIMIT) {
    throw Object.assign(new Error('lease_task_query_limit_invalid'), {
      code: 'lease_task_query_limit_invalid'
    });
  }
}

function mergeCounterFacts(...facts) {
  const output = {};
  for (const fact of facts) {
    if (!fact || typeof fact !== 'object' || Array.isArray(fact)) continue;
    for (const [group, fields] of Object.entries(fact)) {
      output[group] = {
        ...(output[group] || {}),
        ...fields
      };
    }
  }
  return output;
}

function completeStage(workingSet, stage, counterFacts = {}) {
  return appendGovernedReadAttemptStage(workingSet, {
    stage,
    counterFacts
  });
}

function failStage(
  workingSet,
  stage,
  reasonCode,
  counterFacts = {}
) {
  const failed = appendGovernedReadAttemptStage(workingSet, {
    stage,
    outcome: 'failed',
    reasonCode,
    counterFacts
  });
  return Object.freeze({
    accepted: false,
    working_set: failed,
    evidence_complete: countersComplete(failed),
    result: null
  });
}

function countersComplete(workingSet) {
  const counters = aggregateAttemptCounters(workingSet.receipts);
  return Object.values(counters).every(group =>
    Object.values(group).every(Number.isSafeInteger)
  );
}

async function runStageHook(stageHooks, stage, input) {
  const hook = stageHooks?.[stage];
  if (hook === undefined) return;
  if (typeof hook !== 'function') {
    throw Object.assign(new Error('lease_task_stage_hook_invalid'), {
      code: 'lease_task_stage_hook_invalid'
    });
  }
  await hook(input);
}

function projectReadResults(results) {
  if (!Array.isArray(results)) return [];
  return results.slice(0, MAX_RESULT_LIMIT).map((item, index) => {
    const scorePresent =
      typeof item?.score === 'number' && Number.isFinite(item.score);
    return {
      sourceFilePresent:
        typeof item?.sourceFile === 'string' && item.sourceFile.length > 0,
      scorePresent,
      ...(scorePresent
        ? { score: Math.max(0, Math.min(1, item.score)) }
        : {}),
      tagCountBucket: Array.isArray(item?.matchedTags)
        ? item.matchedTags.length === 0
          ? 'zero'
          : item.matchedTags.length <= 5
            ? 'bounded'
            : 'over_budget'
        : 'unknown',
      sourceKinds: ['vcp_native'],
      memoryContextProjection:
        buildMemoryContextLowDisclosureProjection(item, index)
    };
  });
}

async function executeGovernedReadLeaseTask(input = {}) {
  validateLeaseTaskInput(input);
  const {
    projection,
    projectionPlan,
    authorization,
    queryLimit,
    knowledgeBaseManager,
    knowledgeBaseRootPath,
    knowledgeBaseStorePath,
    stageHooks
  } = input;
  const queryVector = Float32Array.from(input.queryVector);
  let workingSet = input.workingSet;
  let hydration;

  try {
    await runStageHook(stageHooks, 'HYDRATION', {
      attempt_ref: workingSet.header.attempt_ref
    });
    hydration = await projection.materialize({
      allowedDiaryNames: authorization.allowedDiaryNames,
      knowledgeBaseManager,
      knowledgeBaseRootPath,
      knowledgeBaseStorePath,
      projectionPlan
    });
    workingSet = completeStage(
      workingSet,
      'HYDRATION',
      hydration.counterFacts
    );
  } catch (error) {
    const reasonCode = error?.reasonCode ===
      'source_snapshot_changed_after_preflight'
      ? 'source_snapshot_changed_after_preflight'
      : 'hydration_failed';
    return failStage(
      workingSet,
      'HYDRATION',
      reasonCode,
      mergeCounterFacts(
        error?.counterFacts,
        { native_invocation: { failed: 1 } }
      )
    );
  }

  try {
    await runStageHook(stageHooks, 'INDEX_RECOVERY', {
      attempt_ref: workingSet.header.attempt_ref
    });
    let loadedVectorCount = 0;
    for (const diaryName of authorization.allowedDiaryNames) {
      const index = await knowledgeBaseManager._getOrLoadDiaryIndex(diaryName);
      if (!index || typeof index.stats !== 'function') {
        throw new Error('lease_index_stats_unavailable');
      }
      const stats = await index.stats();
      if (!Number.isSafeInteger(stats?.totalVectors) ||
          stats.totalVectors < 0) {
        throw new Error('lease_index_stats_invalid');
      }
      loadedVectorCount += stats.totalVectors;
      if (!Number.isSafeInteger(loadedVectorCount)) {
        throw new Error('lease_index_vector_count_invalid');
      }
    }
    if (hydration.hydratedChunkCount > 0 && loadedVectorCount === 0) {
      throw new Error('lease_index_empty_after_hydration');
    }
    workingSet = completeStage(workingSet, 'INDEX_RECOVERY');
  } catch {
    return failStage(
      workingSet,
      'INDEX_RECOVERY',
      'index_recovery_failed',
      { native_invocation: { failed: 1 } }
    );
  }

  let rawResults;
  try {
    await runStageHook(stageHooks, 'VECTOR_SEARCH', {
      attempt_ref: workingSet.header.attempt_ref
    });
    rawResults = await knowledgeBaseManager.search(
      authorization.allowedDiaryNames,
      queryVector,
      queryLimit,
      0,
      []
    );
    if (!Array.isArray(rawResults) ||
        rawResults.length > queryLimit ||
        rawResults.length > MAX_RESULT_LIMIT) {
      throw new Error('lease_vector_search_result_invalid');
    }
    workingSet = completeStage(workingSet, 'VECTOR_SEARCH', {
      native_invocation: {
        succeeded: 1,
        failed: 0
      }
    });
  } catch {
    return failStage(
      workingSet,
      'VECTOR_SEARCH',
      'vector_search_failed',
      { native_invocation: { failed: 1 } }
    );
  }

  try {
    await runStageHook(stageHooks, 'SCOPE_POSTCHECK', {
      attempt_ref: workingSet.header.attempt_ref
    });
    const postcheck = postCheckNativeDiaryResults(
      rawResults,
      authorization.allowedDiaryNames
    );
    if (postcheck.accepted !== true) {
      throw new Error('lease_scope_postcheck_rejected');
    }
    workingSet = completeStage(workingSet, 'SCOPE_POSTCHECK');
  } catch {
    return failStage(
      workingSet,
      'SCOPE_POSTCHECK',
      'scope_postcheck_failed'
    );
  }

  return Object.freeze({
    accepted: true,
    working_set: workingSet,
    evidence_complete: countersComplete(workingSet),
    result: Object.freeze({
      results: Object.freeze(projectReadResults(rawResults)),
      result_count: rawResults.length,
      raw_memory_content_disclosed: false,
      raw_vector_disclosed: false,
      source_path_disclosed: false,
      provider_response_disclosed: false
    })
  });
}

module.exports = {
  MAX_QUERY_VECTOR_DIMENSION,
  MAX_RESULT_LIMIT,
  executeGovernedReadLeaseTask,
  projectReadResults,
  validateLeaseTaskInput
};
