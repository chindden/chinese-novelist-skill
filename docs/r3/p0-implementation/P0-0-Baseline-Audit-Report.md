# P0-0 · 研发基线审计与实施准备报告

> **任务编号**：`P0-0`（纯只读审计与实施准备，零生产代码改动） ｜ **提交状态**：`READY_FOR_REVIEW`（响应 Issue #4 第四轮复审 `CHANGES_REQUESTED` 完成 `RW-P0-0-004` 三项整改重提，等待 GPT-6 独立验收；验收通过前严禁推进 `P0-1`）  
> **活跃分支**：`feat/r3-p0-controlled` ｜ **审计前前置基线 HEAD**：`2d6061d6cd0e8b4b2da77619cb58239c44dc332e`（`2026-11-26T00:52:10Z`，GPT-6 `ACCEPTED`）  
> **原始 `P0-0` 正式交付 Commit**：`86cbc9f3ad37c635f134eeea2a89317d5eef0a3c`（`2026-11-26T02:58:13Z`；完整保留）  
> **历史整改 Commit**：`RW-P0-0-001` `9747e146e016155055b928d7a664650cb76def5c`（`03:11:59Z`）、`8ac888fce42070855241d2f17d05691b3afce709`（`03:41:39Z`）；`RW-P0-0-002` `52dd599b1e30ee3a76c682bf9ec86056e16ded10`（`05:26:25Z`）；`RW-P0-0-003` `27f5cdc06ab90a30daf2658ae32c2d637d59e710`（`05:57:24Z`；GPT-6 于 `2026-11-26T06:05:07Z` 第四轮复审确认 Git 边界、Manifest 结构与本地边界披露通过，要求补齐全部可读文本扫描、Manifest 可复算资格计数及 G4 `underpowered` 口径 → 本版 `RW-P0-0-004`）  
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
> **独立复跑边界明确说明**：上述 Node `71/71`、10 个 V3/R2 独立 Node 脚本及 Python `12/12` 均属于 **Neon 在本地受控环境（`feat/r3-p0-controlled` @ `2d6061d6`）实测并记录的基线测试证据**；**GPT-6 在独立验收中未在独立运行环境重新执行上述 Node/Python 测试，因此严禁将其表述为“经 GPT-6 独立复跑通过”**。

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
| **G4 · 有序四级稳定与零泄漏** | 覆盖 `>=8` 独立来源章、`N_case=24`、`K=2` | `four-class-24.json` **24 项探针完整**（4 BLOCKER / 8 MAJOR / 6 MINOR / 6 SUGGESTION；20 真实 + 4 合成，覆 18 目标切片 / 21 总引用）；按冻结 `08` 独立章节口径（区分 `N_ch` 与重复运行/Arm 次数）：**独立来源章节 `N_ch = 3`（《器痕录》Ch 1–3，`< 8`）**；另含 `9` 个 `Arm × Chapter` 运行实例（仅作重复运行/Arm 维度报告，不得充当 9 个独立来源章；详见附录 C.4） | 本地 VM `phase1-calibration-v2/four-class-24.json` | 🔴 **`underpowered`（独立来源章 `N_ch = 3 < 8`）**：精确缺口 **`+5` 个独立故事来源章节**（保留 24 案例有序四级探针价值，但**不宣称满足 8 个独立来源章节门槛**） |
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
   - 在推进到 `P0-6` 正式裁决前，必须完成 **`G2-B`（`+20` 章 / `+60` 案例）**、**`G3` 缺口（`+1` 章 / `+6` 段）**、**`G4` 缺口（`+5` 个独立来源章节，当前 `N_ch=3 < 8`）**、**`G5` 缺口（`+2` 死锁章）**与 **`G6`（`12–16` 章）**的新建与独立定案（测试小说许可证状态维持 `REVIEW`）；未补齐前 `P0-6` 强制保持 `BLOCKED` + `underpowered`。
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

### C.2 Fail-Closed 完整性校验脚本（全量 64 位 SHA-256 + 字节数断言 + 62 份引用稿件 Manifest）与真实运行输出

> **整改说明（响应 Issue #4 `CHANGES_REQUESTED` 第 1 项）**：
> 1. 将附录 C.1 全部 **18 份核心文件**（17 份 `.json` + 1 份 `.md`）的预期字节数与完整 64 位 SHA-256 写入脚本 `C1_MANIFEST` 数据结构，逐文件强断言字节数、完整 64 位 SHA-256 及 JSON/UTF-8 解析；
> 2. 将 5 组清单动态引用的全部 **62 份稿件文件**纳入 `REF_GROUPS` 数据结构，逐文件输出脱敏相对路径（相对 `<ART_ROOT>`）、字节数与完整 64 位 SHA-256，并强断言分组引用数（`18/21/7/10/6`）、总引用数（`62`）、文件集合一致、字节数与完整 SHA-256 精确匹配；
> 3. **Fail-Closed 非零退出**：任意文件缺失、哈希不符、字节数不符、解析失败、引用数量或集合不符均记入 `errors` 并以 `sys.exit(1)` 非零退出。
> 4. **独立复跑边界**：以下实跑输出由 Neon 在本地 `<ART_ROOT>` 环境执行并留痕；GPT-6 仅独立核验脚本代码结构与提交输出，未访问 Neon 本地 `<ART_ROOT>`，不表述为 GPT-6 独立复跑。

