# 05 · L0 全书机械诊断引擎 PRD（`diagnose_book.mjs`）

> **文档版本**：`v1.2.2 (Freeze-Ready Final Candidate)`  
> **层级定位**：**L0 是贯穿整个创作周期的 100% 纯只读监测层（Continuous Read-Only Monitoring Layer）**，**不是**第五个强制文学审核关卡；L1–L4 才是四层文学质量审核流程。  
> **核心铁律**：
> 1. **绝对零写入与三重验证**：`diagnose_book.mjs` 与 `audit_story_state.mjs --readonly` 本身**严格只读、只输出 stdout、不含任何直接/间接写盘能力**，且**静态扫描绝不等同于运行期零写入**，二者必须分别独立通过**全量静态代码审计 + 只读环境实际运行（首选只读 bind mount / Docker `:ro` 卷；采用 `chmod` 时须以独立非特权、非文件所有者 UID 运行且测试临时路径外置）+ 全项目 Manifest/SHA-256 前后比对**三重验证——**任何一项未通过，均不得宣称 L0 已证明零写入**；**`r3_ops.mjs` 是唯一允许承接诊断缓存落盘的编排层，绝不因此放宽 L0 自身的只读要求**。
> 2. **防机械误伤与两类阻断态物理分离**：完全重复段落、引号不配对、字数异常、对话占比偏低、人物暂未出场默认绝不能当成文学硬伤或阻断；`FACT_CONFLICT_CANDIDATE` 进入**等待核实的临时安全门**（可核实误报/合法叙事后解除）；`STALE_REVIEW_AFTER_EDIT` 属于**工程完整性破损（`integrity_alert`）**，必须**立即阻断新章写入**且严禁标误报解除（须显式 `retcon`/回滚 + 重审 + 更新指纹）。
> 3. **内容完整性优先于字数指标**：**严禁为了死磕字数（凑字数下限或压字数上限）牺牲情节与内容的完整性。**

---

## 一、产品目标、绝对只读边界与误判防护原则

### 1. 解决什么问题？
- **跨章统计盲区**：单章独立审稿看不到“某核心配角连续 6 章未出场”“口头禅写了 15 章 0 次使用”“第 8 章起对话占比从 28% 暴跌至 6% 且长句超过 50%”“某 6 字短语全书机械重复 14 次”。
- **账本与正文交叉核对**：直接扫描**真实正文**并与 `story-ledger.json` 交叉比对，弥补漏录或录错导致的静默漂移。
- **版本过期监测**：秒级发现审稿后正文被修改、摘要或卷摘要与正文哈希脱节等工程状态漂移。

### 2. 四条不可突破的硬边界
1. **绝对只读无副作用（三重验证闭环，绝不把静态扫描等同于运行期零写入）**：
   - `node scripts/diagnose_book.mjs <project> [--upto N] [--format json|md]` 与 `node scripts/audit_story_state.mjs <project> --upto N --readonly` **只读磁盘、只向 stdout 输出**，源码内严禁任何直接/间接文件写入 API、写标志 `open`、复制/重命名/链接或子进程写入；不提供任何输出/缓存写路径参数。
   - **派生缓存由编排层单独处理**：`r3_ops.mjs` 是**唯一允许承接诊断缓存写入的编排层**——仅在外部捕获 `diagnose_book.mjs` 的 stdout 后写入隔离派生路径 `reviews/r3/diagnostics/.cache/book-diagnostics-latest.json`（可随时删除，永不计入故事真源哈希），**绝不因此放宽 L0 自身的只读要求**。
   - **严苛沙箱权限边界**：单独对目录执行 `chmod -R a-w`（由文件所有者本人运行）**不能单独证明不可写**（文件所有者仍可通过 `chmod` 恢复权限）。第四节强制要求首选只读 bind mount / Docker `:ro` 卷，退而采用 `chmod` 方案时必须以**独立的非特权、非文件所有者 UID**运行且所有测试临时文件/缓存位于项目目录之外，任何一项未通过均不得宣称 L0 已证明零写入。
