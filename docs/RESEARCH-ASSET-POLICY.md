# Chinese Novelist Skill — Research Asset Policy & Cross-Agent Recovery Architecture

> **版本**：`1.0`（待 GPT-6 独立审核与作者批准） ｜ **范围**：`chindden/chinese-novelist-skill` 全仓库长期研发资产治理规范（非 P0 专项）  
> **配套档案**：[`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md) ｜ [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)  
> **性质声明**：本文为**资产治理规范、架构冲突审计与恢复验收设计**；在获得作者明确批准前，**不触发任何代码修改、不修改已冻结 R3 审核架构、不推送本地实验分支、不搬迁或删除现有 Google Drive 数据**。

---

## 一、研发资产与最终作品的根本边界（`CONFIRMED`）

> **核心原则**：整个中文小说写作 Skill 的研发资产，**不得依赖 Google Drive、某个 Gemini 账号、某个 Agent 的会话历史或临时 VM**。**严禁将临时 VM、聊天窗口或私有会话工件当作唯一权威存储。**

| 资产大类 | 包含内容 | 长期权威存储定位 | 严禁混淆的红线 |
|---|---|---|---|
| **A. 研发资产（Research & Engineering Assets）** | ① Skill 源代码、测试、配置、版本历史；<br>② PRD、架构、实施进度、验收记录；<br>③ Pilot、对照实验、文学评估报告；<br>④ 实验性小说正文、大纲、人物设定、审稿记录；<br>⑤ 工程日志、性能测试、运行快照；<br>⑥ 未合并实验分支、Git Bundle；<br>⑦ 实验中的记忆机制、经验提取与知识库数据 | **作者控制的、可版本化、可跨 Agent 访问的统一研发存储体系**：<br>• **公开研发资产** → 本 GitHub 公开仓库（代码、公开文档、规范、公开测试与冻结架构）；<br>• **私有/敏感研发资产** → 经作者批准的**私有研发 Git 仓库**或其他具备访问控制的版本化研发存储（*大型二进制存储方案如 Git LFS 须先提案评估并获批，禁止擅自选型迁移*） | **严禁**将私人小说正文、未公开实验原稿、盲审私钥或私人 ZIP 直接上传公开 GitHub 仓库；**严禁**以 Google Drive 承担研发资产权威存储职责 |
| **B. 最终小说作品（Finished Novel Deliverables）** | 已经**全本完成、正式验收并交付**的小说成品及其成书导出包 | **Google Drive（研发流程之外的成品作品备份存储）** | **严禁**将早期 Pilot、未完成章节（如 Ch 1–3 / Ch 1–12）、实验快照或运行中账本视为已完成的小说作品 |

---

## 二、生命周期归档规则、命名规范与审批权限

### 1. 临时实验持久化铁律
- **核心硬规则**：**实验结束必须完成资产归档检查，不能只提交实验结论而丢失原始证据。**
- **何时必须持久化**：凡产生可用于后续架构决策、参数校准、回归对照或文学质量评估的实验（含 Pilot、A/B 对照、盲审、吞吐遥测、离线校准），在输出实验报告前必须同步完成原始证据打包、清单生成与目标权威存储登记；探索性废稿须显式标为 `DISCARDED` 方可放弃持久化。
- **严禁孤岛依赖**：任何实验报告中引用的原稿、评审 JSON、遥测日志或分支代码，不得仅存在于单一临时 VM、单次聊天文件库或未备份的个人云盘账号中。

### 2. 未合并实验分支与未提交工作保全
- **禁止静默丢弃或擅自推送**：未合并实验分支若承载已引用实验结论，禁止放任其仅留存在临时 VM `.git` 中；在未获作者授权推送远端分支前，须先审计分支完整性并提交归档方案（目标私有仓库分支或可独立校验的 `git bundle`）。
- **代码与证据双轨保全**：Git 分支仅保存代码与测试，**不包含**沙箱外实验报告、实验正文与遥测 JSON；归档实验分支时必须同步绑定对应的原始实验证据包与 `manifest_sha256`。

### 3. 命名、版本、清单与 SHA-256 规则
- **资产编号**：全仓统一稳定 ID（`PUB-*` 公开仓、`PRIV-*` 私有研发仓、`LOC-*` 本地 VM 临时、`CHAT-*` 聊天文件库、`GD-*` Drive 历史、`WORK-*` 正式完本、`MISS-*` 未定位）。
- **版本与不可变性**：实验包与归档快照采用 `<topic>-<phase>-<YYYYMMDD>-v<N>` 命名，一经发布禁止原地覆写；任何归档包必须附带 `MANIFEST.json`（逐文件相对路径、精确字节数、64 位小写 SHA-256 及来源 Git Commit SHA）。
- **访问控制与隐私脱敏**：公开仓库仅记录脱敏后的资产编号、字节数、SHA-256 与恢复方式，严禁泄露个人邮箱、私有 Drive File/Folder ID、私有直链或访问令牌。

### 4. 归档、淘汰与删除审批权限
| 动作 | 所需审批权限 | 强制留痕要求 |
|---|---|---|
| 新增/登记资产索引、只读完整性校验 | Neon 执行，GPT-6 复核 | 更新 [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md) 并留 Commit |
| 将本地/历史资产迁移入私有研发存储或推送实验分支 | **作者明确授权** | 事前提交目标位置与清单，事后回读核验 SHA-256 |
| 资产标记 `DEPRECATED` / `ARCHIVED` | GPT-6 建议 + **作者批准** | 保留历史记录，禁止静默删除条目 |
| 物理删除历史实验包、私有备份或 Drive 现有数据 | **仅限作者显式书面授权** | 须先确认替代副本已完成独立恢复校验 |

---

## 三、P1-08 Google Drive-Only 架构冲突审计与迁移方案（`PENDING_AUTHOR_DECISION`）

> **冲突背景**：此前 `DEC-02`（2026-11-24）将 `P1-08` 跨作品经验库锁定为 Google Drive-only（`[CN-R3-EXP] 跨作品创作经验库`）并完成宿主终验；现作者新原则 `DEC-10` 明确：**研发资产不应依赖 Google Drive 或单一 Gemini 账号，Google Drive 仅作完本作品备份**。本节仅做只读审计与迁移提案，**不修改 `P1-08` 代码、冻结架构或现有 Drive 数据**。

### 六项核心审计结论
1. **属性定性**：`P1-08` 跨作品经验库**属于研发与运行时持续学习知识资产（归属 A 类研发资产体系）**，绝非“最终完本小说作品备份”（B 类）。其内含创作技巧、反例、适用边界与演化版本历史，需要跨 Agent、跨账号稳定读取与版本追溯。
2. **版本化可迁移替代方案（推荐方案对比，待作者审批选型）**：
   - **方案 M1（推荐 · 作者私有 Git 研发/经验仓库）**：由作者新建私有 Git 仓库（如 `chindden/chinese-novelist-private-assets` 或独立私有仓 `chindden/chinese-novelist-experience`），直接存放 `r3_experience_drive.mjs` 原生标准的纯 Markdown 主题文件（`01`–`06`）、`00-INDEX-vN.md` 与 `archive/`，通过 Git Commit / Branch / PR 天然获得不可变版本历史、真实内容寻址、跨 Agent（Antigravity / Claude Code / Codex / Cursor / DSH）通用读写与零 Google 账号绑定。
   - **方案 M2（本地加密/同步目录 + 私有 Git 镜像）**：适用于离线无网宿主，但须以私有 Git 为权威源、本地仅作工作副本。
   - **方案 M3（保留 Drive 作为可选导出镜像，不再作权威源）**：仅在作者显式需要用 Google Docs 浏览时单向导出，禁止回写为权威真源。
3. **既有能力保全（代码级实证）**：经源码核验，[`scripts/r3_experience_drive.mjs`](../scripts/r3_experience_drive.mjs) 第 2 行明确为 **`deterministic OFFLINE checks, never a Drive API or writing gate`**——其 `renderTheme / parseTheme / buildIndex / resolve / prepare / checkRef / confirmBase / seal / verify / restore` 全套能力**100% 离线、零 Google Drive API 强耦合**！迁移至私有 Git 仓库可 **100% 完整保留**已有经验 Schema、稳定 ID、版本递进、证据字段、成熟度状态、`archive/` 归档与回滚能力，甚至消除 Google Docs `.docx` 转义痛点与 Drive 无原子 CAS 缺陷。
4. **跨 Agent 无旧账号恢复机制**：新 Agent 仅需配置作者授权的私有 Git 仓库访问凭证（标准 Git SSH/Token，完全不依赖旧 Gemini 账号或旧 Google Drive），`git clone` 后直接调用离线校验脚本即可 100% 恢复最新索引与全部历史提交。
5. **对现有仓库资产的影响范围**：
   - **已冻结 R3 审核架构（`docs/r3/review-v3/`）**：**零破坏**（审核体系 v3 不依赖 Drive 经验库作为门禁）；
   - **现有 R2 / P0 代码与测试**：**零破坏**（`P1-08` 与 R2/P0 完全解耦）；
   - **待变更范围（仅在作者批准迁移后立项执行）**：① 新增通用命名入口（或兼容别名，如 `r3_experience_store.mjs` 封装/复用 `r3_experience_drive.mjs` 核心逻辑，保留旧脚本名向后兼容）；② 修订 [`references/v3/r3-p1-protocol.md`](../references/v3/r3-p1-protocol.md) 与 [`SKILL.md`](../SKILL.md) 中“Drive 唯一权威源”条款，改为“版本化私有研发/经验存储（首选私有 Git）”；③ 保留原有 64/64 + 9 项回归测试并新增私有 Git 端到端恢复测试。
6. **迁移成本、风险与验证方案**：
   - **迁移成本**：低（当前正式 Drive 经验库经实测仍为空库 `entries = 0`，零历史正文迁移负担；核心离线脚本已就绪，主要为协议文档改写与 Git 读写适配）；
   - **兼容风险**：若旧会话仍沿用旧协议写 Drive，可能出现双源分叉 → **缓释**：迁移获批切换后将旧 Drive `[CN-R3-EXP]` 标记为只读历史留存（不删除），新协议明确单一权威源为新私有研发仓；
   - **验证方案**：在全新隔离 Agent 环境中断开 `gdrive` 权限，仅凭私有研发仓凭证完成 `clone → resolve → prepare/commit v2 → verify → restore` 全链路实测通过，方可关闭迁移任务。

---

## 四、两个本地未推送实验分支保全风险审计与归档提案（只读实测 · `PENDING_AUTHOR_DECISION`）

> **只读核查结果（2026-11-25 现场实测，`git fsck --no-dangling` 0 错误，未推送分支，未保留任何临时 Bundle，未上传 Drive）**：

| 审计维度 | `feat/r3-m1-m4-craft-refinement` | `feat/r3-phase1-throughput-o1-o3` |
|---|---|---|
| **完整 HEAD SHA** | `c45d4c66eee1584b2be4cef0b7879d62e524bfda` | `c0966b129135b8ec0d2fd38f90d8b34d2f92f6e9` |
| **共同基线与谱系** | 基于 `b32e9289` 领先 **2 个提交**（`0bf1798` + `c45d4c6`，`2026-11-24T14:29:22Z`） | 基于 `b32e9289` 领先 **3 个提交**（完整包含 `0bf1798` + `c45d4c6` + `c0966b1`，`2026-11-25T04:22:28Z`） |
| **1. 分支与 Git 对象完整性** | ✅ 完整（`git fsck --no-dangling` 无损坏） | ✅ 完整（`git fsck --no-dangling` 无损坏） |
| **2. 有无尚未提交的必要实验文件** | 仓库工作区干净；但全部 Step 1–3 实验报告与原稿均在仓库外 VM Artifact/Scratch 中 | 仓库工作区干净；但全部 Phase 1 遥测、9 章原稿、Blind A/B/C 与 v1–v2.2 校准输出均在仓库外 VM 中 |
| **3. 可独立恢复 Git Bundle 可行性** | ✅ 已实测干跑验证：`git bundle verify` 通过，增量包 **`21,441` bytes**（测试后已删除） | ✅ 已实测干跑验证：`git bundle verify` 通过，增量包 **`52,991` bytes**（测试后已删除） |
| **4. 实验原始证据是否全部在 Git 内** | ❌ **否**（Git 内仅含 12 个代码/规范/测试文件） | ❌ **否**（Git 内仅含 8 个 O1–O3 脚本/协议/测试文件 + M1–M4 基底） |
| **5. 缺失于 Git 之外的必要原始证据** | `step1-m1-m4-delivery.md`、`step2-m1-replay-report.md`、`step3-r3-trial-report.md`、`step3-qihenlu-manuscript-ch1-3.md`、`scratch/step2-m1-replay/`、`scratch/step3-r3-trial/`、`scratch/live-eval/` | `r3-phase1-midterm-report.md`、`r3-phase1-blind-audit-and-qa-report.md`、`r3-review-calibration-v1..v2.2` 报告、`scratch/phase1-throughput-exp/`、`scratch/phase1-blind-audit/`、`scratch/phase1-calibration-*` 及私有盲审私钥 JSON |
| **当前保全风险等级** | 🔴 **高危（单点 VM 依赖）**：新环境 `git clone` 完全不可见 | 🔴 **高危（单点 VM 依赖）**：新环境 `git clone` 完全不可见 |

### 待作者审批的安全归档提案（未获批前严禁执行）
1. **代码分支归档（二选一待批）**：
   - **选项 B1（推荐 · 推至私有研发归档仓或公开仓只读归档分支 `archive/exp-*`）**：两分支自身 100% 仅含代码、规范与单测，不含任何私人小说正文；推送后全平台新 Agent 可直接 `git fetch` 完整恢复代码；
   - **选项 B2（私有研发仓存 `git bundle`）**：将 `21.4 KB` / `53.0 KB` 的 `git bundle` + `SHA-256` 清单存入经作者批准的私有研发仓库（不传 Google Drive）。
2. **分支外实验证据归档（必须同步授权）**：将 `<ART_ROOT>/` 下的 16 份实验报告及 `<ART_ROOT>/scratch/` 下的原稿、审稿 JSON、遥测 JSONL 与盲审密钥打包并生成 `MANIFEST.json`（含全文件 SHA-256），存入**作者新建的私有研发仓库**（涉及较大压缩包时先评估 Git LFS 或分卷纯文本归档，**绝不入公开仓，不传 Google Drive**）。

---

## 五、跨 Agent 研发接续与独立恢复验收标准（供后续 `AGENT-HANDOFF` 使用）

> **核心检验原则**：新 Agent 接管验收**绝不能只测“能否读懂 `PROJECT-CONTEXT.md`”**，必须在**全新隔离容器/环境**、**零旧会话聊天历史**、**零旧 Gemini 账号 Google Drive 凭证**条件下，逐项实测以下 **8 项硬验收用例（`REC-01` ~ `REC-08`）**：

| 用例编号 | 验证维度 | 独立新环境执行步骤 | 硬通过标准 | 当前就绪状态 |
|---|---|---|---|---|
| **`REC-01`** | **读取当前代码与文档** | 全新容器仅凭公开仓 URL `git clone` 并切至 `feat/r3-p0-controlled`，按 Quick Start 顺序读取 `PROJECT-CONTEXT.md`、`RESEARCH-ASSET-POLICY.md`、`PROJECT-ASSET-INDEX.md` 及专项文档 | 准确复述项目目标、作者原则、分支 HEAD、已冻结 `v1.2.3` 边界与 `P0-0`~`P0-6` 状态，零幻觉 | ✅ **已具备** |
| **`REC-02`** | **重建本地测试环境** | 在全新容器内无缓存执行 `README_V3.md` 全部 Node + Python 测试命令 | Node 与 Python 全量基线测试 100% 绿灯，零缺失隐藏依赖 | ✅ **已具备** |
| **`REC-03`** | **恢复未合并研发分支** | 在全新容器内不借助本会话 VM，按归档指引恢复 `feat/r3-m1-m4-craft-refinement` (`c45d4c66`) 与 `feat/r3-phase1-throughput-o1-o3` (`c0966b12`) | 恢复后 `git rev-parse` 与精确 40 位 SHA 完全一致且单测可运行 | ❌ **尚未具备**（待作者批准分支归档方案） |
| **`REC-04`** | **恢复必要历史实验与原始证据** | 在全新容器内仅凭私有研发仓授权拉取 M1–M4 / Phase 1 / 校准 v2.2 原始报告、原稿与遥测包，按 `MANIFEST.json` 逐文件核验 SHA-256 | 全部引用证据包 SHA-256 100% 匹配，可独立复算 Blind C / v2.2 指标与耗时口径 | ❌ **尚未具备**（当前仅存本会话 VM） |
| **`REC-05`** | **定位跨渠道历史实验包** | 核验《仙门大掌柜》Ch 1–12 完整快照与 `gemini-memory-literary-gain-exp.zip` 等历史包是否已迁入统一私有研发存储 | 不依赖旧聊天文件库或旧 Drive 账号即可拉取并 `verify_snapshot.py` 通过 | ❌ **尚未具备**（当前分处 Drive 与 ChatGPT 文件库） |
| **`REC-06`** | **无旧 Drive 账号恢复经验库** | 断开 `gdrive` 凭证，按新 `P1-08` 迁移后协议从私有研发仓拉取并运行 `resolve / verify` | 零 Drive 权限下完整读取经验索引与历史版本 | ❌ **尚未具备**（待作者批准 `P1-08` 迁移方案） |
| **`REC-07`** | **准确确认当前任务与验收状态** | 新 Agent 独立读取 `docs/r3/p0-implementation/` 后提交接管状态汇报 | 准确识别 `P0-PRD v1.0.1 = ACCEPTED`、`P0-0`~`P0-6 = NOT_STARTED`、`G2-B = underpowered` 且未擅自启动 `P0-0` | ✅ **已具备** |
| **`REC-08`** | **零旧聊天历史与零旧账号隔离验证** | 审计新 Agent 全程输入与工具调用日志 | 0 次引用旧会话 transcript、0 次登录旧 Gemini/Drive 账号，全流程可独立复现 | 待 `REC-03`~`REC-06` 补齐后整体验收 |
