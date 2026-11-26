# P0-0 · 研发基线审计与实施准备报告

> **任务编号**：`P0-0`（纯只读审计与实施准备，零生产代码改动） ｜ **提交状态**：`READY_FOR_REVIEW`（等待 GPT-6 独立验收；验收通过前严禁推进 `P0-1`）  
> **活跃分支**：`feat/r3-p0-controlled` ｜ **审计前 HEAD**：`2d6061d6cd0e8b4b2da77619cb58239c44dc332e`（`2026-11-26T00:52:10Z`，GPT-6 `ACCEPTED`）  
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
3. **零代码污染自检（`TC-P0-0-3`）**：
   - 自 `2d6061d6` 启动 `P0-0` 以来，本轮仅新增本审计报告并更新 `docs/r3/p0-implementation/` 内管理记录，**0 生产代码、0 Skill、0 R2、0 测试脚本、0 冻结架构文档改动**。
