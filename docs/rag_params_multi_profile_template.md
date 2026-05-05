# rag_params_multi_profile_template

## 目标

让 `rag_params.json` 支持按向量模型 profile 切换，而不是所有 embedding 共用一套参数。

---

## 示例模板

```json
{
  "default": {
    "RAGDiaryPlugin": {
      "noise_penalty": 0.05,
      "tagWeightRange": [0.05, 0.45],
      "tagTruncationBase": 0.60,
      "tagTruncationRange": [0.50, 0.90],
      "timeDecay": {
        "halfLifeDays": 30,
        "minScore": 0.5
      },
      "mainSearchWeights": [0.70, 0.30],
      "refreshWeights": [0.50, 0.35, 0.15],
      "metaThinkingWeights": [0.80, 0.20]
    },
    "KnowledgeBaseManager": {
      "geodesicRerank": {
        "alpha": 0.30,
        "minGeoSamples": 4
      },
      "spikeRouting": {
        "maxSafeHops": 4,
        "baseMomentum": 2.0,
        "firingThreshold": 0.10,
        "baseDecay": 0.25,
        "wormholeDecay": 0.70,
        "tensionThreshold": 1.0,
        "maxEmergentNodes": 50,
        "maxNeighborsPerNode": 20
      },
      "activationMultiplier": [0.5, 1.5],
      "dynamicBoostRange": [0.3, 2.0],
      "coreBoostRange": [1.20, 1.40],
      "deduplicationThreshold": 0.88,
      "techTagThreshold": 0.08,
      "normalTagThreshold": 0.015,
      "languageCompensator": {
        "penaltyUnknown": 0.05,
        "penaltyCrossDomain": 0.10
      }
    },
    "MetaThinkingManager": {
      "autoThreshold": 0.65
    }
  },
  "profiles": {
    "google/gemini-embedding-001__3072": {
      "inherits": "default"
    },
    "text-embedding-3-large__3072": {
      "inherits": "default",
      "RAGDiaryPlugin": {
        "noise_penalty": 0.07,
        "tagWeightRange": [0.03, 0.28],
        "tagTruncationBase": 0.55,
        "tagTruncationRange": [0.45, 0.80],
        "mainSearchWeights": [0.78, 0.22],
        "metaThinkingWeights": [0.84, 0.16]
      },
      "KnowledgeBaseManager": {
        "geodesicRerank": {
          "alpha": 0.18,
          "minGeoSamples": 5
        },
        "activationMultiplier": [0.5, 1.2],
        "dynamicBoostRange": [0.3, 1.4],
        "coreBoostRange": [1.15, 1.28],
        "deduplicationThreshold": 0.90,
        "techTagThreshold": 0.10,
        "normalTagThreshold": 0.02
      },
      "MetaThinkingManager": {
        "autoThreshold": 0.72
      }
    },
    "qwen-embedding-x__1536": {
      "inherits": "default",
      "RAGDiaryPlugin": {
        "noise_penalty": 0.08,
        "tagWeightRange": [0.03, 0.22],
        "tagTruncationBase": 0.55,
        "tagTruncationRange": [0.45, 0.75],
        "mainSearchWeights": [0.78, 0.22],
        "refreshWeights": [0.58, 0.27, 0.15],
        "metaThinkingWeights": [0.86, 0.14]
      },
      "KnowledgeBaseManager": {
        "geodesicRerank": {
          "alpha": 0.18,
          "minGeoSamples": 5
        },
        "spikeRouting": {
          "maxSafeHops": 4,
          "baseMomentum": 2.0,
          "firingThreshold": 0.10,
          "baseDecay": 0.25,
          "wormholeDecay": 0.70,
          "tensionThreshold": 1.0,
          "maxEmergentNodes": 40,
          "maxNeighborsPerNode": 16
        },
        "activationMultiplier": [0.5, 1.1],
        "dynamicBoostRange": [0.3, 1.25],
        "coreBoostRange": [1.15, 1.28],
        "deduplicationThreshold": 0.90,
        "techTagThreshold": 0.10,
        "normalTagThreshold": 0.02,
        "languageCompensator": {
          "penaltyUnknown": 0.03,
          "penaltyCrossDomain": 0.08
        }
      },
      "MetaThinkingManager": {
        "autoThreshold": 0.75
      }
    },
    "bge-m3__1024": {
      "inherits": "default",
      "RAGDiaryPlugin": {
        "noise_penalty": 0.06,
        "tagWeightRange": [0.04, 0.30],
        "tagTruncationBase": 0.60,
        "tagTruncationRange": [0.50, 0.85],
        "mainSearchWeights": [0.74, 0.26],
        "metaThinkingWeights": [0.84, 0.16]
      },
      "KnowledgeBaseManager": {
        "geodesicRerank": {
          "alpha": 0.24,
          "minGeoSamples": 4
        },
        "activationMultiplier": [0.5, 1.3],
        "dynamicBoostRange": [0.3, 1.6],
        "coreBoostRange": [1.18, 1.32],
        "deduplicationThreshold": 0.89,
        "techTagThreshold": 0.08,
        "normalTagThreshold": 0.018
      },
      "MetaThinkingManager": {
        "autoThreshold": 0.70
      }
    }
  }
}
```

---

## 指纹规则建议

推荐统一使用：

```text
<modelName>__<dimension>
```

例如：

- `google/gemini-embedding-001__3072`
- `text-embedding-3-large__3072`
- `qwen-embedding-x__1536`
- `bge-m3__1024`

---

## 加载逻辑建议

1. 读取当前 `model`
2. 读取当前 `dimension`
3. 拼出 fingerprint
4. 先读 `profiles[fingerprint]`
5. 找不到则回退到 `default`

---

## 调参顺序建议

优先调：

- `RAGDiaryPlugin.noise_penalty`
- `RAGDiaryPlugin.tagWeightRange`
- `KnowledgeBaseManager.geodesicRerank.alpha`
- `KnowledgeBaseManager.geodesicRerank.minGeoSamples`

第二层再调：

- `dynamicBoostRange`
- `coreBoostRange`
- `techTagThreshold`
- `normalTagThreshold`

最后才碰：

- `EPAModule`
- `ResidualPyramid`
- `MetaThinkingManager.autoThreshold`