#### 修订后的完整只读 Python 校验脚本（`-B` 禁止生成字节码）
```bash
python3 -B - <<'PY'
import hashlib, json, os, sys

ART = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/bb9496c7-61be-4b01-ad65-2da947e559e6"

C1_MANIFEST = [
    ("scratch/phase1-calibration-offline/batch-1.json", 31810, "6858cbfb5fca6f672e6edaddc30627a5d78eff8216fbd16e0d140d1d42c758cd", "json"),
    ("scratch/phase1-calibration-offline/batch-2.json", 29776, "dd8b7426651412fb6564dca99c1d446185d73a18b0f284b7701c7cefec841313", "json"),
    ("scratch/phase1-calibration-offline/batch-3.json", 29258, "1ac1d8970aef79c2d9d1eedadd6d04858cc1ddd4f8c0193b76ab6b5d4dc75264", "json"),
    ("scratch/phase1-calibration-offline-private-key.json", 17856, "669b00a3985a2a45b7edb12fec756edf718a276d304f58014bf92b547df19184", "json"),
    ("scratch/phase1-cal-r1-hostonly.json", 7711, "552ffd81fa8cf9fcf011c459ce408234cf7011758a7d0a5a476202f159772e27", "json"),
    ("scratch/phase1-cal-r2-hostonly.json", 16117, "b8dc5c427d9f150e0d1e3238a816a061567abca47bfe0f7c16e71dfa113f6e79", "json"),
    ("scratch/phase1-r3-arbitration-cases-hostonly.json", 49220, "5ad1274620f332ac3279d841e3e0aea84e9c2f847eb5d921406de208b4dd4a04", "json"),
    ("scratch/phase1-calibration-offline/track1-chapters/DOC-1.json", 117, "c04e0f3076e9071a5f78ed023967a46d6b1cbd0579daa775c6e63e8f63f39600", "json"),
    ("scratch/phase1-calibration-offline/track1-chapters/DOC-4.json", 150, "ab5c9ab8b11662d7f0ddb5393a43fe8a5758497f42a59db1ec85027e558cf5f5", "json"),
    ("scratch/phase1-calibration-offline/track1-chapters/DOC-5.json", 181, "d1bc9efd23ab1feda40c446d99b236b8366720d46506db36110f5de5d895e87e", "json"),
    ("scratch/phase1-calibration-v2/holdout/holdout-manifest.json", 914, "d7bfa9120f328b970ed02f0aff56d4b04c5804a858ae69daa6bc7236180fb30e", "json"),
    ("scratch/phase1-calibration-v2/four-class-24.json", 22186, "b679ae43d204c5c6ce189741cdec059f510209fadccaa90a87dd5ad745745052", "json"),
    ("scratch/phase1-calibration-v2-private-key.json", 3389, "a07c24d1acac65914a75a2ce3f5616b7f3a31fb798ce2915a044487b21c401a4", "json"),
    ("scratch/phase1-calibration-v2.1/new-holdout/new-holdout-manifest.json", 1228, "e110d4f52e21e30766b91603a0e1dc01cedc2379d14e497f7056117e03400bc8", "json"),
    ("scratch/phase1-calibration-v2.1-private-key.json", 760, "3b4f8f2086b06950491fc66454589f78fc531616722e1f8b251504ef786842f5", "json"),
    ("scratch/phase1-calibration-v2.2/v22-holdout/v22-holdout-manifest.json", 905, "f80fd776c4aa3bcb3947fc483fd4d2c648ff047c014d97e59cb11040079ee0f2", "json"),
    ("scratch/phase1-calibration-v2.2/v22-holdout/texts/H4-ch01.md", 13362, "ff15bffd673febfff1cd4d766cec61ebc5f629ad32f82b134b9b3ab45d18a607", "md"),
    ("scratch/phase1-calibration-v2.2-private-key.json", 589, "7c75979b8690aef4d36ac37dd8e06e74eee2f98d324c12630fbaf8e42da228d0", "json"),
]

REF_GROUPS = [
    ("Track2(batch-1..3)", "scratch/phase1-calibration-offline", ["batch-1.json", "batch-2.json", "batch-3.json"], 18, 309045, {
        "scratch/phase1-calibration-offline/texts/G1-ch01-stageA.md": (13545, "c22983e345baff88bf61d15acb2fc32d6bab3e5f7084952050acd3fae1e26dc3"),
        "scratch/phase1-calibration-offline/texts/G1-ch01-stageB.md": (15429, "8b1628822d2e70a9de2f4b33fce2abd7622740acd27156f6c3dd0225b8d5d60c"),
        "scratch/phase1-calibration-offline/texts/G1-ch02-stageA.md": (15955, "7bd0b32a20bfae85678169600a1cb243fbbaf2734350046fe08a22cca0d4e4aa"),
        "scratch/phase1-calibration-offline/texts/G1-ch02-stageB.md": (17099, "b7e94353fa5bf6f90553dd400b0435fcebc90c02335d16042019d7a21b7345f5"),
        "scratch/phase1-calibration-offline/texts/G1-ch03-stageA.md": (19046, "723cff2937265171a53797a511219df6ae77772cb8ceb9422708587c067aab1b"),
        "scratch/phase1-calibration-offline/texts/G1-ch03-stageB.md": (19649, "25ec46e0fe3a2d5881003deef0d1bbf3dc445e637e5978ba13345365aa2c5376"),
        "scratch/phase1-calibration-offline/texts/G2-ch01-stageA.md": (20436, "a577ae9a818f6f21e1a16543fa91570abf470e8885cdbbfcf8c785d8fc60e9fc"),
        "scratch/phase1-calibration-offline/texts/G2-ch01-stageB.md": (21197, "6fe632266afc03252b6cc2a334ddefe55c82f33054d66968ad3d44c34ad66347"),
        "scratch/phase1-calibration-offline/texts/G2-ch02-stageA.md": (16540, "218882169b071d10b9318866d7d1593675bf60505922b187ea4e05949a845747"),
        "scratch/phase1-calibration-offline/texts/G2-ch02-stageB.md": (17988, "df6378bd7966e70aead2b66445c3ed355e40946c2033eede32ca9a5345f52eda"),
        "scratch/phase1-calibration-offline/texts/G2-ch03-stageA.md": (15405, "2273124ea5b21c68167f99971bf4e81c287f91b6834b77f6d2dcd75aa38eaafe"),
        "scratch/phase1-calibration-offline/texts/G2-ch03-stageB.md": (17086, "4e6c938fad0d4df55ecadf0f6c0c034e11f520e438b60be654341fdd99bb035b"),
        "scratch/phase1-calibration-offline/texts/G3-ch01-stageA.md": (18719, "301b43119d87b3124e42742b53234861d6a9368e243f2f40120c0f47010625e5"),
        "scratch/phase1-calibration-offline/texts/G3-ch01-stageB.md": (20650, "57151e9a3d7b72bce274091d9072d28e47f5de175a4b020bf3312e8a6b317164"),
        "scratch/phase1-calibration-offline/texts/G3-ch02-stageA.md": (14023, "5f83025a755fbf828d9a2cb45875347bd4f046b208e2dce1d57e3acd304a43a4"),
        "scratch/phase1-calibration-offline/texts/G3-ch02-stageB.md": (14779, "57be40817944b9062354bc93b8c1f56c831301a885a6995ada423e0daa0c8538"),
        "scratch/phase1-calibration-offline/texts/G3-ch03-stageA.md": (15166, "79db1af17a33549828b694c2584e0a6e7e3e2dc95f4c69a807bae7aace01bf01"),
        "scratch/phase1-calibration-offline/texts/G3-ch03-stageB.md": (16333, "ed41ac12074a76e28f7e5b7e9fb9a04950f4e62fdf41876f6a9bc6cdf356025b"),
    }),
    ("G4(four-class-24)", "scratch/phase1-calibration-v2", ["four-class-24.json"], 21, 354996, {
        "scratch/phase1-calibration-v2/fc-texts/M-01.md": (19649, "25ec46e0fe3a2d5881003deef0d1bbf3dc445e637e5978ba13345365aa2c5376"),
        "scratch/phase1-calibration-v2/fc-texts/M-02.md": (15429, "8b1628822d2e70a9de2f4b33fce2abd7622740acd27156f6c3dd0225b8d5d60c"),
        "scratch/phase1-calibration-v2/fc-texts/M-03.md": (16594, "086595bf3bfc7148769044895b72c341576555adfaaec39b40dde1af729795cf"),
        "scratch/phase1-calibration-v2/fc-texts/M-04.md": (17988, "df6378bd7966e70aead2b66445c3ed355e40946c2033eede32ca9a5345f52eda"),
        "scratch/phase1-calibration-v2/fc-texts/M-05.md": (14779, "57be40817944b9062354bc93b8c1f56c831301a885a6995ada423e0daa0c8538"),
        "scratch/phase1-calibration-v2/fc-texts/M-06.md": (16333, "ed41ac12074a76e28f7e5b7e9fb9a04950f4e62fdf41876f6a9bc6cdf356025b"),
        "scratch/phase1-calibration-v2/fc-texts/M-07.md": (15405, "2273124ea5b21c68167f99971bf4e81c287f91b6834b77f6d2dcd75aa38eaafe"),
        "scratch/phase1-calibration-v2/fc-texts/M-08.md": (16540, "218882169b071d10b9318866d7d1593675bf60505922b187ea4e05949a845747"),
        "scratch/phase1-calibration-v2/fc-texts/M-09.md": (13545, "c22983e345baff88bf61d15acb2fc32d6bab3e5f7084952050acd3fae1e26dc3"),
        "scratch/phase1-calibration-v2/fc-texts/M-10.md": (18719, "301b43119d87b3124e42742b53234861d6a9368e243f2f40120c0f47010625e5"),
        "scratch/phase1-calibration-v2/fc-texts/M-11.md": (20650, "57151e9a3d7b72bce274091d9072d28e47f5de175a4b020bf3312e8a6b317164"),
        "scratch/phase1-calibration-v2/fc-texts/M-12.md": (15166, "79db1af17a33549828b694c2584e0a6e7e3e2dc95f4c69a807bae7aace01bf01"),
        "scratch/phase1-calibration-v2/fc-texts/M-13.md": (18285, "2d219ef4fa23442b91c425d1aa7e7ac963b0d6469ef7f4d1d26bce12cbefb548"),
        "scratch/phase1-calibration-v2/fc-texts/M-14.md": (15955, "7bd0b32a20bfae85678169600a1cb243fbbaf2734350046fe08a22cca0d4e4aa"),
        "scratch/phase1-calibration-v2/fc-texts/M-15.md": (19046, "723cff2937265171a53797a511219df6ae77772cb8ceb9422708587c067aab1b"),
        "scratch/phase1-calibration-v2/fc-texts/M-16.md": (15792, "4ed3f76b7cd7467332d77cced84b7ad662e3d7384d55360d29cc31c3efc9cb98"),
        "scratch/phase1-calibration-v2/fc-texts/M-17.md": (17099, "b7e94353fa5bf6f90553dd400b0435fcebc90c02335d16042019d7a21b7345f5"),
        "scratch/phase1-calibration-v2/fc-texts/M-18.md": (14023, "5f83025a755fbf828d9a2cb45875347bd4f046b208e2dce1d57e3acd304a43a4"),
        "scratch/phase1-calibration-v2/fc-texts/M-19.md": (17086, "4e6c938fad0d4df55ecadf0f6c0c034e11f520e438b60be654341fdd99bb035b"),
        "scratch/phase1-calibration-v2/fc-texts/M-20.md": (21197, "6fe632266afc03252b6cc2a334ddefe55c82f33054d66968ad3d44c34ad66347"),
        "scratch/phase1-calibration-v2/fc-texts/M-21.md": (15716, "2b5342321459dc4ad75dc6bf279fd5033942281708369e314dcaaa029c1024bc"),
    }),
    ("OLD-HOLD-1..4", "scratch/phase1-calibration-v2/holdout", ["holdout-manifest.json"], 7, 117923, {
        "scratch/phase1-calibration-v2/holdout/texts/H1-ch01.md": (15671, "bd0a99544111017e67e7e5b04abc8109b95eadd14e32d2fc67448f0ff60bca2a"),
        "scratch/phase1-calibration-v2/holdout/texts/H2-ch02.md": (17041, "3ba78a72d1f9220bc69b0dfb40bf2c4e67e6a4b8c9307b2dfd028767c63de91f"),
        "scratch/phase1-calibration-v2/holdout/texts/H2-prior-ch01.md": (17024, "df08da6309bfda3aef0f989f30a2b40a0bc201732c0d541325f406842f9a6638"),
        "scratch/phase1-calibration-v2/holdout/texts/H3-ch03.md": (16197, "0c97e23674e66914a0c63d506a33ee73aaf6ede020b0e1bb5d3a6f17b19f2afc"),
        "scratch/phase1-calibration-v2/holdout/texts/H3-prior-ch01.md": (14140, "d3a594217ddcfcb7061b160fc7a0946f64040bd5deca8a25161a4b50e000c575"),
        "scratch/phase1-calibration-v2/holdout/texts/H3-prior-ch02.md": (15035, "e27659f913323281abcaca19e91301e9393f9d996af4abd8bc26e432687e2334"),
        "scratch/phase1-calibration-v2/holdout/texts/H4-ch01.md": (22815, "649d2cdd090fbe6a06440cd0dadc21c9e2a46fe4c12f54338bf643c071d5dfa4"),
    }),
    ("NH-1..5", "scratch/phase1-calibration-v2.1/new-holdout", ["new-holdout-manifest.json"], 10, 179622, {
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH1-ch01.md": (13505, "83ac2640781690c88fc7b26aefdf3de4b66eb90fd5bbb1010def2cdc9b02d903"),
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH2-ch02.md": (13183, "d7fbbb4e1ed9d7f801c3286406061e08c5f743044816e10c72d2b0b0c10053a2"),
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH2-prior-ch01.md": (14500, "0510609f44316690bf9a7510df5df9d1f3e64b5eadf7786723080a1c3604bd73"),
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH3-ch02.md": (13684, "76bbffb4bb303230e6f81588cd293e832405ef07fb68fd705849e36bca0b46a2"),
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH3-prior-ch01.md": (14140, "d3a594217ddcfcb7061b160fc7a0946f64040bd5deca8a25161a4b50e000c575"),
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH4-ch02.md": (19473, "d3133b2720bc531f9eecd0e3d776e0886d1e463f295c37c8789711c23b85d90c"),
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH4-prior-ch01.md": (22815, "649d2cdd090fbe6a06440cd0dadc21c9e2a46fe4c12f54338bf643c071d5dfa4"),
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH5-ch03.md": (26034, "11cb9cf5540ed54eb2525a58ba44cb98ef9fac221a3c130b47fff987c49b69cc"),
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH5-prior-ch01.md": (22815, "649d2cdd090fbe6a06440cd0dadc21c9e2a46fe4c12f54338bf643c071d5dfa4"),
        "scratch/phase1-calibration-v2.1/new-holdout/texts/NH5-prior-ch02.md": (19473, "d3133b2720bc531f9eecd0e3d776e0886d1e463f295c37c8789711c23b85d90c"),
    }),
    ("V22-H1..4", "scratch/phase1-calibration-v2.2/v22-holdout", ["v22-holdout-manifest.json"], 6, 83068, {
        "scratch/phase1-calibration-v2.2/v22-holdout/texts/H1-ch03.md": (13364, "38ea085aded6eb13ac2641860d4565a5f118bd13c0a9ff44a009f18f3132c670"),
        "scratch/phase1-calibration-v2.2/v22-holdout/texts/H1-prior-ch01.md": (14500, "0510609f44316690bf9a7510df5df9d1f3e64b5eadf7786723080a1c3604bd73"),
        "scratch/phase1-calibration-v2.2/v22-holdout/texts/H1-prior-ch02.md": (14334, "cb16b2fe7d37ea874f25d160c0105872679bc82a9224db3cc9b4fd22cd2cf291"),
        "scratch/phase1-calibration-v2.2/v22-holdout/texts/H2-ch01.md": (13559, "ddaf335ff4c6749e9649d3c87bd8053f723d99b43001cfc019c6b2cbc3b06207"),
        "scratch/phase1-calibration-v2.2/v22-holdout/texts/H3-ch01.md": (13949, "eb536aef1c3fd4c6921faddf58f2dab662dbd9e47edfab9b9114fa94081ee0ba"),
        "scratch/phase1-calibration-v2.2/v22-holdout/texts/H4-ch01.md": (13362, "ff15bffd673febfff1cd4d766cec61ebc5f629ad32f82b134b9b3ab45d18a607"),
    }),
]

errors = []
json_ok = md_ok = 0
for rel, exp_bytes, exp_sha, kind in C1_MANIFEST:
    p = os.path.join(ART, rel)
    if not os.path.isfile(p):
        errors.append(f"CORE_MISSING {rel}")
        continue
    raw = open(p, "rb").read()
    got_bytes = len(raw)
    got_sha = hashlib.sha256(raw).hexdigest()
    if got_bytes != exp_bytes:
        errors.append(f"CORE_SIZE_MISMATCH {rel}: got={got_bytes} exp={exp_bytes}")
    if got_sha != exp_sha:
        errors.append(f"CORE_SHA256_MISMATCH {rel}: got={got_sha} exp={exp_sha}")
    try:
        if kind == "json":
            json.loads(raw.decode("utf-8"))
            json_ok += 1
        else:
            raw.decode("utf-8")
            md_ok += 1
    except Exception as exc:
        errors.append(f"CORE_PARSE_ERROR {rel}: {exc}")
    print(f"CORE_OK {rel} bytes={got_bytes} sha256={got_sha} kind={kind}")

if len(C1_MANIFEST) != 18 or json_ok != 17 or md_ok != 1:
    errors.append(f"CORE_COUNT_MISMATCH total={len(C1_MANIFEST)} json_ok={json_ok} md_ok={md_ok}")
print(f"CORE_SUMMARY total={len(C1_MANIFEST)} json_ok={json_ok} md_ok={md_ok} errors={len(errors)}")

total_refs = total_bytes_all = 0
for name, base_rel, fns, exp_cnt, exp_group_bytes, exp_map in REF_GROUPS:
    base = os.path.join(ART, base_rel)
    resolved = set()
    for fn in fns:
        for item in json.load(open(os.path.join(base, fn), encoding="utf-8")):
            for r in ([item["manuscriptFile"]] if item.get("manuscriptFile") else []) + list(item.get("priorChapterFinalFiles") or []):
                cand = r if os.path.isabs(r) else os.path.join(base, r)
                if not os.path.exists(cand):
                    cand = os.path.join(os.path.dirname(base), r)
                resolved.add(os.path.relpath(cand, ART))
    if len(resolved) != exp_cnt:
        errors.append(f"GROUP_COUNT_MISMATCH {name}: got={len(resolved)} exp={exp_cnt}")
    if resolved != set(exp_map.keys()):
        errors.append(f"GROUP_SET_MISMATCH {name}: missing={sorted(set(exp_map)-resolved)} extra={sorted(resolved-set(exp_map))}")
    gbytes = 0
    for art_rel in sorted(resolved):
        p = os.path.join(ART, art_rel)
        if not os.path.isfile(p):
            errors.append(f"REF_MISSING [{name}] {art_rel}")
            continue
        raw = open(p, "rb").read()
        got_bytes = len(raw)
        got_sha = hashlib.sha256(raw).hexdigest()
        gbytes += got_bytes
        if art_rel in exp_map:
            eb, es = exp_map[art_rel]
            if got_bytes != eb:
                errors.append(f"REF_SIZE_MISMATCH [{name}] {art_rel}: got={got_bytes} exp={eb}")
            if got_sha != es:
                errors.append(f"REF_SHA256_MISMATCH [{name}] {art_rel}: got={got_sha} exp={es}")
        print(f"REF_OK [{name}] {art_rel} bytes={got_bytes} sha256={got_sha}")
    if gbytes != exp_group_bytes:
        errors.append(f"GROUP_BYTES_MISMATCH {name}: got={gbytes} exp={exp_group_bytes}")
    total_refs += len(resolved)
    total_bytes_all += gbytes
    print(f"GROUP_SUMMARY {name}: files={len(resolved)}/{exp_cnt} total_bytes={gbytes}/{exp_group_bytes}")

if total_refs != 62 or total_bytes_all != 1044654:
    errors.append(f"REFS_TOTAL_MISMATCH files={total_refs}/62 bytes={total_bytes_all}/1044654")
print(f"REFS_SUMMARY total_files={total_refs} total_bytes={total_bytes_all} errors={len(errors)}")

if errors:
    for e in errors:
        print(f"FAIL: {e}", file=sys.stderr)
    sys.exit(1)
print("ALL_INTEGRITY_ASSERTIONS_PASSED")
PY
```

