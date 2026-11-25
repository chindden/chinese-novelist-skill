# R3 审核体系 v3 架构重设计方案交付包（PRD 冻结终版）

> **文档版本**：`v1.2.3 (Freeze-Ready Final)`  
> **修订状态**：已完成面向 PR #3 合并前的最终技术细节澄清（`v1.2.3`：**统一 L0 Manifest/SHA-256 运行前后校验与只读挂载执行环境指向同一个底层文件树**，消除可写副本替代口径冲突，并区分 `chmod` 回退方案的权限准备阶段与被测程序非特权非所有者 UID 运行阶段），**架构设计阶段正式收尾，等待作者明确批准合并 PR #3（未合并，未启动 P0/P1 代码实施）**  
> **交付日期**：2026-11-25  
> **目标仓库与基线（现场实时核验）**：
> - **仓库**：`chindden/chinese-novelist-skill`
> - **GitHub 远端 R3 主开发分支（PR 目标分支）**：`feat/r3-migration` @ **`b32e92891d89945baed9a0707e90fbc3572afd20`**（短 SHA `b32e928`）
> - **本地 Phase 1 吞吐实验分支（O1–O3 脚本与遥测来源，未合入 `feat/r3-migration`）**：`feat/r3-phase1-throughput-o1-o3` @ **`c0966b1`**（领先 3 个提交，自动化测试 Node `89/89` + Python `12/12` 全绿；仅证工程契约，不等同文学质量提升）
> - **文档交付分支与 PR**：`docs/r3-review-v3-architecture`（基于 `feat/r3-migration` @ `b32e928` 新建，PR #3，仅包含 `docs/r3/review-v3/` 下正式交付文档，零代码/Skill/R2/实验基线修改）
> - **外部对标基线**：① `lingfengQAQ/webnovel-writer` `v8` 分支（DSH Scriptor `8.4.2` @ `7396ee3`）；② `PenglongHuang/chinese-novelist-skill`（`master` @ `2026-11-24`）

---

## 一、完整文件清单与阅读顺序

本目录（`docs/r3/review-v3/`）以 10 份独立 Markdown 为正式源文件，并同步提供由该 10 份源文件打包校验生成的 `r3-review-v3-architecture-package.zip`（内容与源文件逐字节一致）。本轮 `v1.2.3` 严格遵守最小影响面原则，仅修改 `05`、`08` 与 `README.md`、`CHANGELOG.md`（其余文档已在 `v1.2.1`/`v1.2.2` 对齐冻结且保持未改动）：

