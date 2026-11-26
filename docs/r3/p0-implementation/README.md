# R3 审核体系 v3 · P0 受控研发实施管理总览

> **管理体系定位**：本目录（`docs/r3/p0-implementation/`）是 R3 审核体系 v3 **P0 阶段受控研发**的独立日常实施与验收管理体系，**只负责 P0 专项实施与验收**（全仓库长期历史、创作原则、实验证据与跨会话恢复上下文见仓库级档案 [`docs/PROJECT-CONTEXT.md`](../../PROJECT-CONTEXT.md)，本目录不复制该档案）。  
> **红线声明**：本目录文档**不重新设计、不覆盖、不降低**已冻结架构 PRD `v1.2.3` 的任何设计约束与验收门槛；当前仅依据作者预先授权及 GPT-6 文档验收通过（`2d6061d6` `ACCEPTED`）执行了纯只读 **`P0-0`**（现处于 **`READY_FOR_REVIEW`** 等待 GPT-6 独立验收）；**`P0-1` 至 `P0-6` 全部继续保持 `NOT_STARTED`，零生产代码修改、零 Skill/R2/测试改动、零新小说实验**。

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
| **历史本地实验参考（未合入基线）** | `feat/r3-phase1-throughput-o1-o3` @ `c0966b1`（已在 `P0-0` 完成只读差异审计，严禁整枝盲目合入） |
| **当前阶段** | **纯只读 `P0-0：研发基线审计与实施准备` 已完成并提交 `READY_FOR_REVIEW`，等待 GPT-6 独立验收；`P0-0` 获 `ACCEPTED` 前严禁推进 `P0-1`。** |
| **总体进度** | **`0 / 7` 任务已验收（`0%`）**（`P0-0` = **`READY_FOR_REVIEW`**；`P0-1` ~ `P0-6` 全部保持 `NOT_STARTED`） |

### 引用的正式冻结架构基线文档（只读权威，禁止修改）
- [`docs/r3/review-v3/03-R3审核体系v3总体架构设计.md`](../review-v3/03-R3审核体系v3总体架构设计.md)（`v1.2.2` 对齐冻结）
- [`docs/r3/review-v3/04-四层审核生命周期与状态流转图.md`](../review-v3/04-四层审核生命周期与状态流转图.md)（`v1.2.2` 对齐冻结）
- [`docs/r3/review-v3/06-审核修复复审及版本失效协议.md`](../review-v3/06-审核修复复审及版本失效协议.md)（`v1.2.1` 对齐冻结）
- [`docs/r3/review-v3/07-P0-P1-P2开发任务与依赖关系.md`](../review-v3/07-P0-P1-P2开发任务与依赖关系.md)（`v1.2.2` 对齐冻结）
- [`docs/r3/review-v3/08-工程效率与文学质量双重验收方案.md`](../review-v3/08-工程效率与文学质量双重验收方案.md)（`v1.2.3` 冻结终版）

---

## 三、P0-0 至 P0-6 状态面板

> **状态枚举硬规范**：仅允许使用 `NOT_STARTED` | `IN_PROGRESS` | `READY_FOR_REVIEW` | `CHANGES_REQUESTED` | `ACCEPTED` | `BLOCKED`。  
> **验收权限铁律**：**Neon 仅能将任务推进至 `READY_FOR_REVIEW`，绝不得自行置为 `ACCEPTED`**；`ACCEPTED` 仅在 **GPT-6 明确验收通过**后方可写入；任一任务未获 `ACCEPTED`（或被置为 `CHANGES_REQUESTED`），严禁绕过验收启动后续依赖任务。