#### 真实运行原始输出（exit code = `0`，零截断完整留痕）
```text
CORE_OK scratch/phase1-calibration-offline/batch-1.json bytes=31810 sha256=6858cbfb5fca6f672e6edaddc30627a5d78eff8216fbd16e0d140d1d42c758cd kind=json
CORE_OK scratch/phase1-calibration-offline/batch-2.json bytes=29776 sha256=dd8b7426651412fb6564dca99c1d446185d73a18b0f284b7701c7cefec841313 kind=json
CORE_OK scratch/phase1-calibration-offline/batch-3.json bytes=29258 sha256=1ac1d8970aef79c2d9d1eedadd6d04858cc1ddd4f8c0193b76ab6b5d4dc75264 kind=json
CORE_OK scratch/phase1-calibration-offline-private-key.json bytes=17856 sha256=669b00a3985a2a45b7edb12fec756edf718a276d304f58014bf92b547df19184 kind=json
CORE_OK scratch/phase1-cal-r1-hostonly.json bytes=7711 sha256=552ffd81fa8cf9fcf011c459ce408234cf7011758a7d0a5a476202f159772e27 kind=json
CORE_OK scratch/phase1-cal-r2-hostonly.json bytes=16117 sha256=b8dc5c427d9f150e0d1e3238a816a061567abca47bfe0f7c16e71dfa113f6e79 kind=json
CORE_OK scratch/phase1-r3-arbitration-cases-hostonly.json bytes=49220 sha256=5ad1274620f332ac3279d841e3e0aea84e9c2f847eb5d921406de208b4dd4a04 kind=json
CORE_OK scratch/phase1-calibration-offline/track1-chapters/DOC-1.json bytes=117 sha256=c04e0f3076e9071a5f78ed023967a46d6b1cbd0579daa775c6e63e8f63f39600 kind=json
CORE_OK scratch/phase1-calibration-offline/track1-chapters/DOC-4.json bytes=150 sha256=ab5c9ab8b11662d7f0ddb5393a43fe8a5758497f42a59db1ec85027e558cf5f5 kind=json
CORE_OK scratch/phase1-calibration-offline/track1-chapters/DOC-5.json bytes=181 sha256=d1bc9efd23ab1feda40c446d99b236b8366720d46506db36110f5de5d895e87e kind=json
CORE_OK scratch/phase1-calibration-v2/holdout/holdout-manifest.json bytes=914 sha256=d7bfa9120f328b970ed02f0aff56d4b04c5804a858ae69daa6bc7236180fb30e kind=json
CORE_OK scratch/phase1-calibration-v2/four-class-24.json bytes=22186 sha256=b679ae43d204c5c6ce189741cdec059f510209fadccaa90a87dd5ad745745052 kind=json
CORE_OK scratch/phase1-calibration-v2-private-key.json bytes=3389 sha256=a07c24d1acac65914a75a2ce3f5616b7f3a31fb798ce2915a044487b21c401a4 kind=json
CORE_OK scratch/phase1-calibration-v2.1/new-holdout/new-holdout-manifest.json bytes=1228 sha256=e110d4f52e21e30766b91603a0e1dc01cedc2379d14e497f7056117e03400bc8 kind=json
CORE_OK scratch/phase1-calibration-v2.1-private-key.json bytes=760 sha256=3b4f8f2086b06950491fc66454589f78fc531616722e1f8b251504ef786842f5 kind=json
CORE_OK scratch/phase1-calibration-v2.2/v22-holdout/v22-holdout-manifest.json bytes=905 sha256=f80fd776c4aa3bcb3947fc483fd4d2c648ff047c014d97e59cb11040079ee0f2 kind=json
CORE_OK scratch/phase1-calibration-v2.2/v22-holdout/texts/H4-ch01.md bytes=13362 sha256=ff15bffd673febfff1cd4d766cec61ebc5f629ad32f82b134b9b3ab45d18a607 kind=md
CORE_OK scratch/phase1-calibration-v2.2-private-key.json bytes=589 sha256=7c75979b8690aef4d36ac37dd8e06e74eee2f98d324c12630fbaf8e42da228d0 kind=json
CORE_SUMMARY total=18 json_ok=17 md_ok=1 errors=0
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G1-ch01-stageA.md bytes=13545 sha256=c22983e345baff88bf61d15acb2fc32d6bab3e5f7084952050acd3fae1e26dc3
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G1-ch01-stageB.md bytes=15429 sha256=8b1628822d2e70a9de2f4b33fce2abd7622740acd27156f6c3dd0225b8d5d60c
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G1-ch02-stageA.md bytes=15955 sha256=7bd0b32a20bfae85678169600a1cb243fbbaf2734350046fe08a22cca0d4e4aa
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G1-ch02-stageB.md bytes=17099 sha256=b7e94353fa5bf6f90553dd400b0435fcebc90c02335d16042019d7a21b7345f5
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G1-ch03-stageA.md bytes=19046 sha256=723cff2937265171a53797a511219df6ae77772cb8ceb9422708587c067aab1b
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G1-ch03-stageB.md bytes=19649 sha256=25ec46e0fe3a2d5881003deef0d1bbf3dc445e637e5978ba13345365aa2c5376
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G2-ch01-stageA.md bytes=20436 sha256=a577ae9a818f6f21e1a16543fa91570abf470e8885cdbbfcf8c785d8fc60e9fc
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G2-ch01-stageB.md bytes=21197 sha256=6fe632266afc03252b6cc2a334ddefe55c82f33054d66968ad3d44c34ad66347
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G2-ch02-stageA.md bytes=16540 sha256=218882169b071d10b9318866d7d1593675bf60505922b187ea4e05949a845747
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G2-ch02-stageB.md bytes=17988 sha256=df6378bd7966e70aead2b66445c3ed355e40946c2033eede32ca9a5345f52eda
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G2-ch03-stageA.md bytes=15405 sha256=2273124ea5b21c68167f99971bf4e81c287f91b6834b77f6d2dcd75aa38eaafe
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G2-ch03-stageB.md bytes=17086 sha256=4e6c938fad0d4df55ecadf0f6c0c034e11f520e438b60be654341fdd99bb035b
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G3-ch01-stageA.md bytes=18719 sha256=301b43119d87b3124e42742b53234861d6a9368e243f2f40120c0f47010625e5
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G3-ch01-stageB.md bytes=20650 sha256=57151e9a3d7b72bce274091d9072d28e47f5de175a4b020bf3312e8a6b317164
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G3-ch02-stageA.md bytes=14023 sha256=5f83025a755fbf828d9a2cb45875347bd4f046b208e2dce1d57e3acd304a43a4
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G3-ch02-stageB.md bytes=14779 sha256=57be40817944b9062354bc93b8c1f56c831301a885a6995ada423e0daa0c8538
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G3-ch03-stageA.md bytes=15166 sha256=79db1af17a33549828b694c2584e0a6e7e3e2dc95f4c69a807bae7aace01bf01
REF_OK [Track2(batch-1..3)] scratch/phase1-calibration-offline/texts/G3-ch03-stageB.md bytes=16333 sha256=ed41ac12074a76e28f7e5b7e9fb9a04950f4e62fdf41876f6a9bc6cdf356025b
GROUP_SUMMARY Track2(batch-1..3): files=18/18 total_bytes=309045/309045
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-01.md bytes=19649 sha256=25ec46e0fe3a2d5881003deef0d1bbf3dc445e637e5978ba13345365aa2c5376
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-02.md bytes=15429 sha256=8b1628822d2e70a9de2f4b33fce2abd7622740acd27156f6c3dd0225b8d5d60c
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-03.md bytes=16594 sha256=086595bf3bfc7148769044895b72c341576555adfaaec39b40dde1af729795cf
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-04.md bytes=17988 sha256=df6378bd7966e70aead2b66445c3ed355e40946c2033eede32ca9a5345f52eda
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-05.md bytes=14779 sha256=57be40817944b9062354bc93b8c1f56c831301a885a6995ada423e0daa0c8538
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-06.md bytes=16333 sha256=ed41ac12074a76e28f7e5b7e9fb9a04950f4e62fdf41876f6a9bc6cdf356025b
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-07.md bytes=15405 sha256=2273124ea5b21c68167f99971bf4e81c287f91b6834b77f6d2dcd75aa38eaafe
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-08.md bytes=16540 sha256=218882169b071d10b9318866d7d1593675bf60505922b187ea4e05949a845747
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-09.md bytes=13545 sha256=c22983e345baff88bf61d15acb2fc32d6bab3e5f7084952050acd3fae1e26dc3
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-10.md bytes=18719 sha256=301b43119d87b3124e42742b53234861d6a9368e243f2f40120c0f47010625e5
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-11.md bytes=20650 sha256=57151e9a3d7b72bce274091d9072d28e47f5de175a4b020bf3312e8a6b317164
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-12.md bytes=15166 sha256=79db1af17a33549828b694c2584e0a6e7e3e2dc95f4c69a807bae7aace01bf01
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-13.md bytes=18285 sha256=2d219ef4fa23442b91c425d1aa7e7ac963b0d6469ef7f4d1d26bce12cbefb548
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-14.md bytes=15955 sha256=7bd0b32a20bfae85678169600a1cb243fbbaf2734350046fe08a22cca0d4e4aa
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-15.md bytes=19046 sha256=723cff2937265171a53797a511219df6ae77772cb8ceb9422708587c067aab1b
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-16.md bytes=15792 sha256=4ed3f76b7cd7467332d77cced84b7ad662e3d7384d55360d29cc31c3efc9cb98
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-17.md bytes=17099 sha256=b7e94353fa5bf6f90553dd400b0435fcebc90c02335d16042019d7a21b7345f5
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-18.md bytes=14023 sha256=5f83025a755fbf828d9a2cb45875347bd4f046b208e2dce1d57e3acd304a43a4
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-19.md bytes=17086 sha256=4e6c938fad0d4df55ecadf0f6c0c034e11f520e438b60be654341fdd99bb035b
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-20.md bytes=21197 sha256=6fe632266afc03252b6cc2a334ddefe55c82f33054d66968ad3d44c34ad66347
REF_OK [G4(four-class-24)] scratch/phase1-calibration-v2/fc-texts/M-21.md bytes=15716 sha256=2b5342321459dc4ad75dc6bf279fd5033942281708369e314dcaaa029c1024bc
GROUP_SUMMARY G4(four-class-24): files=21/21 total_bytes=354996/354996
REF_OK [OLD-HOLD-1..4] scratch/phase1-calibration-v2/holdout/texts/H1-ch01.md bytes=15671 sha256=bd0a99544111017e67e7e5b04abc8109b95eadd14e32d2fc67448f0ff60bca2a
REF_OK [OLD-HOLD-1..4] scratch/phase1-calibration-v2/holdout/texts/H2-ch02.md bytes=17041 sha256=3ba78a72d1f9220bc69b0dfb40bf2c4e67e6a4b8c9307b2dfd028767c63de91f
REF_OK [OLD-HOLD-1..4] scratch/phase1-calibration-v2/holdout/texts/H2-prior-ch01.md bytes=17024 sha256=df08da6309bfda3aef0f989f30a2b40a0bc201732c0d541325f406842f9a6638
REF_OK [OLD-HOLD-1..4] scratch/phase1-calibration-v2/holdout/texts/H3-ch03.md bytes=16197 sha256=0c97e23674e66914a0c63d506a33ee73aaf6ede020b0e1bb5d3a6f17b19f2afc
REF_OK [OLD-HOLD-1..4] scratch/phase1-calibration-v2/holdout/texts/H3-prior-ch01.md bytes=14140 sha256=d3a594217ddcfcb7061b160fc7a0946f64040bd5deca8a25161a4b50e000c575
REF_OK [OLD-HOLD-1..4] scratch/phase1-calibration-v2/holdout/texts/H3-prior-ch02.md bytes=15035 sha256=e27659f913323281abcaca19e91301e9393f9d996af4abd8bc26e432687e2334
REF_OK [OLD-HOLD-1..4] scratch/phase1-calibration-v2/holdout/texts/H4-ch01.md bytes=22815 sha256=649d2cdd090fbe6a06440cd0dadc21c9e2a46fe4c12f54338bf643c071d5dfa4
GROUP_SUMMARY OLD-HOLD-1..4: files=7/7 total_bytes=117923/117923
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH1-ch01.md bytes=13505 sha256=83ac2640781690c88fc7b26aefdf3de4b66eb90fd5bbb1010def2cdc9b02d903
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH2-ch02.md bytes=13183 sha256=d7fbbb4e1ed9d7f801c3286406061e08c5f743044816e10c72d2b0b0c10053a2
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH2-prior-ch01.md bytes=14500 sha256=0510609f44316690bf9a7510df5df9d1f3e64b5eadf7786723080a1c3604bd73
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH3-ch02.md bytes=13684 sha256=76bbffb4bb303230e6f81588cd293e832405ef07fb68fd705849e36bca0b46a2
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH3-prior-ch01.md bytes=14140 sha256=d3a594217ddcfcb7061b160fc7a0946f64040bd5deca8a25161a4b50e000c575
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH4-ch02.md bytes=19473 sha256=d3133b2720bc531f9eecd0e3d776e0886d1e463f295c37c8789711c23b85d90c
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH4-prior-ch01.md bytes=22815 sha256=649d2cdd090fbe6a06440cd0dadc21c9e2a46fe4c12f54338bf643c071d5dfa4
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH5-ch03.md bytes=26034 sha256=11cb9cf5540ed54eb2525a58ba44cb98ef9fac221a3c130b47fff987c49b69cc
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH5-prior-ch01.md bytes=22815 sha256=649d2cdd090fbe6a06440cd0dadc21c9e2a46fe4c12f54338bf643c071d5dfa4
REF_OK [NH-1..5] scratch/phase1-calibration-v2.1/new-holdout/texts/NH5-prior-ch02.md bytes=19473 sha256=d3133b2720bc531f9eecd0e3d776e0886d1e463f295c37c8789711c23b85d90c
GROUP_SUMMARY NH-1..5: files=10/10 total_bytes=179622/179622
REF_OK [V22-H1..4] scratch/phase1-calibration-v2.2/v22-holdout/texts/H1-ch03.md bytes=13364 sha256=38ea085aded6eb13ac2641860d4565a5f118bd13c0a9ff44a009f18f3132c670
REF_OK [V22-H1..4] scratch/phase1-calibration-v2.2/v22-holdout/texts/H1-prior-ch01.md bytes=14500 sha256=0510609f44316690bf9a7510df5df9d1f3e64b5eadf7786723080a1c3604bd73
REF_OK [V22-H1..4] scratch/phase1-calibration-v2.2/v22-holdout/texts/H1-prior-ch02.md bytes=14334 sha256=cb16b2fe7d37ea874f25d160c0105872679bc82a9224db3cc9b4fd22cd2cf291
REF_OK [V22-H1..4] scratch/phase1-calibration-v2.2/v22-holdout/texts/H2-ch01.md bytes=13559 sha256=ddaf335ff4c6749e9649d3c87bd8053f723d99b43001cfc019c6b2cbc3b06207
REF_OK [V22-H1..4] scratch/phase1-calibration-v2.2/v22-holdout/texts/H3-ch01.md bytes=13949 sha256=eb536aef1c3fd4c6921faddf58f2dab662dbd9e47edfab9b9114fa94081ee0ba
REF_OK [V22-H1..4] scratch/phase1-calibration-v2.2/v22-holdout/texts/H4-ch01.md bytes=13362 sha256=ff15bffd673febfff1cd4d766cec61ebc5f629ad32f82b134b9b3ab45d18a607
GROUP_SUMMARY V22-H1..4: files=6/6 total_bytes=83068/83068
REFS_SUMMARY total_files=62 total_bytes=1044654 errors=0
ALL_INTEGRITY_ASSERTIONS_PASSED
```