2. **仅产客观证据，绝不做文学裁决**：所有报告显式携带 `"literaryStatus": "UNVERIFIED"`；`FACT_CONFLICT_CANDIDATE` 仅触发**等待核实的临时安全门（非自动文学判决）**；`STALE_REVIEW_AFTER_EDIT` 仅判定**工程完整性破损（非文学判决）**；所有文风/节奏/字数/重复/引号/在场指标均以**本书自身中位数或基准章**为相对参照。
3. **默认非硬伤原则（防误判核心修正）**：
   - **完全重复段落**：在时间循环、罗生门多视角、书信/布告原文复引或文学回环意象中属合法手法 → 默认归 **`advise`**（疑似误粘贴候选），永不自动判文学硬伤或阻断；
   - **引号不配对**：中文长独白/书信分段引用时，规范标点本身就是“前段只有开引号、末段才有闭引号”（跨段多段引语）→ 引擎必须内建**中文跨段引语白名单**，对剩余疑似不配对项也仅标 **`advise`**（排版复核提醒），永不自动判文学硬伤或阻断；
   - **字数异常**：低于参考字数、超过软上限或波动偏离中位数，在 L0 一律仅标 **`advise` / `note`**，**严禁迫使写手注水或砍戏牺牲内容完整性**；只有在作者于 `02-写作计划.json` 中**显式开启硬约束配置**（如 `hardConstraints.enforceMinWords: true`）时，才由 L1 `precheck v2` 执行作者授权的确定性拦截。
4. **零常驻服务、零向量库、零外部依赖**：纯 Node ESM，50 章全书运行目标 **`< 500ms`**，天然跨 Gemini/Antigravity、Claude Code、DeepSeek Harness 通用。

---

## 二、L0 输出分级体系（统一协议口径，严格分轨）

为防止工程告警、待核事实候选与文学缺陷混淆，L0 诊断结果采用 **6 档无歧义展示态**（均不代表文学质量判决）：

| L0 输出级别 | 语义定义 | 门禁性质与状态机路径 | 唯一合法恢复 / 下游动作 |
|---|---|---|---|
| **`integrity_alert`** | **100% 客观工程/状态机破损**：**`STALE_REVIEW_AFTER_EDIT`（已定稿正文未经显式 `retcon` 被外部修改）**；章节文件缺失或 0 字节空文件、章号断档/重复、JSON 语法损坏、伏笔 `payoffChapter < chapter` 账本时间倒挂 | **工程完整性硬阻断（`IntegrityHardBlock`，立即阻断新章写入，与临时安全门物理分离）** | **严禁仅通过标记“误报”或“合法叙事”直接解除！**<br>对 `STALE_REVIEW_AFTER_EDIT` 必须补走显式 `retcon`（或回滚原快照）+ 对改动章及直接影响集重新审核 + 更新复合审读指纹与 `manuscriptHashes` |
| **`high_risk_fact_alert`** | **高危跨章事实冲突候选**：与 `audit_story_state --readonly` 联动检出的同主体同键客观事实互斥候选（`FACT_CONFLICT_CANDIDATE`）、结构化整数守恒失配候选 | **等待核实的临时安全门（`TempSafetyGate`，非自动文学判决，不等 L2）** | 暂停开启第 $N+1$ 章直至独立核实或作者确认：**核实为误报或合法叙事即刻解除放行、不改正文**；核实为真实错误则路由至当章修复或 `PLANNING_CONFLICT_BLOCK` |
| **`advise`** | **高价值待人工/编辑复核线索**：重复段落候选、跨段排查后的引号异常候选、字数偏离、对话占比骤降、人物断档、口头禅未落实/复读、长句/文风漂移、缺摘要、`STALE_CONTEXT_VERIFY` | **永不阻断** | 随诊断摘要透传给紧邻的 L2 弧审或 L3 卷审作背景参考 |
| **`note`** | **低噪趋势参考**：高频短语 Top 榜、轻度波动 | **永不阻断** | 仅存档备查，默认不打扰创作流 |
| **`pass`** | 本维度当前无异常线索 | **永不阻断** | — |
| **`skip`** | 缺少前置档案或章数不足（如无 `00-人物档案.md` 或不足 4 章） | **永不阻断** | 显式标注原因，绝不冒充 `pass` |

---

## 三、9 大核心诊断维度功能规格（`D1–D9`，展开共 16 个确定性子项）