| 序号 | 文件名 | 文档版本 | 核心内容 | 上游依赖 |
|---:|---|---|---|---|
| 0a | `README.md`（本文件） | `v1.2.3` | 交付包版本状态、实时基线记录、完整清单、阅读顺序与核心裁决摘要 | 汇总 01–08 |
| 0b | `CHANGELOG.md` | `v1.2.3` | `v1.0 → v1.1 → v1.2 → v1.2.1 → v1.2.2 → v1.2.3` 完整修订追踪记录 | — |
| 1 | `01-R3当前审核能力真实实现审计.md` | `v1.2.1`（对齐冻结） | 仓库双基线核验、15 项能力六态审计、统一 Mean/P50/P90 口径的 `17–22m`（历史重建，含阶段重叠）vs `24–31m`（实时日志，严格互斥）核对与五大症结 | 无（事实基线） |
| 2 | `02-三方差异矩阵.md` | `v1.2.1`（对齐冻结） | R3 × `webnovel-writer v8` × `chinese-novelist-skill` 13 项全生命周期能力对比、裁决与 7 项“明确不做”红线 | 01 |
| 3 | `03-R3审核体系v3总体架构设计.md` | `v1.2.2`（对齐冻结） | L0 纯只读监测层 + L1–L4 四层文学审核总图、A/B/C 三方案审稿对照设计、写手语域防火墙、Mean（全期望）与 P50（混合 CDF）严格分离的时间账本、6 种不可简单相加替代架构、`Perf-Track (S1→S2→S3)` 与可选 `P2-OptIn (L4)` 彻底解耦路线、跨 Harness 分层与 4 条独立反对意见 | 01, 02 |
| 4 | `04-四层审核生命周期与状态流转图.md` | `v1.2.2`（对齐冻结） | L0 纯只读监测贯穿 + L1–L4 四层流转图、四类异常分流（彻底分离 `FACT_CONFLICT_CANDIDATE` 临时安全门与 `STALE_REVIEW_AFTER_EDIT` 工程完整性硬阻断）、L0 三重零写入与沙箱权限边界、L3 正常卷审与修复/复审两笔账分算、`Perf-Track` vs `P2-OptIn` 分离 | 02, 03 |
| 5 | `05-全书机械诊断引擎PRD.md` | `v1.2.3` | L0 贯穿纯只读监测层（`diagnose_book.mjs` + `audit_story_state.mjs --readonly`，9 大维度 `D1–D9`、**全量静态审计 + 只读 bind mount / Docker `:ro` 直接运行 [回退 `chmod -R a-w` 严格区分权限准备阶段与独立非特权非文件所有者 UID 运行阶段，测试临时路径外置] + 宿主机侧对同一底层项目目录执行运行前后 Manifest/SHA-256 比对 [不得用可写副本替代，可写副本仅作辅助]，任一失败即零写入不成立**，`r3_ops.mjs` 唯一承接缓存）、防误判铁律与两类阻断态物理分离 | 01, 02, 04 |
| 6 | `06-审核修复复审及版本失效协议.md` | `v1.2.1`（对齐冻结） | `precheck v2` 作者显式硬约束阻断准入、统一 `PrecheckV2` / `Pass1DiscoveryReport` / `FinalCalibrationReport` 契约、复合指纹、Fail-Closed、S1 四级枚举与 `PLANNING_CONFLICT_BLOCK`、`FACT_CONFLICT_CANDIDATE` 与 `STALE_REVIEW_AFTER_EDIT` 状态机与恢复条件分轨、三元组继承、改动映射、3 轮瓶颈诊断、三轨复审与 `retcon` | 03, 04, 05 |
| 7 | `07-P0-P1-P2开发任务与依赖关系.md` | `v1.2.2`（对齐冻结） | 分阶段开发任务详表与依赖 DAG（P0-6 分离 `G2-A` 与 `G2-B` 且如实标记 `underpowered`、P1-1 L0 沙箱权限边界、P1 后工作彻底拆分为独立持续性能轨道 `Perf-Track (PERF-S2 → PERF-S3)` 与可选产品轨道 `P2-OptIn (P2-1 → P2-2)`）及不做清单 | 03, 04, 05, 06 |
| 8 | `08-工程效率与文学质量双重验收方案.md` | `v1.2.3` | Track E（E3 两类门禁分轨测试、**E4 L0 三重零写入沙箱权限边界与宿主机侧同一底层文件树 Manifest/SHA-256 校验**、`Perf-Track S1→S2→S3` 与 `P2-OptIn L4` 彻底解耦、理论 Mean 与实跑经验 P50 上限区分）× Track L（A/B/C 裁决、G2 彻底分离 `G2-A Regression/Calibration` [`N_ch=9, N_neg=33, K=3`] 与 `G2-B Independent Holdout` [`N_ch>=20` 未见独立章 / `N_neg>=60` / 单章 `<=3` / `>=3` 题材 / `K=3` / 0 重叠，当前明确标为 `underpowered`，缺口 `+20 章 / +60 案例`]、两组分别报原始 `TP/FP/FN/TN` / Precision / FPR / 聚类 95% CI、严禁以历史校准替代独立泛化证明、四级加权 Kappa $\kappa_w$、绝对一致性 ICC、文学评分无空白三带裁决） | 01, 03, 05, 06, 07 |

---

## 二、核心结论摘要（v1.2.3 冻结终版口径）

### 1. R3 当前最应该先解决的三个问题
1. **以严格样本分离与实证对照破解审稿“发现 vs 克制”跷跷板与 `OR6` 漂白漏洞**：在 `precheck v2`（`NEEDS_SEMANTIC_AUDIT`）、6 维最小取证槽与 `PLANNING_CONFLICT_BLOCK` 共同底座上，P0-6 执行 **A vs B vs C** 三方案离线对照；G2 严格拆分 **`G2-A Regression/Calibration`**（`9 章 / 33 案例` 回归稳定性检查）与 **`G2-B Independent Holdout`**（`>=20` 全新未见独立章 / `>=60` 案例 / 单章 `<=3` / `>=3` 题材 / `K=3` / `0` 章节重叠），两组分别报告原始 `TP/FP/FN/TN`、Precision、FPR 与章节级聚类 Bootstrap 95% CI，**历史校准通过不等于独立泛化通过**；当前 `G2-B` 如实标记为 **`underpowered`**（就绪 `0` 章 / 缺口 `+20 章、+60 案例`），绝不降门槛或混算凑数。
2. **彻底隔离创作层与治理层语域（写手语域防火墙）与 L0 真实操作系统只读边界**：写手上下文零 SHA/JSON/门禁码/`reverseDefense`/限时压迫词；L0 监测层（`diagnose_book.mjs` 与 `audit_story_state.mjs --readonly` 分别独立验收）实施“全量静态审计 + 只读挂载环境实际运行（**首选 `mount -o ro,bind` 或 Docker `:ro` 卷挂载给被测进程直接执行；回退 `chmod -R a-w` 时严格区分权限准备阶段与被测程序运行阶段，设权后必须以独立非特权、非文件所有者 UID 执行，测试临时路径外置**）+ **宿主机侧对同一个底层项目目录计算运行前后 Manifest/SHA-256 比对（严禁用另一份可写副本替代；可写副本仅作辅助测试）**”三重验证，任一项未通过即零写入不成立。
3. **将“含必要返工与复审在内的 5 分钟目标”确立为独立持续性能轨道（`Perf-Track`），与可选 L4（`P2-OptIn`）彻底解耦**：
   - 分开建立混合 **Mean**（全期望公式，热复用理论敏感度 `~12.9m` [`10.9–15.0m`]）与混合 **P50**（须解 $F_{\text{mix}}(t)=0.5$，缺乏情景内经验分布前不插值编造理论 P50）；
   - P1 稳定后拆分为两条独立轨道：**轨道 A · `Perf-Track`（`S1 → S2 → S3`，独立持续系统优化，绝不因 L4 可选而被降级为可做可不做，全程按含必要返工与复审的全样本实测 Mean 与经验 P50 评估，无实跑绝不宣称达成）** vs **轨道 B · `P2-OptIn`（L4 完本终审与定向精修，由作者按需决定）**。

