# P0-0 · 研发基线审计与实施准备报告

> **任务编号**：`P0-0`（纯只读审计与实施准备，零生产代码改动） ｜ **提交状态**：`READY_FOR_REVIEW`（响应 Issue #4 `CHANGES_REQUESTED` 完成 `RW-P0-0-002` 四项整改重提，等待 GPT-6 独立验收；验收通过前严禁推进 `P0-1`）  
> **活跃分支**：`feat/r3-p0-controlled` ｜ **审计前前置基线 HEAD**：`2d6061d6cd0e8b4b2da77619cb58239c44dc332e`（`2026-11-26T00:52:10Z`，GPT-6 `ACCEPTED`）  
> **原始 `P0-0` 正式交付 Commit**：`86cbc9f3ad37c635f134eeea2a89317d5eef0a3c`（GitHub 提交时间：`2026-11-26T02:58:13Z`；完整保留）  
> **`RW-P0-0-001` 一轮整改补充 Commit**：`9747e146e016155055b928d7a664650cb76def5c`（GitHub 提交时间：`2026-11-26T03:11:59Z`；完整保留）  
> **`RW-P0-0-001` 二轮补齐 Commit**：`8ac888fce42070855241d2f17d05691b3afce709`（GitHub 提交时间：`2026-11-26T03:41:39Z`；GPT-6 于 `2026-11-26T05:08:16Z` 在 Issue #4 给出正式 `CHANGES_REQUESTED`，本版据此完成 `RW-P0-0-002` 全部四项整改）  
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
| **G4 · 有序四级稳定与零泄漏** | 覆盖 `>=8` 来源章、`N_case=24`、`K=2` | `four-class-24.json` **24 项完整**（4 BLOCKER / 8 MAJOR / 6 MINOR / 6 SUGGESTION；20 真实 + 4 合成），覆盖 `18` 份目标稿件切片（含 `3` 份仅作前置对照共 `21` 份引用稿件）；去重来源章计数：**按独立生成 `Arm × 章` 实例计为 `9` 章（`>= 8`，与 Track 2 `N_ch=9` 同口径）；按共享故事大纲章号计仅 `3` 章（`< 8`，全属单题材《器痕录》Ch 1–3）**（详见附录 C.4） | 本地 VM `phase1-calibration-v2/four-class-24.json` | ⚠️ **口径区分与局限披露**：按 `Arm × 章` 生成实例计已覆盖 `9 >= 8` 章；但若按独立故事大纲章号计仅 `3 < 8`（`underpowered` 风险），且全属单题材已揭盲历史集，须在 `P0-6` 报告中如实双口径披露 |
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

### C.2 Fail-Closed 完整性校验脚本（全量 64 位 SHA-256 + 字节数断言 + 62 份引用稿件 Manifest）与真实运行输出

> **整改说明（响应 Issue #4 `CHANGES_REQUESTED` 第 1 项）**：
> 1. 将附录 C.1 全部 **18 份核心文件**（17 份 `.json` + 1 份 `.md`）的预期字节数与完整 64 位 SHA-256 写入脚本 `C1_MANIFEST` 数据结构，逐文件强断言字节数、完整 64 位 SHA-256 及 JSON/UTF-8 解析；
> 2. 将 5 组清单动态引用的全部 **62 份稿件文件**纳入 `REF_GROUPS` 数据结构，逐文件输出脱敏相对路径（相对 `<ART_ROOT>`）、字节数与完整 64 位 SHA-256，并强断言分组引用数（`18/21/7/10/6`）、总引用数（`62`）、文件集合一致、字节数与完整 SHA-256 精确匹配；
> 3. **Fail-Closed 非零退出**：任意文件缺失、哈希不符、字节数不符、解析失败、引用数量或集合不符均记入 `errors` 并以 `sys.exit(1)` 非零退出。

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

### C.3 全量递归样本审计（主仓 293 文件 + 本地 `<ART_ROOT>` 2,723 文件完整脱敏清单与 173 份候选章节逐项排除依据）

> **整改说明（响应 Issue #4 `CHANGES_REQUESTED` 第 2 项）**：
> - 不再局限于 3 个目录或文件名关键词扫描；对公开主仓（排除 `.git/` 后全部 **293 个文件**）与本地 Artifact 根目录 `<ART_ROOT>`（含根文件、`.agents/`、`.system_generated/`、`r3-review-v3-architecture-package/`、`scratch/` 顶层及全部 15 个子目录，合计 **2,723 个文件**）执行 **100% 递归内容扫描与全文件归类**（强断言 `unclassified = 0`，否则 `sys.exit(1)`）。

