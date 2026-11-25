# R3 审核体系 v3 架构重设计方案交付包（PRD 冻结候选版）

> **文档版本**：`v1.2.1 (Freeze-Ready Candidate)`  
> **修订状态**：已完成面向独立复审的 `v1.2.1` 定点闭环修订（P1 Mean/P50 混合情景模型严格分离、P2 `STALE_REVIEW_AFTER_EDIT` 与 `FACT_CONFLICT_CANDIDATE` 状态机物理分轨、P3 聚类统计独立章节数约束、P4 L0 绝对零写入三重验收），待独立复审与最终冻结批准（**仍属架构设计阶段，未批准进入代码实施**）  
> **交付日期**：2026-11-25  
> **目标仓库与基线（现场实时核验）**：
> - **仓库**：`chindden/chinese-novelist-skill`
> - **GitHub 远端 R3 主开发分支（PR 目标分支）**：`feat/r3-migration` @ **`b32e92891d89945baed9a0707e90fbc3572afd20`**（短 SHA `b32e928`）
> - **本地 Phase 1 吞吐实验分支（O1–O3 脚本与遥测来源，未合入 `feat/r3-migration`）**：`feat/r3-phase1-throughput-o1-o3` @ **`c0966b1`**（领先 3 个提交，自动化测试 Node `89/89` + Python `12/12` 全绿；仅证工程契约，不等同文学质量提升）
> - **文档交付分支与 PR**：`docs/r3-review-v3-architecture`（基于 `feat/r3-migration` @ `b32e928` 新建，PR #3，仅包含 `docs/r3/review-v3/` 下正式交付文档，零代码/Skill/R2/实验基线修改）
> - **外部对标基线**：① `lingfengQAQ/webnovel-writer` `v8` 分支（DSH Scriptor `8.4.2` @ `7396ee3`）；② `PenglongHuang/chinese-novelist-skill`（`master` @ `2026-11-24`）

---

## 一、完整文件清单与阅读顺序

本目录（`docs/r3/review-v3/`）以 10 份独立 Markdown 为正式源文件，并同步提供由该 10 份源文件打包校验生成的 `r3-review-v3-architecture-package.zip`（内容与源文件逐字节一致）：

| 序号 | 文件名 | 核心内容 | 上游依赖 |
|---:|---|---|---|
| 0a | `README.md`（本文件） | 交付包版本状态、实时基线记录、完整清单、阅读顺序与核心裁决摘要 | 汇总 01–08 |
| 0b | `CHANGELOG.md` | `v1.0 → v1.1 → v1.2 → v1.2.1` 完整修订追踪记录 | — |
| 1 | `01-R3当前审核能力真实实现审计.md` | 仓库双基线核验、15 项能力六态审计、统一 Mean/P50/P90 口径的 `17–22m`（历史重建，含阶段重叠）vs `24–31m`（实时日志，严格互斥）核对与五大症结 | 无（事实基线） |
| 2 | `02-三方差异矩阵.md` | R3 × `webnovel-writer v8` × `chinese-novelist-skill` 13 项全生命周期能力对比、裁决与 7 项“明确不做”红线 | 01 |
| 3 | `03-R3审核体系v3总体架构设计.md` | L0 纯只读监测层 + L1–L4 四层文学审核总图、A/B/C 三方案审稿对照设计、写手语域防火墙、**Mean（全期望）与 P50（混合 CDF）严格分离的时间账本、初稿差距归因、6 种不可简单相加替代架构与含必要返工/复审的 5 分钟全口径理论下限**、跨 Harness 分层与 4 条独立反对意见 | 01, 02 |
| 4 | `04-四层审核生命周期与状态流转图.md` | L0 纯只读监测贯穿 + L1–L4 四层流转图、**四类异常分流（彻底分离 `FACT_CONFLICT_CANDIDATE` 临时安全门与 `STALE_REVIEW_AFTER_EDIT` 工程完整性硬阻断）**、L0 三重零写入隔离、**L3 正常卷审与修复/复审两笔账分算** | 02, 03 |
| 5 | `05-全书机械诊断引擎PRD.md` | L0 贯穿纯只读监测层（`diagnose_book.mjs` + `audit_story_state.mjs --readonly`，**9 大维度 `D1–D9`**，**全量静态审计 + 只读文件系统/沙箱实测 + 全目录 Manifest 哈希比对三重零写入验收**，`r3_ops.mjs` 唯一承接缓存，非第五道审核关卡）、防误判铁律与两类阻断态物理分离 | 01, 02, 04 |
| 6 | `06-审核修复复审及版本失效协议.md` | `precheck v2` 作者显式硬约束阻断准入、统一 `PrecheckV2` / `Pass1DiscoveryReport` / `FinalCalibrationReport` 契约、复合指纹、Fail-Closed、S1 四级枚举与 `PLANNING_CONFLICT_BLOCK`、**`FACT_CONFLICT_CANDIDATE` 与 `STALE_REVIEW_AFTER_EDIT` 状态机与恢复条件分轨**、三元组继承、改动映射、3 轮瓶颈诊断、三轨复审与 `retcon` | 03, 04, 05 |
| 7 | `07-P0-P1-P2开发任务与依赖关系.md` | 分阶段开发任务详表与依赖 DAG（含 P0-5/P0-6 三方案对照与显式 `$N_{\text{ch}}/N_{\text{case}}/K_{\text{rep}}$` 约束、P1-1 L0 三重零写入诊断、P1-3 唯一缓存落盘与收尾、P1-5 L2/L3 分轨、P2-3 5 分钟全口径北极星实验）及不做清单 | 03, 04, 05, 06 |
| 8 | `08-工程效率与文学质量双重验收方案.md` | Track E（E3 两类门禁分轨测试、E4 扩大化静态审计+只读沙箱+Manifest 哈希三重验证、理论 Mean 与实跑经验 P50 上限区分）× Track L（A/B/C 裁决、**G1/G2/G3/G6 显式 `$N_{\text{ch}}/N_{\text{case}}/K_{\text{rep}}$` 与章节级聚类 Bootstrap 95% CI**、G2 `>=20` 独立章设计、2,000 次 Bootstrap 不弥补章数不足声明、G6 有限预算工程准入筛查定位、Precision 不外推生产、四级加权 Kappa $\kappa_w$、绝对一致性 ICC、**文学评分无空白三带裁决**） | 01, 03, 05, 06, 07 |