全套架构文档统一口径为 **9 大核心诊断维度（`D1–D9`）**（吸收 `PenglongHuang/analysis.mjs` 的 12 项机械检查并合并归类，同时补齐 R3 专属的 D7 伏笔总账、D8 文风漂移与 D9 版本过期）：

| # | 诊断维度 | 包含的确定性子项（16 项） | 数据源 | 计算规则与防误报护栏 | 输出分级 | 消费方 |
|---|---|---|---|---|---|---|
| **D1** | **人物在场度及长期断档** | ① 逐章出场频次矩阵；② 中途长期断档；③ 末段 1/4 缺席；④ 档案未出场角色 | `00-人物档案.md`（继承 `NOTE_WORDS` 剔除“师父/大哥/已故/回忆”等 40+ 泛称词）+ 全部正文 | 非主角且累计提及 ≥3 次、连续 ≥4 章未出场 → 断档候选；章数 ≥8 且后 1/4 缺席 → 漏交代候选；档案有但正文 0 提及 → 冗余/遗漏候选 | `advise` / `note`（缺档案标 `skip`） | L2 弧审参考、L3 卷审、L4 人物弧线表 |
| **D2** | **人物语言特征与口头禅落实** | ⑤ 角色口头禅未落实；⑥ 口头禅机械复读 | `00-人物档案.md`（过滤否定语境如“从不说/忌”）+ 全部正文 | 单字口头禅仅匹配引号内句尾；写满 ≥5 章全书 0 次 → 未落实候选；全书 ≥15 次或单章 ≥4 次 → 复读候选 | `advise` / `note` | L2 弧审、L3 卷审 |
| **D3** | **章节字数、章号与节奏波动** | ⑦ 章节文件缺失/空文件/章号断档重复；⑧ 字数偏离参考区间或全书中位数 | `02-写作计划.json` + 磁盘章节文件 + 实测汉字数 | 仅文件缺失/空稿/章号断档标 `integrity_alert`；**低于 `minWordsPerChapter`、高于 `maxWordsPerChapter` 或偏离已写章中位数 `>=1.45x / <=0.62x` 在 L0 一律标 `advise`（非阻断，绝不为字数牺牲内容完整性；仅当作者显式配置硬约束时由 L1 `precheck v2` 拦截）** | 文件/章号破损 `integrity_alert`；字数偏离与波动 **`advise`** | `r3_ops` 简报、L2/L3 |
| **D4** | **对话占比与引号排版核查** | ⑨ 章节对话占比骤降；⑩ 引号配对排查（含中文跨段引语白名单） | 各章正文（同时兼容 `「…」`/`『…』` 与 `“…”`/`‘…’`） | 以全书（≥5 章）对话占比中位数为参照：中位数 ≥12% 时单章 `< 中位数 × 0.4` 或 `< 8%` 标 `advise`（冷硬/日志体全书中位 <12% 自动静默）；**引号排查先应用中文跨段多段引语白名单（段首开引号跨段续引至末段闭引号视为合规），剩余疑似不配对也仅标 `advise`（排版提示，绝非默认文学硬伤）** | **`advise`** / `note` | L1 软提醒、L2/L3 |
| **D5** | **高频短语、重复段落与桥段线索** | ⑪ 高频重复短语（4–12 字）；⑫ 整段字面重复候选（≥60 规范汉字）；⑬ 账本 `mechanisms` 重复线索 | 全部正文 + `story-ledger.json` | ① O(N) 两段式种子一致延展算法提取 Top 15 高频短语（剔除专名），≥8 次标 `note`；<br>② **整段字面重复（复用 `check_repetition.mjs`）：默认标 `advise`（疑似误粘贴候选，兼容循环叙事/回环意象/原文复引），仅当作者在配置中显式开启硬约束时才由 L1 `precheck` 拦截**；<br>③ `mechanisms` 同 `(strategy, opposition)` 高频复现标 `advise` 交 L2 语义核查 | **`advise`** / `note` | L2 弧审、L3 卷审 |
| **D6** | **章节摘要完整性与冲突** | ⑭ 完结章摘要缺失/空壳/多源冲突 | `99-章节摘要.md` + `02-写作计划.json` + 历史兼容源 | 核查所有 `status = completed` 章节是否存在非空可读摘要、是否存在多源冲突、摘要指纹是否滞后正文 | `advise` | L2/L3 卷摘要前置校验 |
| **D7** | **伏笔状态与事实冲突联动** | ⑮ 伏笔状态倒挂与超期未推进；⑯ 只读账本事实冲突/守恒失配联动 | `story-ledger.json` + `r3_feedback_view.mjs` + `audit_story_state --readonly` | ① `paid` 且 `payoffChapter < chapter` → `integrity_alert`（进 `IntegrityHardBlock`）；<br>② 同主体同键客观事实互斥候选（`FACT_CONFLICT_CANDIDATE`）或结构化整数失配候选 → **`high_risk_fact_alert`**（进 `TempSafetyGate`，绝不等 L2，非自动文学判决）；<br>③ `open` 超 10 章未推进或跨预期卷仍 `open` → `advise` | 倒挂 `integrity_alert`；高危事实候选 **`high_risk_fact_alert`**；超期 `advise` | `IntegrityHardBlock` / `TempSafetyGate`、L2、L3、L4 |
| **D8** | **全书文风漂移指标（R3 专属）** | （综合文体指纹：>40 字长句占比、平均句长、正文圆括号、高频突发副词、章末形态） | 各章正文 + `03-文风基准.md`（及第 1–3 章基线） | 相对本书自身基准：若连续 3 章 `>40` 字长句占比上升 `>= +15pp` 或正文出现规则圆括号 → `advise`（预警防红队说明书化回潮），绝不按统一题材硬配额一刀切 | `advise` / `note` | L1 软提醒、L2/L3、L4 |
| **D9** | **审核结论、摘要与指纹过期检测** | （正文审后修改、规划/账本上下文漂移检测） | `02-写作计划.json` + `reviews/r2/*` + `reviews/r3/*` + 磁盘实际 SHA-256 | ① 已定稿章正文未经显式 `retcon` 在终审后被外部修改 → `integrity_alert`（`STALE_REVIEW_AFTER_EDIT`，进 **`IntegrityHardBlock`**，立即阻断新章写入，严禁标误报解除，必须 `retcon`/回滚 + 重审 + 更新指纹）；<br>② 关联规划或账本升版但旧审稿未覆盖 → `advise`（`STALE_CONTEXT_VERIFY`） | 审后改文 `integrity_alert`；上下文漂移 `advise` | **`IntegrityHardBlock`**、`r3_ops`、L3、L4 |