| 任务 ID | 任务名称 | 前置依赖 | 当前状态 | 独立 Commit SHA | GPT-6 验收状态 | 关键风险 / 当前备注 |
|---|---|---|---|---|---|---|
| **P0-0** | 研发基线审计与实施准备 | PRD `ACCEPTED` + 文档 `2d6061d6` `ACCEPTED` + 作者预授权（均已满足） | **`READY_FOR_REVIEW`** | 原始：`86cbc9f3ad37c635f134eeea2a89317d5eef0a3c`（`2026-11-26T02:58:13Z`）；<br>`RW-P0-0-001`：`9747e146e016155055b928d7a664650cb76def5c`（`03:11:59Z`）、`8ac888fce42070855241d2f17d05691b3afce709`（`03:41:39Z`） | `PENDING`（`RW-P0-0-002` 重提） | 已按 Issue #4 `CHANGES_REQUESTED` 完成 4 项整改：C.2 Fail-Closed 18+62 全量 64 位 SHA-256/字节断言、C.3 主仓 293 + `<ART_ROOT>` 2,723 全量递归盘点与 173 候选章节逐项排除、C.4 G4 24 案例来源章节去重计数，并明示 Node `71/71` + 10 脚本 + Python `12/12` 为 Neon 本地实测证据（GPT-6 未独立复跑）；0 代码改动，等待 GPT-6 再次独立验收 |
| **P0-1** | S1 四级枚举及下游兼容（含 `ENG-FIX-P1`） | `P0-0 (ACCEPTED)` | `NOT_STARTED` | `—` | `NOT_SUBMITTED` | 严守 R2 零破坏与 `SUGGESTION` 0% 阻断（`08` E1 & G5）；须待 `P0-0` 获 `ACCEPTED` 后方可启动 |
| **P0-2** | 写手语域防火墙 | `P0-0 (ACCEPTED)` | `NOT_STARTED` | `—` | `NOT_SUBMITTED` | 写手上下文治理词/限时压迫词 `= 0`；末尾严格按“倒数第二部分：本书文风锚点示范 → 最后一部分（最末位）：上一章结尾原文（500–900 字）”排列（`03` 2.1 节 & `08` E5） |
| **P0-3** | `precheck v2` | `P0-0 (ACCEPTED)` | `NOT_STARTED` | `—` | `NOT_SUBMITTED` | 仅文件破损与作者显式硬约束阻断；字数/重复段/跨段引语不阻断 |
| **P0-4** | 复合审读指纹与 Fail-Closed | `P0-1 (ACCEPTED)` | `NOT_STARTED` | `—` | `NOT_SUBMITTED` | 五元组复合指纹 + 6 维取证槽 + 修空增 `revision` Bug（`08` E2） |
| **P0-5** | A/B/C 三方案审稿原型（含 `PLANNING_CONFLICT_BLOCK`） | `P0-2`, `P0-3`, `P0-4 (均 ACCEPTED)` | `NOT_STARTED` | `—` | `NOT_SUBMITTED` | 仅在隔离沙箱落地原型，**禁止提前替换生产主审稿模板** |
| **P0-6** | G1–G6 统计与文学质量验收 | `P0-5 (ACCEPTED)` | `NOT_STARTED` | `—` | `NOT_SUBMITTED` | **G2-A 与 G2-B 严格分离；G2-B 当前 `underpowered`（0/20 章、0/60 案例），同时已核实 G3（缺 +1 章/+6 段）、G5（缺 +2 死锁章）与 G6（0/12–16 章）缺口** |

---

## 四、本目录文件清单

| 文件 | 职责说明 |
|---|---|
| [`README.md`](./README.md)（本文件） | 项目目标与范围、基线元信息、当前阶段、总体进度与 `P0-0` ~ `P0-6` 状态总览面板 |
| [`P0-Implementation-PRD.md`](./P0-Implementation-PRD.md) | `P0-0` ~ `P0-6` 逐项完整实施规范（含全部 11 个标准字段）、权限与提交规范、回滚预案及 GPT-6 验收记录表 |
| [`P0-Progress-Log.md`](./P0-Progress-Log.md) | 按时间线记录每次实施活动、Commit SHA、变更文件、测试输出、GPT-6 审核结论及返工/复审闭环台账 |
| [`P0-0-Baseline-Audit-Report.md`](./P0-0-Baseline-Audit-Report.md) | `P0-0` 纯只读基线审计报告（代码基线、与 `c0966b12` 差异、Node/Python 固化测试基线、全仓 S1 消费者与 `ENG-FIX-P1` 拆解、G1–G6 样本就绪度与 `G2-B underpowered` 缺口清册） |