### 2. 分阶段路线总览（P0 → P1 → P1 后双轨分立 → 明确不做）
- **立即补齐（P0）**：S1 四级枚举兼容与 `ENG-FIX-P1`、写手语域防火墙、`precheck v2`（仅文件破损与作者显式硬约束阻断 + `NEEDS_SEMANTIC_AUDIT`）、复合审读指纹 + Fail-Closed + 修空增版本 Bug、三方案审稿原型（A/B/C）+ `PLANNING_CONFLICT_BLOCK` 及其 **P0-6 离线对照（`G2-A` 与 `G2-B` 严格分轨统计，补齐 `G2-B` 独立样本过线前禁止宣布独立泛化通过并合入生产主干）**。
- **紧随其后（P1）**：L0 纯只读监测层（`diagnose_book.mjs` 9 维 `D1–D9` + `audit_story_state.mjs --readonly`，各自独立通过含权限边界约束的三重零写入验证）、三元组跨轮继承 + 改动映射 + 3 轮瓶颈诊断、统一 CLI `r3_ops.mjs`（唯一允许承接诊断缓存落盘 + 增量账本合并收尾）、`analyze_impact.mjs` + 显式 `retcon`、L2（每 5 章只读核查 + `FACT_CONFLICT_CANDIDATE` 临时安全门与 `STALE_REVIEW_AFTER_EDIT` 工程硬阻断严格分轨）与 L3 卷审工作流、跨 Harness 适配层分离。
- **P1 稳定后 · 轨道 A（`Perf-Track`，独立系统性能轨道，持续推进、非可选）**：`S1`（P0+P1 止血）→ `S2`（`PERF-S2`：M-D/M-E/M-F 受控实验、`risk_tiered` 与 10–26 章跨卷全口径实测）→ `S3`（`PERF-S3`：协同低延迟模型演进，在 Track L 与零漏检护栏下冲刺含必要返工与复审的全样本实测 Mean 与经验 P50 `<= 5.0 min`）。
- **P1 稳定后 · 轨道 B（`P2-OptIn`，可选产品功能轨道，作者按需开启）**：`P2-1`（全书金字塔四层只读索引）→ `P2-2`（L4 完本全书终审与定向精修工作流），不影响 P0/P1 核心审核与 `Perf-Track`。
- **明确不做**：每章强制独立润色/沉淀子代理、`MINOR/SUGGESTION` 强制人工处置、修完不复审、重型向量库主路径、总分扣分制、P0/P1 本地 Web 书房服务器、把 5 分钟变成写手限时或为字数牺牲内容完整性。

### 3. 文学验收无空白三带裁决摘要（详见 `08`）
多评委（≥2 独立冷启动评委 + 绝对一致性 `ICC(A,1)`/`ICC(2,1)` 主指标 + Spearman $\rho$ 辅指标 + 分差 `>=1.5` 触发第 3 仲裁评委）匿名盲评综合均分差 $\Delta S = \bar{S}_{\text{v3}} - \bar{S}_{\text{baseline}}$：
- **$\Delta S \ge -0.20$** → ✅ **PASS**；
- **$-0.30 \le \Delta S < -0.20$** → ⚠️ **CONDITIONAL / HOLD**（强制低分归因复核，若属机制性缺陷则回退，否则必须扩样 `+3` 章重评，合并后仍 `< -0.20` 强制回退）；
- **$\Delta S < -0.30$** → ❌ **FAIL / IMMEDIATE ROLLBACK**。