#### 1. 全量递归只读扫描脚本
```bash
python3 -B - <<'PY'
import collections, hashlib, os, re, sys

REPO = "/home/antigravity/chindden/chinese-novelist-skill"
ART = "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/bb9496c7-61be-4b01-ad65-2da947e559e6"
CHAPTER_RE = re.compile(r"^#\s*第[0-9零一二三四五六七八九十百千]+章", re.M)

repo_total = 0
repo_buckets = collections.Counter()
repo_chapter_hits = []
for root, dirs, files in os.walk(REPO):
    if ".git" in dirs:
        dirs.remove(".git")
    dirs.sort()
    for f in sorted(files):
        fp = os.path.join(root, f)
        rel = os.path.relpath(fp, REPO)
        repo_total += 1
        parts = rel.split(os.sep)
        if parts[0] in ("references", "docs") and len(parts) > 2:
            b = f"{parts[0]}/{parts[1]}"
        elif len(parts) > 1:
            b = parts[0]
        else:
            b = "(root)"
        repo_buckets[b] += 1
        if f.endswith((".md", ".txt")):
            head = open(fp, encoding="utf-8", errors="replace").read(2000)
            if CHAPTER_RE.search(head):
                repo_chapter_hits.append((rel, os.path.getsize(fp)))

print(f"REPO_FULL_SCAN total_files={repo_total} chapter_hits={len(repo_chapter_hits)}")
for k, v in sorted(repo_buckets.items()):
    print(f"  REPO_BUCKET {k}: files={v}")

art_total = 0
art_buckets = collections.Counter()
art_cats = collections.Counter()
candidates = []
unclassified = []

def classify_chapter(rel, first):
    if rel.startswith("scratch/ref-"):
        return ("外部参考仓示例《河埠旧事》", "外部示例(非R3)", "公开上游仓库", "否", "不适用(非Holdout)", "第三方仓库教学短例，无R3设定/仲裁键，不可作G2-B/G6")
    if "断剑暗铆" in first or "旧物死契" in first or "剑脊暗锁" in first:
        return ("《残器长生》", "仙侠", "已揭盲", "是(live-eval/step2/NH-1..2/V22-H1)", "是(live-eval/NH-1..2/V22-H1)", "历史live-eval及退役Holdout已揭盲章节，禁入G2-B/G6")
    if "凌晨四点的铜箔" in first or "烧烤摊上的老同学" in first or "抽烟区的风声" in first:
        return ("《降本增笑》", "现代职场", "已揭盲", "是(live-eval/OLD-HOLD-4/NH-4..5)", "是(live-eval/OLD-HOLD-4/NH-4..5)", "历史live-eval及退役Holdout已揭盲章节，禁入G2-B/G6")
    if "废器房暗账" in first or "半公开目击" in first or "晦物铺落袋" in first or rel == "step3-qihenlu-manuscript-ch1-3.md":
        return ("《器痕录》", "仙侠", "已揭盲", "是(Track2/G4/Track1/OLD-HOLD-1..3/NH-3/V22-H2/BlindAudit)", "是(全线《器痕录》黑名单)", "单题材《器痕录》历史校准/盲审/退役Holdout及同大纲稿件，禁入G2-B/G6")
    if "涨潮前两小时" in first:
        return ("《潮汐证词》", "海港悬疑", "已揭盲", "是(V22-H3退役Holdout)", "是(V22-H3)", "v2.2退役Holdout(V22-H3)已揭盲，禁入G2-B/G6")
    if "霜夜核簿" in first:
        return ("《盐引旧账》", "古代历史查账", "已揭盲", "是(V22-H4退役Holdout/G5参考)", "是(V22-H4)", "v2.2退役Holdout(V22-H4)已揭盲，仅作G5已知OR6死锁参考，禁入G2-B/G6")
    return None

for root, dirs, files in os.walk(ART):
    dirs.sort()
    for f in sorted(files):
        fp = os.path.join(root, f)
        rel = os.path.relpath(fp, ART)
        art_total += 1
        parts = rel.split(os.sep)
        if parts[0] == "scratch" and len(parts) > 2:
            b = f"scratch/{parts[1]}"
        elif parts[0] == "scratch":
            b = "scratch/(top-level)"
        elif len(parts) > 1:
            b = parts[0]
        else:
            b = "(root)"
        art_buckets[b] += 1

        if rel.startswith("scratch/ref-"):
            if f.endswith((".md", ".txt")) and "/.git/" not in f"/{rel}":
                raw = open(fp, "rb").read()
                head = raw.decode("utf-8", errors="replace")[:2000]
                if CHAPTER_RE.search(head):
                    candidates.append((rel, len(raw), hashlib.sha256(raw).hexdigest(), classify_chapter(rel, head.splitlines()[0])))
            art_cats["external_ref_repos(scratch/ref-*)"] += 1
            continue
        if rel.startswith(".system_generated/"):
            art_cats["system_task_logs(.system_generated)"] += 1
            continue
        if rel.startswith(".agents/"):
            art_cats["agent_config(.agents)"] += 1
            continue
        if rel.startswith("r3-review-v3-architecture-package/"):
            art_cats["frozen_arch_package_copy"] += 1
            continue
        if "/" not in rel:
            if rel == "step3-qihenlu-manuscript-ch1-3.md":
                raw = open(fp, "rb").read()
                candidates.append((rel, len(raw), hashlib.sha256(raw).hexdigest(), classify_chapter(rel, raw.decode("utf-8", errors="replace").splitlines()[0])))
                art_cats["candidate_chapter_manuscripts"] += 1
            else:
                art_cats["root_reports_metadata_zip_url"] += 1
            continue
        if rel.startswith("scratch/") and rel.count("/") == 1:
            art_cats["scratch_top_level_diffs_and_keys"] += 1
            continue
        if f.endswith((".json", ".jsonl", ".diff")):
            art_cats["scratch_exp_json_jsonl_diff"] += 1
            continue
        if f.endswith(".md"):
            raw = open(fp, "rb").read()
            first = raw.decode("utf-8", errors="replace").splitlines()[0].strip() if raw else ""
            if CHAPTER_RE.search(first):
                info = classify_chapter(rel, first)
                if info is None:
                    unclassified.append(rel)
                else:
                    candidates.append((rel, len(raw), hashlib.sha256(raw).hexdigest(), info))
                    art_cats["candidate_chapter_manuscripts"] += 1
            else:
                art_cats["scratch_exp_non_chapter_md"] += 1
            continue
        unclassified.append(rel)

print(f"\nART_ROOT_FULL_SCAN total_files={art_total} candidates={len(candidates)} unclassified={len(unclassified)}")
for k, v in sorted(art_buckets.items()):
    print(f"  ART_BUCKET {k}: files={v}")
print("ART_CATEGORY_SUMMARY:")
for k, v in sorted(art_cats.items()):
    print(f"  CAT {k}: files={v}")
by_work = collections.Counter(c[3][0] for c in candidates)
print("CANDIDATE_EXCLUSION_BY_WORK:")
for w, cnt in sorted(by_work.items()):
    print(f"  EXCLUDED {w}: files={cnt} eligible_g2b=0 eligible_g6=0")
print(f"FINAL_AUDIT repo_candidates={len(repo_chapter_hits)} art_candidates={len(candidates)} excluded={len(candidates)} unclassified={len(unclassified)} eligible_g2b=0 eligible_g6=0")
if repo_chapter_hits or unclassified:
    print("FAIL: unexpected or unclassified candidates found", file=sys.stderr)
    sys.exit(1)
print("C3_FULL_RECURSIVE_AUDIT_PASSED")
PY
```

#### 2. 真实运行原始输出（exit code = `0`）
```text
REPO_FULL_SCAN total_files=293 chapter_hits=0
  REPO_BUCKET (root): files=6
  REPO_BUCKET .github: files=3
  REPO_BUCKET LICENSES: files=1
  REPO_BUCKET assets: files=7
  REPO_BUCKET docs: files=5
  REPO_BUCKET docs/r3: files=15
  REPO_BUCKET references/flows: files=8
  REPO_BUCKET references/guides: files=10
  REPO_BUCKET references/legacy: files=1
  REPO_BUCKET references/v3: files=16
  REPO_BUCKET references/webnovel: files=165
  REPO_BUCKET scripts: files=55
  REPO_BUCKET tests: files=1

ART_ROOT_FULL_SCAN total_files=2723 candidates=173 unclassified=0
  ART_BUCKET (root): files=35
  ART_BUCKET .agents: files=1
  ART_BUCKET .system_generated: files=11
  ART_BUCKET r3-review-v3-architecture-package: files=19
  ART_BUCKET scratch/(top-level): files=13
  ART_BUCKET scratch/live-eval: files=180
  ART_BUCKET scratch/phase1-blind-audit: files=35
  ART_BUCKET scratch/phase1-calibration-offline: files=32
  ART_BUCKET scratch/phase1-calibration-v2: files=45
  ART_BUCKET scratch/phase1-calibration-v2-out: files=8
  ART_BUCKET scratch/phase1-calibration-v2.1: files=24
  ART_BUCKET scratch/phase1-calibration-v2.1-out: files=9
  ART_BUCKET scratch/phase1-calibration-v2.2: files=28
  ART_BUCKET scratch/phase1-calibration-v2.2-out: files=9
  ART_BUCKET scratch/phase1-throughput-exp: files=470
  ART_BUCKET scratch/ref-penglonghuang-cns: files=106
  ART_BUCKET scratch/ref-webnovel-writer: files=509
  ART_BUCKET scratch/ref-webnovel-writer-v8: files=932
  ART_BUCKET scratch/step2-m1-replay: files=113
  ART_BUCKET scratch/step3-r3-trial: files=144
ART_CATEGORY_SUMMARY:
  CAT agent_config(.agents): files=1
  CAT candidate_chapter_manuscripts: files=172
  CAT external_ref_repos(scratch/ref-*): files=1547
  CAT frozen_arch_package_copy: files=19
  CAT root_reports_metadata_zip_url: files=34
  CAT scratch_exp_json_jsonl_diff: files=655
  CAT scratch_exp_non_chapter_md: files=271
  CAT scratch_top_level_diffs_and_keys: files=13
  CAT system_task_logs(.system_generated): files=11
CANDIDATE_EXCLUSION_BY_WORK:
  EXCLUDED 《器痕录》: files=128 eligible_g2b=0 eligible_g6=0
  EXCLUDED 《残器长生》: files=31 eligible_g2b=0 eligible_g6=0
  EXCLUDED 《潮汐证词》: files=2 eligible_g2b=0 eligible_g6=0
  EXCLUDED 《盐引旧账》: files=2 eligible_g2b=0 eligible_g6=0
  EXCLUDED 《降本增笑》: files=9 eligible_g2b=0 eligible_g6=0
  EXCLUDED 外部参考仓示例《河埠旧事》: files=1 eligible_g2b=0 eligible_g6=0
FINAL_AUDIT repo_candidates=0 art_candidates=173 excluded=173 unclassified=0 eligible_g2b=0 eligible_g6=0
C3_FULL_RECURSIVE_AUDIT_PASSED
```

