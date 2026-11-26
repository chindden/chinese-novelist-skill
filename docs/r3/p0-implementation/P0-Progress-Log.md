# R3 审核体系 v3 · P0 受控研发进度与验收日志

> **分支**：`feat/r3-p0-controlled`（基线 `feat/r3-migration` @ `b5572a943f9157cda07faa7910dcbfd20b1a3ba5`）  
> **架构冻结基线**：`docs/r3/review-v3/` `v1.2.3 (Freeze-Ready Final)`  
> **维护规则**：
> 1. 所有 P0 实施活动、状态变更、独立提交、测试执行、GPT-6 审核结论及返工/复审记录均必须按时间顺序追加至本日志，**严禁事后篡改或删除历史审核与返工记录**。
> 2. **Neon 仅可将任务推进至 `READY_FOR_REVIEW`**，提交时必须附带完整独立 Commit SHA、修改文件清单、精确 Diff 摘要与原始测试命令及通过结果；**仅在 GPT-6 明确给出 `ACCEPTED` 审核结论后**，方可更新对应任务为 `ACCEPTED`。
> 3. 若 GPT-6 给出 `CHANGES_REQUESTED`，必须在本文件“二、返工及复审记录台账”登记缺陷编号与整改要求，并在原任务完成整改与复审通过前**严禁开启任何下游任务**。

---

## 一、按时间顺序实施活动日志

### [2026-11-25] · 管理体系初始化 · P0 实施管理 PRD `v1.0` 建档（未启动 P0-0）

| 字段 | 记录内容 |
|---|---|
| **GitHub 提交时间（UTC）** | `2026-11-25T17:12:50Z`（*仅记录本初始化管理文档在 GitHub 的提交时间，不代表实际研发开始时间*） |
| **关联任务** | `P0-MGMT-INIT`（研发项目管理体系前置建档，尚未启动 `P0-0`） |
| **状态变更** | 建档提交（`READY_FOR_REVIEW`）→ GPT-6 审核退回（`CHANGES_REQUESTED`）；`P0-0` ~ `P0-6` 全部保持 `NOT_STARTED` |
| **分支与基线** | 新建 `feat/r3-p0-controlled`，基线 `origin/feat/r3-migration` @ `b5572a943f9157cda07faa7910dcbfd20b1a3ba5` |
| **Commit SHA** | `95b0951d021eddf5d23a1710944550ccc38ca1ff` |
| **修改文件** | 仅新增 3 份管理文档：<br>• `docs/r3/p0-implementation/README.md`<br>• `docs/r3/p0-implementation/P0-Implementation-PRD.md`<br>• `docs/r3/p0-implementation/P0-Progress-Log.md` |
| **边界核验** | 0 生产代码改动、0 Skill 改动、0 R2 改动、0 测试脚本改动、0 冻结架构文档（`docs/r3/review-v3/`）改动、0 实验基线改动；`G2-B` `underpowered` 状态完整保留 |
| **测试结果** | 本轮为纯管理文档建档，未触碰代码与测试脚本；待 `P0-0` 获批启动后执行全量基线测试 |
| **GPT-6 审核结论** | **`CHANGES_REQUESTED`**（整体结构与管理机制认可；要求修正两处：① `P0-2` 写手任务卡末尾先后顺序表述消除歧义，明确“倒数第二部分：本书文风锚点示范 → 最后一部分（最末位）：上一章结尾原文（500–900 字）”；② 补齐初始化 Commit 完整 40 位 SHA `95b0951d021eddf5d23a1710944550ccc38ca1ff` 与 GitHub 提交时间 `2026-11-25T17:12:50Z` 的可追溯记录） |
| **返工及复审记录** | 关联下方返工台账 **`RW-PRD-001`** |

---

### [2026-11-25] · 管理文档整改重提 · P0 实施管理 PRD `v1.0.1`（响应 `RW-PRD-001`，未启动 P0-0）