### C.3 通用全文本格式深度样本审计、Manifest 可复算资格计数与范围隔离（`RW-P0-0-004`）

> **整改说明（响应 Issue #4 第四轮复审 `CHANGES_REQUESTED` 全部要求）**：
> 1. **覆盖全部可读 UTF-8 文本格式（零格式遗漏）**：不再仅扫描 `.md/.txt/.log/.diff/.json/.jsonl/.zip`；对全部 UTF-8 可解码文本文件执行全量扫描：
>    - `.csv`：逐单元格解析（`csv.reader`），扫描章节标题、长中文单元格（`>=200` 字）及章号提及；
>    - `.html`/`.htm`：提取可见文本（`HTMLParser`）并联合源码扫描章节标题、章号提及与长中文文本（`>=500` 字）；
>    - 全部代码/配置/标记文本（`.py`, `.mjs`, `.js`, `.ts`, `.tsx`, `.jsx`, `.yml`, `.yaml`, `.srt`, `.css`, `.svg`, `.ini`, `.ps1`, `.license`, `.license-mpl`, `(noext)` 等）：全文 UTF-8 解码扫描章节标题、长中文行（`>=200` 字）及含章号长中文文本（`>=1,000` 字）；
>    - `.md`/`.txt`/`.log`/`.diff`/`.json`/`.jsonl`/`.zip`：延续第三轮全文、新增行、递归字符串叶节点与 ZIP 内部成员扫描。
> 2. **严格隔离二进制媒体与嵌套 `.git` 元数据（绝不对非文本宣称“全文扫描”）**：
>    - **二进制媒体（`BIN_MEDIA`）**：主仓 `7` 份 `.png`、`ART_ROOT` `64` 份纯图片/视频（`52 .png + 1 .jpg + 1 .mp4 + 10 .webm`，0 份 PDF/DOCX）显式标为 `OUT_OF_SCOPE_BINARY_MEDIA`（未做 OCR）；
>    - **嵌套外部仓库 `.git` 内部对象（`VCS_META`）**：`scratch/ref-*/.git/` 共 `85` 个版本控制元数据对象显式标为 `OUT_OF_SCOPE_VCS`，从样本语料范围分离并单独对账（`2,723 = 2,573 TEXT + 1 ZIP + 64 BIN_MEDIA + 85 VCS_META`）。
> 3. **禁止硬编码 `eligible_g2b=0` / `eligible_g6=0`，100% 由逐文件 Manifest 复算对账**：
>    - 两份配套清单均升级为 **16 列逐文件脱敏 TSV**：新增 `scan_scope`、`g2b_eligibility`、`g6_eligibility`（枚举 `ELIGIBLE` | `INELIGIBLE` | `OUT_OF_SCOPE` | `UNRESOLVED`）：
>      - [`P0-0-C3-Full-File-Manifest.tsv`](./P0-0-C3-Full-File-Manifest.tsv)（`2,723` 行，`939,021` Bytes `< 1 MB`，SHA-256 `f05f0fe8c82a9ac47806e70f47748363e1313c26fa54c54bcc13deb2ef3d3fbe`）；
>      - [`P0-0-C3-Repo-Manifest.tsv`](./P0-0-C3-Repo-Manifest.tsv)（`293` 行，与最终提交树字节和 64 位 SHA-256 逐行一致）。
>    - 脚本**完全从 Manifest 字段汇总计算** `computed_eligible_g2b`、`computed_eligible_g6` 及每类候选/排除/合格/非样本/范围外/未决计数，强断言全部总数对账相等且 `total_unresolved == 0`（任意不符或未决即 `sys.exit(1)`）。
> 4. **独立复跑边界**：以下运行输出由 Neon 在本地 `<ART_ROOT>` 环境执行并留痕；GPT-6 仅独立核验代码逻辑、Manifest 结构与提交输出，未访问本地 `<ART_ROOT>`，不表述为 GPT-6 独立复跑。