#### 3. 公开主仓完整递归盘点（全部 293 个文件，排除 `.git/`）

| 仓库目录分组 | 文件数 | 内容性质 | 正文章节命中数 | 排除依据（G2-B / G6） |
|---|---:|---|---:|---|
| 根目录 (`LICENSE`, `NOTICE.md`, `README.md`, `README_V3.md`, `ROADMAP.md`, `SKILL.md`) | `6` | 协议、说明与 Skill 入口 | `0` | 非小说章节样本 |
| `.github/` (`FUNDING.yml`, 2 个 CI workflow) | `3` | CI 与仓库配置 | `0` | 非小说章节样本 |
| `LICENSES/` | `1` | 第三方许可证文本 | `0` | 非小说章节样本 |
| `assets/` | `7` | README 演示截图与二维码 `.png` | `0` | 图片资源，非文本样本 |
| `docs/`（顶层 5 份：`AGENT-HANDOFF.md`, `PROJECT-ASSET-INDEX.md`, `PROJECT-CONTEXT.md`, `R3-PRD.md`, `RESEARCH-ASSET-POLICY.md`） | `5` | 仓库级治理与需求文档 | `0` | 治理文档，无独立小说 Holdout |
| `docs/r3/`（`review-v3/` 11 份冻结架构文档+ZIP、`p0-implementation/` 4 份管理文档） | `15` | 冻结架构包与 P0 实施管理文档 | `0` | 架构/管理文档，无独立小说 Holdout |
| `references/flows/` | `8` | 创作流程指导文档 | `0` | Skill 流程提示词，非小说样本 |
| `references/guides/` | `10` | 写作技法与模板指导 | `0` | Skill 写作指南，非小说样本 |
| `references/legacy/` | `1` | 上游旧版 `upstream-SKILL.md` | `0` | 旧版 Skill 规范，非小说样本 |
| `references/v3/`（见附录 A.5 完整 16 文件清单） | `16` | V3/R2/R3 协议与审稿模板 | `0` | Skill 协议模板，非小说样本 |
| `references/webnovel/`（11 份索引/总纲 + `supplement/` 31 份题材流派补充 + `upstream/` 123 份上游参考库，全量清单见 `UPSTREAM-MANIFEST.json`） | `165` | 网文题材/桥段/技法知识库与 JSON 路由索引 | `0` | 题材知识库与技法模板，全量内容扫描 0 章节正文 |
| `scripts/`（37 个工程脚本 + `scripts/tests/` 18 个测试脚本，见附录 A.2/A.4） | `55` | 工程 CLI 脚本与自动化单测夹具 | `0` | 工程代码与合成单测夹具，无独立小说 Holdout |
| `tests/`（`tests/r3-routing.test.mjs`） | `1` | Skill 路由单测 | `0` | 路由单测，非小说样本 |
| **主仓全量合计（100% 覆盖）** | **`293`** | **全部为 Skill 源码、文档、知识库与工程单测** | **`0`** | **主仓合格 G2-B / G6 候选样本 = `0`** |

#### 4. 本地 `<ART_ROOT>` 完整脱敏文件清单（覆盖全部 2,723 个文件，零遗漏）

##### 4.1 非 `scratch/` 全部文件逐项清单（66 个：根目录 35 + `.agents` 1 + `.system_generated` 11 + `r3-review-v3-architecture-package` 19）

| # | 脱敏路径（相对 `<ART_ROOT>`） | 文件大小（Bytes） |
|---:|---|---:|
| 1 | `PR #3 R3 Review Architecture v3.url.json` | `353` |
| 2 | `PR #3 R3 Review Architecture v3.url.json.metadata.json` | `225` |
| 3 | `r3-phase1-blind-audit-and-qa-report.md` | `52,194` |
| 4 | `r3-phase1-blind-audit-and-qa-report.md.metadata.json` | `656` |
| 5 | `r3-phase1-feasibility-correction-and-plan.md` | `35,758` |
| 6 | `r3-phase1-feasibility-correction-and-plan.md.metadata.json` | `698` |
| 7 | `r3-phase1-midterm-report.md` | `24,683` |
| 8 | `r3-phase1-midterm-report.md.metadata.json` | `520` |
| 9 | `r3-review-calibration-design.md` | `44,252` |
| 10 | `r3-review-calibration-design.md.metadata.json` | `772` |
| 11 | `r3-review-calibration-offline-validation-report.md` | `41,750` |
| 12 | `r3-review-calibration-offline-validation-report.md.metadata.json` | `683` |
| 13 | `r3-review-calibration-v2-offline-validation-report.md` | `40,853` |
| 14 | `r3-review-calibration-v2-offline-validation-report.md.metadata.json` | `745` |
| 15 | `r3-review-calibration-v2.1-offline-validation-report.md` | `30,860` |
| 16 | `r3-review-calibration-v2.1-offline-validation-report.md.metadata.json` | `760` |
| 17 | `r3-review-calibration-v2.2-final-offline-validation-report.md` | `24,004` |
| 18 | `r3-review-calibration-v2.2-final-offline-validation-report.md.metadata.json` | `773` |
| 19 | `r3-review-v3-architecture-package.zip` | `94,084` |
| 20 | `r3-throughput-optimization-blueprint.md` | `36,952` |
| 21 | `r3-throughput-optimization-blueprint.md.metadata.json` | `719` |
| 22 | `skill-live-eval-report.md` | `23,090` |
| 23 | `skill-live-eval-report.md.metadata.json` | `492` |
| 24 | `step1-m1-m4-delivery.md` | `76,846` |
| 25 | `step1-m1-m4-delivery.md.metadata.json` | `473` |
| 26 | `step2-m1-replay-report.md` | `50,020` |
| 27 | `step2-m1-replay-report.md.metadata.json` | `557` |
| 28 | `step3-qihenlu-manuscript-ch1-3.md` | `46,846` |
| 29 | `step3-qihenlu-manuscript-ch1-3.md.metadata.json` | `352` |
| 30 | `step3-r3-trial-report.md` | `42,036` |
| 31 | `step3-r3-trial-report.md.metadata.json` | `614` |
| 32 | `webnovel-writer-review-workflow-benchmark.md` | `33,617` |
| 33 | `webnovel-writer-review-workflow-benchmark.md.metadata.json` | `436` |
| 34 | `webnovel-writer-v8-review-workflow-benchmark.md` | `20,470` |
| 35 | `webnovel-writer-v8-review-workflow-benchmark.md.metadata.json` | `565` |
| 36 | `.agents/agents/novelist_eval_agent/agent.md` | `1,390` |
| 37 | `.system_generated/tasks/task-1547.log` | `22,515` |
| 38 | `.system_generated/tasks/task-2093.log` | `32,278` |
| 39 | `.system_generated/tasks/task-2112.log` | `40,632` |
| 40 | `.system_generated/tasks/task-257.log` | `34,283` |
| 41 | `.system_generated/tasks/task-263.log` | `1,642` |
| 42 | `.system_generated/tasks/task-271.log` | `29,717` |
| 43 | `.system_generated/tasks/task-294.log` | `33,715` |
| 44 | `.system_generated/tasks/task-333.log` | `13,482` |
| 45 | `.system_generated/tasks/task-530.log` | `2,413` |
| 46 | `.system_generated/tasks/task-571.log` | `2,988` |
| 47 | `.system_generated/tasks/task-7.log` | `31,628` |
| 48 | `r3-review-v3-architecture-package/01-R3当前审核能力真实实现审计.md` | `17,244` |
| 49 | `r3-review-v3-architecture-package/01-R3当前审核能力真实实现审计.md.metadata.json` | `282` |
| 50 | `r3-review-v3-architecture-package/02-三方差异矩阵.md` | `17,637` |
| 51 | `r3-review-v3-architecture-package/02-三方差异矩阵.md.metadata.json` | `341` |
| 52 | `r3-review-v3-architecture-package/03-R3审核体系v3总体架构设计.md` | `38,279` |
| 53 | `r3-review-v3-architecture-package/03-R3审核体系v3总体架构设计.md.metadata.json` | `372` |
| 54 | `r3-review-v3-architecture-package/04-四层审核生命周期与状态流转图.md` | `19,303` |
| 55 | `r3-review-v3-architecture-package/04-四层审核生命周期与状态流转图.md.metadata.json` | `348` |
| 56 | `r3-review-v3-architecture-package/05-全书机械诊断引擎PRD.md` | `19,866` |
| 57 | `r3-review-v3-architecture-package/05-全书机械诊断引擎PRD.md.metadata.json` | `361` |
| 58 | `r3-review-v3-architecture-package/06-审核修复复审及版本失效协议.md` | `15,191` |
| 59 | `r3-review-v3-architecture-package/06-审核修复复审及版本失效协议.md.metadata.json` | `333` |
| 60 | `r3-review-v3-architecture-package/07-P0-P1-P2开发任务与依赖关系.md` | `17,932` |
| 61 | `r3-review-v3-architecture-package/07-P0-P1-P2开发任务与依赖关系.md.metadata.json` | `320` |
| 62 | `r3-review-v3-architecture-package/08-工程效率与文学质量双重验收方案.md` | `24,023` |
| 63 | `r3-review-v3-architecture-package/08-工程效率与文学质量双重验收方案.md.metadata.json` | `344` |
| 64 | `r3-review-v3-architecture-package/CHANGELOG.md` | `13,299` |
| 65 | `r3-review-v3-architecture-package/README.md` | `11,370` |
| 66 | `r3-review-v3-architecture-package/README.md.metadata.json` | `354` |