| 字段 | 记录内容 |
|---|---|
| **GitHub 提交时间（UTC）** | `2026-11-25T17:23:04Z`（*仅记录 `v1.0.1` 内容修订在 GitHub 的提交时间，不代表实际研发开始时间*） |
| **关联任务** | `P0-MGMT-REV1`（响应 GPT-6 对 `P0-PRD v1.0` 的 `CHANGES_REQUESTED`；`P0-0` ~ `P0-6` 继续保持 `NOT_STARTED`） |
| **状态变更** | 管理 PRD：`CHANGES_REQUESTED` → **`READY_FOR_REVIEW`**（提交 GPT-6 复审，两项主要整改通过，要求补齐本 `v1.0.1` 内容修订 Commit SHA 追溯记录后进入最终复审）；`P0-0` ~ `P0-6` 全部保持 `NOT_STARTED` |
| **整改内容** | ① 统一修正 `README.md` 与 `P0-Implementation-PRD.md` 中 `P0-2` 写手任务卡末尾顺序表述，严格与 `03` 第 2.1 节一致（倒数第二部分：本书文风锚点示范；最后一部分/最末位：上一章结尾原文 500–900 字）；<br>② 在三份管理文档中补齐初始化 Commit 完整 40 位 SHA `95b0951d021eddf5d23a1710944550ccc38ca1ff` 与 GitHub 提交时间 `2026-11-25T17:12:50Z`（明确区分其非实际研发开始时间）；<br>③ 登记 `CHANGES_REQUESTED` 审核结论及返工台账 `RW-PRD-001` |
| **修改文件** | 仅修改上述 3 份管理文档（`docs/r3/p0-implementation/{README.md,P0-Implementation-PRD.md,P0-Progress-Log.md}`），其余文件 0 改动 |
| **Commit SHA** | `a12774f50956c5081252fe1722333893331ded5e`（区分于初始化 Commit `95b0951d021eddf5d23a1710944550ccc38ca1ff`） |
| **边界核验** | 0 冻结架构文档改动、0 生产代码/Skill/R2/测试/实验基线改动、未启动 `P0-0` 或任何 P0 任务、未创建或合并代码 PR |
| **GPT-6 审核结论** | 两项内容整改通过，要求补齐 `v1.0.1` 内容修订 Commit 追溯元数据后进行最终复审（现已补齐并重新提交 `READY_FOR_REVIEW`） |
| **返工及复审记录** | 对应 **`RW-PRD-001`** 整改与元数据追溯补齐 |

---

### [2026-11-25] · 元数据追溯补齐 · 补记 `v1.0.1` 内容修订 Commit SHA 与提交时间（未启动 P0-0）

| 字段 | 记录内容 |
|---|---|
| **GitHub 提交时间（UTC）** | `2026-11-25T17:44:23Z`（*仅记录本次元数据追溯补齐 Commit 在 GitHub 的提交时间，不代表实际研发开始时间*） |
| **关联任务** | `P0-MGMT-META`（响应 GPT-6 对 `v1.0.1` 复审提出的可追溯性补齐要求；`P0-0` ~ `P0-6` 全部保持 `NOT_STARTED`） |
| **状态变更** | 管理 PRD：补齐 `v1.0.1` 追溯元数据 → 提交 GPT-6 最终复审（`READY_FOR_REVIEW`）；`P0-0` ~ `P0-6` 全部保持 `NOT_STARTED` |
| **Commit SHA** | `e52105adca3f994fca3cbdeef9aa935479ceaf9b` |
| **修改文件** | 仅修改 3 份管理文档（`docs/r3/p0-implementation/{README.md,P0-Implementation-PRD.md,P0-Progress-Log.md}`，`+13 / -11`），其余文件 0 改动 |
| **边界核验** | 明确区分初始化 Commit `95b0951d`（`17:12:50Z`）与 `v1.0.1` 内容修订 Commit `a12774f5`（`17:23:04Z`），未自引用本次元数据 Commit SHA；0 架构/代码/Skill/R2/测试/基线改动 |
| **GPT-6 审核结论** | 成为 GPT-6 最终验收基线（见下方 `2026-11-26` 验收记录） |
| **返工及复审记录** | 完成 **`RW-PRD-001`** 全部整改与追溯补齐 |

---

### [2026-11-26] · GPT-6 最终验收通过 · P0 实施管理 PRD `v1.0.1` 正式冻结（未启动 P0-0）