#### 1. 通用全文本格式扫描与 Manifest 可复算对账脚本（Fail-Closed，零硬编码）
```bash
python3 -B - <<'PY'
import collections, csv, hashlib, html.parser, io, json, os, re, sys, zipfile

REPO = "/home/antigravity/chindden/chinese-novelist-skill"
ART = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/bb9496c7-61be-4b01-ad65-2da947e559e6"
ART_TSV = os.path.join(REPO, "docs/r3/p0-implementation/P0-0-C3-Full-File-Manifest.tsv")
REPO_TSV = os.path.join(REPO, "docs/r3/p0-implementation/P0-0-C3-Repo-Manifest.tsv")
MANIFEST_SELF = {
    "docs/r3/p0-implementation/P0-0-C3-Full-File-Manifest.tsv",
    "docs/r3/p0-implementation/P0-0-C3-Repo-Manifest.tsv",
}

HEADING_RE = re.compile(r"(?:^|\n)\s*#{1,6}\s*第[0-9零一二三四五六七八九十百千]+章[^\n]*")
CHAPTER_STR_RE = re.compile(r"第[0-9零一二三四五六七八九十百千]+章")
PATH_CLUE_RE = re.compile(r"(chapter|ch\d+|第[0-9零一二三四五六七八九十百千]+章|manuscript|draft|holdout|story-|pilot|texts/|正文)", re.I)

class HTMLTextExtractor(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.chunks = []
    def handle_data(self, data):
        if data.strip():
            self.chunks.append(data)

def walk_json_strings(obj):
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from walk_json_strings(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk_json_strings(v)

def inspect_universal(fp, rel, ext, raw):
    if "/.git/" in f"/{rel}":
        return "VCS_META", []
    if ext == ".zip":
        sigs = []
        if PATH_CLUE_RE.search(rel):
            sigs.append("path_clue")
        with zipfile.ZipFile(fp) as zf:
            for m in zf.namelist():
                if PATH_CLUE_RE.search(m):
                    sigs.append("zip_member_path")
                if m.endswith((".md", ".txt")):
                    if HEADING_RE.search(zf.read(m).decode("utf-8", errors="replace")):
                        sigs.append("zip_member_heading")
        return "ZIP", sorted(set(sigs))

    is_binary = b"\x00" in raw
    txt = None
    if not is_binary:
        try:
            txt = raw.decode("utf-8")
        except UnicodeDecodeError:
            is_binary = True
    if is_binary:
        return "BIN_MEDIA", []

    sigs = []
    if PATH_CLUE_RE.search(rel):
        sigs.append("path_clue")

    if ext in (".md", ".txt", ".log"):
        if HEADING_RE.search(txt):
            sigs.append("text_heading")
        if ext == ".log" and any(len(re.findall(r"[\u4e00-\u9fff]", l)) >= 150 for l in txt.splitlines()):
            sigs.append("log_long_cjk")
    elif ext == ".diff":
        added = "\n".join(l[1:] for l in txt.splitlines() if l.startswith("+") and not l.startswith("+++"))
        if HEADING_RE.search(added):
            sigs.append("diff_added_heading")
        if re.search(r"^\+\+\+\s+b/.*?(chapter|ch\d+|第.*?章)", txt, re.M | re.I):
            sigs.append("diff_chapter_target")
        if len(re.findall(r"[\u4e00-\u9fff]", added)) >= 500:
            sigs.append("diff_added_cjk>=500")
    elif ext in (".json", ".jsonl"):
        has_head = long_str = parse_err = False
        def chk(o):
            nonlocal has_head, long_str
            for s in walk_json_strings(o):
                if HEADING_RE.search(s):
                    has_head = True
                if len(re.findall(r"[\u4e00-\u9fff]", s)) >= 500:
                    long_str = True
        if ext == ".json":
            try:
                chk(json.loads(txt))
            except Exception:
                parse_err = True
        else:
            for ln in txt.splitlines():
                if not ln.strip():
                    continue
                try:
                    chk(json.loads(ln))
                except Exception:
                    parse_err = True
        if has_head:
            sigs.append("json_str_heading")
        if long_str:
            sigs.append("json_str_cjk>=500")
        if parse_err:
            sigs.append("json_parse_err")
    elif ext == ".csv":
        max_cell_cjk = 0
        has_head = False
        for row in csv.reader(io.StringIO(txt)):
            for cell in row:
                if HEADING_RE.search(cell):
                    has_head = True
                c = len(re.findall(r"[\u4e00-\u9fff]", cell))
                if c > max_cell_cjk:
                    max_cell_cjk = c
        if has_head:
            sigs.append("csv_cell_heading")
        if max_cell_cjk >= 200:
            sigs.append("csv_cell_cjk>=200")
        if CHAPTER_STR_RE.search(txt):
            sigs.append("csv_chapter_mention")
    elif ext in (".html", ".htm"):
        parser = HTMLTextExtractor()
        parser.feed(txt)
        vis = "\n".join(parser.chunks)
        cjk_vis = len(re.findall(r"[\u4e00-\u9fff]", vis))
        if HEADING_RE.search(vis) or HEADING_RE.search(txt):
            sigs.append("html_heading")
        if CHAPTER_STR_RE.search(vis) or CHAPTER_STR_RE.search(txt):
            sigs.append("html_chapter_mention")
        if cjk_vis >= 500:
            sigs.append("html_vis_cjk>=500")
    else:
        if HEADING_RE.search(txt):
            sigs.append("text_heading")
        max_line_cjk = max((len(re.findall(r"[\u4e00-\u9fff]", l)) for l in txt.splitlines()), default=0)
        total_cjk = len(re.findall(r"[\u4e00-\u9fff]", txt))
        if max_line_cjk >= 200:
            sigs.append("text_long_cjk_line>=200")
        if CHAPTER_STR_RE.search(txt) and total_cjk >= 1000:
            sigs.append("text_ch_mention_cjk>=1000")

    return "TEXT", sorted(set(sigs))

def load_tsv(path):
    with open(path, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh, delimiter="\t"))
    return {r["rel_path"]: r for r in rows}, len(rows)

def verify_scope(label, root_dir, tsv_path, skip_top_git, exclude_rels):
    manifest, row_cnt = load_tsv(tsv_path)
    errors = []
    seen = set()
    scope_counts = collections.Counter()
    res_counts = collections.Counter()
    g2b_counts = collections.Counter()
    g6_counts = collections.Counter()
    sig_counts = collections.Counter()
    scanned_text_exts = collections.Counter()
    cat_recon = collections.defaultdict(lambda: collections.Counter())
    zip_reports = []
    unresolved = 0
    total_live = 0

    for r, dirs, files in os.walk(root_dir):
        if skip_top_git and r == root_dir and ".git" in dirs:
            dirs.remove(".git")
        dirs.sort()
        for f in sorted(files):
            fp = os.path.join(r, f)
            rel = os.path.relpath(fp, root_dir)
            total_live += 1
            if rel in exclude_rels:
                continue
            seen.add(rel)
            ext = os.path.splitext(f)[1].lower() or "(noext)"
            raw = open(fp, "rb").read()
            got_bytes = len(raw)
            got_sha = hashlib.sha256(raw).hexdigest()
            got_scope, sigs = inspect_universal(fp, rel, ext, raw)
            sig_str = ",".join(sigs) or "none"
            if got_scope == "TEXT":
                scanned_text_exts[ext] += 1
            for s in sigs:
                sig_counts[s] += 1
            if got_scope == "ZIP":
                with zipfile.ZipFile(fp) as zf:
                    zip_reports.append((rel, len(zf.namelist())))
            if rel not in manifest:
                errors.append(f"{label}_MISSING_IN_MANIFEST {rel}")
                unresolved += 1
                continue
            m = manifest[rel]
            if int(m["bytes"]) != got_bytes:
                errors.append(f"{label}_SIZE_MISMATCH {rel}: got={got_bytes} exp={m['bytes']}")
            if m["sha256"] != got_sha:
                errors.append(f"{label}_SHA256_MISMATCH {rel}")
            if m["scan_scope"] != got_scope:
                errors.append(f"{label}_SCOPE_MISMATCH {rel}: got={got_scope} exp={m['scan_scope']}")
            if m["deep_scan_signals"] != sig_str:
                errors.append(f"{label}_SIGNAL_MISMATCH {rel}: got={sig_str} exp={m['deep_scan_signals']}")

            st = m["resolution_status"]
            g2b = m["g2b_eligibility"]
            g6 = m["g6_eligibility"]
            cat = m["category"]

            scope_counts[got_scope] += 1
            res_counts[st] += 1
            g2b_counts[g2b] += 1
            g6_counts[g6] += 1

            cat_recon[cat]["total"] += 1
            if st == "EXCLUDED_CANDIDATE":
                cat_recon[cat]["excluded"] += 1
            elif st == "ELIGIBLE_CANDIDATE":
                cat_recon[cat]["eligible"] += 1
            elif st == "NON_SAMPLE_VERIFIED":
                cat_recon[cat]["non_sample"] += 1
            elif st in ("OUT_OF_SCOPE_BINARY_MEDIA", "OUT_OF_SCOPE_VCS"):
                cat_recon[cat]["out_of_scope"] += 1
            else:
                cat_recon[cat]["unresolved"] += 1

            if st == "UNRESOLVED" or g2b == "UNRESOLVED" or g6 == "UNRESOLVED":
                unresolved += 1
                errors.append(f"{label}_UNRESOLVED {rel}: st={st} g2b={g2b} g6={g6}")
            if g2b not in ("ELIGIBLE", "INELIGIBLE", "OUT_OF_SCOPE", "UNRESOLVED") or g6 not in ("ELIGIBLE", "INELIGIBLE", "OUT_OF_SCOPE", "UNRESOLVED"):
                unresolved += 1
                errors.append(f"{label}_INVALID_ELIG_ENUM {rel}: g2b={g2b} g6={g6}")
            if sigs and st not in ("EXCLUDED_CANDIDATE", "ELIGIBLE_CANDIDATE"):
                unresolved += 1
                errors.append(f"{label}_HIT_NOT_CLASSIFIED {rel}: sigs={sig_str} status={st}")
            if got_scope in ("BIN_MEDIA", "VCS_META") and (g2b != "OUT_OF_SCOPE" or g6 != "OUT_OF_SCOPE"):
                errors.append(f"{label}_OUT_OF_SCOPE_MISMATCH {rel}: scope={got_scope} g2b={g2b} g6={g6}")
            if st == "EXCLUDED_CANDIDATE":
                if g2b != "INELIGIBLE" or g6 != "INELIGIBLE":
                    errors.append(f"{label}_EXCLUDED_ELIG_CONFLICT {rel}: g2b={g2b} g6={g6}")
                for col in ("source_work", "genre", "unblinded", "calibration_used", "blacklist_overlap", "exclusion_reason"):
                    if not m.get(col) or m[col] == "UNRESOLVED":
                        unresolved += 1
                        errors.append(f"{label}_INCOMPLETE_EXCLUSION {rel}: missing {col}")

    for ex in sorted(set(manifest.keys()) - seen):
        errors.append(f"{label}_STALE_MANIFEST_ENTRY {ex}")

    # Strict totals reconciliation (zero hardcoding)
    if sum(scope_counts.values()) != row_cnt:
        errors.append(f"{label}_SCOPE_RECON_FAIL {sum(scope_counts.values())} != {row_cnt}")
    if sum(g2b_counts.values()) != row_cnt or sum(g6_counts.values()) != row_cnt:
        errors.append(f"{label}_ELIG_RECON_FAIL g2b={sum(g2b_counts.values())} g6={sum(g6_counts.values())} != {row_cnt}")
    if sum(res_counts.values()) != row_cnt:
        errors.append(f"{label}_STATUS_RECON_FAIL {sum(res_counts.values())} != {row_cnt}")

    g2b_elig = g2b_counts["ELIGIBLE"]
    g6_elig = g6_counts["ELIGIBLE"]
    print(f"{label}_AUDIT live={total_live} manifest={row_cnt} verified={len(seen)} scopes={dict(sorted(scope_counts.items()))}")
    print(f"  {label}_TEXT_EXTS({sum(scanned_text_exts.values())}): {dict(sorted(scanned_text_exts.items()))}")
    print(f"  {label}_STATUSES: {dict(sorted(res_counts.items()))}")
    print(f"  {label}_G2B_COMPUTED: eligible={g2b_elig} ineligible={g2b_counts['INELIGIBLE']} out_of_scope={g2b_counts['OUT_OF_SCOPE']} unresolved={g2b_counts['UNRESOLVED']}")
    print(f"  {label}_G6_COMPUTED:  eligible={g6_elig} ineligible={g6_counts['INELIGIBLE']} out_of_scope={g6_counts['OUT_OF_SCOPE']} unresolved={g6_counts['UNRESOLVED']}")
    print(f"  {label}_SIGNALS: {dict(sorted(sig_counts.items()))}")
    print(f"  {label}_ZIPS: {zip_reports}")
    print(f"  {label}_CATEGORY_RECON:")
    for cat, cnts in sorted(cat_recon.items()):
        print(f"    {cat}: total={cnts['total']} excluded={cnts['excluded']} eligible={cnts['eligible']} non_sample={cnts['non_sample']} out_of_scope={cnts['out_of_scope']} unresolved={cnts['unresolved']}")
    return errors, unresolved, g2b_elig, g6_elig

errs_r, unres_r, g2b_r, g6_r = verify_scope("REPO", REPO, REPO_TSV, True, MANIFEST_SELF)
errs_a, unres_a, g2b_a, g6_a = verify_scope("ART_ROOT", ART, ART_TSV, False, set())
all_errors = errs_r + errs_a
total_unresolved = unres_r + unres_a
total_g2b_eligible = g2b_r + g2b_a
total_g6_eligible = g6_r + g6_a
print(f"FINAL_COMPUTED_AUDIT total_unresolved={total_unresolved} total_errors={len(all_errors)} computed_eligible_g2b={total_g2b_eligible} computed_eligible_g6={total_g6_eligible}")
if all_errors or total_unresolved > 0:
    for e in all_errors[:25]:
        print(f"FAIL: {e}", file=sys.stderr)
    sys.exit(1)
print("C3_UNIVERSAL_AUDIT_PASSED")
PY
```

