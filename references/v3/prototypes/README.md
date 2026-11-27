# R3 v3 审稿架构隔离沙箱原型（P0-5 · 非生产模板）

> **隔离声明**：本目录（`references/v3/prototypes/`）下的全部模板均为 **P0-5 离线受控对照实验原型**，仅供 `P0-6` 在 G1–G6 基准上对方案 A / B / C 进行公平对照评测使用。
> - **严禁**将本目录任何文件视为现行生产主模板；
> - **严禁**预设任何方案（A、B 或 C）必胜；最终主架构由 `P0-6` 离线统计与 Go/No-Go 门禁客观裁决；
> - 现行生产审稿模板（`references/v3/review-agent-template.md`、`references/v3/r2-review-agent-template.md`、`references/v3/workflow.md`、`SKILL.md`）保持零字节改动。

## 三方案共享底座（消除归因混杂）
1. **确定性预检**：共享 `precheck v2`（`scripts/precheck_v2_common.mjs`），仅工程破损与作者显式 `hardConstraints` 阻断；所有 `NEEDS_SEMANTIC_AUDIT`（`NSA-NNN`）注入审稿输入包并强制逐条核销。
2. **五元组复合审读指纹与 Fail-Closed 内核**：共享 `scripts/r3_review_kernel.mjs`（`r3-review-v3.0`），缺失任意 6 维取证槽（`HL-1`–`HL-6`）、漏核销 `NSA-NNN`、伪造 `quote`、缺失 `reverseDefense`/`impactScope` 或 S1/OR6 违约均 `exit code 2` 拒收落盘。
3. **`impactScope` 硬拦截与 `PLANNING_CONFLICT_BLOCK`**：共享 `scripts/p0_prototypes/impact_scope_router.mjs`，禁止将 `upstream_planning` / `finalized_canon` 混入写手改稿批。

## 原型模板清单
| 方案 | 协议模式 (`protocolMode`) | 模板文件 | 调用链路 |
|---|---|---|---|
| **方案 A（Control）** | `single_stage_A` | `scheme-a-single-stage.md` | 1 次增强单阶段完整审稿 → `FinalCalibrationReport` |
| **方案 B（Two-Stage）** | `two_stage_B` | `scheme-b-pass1-discovery.md` + `scheme-b-pass2-calibration.md` | Pass 1 开放发现（`Pass1DiscoveryReport`）→ Pass 2 独立轻量定级（仅候选 + ±300 字原文 + 核心规划 → `FinalCalibrationReport`） |
| **方案 C（Hybrid）** | `single_plus_triage_C` | `scheme-c-stage1-high-recall.md` + `scheme-c-stage2-triage.md` | Stage 1 高召回单阶段完整审稿 → 条件触发 Stage 2 独立轻量定级复核（清白 `pass_candidate` 且全部 `NSA` 为 `pass` 且无冲突提示时短路跳过） |