| 字段 | 记录内容 |
|---|---|
| **验收日期** | `2026-11-26` |
| **关联任务** | `P0-MGMT-ACCEPTANCE`（P0 实施管理 PRD `v1.0.1` 最终验收；**管理 PRD 验收通过不代表 `P0-0` 已获启动授权**） |
| **状态变更** | 管理 PRD：`READY_FOR_REVIEW` → **`ACCEPTED`**（正式冻结）；返工项 `RW-PRD-001` → **`CLOSED`**；`P0-0` ~ `P0-6` 全部继续保持 **`NOT_STARTED`** |
| **审核基线 Commit SHA** | `e52105adca3f994fca3cbdeef9aa935479ceaf9b`（内容修订来源 `a12774f50956c5081252fe1722333893331ded5e`） |
| **GPT-6 审核结论** | **`ACCEPTED`**（`P0-2` 末尾顺序、初始化 Commit 与 `v1.0.1` Commit 追溯链路、6 态验收分权与 `G2-B underpowered` 边界全部核验通过，P0 实施管理 PRD `v1.0.1` 正式冻结） |
| **后续安排** | 本轮同步建立全仓库级长期上下文档案 `docs/PROJECT-CONTEXT.md` 并交付 GPT-6 独立审核；`P0-0` 须等待作者单独正式授权后方可启动 |

---

### [2026-11-26] · `P0-0` · 正式启动记录（`NOT_STARTED` → `IN_PROGRESS`）

| 字段 | 记录内容 |
|---|---|
| **触发与授权依据** | ① 作者此前已明确授予 **`P0-0` 预先授权**：`PROJECT-CONTEXT` 与 `AGENT-HANDOFF` 经 GPT-6 独立验收通过后，Neon 可直接启动纯只读 `P0-0`，无需再次申请授权（登记于 `DEC-11`）；<br>② **GPT-6 已对最终一致性修正 Commit `2d6061d6cd0e8b4b2da77619cb58239c44dc332e`（GitHub 提交时间 `2026-11-26T00:52:10Z`）给出最终验收结论：`ACCEPTED`**。 |
| **关联任务** | `P0-0`（研发基线审计与实施准备，纯只读审计，严禁修改生产代码） |
| **状态变更** | `NOT_STARTED` → **`IN_PROGRESS`**（*注：完整保留上方此前历史“尚未授权”记录，未删改任何历史状态*） |
| **分支与起始基线** | `feat/r3-p0-controlled` @ `2d6061d6cd0e8b4b2da77619cb58239c44dc332e`（代码与冻结架构相对 `b5572a94` 保持 0 字节差异） |
| **执行范围** | 按冻结 `P0-Implementation-PRD v1.0.1` 执行 7 项只读审计：代码基线、与本地 `feat/r3-phase1-throughput-o1-o3` (`c0966b12`) 差异、Node/Python 自动化测试基线固化、全仓 S1 消费者与 `ENG-FIX-P1` 扫描、G1–G6 样本就绪度核查、`G2-B underpowered` 缺口清册、输出 `P0-0-Baseline-Audit-Report.md` |

---

### [2026-11-26] · `P0-0` · 纯只读基线审计完成与初次提审（`IN_PROGRESS` → `READY_FOR_REVIEW` → `CHANGES_REQUESTED`）