---

## 二、核心结论摘要（v1.2.1 冻结候选口径）

### 1. R3 当前最应该先解决的三个问题
1. **以实证对照破解审稿“发现 vs 克制”跷跷板与 `OR6` 漂白漏洞**：在 `precheck v2`（`NEEDS_SEMANTIC_AUDIT`）、6 维最小取证槽与 `PLANNING_CONFLICT_BLOCK` 共同底座上，P0-6 执行 **A（单阶段完整）vs B（Pass 1 发现 + Pass 2 定级）vs C（单阶段 + 独立轻量定级）** 三方案离线对照，**不预设双阶段必胜**，由显式约束独立章节数并采用章节级聚类 Bootstrap 95% CI 的 G1–G6 准入体系裁决胜出架构。
2. **彻底隔离创作层与治理层语域（写手语域防火墙）**：写手上下文零 SHA/JSON/门禁码/`reverseDefense`/限时压迫词，动笔前最后读段强制为“上章结尾 + 文风示范”，返工仅投喂纯叙事修订卡 + `preserveStrengths`，从源头治本报告腔与防杠说明书补丁。
3. **建立数学严谨的时间账本，务实推进“含必要返工与复审在内的 5 分钟”全口径系统目标**：分开建立混合 **Mean**（全期望公式，热复用理论敏感度 `~12.9m` [`10.9–15.0m`]）与混合 **P50**（须解 $F_{\text{mix}}(t)=0.5$，缺乏情景内经验分布前**不凭权重与区间插值编造理论 P50**，且一次通过率 50% 不等于可直接推算 P50）；P0+P1 实跑经验验收红线设于热复用 **经验 Mean `<= 14.5m` / 经验 P50 `<= 13.5m`**（全冷 **经验 Mean `<= 18.0m` / 经验 P50 `<= 16.5m`**），再通过 P2 替代架构受控实验与模型延迟演进向全样本（含必要返工与复审）`<= 5.0m` 收敛。

### 2. 立即补齐（P0）vs 紧随其后（P1）vs 暂缓（P2）vs 明确不做
- **立即补齐（P0）**：S1 四级枚举兼容与 `ENG-FIX-P1`、写手语域防火墙、`precheck v2`（仅文件破损与作者显式硬约束阻断 + `NEEDS_SEMANTIC_AUDIT`）、复合审读指纹 + Fail-Closed + 修空增版本 Bug、三方案审稿原型（A/B/C）+ `PLANNING_CONFLICT_BLOCK` 及其 **P0-6 聚类统计离线对照（过 G1–G6 才准入主仓）**。
- **紧随其后（P1）**：L0 纯只读监测层（`diagnose_book.mjs` 9 维 `D1–D9` + `audit_story_state.mjs --readonly`，分别通过全量静态审计 + 只读沙箱 + Manifest 哈希三重验证）、三元组跨轮继承 + 改动映射 + 3 轮瓶颈诊断、统一 CLI `r3_ops.mjs`（唯一允许承接诊断缓存落盘 + 增量账本合并收尾）、`analyze_impact.mjs` + 显式 `retcon`、L2（每 5 章只读核查 + `FACT_CONFLICT_CANDIDATE` 临时安全门与 `STALE_REVIEW_AFTER_EDIT` 工程硬阻断严格分轨）与 L3 卷审工作流、跨 Harness 适配层分离。
- **暂缓（P2）**：L4 完本全书终审与定向精修（可选成书模式）、5 分钟全口径北极星架构冲刺实验（M-D/M-E/M-F、`risk_tiered`、10–26 章跨卷验证）。
- **明确不做**：每章强制独立润色/沉淀子代理、`MINOR/SUGGESTION` 强制人工处置、修完不复审、重型向量库主路径、总分扣分制、P0/P1 本地 Web 书房服务器、把 5 分钟变成写手限时或为字数牺牲内容完整性。

### 3. 文学验收无空白三带裁决摘要（详见 `08`）
多评委（≥2 独立冷启动评委 + 绝对一致性 `ICC(A,1)`/`ICC(2,1)` 主指标 + Spearman $\rho$ 辅指标 + 分差 `>=1.5` 触发第 3 仲裁评委）匿名盲评综合均分差 $\Delta S = \bar{S}_{\text{v3}} - \bar{S}_{\text{baseline}}$：
- **$\Delta S \ge -0.20$** → ✅ **PASS**；
- **$-0.30 \le \Delta S < -0.20$** → ⚠️ **CONDITIONAL / HOLD**（强制低分归因复核，若属机制性缺陷则回退，否则必须扩样 `+3` 章重评，合并后仍 `< -0.20` 强制回退）；
- **$\Delta S < -0.30$** → ❌ **FAIL / IMMEDIATE ROLLBACK**。
