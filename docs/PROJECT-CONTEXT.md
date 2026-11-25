# Chinese Novelist Skill — Project Context

> **版本**：`1.0`（状态同步与资产索引补全版，等待 GPT-6 最终审核） ｜ **范围**：`chindden/chinese-novelist-skill` 全仓库长期上下文档案（覆盖原始 Skill → R2 → R3 → 未来 R4，不属于 R3 专项或 P0 专项）  
> **核验基线（严格区分历史审核基线与档案创建提交）**：  
> - **P0 PRD 最近 GPT-6 审核基线**：`feat/r3-p0-controlled` @ `e52105adca3f994fca3cbdeef9aa935479ceaf9b`（`2026-11-25T17:44:23Z`）  
> - **PROJECT-CONTEXT v1.0 创建提交**：`feat/r3-p0-controlled` @ `15245e785535f83bf11fad684b3ae6dc980a9c0e`（`2026-11-25T18:18:08Z`）  
> - **R3 冻结架构合并基线**：`feat/r3-migration` @ `b5572a943f9157cda07faa7910dcbfd20b1a3ba5`（PR #3）  
> **配套资产索引**：[`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)（全仓库公开资产、私有/本地实验报告、私人 ZIP 与未推送本地分支可访问性索引）  
> **角色定位**：全仓库历史背景、核心决策、实验证据、创作理念与当前状态的统一恢复入口。**不取代**专项 PRD，**不复制**专项任务细则。

---

## Quick Start · 跨会话快速恢复指南（2 分钟上手）

### 1. 标准恢复读取顺序（任何新 ChatGPT / Gemini / Agent 会话必须按序执行）
1. **读本文**：[`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)（恢复全仓库历史、作者原则、决策边界与证据等级）
2. **读仓库入口**：根目录 [`README.md`](../README.md)
3. **读 V3 说明与路线**：[`README_V3.md`](../README_V3.md) 与 [`ROADMAP.md`](../ROADMAP.md)
4. **核对实时 GitHub 分支 HEAD**：切勿把本文历史快照当作永久实时状态，先查当前目标分支最新 Commit
5. **读当前专项管理文档**：例如 P0 专项 [`docs/r3/p0-implementation/README.md`](./r3/p0-implementation/README.md)、[`P0-Implementation-PRD.md`](./r3/p0-implementation/P0-Implementation-PRD.md) 与 [`P0-Progress-Log.md`](./r3/p0-implementation/P0-Progress-Log.md)
6. **按需查阅冻结架构、资产索引与原始实验材料**：[`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)、[`docs/r3/review-v3/`](./r3/review-v3/README.md) 与 [`docs/R3-PRD.md`](./R3-PRD.md)

### 2. 新会话恢复后必须向作者汇报的 7 项内容
1. **项目整体目标**：让中文小说创作 Skill 从“能完结”演进为“持续写出让读者愿意追读的长篇作品”，统筹创作能力、文学质量、长期记忆、知识资产、审核系统与工程效率。
2. **历史重要决策**：作者创作原则、R2/R3 边界、两级冻结+滚动双环+完本精修、GPL-3.0 知识资产导入、R3 审核体系 v3 架构冻结。
3. **当前阶段**：架构冻结已完成（`v1.2.3`）；P0 实施管理 PRD（`v1.0.1`）已获 GPT-6 验收；**`PROJECT-CONTEXT v1.0` 已建立，等待 GPT-6 独立审核**。
4. **已完成并验收的工作**：R3 独立仓库迁移、GPL-3.0 许可调整、上游 722 条知识与 37 套题材模板导入、P1-08 Drive-only 经验库宿主终验、R3 审核体系 v3 架构冻结（PR #3 已合入）、P0 管理 PRD `v1.0.1` 验收。
5. **未完成和阻塞事项**：`P0-0` ~ `P0-6` 全部 `NOT_STARTED`；`G2-B Independent Holdout` 处于 `underpowered`（当前就绪 `0` 章 / `0` 案例，需核验并补齐 `>=20` 未见独立章、`>=60` 案例）；A/B/C 三方案待离线对照；`G6` 跨题材 Holdout 待建设；P1 审核新架构与原 R3 P2 七项待实施。
6. **上一会话留下的下一步指令**：等待 **GPT-6** 对 `PROJECT-CONTEXT v1.0` 及 [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md) 的独立审核；审核通过后等待作者决定下一阶段（是否启动 `P0-0` 或其他安排）。
7. **需要作者决策的事项**：`P0-0` 正式启动授权；后续 `G2-B` / `G6` 独立样本来源确认；既有《仙门大掌柜》与未来多题材真实连载规划。

> **防重复劳动铁律**：严禁无必要地重新研究已冻结的 `v1.2.3` 审核架构，严禁要求作者重复交代本文与仓库已记录的历史背景与原则。

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

## 仓库文件职责体系

| 文件 / 目录 | 职责边界 |
|---|---|
| 根目录 [`README.md`](../README.md) | 仓库总入口、安装/许可/来源与导航 |
| [`README_V3.md`](../README_V3.md) | V3 / R2 / R3 使用说明、命令与测试入口 |
| [`ROADMAP.md`](../ROADMAP.md) | 上游继承与项目整体演进路线 |
| [`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md) | **全仓库长期历史、知识、决策、证据与跨会话恢复上下文**（本文） |
| [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md) | **全仓库公开/私有/本地实验资产、私人 ZIP 与未推送分支的可访问性索引** |
| [`docs/R3-PRD.md`](./R3-PRD.md) | R3 早期至迁移、知识库导入、P1-08 与 LIT 重构的历史主 PRD 台账 |
| [`docs/r3/review-v3/`](./r3/review-v3/README.md) | 已冻结的 R3 审核体系 v3 架构设计蓝图（`v1.2.3`，只读权威） |
| [`docs/r3/p0-implementation/`](./r3/p0-implementation/README.md) | P0 受控研发专项实施 PRD、状态面板与进度验收日志 |