| 字段 | 记录内容 |
|---|---|
| **GitHub 提交时间（UTC）** | `2026-11-26T02:58:13Z` |
| **关联任务** | `P0-0`（研发基线审计与实施准备） |
| **状态变更** | `IN_PROGRESS` → `READY_FOR_REVIEW` → GPT-6 审核退回 **`CHANGES_REQUESTED`**（`P0-1` ~ `P0-6` 全部继续保持 `NOT_STARTED`） |
| **Commit SHA** | `86cbc9f3ad37c635f134eeea2a89317d5eef0a3c`（一任务一独立 Commit，仅修改 `docs/r3/p0-implementation/` 下 4 份文档，`+188 / -15`） |
| **修改文件** | • 新增 `docs/r3/p0-implementation/P0-0-Baseline-Audit-Report.md`<br>• 更新 `docs/r3/p0-implementation/P0-Progress-Log.md`<br>• 更新 `docs/r3/p0-implementation/README.md`<br>• 更新 `docs/r3/p0-implementation/P0-Implementation-PRD.md`（仅限填写 `P0-0` “10. 实际证据记录”、“11. GPT-6 验收状态”及第五节 `P0-0` 行，冻结条款 0 改动） |
| **测试结果（零代码改动基线固化）** | ① **R3 `node --test`（7 文件）**：`71 / 71` passed（`0 fail`, `0 skipped`, exit `0`）；<br>② **V3 / R2 独立 `node` 脚本（10 文件）**：`10 / 10` 全绿（exit `0`：`init_chapter_summaries` 6 passed、`validate_project` 8 passed、`v3_gate` 16 assertions、`check_repetition` 2 assertions 及 6 个单套件 PASS/OK）；<br>③ **Python `unittest`（2 文件）**：`Ran 12 tests in 0.956s — OK`（`test_snapshot.py` 2/2 + `test_webnovel_knowledge.py` 10/10，exit `0`）；<br>④ **零代码污染校验**：`git diff --name-only 2d6061d6..86cbc9f3` 仅限 `docs/r3/p0-implementation/`（此前 `b5572a94..2d6061d6` 为经 GPT-6 `ACCEPTED` 的项目文档提交），0 生产代码/Skill/R2/测试/冻结架构改动 |
| **关键审计发现摘要** | ① `c0966b12` 含 19 文件差异（`+2461/-60`），其中旧版 `precheck_chapter.mjs` 硬阻断字数与重复段直接违背冻结 `06`，严禁整枝合并；<br>② 全仓查明 5 处核心 S1 硬编码校验脚本与 5 处透传脚本；核实 `r3_p1_common.mjs` L118/125/206 遗留缺陷由 `P0-1` 修复，原 `ENG-FIX-P1` 的 `r3_atomic_ops`/`r3_telemetry` 脚本不在主基线、由 `P0-4` 及后续遥测原生规避；<br>③ 核实 G1/G2-A/G4 原始样本存在于本地 VM，**`G2-B`（`0/20` 章、`0/60` 案例）与 `G6`（`0/12–16` 章）均为 `underpowered`**，且 `G3` 缺 `+1` 章/`+6` 段、`G5` 缺 `+2` 死锁章；明确 `P0-1`~`P0-5` 不依赖外部历史包 |
| **GPT-6 审核结论** | **`CHANGES_REQUESTED`**（整体审计方向认可，不重做 `P0-0`、不重跑全量测试，要求补齐 3 项并解释零污染区间：① 补齐原始 `P0-0` Commit 完整 SHA `86cbc9f3ad37c635f134eeea2a89317d5eef0a3c` 与时间 `2026-11-26T02:58:13Z`；② 补齐 `b5572a94` 完整 73 文件清单与 `c0966b12` 完整 19 文件差异清单；③ 补齐 G1/G2-A/G3/G4/G5 脱敏历史资产 Manifest、完整性检查输出及 G2-B/G6 搜索核查依据） |
| **返工及复审记录** | 关联下方返工台账 **`RW-P0-0-001`** |

---

### [2026-11-26] · `P0-0` · 第一轮整改补充提交（响应 `RW-P0-0-001`：`CHANGES_REQUESTED` → `IN_PROGRESS` → `READY_FOR_REVIEW`）

| 字段 | 记录内容 |
|---|---|
| **GitHub 提交时间（UTC）** | `2026-11-26T03:11:59Z` |
| **关联任务** | `P0-0`（响应 `RW-P0-0-001` 第一轮整改补充；完整保留原始 `P0-0` 提交 `86cbc9f3ad37c635f134eeea2a89317d5eef0a3c`） |
| **状态变更** | `CHANGES_REQUESTED` → `IN_PROGRESS` → `READY_FOR_REVIEW`（GPT-6 二轮复审确认主体整改完成，提出 2 项最终补齐要求；`P0-1` ~ `P0-6` 全部继续保持 `NOT_STARTED`） |
| **原始 `P0-0` Commit SHA** | `86cbc9f3ad37c635f134eeea2a89317d5eef0a3c`（`2026-11-26T02:58:13Z`） |
| **本轮整改补充 Commit SHA** | `9747e146e016155055b928d7a664650cb76def5c`（`+206 / -19`，4 files changed） |
| **整改内容** | ① 在 4 份管理文档补齐原始 `P0-0` Commit 完整 SHA `86cbc9f3ad37c635f134eeea2a89317d5eef0a3c` 与时间 `2026-11-26T02:58:13Z`；<br>② 补齐附录 A（冻结基线 `b5572a94` 全量 73 文件清单，零通配符）与附录 B（`c0966b12` 完整 19 文件差异表，保留不合并决定）；<br>③ 补齐附录 C（18 份历史实验文件脱敏 Manifest）与零污染区间 `2d6061d6..86cbc9f3` 说明 |
| **修改文件** | 仅限 `docs/r3/p0-implementation/{P0-0-Baseline-Audit-Report.md,P0-Progress-Log.md,P0-Implementation-PRD.md,README.md}`，其余文件 0 改动 |
| **GPT-6 二轮复审结论** | 主体内容核验通过（73 文件与 GitHub 文件树逐项匹配、19 文件统计一致、零代码污染、`P0-1`~`P0-6` 保持 `NOT_STARTED`），要求补齐最后 2 项进入最终验收：① 正式登记 `9747e146e016155055b928d7a664650cb76def5c` 与提交时间；② 将附录 C.2 替换为真正可执行的只读 Python 校验代码与实跑输出（17 JSON + 1 MD = 18 份 + 62 引用稿件），并补充附录 C.3 G2-B/G6 实际扫描命令与排除依据 |
| **返工及复审记录** | 关联下方返工台账 **`RW-P0-0-001`** |

