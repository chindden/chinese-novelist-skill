# R3 审核体系 v3 · P0 受控研发实施管理总览

> **目录定位**：本目录（`docs/r3/p0-implementation/`）提供 R3 审核体系 v3 **P0 阶段的专项范围说明、技术文档导航与历史基线索引**。全仓库长期背景与协作治理见 [`docs/PROJECT-CONTEXT.md`](../../PROJECT-CONTEXT.md)；本 README 不承担日常任务状态或实施进度维护，实时状态以 GitHub Issues 与 Project #4 为准。  
> **规范与证据边界**：本目录文档**不重新设计、不覆盖、不降低**已冻结架构 PRD `v1.2.3` 的任何设计约束与验收门槛；`P0-0` 已于 `2026-11-26T06:59:01Z` 获 GPT-6 独立验收 **`ACCEPTED`**（`2b51cc262db9fb9cd9b030977b418f362b9fb002`），作为已完成的历史里程碑保留。其他任务的实时状态、授权、实施进度与审查结论统一查阅对应 GitHub Issue，并通过 [Project #4](https://github.com/users/chindden/projects/4) 查看全局状态；本 README 不复制动态状态。

---

## 一、项目目标与范围

### 1. P0 阶段核心目标（单章破局与工程止血）
基于已冻结的 R3 审核体系 v3 架构（`v1.2.3`），在不破坏 R2 既有行为与现有 R3 基线契约的前提下，完成以下受控研发闭环：
1. **基线对齐与实施准备（`P0-0`）**：审计主基线与本地实验分支差异、固化自动化测试基线、盘点下游枚举消费者清单、核查 `G2-B Independent Holdout` 当前 `underpowered` 样本缺口。
2. **S1 四级枚举与下游兼容（`P0-1`）**：落地正式 `SUGGESTION` 枚举与 `ENG-FIX-P1` 遗留字段校验，确保 R2 三级历史报告 100% 向后兼容、`SUGGESTION` 0% 触发阻断或必改闭环。
3. **写手语域防火墙（`P0-2`）**：实现纯叙事写手任务卡与返工修订卡编译，确保写手上下文零治理元数据、零 `reverseDefense`、零限时压迫词，并严格锁定写手任务卡末尾先后顺序：**倒数第二部分为本书文风锚点示范（紧邻上章结尾之前），最后一部分（最末位）为上一章结尾原文（500–900 字）**。
4. **确定性预检 `precheck v2`（`P0-3`）**：仅工程文件破损与作者显式硬约束允许阻断送审；字数/重复段/跨段引语默认非阻断；自动提取算术、日期、账目、道具编号与高潮信息差线索进入 `NEEDS_SEMANTIC_AUDIT`。
5. **复合审读指纹与 Fail-Closed（`P0-4`）**：落地五元组 `reviewFingerprint`、6 维 `dimensionAuditSlots` 与 `NEEDS_SEMANTIC_AUDIT` 完备性硬拒收，修复预检自修空增 `revision` Bug。
6. **A/B/C 三方案审稿原型与 `PLANNING_CONFLICT_BLOCK`（`P0-5`）**：在隔离沙箱中完成方案 A（增强单阶段）、方案 B（Pass 1 发现 + Pass 2 独立轻量定级）、方案 C（单阶段高召回 + 独立轻量定级复核）原型及 `impactScope` 硬拦截，**不提前替换生产主审稿模板**。
7. **G1–G6 统计与文学质量验收（`P0-6`）**：以严格分离的 **`G2-A Regression/Calibration`** 与 **`G2-B Independent Holdout`**（补齐独立样本前强制保留 `underpowered` 状态）及聚类 Bootstrap 95% CI、二次加权 Kappa 裁决 A/B/C 胜出架构，决定准入主仓的 Go / No-Go。

### 2. 本阶段明确不在范围（Out of Scope）
- **不含** P1 任务（L0 `diagnose_book.mjs`、跨轮三元组继承、统一 CLI `r3_ops.mjs`、`analyze_impact.mjs`、L2/L3 卷级闭环、跨 Harness 适配层）。
- **不含** P1 稳定后的独立系统性能轨道 `Perf-Track`（`PERF-S2` / `PERF-S3`）与可选产品功能轨道 `P2-OptIn`（L4 完本终审与精修）。
- **不含**任何 R2 行为修改、已冻结架构文档 `docs/r3/review-v3/` 重写、生产主流程擅自切换或未经授权的新小说实验。

---

## 二、架构基线与研发分支元信息

| 元信息项 | 当前锁定值 |
|---|---|
| **目标仓库** | `chindden/chinese-novelist-skill` |
| **仓库级长期上下文档案** | [`docs/PROJECT-CONTEXT.md`](../../PROJECT-CONTEXT.md)（全仓库历史、创作原则、实验证据与跨会话恢复入口；本目录仅负责 P0 专项） |
| **正式冻结架构版本** | **`v1.2.3 (Freeze-Ready Final)`**（PR #3 已合入 `feat/r3-migration`） |
| **架构冻结 Merge Commit SHA** | `b5572a943f9157cda07faa7910dcbfd20b1a3ba5`（源 PR 最终提交 `b63c0b82f220ccba202d63ed66f5bccdc39ba825`） |
| **P0 受控研发分支** | **`feat/r3-p0-controlled`**（直接基于 `origin/feat/r3-migration` @ `b5572a943f9157cda07faa7910dcbfd20b1a3ba5` 创建） |
| **基线分支 / SHA** | `feat/r3-migration` @ **`b5572a943f9157cda07faa7910dcbfd20b1a3ba5`** |
| **实施管理文档初始化 Commit SHA** | **`95b0951d021eddf5d23a1710944550ccc38ca1ff`**（GitHub 提交时间 `2026-11-25T17:12:50Z`，*仅为管理文档初始化提交时间，非实际研发开始时间*） |
| **P0 管理 PRD `v1.0.1` 内容修订 Commit SHA** | **`a12774f50956c5081252fe1722333893331ded5e`**（GitHub 提交时间 `2026-11-25T17:23:04Z`，*仅为 `v1.0.1` 内容修订的 GitHub 提交时间，非实际研发开始时间*） |
| **P0 管理 PRD 验收基线 Commit SHA** | **`e52105adca3f994fca3cbdeef9aa935479ceaf9b`**（GitHub 提交时间 `2026-11-25T17:44:23Z`；**GPT-6 最终验收 `ACCEPTED`，验收日期 `2026-11-26`**） |
| **上下文与 Handoff 验收基线 Commit SHA** | **`2d6061d6cd0e8b4b2da77619cb58239c44dc332e`**（GitHub 提交时间 `2026-11-26T00:52:10Z`；**GPT-6 最终验收 `ACCEPTED`**，正式触发作者预授权的纯只读 `P0-0` 启动） |
| **`P0-0` 最终验收基线 Commit SHA** | **`2b51cc262db9fb9cd9b030977b418f362b9fb002`**（GitHub 提交时间 `2026-11-26T06:45:42Z`；**GPT-6 第六轮独立验收 `ACCEPTED`，验收时间 `2026-11-26T06:59:01Z`**） |
| **`P0-1` A+ 方案作者授权与 PRD 补充基线 SHA** | **`2b6236553c983a93b128758a5343fcac49f00c42`**（GitHub Issue #5 Comment `7186679073`，将 `v3_common.mjs` `structuredReportValid()` 与 `r3_plan_common.mjs` `validCoreReview()` 纳入 `P0-1` 最小修改白名单） |
| **历史本地实验参考（未合入基线）** | `feat/r3-phase1-throughput-o1-o3` @ `c0966b1`（已在 `P0-0` 完成只读差异审计，严禁整枝盲目合入） |

### 引用的正式冻结架构基线文档（只读权威，禁止修改）
- [`docs/r3/review-v3/03-R3审核体系v3总体架构设计.md`](../review-v3/03-R3审核体系v3总体架构设计.md)（`v1.2.2` 对齐冻结）
- [`docs/r3/review-v3/04-四层审核生命周期与状态流转图.md`](../review-v3/04-四层审核生命周期与状态流转图.md)（`v1.2.2` 对齐冻结）
- [`docs/r3/review-v3/06-审核修复复审及版本失效协议.md`](../review-v3/06-审核修复复审及版本失效协议.md)（`v1.2.1` 对齐冻结）
- [`docs/r3/review-v3/07-P0-P1-P2开发任务与依赖关系.md`](../review-v3/07-P0-P1-P2开发任务与依赖关系.md)（`v1.2.2` 对齐冻结）
- [`docs/r3/review-v3/08-工程效率与文学质量双重验收方案.md`](../review-v3/08-工程效率与文学质量双重验收方案.md)（`v1.2.3` 冻结终版）

---

## 三、实时任务状态与沟通入口（动态权威）

本目录不再维护 P0-0 至 P0-6 的本地状态面板。每项任务的实时状态、授权、执行记录、Commit、测试证据、审查意见与验收结论，以对应 GitHub Issue 为准；全局任务展示与状态推进统一使用 [Project #4 · Chinese Novelist Skill R3](https://github.com/users/chindden/projects/4)。

| 任务 | 任务记录与执行证据 |
|---|---|
| **P0-0** | [GitHub Issue #4](https://github.com/chindden/chinese-novelist-skill/issues/4) |
| **P0-1** | [GitHub Issue #5](https://github.com/chindden/chinese-novelist-skill/issues/5) |
| **P0-2** | [GitHub Issue #6](https://github.com/chindden/chinese-novelist-skill/issues/6) |
| **P0-3** | [GitHub Issue #7](https://github.com/chindden/chinese-novelist-skill/issues/7) |
| **P0-4** | [GitHub Issue #8](https://github.com/chindden/chinese-novelist-skill/issues/8) |
| **P0-5** | [GitHub Issue #9](https://github.com/chindden/chinese-novelist-skill/issues/9) |
| **P0-6** | [GitHub Issue #10](https://github.com/chindden/chinese-novelist-skill/issues/10) |

> **查询纪律**：先查看 Project #4 识别任务状态，再进入对应 Issue 阅读具体执行上下文与证据。README 中的任务编号与 Issue 链接仅作导航，不记录任务状态；不得依据本文件、历史 Progress Log 或其他静态快照推断当前进度。

---

## 四、本目录文件清单

| 文件 | 职责说明 |
|---|---|
| [`README.md`](./README.md)（本文件） | P0 项目目标与范围、历史基线索引、GitHub Issue / Project #4 实时状态入口与专项文档导航；不维护动态进度 |
| [`P0-Implementation-PRD.md`](./P0-Implementation-PRD.md) | `P0-0` ~ `P0-6` 的实施规范、技术边界、允许/禁止修改范围、测试要求与验收标准；按全局 `DEC-13` 管理冻结后变更及阶段结项总结 |
| [`P0-Progress-Log.md`](./P0-Progress-Log.md) | **历史实施与验收记录归档**：保留既有内容，自全局 `DEC-13` 生效后停止追加或修改；不作为当前任务状态或执行证据的权威来源 |
| [`P0-0-Baseline-Audit-Report.md`](./P0-0-Baseline-Audit-Report.md) | `P0-0` 纯只读基线审计报告（代码基线、与 `c0966b12` 差异、Node/Python 固化测试基线、全仓 S1 消费者与 `ENG-FIX-P1` 拆解、G1–G6 样本就绪度与附录 A/B/C） |
| [`P0-0-C3-Full-File-Manifest.tsv`](./P0-0-C3-Full-File-Manifest.tsv) | `P0-0` 附录 C.3 配套审计证据：本地 `<ART_ROOT>` 全部 2,723 个文件逐文件脱敏 Manifest（含字节数、完整 64 位 SHA-256、深度信号与 6 栏排除记录） |
| [`P0-0-C3-Repo-Manifest.tsv`](./P0-0-C3-Repo-Manifest.tsv) | `P0-0` 附录 C.3 配套审计证据：公开主仓全部 293 个非清单文件逐文件脱敏 Manifest（含字节数、完整 64 位 SHA-256、深度信号与排除记录） |
