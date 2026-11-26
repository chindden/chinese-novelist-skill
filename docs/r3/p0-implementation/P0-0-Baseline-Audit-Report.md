# P0-0 · 研发基线审计与实施准备报告

> **任务编号**：`P0-0`（纯只读审计与实施准备，零生产代码改动） ｜ **提交状态**：`READY_FOR_REVIEW`（响应 `RW-P0-0-001` 整改重提，等待 GPT-6 最终复审；验收通过前严禁推进 `P0-1`）  
> **活跃分支**：`feat/r3-p0-controlled` ｜ **审计前前置基线 HEAD**：`2d6061d6cd0e8b4b2da77619cb58239c44dc332e`（`2026-11-26T00:52:10Z`，GPT-6 `ACCEPTED`）  
> **原始 `P0-0` 正式交付 Commit**：`86cbc9f3ad37c635f134eeea2a89317d5eef0a3c`（GitHub 提交时间：`2026-11-26T02:58:13Z`；GPT-6 初审 `CHANGES_REQUESTED`，见返工项 `RW-P0-0-001`；本版为整改补充提交，原始提交完整保留）  
> **架构冻结基线**：`feat/r3-migration` @ `b5572a943f9157cda07faa7910dcbfd20b1a3ba5`（PR #3，`docs/r3/review-v3/` `v1.2.3`）  
> **授权依据**：作者已预先授权 `PROJECT-CONTEXT` 与 `AGENT-HANDOFF` 经 GPT-6 验收通过后直接启动纯只读 `P0-0`；GPT-6 已于 `2d6061d6` 给出 `ACCEPTED`。  
> **验证分层纪律**：本报告中自动化单测 100% 通过仅代表**工程基线零回归**，绝不代表文学质量提升或生产召回率证明；所有未就绪离线样本一律诚实标注 `underpowered` 与精确缺口。

---

## 一、代码与分支基线核验（`feat/r3-p0-controlled` @ `2d6061d6`）

### 1. 分支谱系与零代码偏移验证
- `git merge-base HEAD b5572a943f9157cda07faa7910dcbfd20b1a3ba5` = **`b5572a943f9157cda07faa7910dcbfd20b1a3ba5`**（`feat/r3-p0-controlled` 为冻结基线的严格线性后继，共领先 10 个纯文档提交：`95b0951` → `a12774f` → `e52105a` → `15245e7` → `bb01bbd` → `c6ac24b` → `e9c9bef` → `44fc259` → `aa12bd3` → `2d6061d`）。
- `git diff --name-status b5572a94..2d6061d6` 仅含 **9 个纯文档文件**（`README.md`、`README_V3.md`、`docs/PROJECT-CONTEXT.md`、`docs/AGENT-HANDOFF.md`、`docs/RESEARCH-ASSET-POLICY.md`、`docs/PROJECT-ASSET-INDEX.md` 及 `docs/r3/p0-implementation/` 3 份管理文档）。
- **`SKILL.md`、`scripts/**`、`tests/**`、`references/**`、`.github/**`、`docs/r3/review-v3/**` 全部与 `b5572a94` 保持 0 字节差异。**

### 2. 运行环境与仓库基线文件清册
- **运行环境**：Node.js `v22.23.5` ｜ Python `3.12.16`
- **仓库关键资产统计**：
  - 入口规范：`SKILL.md`（1 个）
  - CI 工作流：`.github/workflows/chinese-novelist-r3.yml`、`.github/workflows/chinese-novelist-v3.yml`（2 个）
  - V3/R2/R3 协议与模板：`references/v3/` 共 **16 份**（含 `r2-review-agent-template.md`、`review-agent-template.md`、`r3-p1-protocol.md`、`craft-and-redteam.md`、`r3-operational-runbook.md`、`workflow.md` 等）
  - 工程脚本：`scripts/` 共 **37 个**（32 个 `.mjs` + 5 个 `.py`：含 `r2_review.mjs`、`r2_review_common.mjs`、`r3_p1.mjs`、`r3_p1_common.mjs`、`r3_plan.mjs`、`r3_plan_common.mjs`、`r3_feedback_view.mjs`、`r3_structured_checks.mjs`、`v3_common.mjs`、`v3_gate.mjs`、`submit_pilot_review.mjs`、`prepare_pilot_review.mjs`、`plan_review_common.mjs`、`audit_story_state.mjs`、`check_repetition.mjs`、`chapter_wordcount_common.mjs`、`check_chapter_wordcount.mjs`、`r3_experience_drive.mjs`、`webnovel_knowledge.py`、`create/verify/restore_snapshot.py` 等）
  - 自动化测试：`tests/r3-routing.test.mjs`（1 个）+ `scripts/tests/`（16 个 `.mjs` + 2 个 `.py` = 18 个），**合计 19 个测试文件**。

---

## 二、与本地实验分支 `feat/r3-phase1-throughput-o1-o3`（`c0966b12`）只读差异审计

- **共同祖先**：`git merge-base b5572a94 c0966b129135b8ec0d2fd38f90d8b34d2f92f6e9` = `b32e92891d89945baed9a0707e90fbc3572afd20`。
- **实验分支领先提交**（3 个，共 `19 files changed, +2461 / -60`）：`0bf1798`（M1–M4）→ `c45d4c6`（M4 修正）→ `c0966b1`（Phase 1 O1–O3）。
- **结论**：**严禁整枝盲目合入 `c0966b12`**；逐项差异与 P0 处置边界如下：