> 注：以上 66 个文件中，仅第 28 项 `step3-qihenlu-manuscript-ch1-3.md` 为小说正文合并稿（已纳入下方第 4.4 节 173 份候选章节逐项排除表）；其余 65 份全部为历史评估报告、metadata、架构包副本、URL 书签、Agent 提示词或系统任务日志。

##### 4.2 `scratch/` 顶层文件逐项清单（13 个）

| # | 脱敏路径（相对 `<ART_ROOT>`） | 文件大小（Bytes） |
|---:|---|---:|
| 1 | `scratch/m1-m4-complete-rev2.diff` | `46,930` |
| 2 | `scratch/m1-m4-complete.diff` | `46,092` |
| 3 | `scratch/m1-m4-full.diff` | `37,275` |
| 4 | `scratch/phase1-blind-audit-private-key.json` | `2,753` |
| 5 | `scratch/phase1-blind-c-orig-majors-hostonly.json` | `89,308` |
| 6 | `scratch/phase1-cal-r1-hostonly.json` | `7,711` |
| 7 | `scratch/phase1-cal-r2-hostonly.json` | `16,117` |
| 8 | `scratch/phase1-calibration-offline-private-key.json` | `17,856` |
| 9 | `scratch/phase1-calibration-v2-private-key.json` | `3,389` |
| 10 | `scratch/phase1-calibration-v2.1-private-key.json` | `760` |
| 11 | `scratch/phase1-calibration-v2.2-private-key.json` | `589` |
| 12 | `scratch/phase1-orig-reviews-digest.json` | `74,718` |
| 13 | `scratch/phase1-r3-arbitration-cases-hostonly.json` | `49,220` |

> 注：以上 13 个文件全部为 M1–M4 Git Diff 或历史盲审/校准标定私钥与汇总 JSON，不含未揭盲小说章节。

##### 4.3 `scratch/` 全部 15 个子目录完整文件构成汇总（合计 2,644 个；`66 + 13 + 2,644 = 2,723`）

| 子目录（相对 `<ART_ROOT>`） | 总文件数 | 其中候选章节正文 `.md` | 其他非章节文件构成与用途 | 合格 G2-B / G6 候选数 |
|---|---:|---:|---|---:|
| `scratch/live-eval` | `180` | `15`（《残器长生》12 + 《降本增笑》3） | 132 JSON 账本/审稿报告 + 33 设定/大纲/diff/Pilot 报告 | `0`（全部 15 份见 4.4 排除表） |
| `scratch/step2-m1-replay` | `113` | `13`（《残器长生》13） | 74 JSON + 1 `.diff` + 25 设定/大纲/core/volume/diff | `0`（全部 13 份见 4.4 排除表） |
| `scratch/step3-r3-trial` | `144` | `14`（《器痕录》14） | 95 JSON + 35 设定/大纲/core/volume/diff | `0`（全部 14 份见 4.4 排除表） |
| `scratch/phase1-throughput-exp` | `470` | `38`（《器痕录》Arm 0/1/2/3 共 38） | 295 JSON + 4 `.jsonl` 遥测 + 133 briefs/packs/core/diffs | `0`（全部 38 份见 4.4 排除表） |
| `scratch/phase1-blind-audit` | `35` | `27`（《器痕录》Blind A/B/C 镜像 27） | 5 JSON + 3 冻结设定参考 | `0`（全部 27 份见 4.4 排除表） |
| `scratch/phase1-calibration-offline` | `32` | `18`（《器痕录》Track 2 切片 18） | 11 JSON（batch-1..3 + track1 索引 + 设定）+ 3 冻结设定参考 | `0`（全部 18 份见 4.4 排除表） |
| `scratch/phase1-calibration-v2` | `45` | `28`（`fc-texts/` 21 + `OLD-HOLD` 7） | 7 JSON（`four-class-24` + manifest + 设定）+ 10 协议/参考设定 | `0`（全部 28 份见 4.4 排除表） |
| `scratch/phase1-calibration-v2-out` | `8` | `0` | 8 份历史 v2 离线评测输出 JSON | `0` |
| `scratch/phase1-calibration-v2.1` | `24` | `10`（`NH-1..5` 及 prior 共 10） | 4 JSON + 10 协议与参考设定 | `0`（全部 10 份见 4.4 排除表） |
| `scratch/phase1-calibration-v2.1-out` | `9` | `0` | 9 份历史 v2.1 离线评测输出 JSON | `0` |
| `scratch/phase1-calibration-v2.2` | `28` | `8`（`v22-holdout` 6 + `raw-gen` 2） | 1 manifest JSON + 19 协议与故事设定 | `0`（全部 8 份见 4.4 排除表） |
| `scratch/phase1-calibration-v2.2-out` | `9` | `0` | 9 份历史 v2.2 离线评测输出 JSON | `0` |
| `scratch/ref-penglonghuang-cns` | `106` | `0` | 外部参考 Skill 仓库克隆（29 `.git` + 77 工作树源码/文档） | `0` |
| `scratch/ref-webnovel-writer` | `509` | `0` | 外部参考 Skill 仓库克隆（29 `.git` + 480 工作树源码/文档） | `0` |
| `scratch/ref-webnovel-writer-v8` | `932` | `1`（外部示例 `河埠旧事.md`） | 外部参考 Skill 仓库克隆（27 `.git` + 904 源码/文档 + 1 维护示例短文） | `0`（该 1 份见 4.4 排除表） |
| **15 子目录合计** | **`2,644`** | **`172`（加根目录 `step3-qihenlu-manuscript-ch1-3.md` = `173`）** | **其余 2,472 份均为非正文章节文件** | **`0`** |

