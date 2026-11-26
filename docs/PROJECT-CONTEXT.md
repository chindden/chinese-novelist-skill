# Chinese Novelist Skill — Project Context

> **版本**：`1.3`（全局 Agent 协作架构升级版） ｜ **范围**：`chindden/chinese-novelist-skill` 全仓库长期项目上下文与协作架构档案（覆盖原始 Skill → R2 → R3 → 未来 R4，不属于单一专项）  
> **唯一双入口**：[`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)（跨 Agent 协作规则、角色职责与权限边界） ＋ [`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)（本文：全局项目背景、长期原则、协作架构与权威入口）  
> **GitHub 动态协作入口**：[GitHub Issues（任务记录权威）](https://github.com/chindden/chinese-novelist-skill/issues) ｜ [Project #4 · Chinese Novelist Skill R3（全生命周期唯一工程看板）](https://github.com/users/chindden/projects/4) ｜ [Pull Requests（变更与审查证据）](https://github.com/chindden/chinese-novelist-skill/pulls)  
> **配套规范档案**：[`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md)（按需保全与公私资产边界） ｜ [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)（关键资产分级索引）  
> **角色定位**：全仓库历史背景、核心决策、创作理念、正式协作架构与权威信息入口。**不承担日常任务动态进度维护，不取代专项 PRD，不复制每次 Commit 与测试流水账。**

---

## Quick Start · 跨会话快速恢复入口

任何新 Agent / 新会话接管项目，均不得依赖历史聊天记录或个人记忆：

1. **先读唯一双入口**：通读 [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md) 与本文 [`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)；具体接管原则、角色隔离红线与 `GO` / `NO-GO` 判定规则以 [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md) 为准（本文不重复展开操作清单）。
2. **查询 GitHub 实时动态状态**：通过 [Project #4](https://github.com/users/chindden/projects/4) 了解整体任务状态，进入对应 [GitHub Issues](https://github.com/chindden/chinese-novelist-skill/issues) 阅读任务沟通、执行反馈与审核记录，需要核实变更时再追溯 [Pull Requests](https://github.com/chindden/chinese-novelist-skill/pulls) / Commit 与本地工作区。
3. **按当前活跃任务查阅专项文档**：仅在识别出当前活跃任务后，按需阅读对应专项 PRD、冻结架构（[`docs/r3/review-v3/`](./r3/review-v3/README.md)）、专项 Progress Log 与资产规范（[`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md)、[`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)）。

> **防重复劳动铁律**：严禁无必要地重新研究已冻结的 `v1.2.3` 审核架构，严禁回到全量历史资产考古，严禁根据静态历史快照猜测当前活跃任务，严禁要求作者重复交代仓库已记录的历史背景与原则。

---

## 正式采用的全局 Agent 协作架构（`DEC-12` · `CONFIRMED`）

本项目正式采用**「唯一双入口 ＋ GitHub 动态状态外置 ＋ 按职责划分权威边界」**作为长期跨 Agent 协作架构。

### 1. 原则一：唯一入口
- 任何新 Agent 接管项目，必须首先读取 [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md) 与 [`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)，不得依赖历史聊天记录、个人记忆或单次会话上下文。

### 2. 原则二：动态状态外置（GitHub 三组件权威职责）

| GitHub 组件 | 直接入口 | 权威职责与实际配置 | 使用纪律与红线 |
|---|---|---|---|
| **GitHub Issues** | [`chindden/chinese-novelist-skill/issues`](https://github.com/chindden/chinese-novelist-skill/issues) | **任务记录权威**：一独立任务一 Issue，记录任务目标与范围、前置依赖与验收条件、沟通上下文、重要进展与决策、优先级说明、阻塞原因、研发实施报告、审核审查意见、整改记录与最终验收结论 | 重要进展与沟通直接留痕于对应 Issue；**Issue 是否已行政关闭以 GitHub 实时状态为准，不得将验收通过与 Issue 行政关闭混为一谈** |
| **GitHub Projects（Project #4）** | [`Chinese Novelist Skill R3`](https://github.com/users/chindden/projects/4) | **全生命周期唯一、长期沿用的统一工程看板**：覆盖原始 Skill、R2、R3 以及未来所有 P1、P2、R4 和后续阶段；**不因版本、阶段或任务类型变化而另建 Project**，P1/P2/R4 等后续工作继续纳入 Project #4；**当前显示名称含有“R3”不代表看板范围仅限 R3**。<br>按当前配置，Project #4 负责统一任务展示与 `Status` 状态推进（现有五态：`Backlog` / `Todo` / `In Progress` / `In review` / `Done`）；具体优先级说明与阻塞原因记录在对应 Issue 中 | 统一的状态展示面板，不再在全局 Context 中重复维护一套进度表；**状态同步以 Issue 记录为依据，发现 Issue 与 Project 不一致时必须核对修复（或报告作者），严禁猜测** |
| **PR / Commit** | [`chindden/chinese-novelist-skill/pulls`](https://github.com/chindden/chinese-novelist-skill/pulls) | **变更与审查证据**：Commit 记录实际修改内容与历史；PR 汇总变更范围、Diff、测试结果与审查过程；Issue 关联对应 PR、Commit 与审核结论 | 严禁仅凭口头报告认定任务完成；**代码合并、测试通过均不得自动等同于 GPT-6 正式 `ACCEPTED`** |

### 3. 原则三：按职责范围划分权威边界（全局协作规范优先于局部改动）

| 文档 / 载体 | 所属权威职责范围 |
|---|---|
| [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md) | 跨 Agent 协作规则、角色职责、权限边界、Writer/Reviewer 隔离约束与接管判定规范（*不记录动态进度*） |
| [`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)（本文） | 全仓库长期项目背景、创作理念、长期原则、正式协作架构、里程碑基线与权威信息入口（*不重复维护日常任务进度*） |
| 冻结架构文档（如 [`docs/r3/review-v3/`](./r3/review-v3/README.md)）与各专项 PRD（如 [`docs/r3/p0-implementation/P0-Implementation-PRD.md`](./r3/p0-implementation/P0-Implementation-PRD.md)） | 各自所属技术范围内的权威技术规范、架构约束、实施步骤与验收标准 |
| 各专项 Progress Log（如 [`docs/r3/p0-implementation/P0-Progress-Log.md`](./r3/p0-implementation/P0-Progress-Log.md)） | 专项实施过程细节、返工台账与历史证据记录（动态任务权威仍在 GitHub Issues） |

> **职责边界与冲突处置红线**：局部 PRD 和 Progress Log **不得**自行改变全局 Agent 协作协议、权限分配、审批制度与信息权威性；全局入口文档亦**不覆盖**各冻结架构或专项 PRD 在其技术范围内的具体规范。如发现任何规范冲突，必须立即停止相关操作并向作者报告，严禁自行选择性执行。

### 4. 其他仓库基础文件导航
| 文件 / 目录 | 职责边界 |
|---|---|
| 根目录 [`README.md`](../README.md) | 仓库总入口、安装/许可/来源与导航 |
| [`README_V3.md`](../README_V3.md) | V3 / R2 / R3 使用说明、命令与测试入口 |
| [`ROADMAP.md`](../ROADMAP.md) | 上游继承与项目整体演进路线 |
| [`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md) | 全仓库研发资产按需保全规范、公私边界（测试小说 `REVIEW` vs 正式个人小说）与四级分级 |
| [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md) | 全仓库关键资产四级索引（聚焦主流程必需与关键证据，不追全量历史收录） |
| [`docs/R3-PRD.md`](./R3-PRD.md) | R3 早期至迁移、知识库导入、P1-08 与 LIT 重构的历史主 PRD 台账 |
| [`docs/r3/p0-implementation/README.md`](./r3/p0-implementation/README.md) | P0 专项实施管理目录导航与总览 |

---

## 决策与证据状态体系（全仓库强制遵循）

### 1. 六级结论状态标记
| 状态 | 含义 |
|---|---|
| `CONFIRMED` | 作者或治理流程已明确确认的原则、范围或决定 |
| `VERIFIED` | 存在可复查的实际运行日志、Commit、CI、文件哈希或独立审计证据 |
| `REJECTED` | 经实证或作者决策已明确否决的方案/路径 |
| `PENDING_VALIDATION` | 已提出或已设计/编码，但尚待真实运行或统计/盲评验证 |
| `PENDING_AUTHOR_DECISION` | 需作者拍板授权方可推进或变更方向 |
| `UNKNOWN` | 原始资料缺失或未入仓，当前无法确认（严禁臆测补全） |

### 2. 六层验证阶梯（严禁互相替代！）
1. **架构设计完成** ≠ 代码已经实现
2. **代码已经实现** ≠ 测试通过
3. **测试通过**（单元测试/契约/CI 全绿）≠ 实际运行验证
4. **实际运行验证**（沙箱/宿主跑通流程）≠ 工程可行性全面证明
5. **工程可行性得到证明** ≠ **文学质量提升得到证明**
6. **单次实验积极反馈** ≠ 跨题材普遍文学质量提升

> **历史决策不可静默覆盖**：任何既有决定发生变更，必须保留“原决定 → 变更原因 → 新决定 → 证据链接”。

---

## 一、项目整体历史（全仓库视角）

> **核心定位（`CONFIRMED`）**：本项目绝不仅仅是“审核系统升级”，而是面向中文长篇网络小说的完整 AI 创作 Skill 体系研发，涵盖 **创作能力研发、文学质量验证、长期记忆与经验沉淀、多题材知识资产建设、审核与状态治理、工程吞吐效率优化** 六条并行主线。

### 1. 演进脉络（原始 Skill → R2 → R3 → 未来 R4）
1. **原始底座（`master` @ `d1fb0ca5`）[`VERIFIED`]**：源自 [PenglongHuang/chinese-novelist-skill](https://github.com/PenglongHuang/chinese-novelist-skill) `v2.3.2`（MIT），具备三层递进问答、文风基准、事实账本、去 AI 味规范、Phase 4 校验与 Node.js 字数/摘要/项目校验脚本。核心局限：缺乏真实上下文隔离的独立审稿与长篇防漂移门禁。
2. **V3 / R2 阶段（`feat/v3-editorial-pipeline` @ `1c59b269`；旧集合仓 `chindden/skills` R2 分支）[`VERIFIED`]**：围绕“从能写完到可信连载”引入创意竞标、Stage 2 原生整文件蓝图双独审、前三章 Pilot 强制停审、独立编辑单章/三章弧审（`r2_review.mjs`）与 Python ZIP 完整快照备份。暴露的新矛盾：整文件刚性冻结限制远期演化、审稿过严导致返工与正文说明书化、缺乏跨书经验沉淀。
3. **R3 启动与独立仓库迁移（`feat/r3-migration`）[`VERIFIED`]**：
   - **启动动因（`CONFIRMED`）**：核心目标从“能够完成小说”升级为**“持续创作让读者愿意追读的长篇中文网文”**，确立 **“两级冻结（核心契约 + 卷级滚动检查点）· 滚动双环 · 完本精修”** 架构；
   - **早期研发与迁移（2026-11-24）[`VERIFIED`]**：在旧集合仓完成 R3 早期 P0（9/9 + 补漏 2/2）、P1（8/8 工程验收 + `P1-08` 离线校验与历史宿主测试）及《仙门大掌柜》1–12 章连载实验后，于提交 `f7b65e6` / `07b60a9` 正式迁回独立仓库 `chindden/chinese-novelist-skill` 作为唯一研发权威源；
   - **许可与知识资产扩容（2026-11-24）[`VERIFIED`]**：独立提交调整本集成开发版为 GPL-3.0（完整保留原 MIT 文本于 [`LICENSES/MIT-upstream.txt`](../LICENSES/MIT-upstream.txt) 与 [`NOTICE.md`](../NOTICE.md)），导入固定版本 `chindden/webnovel-writer@04e485d` 知识原件（115 份参考/模板、8 套 CSV 722 条 + 17 条裁决、37 套题材模板）并补齐 11 套缺失专项模板、12 套流派机制与 12 类专题只读 BM25 路由，落地自然语言互动共创（`INIT-01/02`、`PLAN-01/02`）与 LIT 故事性优先重构（提交 `7bd3b20`、`b32e928`）。
4. **实测暴露的文学与效率瓶颈 → 审核体系 v3 重设计（2026-11-24 至 11-25）[`VERIFIED`]**：
   - 零干预实测与 M1–M4 / Phase 1 吞吐实验暴露出 **57.4% `MAJOR` 过度定级**、返工引发防杠说明书补丁、单章端到端耗时 `17–22m` / `24–31m` 等症结；审稿 Prompt 离线校准至 `v2.2` 触发预设停止条件（FPR `15.15% > 15.0%` + 跨题材漏检 + `OR6` 漂白）；
   - 经深度对标外部双项目全生命周期机制，完成 R3 审核体系 v3 架构重设计（`v1.2.3`）并经 PR #3 合入 `feat/r3-migration`（`b5572a94`），随后在 `feat/r3-p0-controlled` 建立 P0 受控研发管理 PRD（`v1.0.1` 获 GPT-6 验收）。
5. **基线审计验收与全局协作架构落地（2026-11-26）[`VERIFIED`]**：
   - `PROJECT-CONTEXT` 与 `AGENT-HANDOFF` `v1.2` 于 `2d6061d6` 获 GPT-6 `ACCEPTED` 后，完成纯只读 **`P0-0` 研发基线审计与实施准备**，并已获 GPT-6 正式验收 **[`ACCEPTED`](https://github.com/chindden/chinese-novelist-skill/issues/4#issuecomment-7184975761)**（验收基线 `2b51cc262db9fb9cd9b030977b418f362b9fb002`）；
   - 随后正式确立并落地 **GitHub 动态协作架构（`DEC-12`：`v1.3`）**；后续 R3 `P0-1`～`P0-6` → P1 / `Perf-Track` / `P2-OptIn` → 未来 R4 的实时任务状态、进展与授权均以 GitHub Issues 与 [Project #4](https://github.com/users/chindden/projects/4) 实时信息及作者明确授权为准。

### 2. 当前仓库主要目录与资产结构（`VERIFIED`：严格区分各提交引入时点）
- `SKILL.md`：统一自然语言单入口路由规范（已存在于 `e52105ad`）。
- `references/v3/`：R2/R3 工作流、共创、互动规划、分区协议、运行手册、P1 协议、工艺红队与审稿模板（16 份，已存在于 `e52105ad`）。
- `references/flows/` & `references/guides/`：继承自原版的分阶段流程清单与写作指导（已存在于 `e52105ad`）。
- `references/webnovel/`：统一网文知识库（原 8 份自主 Markdown + `upstream/` 115 份 GPL 原件 + `supplement/` 自主补充层 + 覆盖矩阵与研究审计，已存在于 `e52105ad`）。
- `scripts/` & `scripts/tests/` & `tests/`：Node.js ESM 工程门禁/账本/规划/审稿/经验库脚本、Python 快照与知识库 BM25 检索脚本及回归测试套件（已存在于 `e52105ad`）。
- `docs/`：
  - 已存在于 `e52105ad`：历史台账 `docs/R3-PRD.md`、冻结审核架构 `docs/r3/review-v3/`、P0 专项管理 `docs/r3/p0-implementation/`；
  - 新增于 `15245e78`：全仓库长期上下文 `docs/PROJECT-CONTEXT.md`；
  - 新增于 `bb01bbd0`：关键资产索引 [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)；
  - 新增于 `e9c9befc`：研发资产管理规范 [`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md)；
  - 新增于 `44fc2591`（结构精简于 `aa12bd34`）：新 Agent 长期接管协议 [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)。

---

## 二、小说创作理念与作者长期原则（`CONFIRMED` · 长期不可违背）

1. **文学质量和内容完整性优先**：一切工程流程、字数参考与审稿机制均服务于写出一本好小说，而非产出“形式无瑕但枯燥的审稿合格文本”。
2. **不为了死磕字数牺牲内容**：单章字数仅作参考或可选软上限；严禁为了凑下限注水，更严禁为了压上限砍掉精彩情节、人物互动或完整场景。
3. **不把机械指标当作文学质量的替代品**：字数、段落重复、引号统计、对话占比、测试通过数与哈希校验均不等于文学质量（机械诊断恒标 `literaryStatus: UNVERIFIED`）。
4. **不接受没有实际价值的反复改写**：非阻断微瑕（`MINOR` / `SUGGESTION`）不得强迫反复全章重写；避免“越改越像防杠说明书”。
5. **创作自由与故事连贯性兼顾**：核心承诺、人物底色与已确立硬因果保持稳定；尚未发生的远期剧情允许滚动演化与自然长出火花。
6. **审稿不能过严，不能将主观文学偏好随意升级为阻断条件**：必须严格区分客观逻辑/物理/设定硬伤与主观润色偏好。
7. **能够完成小说不等于小说值得追读**：开篇吸引力、人物活人感、情绪张力、承诺兑现与持续追读意愿才是最终检验标准。
8. **作者对 `Step 3 · 《器痕录》前三章（Step3 Qihenlu Manuscript Ch1–3）` 的实测反馈记录（`CONFIRMED`）**：
   - 作者明确评价：**“整体质量不错，字数控制不要苛求，不能为了死磕字数牺牲内容完整性。”**
   - **证据定性边界**：此条记录属于**真实创作试跑的作者反馈与产品原则重申**，**不是**经过大样本盲评证实的“普遍文学质量提升结论”（`PENDING_VALIDATION`）。

---

## 三、独立实验与文学质量证据总账

> **铁律**：保留关键结论与证据局限，绝不把单次实验的积极结果外推为普遍文学质量提升。**公私与按需原则（`DEC-11`）**：研发测试小说、实验正文、审稿记录与评估数据原则上属公开研发资产（测试小说许可证状态为 `REVIEW`，不擅自选定许可证），但按当前任务实际依赖按需保全、不强行倒灌历史废弃稿；作者**正式个人创作阶段的小说及其草稿、设定与修改记录**属私人资产，严禁提交公开仓库。

| 实验体系 / 样本 | 目的 | 核心输入与输出 | 原始证据位置 | 核心实测结论（分级） | 证据局限与未解决问题 |
|---|---|---|---|---|---|
| **1. 早期 Gemini R3 试跑与《仙门大掌柜》Ch 1–12**（2026-11-24） | 验证 R3 两级冻结、Pilot 停审、P1 反馈/账本绑定与长篇连载流程 | 测试连载项目《仙门大掌柜》Ch 1–3 Pilot（11,510 字）及续写 Ch 4–12（9 章审稿+3 次弧审）；历史实验包（测试小说许可 `REVIEW`，按需留存原位） | [`docs/R3-PRD.md`](./R3-PRD.md)（216–380 行）；Drive 历史实验快照（Tier 3 参考） | `VERIFIED`：P0/P1 工程门禁与逐章独审跑通（Ch 3 真实时间线硬伤被拦截），ChatGPT 非盲评 Ch 1–3 约 7.9/10；暴露 `P0-F01/F02`、`P1-F01`、`SK-01~04` 及引文语义偏弱 | 无同条件 R2 正文对照与陌生读者盲评；卷末（Ch 22）与跨卷（Ch 23–26）及跨会话项目恢复仍 `PENDING_VALIDATION` |
| **2. 零干预双题材 Live Eval：《残器长生》vs《降本增笑》**（2026-11-24） | 评估 `feat/r3-migration`（`b32e928`）真实零干预端到端创作能力与文病 | 同宿主 `novelist_eval_agent` 跑仙侠 R3（《残器长生》3 章 12,749 字，17 次审稿，~95m）与职场默认（《降本增笑》3 章 20,098 字，19 次审稿，~96m） | 会话 Artifact `skill-live-eval-report.md`（Tier 3 历史参考） | `VERIFIED`：拉高写作上下限（职场 8.6/10 活人感强、仙侠 7.8/10 逻辑硬），但明确暴露四大痛点：审稿返工说明书化/括号补丁、仙侠前三章零阶段兑现、文风基准确立不闭环、单章字数飙至 7,584 字 | 单次双案例观测，无多评委匿名盲评；知识库 ID 在成稿规划中 0 显式命中 |
| **3. M1–M4 文学专项优化体系（Step 1 / Step 2 / Step 3）**（2026-11-24） | 针对上述 4 痛点做 M1（反说明书化）、M2（前三章回报）、M3（双节奏 H3 示范+Ch1 回填）、M4（可选非阻断字数软上限） | 本地分支 `feat/r3-m1-m4-craft-refinement`（`0bf1798`→`c45d4c6`，未合并）：Step 1 工程改造（12 文件）；Step 2 《残器长生》Ch 3 零泄漏定点返工重放；Step 3 《器痕录》全新对照试跑（Ch 1–3 共 13,460 字，23 次全冷独审，174.8m） | 本地分支 `c45d4c6`；VM Artifact `step1..3` 报告与测试稿（Tier 3 历史参考，测试小说许可 `REVIEW`） | `VERIFIED`：Step 2 验证 M1 编辑端可拦截括号/免责旁白，Ch 3 终稿括号清零；Step 3 《器痕录》作者反馈“整体质量不错，字数不要苛求”，M3/M4 全部落盘闭环；但单章耗时仍 17–22m 且审稿返工重 | 缺少子代理原始 `transcript.jsonl`（早期读档顺序标 `UNKNOWN`，不追查恢复）；不可外推普遍文学提升 |
| **4. Phase 1 吞吐实验与独立三路盲审（Blind Audit A/B/C）**（2026-11-25） | 测量 O1（热复用+30% 熔断）、O2（简报+预检）、O3（原子流水线+遥测）对耗时、漏检与文学质量的影响 | 本地分支 `feat/r3-phase1-throughput-o1-o3`（`c0966b1`，未合并）；《器痕录》冻结规划下 Arm 0/1/2 × 3 章 = 9 章终稿 + 9 位冷启动盲审代理（Blind A 红队漏检 / B 文学盲评 / C 47 项首审 MAJOR 尺度校准） | 核心结论已固化入 [`docs/r3/review-v3/01`](r3/review-v3/01-R3当前审核能力真实实现审计.md)；本地分支 `c0966b1` 已在 `P0-0` 完成只读差异审计并维持不合并决定 | `VERIFIED`：① **57.4%（27/47）首审 `MAJOR` 属过度定级**，直接撑爆修改面触发冷重置并诱发次生硬伤（如 `BX-03` 反派降智与 Ch 3 65 字说明书补丁）；② O3 稳定省 `5.58m/ch` 且文学无退化（Arm 0 `8.40` vs Arm 1 `8.33`）；③ O1 9 章内未见特有漏检恶化（`2 MAJOR` 平基线），但 Arm 2 文学均分预警（`7.80`） | 仅单题材 9 章小样本；O1 单热会话未跑满无重置 3 章闭环（长期安全 `PENDING_VALIDATION`）；O2 尚未证明降返工轮次 |
| **5. 审稿尺度校准离线实验（v1 → v2 → v2.1 → v2.2）**（2026-11-25） | 试图仅靠单轮 Prompt 精修同时压低 FPR 并保持高召回 | 73 项定案 Track 2 回归 + 7 章已知回归 + 4 故事线×3 题材跨题材 Holdout（全在沙箱执行，仓库零改动） | 核心结论已固化入 [`docs/r3/review-v3/01`](r3/review-v3/01-R3当前审核能力真实实现审计.md) & [`08`](r3/review-v3/08-工程效率与文学质量双重验收方案.md) | `VERIFIED` / `REJECTED`（继续单轮调参）：v2.2 触发预设停止条件（FPR `15.15% > 15.0%`、单轮全能 Prompt 陷入 Recall vs FPR 跷跷板、跨题材深层漏检与 `OR6` 漂白大纲死锁），直接催生审核体系 v3 重设计 | 历史 Holdout（`NH-1..5`、`V22-H1..4`）已揭盲退役，不得再充当独立 Holdout |

---

## 四、长期记忆与经验沉淀机制

### 1. 长期方向与设计原则（`CONFIRMED`）
每卷或每本小说完成后（Pilot 验收、每卷完结、全书完结及实质作者纠正等自然节点，**不逐章默认触发**），将经过原文证据检验的成功经验、创作技巧、失败案例与踩坑教训沉淀为**可召回、独立导出、可跨 Agent 迁移的持久化知识资产**：
- **支持跨 Agent 独立迁移**：采用开放 Markdown 主题文档 + 稳定 ID/版本索引 + 离线 ZIP 封存与独立恢复，零锁定单一厂商私有内存；
- **按题材、流派与创作阶段定向检索**：允许不采用、记录不适用条件/副作用与反例；
- **严防过度泛化**：明确保留经验来源、证据成熟度与适用边界，绝不将单本小说的偶然成功固化为普遍规则，绝不把经验库回写为故事权威事实；
- **严格区分模型记忆与外部持久化知识资产**：宿主原生 Memory 仅作为可选定位指针（不可用时静默降级、不阻断创作），绝不充当唯一真源；Notebook 因单载体无法可靠全文读写与导出已被**否决退出在线主架构**（`REJECTED`，仅保留 `ASSET-05` 条件性待验）。

### 2. `gemini-memory-literary-gain-exp.zip` 与 `P1-08` 实际核对现状
- **Gemini 原生记忆与文学增益实验（`gemini-memory-literary-gain-exp.zip`，Tier 3 历史参考；核对依据 [`docs/R3-PRD.md`](./R3-PRD.md) 250–258 行）[`VERIFIED`]**：
  - 主动记忆创建、语义召回 `6/6`、双虚构作品隔离 `6/6`、原地更新后新会话召回获小样本支持；后台自动记忆首次无工具测试 `0/3`（因存在检索活动不能据此否定机制）；
  - 6 篇成稿（3 场景 × A/B 对照）SHA-256 校验通过：三方描述性均分 A=`43.83` vs B=`47.50`（差 `+3.67`，满分 60），但明确标注**非统计学显著结论**（每场景仅 1 对样本、账号级自动记忆无法完全关闭、3 篇 B 稿均自发使用物件情感意象出现结构趋同风险）。
- **`P1-08` 历史实现与去 Drive 延期处理（[`scripts/r3_experience_drive.mjs`](../scripts/r3_experience_drive.mjs)、[`docs/R3-PRD.md`](./R3-PRD.md) 326–365 行）**：
  - **历史已验证（`VERIFIED`）**：原按 `DEC-02` 在 Google Drive 独立目录 `[CN-R3-EXP]` 验证了六主题聚合文档 + `00-INDEX-vN.md` + `archive/` 闭环，正式空库初始化完成（`themes=6, entries=0`）；源码审计确认 `scripts/r3_experience_drive.mjs` 为 **100% 离线确定性纯 Markdown 校验脚本**（零 Drive API 耦合）。
  - **现行处置（`DEC-11` · 不阻塞 P0）**：依据 `DEC-10`/`DEC-11`，Google Drive 不再承担研发资产权威存储，但**本轮不新建第二仓库、不提前改动 `P1-08` 代码或现有 Drive 空库**；待进入 P1 涉及跨作品经验库实跑时再按需重构存储层。
  - **尚未验证（`PENDING_VALIDATION`）**：真实长篇连载中的自然节点主动触发、跨多本小说真实文学增益与防结构趋同效果，以及单书长期资产 `ASSET-01` ~ `ASSET-05` 的跨会话完整闭环。

---

## 五、单章生产性能优化的历史背景

### 1. 作者核心判断与性能目标定义（`CONFIRMED`）
- **核心洞察**：写手本身写一章有多快受底层模型生成速率制约；但**审稿流程产生的工程摩擦、重复读档、工具碎步与过度定级引发的反复返工，会倍数放大整体端到端生产耗时**。
- **生产系统优化北极星目标（North Star，绝非写手限时指令）**：
  - 前提：单章约 `4,000` 字，构思、大纲、人物设定与故事状态已准备完毕；
  - 目标：从写手启动到最终审核通过，**端到端 `<= 5.0 分钟`**（包含初始化、上下文读取、正文生成、独立审稿、必要返工、复审、工具执行、收尾与系统等待）；
  - 分账口径：Core 规划、卷纲设计、Pilot 批量验收及 L3 卷审单独记账，并同时报告摊销成本；
  - 独立路线地位（`CONFIRMED`）：5 分钟优化目标属于**独立的系统级持续性能优化轨道（`Perf-Track: S1 → PERF-S2 → PERF-S3`）**，与可选功能 L4 完本终审（`P2-OptIn`）彻底解耦，绝不因 L4 可选而降级为可选。

### 2. 两个必须保留、严禁擅自合并的历史耗时口径（`VERIFIED` 口径差异，细粒度下限 `PENDING_VALIDATION`）
- **口径一：`17–22 分钟/章`**（Step 3《器痕录》3 章：`17.01–21.96m`，Mean `19.58m` / P50 `20.12m`，`[历史记录重建]`）：全冷启动，且 Ch 1/2 收尾耗时重叠并入下章 `draft` 槽，**与 Phase 1 不可直接横向比较**。
- **口径二：`24–31 分钟/章`**（Phase 1 实时互斥 5 阶段 JSONL 日志，9 章：`[真实运行日志]`）：Arm 0 Mean `31.43m` / P50 `32.03m`；Arm 1（+O3）Mean `25.85m` / P50 `26.97m`；Arm 2（+O3+O1）原始 Mean `24.27m` / P50 `29.09m`（扣宿主压缩停顿 Mean `23.15m`，全热 Ch 2 `14.54m`）。
- **严谨边界（`CONFIRMED`）**：两个历史口径因测量方法与阶段重叠差异**严禁擅自合并**，须待 P0+P1 真实受控全口径实跑进一步核实；当前串行架构下实测均未进入 5 分钟，5 分钟目标状态为 **`PENDING_VALIDATION`**（严禁在无实跑经验分布前插值伪造理论 P50，严禁拿“仅一次通过章”冒充达标）。

### 3. 不可妥协的质量底线（`CONFIRMED`）
- 不减少必要审稿，绝不以跳过复审或砍正文字数换取耗时下降；
- 真正的 `BLOCKER` / `MAJOR` 硬伤必须修复；
- 不把审稿标准无限收紧，避免制造虚高返工；
- 局部修改不得无理由触发整章冷重置甚至多章盲目复审（通过 diff 范围与影响面分析精准定界）。

---

## 六、外部 Skill 全生命周期研究（严禁将外部能力描述为 R3 已实现）

> **研究原则（`CONFIRMED`）**：作者明确要求从**单章审稿/修复/复审 → 卷级审核/修复/复审 → 完本后全书审核与精修**的完整生命周期对标，而非只看单章审稿。详细源码级三方差异见 [`docs/r3/review-v3/02-三方差异矩阵.md`](./r3/review-v3/02-三方差异矩阵.md)。

| 参考项目 | 覆盖生命周期环节 | 值得借鉴并纳入 v3 蓝图（*均属设计态 `PENDING_VALIDATION`，非已实现*） | 明确不采用（`REJECTED`） |
|---|---|---|---|
| **[lingfengQAQ/webnovel-writer](https://github.com/lingfengQAQ/webnovel-writer)**（重点审计 `v8` DSH Scriptor `8.4.2` @ `7396ee3` 及 `v6` 知识库） | ① 单章：硬约束三分类、审读指纹、Fail-Closed、跨轮发现项继承、影响范围拦截、定向修复与复审；<br>② 卷级：卷末对账、跨章修复后复审；<br>③ 完本：受控全书终审（非塞全文） | • 复合审读指纹 + Fail-Closed 完备性拒收<br>• 硬约束三分类（确定性 `hardErrors` + `NEEDS_SEMANTIC_AUDIT` 桥接）<br>• 跨轮语义三元组继承（**加固**：仅限真实作者批注且未改段）<br>• `impactScope` 拦截（`upstream_planning` / `finalized_canon` 不得混入写手改稿批）与 `PLANNING_CONFLICT_BLOCK`<br>• 卷末轻审+修复分账；完本金字塔索引（可选 `P2-OptIn`） | • 依赖宿主专有数据库/单厂商绑定<br>• 模型自判免报冒充作者保留<br>• 自动回滚覆盖已定稿文件而无显式 `retcon` 审批<br>• 将上游硬配额/大纲模板当作 R3 强制规则 |
| **[PenglongHuang/chinese-novelist-skill](https://github.com/PenglongHuang/chinese-novelist-skill)**（`master` @ `2026-11-24`；本仓库原始 MIT 底座上游） | ① 单章：创作自检、动笔前读上章结尾与文风示范、Phase 4 校验修复、章节状态管理；<br>② 全书：小说书房机械审读引擎（人物在场度、章节节奏、口头禅、重复短语、摘要覆盖率等跨章诊断） | • **动笔前最后读段强制为正文语态**（写手语域防火墙：倒数第二为文风锚点，最末位为上章结尾）<br>• **L0 全书只读机械诊断引擎**（`diagnose_book.mjs` 9 维 `D1–D9`：人物断档、口头禅、对话占比、高频短语、摘要覆盖等），**加固**为纯 stdout 零写入三重验证，永不自动判文学硬伤 | • 自建常驻本地 Web 书房服务器（R3 坚持纯 JSON+Markdown 跨 Harness 通用）<br>• 将字数/重复段/引号异常升级为默认硬阻断<br>• 用写手自审替代真实隔离独立编辑 |

---

## 七、审核系统历史技术决策

### 1. 六大历史根因与对应架构裁决（详见 [`docs/r3/review-v3/03`](./r3/review-v3/03-R3审核体系v3总体架构设计.md) & [`06`](./r3/review-v3/06-审核修复复审及版本失效协议.md)）
1. **审稿过严导致反复返工（`VERIFIED`）**：Phase 1 Blind C 证实 57.4% 首审 `MAJOR` 属过度定级，且单轮 Prompt 调参至 `v2.2` 撞上 Recall vs FPR 跷跷板（`15.15% > 15.0%`）→ **决策（`CONFIRMED`）**：停止盲目文字调参（`REJECTED` v2.3），落地 S1 四级枚举（正式引入永不阻断的 `SUGGESTION`）并进入 A/B/C 三方案对照实验。
2. **局部修改触发整章甚至多章复审（`VERIFIED`）**：大改面（`>30%`）触发冷重置，且缺乏影响面边界 → **决策（`CONFIRMED`）**：压低虚假必改项缩小 diff、保留 `DIFF_OVER_30PCT` 安全熔断，并在 P1 引入 `analyze_impact.mjs` 与显式 `retcon` 精准界定重审集。
3. **审稿与写手不必要的串行等待（`VERIFIED`）**：实测 `closeout` 耗 `2.38–4.11m/章` 且首审长推理阻塞关键路径 → **决策（`CONFIRMED`）**：P1 将收尾改为 ≤30 行增量块+脚本原子合并；`Perf-Track S2` 再受控验证异步收尾（M-D）、审稿分维并行（M-E）与低延迟辅助路由（M-F）（均 `PENDING_VALIDATION`）。
4. **Agent 初始化与文件重复读取（`VERIFIED`）**：单次冷审重读 `~76 KB` 静态档案、4–7 次碎步 `view_file` → **决策（`CONFIRMED`）**：M-A 全内联紧凑包编译 + M-B 受控热复用（注：M-A 静态切片的潜在漏检风险标注为 `PENDING_VALIDATION`，须经离线对照与盲评核验）。
5. **工具调用重复执行（`VERIFIED`）**：单章分散调用 8–12 次 CLI 且写手亲自调脚本、手改 JSON，还诱发预检自修空增 `revision` Bug → **决策（`CONFIRMED`）**：P0-4 修复空增 `revision` Bug；P1 收敛为统一 CLI `r3_ops.mjs`（总计 `<=4` 次、写手侧 CLI `=0`）。
6. **双阶段审稿的“Pass 1 漏检、Pass 2 无法找回”风险（`CONFIRMED`）**：针对 Pass 1 漏检不可逆问题，架构规定必须前置 `precheck v2`（`NEEDS_SEMANTIC_AUDIT` 强制核销）、6 维 `dimensionAuditSlots` 最小取证槽，并强制执行三方案同台对照。

### 2. A / B / C 三方案离线对照决策（`CONFIRMED` 原则，胜出者 `PENDING_VALIDATION`）
- **方案 A**：当前单阶段完整审稿（共享 `precheck v2`、6 维取证槽与 `PLANNING_CONFLICT_BLOCK` 底座）。
- **方案 B**：Pass 1 开放发现（宽口高召回）+ Pass 2 独立轻量定级。
- **方案 C**：单阶段完整审稿（高召回偏置）+ 独立轻量定级复核（`PASS` 章短路跳过）。
- **硬裁决规则（`CONFIRMED`）**：**严禁预设双阶段（方案 B）必胜**；必须通过 `P0-6` 独立离线对照验证（若方案 B 召回低于 A/C 超 `1.0 pp` 或出现任一 `BLOCKER` 漏检则直接淘汰），仅由同时全过 G1–G6（含 `G2-A` 与补齐后的 `G2-B` 分别达标）且综合最优者准入主仓。

---

## 八、历史命名与工程资产边界（严禁混淆与臆测）

### 1. 版本命名澄清（`CONFIRMED`）
- **`R2` 是历史版本代号（独立审稿/整文件规划门禁版），不是“第二轮审稿”**。
- **不存在 `R1`，不应人为引入 `R1` 概念**（*注：历史文档 `README.md` / `R3-PRD.md` 偶见“旧 V3/R1”系早期口语指代旧 `feat/v3-editorial-pipeline` 分支，规范命名中不建立 R1 阶段*）。
- **“复审（re-review）”是单章/卷级审核生命周期中的一个环节，绝不等于 `R2`**。

### 2. 审稿核心资产概念名与实际仓库映射（`VERIFIED` @ `e52105ad`）
| 概念 / 历史简称 | 用途说明 | 当前仓库实际对应路径 / 状态（不臆测） |
|---|---|---|
| `review.mjs` | 单章审稿流程脚本（历史/概念简称） | 当前仓库**无**独立的 `scripts/review.mjs` 文件；实际脚本为 [`scripts/r2_review.mjs`](../scripts/r2_review.mjs) 与 [`scripts/r2_review_common.mjs`](../scripts/r2_review_common.mjs)（Pilot 另配 `prepare_pilot_review.mjs` / `submit_pilot_review.mjs`） |
| `chapter-editor` | 单章独立审稿 Agent 角色 | 在宿主运行期派发为独立隔离只读编辑子代理（实测曾用角色名 `r2-chapter-editor` / `chapter-editor`），非仓库硬编码二进制 |
| `review-agent-template.md` | 审稿规范模板 | 仓库实际包含两份：[`references/v3/review-agent-template.md`](../references/v3/review-agent-template.md)（Pilot/综合审稿模板）与 [`references/v3/r2-review-agent-template.md`](../references/v3/r2-review-agent-template.md)（单章与三章窗口审稿模板） |
| `reviews/` | 项目内单章/规划/Pilot 审稿记录目录 | 生成于各独立小说项目目录下（细分 `reviews/r2/`、`reviews/r3/`、`reviews/pilot-review-vN.json`）；**正式个人创作小说的审稿记录属私人资产不得提交公开仓库**，研发测试小说的审稿评估记录原则上属公开研发资产并按需保全 |

---

## 九、知识资产与多题材能力建设（全仓库长期主线，非 P0 范围）

- **已完成的工程基础（`VERIFIED`）**：
  - 全量审计并固定导入 `chindden/webnovel-writer@04e485d` 知识原件（115 份参考/模板 + 8 套 CSV 722 条 + 17 条裁决 + 37 套题材模板），建立逐项覆盖差异矩阵（[`references/webnovel/coverage-matrix.md`](../references/webnovel/coverage-matrix.md)）与全资产路由审计（[`ASSET-ROUTING-AUDIT.json`](../references/webnovel/supplement/ASSET-ROUTING-AUDIT.json)）；
  - 独立补充层增补 11 套缺失专项模板、12 套细分流派机制与 12 类专题路由；实现 Python 只读 BM25 多题材复合检索（[`scripts/webnovel_knowledge.py`](../scripts/webnovel_knowledge.py)），知识检索工程回归 19/19 Hit@3、6/6 复合路由通过（`e4de996`）；
  - 已完成从旧集合仓 `chindden/skills` 迁回独立小说 Skill 仓库 `chindden/chinese-novelist-skill`（`07b60a9`）。
- **尚未验证与长期演进方向（`PENDING_VALIDATION` / `CONFIRMED` 不擅自塞入 P0）**：
  - 知识库在真实多题材创作中的实际调用率与文学增益（此前实测《残器长生》与《器痕录》规划稿知识库 ID 显式引用率为 `0`）；
  - 持续扩充缺失细分题材/流派专项、逐项语义冲突排查、多题材组合真实文学盲评，以及保持知识资产完全可插拔、可跨 Agent 迁移。

---

## 十、里程碑验收基线与实时状态查询入口（严禁将历史快照当作实时状态）

> **动态状态外置纪律（`DEC-12`）**：本文**不再重复抄录日常研发进度、每次 Commit SHA 或每次测试结果**。任何新 Agent 必须直接查询 GitHub Issues、[Project #4](https://github.com/users/chindden/projects/4)、Pull Requests 与本地 Git 获取实时状态；下表仅固化已达成且不可静默覆盖的历史里程碑基线。

### 1. 实时状态权威入口（冷启动必查）

| 信息类型 | 权威入口 | 查询要点 |
|---|---|---|
| **任务记录权威** | [GitHub Issues](https://github.com/chindden/chinese-novelist-skill/issues) | 核对 Open / Closed 任务、沟通上下文、前置依赖、优先级说明、阻塞原因、执行反馈与正式 `ACCEPTED` 结论 |
| **全生命周期唯一工程看板** | [Project #4 · Chinese Novelist Skill R3](https://github.com/users/chindden/projects/4) | 核对全生命周期任务展示与 `Status` 状态（当前五态：`Backlog` / `Todo` / `In Progress` / `In review` / `Done`）；若与 Issue 不一致，以 Issue 记录为依据核对修复，严禁猜测 |
| **代码/文档变更与审查证据** | [GitHub Pull Requests](https://github.com/chindden/chinese-novelist-skill/pulls) ＋ 本地工作区 Git 状态 | 核实实际分支、HEAD、Diff 边界、测试输出与审查留痕 |
| **专项技术与过程文档** | 如 [`docs/r3/p0-implementation/README.md`](./r3/p0-implementation/README.md)、[`P0-Implementation-PRD.md`](./r3/p0-implementation/P0-Implementation-PRD.md)、[`P0-Progress-Log.md`](./r3/p0-implementation/P0-Progress-Log.md) | 按当前活跃任务查阅所属技术范围的 PRD、验收条件与专项过程历史（*不覆盖全局协作协议*） |

### 2. 已固化的关键历史里程碑基线（历史快照，非动态进度表）

| 里程碑 / 基线 | 固化锚点 / 验收证据 | 状态与严格边界说明 |
|---|---|---|
| **上游原始 MIT 底座（`master`）** | `d1fb0ca5737ded47934b366b10b8d50b52557e57` | `VERIFIED`（保留不动） |
| **旧 V3/R2 独立分支（`feat/v3-editorial-pipeline`）** | `1c59b26990816b600365a0a32a861a6a897c2e3e`（[PR #1](https://github.com/chindden/chinese-novelist-skill/pull/1)） | `VERIFIED`（历史参考，保留不动） |
| **R3 审核体系 v3 冻结架构（`v1.2.3`）** | `feat/r3-migration` @ `b5572a943f9157cda07faa7910dcbfd20b1a3ba5`（[PR #3 `MERGED`](https://github.com/chindden/chinese-novelist-skill/pull/3)） | `VERIFIED`（只读权威，详见 [`docs/r3/review-v3/`](./r3/review-v3/README.md)） |
| **P0 实施管理 PRD `v1.0.1`** | `feat/r3-p0-controlled` @ `e52105adca3f994fca3cbdeef9aa935479ceaf9b` | `VERIFIED`（GPT-6 `ACCEPTED`，`2026-11-26`） |
| **全局上下文与接管协议 `v1.2`** | `feat/r3-p0-controlled` @ `2d6061d6cd0e8b4b2da77619cb58239c44dc332e` | `VERIFIED`（GPT-6 `ACCEPTED`，`2026-11-26`） |
| **`P0-0` 研发基线审计与实施准备** | 验收基线 `2b51cc262db9fb9cd9b030977b418f362b9fb002`（`2026-11-26T06:45:42Z`）；正式验收证据：[Issue #4 GPT-6 验收评论](https://github.com/chindden/chinese-novelist-skill/issues/4#issuecomment-7184975761)（`2026-11-26T06:59:01Z`）；审计产物：[`P0-0-Baseline-Audit-Report.md`](./r3/p0-implementation/P0-0-Baseline-Audit-Report.md) | **`ACCEPTED`（`VERIFIED`）**。**边界明示**：① Issue #4 是否已行政关闭以 GitHub 实时状态为准，不得将验收通过与 Issue 行政关闭混为一谈；② **`P0-0` 验收通过不构成下游任务自动启动授权**，后续任务仍须遵守通用授权与前置依赖制度；③ `P0-0` 实测确认 **`G2-B`（`0/20` 章、`0/60` 案例）、`G4`（独立来源章 `N_ch = 3 < 8`，缺 `+5` 章）与 `G6`（`0/12–16` 章）均处于 `underpowered`**，`G3`/`G5` 亦存在样本缺口，不代表文学质量提升或生产改造完成 |
| **本地未推送历史实验分支** | `feat/r3-m1-m4-craft-refinement` (`c45d4c6`)、`feat/r3-phase1-throughput-o1-o3` (`c0966b1`) | `VERIFIED`（Tier 3 历史参考；已在 `P0-0` 完成 19 文件只读差异审计并维持**严禁整枝合并**决定） |

### 3. 通用授权原则与动态下一步（禁止在本文预填动态指令）
- 本文不再固化“下一条具体待办指令”；新 Agent 必须按 [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md) 的接管原则，通过 [Project #4](https://github.com/users/chindden/projects/4) 与 [GitHub Issues](https://github.com/chindden/chinese-novelist-skill/issues) 核查实时活跃任务与沟通上下文，必要时追溯 PR / Commit，确认授权边界后输出 `GO` / `NO-GO` 判定。
- **适用于所有阶段与任务的通用授权原则**：无论当前处于何种版本、阶段或任务类型，**任何阶段或任务均不得因前序任务获 `ACCEPTED` 而自动启动**；必须核验对应 Issue 的前置依赖已满足且具备作者明确授权（或已有明确书面预先授权），方可进入执行。

---

## 十一、长期维护责任制（三方协同治理 · `CONFIRMED`）

| 角色 | 长期维护职责与边界 |
|---|---|
| **Neon（研发 Agent）—— 研发执行、Issue 维护与证据提交者** | ① 承担工程研发、测试编排、子代理调度、实验观察、GitHub Issue 维护（记录进展、关联 PR/Commit 与维护状态同步）与 PR / Commit 交付；② **不再承担在 `PROJECT-CONTEXT.md` 中重复维护所有任务日常动态进度的职责**——日常研发进度与审查留痕统一外置至 GitHub Issues、Project #4 与 PR/Commit；③ `PROJECT-CONTEXT.md` 仅在全局协作架构、重大里程碑决策或长期原则变更时更新；`AGENT-HANDOFF.md` 仅在接管原则、角色职责或权限规则发生实质变化时更新；④ **最高只能提交 `READY_FOR_REVIEW`，严禁自行宣布 `ACCEPTED`**，严禁静默覆盖历史决策。 |
| **GPT-6（审核 Agent）—— 独立审核与验收裁决者** | ① 独立审查代码、文档、Diff、测试与实验证据，在对应 Issue / PR 中提出整改意见（`CHANGES_REQUESTED`）并出具正式 **`ACCEPTED`** 验收结论；② 拦截未经验证的结论或越权变更进入正式基线；③ 在关键里程碑检查全局文档与 GitHub 协作状态的一致性。 |
| **作者 —— 最终决策者与授权主体** | ① 确立产品方向、核心创作原则与研发目标；② 批准重大架构、许可证定性、规范冲突裁决及范围变更；③ 掌握关键阶段启动授权与最终控制权。 |

---

## 十二、重要历史决策索引（不可静默覆盖）

| 编号 | 日期 | 核心决策 | 状态 | 权威来源 |
|---|---|---|---|---|
| `DEC-01` | 2026-11-24 | 确立 R3 产品原则：小说吸引力与内容完整性优先、创作自由（两级冻结+滚动双环）、完本精修、独立实验可对照回滚 | `CONFIRMED` | [`docs/R3-PRD.md`](./R3-PRD.md) §1 |
| `DEC-02` | 2026-11-24 | `P1-08` 跨作品经验库锁定 **Google Drive-only** 唯一权威源，否决 Notebook 作为在线主载体，Memory 仅可选定位（*历史记录保留；后受 `DEC-10`/`DEC-11` 约束，Drive 不再作研发权威存储，P1-08 存储重构延至 P1 按需实施*） | `CONFIRMED` / `VERIFIED`（历史宿主）→ P1 按需重构 | [`docs/R3-PRD.md`](./R3-PRD.md) §4 & 326–365 行；[`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md) §五 |
| `DEC-03` | 2026-11-24 | R3 唯一研发权威源迁回独立仓库 `chindden/chinese-novelist-skill`（`feat/r3-migration`）；集成开发版许可调整为 GPL-3.0 并保留 MIT 原文 | `CONFIRMED` / `VERIFIED` | [`README.md`](../README.md)、[`NOTICE.md`](../NOTICE.md)、[PR #2](https://github.com/chindden/chinese-novelist-skill/pull/2) |
| `DEC-04` | 2026-11-24 | 全量审计并按需只读导入 `webnovel-writer@04e485d` 知识原件 + 自主补充层，不引入上游运行时与硬配额 | `CONFIRMED` / `VERIFIED`（工程检索） | [`references/webnovel/README.md`](../references/webnovel/README.md) |
| `DEC-05` | 2026-11-24 | 作者确立《器痕录》实测原则：字数控制不要苛求，严禁为死磕字数牺牲内容完整性 | `CONFIRMED` | 本文 §二、[`docs/r3/review-v3/05`](./r3/review-v3/05-全书机械诊断引擎PRD.md) |
| `DEC-06` | 2026-11-25 | 审稿 Prompt 离线校准 `v2.2` 触发预设停止条件（FPR `15.15% > 15.0%`），否决继续单轮文字调参（`REJECTED` v2.3），转入审核体系 v3 架构重设计 | `CONFIRMED` / `VERIFIED` | [`docs/r3/review-v3/01`](./r3/review-v3/01-R3当前审核能力真实实现审计.md) |
| `DEC-07` | 2026-11-25 | 冻结并合并 R3 审核体系 v3 `v1.2.3`（PR #3）：A/B/C 三方案对照、写手语域防火墙、L0 三重零写入同树校验、`STALE_REVIEW_AFTER_EDIT` 硬阻断分轨、`G2-A`/`G2-B` 严格分离（`G2-B` 标 `underpowered`）、5 分钟 `Perf-Track` 与可选 L4 `P2-OptIn` 彻底解耦 | `CONFIRMED` / `VERIFIED`（文档冻结） | [PR #3](https://github.com/chindden/chinese-novelist-skill/pull/3) (`b5572a94`)、[`docs/r3/review-v3/`](./r3/review-v3/README.md) |
| `DEC-08` | 2026-11-26 | 建立并验收独立 P0 实施管理 PRD `v1.0.1`（6 态验收分权、Neon 最高提审 `READY_FOR_REVIEW`、`ACCEPTED` 仅限 GPT-6、一任务一 Commit） | `CONFIRMED` / `VERIFIED` | [`docs/r3/p0-implementation/`](./r3/p0-implementation/README.md) |
| `DEC-09` | 2026-11-25 | 确立 `docs/PROJECT-CONTEXT.md` 为全仓库长期上下文档案（独立于 R3/P0 专项）并配套 [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)，建立三方长期维护责任制（*日常动态进度维护职责已由 `DEC-12` 外置至 GitHub*） | `CONFIRMED`（职责边界由 `DEC-12` 升级） | 本文（`v1.0` → `v1.3`） |
| `DEC-10` | 2026-11-25 | **研发资产去 Google Drive / 去单账号依赖原则**：研发资产不得依赖 Google Drive、单一 Gemini 账号、单次会话或临时 VM；Google Drive 收缩为已完成正式个人小说备份（*注：原 v1.0 中新建第二仓库与全量历史归集规划已由 `DEC-11` 修正取消*） | `CONFIRMED`（核心原则）/ 执行范围由 `DEC-11` 修正 | [`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md) |
| `DEC-11` | 2026-11-25 | **务实按需保全与立即转入 P0 决策**：① 公开主仓 `chindden/chinese-novelist-skill` 为唯一研发入口，不新建第二个仓库；② 研发测试小说/实验评估原则上属公开研发资产（测试小说许可证状态 `REVIEW`），正式个人创作小说及其草稿属私人资产；③ 停止全量历史考古，按四级依赖按需保全；④ 建立 [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)；⑤ 作者预先授权 `v1.2` 过审后直启纯只读 `P0-0`（*`P0-0` 已完成并获 GPT-6 `ACCEPTED`*） | `CONFIRMED` / `VERIFIED`（`P0-0` 已验收） | [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)、[`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md) `v1.1`、[Issue #4](https://github.com/chindden/chinese-novelist-skill/issues/4#issuecomment-7184975761) |
| `DEC-12` | 2026-11-26 | **全局 Agent 协作架构升级（三项长期治理决定）**：① **唯一入口**：新 Agent 必先读取 `docs/AGENT-HANDOFF.md` 与 `docs/PROJECT-CONTEXT.md`，不依赖旧聊天；② **动态状态外置与唯一看板**：以 GitHub Issues 为任务记录权威、以 [Project #4](https://github.com/users/chindden/projects/4) 为**整个 Chinese Novelist Skill 全生命周期唯一长期沿用的统一工程看板**（覆盖原始 Skill、R2、R3 及未来 P1/P2/R4 等全部阶段，不因版本/阶段另建 Project，显示名含“R3”不代表范围仅限 R3；当前提供统一展示与五态 `Status` 推进，优先级与阻塞记入对应 Issue）、以 PR/Commit 为变更与审查证据，不再在全局 Context 中重复维护日常进度；③ **按职责划分权威边界**：全局协作协议（角色/权限/协作方式/信息权威）不得被局部 PRD/Progress Log 覆盖，冻结架构与专项 PRD 分别约束各自技术范围，遇冲突立即停止并向作者报告 | `CONFIRMED` | [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)、本文（`v1.3`）、[Issue #11](https://github.com/chindden/chinese-novelist-skill/issues/11) |

---

## 十三、档案版本维护记录

| 版本 | 创建 / 修订 Commit SHA | GitHub 提交时间（UTC） | 变更说明 | GPT-6 审核状态 |
|---|---|---|---|---|
| **`v1.0`（初建）** | `15245e785535f83bf11fad684b3ae6dc980a9c0e` | `2026-11-25T18:18:08Z` | 首次创建 `docs/PROJECT-CONTEXT.md`，补齐根目录/P0 导航入口并固化 P0 PRD `v1.0.1` `ACCEPTED` 状态（GitHub 统计：`6 files changed, 322 additions, 12 deletions`） | 初步审核认可结构，要求状态同步与新增资产索引 |
| **`v1.0`（状态同步与资产索引初建）** | `bb01bbd070c7ec4edf0852ac6213bc4196ecd51a` | `2026-11-25T18:38:56Z` | 区分审核基线 `e52105ad` 与 `v1.0` 创建提交 `15245e78`；同步 Quick Start、目录基线、§十及 P0 README 当前状态；新增 `docs/PROJECT-ASSET-INDEX.md` | 资产基础设施审计触发 `DEC-10` 治理升级 |
| **资产索引 Drive 只读核验** | `c6ac24bd0d2296645cb15cc906fe5538691cbc72` | `2026-11-25T18:51:48Z` | 只读核验 Google Drive 三份《仙门大掌柜》ZIP 与 `[CN-R3-EXP]` 空库并将脱敏大小与 SHA-256 登记入索引 | 已并入 `DEC-10` 全仓资产治理修订 |
| **`v1.1`（研发资产治理修订）** | `e9c9befc464f75b86aa9e1f6f4cd31872a1f13ff` | `2026-11-25T19:13:13Z` | 新增 `docs/RESEARCH-ASSET-POLICY.md` `v1.0`；重构 `docs/PROJECT-ASSET-INDEX.md` `v2.0`；登记 `DEC-10`、`P1-08` 审计与本地分支保全报告 | 作者据此修正收缩范围，确立 `DEC-11` |
| **`v1.2`（接管机制初建与按需保全收尾）** | `44fc259143a3eed2a7e38f2792e45a8ad51e2166` | `2026-11-25T19:45:17Z` | 新增 `docs/AGENT-HANDOFF.md`；登记 `DEC-11` 并固化 `P0-0` 过审直启预授权；同步 `RESEARCH-ASSET-POLICY v1.1`、`PROJECT-ASSET-INDEX v2.1` 与根目录 `README.md` | 要求将 `AGENT-HANDOFF.md` 精简为无动态进度的长期角色协议 |
| **`AGENT-HANDOFF` 结构性精简** | `aa12bd3414edd6038d6a6e22699ec4fbd3c2fea3` | `2026-11-25T20:06:08Z` | 精简 `docs/AGENT-HANDOFF.md` 为四部分长期稳定协议，剥离固定分支/SHA/任务状态与预填答案，写入角色隔离边界 | GPT-6 认可精简结构，提出 3 处最终一致性修正 |
| **`v1.2`（最终一致性修正）** | `2d6061d6cd0e8b4b2da77619cb58239c44dc332e` | `2026-11-26T00:52:10Z` | 补充 `AGENT-HANDOFF.md` Writer/Reviewer 异代理与 Observer 反掩盖/`BLOCKED` 约束；同步清理本文旧版 8 项必答与 Handoff 常规更新要求；修正根目录 `README.md` 资产公开/私有边界 | **`ACCEPTED`**（`2026-11-26`，触发纯只读 `P0-0` 启动） |
| **`v1.3`（全局 Agent 协作架构升级）** | *见 [Issue #11](https://github.com/chindden/chinese-novelist-skill/issues/11) 与 [PR #12](https://github.com/chindden/chinese-novelist-skill/pull/12) 提交记录* | *以 GitHub 实时提交时间为准* | 正式落地 `DEC-12`（唯一双入口、GitHub 动态状态外置、Project #4 全生命周期唯一统一看板与实际五态能力、按职责划分权威边界与通用授权原则）；精简 Quick Start、更新长期维护责任制与里程碑基线（同步 `P0-0` `ACCEPTED` 证据并清理过时状态） | *以 [Issue #11](https://github.com/chindden/chinese-novelist-skill/issues/11) 与 [PR #12](https://github.com/chindden/chinese-novelist-skill/pull/12) 实时审核结论为准* |