---

## 四、数据契约与三重零写入验收规格

### 1. 标准输出 JSON 结构（`diagnose_book.mjs` 纯 stdout 输出，绝对零写入）
```json
{
  "schemaVersion": 2,
  "layer": "L0_READONLY_MONITOR",
  "literaryStatus": "UNVERIFIED",
  "writeSideEffects": false,
  "outputChannel": "stdout_only",
  "generatedAt": "2026-11-25T14:00:00Z",
  "projectFingerprint": "<sha256 of chapter paths/mtimes/sizes + plan + profile + ledger>",
  "uptoChapter": 12,
  "stats": {
    "chaptersPlanned": 28,
    "chaptersWritten": 12,
    "totalWords": 52400,
    "medianWords": 4320,
    "medianDialogueRatio": 0.24,
    "longSentence40RatioBaseline": 0.36,
    "counts": {
      "integrity_alert": 0,
      "high_risk_fact_alert": 0,
      "advise": 4,
      "note": 6
    }
  },
  "checks": [
    { "id": "D1_PRESENCE", "name": "人物在场与断档", "level": "advise", "count": 1 },
    { "id": "D7_FORESHADOW_FACT", "name": "伏笔与事实冲突联动", "level": "pass", "count": 0 },
    { "id": "D9_STALENESS", "name": "审核与指纹过期", "level": "pass", "count": 0 }
  ],
  "findings": [
    {
      "id": "DIAG-D1-001",
      "dimension": "D1_PRESENCE",
      "severity": "advise",
      "chapter": 9,
      "title": "「沈三娘」连续 4 章未出场",
      "evidence": "第 6–9 章提及 0 次（前 5 章累计提及 11 次）",
      "nonBlockingNote": "仅为客观统计线索，默认非文学硬伤；若属剧情刻意留白请忽略"
    }
  ]
}
```