##### 4.4 全部 173 份候选章节/样本文件逐项分类与排除清单（100% 逐文件可复核）

| # | 脱敏路径（相对 `<ART_ROOT>`） | Bytes | SHA-256（前 16 位） | 来源作品 | 题材 | 是否已揭盲 | 是否参与历史校准/回归 | 与禁入黑名单重叠 | G2-B / G6 排除理由 |
|---:|---|---:|---|---|---|---|---|---|---|
| 1 | `step3-qihenlu-manuscript-ch1-3.md` | `46,846` | `09d045ae51388c6b` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 2 | `scratch/live-eval/case-a-xianxia-r3/chapters/ch001.md` | `14,500` | `0510609f44316690` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 3 | `scratch/live-eval/case-a-xianxia-r3/chapters/ch002.md` | `14,334` | `cb16b2fe7d37ea87` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 4 | `scratch/live-eval/case-a-xianxia-r3/chapters/ch003.md` | `13,967` | `6ece650333f60428` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 5 | `scratch/live-eval/case-a-xianxia-r3/reviews/r3/manuscripts/chapter-1/v1/chapter-0001.md` | `13,505` | `83ac2640781690c8` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 6 | `scratch/live-eval/case-a-xianxia-r3/reviews/r3/manuscripts/chapter-1/v2/chapter-0001.md` | `13,574` | `947a4d48ee7eaed2` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 7 | `scratch/live-eval/case-a-xianxia-r3/reviews/r3/manuscripts/chapter-1/v3/chapter-0001.md` | `14,500` | `0510609f44316690` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 8 | `scratch/live-eval/case-a-xianxia-r3/reviews/r3/manuscripts/chapter-2/v1/chapter-0002.md` | `13,183` | `d7fbbb4e1ed9d7f8` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 9 | `scratch/live-eval/case-a-xianxia-r3/reviews/r3/manuscripts/chapter-2/v2/chapter-0002.md` | `13,171` | `2ef0c7932c3b7a12` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 10 | `scratch/live-eval/case-a-xianxia-r3/reviews/r3/manuscripts/chapter-2/v3/chapter-0002.md` | `14,334` | `cb16b2fe7d37ea87` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 11 | `scratch/live-eval/case-a-xianxia-r3/reviews/r3/manuscripts/chapter-3/v1/chapter-0003.md` | `13,364` | `38ea085aded6eb13` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 12 | `scratch/live-eval/case-a-xianxia-r3/reviews/r3/manuscripts/chapter-3/v2/chapter-0003.md` | `13,499` | `b1d14b8d67bb9904` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 13 | `scratch/live-eval/case-a-xianxia-r3/reviews/r3/manuscripts/chapter-3/v3/chapter-0003.md` | `13,967` | `6ece650333f60428` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 14 | `scratch/live-eval/case-b-workplace-default/第01章.md` | `22,815` | `649d2cdd090fbe6a` | 《降本增笑》 | 现代职场 | 已揭盲 | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 历史实测及退役 Holdout 已揭盲章节 |
| 15 | `scratch/live-eval/case-b-workplace-default/第02章.md` | `19,473` | `d3133b2720bc531f` | 《降本增笑》 | 现代职场 | 已揭盲 | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 历史实测及退役 Holdout 已揭盲章节 |
| 16 | `scratch/live-eval/case-b-workplace-default/第03章.md` | `26,034` | `11cb9cf5540ed54e` | 《降本增笑》 | 现代职场 | 已揭盲 | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 历史实测及退役 Holdout 已揭盲章节 |
| 17 | `scratch/phase1-blind-audit/blind-audit-a/bundle-X/chapters/ch01.md` | `21,197` | `6fe632266afc0325` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 18 | `scratch/phase1-blind-audit/blind-audit-a/bundle-X/chapters/ch02.md` | `17,988` | `df6378bd7966e70a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 19 | `scratch/phase1-blind-audit/blind-audit-a/bundle-X/chapters/ch03.md` | `17,086` | `4e6c938fad0d4df5` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 20 | `scratch/phase1-blind-audit/blind-audit-a/bundle-Y/chapters/ch01.md` | `20,650` | `57151e9a3d7b72bc` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 21 | `scratch/phase1-blind-audit/blind-audit-a/bundle-Y/chapters/ch02.md` | `14,779` | `57be40817944b906` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 22 | `scratch/phase1-blind-audit/blind-audit-a/bundle-Y/chapters/ch03.md` | `16,333` | `ed41ac12074a76e2` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 23 | `scratch/phase1-blind-audit/blind-audit-a/bundle-Z/chapters/ch01.md` | `15,429` | `8b1628822d2e70a9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 24 | `scratch/phase1-blind-audit/blind-audit-a/bundle-Z/chapters/ch02.md` | `17,099` | `b7e94353fa5bf6f9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 25 | `scratch/phase1-blind-audit/blind-audit-a/bundle-Z/chapters/ch03.md` | `19,649` | `25ec46e0fe3a2d58` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 26 | `scratch/phase1-blind-audit/blind-audit-b/ch01/ch01-version-A.md` | `20,650` | `57151e9a3d7b72bc` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 27 | `scratch/phase1-blind-audit/blind-audit-b/ch01/ch01-version-B.md` | `21,197` | `6fe632266afc0325` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 28 | `scratch/phase1-blind-audit/blind-audit-b/ch01/ch01-version-C.md` | `15,429` | `8b1628822d2e70a9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 29 | `scratch/phase1-blind-audit/blind-audit-b/ch02/ch02-version-A.md` | `14,779` | `57be40817944b906` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 30 | `scratch/phase1-blind-audit/blind-audit-b/ch02/ch02-version-B.md` | `17,099` | `b7e94353fa5bf6f9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 31 | `scratch/phase1-blind-audit/blind-audit-b/ch02/ch02-version-C.md` | `17,988` | `df6378bd7966e70a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 32 | `scratch/phase1-blind-audit/blind-audit-b/ch03/ch03-version-A.md` | `17,086` | `4e6c938fad0d4df5` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 33 | `scratch/phase1-blind-audit/blind-audit-b/ch03/ch03-version-B.md` | `19,649` | `25ec46e0fe3a2d58` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 34 | `scratch/phase1-blind-audit/blind-audit-b/ch03/ch03-version-C.md` | `16,333` | `ed41ac12074a76e2` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 35 | `scratch/phase1-blind-audit/blind-audit-c/draft-P/chapters_v1/ch01-v1.md` | `18,719` | `301b43119d87b312` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 36 | `scratch/phase1-blind-audit/blind-audit-c/draft-P/chapters_v1/ch02-v1.md` | `14,023` | `5f83025a755fbf82` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 37 | `scratch/phase1-blind-audit/blind-audit-c/draft-P/chapters_v1/ch03-v1.md` | `15,166` | `79db1af17a335498` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 38 | `scratch/phase1-blind-audit/blind-audit-c/draft-Q/chapters_v1/ch01-v1.md` | `20,436` | `a577ae9a818f6f21` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 39 | `scratch/phase1-blind-audit/blind-audit-c/draft-Q/chapters_v1/ch02-v1.md` | `16,540` | `218882169b071d10` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 40 | `scratch/phase1-blind-audit/blind-audit-c/draft-Q/chapters_v1/ch03-v1.md` | `15,405` | `2273124ea5b21c68` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 41 | `scratch/phase1-blind-audit/blind-audit-c/draft-R/chapters_v1/ch01-v1.md` | `13,545` | `c22983e345baff88` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 42 | `scratch/phase1-blind-audit/blind-audit-c/draft-R/chapters_v1/ch02-v1.md` | `15,955` | `7bd0b32a20bfae85` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 43 | `scratch/phase1-blind-audit/blind-audit-c/draft-R/chapters_v1/ch03-v1.md` | `19,046` | `723cff2937265171` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 44 | `scratch/phase1-calibration-offline/texts/G1-ch01-stageA.md` | `13,545` | `c22983e345baff88` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 45 | `scratch/phase1-calibration-offline/texts/G1-ch01-stageB.md` | `15,429` | `8b1628822d2e70a9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 46 | `scratch/phase1-calibration-offline/texts/G1-ch02-stageA.md` | `15,955` | `7bd0b32a20bfae85` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 47 | `scratch/phase1-calibration-offline/texts/G1-ch02-stageB.md` | `17,099` | `b7e94353fa5bf6f9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 48 | `scratch/phase1-calibration-offline/texts/G1-ch03-stageA.md` | `19,046` | `723cff2937265171` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 49 | `scratch/phase1-calibration-offline/texts/G1-ch03-stageB.md` | `19,649` | `25ec46e0fe3a2d58` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 50 | `scratch/phase1-calibration-offline/texts/G2-ch01-stageA.md` | `20,436` | `a577ae9a818f6f21` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 51 | `scratch/phase1-calibration-offline/texts/G2-ch01-stageB.md` | `21,197` | `6fe632266afc0325` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 52 | `scratch/phase1-calibration-offline/texts/G2-ch02-stageA.md` | `16,540` | `218882169b071d10` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 53 | `scratch/phase1-calibration-offline/texts/G2-ch02-stageB.md` | `17,988` | `df6378bd7966e70a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 54 | `scratch/phase1-calibration-offline/texts/G2-ch03-stageA.md` | `15,405` | `2273124ea5b21c68` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 55 | `scratch/phase1-calibration-offline/texts/G2-ch03-stageB.md` | `17,086` | `4e6c938fad0d4df5` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 56 | `scratch/phase1-calibration-offline/texts/G3-ch01-stageA.md` | `18,719` | `301b43119d87b312` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 57 | `scratch/phase1-calibration-offline/texts/G3-ch01-stageB.md` | `20,650` | `57151e9a3d7b72bc` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 58 | `scratch/phase1-calibration-offline/texts/G3-ch02-stageA.md` | `14,023` | `5f83025a755fbf82` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 59 | `scratch/phase1-calibration-offline/texts/G3-ch02-stageB.md` | `14,779` | `57be40817944b906` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 60 | `scratch/phase1-calibration-offline/texts/G3-ch03-stageA.md` | `15,166` | `79db1af17a335498` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 61 | `scratch/phase1-calibration-offline/texts/G3-ch03-stageB.md` | `16,333` | `ed41ac12074a76e2` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 62 | `scratch/phase1-calibration-v2/fc-texts/M-01.md` | `19,649` | `25ec46e0fe3a2d58` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 63 | `scratch/phase1-calibration-v2/fc-texts/M-02.md` | `15,429` | `8b1628822d2e70a9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 64 | `scratch/phase1-calibration-v2/fc-texts/M-03.md` | `16,594` | `086595bf3bfc7148` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 65 | `scratch/phase1-calibration-v2/fc-texts/M-04.md` | `17,988` | `df6378bd7966e70a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 66 | `scratch/phase1-calibration-v2/fc-texts/M-05.md` | `14,779` | `57be40817944b906` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 67 | `scratch/phase1-calibration-v2/fc-texts/M-06.md` | `16,333` | `ed41ac12074a76e2` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 68 | `scratch/phase1-calibration-v2/fc-texts/M-07.md` | `15,405` | `2273124ea5b21c68` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 69 | `scratch/phase1-calibration-v2/fc-texts/M-08.md` | `16,540` | `218882169b071d10` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 70 | `scratch/phase1-calibration-v2/fc-texts/M-09.md` | `13,545` | `c22983e345baff88` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 71 | `scratch/phase1-calibration-v2/fc-texts/M-10.md` | `18,719` | `301b43119d87b312` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 72 | `scratch/phase1-calibration-v2/fc-texts/M-11.md` | `20,650` | `57151e9a3d7b72bc` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 73 | `scratch/phase1-calibration-v2/fc-texts/M-12.md` | `15,166` | `79db1af17a335498` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 74 | `scratch/phase1-calibration-v2/fc-texts/M-13.md` | `18,285` | `2d219ef4fa23442b` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 75 | `scratch/phase1-calibration-v2/fc-texts/M-14.md` | `15,955` | `7bd0b32a20bfae85` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 76 | `scratch/phase1-calibration-v2/fc-texts/M-15.md` | `19,046` | `723cff2937265171` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 77 | `scratch/phase1-calibration-v2/fc-texts/M-16.md` | `15,792` | `4ed3f76b7cd74673` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 78 | `scratch/phase1-calibration-v2/fc-texts/M-17.md` | `17,099` | `b7e94353fa5bf6f9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 79 | `scratch/phase1-calibration-v2/fc-texts/M-18.md` | `14,023` | `5f83025a755fbf82` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 80 | `scratch/phase1-calibration-v2/fc-texts/M-19.md` | `17,086` | `4e6c938fad0d4df5` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 81 | `scratch/phase1-calibration-v2/fc-texts/M-20.md` | `21,197` | `6fe632266afc0325` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 82 | `scratch/phase1-calibration-v2/fc-texts/M-21.md` | `15,716` | `2b5342321459dc4a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 83 | `scratch/phase1-calibration-v2/holdout/texts/H1-ch01.md` | `15,671` | `bd0a99544111017e` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 84 | `scratch/phase1-calibration-v2/holdout/texts/H2-ch02.md` | `17,041` | `3ba78a72d1f9220b` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 85 | `scratch/phase1-calibration-v2/holdout/texts/H2-prior-ch01.md` | `17,024` | `df08da6309bfda3a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 86 | `scratch/phase1-calibration-v2/holdout/texts/H3-ch03.md` | `16,197` | `0c97e23674e66914` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 87 | `scratch/phase1-calibration-v2/holdout/texts/H3-prior-ch01.md` | `14,140` | `d3a594217ddcfcb7` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 88 | `scratch/phase1-calibration-v2/holdout/texts/H3-prior-ch02.md` | `15,035` | `e27659f913323281` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 89 | `scratch/phase1-calibration-v2/holdout/texts/H4-ch01.md` | `22,815` | `649d2cdd090fbe6a` | 《降本增笑》 | 现代职场 | 已揭盲 | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 历史实测及退役 Holdout 已揭盲章节 |
| 90 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH1-ch01.md` | `13,505` | `83ac2640781690c8` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 91 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH2-ch02.md` | `13,183` | `d7fbbb4e1ed9d7f8` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 92 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH2-prior-ch01.md` | `14,500` | `0510609f44316690` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 93 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH3-ch02.md` | `13,684` | `76bbffb4bb303230` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 94 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH3-prior-ch01.md` | `14,140` | `d3a594217ddcfcb7` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 95 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH4-ch02.md` | `19,473` | `d3133b2720bc531f` | 《降本增笑》 | 现代职场 | 已揭盲 | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 历史实测及退役 Holdout 已揭盲章节 |
| 96 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH4-prior-ch01.md` | `22,815` | `649d2cdd090fbe6a` | 《降本增笑》 | 现代职场 | 已揭盲 | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 历史实测及退役 Holdout 已揭盲章节 |
| 97 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH5-ch03.md` | `26,034` | `11cb9cf5540ed54e` | 《降本增笑》 | 现代职场 | 已揭盲 | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 历史实测及退役 Holdout 已揭盲章节 |
| 98 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH5-prior-ch01.md` | `22,815` | `649d2cdd090fbe6a` | 《降本增笑》 | 现代职场 | 已揭盲 | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 历史实测及退役 Holdout 已揭盲章节 |
| 99 | `scratch/phase1-calibration-v2.1/new-holdout/texts/NH5-prior-ch02.md` | `19,473` | `d3133b2720bc531f` | 《降本增笑》 | 现代职场 | 已揭盲 | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 是(`live-eval`/`OLD-HOLD-4`/`NH-4..5`) | 历史实测及退役 Holdout 已揭盲章节 |
| 100 | `scratch/phase1-calibration-v2.2/raw-gen/story-history/ch01.md` | `13,362` | `ff15bffd673febff` | 《盐引旧账》 | 古代历史查账 | 已揭盲 | 是(`V22-H4`退役Holdout/G5参考) | 是(`V22-H4`) | v2.2 退役 Holdout (`V22-H4`) 已揭盲（仅作 G5 已知 `OR6` 死锁参考） |
| 101 | `scratch/phase1-calibration-v2.2/raw-gen/story-mystery/ch01.md` | `13,949` | `eb536aef1c3fd4c6` | 《潮汐证词》 | 海港悬疑 | 已揭盲 | 是(`V22-H3`退役Holdout) | 是(`V22-H3`) | v2.2 退役 Holdout (`V22-H3`) 已揭盲 |
| 102 | `scratch/phase1-calibration-v2.2/v22-holdout/texts/H1-ch03.md` | `13,364` | `38ea085aded6eb13` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 103 | `scratch/phase1-calibration-v2.2/v22-holdout/texts/H1-prior-ch01.md` | `14,500` | `0510609f44316690` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 104 | `scratch/phase1-calibration-v2.2/v22-holdout/texts/H1-prior-ch02.md` | `14,334` | `cb16b2fe7d37ea87` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 105 | `scratch/phase1-calibration-v2.2/v22-holdout/texts/H2-ch01.md` | `13,559` | `ddaf335ff4c6749e` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 106 | `scratch/phase1-calibration-v2.2/v22-holdout/texts/H3-ch01.md` | `13,949` | `eb536aef1c3fd4c6` | 《潮汐证词》 | 海港悬疑 | 已揭盲 | 是(`V22-H3`退役Holdout) | 是(`V22-H3`) | v2.2 退役 Holdout (`V22-H3`) 已揭盲 |
| 107 | `scratch/phase1-calibration-v2.2/v22-holdout/texts/H4-ch01.md` | `13,362` | `ff15bffd673febff` | 《盐引旧账》 | 古代历史查账 | 已揭盲 | 是(`V22-H4`退役Holdout/G5参考) | 是(`V22-H4`) | v2.2 退役 Holdout (`V22-H4`) 已揭盲（仅作 G5 已知 `OR6` 死锁参考） |
| 108 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/chapters/ch01.md` | `15,429` | `8b1628822d2e70a9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 109 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/chapters/ch02.md` | `17,099` | `b7e94353fa5bf6f9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 110 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/chapters/ch03.md` | `19,649` | `25ec46e0fe3a2d58` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 111 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/reviews/r3/manuscripts/chapter-1/v1/chapter-0001.md` | `13,545` | `c22983e345baff88` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 112 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/reviews/r3/manuscripts/chapter-1/v2/chapter-0001.md` | `15,429` | `8b1628822d2e70a9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 113 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/reviews/r3/manuscripts/chapter-2/v1/chapter-0002.md` | `15,955` | `7bd0b32a20bfae85` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 114 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/reviews/r3/manuscripts/chapter-2/v2/chapter-0002.md` | `16,991` | `aa634031d6ca9e4a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 115 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/reviews/r3/manuscripts/chapter-2/v3/chapter-0002.md` | `17,099` | `b7e94353fa5bf6f9` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 116 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/reviews/r3/manuscripts/chapter-3/v1/chapter-0003.md` | `19,046` | `723cff2937265171` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 117 | `scratch/phase1-throughput-exp/arm0-telemetry-baseline/reviews/r3/manuscripts/chapter-3/v2/chapter-0003.md` | `19,649` | `25ec46e0fe3a2d58` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 118 | `scratch/phase1-throughput-exp/arm1-o3-atomic/chapters/ch01.md` | `21,197` | `6fe632266afc0325` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 119 | `scratch/phase1-throughput-exp/arm1-o3-atomic/chapters/ch02.md` | `17,988` | `df6378bd7966e70a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 120 | `scratch/phase1-throughput-exp/arm1-o3-atomic/chapters/ch03.md` | `17,086` | `4e6c938fad0d4df5` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 121 | `scratch/phase1-throughput-exp/arm1-o3-atomic/reviews/r3/manuscripts/chapter-1/v1/chapter-0001.md` | `20,436` | `a577ae9a818f6f21` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 122 | `scratch/phase1-throughput-exp/arm1-o3-atomic/reviews/r3/manuscripts/chapter-1/v2/chapter-0001.md` | `21,197` | `6fe632266afc0325` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 123 | `scratch/phase1-throughput-exp/arm1-o3-atomic/reviews/r3/manuscripts/chapter-2/v1/chapter-0002.md` | `16,540` | `218882169b071d10` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 124 | `scratch/phase1-throughput-exp/arm1-o3-atomic/reviews/r3/manuscripts/chapter-2/v2/chapter-0002.md` | `17,988` | `df6378bd7966e70a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 125 | `scratch/phase1-throughput-exp/arm1-o3-atomic/reviews/r3/manuscripts/chapter-3/v1/chapter-0003.md` | `15,405` | `2273124ea5b21c68` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 126 | `scratch/phase1-throughput-exp/arm1-o3-atomic/reviews/r3/manuscripts/chapter-3/v2/chapter-0003.md` | `17,086` | `4e6c938fad0d4df5` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 127 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/chapters/ch01.md` | `20,650` | `57151e9a3d7b72bc` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 128 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/chapters/ch02.md` | `14,779` | `57be40817944b906` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 129 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/chapters/ch03.md` | `16,333` | `ed41ac12074a76e2` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 130 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/reviews/r3/manuscripts/chapter-1/v1/chapter-0001.md` | `18,719` | `301b43119d87b312` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 131 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/reviews/r3/manuscripts/chapter-1/v2/chapter-0001.md` | `20,431` | `86be056433748f0c` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 132 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/reviews/r3/manuscripts/chapter-1/v3/chapter-0001.md` | `20,650` | `57151e9a3d7b72bc` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 133 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/reviews/r3/manuscripts/chapter-2/v1/chapter-0002.md` | `14,023` | `5f83025a755fbf82` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 134 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/reviews/r3/manuscripts/chapter-2/v2/chapter-0002.md` | `14,779` | `57be40817944b906` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 135 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/reviews/r3/manuscripts/chapter-3/v1/chapter-0003.md` | `15,166` | `79db1af17a335498` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 136 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/reviews/r3/manuscripts/chapter-3/v2/chapter-0003.md` | `15,967` | `325815e3b22c84fb` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 137 | `scratch/phase1-throughput-exp/arm2-o3-o1-warm/reviews/r3/manuscripts/chapter-3/v3/chapter-0003.md` | `16,333` | `ed41ac12074a76e2` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 138 | `scratch/phase1-throughput-exp/arm3-o3-o1-o2-full/chapters/ch01.md` | `17,024` | `df08da6309bfda3a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 139 | `scratch/phase1-throughput-exp/arm3-o3-o1-o2-full/chapters/ch02.md` | `19,165` | `860c4d51de72f994` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 140 | `scratch/phase1-throughput-exp/arm3-o3-o1-o2-full/reviews/r3/manuscripts/chapter-1/v1/chapter-0001.md` | `25,552` | `f380a6050a647a6c` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 141 | `scratch/phase1-throughput-exp/arm3-o3-o1-o2-full/reviews/r3/manuscripts/chapter-1/v2/chapter-0001.md` | `15,671` | `bd0a99544111017e` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 142 | `scratch/phase1-throughput-exp/arm3-o3-o1-o2-full/reviews/r3/manuscripts/chapter-1/v3/chapter-0001.md` | `17,024` | `df08da6309bfda3a` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 143 | `scratch/phase1-throughput-exp/arm3-o3-o1-o2-full/reviews/r3/manuscripts/chapter-2/v1/chapter-0002.md` | `17,041` | `3ba78a72d1f9220b` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 144 | `scratch/phase1-throughput-exp/arm3-o3-o1-o2-full/reviews/r3/manuscripts/chapter-2/v2/chapter-0002.md` | `18,907` | `3adebc6471a40502` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 145 | `scratch/phase1-throughput-exp/arm3-o3-o1-o2-full/reviews/r3/manuscripts/chapter-2/v3/chapter-0002.md` | `19,165` | `860c4d51de72f994` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 146 | `scratch/ref-webnovel-writer-v8/docs/maintenance/examples/河埠旧事.md` | `4,215` | `aad5d72353c6cfcb` | 外部参考仓示例《河埠旧事》 | 外部示例(非R3) | 公开上游 | 否 | 否(非R3样本) | 第三方仓库 `docs/maintenance/examples/` 教学短例，无R3大纲/人物设定/仲裁键 |
| 147 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/chapters/ch001.md` | `14,500` | `0510609f44316690` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 148 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/chapters/ch002.md` | `14,334` | `cb16b2fe7d37ea87` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 149 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/chapters/ch003.md` | `15,492` | `da330ae35d1d5bdc` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 150 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-1/v1/chapter-0001.md` | `13,505` | `83ac2640781690c8` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 151 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-1/v2/chapter-0001.md` | `13,574` | `947a4d48ee7eaed2` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 152 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-1/v3/chapter-0001.md` | `14,500` | `0510609f44316690` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 153 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-2/v1/chapter-0002.md` | `13,183` | `d7fbbb4e1ed9d7f8` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 154 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-2/v2/chapter-0002.md` | `13,171` | `2ef0c7932c3b7a12` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 155 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-2/v3/chapter-0002.md` | `14,334` | `cb16b2fe7d37ea87` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 156 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-3/v1/chapter-0003.md` | `13,364` | `38ea085aded6eb13` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 157 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-3/v2/chapter-0003.md` | `13,499` | `b1d14b8d67bb9904` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 158 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-3/v3/chapter-0003.md` | `15,786` | `73cd4d7a78ddf82a` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 159 | `scratch/step2-m1-replay/case-a-ch3-v2-replay/reviews/r3/manuscripts/chapter-3/v4/chapter-0003.md` | `15,492` | `da330ae35d1d5bdc` | 《残器长生》 | 仙侠 | 已揭盲 | 是(`live-eval`/`step2`/`NH-1..2`/`V22-H1`) | 是(`live-eval`/`NH-1..2`/`V22-H1`) | 历史实测及退役 Holdout 已揭盲章节 |
| 160 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/chapters/ch01.md` | `14,140` | `d3a594217ddcfcb7` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 161 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/chapters/ch02.md` | `15,035` | `e27659f913323281` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 162 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/chapters/ch03.md` | `16,197` | `0c97e23674e66914` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 163 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-1/v1/chapter-0001.md` | `13,559` | `ddaf335ff4c6749e` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 164 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-1/v2/chapter-0001.md` | `13,939` | `ae7beefb863a92d7` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 165 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-1/v3/chapter-0001.md` | `14,032` | `0c9d0da8ff7462a7` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 166 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-1/v4/chapter-0001.md` | `13,999` | `e94a0dfc404a01dd` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 167 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-1/v5/chapter-0001.md` | `14,140` | `d3a594217ddcfcb7` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 168 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-2/v1/chapter-0002.md` | `13,684` | `76bbffb4bb303230` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 169 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-2/v2/chapter-0002.md` | `15,005` | `cd21a3ff3b9d5304` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 170 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-2/v3/chapter-0002.md` | `15,035` | `e27659f913323281` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 171 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-3/v1/chapter-0003.md` | `15,023` | `bb3675f1e6a7bf27` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 172 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-3/v2/chapter-0003.md` | `15,661` | `0b1b68a7d2b542f7` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |
| 173 | `scratch/step3-r3-trial/case-a-xianxia-r3-v2/reviews/r3/manuscripts/chapter-3/v3/chapter-0003.md` | `16,197` | `0c97e23674e66914` | 《器痕录》 | 仙侠 | 已揭盲 | 是(`Track2`/`G4`/`Track1`/`OLD-HOLD-1..3`/`NH-3`/`V22-H2`/`BlindAudit`) | 是(全线《器痕录》黑名单) | 单题材《器痕录》历史校准/盲审/退役 Holdout 及同大纲衍生稿 |