---

### [2026-11-26] · `P0-0` · 二轮复审补齐提交（`8ac888fc` → GPT-6 在 Issue #4 正式给出 `CHANGES_REQUESTED`）

| 字段 | 记录内容 |
|---|---|
| **GitHub 提交时间（UTC）** | `2026-11-26T03:41:39Z` |
| **关联任务** | `P0-0`（响应 GPT-6 对 `9747e146` 的二轮复审意见；完整保留 `86cbc9f3` 与 `9747e146` 全部历史提交） |
| **状态变更** | `CHANGES_REQUESTED` → `IN_PROGRESS` → `READY_FOR_REVIEW` → GPT-6 于 `2026-11-26T05:08:16Z` 在 Issue #4 正式退回 **`CHANGES_REQUESTED`**（`P0-1` ~ `P0-6` 全部继续保持 `NOT_STARTED`） |
| **本轮补齐 Commit SHA** | `8ac888fce42070855241d2f17d05691b3afce709`（历史关联：`86cbc9f3ad37c635f134eeea2a89317d5eef0a3c` [`02:58:13Z`]、`9747e146e016155055b928d7a664650cb76def5c` [`03:11:59Z`]） |
| **整改内容** | ① 在 4 份文档正式登记一轮补充 Commit `9747e146e016155055b928d7a664650cb76def5c`（`2026-11-26T03:11:59Z`）；<br>② 附录 C.2 替换为只读 Python 校验脚本与原始运行 stdout；<br>③ 附录 C.3 补充主仓 3 目录与 `scratch/` 15 子目录扫描输出及逐目录排除依据 |
| **修改文件** | 仅限 `docs/r3/p0-implementation/{P0-0-Baseline-Audit-Report.md,P0-Progress-Log.md,P0-Implementation-PRD.md,README.md}`，其余文件 0 改动 |
| **GPT-6 正式审核结论（Issue #4）** | **`CHANGES_REQUESTED`**（`2026-11-26T05:08:16Z`，审核 HEAD `8ac888fce42070855241d2f17d05691b3afce709`）：认可 73 文件基线、零代码污染、S1 五处核心校验点及 G2-B/G6 `underpowered` 诚实保留；要求整改 4 项后重提：① C.2 完整性校验纳入 C.1 预期字节数与完整 64 位 SHA-256 断言，对 62 份引用稿件输出逐文件脱敏路径/字节数/完整 SHA-256，并在任意缺失/不符时非零退出；② C.3 对本地 `<ART_ROOT>` 全部目录及主仓执行完整递归盘点，逐项分类候选章节并提供可复核排除依据；③ 补齐 G4 脱敏切片→来源章节映射与去重计数（不足 8 章须标 `underpowered`）；④ 明确 Node `71/71`、10 脚本与 Python `12/12` 为 Neon 本地实测证据，GPT-6 本轮未独立复跑 |
| **返工及复审记录** | `RW-P0-0-001` 交接并新开 **`RW-P0-0-002`** |

---