#### 2. 真实运行原始输出（exit code = `0`，全量可对账）
```text
REPO_AUDIT live=295 manifest=293 verified=293 scopes={'BIN_MEDIA': 7, 'TEXT': 285, 'ZIP': 1}
  REPO_TEXT_EXTS(285): {'(noext)': 2, '.csv': 14, '.json': 7, '.md': 200, '.mjs': 49, '.py': 9, '.txt': 1, '.yml': 3}
  REPO_STATUSES: {'EXCLUDED_CANDIDATE': 19, 'NON_SAMPLE_VERIFIED': 267, 'OUT_OF_SCOPE_BINARY_MEDIA': 7}
  REPO_G2B_COMPUTED: eligible=0 ineligible=286 out_of_scope=7 unresolved=0
  REPO_G6_COMPUTED:  eligible=0 ineligible=286 out_of_scope=7 unresolved=0
  REPO_SIGNALS: {'csv_chapter_mention': 4, 'path_clue': 14, 'text_heading': 2}
  REPO_ZIPS: [('docs/r3/review-v3/r3-review-v3-architecture-package.zip', 10)]
  REPO_CATEGORY_RECON:
    repo_binary_media: total=7 excluded=0 eligible=0 non_sample=0 out_of_scope=7 unresolved=0
    repo_docs: total=19 excluded=0 eligible=0 non_sample=19 out_of_scope=0 unresolved=0
    repo_eng_script: total=37 excluded=7 eligible=0 non_sample=30 out_of_scope=0 unresolved=0
    repo_frozen_arch_zip: total=1 excluded=0 eligible=0 non_sample=1 out_of_scope=0 unresolved=0
    repo_root_or_config: total=10 excluded=0 eligible=0 non_sample=10 out_of_scope=0 unresolved=0
    repo_skill_reference: total=82 excluded=4 eligible=0 non_sample=78 out_of_scope=0 unresolved=0
    repo_test_script: total=19 excluded=2 eligible=0 non_sample=17 out_of_scope=0 unresolved=0
    repo_webnovel_csv_kb: total=10 excluded=4 eligible=0 non_sample=6 out_of_scope=0 unresolved=0
    repo_webnovel_upstream_ref: total=108 excluded=2 eligible=0 non_sample=106 out_of_scope=0 unresolved=0
ART_ROOT_AUDIT live=2723 manifest=2723 verified=2723 scopes={'BIN_MEDIA': 64, 'TEXT': 2573, 'VCS_META': 85, 'ZIP': 1}
  ART_ROOT_TEXT_EXTS(2573): {'(noext)': 25, '.css': 14, '.csv': 10, '.diff': 4, '.html': 6, '.ini': 1, '.js': 34, '.json': 734, '.jsonl': 4, '.jsx': 13, '.license': 2, '.license-mpl': 1, '.log': 11, '.md': 749, '.mjs': 135, '.ps1': 1, '.py': 206, '.srt': 1, '.svg': 2, '.ts': 474, '.tsx': 31, '.txt': 86, '.yaml': 3, '.yml': 26}
  ART_ROOT_STATUSES: {'EXCLUDED_CANDIDATE': 897, 'NON_SAMPLE_VERIFIED': 1677, 'OUT_OF_SCOPE_BINARY_MEDIA': 64, 'OUT_OF_SCOPE_VCS': 85}
  ART_ROOT_G2B_COMPUTED: eligible=0 ineligible=2574 out_of_scope=149 unresolved=0
  ART_ROOT_G6_COMPUTED:  eligible=0 ineligible=2574 out_of_scope=149 unresolved=0
  ART_ROOT_SIGNALS: {'csv_chapter_mention': 4, 'diff_added_cjk>=500': 4, 'diff_chapter_target': 4, 'html_vis_cjk>=500': 2, 'json_str_cjk>=500': 94, 'json_str_heading': 2, 'log_long_cjk': 8, 'path_clue': 731, 'text_ch_mention_cjk>=1000': 28, 'text_heading': 228, 'text_long_cjk_line>=200': 2}
  ART_ROOT_ZIPS: [('r3-review-v3-architecture-package.zip', 10)]
  ART_ROOT_CATEGORY_RECON:
    agent_config: total=1 excluded=0 eligible=0 non_sample=1 out_of_scope=0 unresolved=0
    calibration_protocol_md: total=3 excluded=0 eligible=0 non_sample=3 out_of_scope=0 unresolved=0
    candidate_chapter_manuscript: total=172 excluded=172 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    chapter_brief_md: total=3 excluded=3 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    chapter_or_core_diff_md: total=61 excluded=39 eligible=0 non_sample=22 out_of_scope=0 unresolved=0
    chapter_revision_diff: total=1 excluded=1 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    compiled_review_pack_md: total=14 excluded=14 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    exp_manifest_or_eval_json: total=344 excluded=189 eligible=0 non_sample=155 out_of_scope=0 unresolved=0
    external_ref_binary_media: total=64 excluded=0 eligible=0 non_sample=0 out_of_scope=64 unresolved=0
    external_ref_code_or_doc: total=1373 excluded=119 eligible=0 non_sample=1254 out_of_scope=0 unresolved=0
    external_ref_csv_kb: total=10 excluded=4 eligible=0 non_sample=6 out_of_scope=0 unresolved=0
    external_ref_eval_fixture_meta: total=7 excluded=3 eligible=0 non_sample=4 out_of_scope=0 unresolved=0
    external_ref_eval_prose_fixture: total=1 excluded=1 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    external_ref_html_doc: total=6 excluded=2 eligible=0 non_sample=4 out_of_scope=0 unresolved=0
    external_ref_prose_example: total=1 excluded=1 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    external_ref_vcs_meta: total=85 excluded=0 eligible=0 non_sample=0 out_of_scope=85 unresolved=0
    frozen_arch_package_copy: total=20 excluded=0 eligible=0 non_sample=20 out_of_scope=0 unresolved=0
    historical_calibration_key_json: total=10 excluded=0 eligible=0 non_sample=10 out_of_scope=0 unresolved=0
    historical_exp_ref_md: total=97 excluded=10 eligible=0 non_sample=87 out_of_scope=0 unresolved=0
    pilot_review_report_md: total=8 excluded=8 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    planning_facts_cache_json: total=2 excluded=2 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    report_with_embedded_chapter: total=1 excluded=1 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    review_or_state_json: total=304 excluded=256 eligible=0 non_sample=48 out_of_scope=0 unresolved=0
    root_metadata_json: total=1 excluded=1 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    root_report_or_metadata: total=31 excluded=0 eligible=0 non_sample=31 out_of_scope=0 unresolved=0
    skill_code_diff: total=3 excluded=3 eligible=0 non_sample=0 out_of_scope=0 unresolved=0
    story_bible_or_outline_md: total=85 excluded=60 eligible=0 non_sample=25 out_of_scope=0 unresolved=0
    system_task_log: total=11 excluded=8 eligible=0 non_sample=3 out_of_scope=0 unresolved=0
    telemetry_jsonl: total=4 excluded=0 eligible=0 non_sample=4 out_of_scope=0 unresolved=0
FINAL_COMPUTED_AUDIT total_unresolved=0 total_errors=0 computed_eligible_g2b=0 computed_eligible_g6=0
C3_UNIVERSAL_AUDIT_PASSED
```