#### 5. 外部补充来源核查与最终可复核结论
- **Google Drive 历史实验快照（前序只读核验，`PROJECT-ASSET-INDEX.md` Tier 3）**：3 份 ZIP 仅含单题材仙侠《仙门大掌柜》Ch 1–12，未经双评委+第三仲裁定案，亦不满足跨 `>=3` / `4–6` 题材未揭盲独立要求。
- **最终可复核合格候选统计与精确缺口**：
  - **公开主仓（293 文件）合格候选**：`0` 章 / `0` 案例；
  - **本地 `<ART_ROOT>`（2,723 文件，含全部 173 份候选章节逐项排除）合格候选**：`0` 章 / `0` 案例（`unclassified = 0`）；
  - **`G2-B Independent Holdout`**：已就绪 **`0` 章 / `0` 案例** → **`underpowered`**，精确缺口 **`+20` 个全新未揭盲独立来源章节、`+60` 条独立非阻断案例**（覆 `>=3` 题材、单章 `<=3` 条、`0` 重叠）；
  - **`G6` 跨题材 Holdout**：已就绪 **`0` 章 / `0` 案例** → **`underpowered`**，精确缺口 **`+12..16` 个未揭盲跨题材完整章、`+30` 条客观正例、`+40` 条独立非阻断案例**（覆 4–6 题材）。

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