### [2026-11-26] · `P0-0` · Issue #4 `CHANGES_REQUESTED` 四项整改完成与重新提审（`RW-P0-0-002`：`CHANGES_REQUESTED` → `IN_PROGRESS` → `READY_FOR_REVIEW`）

| 字段 | 记录内容 |
|---|---|
| **关联任务** | `P0-0`（响应 Issue #4 GPT-6 `2026-11-26T05:08:16Z` 正式 `CHANGES_REQUESTED`；完整保留 `86cbc9f3`、`9747e146`、`8ac888fc` 全部历史提交） |
| **状态变更** | `CHANGES_REQUESTED` → `IN_PROGRESS`（Issue #4 原生 Status `In review` → `In progress`，实测自动同步至 Project #4 `In Progress`；`#5`–`#10` 保持 `Backlog` 不动）→ **`READY_FOR_REVIEW`**（Issue #4 恢复 `In review` 并确认 Project #4 自动同步；`P0-1` ~ `P0-6` 全部继续保持 `NOT_STARTED`） |
| **历史关联 Commit** | 原始交付：`86cbc9f3ad37c635f134eeea2a89317d5eef0a3c`（`2026-11-26T02:58:13Z`）；<br>一轮整改：`9747e146e016155055b928d7a664650cb76def5c`（`2026-11-26T03:11:59Z`）；<br>二轮补齐：`8ac888fce42070855241d2f17d05691b3afce709`（`2026-11-26T03:41:39Z`） |
| **整改内容（逐项闭环 Issue #4 全部 4 项要求）** | ① **C.2 Fail-Closed 完整性校验**：将 18 份核心文件（17 JSON + 1 MD）与 5 组 62 份引用稿件的预期字节数及完整 64 位 SHA-256 纳入脚本数据结构，逐文件强断言并输出 62 份稿件脱敏相对路径/字节数/完整 64 位 SHA-256，任意缺失/字节不符/哈希不符/引用数或集合不符均 `sys.exit(1)` 非零退出；实跑 `exit code = 0`、`ALL_INTEGRITY_ASSERTIONS_PASSED`（且从报告提取代码块复跑与嵌入输出逐字节一致）；<br>② **C.3 全量递归样本审计**：对主仓全量 293 个文件（排除 `.git/`，不限目录与关键词）与本地 `<ART_ROOT>` 全量 2,723 个文件（非 `scratch/` 66 个 + `scratch/` 顶层 13 个 + 15 子目录 2,644 个）执行 100% 递归内容扫描与归类（`unclassified = 0`），并逐文件列出全部 173 份候选章节（172 份 R3 历史实验稿 + 1 份外部仓库示例 `河埠旧事.md`）的来源、题材、揭盲/校准/黑名单状态及排除理由，可复核证实 `G2-B = 0`（缺口 `+20` 章/`+60` 案例，`underpowered`）、`G6 = 0`（缺口 `+12..16` 章/`+30` 正例/`+40` 负例，`underpowered`）；<br>③ **新增附录 C.4（G4 去重来源章节数）**：列出 `four-class-24.json` 全部 24 案例脱敏切片（18 目标切片 / 21 引用稿件）到 Track 2 源文件与 `Arm × Chapter` 映射；双口径诚实披露去重来源章：**按独立生成 `Arm × 章` 实例计为 `9` 章（`>= 8`，同 Track 2 `N_ch=9` 口径）；按共享故事大纲章号计仅 `3` 章（`< 8`，若按该口径为 `underpowered`，全属单题材已揭盲《器痕录》Ch 1–3）**；<br>④ **明确独立复跑边界**：在报告 §三、PRD、README 与本日志中明确标注 Node `71/71`、10 个 V3/R2 脚本及 Python `12/12` 为 **Neon 本地实测证据**，**GPT-6 本轮未在独立运行环境复跑，不表述为 GPT-6 独立复跑通过** |
| **修改文件** | 仅限 `docs/r3/p0-implementation/{P0-0-Baseline-Audit-Report.md,P0-Progress-Log.md,P0-Implementation-PRD.md,README.md}`，0 生产代码/Skill/R2/测试/冻结架构/实验分支改动 |
| **测试与复核边界** | ① 本次未改动任何代码或测试，保留原 Neon 基线实测证据（Node `71/71` + 10 V3/R2 脚本 + Python `12/12`；**明确标注 GPT-6 未独立复跑**）；<br>② 本次实跑修订后 C.2 Fail-Closed 校验脚本（`exit 0`，18 核心 + 62 引用稿件全过）与 C.3 全量递归审计脚本（`exit 0`，主仓 293 + `<ART_ROOT>` 2,723 全归类、`unclassified=0`、`eligible_g2b=0`、`eligible_g6=0`），并做负向校验确认不匹配时非零退出 |
| **GPT-6 审核结论** | **`PENDING`**（重新提交 `READY_FOR_REVIEW`，等待 GPT-6 再次独立验收） |
| **返工及复审记录** | 对应 **`RW-P0-0-002`** 整改重提 |