| `c0966b12` 独有/差异文件 | 变更状态 | 关键风险 / 与冻结 `v1.2.3` 的冲突 | P0 受控处置策略 |
|---|---|---|---|
| `scripts/build_chapter_brief.mjs`（`+299`） | 仅实验分支（`A`） | 未实现写手语域防火墙断言，未强制锁定“倒数第二：文风锚点 → 最末位：上章结尾”顺序 | **不直接合并**；由 **`P0-2`** 按冻结 `03` 2.1 节新建写手语域防火墙模块（`r3_writer_firewall.mjs` / `build_writer_brief.mjs` / `build_revision_card.mjs`） |
| `scripts/precheck_chapter.mjs`（`+370`） | 仅实验分支（`A`） | **与冻结 `06` 直接冲突**：旧版将“低于 `minWordsPerChapter`”和“精确重复长段 `>=60` 字”均判为 `exit 1` 硬阻断，违背作者原则与 `06` 防误杀规范，且无 `NEEDS_SEMANTIC_AUDIT` 六类线索提取 | **严禁直接合并**；由 **`P0-3`** 按冻结 `06`（`PrecheckV2Output` `schemaVersion: 2`）合规新建 `precheck v2` |
| `scripts/build_review_pack.mjs`（`+415`） | 仅实验分支（`A`） | 旧版 L195 `filter(i => i.status === 'open')` 会把 `SUGGESTION` 误拉入复审未闭环清单；缺少五元组复合指纹与 6 维取证槽 | **不直接合并**；由 **`P0-4` / `P0-5`** 按冻结 `06` 协议受控重构 |
| `scripts/r3_atomic_ops.mjs`（`+338`） | 仅实验分支（`A`） | 含历史登记 **Bug-1（`ENG-FIX-P1`）**：`prepare-chapter --with-precheck` 在写手自修前提前冻结 `v1`，导致重跑空增 `revision` | **不直接合并**；`P0-4` 落地 `prepare` 不空增 `revision` 约束，P1 `r3_ops.mjs` 原生规避 |
| `scripts/r3_telemetry.mjs`（`+318`） | 仅实验分支（`A`） | 含历史登记 **Bug-2（`ENG-FIX-P1`）**：用 `revisionsCount - 1` 估算返工轮次且硬编码 `r === 1` 读首审结论 | **不直接合并**；后续引入遥测模块时须按磁盘实际 `report-chNNN-v*.json` 列表原生实现 |
| `scripts/chapter_wordcount_common.mjs`（`+56/-`）、`check_chapter_wordcount.mjs`（`+189/-`） | 实验分支修改（`M`） | M4 可选软上限改造（非阻断） | P0 暂不整枝合入；`P0-3` 可只读参考 `parseOptionalMaxWords`，保持现有脚本零破坏 |
| `references/v3/*.md`（9 修改 + 1 新增 `r3-phase1-throughput-protocol.md`） | 实验分支（`M`/`A`） | 修改了生产审稿模板与工作流文档 | **严禁提前合入**（`P0-6` 过审且获作者准入批准前禁止改动生产主模板） |
| `scripts/tests/{check_chapter_wordcount,r3_phase1_throughput}.test.mjs` | 仅实验分支（`A`） | 对应实验脚本单测（5 + 3 `test()` 块） | 随对应新模块在 `P0-2`~`P0-5` 各自新建独立测试套件 |

---

## 三、自动化测试基线固化（`TC-P0-0-1` & `TC-P0-0-2` · 100% 通过）

> **执行环境**：零代码改动状态（`feat/r3-p0-controlled` @ `2d6061d6`），Node `v22.23.5`，Python `3.12.16`。

### 1. R3 `node --test` 测试套件（7 文件 · **`71 / 71`** 通过，`0 fail`，`0 skipped`）
- **原始命令**：`node --test tests/r3-routing.test.mjs scripts/tests/r3_plan_sections.test.mjs scripts/tests/r3_plan_protocol.test.mjs scripts/tests/r3_faults.test.mjs scripts/tests/r3_experience.test.mjs scripts/tests/r3_experience_drive.test.mjs scripts/tests/r3_intake.test.mjs`
- **退出码**：`0`（汇总输出：`# tests 71 / # pass 71 / # fail 0 / # skipped 0`）

| 测试文件 | 用例数 | 通过 | 失败 |
|---|---:|---:|---:|
| `tests/r3-routing.test.mjs` | 6 | 6 | 0 |
| `scripts/tests/r3_plan_sections.test.mjs` | 13 | 13 | 0 |
| `scripts/tests/r3_plan_protocol.test.mjs` | 27 | 27 | 0 |
| `scripts/tests/r3_faults.test.mjs` | 6 | 6 | 0 |
| `scripts/tests/r3_experience.test.mjs` | 4 | 4 | 0 |
| `scripts/tests/r3_experience_drive.test.mjs` | 9 | 9 | 0 |
| `scripts/tests/r3_intake.test.mjs` | 6 | 6 | 0 |
| **小计（7 文件）** | **71** | **71** | **0** |

### 2. V3 / R2 独立 `node` 测试脚本（10 文件 · **`10 / 10`** 全绿，`exit code = 0`）
| 脚本 | 原始输出摘要 | 退出码 |
|---|---|---:|
| `node scripts/tests/reference_catalog.test.mjs` | `Webnovel reference libraries: 8 files, index, skill routing and local links OK` | `0` |
| `node scripts/tests/init_chapter_summaries.test.mjs` | `6 passed, 0 failures` | `0` |
| `node scripts/tests/validate_project.test.mjs` | `8 passed, 0 failures` | `0` |
| `node scripts/tests/init_v3_state.test.mjs` | `PASS v3 state init and opt-in plan gate migration` | `0` |
| `node scripts/tests/plan_review.test.mjs` | `PASS Stage 2 plan review: freeze, dual reviewers, blockers, author evidence and stale checks` | `0` |
| `node scripts/tests/v3_gate.test.mjs` | `PASS integrated V3 pilot gate: 16 assertions` | `0` |
| `node scripts/tests/r2_review.test.mjs` | `PASS R2 reviews: isolation IDs, no-skips, blockers, stale hashes, arc, finalization` | `0` |
| `node scripts/tests/audit_story_state.test.mjs` | `PASS story state audit` | `0` |
| `node scripts/tests/check_repetition.test.mjs` | `PASS repetition scanner: 2 assertions` | `0` |
| `node scripts/tests/prepare_pilot_review.test.mjs` | `PASS pilot review preparer` | `0` |