### 2. L0 绝对零写入三重验收规范（分别对 `diagnose_book.mjs` 与 `audit_story_state.mjs --readonly` 独立执行）
- **新增 Agent 调用**：**`0`**（100% 纯 Node ESM 确定性脚本）。
- **实现成本**：低（约 450–650 行纯 ESM + 单元测试，属于 P1-1 任务）。
- **三重零写入验证（静态扫描绝不等同于运行期零写入；以下三项必须全部通过，任何一项未通过均不得宣称 L0 已证明零写入）**：
  1. **第一重 · 全量静态代码审计**（覆盖目标脚本及其全部直接/传递导入模块）：
     - 直接文件/目录写入：`writeFile*`、`appendFile*`、`createWriteStream`、`mkdir*`、`mkdtemp*`、`rm*`、`unlink*`、`rmdir*`、`truncate*`、`chmod*`、`chown*`、`utimes*`；
     - 复制/移动/链接：`copyFile*`、`cp*`、`rename*`、`link*`、`symlink*`；
     - 低层写句柄与标志：`open` / `openSync` / `fsPromises.open` 携带写/创建/截断标志（`w`, `w+`, `wx`, `a`, `a+`, `ax`, `r+`, `O_WRONLY`, `O_RDWR`, `O_CREAT`, `O_TRUNC`, `O_APPEND`）及 `fs.write*` / `FileHandle.write*`；
     - 间接写入与子进程逃逸：`child_process`（`exec*`、`spawn*`、`fork`）、动态 `import()`、`eval`、`new Function`，以及对 `r3_atomic_ops.mjs` 等写盘模块的引用。
     - 注：`audit_story_state.mjs` 在 `--readonly` 模式下必须通过独立只读执行分支隔离，严禁触及任何写路径。
  2. **第二重 · 只读环境实际运行（严格沙箱权限边界）**：
     - **首选机制（内核级只读强制）**：使用 Linux **只读 bind mount（`mount -o ro,bind`）** 或 **Docker 只读卷（`-v <project>:/workspace/project:ro`）**；
     - **次选替代机制（仅在宿主无内核只读挂载权限时使用）**：若采用 `chmod -R a-w`，**必须以独立的非特权、非文件所有者 UID（non-root, non-owner UID）运行**，彻底阻断脚本通过 `fs.chmodSync` 恢复写权限的可能（**以文件所有者或 root 身份运行 `chmod -R a-w` 视为无效验收**）；
     - **外部临时路径隔离**：项目目录全程保持只读，测试框架所需的全部临时文件、stdout 捕获缓存与运行环境均置于**项目目录之外**的独立临时路径（如 `/tmp/r3-l0-verify-*`）；
     - **双脚本分别独立验证**：分别独立运行 `node scripts/diagnose_book.mjs <ro-project> --format json|md` 与 `node scripts/audit_story_state.mjs <ro-project> --upto N --readonly`，要求均返回 **exit code `0`**、完整输出 stdout、**零 `EROFS` / `EACCES` 写入异常**。
  3. **第三重 · 全项目目录 Manifest / SHA-256 前后比对**：
     - 在可写副本中分别运行两个脚本前后，递归计算整个项目目录（含隐藏文件、子目录结构、逐文件大小与 SHA-256）的完整 `manifest_sha256`，确认 **0 新增文件、0 删除文件、0 字节改动**。
  4. **编排层缓存边界独立验证**：单独验证 `r3_ops.mjs` 是唯一允许承接诊断缓存落盘的编排层（仅捕获 `diagnose_book.mjs` stdout 写至隔离派生路径 `reviews/r3/diagnostics/.cache/book-diagnostics-latest.json`），绝不因此放宽 L0 自身的只读要求。
- **功能与状态机专项验收**：
  - 防误判专项：合法重复段、合规中文跨段引语、紧凑章略低于参考字数 → 全部输出 `advise/pass` 且 **0 触发阻断**；
  - 分轨状态机专项：50 章耗时 `< 500ms`；注入 `FACT_CONFLICT_CANDIDATE` 验证进 `TempSafetyGate`（支持“误报/合法叙事解除”与“真错修复”双路径）；注入 `STALE_REVIEW_AFTER_EDIT` 验证进 **`IntegrityHardBlock`**（**尝试标误报解除被硬拒绝**，仅补走 `retcon`/回滚 + 重审 + 更新指纹后方可恢复）。