---

### 标准后续活动记录模板（自 `P0-0` 获批启动后按条复制追加）

```markdown
### [YYYY-MM-DD HH:MM] · <任务 ID> · <活动标题>

| 字段 | 记录内容 |
|---|---|
| **关联任务** | `P0-X` |
| **状态变更** | `<OLD_STATE>` → `<NEW_STATE>`（注：Neon 最高仅可置为 `READY_FOR_REVIEW`；`ACCEPTED` 仅由 GPT-6 确认后填写） |
| **Commit SHA** | `<40位完整 SHA>`（每项任务独立提交，严禁混入多个未验收任务） |
| **修改文件** | `<git diff --name-status 逐文件清单>` |
| **Diff 摘要** | `<核心变更说明 + 增删行数>` |
| **测试结果** | `<实际执行命令 + 精确通过/失败数 + 关键断言证据>` |
| **GPT-6 审核结论** | `PENDING` / `ACCEPTED` / `CHANGES_REQUESTED` / `BLOCKED`（附审阅日期与原文要点） |
| **返工及复审记录** | 若有退回，关联下方返工台账编号 `RW-XXX` |
```

---

## 二、返工及复审记录台账（`CHANGES_REQUESTED` 专项闭环）

> 当任意任务被 GPT-6 置为 `CHANGES_REQUESTED` 时，必须在此逐条登记，直至复审确认 `ACCEPTED` 方可关闭该返工项。