### 3. Python `unittest` 测试套件（2 文件 · **`12 / 12`** 通过，`0.956s`）
- **原始命令**：`python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v`
- **结果**：`Ran 12 tests in 0.956s — OK`（退出码 `0`），其中 `test_snapshot.py` **`2/2`**（`0.019s`）、`test_webnovel_knowledge.py` **`10/10`**（`0.890s`）。

> **口径透明说明**：冻结文档 `08` 中曾沿用早期合并简记“Node `89/89` + Python `12/12`”；经本次 `P0-0` 实时复跑核实，当前主基线精确自动化测试构成为 **19 个测试文件（7 个 R3 `node --test` 共 `71/71` 用例 + 10 个 V3/R2 独立 Node 脚本 `10/10` 全绿 + 2 个 Python `unittest` 共 `12/12` 用例）**，全部 100% 通过，零失败、零跳过，固化为 `P0-1`~`P0-6` 零回归基线。

---

## 四、全仓 S1 严重级别下游消费者普查与 `ENG-FIX-P1` 精确核实

### 1. 直接硬编码 S1 严重程度枚举的核心脚本（5 处）
| 文件与精确行号 | 当前硬编码行为 | 风险与 `P0-1` 兼容改造要求 |
|---|---|---|
| [`scripts/r2_review_common.mjs`](../../../scripts/r2_review_common.mjs#L43-L58) | L43 强校验 `!['BLOCKER','MAJOR','MINOR'].includes(i.severity)`；L54–58 判定 `pass_candidate` 下 `R2_UNRESOLVED_ISSUES` | **高（直接拒收 `SUGGESTION`）**：仅在 R3/S1 四级模式下扩展接收 `SUGGESTION` 且硬强制 `blocking !== true`、`mustCloseInReReview !== true`；**严禁改变任何 R2 三级历史报告判定语义** |
| [`scripts/r3_p1_common.mjs`](../../../scripts/r3_p1_common.mjs#L106-L129) & [`L205-L206`](../../../scripts/r3_p1_common.mjs#L205-L206) | ① **L118 隐性漏洞**：`classification==='A'` 仅排除了 `i.severity==='MINOR'`（若 `SUGGESTION` 误配 `A` 会漏拦）；<br>② **L125 强绑定**：`classification==='C'` 强要求 `i.severity==='MINOR'`；<br>③ **L46/L206**：`readFeedback` 与 `legacyCandidates` 仅处理 `fix_in_arc/defer_to_final` 与 `MINOR` | **高（`P0-1` 核心改造点）**：① L118 改为 `!['BLOCKER','MAJOR'].includes(i.severity)`；② 显式界定 `SUGGESTION` 永不阻断、0% 进入 `deferredIssues` 债务池、若被标 `blocking: true` / `mustCloseInReReview: true` / `disposition: 'fix_now'` 直接硬拒收；③ 保持历史旧三级报告只读兼容 |
| [`scripts/v3_common.mjs`](../../../scripts/v3_common.mjs#L79-L95) | L79 强校验 `!['BLOCKER','MAJOR','MINOR'].includes(issue.severity)`（供 `submit_pilot_review.mjs` 与 `v3_gate.mjs` 调用） | **中（Pilot 审稿入口）**：向后兼容接受 `SUGGESTION`（非阻断，且拒收越权阻断标记），不改变 `BLOCKER`/`MAJOR`/`MINOR` 既有规则 |
| [`scripts/r3_plan_common.mjs`](../../../scripts/r3_plan_common.mjs#L118-L129) | L118 强校验 `!['BLOCKER','MAJOR','MINOR'].includes(item.severity)`；L122 要求 `BLOCKER`/`MAJOR` 必填 `reverseDefense` | **中（R3 核心/卷审入口）**：同步兼容 `SUGGESTION`（`reverseDefense` 非必填、永不阻断） |
| [`scripts/plan_review_common.mjs`](../../../scripts/plan_review_common.mjs#L56-L69) | L56 强校验 `!['BLOCKER','MAJOR','MINOR'].includes(i.severity)`（R2/V3 Stage 2 蓝图审稿） | **低（R2 专属范围）**：按“R2 零破坏”原则保持既有 R2 三级逻辑不动 |

### 2. 间接调用/透传脚本与非 S1 同名字段区分
- **间接透传消费者（5 个）**：`scripts/r2_review.mjs`、`scripts/submit_pilot_review.mjs`、`scripts/v3_gate.mjs`、`scripts/r3_p1.mjs`、`scripts/r3_feedback_view.mjs`（其中 `r3_feedback_view.mjs` 不直接读 `.severity`，依赖 `r3_p1_common.mjs` 保证 `SUGGESTION` 不混入 `deferredIssues`）；均须纳入 `P0-1` 双向兼容回归测试（`TC-P0-1-3`）。
- **同名非 S1 字段（2 个，无需改 S1）**：`scripts/audit_story_state.mjs`（L31/85 使用内部 `severity: 'review' | 'blocking'`）与 `scripts/r3_delivery_check.mjs`（检查 `gate.issues` 门禁码，非审稿报告 S1 枚举）。
- **文档与生产模板引用**：`references/v3/` 共 9 份文件提及 `BLOCKER/MAJOR/MINOR`（按红线，`P0-6` 验收通过并获作者批准前严禁修改）。

### 3. `ENG-FIX-P1` 精确归属审计（重要发现）
经回溯历史校准报告与当前主基线源码，**`ENG-FIX-P1`** 存在两层精确边界，须在实施中严格对号入座：
1. **主基线当前真实存在的 P1 遗留字段校验漏洞（由 `P0-1` 直接修复）**：`scripts/r3_p1_common.mjs` L118（仅排除 `MINOR` 未排除 `SUGGESTION`）、L125（`C` 类硬绑定 `MINOR`）及 `SUGGESTION` 越权标记 `blocking: true` / `mustCloseInReReview: true` 时缺少硬拒收校验。
2. **历史离线报告中登记的 `ENG-FIX-P1` 两处工程 Bug（对应脚本目前不在主基线中）**：
   - **Bug-1**：`r3_atomic_ops.mjs` `prepare-chapter --with-precheck` 预检自修空增 `revision`（同时主基线 `r2_review.mjs` L51 每次 `prepare` 均无条件递增 `revision`）→ 由 **`P0-4`** 在复合指纹与 `prepare` 防空增中彻底解决；
   - **Bug-2**：`r3_telemetry.mjs` 误按 `revisionsCount - 1` 推算返工轮次且硬编码 `r === 1` 读首审结论 → 该脚本不在主基线，待后续引入遥测模块时原生按实际 `report-chNNN-v*.json` 列表实现。

---

## 五、G1–G6 离线验证集就绪度审计与 `G2-B` `underpowered` 缺口清册

> **铁律**：严禁将历史校准集与独立 Holdout 合并统计；严禁因样本不足而降低冻结标准；研发测试小说许可证状态保持 `REVIEW`（不擅自选定许可证）。

| 门禁 | 冻结要求（$N_{\text{ch}} / N_{\text{case}} / K_{\text{rep}}$） | 当前核实就绪度 | 当前存放位置（脱敏） | 精确缺口与状态 |
|---|---|---|---|---|
| **G1 · 高召回防线**（`Regression/Calibration`） | Track 2 `N_ch=9, N_pos=40, K=3` + 7 章回归 `K=1` | Track 2 原件 **74 项完整**（73 定论：`40` 阻断 + `33` 非阻断，+ `1` 争议 `ORIG-18`/`CAL-71`，来源 `Arm 0/1/2 × Ch 1–3` 共 9 章）+ 7 章回归（`DOC-1/4/5` + `OLD-HOLD-1..4`）原件均在本地 VM | 本地 VM `<ART_ROOT>/scratch/phase1-calibration-offline/` 与 `phase1-calibration-v2/`（未入主仓） | ✅ 原始样本完整（Tier 2 关键证据，须在 `P0-6` 前确认受控访问/归档方式） |
| **G2-A · 历史回归控误报**（`Regression/Calibration`） | `N_ch=9, N_neg=33, K=3`（**严禁与 G2-B 混算**） | **9 章 / 33 条定论非阻断案例**原件完整（同属 Track 2 历史集） | 同上 | ✅ 原始样本完整（仅作历史回归，**通过 ≠ G2-B 通过**） |
| **G2-B · 独立非阻断泛化验证**（`Independent Holdout`） | **全新未见 `N_ch >= 20`、`N_neg >= 60`**（单章 `<= 3` 条、`>= 3` 题材、`0` 章重叠、`K=3`、双评委+第三仲裁定案） | **已核实就绪：`0` 章 / `0` 案例** | 无（尚未建设） | 🔴 **`underpowered`**：精确缺口 **`+20` 个全新独立来源章节、`+60` 条独立非阻断案例**（覆 `>=3` 题材、单章 `<=3` 条） |
| **G3 · 清白段落零误杀** | `N_ch >= 10` 独立章、`N_case >= 15` 独立清白段（每章 `1–2` 段、`K=3`） | 历史 Track 2 `S4_CLEAN_CONTROL` 仅含 **9 章 / 9 段**（全来自单题材《器痕录》3 Arm） | 本地 VM `phase1-calibration-offline/` | ⚠️ **样本不足**：至少缺 **`+1` 个独立章节、`+6` 个独立清白段落**（严禁从 2–3 章凑满 15 段） |
| **G4 · 有序四级稳定与零泄漏** | 覆盖 `>=8` 来源章、`N_case=24`、`K=2` | `four-class-24.json` **24 项完整**（4 BLOCKER / 8 MAJOR / 6 MINOR / 6 SUGGESTION；20 真实 + 4 合成，覆盖 18 份稿件切片） | 本地 VM `phase1-calibration-v2/four-class-24.json` | ✅ 原始样本完整 |
| **G5 · `OR6` 防漂白与工程兼容** | `>=3` 独立大纲死锁章 + 合法桥段样本（`CAL-49/62` 等）+ S1 兼容单测 | 历史仅 **1 篇已知大纲死锁章**（`V22-H4`《盐引旧账》Ch 1，已揭盲）；合法桥段（`CAL-49/62/11`）在 Track 2 中 | 本地 VM `phase1-calibration-v2.2/` & `phase1-calibration-offline/` | ⚠️ **死锁章不足**：至少缺 **`+2` 篇独立大纲死锁章**；工程兼容单测随 `P0-1` 补齐 |
| **G6 · 跨题材 Holdout 有限预算工程准入筛查** | 4–6 题材 × `N_ch = 12–16` 未揭盲完整章（`N_pos >= 30, N_neg >= 40, K=1`） | **已核实就绪：`0` 章 / `0` 案例** | 无（尚未建设） | 🔴 **`underpowered`**：精确缺口 **`+12..16` 个未揭盲跨题材完整章、`+30` 客观正例、`+40` 独立非阻断案例**（覆 4–6 题材） |

### 禁入退役章节黑名单（严禁混入 `G2-B` 与 `G6` 独立集）
以下全部历史已揭盲或参与规则校准的章节强制列入 `P0-6` 防泄漏黑名单（由 `P0-6` 统计脚本硬断言拦截）：
1. 历史校准/回归来源章：`Arm 0 / Arm 1 / Arm 2` × `Ch 1–3`（《器痕录》9 章，含 `DOC-1..6`）、`Step 3`《器痕录》Ch 1–3、`live-eval`《残器长生》与《降本增笑》已揭盲章节；
2. 早期 Holdout：`OLD-HOLD-1` ~ `OLD-HOLD-4`（`HOLD-1..4`）；
3. v2.1 Holdout：`NH-1` ~ `NH-5`；
4. v2.2 Holdout：`V22-H1` ~ `V22-H4`（含《潮汐证词》Ch 1、《盐引旧账》Ch 1）。

---

## 六、按需历史资产补充判定与 `P0-1` ~ `P0-6` 实施建议（遵循 `DEC-11`）

1. **是否需要为 `P0-1` ~ `P0-5` 补充任何历史文件？**
   - **否**。`P0-1`（S1 四级兼容）、`P0-2`（写手语域防火墙）、`P0-3`（`precheck v2`）、`P0-4`（复合审读指纹与 Fail-Closed）、`P0-5`（A/B/C 沙箱原型）均仅依赖主仓现有代码与冻结规格，**不依赖 Google Drive 历史包、不依赖 ChatGPT 聊天文件库、不要求推送本地实验分支**。
2. **唯一真实数据阻塞在 `P0-6` 前置阶段**：
   - 在推进到 `P0-6` 正式裁决前，必须完成 **`G2-B`（`+20` 章 / `+60` 案例）**、**`G3` 缺口（`+1` 章 / `+6` 段）**、**`G5` 缺口（`+2` 死锁章）**与 **`G6`（`12–16` 章）**的新建与独立定案（测试小说许可证状态维持 `REVIEW`）；未补齐前 `P0-6` 强制保持 `BLOCKED` + `underpowered`。
3. **零代码污染自检与对比区间说明（`TC-P0-0-3`）**：
   - **为何采用 `2d6061d6..86cbc9f3` 校验 `P0-0` 自身增量**：从冻结架构基线 `b5572a943f9157cda07faa7910dcbfd20b1a3ba5` 至 `2d6061d6cd0e8b4b2da77619cb58239c44dc332e` 之间，已存在 10 个经 GPT-6 验收通过（`ACCEPTED`）的仓库级文档与 P0 管理 PRD 提交（涉及 `README.md`、`README_V3.md`、`docs/PROJECT-CONTEXT.md`、`docs/AGENT-HANDOFF.md`、`docs/RESEARCH-ASSET-POLICY.md`、`docs/PROJECT-ASSET-INDEX.md` 及 `docs/r3/p0-implementation/`）。因此，用 `git diff --name-status 2d6061d6..86cbc9f3` 专门验证 `P0-0` 自身增量仅触及 `docs/r3/p0-implementation/` 下 4 份文档、零越界；同时 `git diff --name-status b5572a94..86cbc9f3` 证实全阶段对 `SKILL.md`、`scripts/`、`tests/`、`references/`、`.github/` 与 `docs/r3/review-v3/` 均为 **0 字节改动**。

---

## 附录 A：冻结基线 `b5572a943f9157cda07faa7910dcbfd20b1a3ba5` 完整文件清单（73 文件，零通配符）

> 验证命令：`git ls-tree -r --name-only b5572a94 -- SKILL.md scripts tests references/v3`

### A.1 Skill 入口（1 个）
1. `SKILL.md`

### A.2 `scripts/` 全部脚本文件（不含 `scripts/tests/`，共 37 个：32 `.mjs` + 5 `.py`）
1. `scripts/audit_story_state.mjs`
2. `scripts/chapter_wordcount_common.mjs`
3. `scripts/check_chapter_wordcount.mjs`
4. `scripts/check_repetition.mjs`
5. `scripts/create_snapshot.py`
6. `scripts/init_chapter_summaries.mjs`
7. `scripts/init_v3_state.mjs`
8. `scripts/plan_review_common.mjs`
9. `scripts/plan_review.mjs`
10. `scripts/prepare_pilot_review.mjs`
11. `scripts/r2_review_common.mjs`
12. `scripts/r2_review.mjs`
13. `scripts/r3_continuity_common.mjs`
14. `scripts/r3_delivery_check.mjs`
15. `scripts/r3_delivery.py`
16. `scripts/r3_diff.mjs`
17. `scripts/r3_experience_drive.mjs`
18. `scripts/r3_experience.mjs`
19. `scripts/r3_feedback_view.mjs`
20. `scripts/r3_intake.mjs`
21. `scripts/r3_manuscripts.mjs`
22. `scripts/r3_p1_common.mjs`
23. `scripts/r3_p1.mjs`
24. `scripts/r3_plan_common.mjs`
25. `scripts/r3_plan.mjs`
26. `scripts/r3_plan_sections.mjs`
27. `scripts/r3_snapshots.mjs`
28. `scripts/r3_state_common.mjs`
29. `scripts/r3_structured_checks.mjs`
30. `scripts/record_pilot_approval.mjs`
31. `scripts/restore_snapshot.py`
32. `scripts/submit_pilot_review.mjs`
33. `scripts/v3_common.mjs`
34. `scripts/v3_gate.mjs`
35. `scripts/validate_project.mjs`
36. `scripts/verify_snapshot.py`
37. `scripts/webnovel_knowledge.py`

### A.3 `tests/` 全部文件（1 个）
1. `tests/r3-routing.test.mjs`

### A.4 `scripts/tests/` 全部测试文件（18 个：16 `.mjs` + 2 `.py`）
1. `scripts/tests/audit_story_state.test.mjs`
2. `scripts/tests/check_repetition.test.mjs`
3. `scripts/tests/init_chapter_summaries.test.mjs`
4. `scripts/tests/init_v3_state.test.mjs`
5. `scripts/tests/plan_review.test.mjs`
6. `scripts/tests/prepare_pilot_review.test.mjs`
7. `scripts/tests/r2_review.test.mjs`
8. `scripts/tests/r3_experience_drive.test.mjs`
9. `scripts/tests/r3_experience.test.mjs`
10. `scripts/tests/r3_faults.test.mjs`
11. `scripts/tests/r3_intake.test.mjs`
12. `scripts/tests/r3_plan_protocol.test.mjs`
13. `scripts/tests/r3_plan_sections.test.mjs`
14. `scripts/tests/reference_catalog.test.mjs`
15. `scripts/tests/test_snapshot.py`
16. `scripts/tests/test_webnovel_knowledge.py`
17. `scripts/tests/v3_gate.test.mjs`
18. `scripts/tests/validate_project.test.mjs`

### A.5 `references/v3/` 全部规范与模板文件（16 个）
1. `references/v3/acceptance.md`
2. `references/v3/craft-and-redteam.md`
3. `references/v3/creative-lab.md`
4. `references/v3/editorial-gate.md`
5. `references/v3/interactive-intake.md`
6. `references/v3/interactive-planning.md`
7. `references/v3/operational-runbook.md`
8. `references/v3/plan-review-protocol.md`
9. `references/v3/r2-review-agent-template.md`
10. `references/v3/r3-markdown-sections.md`
11. `references/v3/r3-operational-runbook.md`
12. `references/v3/r3-p1-protocol.md`
13. `references/v3/review-agent-template.md`
14. `references/v3/state-and-backup.md`
15. `references/v3/story-architecture.md`
16. `references/v3/workflow.md`

---

## 附录 B：本地实验分支 `c0966b12` 完整 19 文件差异清单（保留不合并实验分支既定决定）

> 验证命令：`git diff --name-status b5572a94..c0966b129135b8ec0d2fd38f90d8b34d2f92f6e9 -- SKILL.md scripts tests references`（共 19 个文件：新增 `A` 8 个、修改 `M` 11 个、删除 `D` 0 个；`+2461 / -60`）。**既定决定：严禁整枝合并 `feat/r3-phase1-throughput-o1-o3`。**

| # | 相对路径 | 变更类型 | 增删行 | 风险与与冻结架构 `v1.2.3` 的冲突 | 对应 P0 / P1 任务与处置 |
|---:|---|---|---|---|---|
| 1 | `references/v3/craft-and-redteam.md` | 修改 (`M`) | `+5 / -0` | 提前改动生产创作红队规范（M1–M4 实验文案） | `P0-6` 验收并获作者准入批准前禁止改生产模板 |
| 2 | `references/v3/interactive-planning.md` | 修改 (`M`) | `+3 / -3` | 提前改动生产规划模板（M3/M4 字段） | `P0-6` 验收并获作者准入批准前禁止改生产模板 |
| 3 | `references/v3/operational-runbook.md` | 修改 (`M`) | `+1 / -1` | 提前改动旧 V3/R2 运行手册（存在 R2 行为波及风险） | 不合并；严守 R2 零破坏 |
| 4 | `references/v3/r2-review-agent-template.md` | 修改 (`M`) | `+3 / -1` | 提前改动 R2/单章生产审稿模板 | `P0-5` 仅隔离沙箱验证；`P0-6` 过审批准前禁止改动 |
| 5 | `references/v3/r3-markdown-sections.md` | 修改 (`M`) | `+7 / -3` | 提前改动生产 Markdown 分区规范（M3 双节奏示范段） | `P0-6` 验收并获作者准入批准前禁止改动 |
| 6 | `references/v3/r3-operational-runbook.md` | 修改 (`M`) | `+3 / -3` | 提前改动生产 R3 运行手册 | `P0-6` 验收并获作者准入批准前禁止改动 |
| 7 | `references/v3/r3-phase1-throughput-protocol.md` | 新增 (`A`) | `+34 / -0` | 属旧 Phase 1 O1–O3 实验协议，未覆盖 `v1.2.3` 语域防火墙与 A/B/C 三方案 | 不合并；留作历史只读参考 |
| 8 | `references/v3/review-agent-template.md` | 修改 (`M`) | `+3 / -3` | 提前改动生产主审稿模板 | `P0-5` 隔离原型验证；`P0-6` 过审批准前禁止替换 |
| 9 | `references/v3/story-architecture.md` | 修改 (`M`) | `+1 / -1` | 提前改动生产故事架构规范 | `P0-6` 验收并获作者准入批准前禁止改动 |
| 10 | `references/v3/workflow.md` | 修改 (`M`) | `+2 / -2` | 提前改动生产工作流（可能波及 R2 流程） | 不合并；严守 R2 零破坏 |
| 11 | `scripts/build_chapter_brief.mjs` | 新增 (`A`) | `+299 / -0` | 未实现语域纯净度 Fail-Closed 断言，未强制锁定“倒数第二：文风锚点 → 最末位：上章结尾”顺序 | **`P0-2`**：按冻结 `03` 2.1 节新建写手语域防火墙模块 |
| 12 | `scripts/build_review_pack.mjs` | 新增 (`A`) | `+415 / -0` | L195 无差别过滤 `status==='open'` 会把 `SUGGESTION` 拉入复审闭环；缺五元组指纹与 6 维取证槽 | **`P0-4` / `P0-5`**：按冻结 `06` 协议受控重构 |
| 13 | `scripts/chapter_wordcount_common.mjs` | 修改 (`M`) | `+49 / -7` | M4 可选软上限解析扩展，直接合并存在修改既有字数脚本行为风险 | **`P0-3`**：仅只读参考 `parseOptionalMaxWords`，保持原脚本外部行为不变 |
| 14 | `scripts/check_chapter_wordcount.mjs` | 修改 (`M`) | `+153 / -36` | M4 命令行选项改造，直接合并可能影响旧脚本调用方 | 不合并；`P0-3` 在 `precheck v2` 中独立实现默认非阻断字数告警 |
| 15 | `scripts/precheck_chapter.mjs` | 新增 (`A`) | `+370 / -0` | **硬冲突**：旧版对低于 `minWordsPerChapter` 与重复长段直接 `exit 1` 硬阻断，违背 `06` 防误杀规范，且无 `NEEDS_SEMANTIC_AUDIT` 提取 | **`P0-3`**：严格按冻结 `06` `PrecheckV2Output`（`schemaVersion: 2`）从零合规新建 |
| 16 | `scripts/r3_atomic_ops.mjs` | 新增 (`A`) | `+338 / -0` | 含 `ENG-FIX-P1` **Bug-1**：`prepare-chapter --with-precheck` 预检自修空增 `revision` | **`P0-4` / P1**：`P0-4` 解决不空增 `revision`，P1 `r3_ops.mjs` 原生规避 |
| 17 | `scripts/r3_telemetry.mjs` | 新增 (`A`) | `+318 / -0` | 含 `ENG-FIX-P1` **Bug-2**：按最大版本号误算返工轮次且硬编码 `r===1` 读首审结论 | **P1 / `Perf-Track`**：后续引入遥测时按磁盘实际 `report-chNNN-v*.json` 列表原生实现 |
| 18 | `scripts/tests/check_chapter_wordcount.test.mjs` | 新增 (`A`) | `+199 / -0` | 绑定第 13–14 项 M4 实验改动（5 个 `test()` 块） | 随 **`P0-3`** 新建 `scripts/tests/precheck_chapter_v2.test.mjs` 覆盖 |
| 19 | `scripts/tests/r3_phase1_throughput.test.mjs` | 新增 (`A`) | `+258 / -0` | 绑定第 11–12、15–17 项旧实验脚本（3 个 `test()` 块） | 随 **`P0-2`~`P0-5`** 各自新建对应测试套件 |

---

## 附录 C：历史实验资产脱敏 Manifest（G1 / G2-A / G3 / G4 / G5）与 G2-B / G6 零样本核查依据

> **路径映射说明（`<ART_ROOT>`）**：下表中的 `<ART_ROOT>` 指向当前 Antigravity 会话 VM 的本地持久化 Artifact 根目录：  
> `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/bb9496c7-61be-4b01-ad65-2da947e559e6`  
> 上述历史实验数据与测试小说样本（测试小说许可证状态维持 `REVIEW`）仅留存于本机 VM 沙箱用于离线核验，**不上传公开仓库**；本附录仅提供可独立复核的脱敏元信息与完整性校验摘要。

### C.1 G1 / G2-A / G3 / G4 / G5 已有历史样本及退役黑名单脱敏 Manifest

| 样本类别 | 脱敏路径（相对 `<ART_ROOT>`） | 文件大小（Bytes） | SHA-256（完整 64 位） | 章节数 / 案例数 | 是否已揭盲 |
|---|---|---:|---|---|---|
| `G1 / G2-A / G3 / G5`（Track 2 Batch 1） | `scratch/phase1-calibration-offline/batch-1.json` | `31,810` | `6858cbfb5fca6f672e6edaddc30627a5d78eff8216fbd16e0d140d1d42c758cd` | 跨 `9` 源章（16 稿切片）/ `25` 案例 | **已揭盲**（历史校准集） |
| `G1 / G2-A / G3 / G5`（Track 2 Batch 2） | `scratch/phase1-calibration-offline/batch-2.json` | `29,776` | `dd8b7426651412fb6564dca99c1d446185d73a18b0f284b7701c7cefec841313` | 跨 `9` 源章（14 稿切片）/ `25` 案例 | **已揭盲**（历史校准集） |
| `G1 / G2-A / G3 / G5`（Track 2 Batch 3） | `scratch/phase1-calibration-offline/batch-3.json` | `29,258` | `1ac1d8970aef79c2d9d1eedadd6d04858cc1ddd4f8c0193b76ab6b5d4dc75264` | 跨 `9` 源章（11 稿切片）/ `24` 案例 | **已揭盲**（历史校准集） |
| `G1 / G2-A / G3 / G5`（Track 2 & Track 1 私钥） | `scratch/phase1-calibration-offline-private-key.json` | `17,856` | `669b00a3985a2a45b7edb12fec756edf718a276d304f58014bf92b547df19184` | `9` 源章 / `74` 案例（73 定论：`40` 阻断 + `33` 非阻断 [含 `9` 条 `S4` 清白段] + `1` 争议 `ORIG-18`）+ Track 1 `6` 章 | **已揭盲**（历史校准集） |
| `G1 / G2-A / G3`（R1 评委记录） | `scratch/phase1-cal-r1-hostonly.json` | `7,711` | `552ffd81fa8cf9fcf011c459ce408234cf7011758a7d0a5a476202f159772e27` | `9` 源章 / `74` 项评审 | **已揭盲** |
| `G1 / G2-A / G3`（R2 评委记录） | `scratch/phase1-cal-r2-hostonly.json` | `16,117` | `b8dc5c427d9f150e0d1e3238a816a061567abca47bfe0f7c16e71dfa113f6e79` | `9` 源章 / `74` 项评审 | **已揭盲** |
| `G1 / G2-A / G3 / G5`（R3 仲裁定案） | `scratch/phase1-r3-arbitration-cases-hostonly.json` | `49,220` | `5ad1274620f332ac3279d841e3e0aea84e9c2f847eb5d921406de208b4dd4a04` | 13 稿切片 / `27` 项分歧仲裁 | **已揭盲** |
| `G1`（7 章回归：`DOC-1` 索引） | `scratch/phase1-calibration-offline/track1-chapters/DOC-1.json` | `117` | `c04e0f3076e9071a5f78ed023967a46d6b1cbd0579daa775c6e63e8f63f39600` | `1` 章（Arm 0 Ch 1 v1）/ 整章回归 | **已揭盲**（历史回归） |
| `G1`（7 章回归：`DOC-4` 索引） | `scratch/phase1-calibration-offline/track1-chapters/DOC-4.json` | `150` | `ab5c9ab8b11662d7f0ddb5393a43fe8a5758497f42a59db1ec85027e558cf5f5` | `1` 章（Arm 1 Ch 2 终稿，含 `BX-03`）/ 整章回归 | **已揭盲**（历史回归） |
| `G1`（7 章回归：`DOC-5` 索引） | `scratch/phase1-calibration-offline/track1-chapters/DOC-5.json` | `181` | `d1bc9efd23ab1feda40c446d99b236b8366720d46506db36110f5de5d895e87e` | `1` 章（Arm 2 Ch 3 v1，含 `CAL-27/05`）/ 整章回归 | **已揭盲**（历史回归） |
| `G1`（7 章回归：`OLD-HOLD-1..4` 清单） | `scratch/phase1-calibration-v2/holdout/holdout-manifest.json` | `914` | `d7bfa9120f328b970ed02f0aff56d4b04c5804a858ae69daa6bc7236180fb30e` | `4` 章（3 仙侠 + 1 职场）/ 整章回归（含 16 灵碎等） | **已揭盲**（历史回归，禁入 G2-B/G6） |
| `G4`（四级分类探针集） | `scratch/phase1-calibration-v2/four-class-24.json` | `22,186` | `b679ae43d204c5c6ce189741cdec059f510209fadccaa90a87dd5ad745745052` | 覆盖 `18` 稿件切片 / `24` 案例（`4` BLOCKER / `8` MAJOR / `6` MINOR / `6` SUGGESTION） | **已揭盲**（历史探针） |
| `G4 / G1(OLD-HOLD)` 私钥 | `scratch/phase1-calibration-v2-private-key.json` | `3,389` | `a07c24d1acac65914a75a2ce3f5616b7f3a31fb798ce2915a044487b21c401a4` | `fourClassKey`（`24` 项，20 真实 + 4 合成）+ `holdoutKey`（`4` 章） | **已揭盲** |
| 黑名单（`NH-1..5` 清单） | `scratch/phase1-calibration-v2.1/new-holdout/new-holdout-manifest.json` | `1,228` | `e110d4f52e21e30766b91603a0e1dc01cedc2379d14e497f7056117e03400bc8` | `5` 章（3 仙侠 + 2 职场） | **已揭盲退役**（严禁入 G2-B/G6） |
| 黑名单（`NH-1..5` 私钥） | `scratch/phase1-calibration-v2.1-private-key.json` | `760` | `3b4f8f2086b06950491fc66454589f78fc531616722e1f8b251504ef786842f5` | `5` 章标定键 | **已揭盲退役** |
| `G5`（`V22-H4` 死锁章）& 黑名单（`V22-H1..4` 清单） | `scratch/phase1-calibration-v2.2/v22-holdout/v22-holdout-manifest.json` | `905` | `f80fd776c4aa3bcb3947fc483fd4d2c648ff047c014d97e59cb11040079ee0f2` | `4` 章（2 仙侠 + 1 悬疑 + 1 历史查账；其中 `V22-H4` 为当前唯一已知 `OR6` 死锁章） | **已揭盲退役**（仅 `V22-H4` 作 G5 已知死锁参考，全 4 章禁入 G2-B/G6） |
| `G5`（`V22-H4` 死锁章正文） | `scratch/phase1-calibration-v2.2/v22-holdout/texts/H4-ch01.md` | `13,362` | `ff15bffd673febfff1cd4d766cec61ebc5f629ad32f82b134b9b3ab45d18a607` | `1` 章（《盐引旧账》Ch 1，含 3000 引会计死锁 + 廿六/廿三日期差） | **已揭盲**（G5 死锁参考） |
| `G5` / 黑名单（`V22-H1..4` 私钥） | `scratch/phase1-calibration-v2.2-private-key.json` | `589` | `7c75979b8690aef4d36ac37dd8e06e74eee2f98d324c12630fbaf8e42da228d0` | `4` 章标定键 | **已揭盲退役** |

### C.2 完整性检查命令与实测输出摘要
- **校验命令（只读 Python 脚本，`-B` 禁止生成字节码）**：
  ```bash
  python3 -B -c "对上述 14 个核心 JSON 清单/私钥执行 json.load + SHA-256 校验，并递归验证其引用的全部 manuscriptFile 与 priorChapterFinalFiles 存在性与字节数"
  ```
- **实测输出摘要（2026-11-26 实跑，exit `0`）**：
  - 14 个 JSON 清单/私钥全部 `json=OK`、SHA-256 实算无报错；
  - `Track2(batch-1..3)`：引用正文文件 `18` 个，`missing = 0`，总计 `309,045` bytes；
  - `G4(four-class-24)`：引用正文文件 `21` 个，`missing = 0`，总计 `354,996` bytes；
  - `OLD-HOLD-1..4`：引用正文文件 `7` 个，`missing = 0`，总计 `117,923` bytes；
  - `NH-1..5`：引用正文文件 `10` 个，`missing = 0`，总计 `179,622` bytes；
  - `V22-H1..4`：引用正文文件 `6` 个，`missing = 0`，总计 `83,068` bytes；
  - **合计 62 份引用稿件全部完好存在（`missing = 0`）**。

### C.3 `G2-B` 与 `G6` 当前 `0` 样本结论的搜索范围与核查依据
1. **搜索范围**：
   - ① 公开主仓库 `chindden/chinese-novelist-skill` 全树（`docs/`、`scripts/tests/`、`tests/`）：仅含工程单测夹具，无独立多题材小说 Holdout 数据集；
   - ② 本地 VM Artifact 根目录 `<ART_ROOT>/` 及 `<ART_ROOT>/scratch/` 全部子目录（`live-eval/`、`step2-m1-replay/`、`step3-r3-trial/`、`phase1-throughput-exp/`、`phase1-blind-audit/`、`phase1-calibration-*`）：全部既有稿件均已用于历史实验、回归校准或已揭盲退役（见 §五禁入黑名单）；
   - ③ 前序只读核验记录的 Google Drive 历史快照（`xianmen-dazhanggui-r3-*-20261124.zip`，见 [`PROJECT-ASSET-INDEX.md`](../../PROJECT-ASSET-INDEX.md)）：属历史单题材测试连载（《仙门大掌柜》Ch 1–12），未经独立双评委+第三仲裁定案，亦未满足跨 `>=3` / `4–6` 题材未揭盲独立要求。
2. **核查结论**：确认当前符合冻结 `08` 标准的全新独立未揭盲 **`G2-B Independent Holdout` = `0` 章 / `0` 案例**、**`G6` 跨题材 Holdout = `0` 章 / `0` 案例**，维持 **`underpowered`** 诚实标记与精确缺口登记不变。