---

## 一、项目整体历史（全仓库视角）

> **核心定位（`CONFIRMED`）**：本项目绝不仅仅是“审核系统升级”，而是面向中文长篇网络小说的完整 AI 创作 Skill 体系研发，涵盖 **创作能力研发、文学质量验证、长期记忆与经验沉淀、多题材知识资产建设、审核与状态治理、工程吞吐效率优化** 六条并行主线。

### 1. 演进脉络（原始 Skill → R2 → R3 → 未来 R4）
1. **原始底座（`master` @ `d1fb0ca5`）[`VERIFIED`]**：源自 [PenglongHuang/chinese-novelist-skill](https://github.com/PenglongHuang/chinese-novelist-skill) `v2.3.2`（MIT），具备三层递进问答、文风基准、事实账本、去 AI 味规范、Phase 4 校验与 Node.js 字数/摘要/项目校验脚本。核心局限：缺乏真实上下文隔离的独立审稿与长篇防漂移门禁。
2. **V3 / R2 阶段（`feat/v3-editorial-pipeline` @ `1c59b269`；旧集合仓 `chindden/skills` R2 分支）[`VERIFIED`]**：围绕“从能写完到可信连载”引入创意竞标、Stage 2 原生整文件蓝图双独审、前三章 Pilot 强制停审、独立编辑单章/三章弧审（`r2_review.mjs`）与 Python ZIP 完整快照备份。暴露的新矛盾：整文件刚性冻结限制远期演化、审稿过严导致返工与正文说明书化、缺乏跨书经验沉淀。
3. **R3 启动与独立仓库迁移（`feat/r3-migration`）[`VERIFIED`]**：
   - **启动动因（`CONFIRMED`）**：核心目标从“能够完成小说”升级为**“持续创作让读者愿意追读的长篇中文网文”**，确立 **“两级冻结（核心契约 + 卷级滚动检查点）· 滚动双环 · 完本精修”** 架构；
   - **早期研发与迁移（2026-11-24）[`VERIFIED`]**：在旧集合仓完成 R3 早期 P0（9/9 + 补漏 2/2）、P1（8/8 工程验收 + `P1-08` Drive-only 经验库宿主终验）及《仙门大掌柜》1–12 章连载实验后，于提交 `f7b65e6` / `07b60a9` 正式迁回独立仓库 `chindden/chinese-novelist-skill` 作为唯一研发权威源；
   - **许可与知识资产扩容（2026-11-24）[`VERIFIED`]**：独立提交调整本集成开发版为 GPL-3.0（完整保留原 MIT 文本于 [`LICENSES/MIT-upstream.txt`](../LICENSES/MIT-upstream.txt) 与 [`NOTICE.md`](../NOTICE.md)），导入固定版本 `chindden/webnovel-writer@04e485d` 知识原件（115 份参考/模板、8 套 CSV 722 条 + 17 条裁决、37 套题材模板）并补齐 11 套缺失专项模板、12 套流派机制与 12 类专题只读 BM25 路由，落地自然语言互动共创（`INIT-01/02`、`PLAN-01/02`）与 LIT 故事性优先重构（提交 `7bd3b20`、`b32e928`）。
4. **实测暴露的文学与效率瓶颈 → 审核体系 v3 重设计（2026-11-24 至 11-25）[`VERIFIED`]**：
   - 零干预实测与 M1–M4 / Phase 1 吞吐实验暴露出 **57.4% `MAJOR` 过度定级**、返工引发防杠说明书补丁、单章端到端耗时 `17–22m` / `24–31m` 等症结；审稿 Prompt 离线校准至 `v2.2` 触发预设停止条件（FPR `15.15% > 15.0%` + 跨题材漏检 + `OR6` 漂白）；
   - 经深度对标外部双项目全生命周期机制，完成 R3 审核体系 v3 架构重设计（`v1.2.3`）并经 PR #3 合入 `feat/r3-migration`（`b5572a94`），随后在 `feat/r3-p0-controlled` 建立 P0 受控研发管理 PRD（`v1.0.1` 获 GPT-6 验收）。
5. **未来演进（R3 P0/P1/Perf-Track/P2-OptIn → 未来 R4）[`PENDING_AUTHOR_DECISION`]**：完成 P0 单章破局、P1 跨章 L0/L2/L3 闭环、独立 5 分钟系统性能轨道、多题材真实文学盲评与长期小说资产体系，最终迈向下一代全链路创作引擎（R4）。

### 2. 当前仓库主要目录与资产结构（`VERIFIED`：基础目录核验于 `e52105ad`，`docs/PROJECT-CONTEXT.md` 新增于 `15245e78`，`docs/PROJECT-ASSET-INDEX.md` 新增于本次状态同步提交）
- `SKILL.md`：统一自然语言单入口路由规范（已存在于 `e52105ad`）。
- `references/v3/`：R2/R3 工作流、共创、互动规划、分区协议、运行手册、P1 协议、工艺红队与审稿模板（16 份，已存在于 `e52105ad`）。
- `references/flows/` & `references/guides/`：继承自原版的分阶段流程清单与写作指导（已存在于 `e52105ad`）。
- `references/webnovel/`：统一网文知识库（原 8 份自主 Markdown + `upstream/` 115 份 GPL 原件 + `supplement/` 自主补充层 + 覆盖矩阵与研究审计，已存在于 `e52105ad`）。
- `scripts/` & `scripts/tests/` & `tests/`：Node.js ESM 工程门禁/账本/规划/审稿/经验库脚本、Python 快照与知识库 BM25 检索脚本及回归测试套件（已存在于 `e52105ad`）。
- `docs/`：
  - 已存在于 `e52105ad`：历史台账 `docs/R3-PRD.md`、冻结审核架构 `docs/r3/review-v3/`、P0 专项管理 `docs/r3/p0-implementation/`；
  - 新增于 `15245e78`：全仓库长期上下文 `docs/PROJECT-CONTEXT.md`；
  - 新增于本次同步提交：全仓库资产索引 [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)。

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

> **铁律**：保留原始产物位置与证据局限，绝不把单次实验的积极结果外推为普遍文学质量提升。私有小说正文、项目 ZIP 与非公开记忆不提交公开 Skill 仓库（`CONFIRMED`）。

| 实验体系 / 样本 | 目的 | 核心输入与输出 | 原始证据位置 | 核心实测结论（分级） | 证据局限与未解决问题 |
|---|---|---|---|---|---|
| **1. 早期 Gemini R3 试跑与《仙门大掌柜》Ch 1–12**（2026-11-24） | 验证 R3 两级冻结、Pilot 停审、P1 反馈/账本绑定与长篇连载流程 | 独立项目《仙门大掌柜》Ch 1–3 Pilot（11,510 字）及续写 Ch 4–12（9 章审稿+3 次弧审）；交付 ZIP `xianmen-dazhanggui-r3-pilot-delivery.zip` / `complete-20261124.zip`（私有未入仓） | [`docs/R3-PRD.md`](./R3-PRD.md)（216–380 行）；Drive 私有备份 | `VERIFIED`：P0/P1 工程门禁与逐章独审跑通（Ch 3 真实时间线硬伤被拦截），ChatGPT 非盲评 Ch 1–3 约 7.9/10；暴露 `P0-F01/F02`、`P1-F01`、`SK-01~04` 及引文语义偏弱 | 无同条件 R2 正文对照与陌生读者盲评；卷末（Ch 22）与跨卷（Ch 23–26）及跨会话项目恢复仍 `PENDING_VALIDATION` |
| **2. 零干预双题材 Live Eval：《残器长生》vs《降本增笑》**（2026-11-24） | 评估 `feat/r3-migration`（`b32e928`）真实零干预端到端创作能力与文病 | 同宿主 `novelist_eval_agent` 跑仙侠 R3（《残器长生》3 章 12,749 字，17 次审稿，~95m）与职场默认（《降本增笑》3 章 20,098 字，19 次审稿，~96m） | 会话 Artifact `skill-live-eval-report.md`（未入公开仓） | `VERIFIED`：拉高写作上下限（职场 8.6/10 活人感强、仙侠 7.8/10 逻辑硬），但明确暴露四大痛点：审稿返工说明书化/括号补丁、仙侠前三章零阶段兑现、文风基准确立不闭环、单章字数飙至 7,584 字 | 单次双案例观测，无多评委匿名盲评；知识库 ID 在成稿规划中 0 显式命中 |
| **3. M1–M4 文学专项优化体系（Step 1 / Step 2 / Step 3）**（2026-11-24） | 针对上述 4 痛点做 M1（反说明书化）、M2（前三章回报）、M3（双节奏 H3 示范+Ch1 回填）、M4（可选非阻断字数软上限） | 本地分支 `feat/r3-m1-m4-craft-refinement`（`0bf1798`→`c45d4c6`，未合并）：Step 1 工程改造（12 文件）；Step 2 《残器长生》Ch 3 零泄漏定点返工重放；Step 3 《器痕录》全新对照试跑（Ch 1–3 共 13,460 字，23 次全冷独审，174.8m） | 本地分支 `c45d4c6`；Artifact `step1-m1-m4-delivery.md`、`step2-m1-replay-report.md`、`step3-r3-trial-report.md`、`step3-qihenlu-manuscript-ch1-3.md`（未入公开仓） | `VERIFIED`：Step 2 验证 M1 编辑端可拦截括号/免责旁白，Ch 3 终稿括号清零；Step 3 《器痕录》作者反馈“整体质量不错，字数不要苛求”，M3/M4 全部落盘闭环；但单章耗时仍 17–22m 且审稿返工重 | `step3-qihenlu` 未入公开仓；缺少子代理原始 `transcript.jsonl`（早期读档顺序标 `UNKNOWN`）；不可外推普遍文学提升 |
| **4. Phase 1 吞吐实验与独立三路盲审（Blind Audit A/B/C）**（2026-11-25） | 测量 O1（热复用+30% 熔断）、O2（简报+预检）、O3（原子流水线+遥测）对耗时、漏检与文学质量的影响 | 本地分支 `feat/r3-phase1-throughput-o1-o3`（`c0966b1`，未合并）；《器痕录》冻结规划下 Arm 0/1/2 × 3 章 = 9 章终稿 + 9 位冷启动盲审代理（Blind A 红队漏检 / B 文学盲评 / C 47 项首审 MAJOR 尺度校准） | 本地分支 `c0966b1`；Artifact `r3-phase1-midterm-report.md`、`r3-phase1-blind-audit-and-qa-report.md`；汇总写入 [`docs/r3/review-v3/01`](r3/review-v3/01-R3当前审核能力真实实现审计.md) | `VERIFIED`：① **57.4%（27/47）首审 `MAJOR` 属过度定级**，直接撑爆修改面触发冷重置并诱发次生硬伤（如 `BX-03` 反派降智与 Ch 3 65 字说明书补丁）；② O3 稳定省 `5.58m/ch` 且文学无退化（Arm 0 `8.40` vs Arm 1 `8.33`）；③ O1 9 章内未见特有漏检恶化（`2 MAJOR` 平基线），但 Arm 2 文学均分预警（`7.80`） | 仅单题材 9 章小样本；O1 单热会话未跑满无重置 3 章闭环（长期安全 `PENDING_VALIDATION`）；O2 尚未证明降返工轮次 |
| **5. 审稿尺度校准离线实验（v1 → v2 → v2.1 → v2.2）**（2026-11-25） | 试图仅靠单轮 Prompt 精修同时压低 FPR 并保持高召回 | 73 项定案 Track 2 回归 + 7 章已知回归 + 4 故事线×3 题材跨题材 Holdout（全在沙箱执行，仓库零改动） | Artifact `r3-review-calibration-v2.2-final-offline-validation-report.md`；汇总写入 [`docs/r3/review-v3/01`](r3/review-v3/01-R3当前审核能力真实实现审计.md) & [`08`](r3/review-v3/08-工程效率与文学质量双重验收方案.md) | `VERIFIED` / `REJECTED`（继续单轮调参）：v2.2 触发预设停止条件（FPR `15.15% > 15.0%`、单轮全能 Prompt 陷入 Recall vs FPR 跷跷板、跨题材深层漏检与 `OR6` 漂白大纲死锁），直接催生审核体系 v3 重设计 | 历史 Holdout（`NH-1..5`、`V22-H1..4`）已揭盲退役，不得再充当独立 Holdout |

---

## 四、长期记忆与经验沉淀机制

### 1. 长期方向与设计原则（`CONFIRMED`）
每卷或每本小说完成后（Pilot 验收、每卷完结、全书完结及实质作者纠正等自然节点，**不逐章默认触发**），将经过原文证据检验的成功经验、创作技巧、失败案例与踩坑教训沉淀为**可召回、独立导出、可跨 Agent 迁移的持久化知识资产**：
- **支持跨 Agent 独立迁移**：采用开放 Markdown 主题文档 + 稳定 ID/版本索引 + 离线 ZIP 封存与独立恢复，零锁定单一厂商私有内存；
- **按题材、流派与创作阶段定向检索**：允许不采用、记录不适用条件/副作用与反例；
- **严防过度泛化**：明确保留经验来源、证据成熟度与适用边界，绝不将单本小说的偶然成功固化为普遍规则，绝不把经验库回写为故事权威事实；
- **严格区分模型记忆与外部持久化知识资产**：宿主原生 Memory 仅作为可选定位指针（不可用时静默降级、不阻断创作），绝不充当唯一真源；Notebook 因单载体无法可靠全文读写与导出已被**否决退出在线主架构**（`REJECTED`，仅保留 `ASSET-05` 条件性待验）。

### 2. `gemini-memory-literary-gain-exp.zip` 与 `P1-08` 实际核对现状
- **Gemini 原生记忆与文学增益实验（`gemini-memory-literary-gain-exp.zip`，私有未入仓；核对依据 [`docs/R3-PRD.md`](./R3-PRD.md) 250–258 行）[`VERIFIED`]**：
  - 主动记忆创建、语义召回 `6/6`、双虚构作品隔离 `6/6`、原地更新后新会话召回获小样本支持；后台自动记忆首次无工具测试 `0/3`（因存在检索活动不能据此否定机制）；
  - 6 篇成稿（3 场景 × A/B 对照）SHA-256 校验通过：三方描述性均分 A=`43.83` vs B=`47.50`（差 `+3.67`，满分 60），但明确标注**非统计学显著结论**（每场景仅 1 对样本、账号级自动记忆无法完全关闭、3 篇 B 稿均自发使用物件情感意象出现结构趋同风险）。
- **`P1-08` Drive-only 最终实现与真实完成度（[`scripts/r3_experience_drive.mjs`](../scripts/r3_experience_drive.mjs)、[`docs/R3-PRD.md`](./R3-PRD.md) 326–365 行）**：
  - **已验证（`VERIFIED`）**：Google Drive 独立目录 `[CN-R3-EXP] 跨作品创作经验库` 作为唯一权威源（六主题聚合文档 + `00-INDEX-vN.md` + `staging/` + `archive/`）；`r3_experience_drive.mjs` 工程回归（R3 CI 64/64）、隔离 Drive v1→v2 发布/回读/归档/离线导出恢复及新独立会话定位读取已通过；正式空库初始化完成（`themes=6, entries=0`）。
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
| `reviews/` | 项目内单章/规划/Pilot 审稿记录目录 | 生成于各独立小说项目目录下（细分 `reviews/r2/`、`reviews/r3/`、`reviews/pilot-review-vN.json`），**私有小说审稿记录不提交公开 Skill 仓库** |

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

## 十、当前工程与研发状态快照（实时核验于 `2026-11-25`）

> **时效提醒**：以下为本次建档时从 GitHub 与本地仓库实时读取的快照，后续任何新会话必须重新执行 `git` / `gh` 核对最新 HEAD，不得直接把本表当作实时状态。

### 1. GitHub 远端分支、HEAD 与 PR 状态（`VERIFIED`）
| 分支 / PR | 当前状态 / 最新 SHA | 说明 |
|---|---|---|
| `master` | `d1fb0ca5737ded47934b366b10b8d50b52557e57` | 上游原始 MIT 底座分支（保留不动） |
| `feat/v3-editorial-pipeline`（PR #1 `OPEN`） | `1c59b26990816b600365a0a32a861a6a897c2e3e` | 旧 V3/R2 独立分支历史（保留不动） |
| `feat/r3-migration`（PR #2 `OPEN` Draft） | **`b5572a943f9157cda07faa7910dcbfd20b1a3ba5`** | R3 主开发基线；**已合入 PR #3（`v1.2.3` 审核体系冻结架构）** |
| `docs/r3-review-v3-architecture`（**PR #3 `MERGED`**） | `b63c0b82f220ccba202d63ed66f5bccdc39ba825` | 2026-11-25T16:56:42Z 合并至 `feat/r3-migration`（Merge SHA `b5572a94`，CI 全绿） |
| **`feat/r3-p0-controlled`**（当前活跃研发分支） | • P0 PRD 验收审核基线：`e52105adca3f994fca3cbdeef9aa935479ceaf9b`（`2026-11-25T17:44:23Z`）<br>• `PROJECT-CONTEXT v1.0` 创建提交：`15245e785535f83bf11fad684b3ae6dc980a9c0e`（`2026-11-25T18:18:08Z`，6 files changed, 322 additions, 12 deletions） | P0 受控研发分支；已固化 P0 管理 PRD `v1.0.1`（`ACCEPTED`）与 `PROJECT-CONTEXT v1.0`（待 GPT-6 最终审核） |
| *本地未推送实验分支*：`feat/r3-m1-m4-craft-refinement` | `c45d4c66eee1584b2be4cef0b7879d62e524bfda`（仅本地 VM） | M1–M4 工程与 Step 1–3 实验分支，未推送 GitHub、未合并主干（可访问性见 [`PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)） |
| *本地未推送实验分支*：`feat/r3-phase1-throughput-o1-o3` | `c0966b129135b8ec0d2fd38f90d8b34d2f92f6e9`（仅本地 VM） | Phase 1 O1–O3 吞吐实验分支，未推送 GitHub、未合并主干（可访问性见 [`PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)） |

### 2. 各专项当前状态与阻塞项（`VERIFIED`）
- **R3 审核体系 v3 架构设计（`docs/r3/review-v3/`）**：`v1.2.3` 正式冻结并已合入 `feat/r3-migration`（`VERIFIED`）。
- **P0 实施管理 PRD（`docs/r3/p0-implementation/`）**：`v1.0.1` 已于 `2026-11-26` 基于 `e52105ad` 获 **GPT-6 最终验收（`ACCEPTED`）**（`VERIFIED`）；**注意：管理 PRD 验收通过不代表 `P0-0` 已获启动授权**。
- **全仓库上下文档案与资产索引（`docs/PROJECT-CONTEXT.md` & `docs/PROJECT-ASSET-INDEX.md`）**：`PROJECT-CONTEXT v1.0` 已于 `15245e78` 建立，现已完成状态同步与资产可访问性索引补全，等待 **GPT-6** 最终独立审核。
- **P0 研发任务（`P0-0` ~ `P0-6`）**：**全部 7 项均为 `NOT_STARTED`**；`P0-0` 尚未获得作者正式启动授权（`PENDING_AUTHOR_DECISION`）。
- **P0-6 预登记硬缺口（`CONFIRMED` / `PENDING_VALIDATION`）**：
  - `G2-A Regression/Calibration`（历史 `9` 章 / `33` 案例）与 **`G2-B Independent Holdout`**（全新未见 `>=20` 章 / `>=60` 案例、单章 `<=3` 条、`>=3` 题材、`0` 章重叠）必须严格分开；
  - **`G2-B` 当前保持 `underpowered`**（已核实就绪 `0` 章 / `0` 案例，缺口 `+20 章 / +60 案例`，具体可用候选来源需在 `P0-0` 进一步核验）；
  - A / B / C 三方案尚待离线独立对照；`G6`（12–16 章跨题材 Holdout）尚待建设。
- **P1 审核新架构 / `Perf-Track` / `P2-OptIn` / 原 R3 P2 七项 / LIT-06 对照**：均尚未启动（`NOT_STARTED` / `PENDING_VALIDATION`）。

### 3. 下一步行动（严格等待审核与作者决策）
1. **等待 GPT-6 最终独立审核**本 `PROJECT-CONTEXT v1.0` 状态同步版及新增资产索引 [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)；
2. **审核通过后，等待作者决定下一阶段**（例如：是否建立独立 Agent 接管协议、是否单独正式授权启动 `P0-0` 等；严禁自行合并或提前启动后续事项）。

---

## 十一、长期维护责任制（三方协同治理 · `CONFIRMED`）

| 角色 | 长期维护职责与边界 |
|---|---|
| **Neon（Antigravity）—— 第一责任维护者** | ① 每次重大研发活动、实验验收、架构决策或阶段切换后，主动检查并更新本文及 [`PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)，**不等待作者提醒**；② 完整保留历史决策、原始文件路径、Commit/PR 与证据分级；③ 严禁静默覆盖历史决策，严禁擅自改变作者已确认的产品原则。 |
| **GPT-6 —— 知识治理与独立审核者** | ① 从跨会话深度讨论中提炼值得长期沉淀的决策与教训，向 Neon 下达更新指令；② 独立审核本文重大更新的完整性、事实准确性与历史一致性，拦截未经验证的结论进入正式知识档案；③ **每个 P0 / P1 / P2 里程碑完成后执行一次上下文档案一致性检查**。 |
| **作者 —— 最终决策者** | ① 确立与修订产品方向、创作理念及长期原则；② 批准重大架构与路线变更；③ 拥有所有研发阶段、代码合并与真实创作实验的最终启动授权权。 |

---

## 十二、重要历史决策索引（不可静默覆盖）

| 编号 | 日期 | 核心决策 | 状态 | 权威来源 |
|---|---|---|---|---|
| `DEC-01` | 2026-11-24 | 确立 R3 产品原则：小说吸引力与内容完整性优先、创作自由（两级冻结+滚动双环）、完本精修、独立实验可对照回滚 | `CONFIRMED` | [`docs/R3-PRD.md`](./R3-PRD.md) §1 |
| `DEC-02` | 2026-11-24 | `P1-08` 跨作品经验库锁定 **Google Drive-only** 唯一权威源，否决 Notebook 作为在线主载体，Memory 仅可选定位 | `CONFIRMED` / `VERIFIED`（存储宿主） | [`docs/R3-PRD.md`](./R3-PRD.md) §4 & 326–365 行 |
| `DEC-03` | 2026-11-24 | R3 唯一研发权威源迁回独立仓库 `chindden/chinese-novelist-skill`（`feat/r3-migration`）；集成开发版许可调整为 GPL-3.0 并保留 MIT 原文 | `CONFIRMED` / `VERIFIED` | [`README.md`](../README.md)、[`NOTICE.md`](../NOTICE.md)、PR #2 |
| `DEC-04` | 2026-11-24 | 全量审计并按需只读导入 `webnovel-writer@04e485d` 知识原件 + 自主补充层，不引入上游运行时与硬配额 | `CONFIRMED` / `VERIFIED`（工程检索） | [`references/webnovel/README.md`](../references/webnovel/README.md) |
| `DEC-05` | 2026-11-24 | 作者确立《器痕录》实测原则：字数控制不要苛求，严禁为死磕字数牺牲内容完整性 | `CONFIRMED` | 本文 §二、[`docs/r3/review-v3/05`](./r3/review-v3/05-全书机械诊断引擎PRD.md) |
| `DEC-06` | 2026-11-25 | 审稿 Prompt 离线校准 `v2.2` 触发预设停止条件（FPR `15.15% > 15.0%`），否决继续单轮文字调参（`REJECTED` v2.3），转入审核体系 v3 架构重设计 | `CONFIRMED` / `VERIFIED` | [`docs/r3/review-v3/01`](./r3/review-v3/01-R3当前审核能力真实实现审计.md) |
| `DEC-07` | 2026-11-25 | 冻结并合并 R3 审核体系 v3 `v1.2.3`（PR #3）：A/B/C 三方案对照、写手语域防火墙、L0 三重零写入同树校验、`STALE_REVIEW_AFTER_EDIT` 硬阻断分轨、`G2-A`/`G2-B` 严格分离（`G2-B` 标 `underpowered`）、5 分钟 `Perf-Track` 与可选 L4 `P2-OptIn` 彻底解耦 | `CONFIRMED` / `VERIFIED`（文档冻结） | PR #3 (`b5572a94`)、[`docs/r3/review-v3/`](./r3/review-v3/README.md) |
| `DEC-08` | 2026-11-26 | 建立并验收独立 P0 实施管理 PRD `v1.0.1`（6 态验收分权、Neon 最高提审 `READY_FOR_REVIEW`、`ACCEPTED` 仅限 GPT-6、一任务一 Commit） | `CONFIRMED` / `VERIFIED` | [`docs/r3/p0-implementation/`](./r3/p0-implementation/README.md) |
| `DEC-09` | 2026-11-25 | 确立 `docs/PROJECT-CONTEXT.md` 为全仓库长期上下文档案（独立于 R3/P0 专项）并配套 [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)，建立三方长期维护责任制 | `CONFIRMED` | 本文（`v1.0`） |

---

## 十三、档案版本维护记录

| 版本 | 创建 / 修订 Commit SHA | GitHub 提交时间（UTC） | 变更说明 | GPT-6 审核状态 |
|---|---|---|---|---|
| **`v1.0`（初建）** | `15245e785535f83bf11fad684b3ae6dc980a9c0e` | `2026-11-25T18:18:08Z` | 首次创建 `docs/PROJECT-CONTEXT.md`，补齐根目录/P0 导航入口并固化 P0 PRD `v1.0.1` `ACCEPTED` 状态（GitHub 统计：`6 files changed, 322 additions, 12 deletions`） | 初步审核认可结构，要求状态同步与新增资产索引 |
| **`v1.0`（状态同步与资产索引补全）** | *本次状态同步独立提交（见 Git 历史与交付报告）* | *提交时由 GitHub 记录* | 区分审核基线 `e52105ad` 与 `v1.0` 创建提交 `15245e78`；同步 Quick Start、目录基线、§十及 P0 README 当前状态；新增 [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md) 并建立双向索引 | `PENDING`（等待 GPT-6 最终审核） |