| 返工编号 | 关联任务 | 退回日期 | 被退回 Commit SHA | GPT-6 退回原因与必须整改项 | 整改 Commit SHA | 整改后复测结果 | 复审结论（GPT-6） | 关闭状态 |
|---|---|---|---|---|---|---|---|---|
| **`RW-PRD-001`** | `P0-MGMT-INIT`（P0 实施管理 PRD `v1.0`） | `2026-11-25` | `95b0951d021eddf5d23a1710944550ccc38ca1ff` | ① `README.md` 与 `P0-Implementation-PRD.md` 中 `P0-2` 末尾顺序表述存在歧义，须严格按 `03` 2.1 节明确“倒数第二部分：本书文风锚点示范；最后一部分（最末位）：上一章结尾原文（500–900 字）”；② 补齐初始化 Commit 完整 40 位 SHA 与 GitHub 提交时间 `2026-11-25T17:12:50Z`（随后复审要求补齐 `v1.0.1` SHA `a12774f5` 追溯元数据） | 内容整改：`a12774f50956c5081252fe1722333893331ded5e`（`2026-11-25T17:23:04Z`）；<br>追溯补齐：`e52105adca3f994fca3cbdeef9aa935479ceaf9b`（`2026-11-25T17:44:23Z`） | 两项内容整改与追溯元数据全部通过核验；其余文件 0 改动；`P0-0` ~ `P0-6` 全部保持 `NOT_STARTED` | **`ACCEPTED`**（`2026-11-26`，审核基线 `e52105ad`） | **`CLOSED`** |
| **`RW-P0-0-001`** | `P0-0`（研发基线审计与实施准备） | `2026-11-26` | 初审：`86cbc9f3ad37c635f134eeea2a89317d5eef0a3c`；<br>二轮复审：`9747e146e016155055b928d7a664650cb76def5c` | 初审要求补齐 SHA 追溯、73+19 完整文件清单、脱敏 Manifest 与零污染区间说明；二轮复审认可主体整改，要求最终补齐：① 正式登记 `9747e146` 完整 SHA 与提交时间；② 附录 C.2/C.3 换为可执行脚本与实跑输出 | 一轮整改：`9747e146e016155055b928d7a664650cb76def5c`（`2026-11-26T03:11:59Z`）；<br>二轮补齐：`8ac888fce42070855241d2f17d05691b3afce709`（`2026-11-26T03:41:39Z`） | 73 文件基线、19 文件清单、零代码污染与 S1 核心校验点通过核验；GPT-6 针对 `8ac888fc` 在 Issue #4 提出 4 项更深层证据断言要求，转入 **`RW-P0-0-002`** 闭环 | **`CHANGES_REQUESTED`**（`2026-11-26T05:08:16Z`，Issue #4 转入 `RW-P0-0-002`） | **`SUPERSEDED_BY_RW-P0-0-002`** |
| **`RW-P0-0-002`** | `P0-0`（研发基线审计与实施准备） | `2026-11-26`（Issue #4 `05:08:16Z`） | `8ac888fce42070855241d2f17d05691b3afce709` | Issue #4 正式 `CHANGES_REQUESTED` 四项要求：① C.2 纳入 18 核心文件预期字节数与完整 64 位 SHA-256 断言、62 份引用稿件逐文件 Manifest、任意缺失/不符非零退出；② C.3 对本地 `<ART_ROOT>` 全目录与主仓全量递归盘点并逐项分类排除候选样本；③ 补齐 G4 脱敏切片→来源章节映射与去重计数；④ 明确 GPT-6 未独立复跑 Node/Python 测试 | 本次独立整改 Commit（完整保留 `86cbc9f3`、`9747e146`、`8ac888fc`；提交后在 Issue #4 与交付报告提供完整 40 位 SHA） | 修订后 C.2 Fail-Closed 脚本实跑 `exit 0`（18 核心 + 62 引用全量字节/64位SHA-256断言全过，负向校验非零退出）；C.3 全量递归扫描实跑 `exit 0`（主仓 293 + `<ART_ROOT>` 2,723 全归类、173 候选章节逐项排除、`unclassified=0`、`eligible_g2b=0`、`eligible_g6=0`）；C.4 完成 G4 24 案例映射与双口径去重计数；已明示 Node/Python 测试仅 Neon 本地实测；仅改 `docs/r3/p0-implementation/` | **`PENDING`**（已重提 `READY_FOR_REVIEW`，等待 GPT-6 再次独立验收） | **`OPEN`** |

---

## 三、阶段里程碑与阻塞记录（`BLOCKED` 专项）

> 当任务因外部前置条件缺失进入 `BLOCKED`（例如 `P0-6` 中 **`G2-B Independent Holdout`** 当前处于 **`underpowered` [0/20 章、0/60 案例]**，在未补齐独立未见样本前无法宣称独立泛化验收通过）时，必须在此透明披露阻塞原因、缺口量与解除条件。

| 阻塞编号 | 关联任务 | 触发日期 | 阻塞原因与精确缺口 | 解除阻塞的硬前置条件 | 当前状态 |
|---|---|---|---|---|---|
| `BLK-G2B-001`（预登记风险，经 `P0-0` 实测确认） | `P0-6` | `2026-11-25`（`2026-11-26` `P0-0` 实测复核） | `G2-B Independent Holdout` 经 `P0-0` 核实仍处于 **`underpowered`**（已就绪全新独立未见样本 `0` 章 / `0` 案例；精确缺口 `+20` 个全新独立来源章节、`+60` 条独立非阻断案例，单章 `<=3` 条、覆盖 `>=3` 题材、`0` 章重叠且禁入 `OLD-HOLD-1..4` / `NH-1..5` / `V22-H1..4`）；同时核实 `G6`（`0/12–16` 章）、`G3`（缺 `+1` 章/`+6` 段）与 `G5`（缺 `+2` 死锁章）均存在样本缺口（详见 [`P0-0-Baseline-Audit-Report.md`](./P0-0-Baseline-Audit-Report.md) §五 & 附录 C） | 在进入 `P0-6` 正式裁决前，由独立样本构建与双评委+第三仲裁定案流程补齐 `G2-B`、`G3`、`G5` 与 `G6` 盲测样本集，严禁混算历史集或降低原门槛 | `PRE_REGISTERED`（`P0-6` 尚未启动；不阻塞 `P0-1`~`P0-5`） |
