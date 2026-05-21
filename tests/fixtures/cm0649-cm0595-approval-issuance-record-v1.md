# CM-0649 CM0595 Approval Issuance Record

Status: CM0595_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED
Decision: CM0595_AUTO_AUTHORIZATION_LINE_ISSUED_NOT_EXECUTED
Date: 2026-05-21
Target baseline: 017eda4930c5add4b824c162c46868f75c91ea0f
Issuance route: CM-0615 -> CM-0604 -> CM-0616 -> CM-0607 -> CM-0648 -> CM-0649
Widening review record: docs/CM-0616_WIDENING_REVIEW_OUTCOME_RECORD_TEMPLATE.md
Widening adoption record: docs/CM-0607_AUTHORIZED_WRITE_PATH_AUTO_AUTHORIZATION_WIDENING_ADOPTION_RECORD_TEMPLATE.md
Same-baseline token-present evidence: docs/CM-0603_future_token_present_same_baseline_record.md
Issued approval text: 授权执行 CM-0595，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_SPLIT_ENABLEMENT_001，并且仅在同一 baseline 下已存在经批准执行的 CM-0592 endpoint/startup evidence 与经批准执行的 CM-0601 current-session token presence rebound evidence（或等价的更新 presence-only evidence）证明 token 已存在的前提下，允许 exactly one sanitized durable memory write through public record_memory and only the normal write-path audit side effect；禁止 search_memory / marker search / observe:http / .jsonl read / provider / config change / watchdog or startup persistence / public MCP expansion / additional durable write / readiness claim。
Issued by: cm0648-governance-preview-surface
Runtime execution started: no
Out-of-scope actions executed: none