#### 3. ZIP 归档内部成员逐项核验（共 2 份归档）

| 归档位置与路径 | 成员数 | 完整内部成员清单 | 章节/小说样本命中数 | 判定 |
|---|---:|---|---:|---|
| 公开主仓：`docs/r3/review-v3/r3-review-v3-architecture-package.zip` | `10` | `r3-review-v3-architecture-package/{README.md, CHANGELOG.md, 01..08}`（10 份冻结架构文档） | `0` | `NON_SAMPLE_VERIFIED`（`g2b=INELIGIBLE`, `g6=INELIGIBLE`） |
| `<ART_ROOT>`：`r3-review-v3-architecture-package.zip` | `10` | 同上 10 份冻结架构文档（同源副本） | `0` | `NON_SAMPLE_VERIFIED`（`g2b=INELIGIBLE`, `g6=INELIGIBLE`） |

#### 4. 第四轮通用全文本扫描新增捕获项核查（全部逐文件记入两份 16 列 `.tsv` 清单）

| 扫描新增覆盖类型 | 命中数量 | 代表性路径与触发信号 | 逐项核查与排除结论 |
|---|---:|---|---|
| **主仓 `.csv`（14 份全扫）** | `4` | `references/webnovel/upstream/references/csv/{写作技法,命名规则,场景写法,爽点与节奏}.csv`（`csv_chapter_mention`） | 逐单元格扫描 `0` 章节标题；仅含网文技法/命名/节奏知识条目，`g2b=INELIGIBLE`, `g6=INELIGIBLE` |
| **`<ART_ROOT>` 外部仓库 `.csv`（10 份全扫）** | `4` | `scratch/ref-webnovel-writer/webnovel-writer/references/csv/{写作技法,命名规则,场景写法,爽点与节奏}.csv`（`csv_chapter_mention`） | 同上上游知识库 CSV，`0` 章节正文，`g2b=INELIGIBLE`, `g6=INELIGIBLE` |
| **`<ART_ROOT>` 外部仓库 `.html`（6 份全扫）** | `2` | `scratch/ref-webnovel-writer/docs/archive/architecture/{dashboard-prototype,system-architecture-diagram}.html`（`html_vis_cjk>=500`） | 可见文本与源码均 `0` 章节标题；仅架构原型与看板 HTML 页面，`g2b=INELIGIBLE`, `g6=INELIGIBLE` |
| **`<ART_ROOT>` 外部仓库代码/单测（`.py` 206、`.mjs` 135、`.js` 34、`.ts` 474、`.tsx` 31、`.jsx` 13、`.yml/.yaml` 29、`.srt` 1 等全部全扫）** | `30`（含 1 份既有路径命中 `chapter-opening.spec.ts`） | `echarts-vendor-*.js`（`text_long_cjk_line>=200`）、`status_reporter.py`、`novel-tools.ts`、`workflow-artwork.ts`、`site/build.mjs` 及 25 份 `*.spec.ts` 自动化单测（`text_ch_mention_cjk>=1000`） | 全部为外部参考 Skill 仓库源码、前端打包库与 TypeScript 单元测试代码，`0` 独立小说正文章节，`g2b=INELIGIBLE`, `g6=INELIGIBLE` |
| **二进制媒体（单独列示，不宣称全文扫描）** | 主仓 `7` + `<ART_ROOT>` `64` | 主仓 `assets/*.png`（7）；`<ART_ROOT>` 外部仓库 `52 .png + 1 .jpg + 1 .mp4 + 10 .webm`（64） | 显式划归 `OUT_OF_SCOPE_BINARY_MEDIA`（`g2b=OUT_OF_SCOPE`, `g6=OUT_OF_SCOPE`） |
| **嵌套 `.git` 版本控制元数据（单独隔离）** | `<ART_ROOT>` `85` | `scratch/ref-{penglonghuang-cns,webnovel-writer,webnovel-writer-v8}/.git/**`（85） | 显式划归 `OUT_OF_SCOPE_VCS`（`g2b=OUT_OF_SCOPE`, `g6=OUT_OF_SCOPE`），不计入样本语料 |

#### 5. 总数可对账结论（由 Manifest 复算得出，零硬编码）

| 审计范围 | 文件总数 | 已扫描文本+ZIP | 范围外（二进制媒体 + VCS） | 候选排除（`EXCLUDED_CANDIDATE`） | 扫描非样本（`NON_SAMPLE_VERIFIED`） | 未决（`UNRESOLVED`） | **复算 `G2-B` 合格** | **复算 `G6` 合格** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 公开主仓（[`P0-0-C3-Repo-Manifest.tsv`](./P0-0-C3-Repo-Manifest.tsv)，另含 2 份 TSV 共 295） | `293` | `286`（285 文本 + 1 ZIP） | `7`（7 PNG + 0 VCS） | `19` | `267` | **`0`** | **`0`** | **`0`** |
| 本地 `<ART_ROOT>`（[`P0-0-C3-Full-File-Manifest.tsv`](./P0-0-C3-Full-File-Manifest.tsv)） | `2,723` | `2,574`（2,573 文本 + 1 ZIP） | `149`（64 媒体 + 85 VCS） | `897` | `1,677` | **`0`** | **`0`** | **`0`** |
| **Manifest 复算合计** | **`3,016`** | **`2,860`** | **`156`** | **`916`** | **`1,944`** | **`0`** | **`0`** | **`0`** |