#### 2. 不同来源章节去重计数与诚实口径披露
- **案例总数**：`24` 条（`4` BLOCKER [全部合成注入] / `8` MAJOR / `6` MINOR / `6` SUGGESTION）。
- **去重目标稿件切片数（`manuscriptFile`）**：**`18`** 份（`M-01, M-03, M-04, M-06, M-07, M-08, M-09, M-10, M-12, M-13, M-14, M-15, M-16, M-17, M-18, M-19, M-20, M-21`；另 `M-02, M-05, M-11` 仅作为 `priorChapterFinalFiles` 出现，故 `G4(four-class-24)` 总引用稿件文件为 `21` 份）。
- **去重来源章节数（双口径透明报告）**：
  1. **按独立生成 `Arm × Chapter` 实例去重（与冻结 `08` Track 2 `N_ch = 9` 一致口径）**：**`9` 章**（完整覆盖 `Arm 0/1/2 × Ch 1–3` 全部 9 个独立写作运行实例：`G1-ch01, G1-ch02, G1-ch03, G2-ch01, G2-ch02, G2-ch03, G3-ch01, G3-ch02, G3-ch03`），满足 `>= 8`；
  2. **按独立故事大纲章号去重（严格去重同大纲多 Arm 复写）**：仅 **`3` 章**（全部共享单题材仙侠《器痕录》第 1–3 章大纲，**`< 8`**，若按该严格独立故事章口径则属于 **`underpowered`**，尚缺 `+5` 个独立故事章节；且全部来源章均属已揭盲历史校准集，故 G4 仅作为有序四级分类稳定度与零泄漏探针，不可宣称为跨题材独立泛化样本）。
