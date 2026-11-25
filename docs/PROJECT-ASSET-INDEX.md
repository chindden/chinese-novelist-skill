# Chinese Novelist Skill — Project Asset Index

> **版本**：`2.0`（按 7 大资产类别 + 5 维独立状态矩阵重构，严格对齐 [`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md)）  
> **核验基线**：分支 `feat/r3-p0-controlled` @ `c6ac24bd0d2296645cb15cc906fe5538691cbc72`  
> **核心纪律**：
> 1. **严禁混淆五个独立状态维度**：`已找到原件` ≠ `已核验完整性` ≠ `当前 Agent 可访问` ≠ `新 Agent 可恢复` ≠ `已纳入统一权威研发存储`；
> 2. **当前 Neon 无法访问 ≠ 资产已丢失**：部分历史 ZIP 已由 GPT-6 在 ChatGPT 文件库中核实存在，但尚未迁入统一研发存储；
> 3. **隐私脱敏**：本仓库为公开仓库，严禁提交私有小说正文、私人 ZIP、个人邮箱或私有 Drive ID/直链；严禁擅自推送本地实验分支。

---

## 资产 5 维独立状态图例
- **原件**：`YES`（已确认原件存在）/ `NO`（已确认丢失或未落盘）/ `UNKNOWN`
- **完整**：`YES`（已实测 SHA-256 / `testzip` / `git fsck`）/ `PARTIAL` / `NO` / `UNKNOWN`
- **当前可访**：当前 Neon（Antigravity）会话能否直接读取（`YES` / `NO`）
- **新 Agent 可恢复**：全新环境、零旧聊天历史、零旧 Google Drive 账号下能否独立恢复（`YES` / `CONDITIONAL` / `NO`）
- **统一研发仓**：是否已纳入作者控制的统一权威研发存储体系（`YES` / `NO`）

---

## 一、GitHub 已版本化、跨 Agent 可直接恢复（公开研发资产）

| Asset ID | 名称 | 类型 | 路径 / Git Commit | SHA-256 | 隐私 | 原件 | 完整 | 当前可访 | 新 Agent 可恢复 | 统一研发仓 | 恢复说明 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `PUB-01` | `docs/PROJECT-CONTEXT.md` | 全仓库长期上下文 | `docs/PROJECT-CONTEXT.md`（初建 `15245e78`） | 随 Commit | 公开 | `YES` | `YES` | `YES` | `YES` | `YES` | `git clone` 直接读取 |
| `PUB-02` | `docs/RESEARCH-ASSET-POLICY.md` | 研发资产管理规范 | `docs/RESEARCH-ASSET-POLICY.md`（本次新增） | 随 Commit | 公开 | `YES` | `YES` | `YES` | `YES` | `YES` | `git clone` 直接读取 |
| `PUB-03` | `docs/PROJECT-ASSET-INDEX.md` | 全仓库资产索引（本文） | `docs/PROJECT-ASSET-INDEX.md`（初建 `bb01bbd0`） | 随 Commit | 公开 | `YES` | `YES` | `YES` | `YES` | `YES` | `git clone` 直接读取 |
| `PUB-04` | `docs/R3-PRD.md` | R3 早期历史主 PRD | `docs/R3-PRD.md`（`b5572a94`） | 见 Git Blob | 公开 | `YES` | `YES` | `YES` | `YES` | `YES` | `git clone` 直接读取 |
| `PUB-05` | `docs/r3/review-v3/` + 打包 ZIP | 冻结 R3 审核体系 v3（`v1.2.3`，PR #3） | `docs/r3/review-v3/`（Merge `b5572a94`） | ZIP: `b5b1d772...edc88` | 公开 | `YES` | `YES` | `YES` | `YES` | `YES` | `git clone` / GitHub raw 直拉 |
| `PUB-06` | `docs/r3/p0-implementation/` | P0 实施管理 PRD（`v1.0.1` 已验收） | `docs/r3/p0-implementation/`（基线 `e52105ad`） | 随 Commit | 公开 | `YES` | `YES` | `YES` | `YES` | `YES` | `feat/r3-p0-controlled` 直接读取 |
| `PUB-07` | `SKILL.md` / `scripts/` / `tests/` / `references/` | Skill 源码、脚本、测试与 GPL 知识库 | 仓库主目录（`b5572a94` / `c6ac24bd`） | 见 Git Tree | 公开 | `YES` | `YES` | `YES` | `YES` | `YES` | `git clone` 后执行 `README_V3.md` 测试命令即可重建 |

---

## 二、私有研发资产（已存在，但尚未纳入统一研发存储）

> **说明**：目前作者尚未建立独立的私有版本化研发仓库（如私有 Git 仓）。本类资产原件真实存在，但当前分散在 Google Drive 或其他私有位置，**尚未纳入统一研发存储**（均标 `统一研发仓 = NO`）。

| Asset ID | 名称 | 类型 | 当前存放位置（脱敏） | SHA-256 / 规格 | 隐私 | 原件 | 完整 | 当前可访 | 新 Agent 可恢复 | 统一研发仓 | 迁入说明 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `PRIV-01` | `[CN-R3-EXP] 跨作品创作经验库`（`P1-08` 正式空库） | 跨作品创作经验资产（研发/运行时知识） | Google Drive 私有根目录（`Shared: false`，7 文件 + 2 目录） | 动态演进（`entries=0`） | 私有 | `YES` | `YES` | `YES`（需 `gdrive`） | `NO`（依赖旧 Drive 账号） | **`NO`** | 待作者批准 `RESEARCH-ASSET-POLICY.md` §三迁移方案（首选私有 Git 仓） |

---

## 三、本地 VM 临时资产（存在环境丢失高风险，尚未纳入统一研发存储）

> **高危提醒**：本类全部位于当前 Antigravity 会话 VM（`<ART_ROOT>` = `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/bb9496c7-61be-4b01-ad65-2da947e559e6` 及本地 `.git`），**全新 Agent 在新容器 `git clone` 公开仓均无法访问（`新 Agent 可恢复 = NO`）**！严禁未获授权擅自推送分支或上传公开仓/Drive。

| Asset ID | 名称 | 类型 | 本地位置 / Git Commit | 字节数 & SHA-256 | 隐私 | 原件 | 完整 | 当前可访 | 新 Agent 可恢复 | 统一研发仓 | 保全/恢复方案 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `LOC-BR-01` | `feat/r3-m1-m4-craft-refinement` | 未推送本地 Git 实验分支（领先 `b32e9289` 2 提交） | 本地 `.git` @ `c45d4c66eee1584b2be4cef0b7879d62e524bfda` | 干跑 Bundle `21,441 B`（`git fsck` OK） | 公开代码类（未授权推送） | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准推至私有研发仓/只读归档分支或存 Bundle |
| `LOC-BR-02` | `feat/r3-phase1-throughput-o1-o3` | 未推送本地 Git 实验分支（领先 `b32e9289` 3 提交） | 本地 `.git` @ `c0966b129135b8ec0d2fd38f90d8b34d2f92f6e9` | 干跑 Bundle `52,991 B`（`git fsck` OK） | 公开代码类（未授权推送） | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 同上（已包含 `LOC-BR-01` 全部 2 提交） |
| `LOC-RPT-01` | `skill-live-eval-report.md` | 零干预双题材实测报告 | `<ART_ROOT>/skill-live-eval-report.md` | `23,090 B` / `b939662408257d9cb4e55598aff58b665082aa4664f00608c805a98e480ae4ea` | 私有（含原稿引文） | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准迁入私有研发仓 |
| `LOC-RPT-02` | `step1-m1-m4-delivery.md` | M1–M4 第一步交付报告 | `<ART_ROOT>/step1-m1-m4-delivery.md` | `76,846 B` / `407675f788cceeb015b3905473d9f16b22ab9498405d60f8faa5480faed1f871` | 私有 | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准迁入私有研发仓 |
| `LOC-RPT-03` | `step2-m1-replay-report.md` | M1 第二步 Ch 3 返工重放报告 | `<ART_ROOT>/step2-m1-replay-report.md` | `50,020 B` / `6aad7dbbbbd6c7688db5e1f1839de1312b9bc6442e7eddc34c33f0eececd7a2d` | 私有（含小说段落） | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准迁入私有研发仓 |
| `LOC-RPT-04` | `step3-r3-trial-report.md` | M1–M4 第三步《器痕录》试跑报告 | `<ART_ROOT>/step3-r3-trial-report.md` | `42,036 B` / `091e76f558adf61f4f7a7406df03eed6a74994709a27fa478d4cb3e70ff1b7db` | 私有 | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准迁入私有研发仓 |
| `LOC-MS-01` | `step3-qihenlu-manuscript-ch1-3.md` | 实验小说原稿（《器痕录》Ch 1–3） | `<ART_ROOT>/step3-qihenlu-manuscript-ch1-3.md` | `46,846 B` / `09d045ae51388c6bee300497846d189e8a41a458809304e013604f489f408239` | **含小说正文（严禁公开）** | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准迁入私有研发仓（严禁入公开仓） |
| `LOC-RPT-05` | `r3-phase1-midterm-report.md` | Phase 1 吞吐实验中报 | `<ART_ROOT>/r3-phase1-midterm-report.md` | `24,683 B` / `24f9c49958976fdc710a7581480e5d832d102639b1890cfea47d524c580e48b4` | 私有 | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准迁入私有研发仓 |
| `LOC-RPT-06` | `r3-phase1-blind-audit-and-qa-report.md` | Phase 1 三路独立盲审报告 | `<ART_ROOT>/r3-phase1-blind-audit-and-qa-report.md` | `52,194 B` / `5d12eb65f36b2b4c5a3d510795d23fc3d5d195337ac07593eb959501cbca20ca` | 私有（含原稿引文） | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准迁入私有研发仓 |
| `LOC-RPT-07` | `r3-review-calibration-v2.2-final-offline-validation-report.md` | 审稿尺度校准 v2.2 终版报告 | `<ART_ROOT>/r3-review-calibration-v2.2-final-offline-validation-report.md` | `24,004 B` / `ef812f5a76da1efac011660087879da60056c421383b7ef8f3454225d4e3d093` | 私有（含案例引文） | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准迁入私有研发仓 |
| `LOC-RPT-08..10` | 其余 8 份过程报告（吞吐蓝图、校准设计/v1–v2.1、v6/v8 对标） | 研发过程报告 | `<ART_ROOT>/{r3-*,webnovel-writer-*}.md` | 均已实算 SHA-256（见历史提交 `bb01bbd0`） | 私有 | `YES` | `YES` | `YES` | **`NO`** | **`NO`** | 待作者批准随同打包入私有研发仓 |
| `LOC-SCR-01` | `scratch/` 全套实验原稿、遥测与校准输出目录 | 原始实验沙箱数据（含《残器长生》《降本增笑》《器痕录》、Arm 0–2 遥测、盲审私钥） | `<ART_ROOT>/scratch/` | 多文件目录（未打包） | **含小说正文与私钥（严禁公开）** | `YES` | `PARTIAL`（未封清单） | `YES` | **`NO`** | **`NO`** | 待作者批准生成 `MANIFEST.json` 并迁入私有研发仓 |

---

## 四、其他账号或聊天文件库中的历史资产（Neon 当前不可直读，不等于已丢失）

> **重要事实**：GPT-6 已在另一个可访问环境（ChatGPT 文件库）中核实部分历史实验 ZIP 仍然存在；以下如实区分“他方环境已确认原件存在”与“当前 Neon 不可访问 / 尚未纳入统一研发存储”。

| Asset ID | 名称 | 类型 | 已知存在位置 | SHA-256 | 隐私 | 原件 | 完整 | 当前可访 | 新 Agent 可恢复 | 统一研发仓 | 归档说明 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `CHAT-ZIP-01` | `gemini-memory-literary-gain-exp.zip` | Gemini 原生记忆与文学增益实验包（6 篇成稿+盲审+揭晓） | ChatGPT 历史聊天文件库 / 作者本地（GPT-6 侧已核实历史存在；Neon 当前 VM 与 Drive 均不可见） | `UNKNOWN`（Neon 未接触原文件；`docs/R3-PRD.md` L255 记 6 篇正文 SHA 曾核对匹配） | 私有（含实验正文） | `YES`（GPT-6 侧确认存在） | `UNKNOWN`（Neon 未独立重验） | **`NO`** | **`NO`** | **`NO`** | 须由作者导出后统一归档至经批准的私有研发仓并生成 `MANIFEST.json` |
| `CHAT-ZIP-02` | `xianmen-dazhanggui-r3-pilot-delivery.zip` | 《仙门大掌柜》首次 R3 Pilot 精简审阅包（22 文件） | ChatGPT 历史聊天文件库 / 作者本地（Neon 当前 VM 与 Drive 均未检出） | `UNKNOWN`（`docs/R3-PRD.md` L227–229 曾复核 13 项文件 SHA） | **含小说正文（严禁公开）** | `YES`（GPT-6 侧/历史上传存在） | `PARTIAL`（原包缺快照目录） | **`NO`** | **`NO`** | **`NO`** | 可选随历史实验归档入私有研发仓（功能上已被 `GD-EXP-01~03` 覆盖） |

---

## 五、Google Drive 历史实验快照资产（研发期实验快照，非正式完本作品，尚未纳入统一研发存储）

> **边界重申**：以下三份 ZIP 均已由 Neon 通过只读 `gdrive` 核验存在且 `testzip = OK`，但它们属于**研发期连载实验快照（Ch 1–3 Pilot / P1 激活 / Ch 1–12）**，**绝不属于“正式完本小说作品”**，亦**尚未纳入统一研发存储**。按本轮纪律，现有 Drive 原件**保持原状不删除、不搬迁、不覆盖**。

| Asset ID | 名称 | 类型 | 当前位置（脱敏） | 字节数 & SHA-256（实测） | 隐私 | 原件 | 完整 | 当前可访 | 新 Agent 可恢复 | 统一研发仓 | 迁移建议 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `GD-EXP-01` | `xianmen-dazhanggui-r3-pilot-complete-20261124.zip` | 《仙门大掌柜》Pilot 完整实验快照（75 项含清单） | `Google Drive / [CN-R3-BACKUP] 仙门大掌柜`（`Shared: false`，ID 脱敏） | `197,711 B` / `70b1c4c0ec5693864d0d0dceeef53d06809bb8a6d63370afe9f9cec7aead2221` | **含小说正文（严禁公开）** | `YES` | `YES`（`testzip=OK`） | `YES`（需 `gdrive`） | **`NO`**（脱离旧 Drive 账号不可恢复） | **`NO`** | 待作者批准后复制归档至统一私有研发存储（保留 Drive 原件不动） |
| `GD-EXP-02` | `xianmen-dazhanggui-r3-p1-activated-20261124.zip` | 《仙门大掌柜》P1 激活实验快照（79 项含清单） | `Google Drive / [CN-R3-BACKUP] 仙门大掌柜`（`Shared: false`，ID 脱敏） | `210,038 B` / `8796bfeeedb706fd02770a45f5694b1019283c153c92af93c5e4e3408fb50d08` | **含小说正文（严禁公开）** | `YES` | `YES`（`testzip=OK`） | `YES`（需 `gdrive`） | **`NO`**（依赖旧 Drive 账号） | **`NO`** | 同上 |
| `GD-EXP-03` | `xianmen-dazhanggui-r3-ch12-complete-20261124.zip` | 《仙门大掌柜》Ch 1–12 完整实验快照（177 项含清单） | `Google Drive / [CN-R3-BACKUP] 仙门大掌柜`（`Shared: false`，ID 脱敏） | `591,326 B` / `d0295a5f713a896669dbd7f4eaf4ec181536a77ca774d35ac8a496762ee4ebf5` | **含小说正文（严禁公开）** | `YES` | `YES`（`testzip=OK`） | `YES`（需 `gdrive`） | **`NO`**（依赖旧 Drive 账号） | **`NO`** | 同上 |

---

## 六、正式完本作品备份（Google Drive 长期合法定位）

| Asset ID | 名称 | 类型 | 状态说明 |
|---|---|---|---|
| `—` | *当前 `0` 项* | 正式完本作品备份 | **截至 `2026-11-25`，尚无已完成全本创作并正式验收交付的小说作品。** 严禁将《仙门大掌柜》Ch 1–12 或《器痕录》Ch 1–3 等早期实验快照归入本类。 |

---

## 七、已丢失或尚未找到原件的资产（透明留痕）

| Asset ID | 名称 | 类型 | 状态说明 | 原件 | 完整 | 当前可访 | 新 Agent 可恢复 | 统一研发仓 |
|---|---|---|---|---|---|---|---|---|
| `MISS-01` | Step 3 与早期 Gemini 会话的子代理原始 `transcript.jsonl` | 子代理底层工具调用日志 | 宿主环境当年未落盘至磁盘、公开仓或 Drive，早期 Stage 0–2 读档精确顺序不可独立复现 | `NO` / `UNKNOWN` | `NO` | `NO` | `NO` | `NO` |
| `MISS-02` | `p1_final_host_acceptance_report.md` 原始独立文件 | P1 最终宿主验收报告原件 | 摘要已完整登记于 `docs/R3-PRD.md` L337–380，但独立原件未在本 VM、公开仓或 Drive 检出（可能仍在早期聊天文件库中，需作者核查） | `UNKNOWN` | `UNKNOWN` | `NO` | `NO` | `NO` |