- **对账恒等式**：`2,860 + 156 = 3,016`；`916 + 1,944 + 156 + 0 = 3,016`；`G2-B`：`0 ELIGIBLE + 2,860 INELIGIBLE + 156 OUT_OF_SCOPE + 0 UNRESOLVED = 3,016`；`G6`：`0 ELIGIBLE + 2,860 INELIGIBLE + 156 OUT_OF_SCOPE + 0 UNRESOLVED = 3,016`。
- **外部补充来源**：Google Drive 历史快照 3 份 ZIP 仅含单题材仙侠《仙门大掌柜》Ch 1–12，未经双评委+第三仲裁定案，不满足跨题材未揭盲要求。
- **最终可复核缺口**：`G2-B` = **`0` 章 / `0` 案例（`underpowered`，缺 `+20` 章 / `+60` 案例）**；`G6` = **`0` 章 / `0` 案例（`underpowered`，缺 `+12..16` 章 / `+30` 正例 / `+40` 负例）**。

---

### C.4 G4（`four-class-24.json`）脱敏切片→来源章节映射与去重计数

> **整改说明（响应 Issue #4 `CHANGES_REQUESTED` 第 3 项）**：逐项列出 `scratch/phase1-calibration-v2/four-class-24.json` 全部 24 条案例从脱敏切片 `fc-texts/M-01..M-21` 到 Track 2 源文件与 `Arm × Chapter` 实例的精确映射（基于 SHA-256 与行重合实测），并给出严格去重计数。

#### 1. 全部 24 案例脱敏映射表
| `fcId` | 真值级别 | 是否合成 | 脱敏原始 ID | 目标稿件切片 | 对应 Track 2 源文件与匹配方式 | 去重来源章实例（Arm × 章） | 共享大纲章号（《器痕录》） | 前置参考切片 |
|---|---|---|---|---|---|---|---|---|
| `FC-01` | `MINOR` | 否 | `FC-CAL-40` | `fc-texts/M-19.md` | `G2-ch03-stageB.md`（完全一致 (SHA-256)） | Arm 1 · ch03 (`G2-ch03`) | 第 3 章 | `M-20.md`, `M-04.md` |
| `FC-02` | `SUGGESTION` | 否 | `SUG-01` | `fc-texts/M-09.md` | `G1-ch01-stageA.md`（完全一致 (SHA-256)） | Arm 0 · ch01 (`G1-ch01`) | 第 1 章 | — |
| `FC-03` | `MINOR` | 否 | `FC-CAL-18` | `fc-texts/M-10.md` | `G3-ch01-stageA.md`（完全一致 (SHA-256)） | Arm 2 · ch01 (`G3-ch01`) | 第 1 章 | — |
| `FC-04` | `MAJOR` | 否 | `FC-CAL-22` | `fc-texts/M-08.md` | `G2-ch02-stageA.md`（完全一致 (SHA-256)） | Arm 1 · ch02 (`G2-ch02`) | 第 2 章 | `M-20.md` |
| `FC-05` | `MAJOR` | 否 | `FC-CAL-61` | `fc-texts/M-15.md` | `G1-ch03-stageA.md`（完全一致 (SHA-256)） | Arm 0 · ch03 (`G1-ch03`) | 第 3 章 | `M-02.md`, `M-17.md` |
| `FC-06` | `MAJOR` | 否 | `FC-CAL-29` | `fc-texts/M-04.md` | `G2-ch02-stageB.md`（完全一致 (SHA-256)） | Arm 1 · ch02 (`G2-ch02`) | 第 2 章 | `M-20.md` |
| `FC-07` | `MINOR` | 否 | `FC-CAL-14` | `fc-texts/M-08.md` | `G2-ch02-stageA.md`（完全一致 (SHA-256)） | Arm 1 · ch02 (`G2-ch02`) | 第 2 章 | `M-20.md` |
| `FC-08` | `BLOCKER` | 是 | `SYN-BLK-01` | `fc-texts/M-21.md` | `G1-ch01-stageB.md`（合成注入派生 (行重合 98.65%)） | Arm 0 · ch01 (`G1-ch01`) | 第 1 章 | — |
| `FC-09` | `BLOCKER` | 是 | `SYN-BLK-04` | `fc-texts/M-03.md` | `G3-ch03-stageB.md`（合成注入派生 (行重合 98.57%)） | Arm 2 · ch03 (`G3-ch03`) | 第 3 章 | `M-11.md`, `M-05.md` |
| `FC-10` | `SUGGESTION` | 否 | `SUG-03` | `fc-texts/M-06.md` | `G3-ch03-stageB.md`（完全一致 (SHA-256)） | Arm 2 · ch03 (`G3-ch03`) | 第 3 章 | `M-11.md`, `M-05.md` |
| `FC-11` | `MAJOR` | 否 | `FC-CAL-24` | `fc-texts/M-18.md` | `G3-ch02-stageA.md`（完全一致 (SHA-256)） | Arm 2 · ch02 (`G3-ch02`) | 第 2 章 | `M-11.md` |
| `FC-12` | `BLOCKER` | 是 | `SYN-BLK-03` | `fc-texts/M-13.md` | `G2-ch02-stageB.md`（合成注入派生 (行重合 98.75%)） | Arm 1 · ch02 (`G2-ch02`) | 第 2 章 | `M-20.md` |
| `FC-13` | `MAJOR` | 否 | `FC-CAL-67` | `fc-texts/M-14.md` | `G1-ch02-stageA.md`（完全一致 (SHA-256)） | Arm 0 · ch02 (`G1-ch02`) | 第 2 章 | `M-02.md` |
| `FC-14` | `SUGGESTION` | 否 | `SUG-02` | `fc-texts/M-20.md` | `G2-ch01-stageB.md`（完全一致 (SHA-256)） | Arm 1 · ch01 (`G2-ch01`) | 第 1 章 | — |
| `FC-15` | `SUGGESTION` | 否 | `SUG-05` | `fc-texts/M-01.md` | `G1-ch03-stageB.md`（完全一致 (SHA-256)） | Arm 0 · ch03 (`G1-ch03`) | 第 3 章 | `M-02.md`, `M-17.md` |
| `FC-16` | `SUGGESTION` | 否 | `SUG-06` | `fc-texts/M-17.md` | `G1-ch02-stageB.md`（完全一致 (SHA-256)） | Arm 0 · ch02 (`G1-ch02`) | 第 2 章 | `M-02.md` |
| `FC-17` | `BLOCKER` | 是 | `SYN-BLK-02` | `fc-texts/M-16.md` | `G1-ch01-stageB.md`（合成注入派生 (行重合 98.65%)） | Arm 0 · ch01 (`G1-ch01`) | 第 1 章 | — |
| `FC-18` | `MINOR` | 否 | `FC-CAL-06` | `fc-texts/M-07.md` | `G2-ch03-stageA.md`（完全一致 (SHA-256)） | Arm 1 · ch03 (`G2-ch03`) | 第 3 章 | `M-20.md`, `M-04.md` |
| `FC-19` | `MAJOR` | 否 | `FC-CAL-36` | `fc-texts/M-06.md` | `G3-ch03-stageB.md`（完全一致 (SHA-256)） | Arm 2 · ch03 (`G3-ch03`) | 第 3 章 | `M-11.md`, `M-05.md` |
| `FC-20` | `SUGGESTION` | 否 | `SUG-04` | `fc-texts/M-06.md` | `G3-ch03-stageB.md`（完全一致 (SHA-256)） | Arm 2 · ch03 (`G3-ch03`) | 第 3 章 | `M-11.md`, `M-05.md` |
| `FC-21` | `MINOR` | 否 | `FC-CAL-30` | `fc-texts/M-14.md` | `G1-ch02-stageA.md`（完全一致 (SHA-256)） | Arm 0 · ch02 (`G1-ch02`) | 第 2 章 | `M-02.md` |
| `FC-22` | `MAJOR` | 否 | `FC-CAL-65` | `fc-texts/M-08.md` | `G2-ch02-stageA.md`（完全一致 (SHA-256)） | Arm 1 · ch02 (`G2-ch02`) | 第 2 章 | `M-20.md` |
| `FC-23` | `MINOR` | 否 | `FC-CAL-62` | `fc-texts/M-14.md` | `G1-ch02-stageA.md`（完全一致 (SHA-256)） | Arm 0 · ch02 (`G1-ch02`) | 第 2 章 | `M-02.md` |
| `FC-24` | `MAJOR` | 否 | `FC-CAL-27` | `fc-texts/M-12.md` | `G3-ch03-stageA.md`（完全一致 (SHA-256)） | Arm 2 · ch03 (`G3-ch03`) | 第 3 章 | `M-11.md`, `M-05.md` |

#### 2. 独立来源章节去重计数与 `underpowered` 状态正式判定（响应第四轮复审）
- **案例总数**：`24` 条（`4` BLOCKER [全部合成注入] / `8` MAJOR / `6` MINOR / `6` SUGGESTION），保留作为有序四级分类稳定度与 `SUGGESTION` 零泄漏的 24 案例探针价值。
- **去重目标稿件切片数（`manuscriptFile`）**：**`18`** 份（另 `M-02, M-05, M-11` 仅作 `priorChapterFinalFiles`，故总引用稿件文件为 `21` 份）。
- **按冻结方案 `08` 独立来源章节口径（严格区分 `N_ch` 与重复运行/Arm 次数）**：
  - **独立来源章节数**：**`N_ch = 3`**（全部来自单题材仙侠《器痕录》共享故事大纲下的第 1–3 章），**低于冻结门槛 `>= 8`**；
  - **正式状态判定**：**G4 当前标记为 `underpowered`（`N_ch = 3 < 8`，精确缺口 `+5` 个独立故事来源章节）**，**不得宣称已满足 G4 的 8 个独立来源章节要求**；
  - **重复运行/Arm 实例维度（另行报告，绝不充当独立来源章）**：上述 3 个独立章节跨 `Arm 0 / Arm 1 / Arm 2` 共包含 **`9` 个 `Arm × Chapter` 运行实例**（`G1-ch01..03`, `G2-ch01..03`, `G3-ch01..03`），后续引用必须始终区分“3 个独立来源章节”与“9 个 Arm×Chapter 运行实例”。
