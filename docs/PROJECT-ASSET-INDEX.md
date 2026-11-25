# Chinese Novelist Skill — Project Asset Index

> **版本**：`1.0` ｜ **归属**：全仓库长期资产与可访问性索引（与 [`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md) 配套）  
> **隐私与边界铁律**：
> 1. **严禁**将私有小说正文、私人实验 ZIP、私人账本/审稿原文或个人账号信息提交至公开 Skill 仓库；
> 2. **严禁**为建立本索引而擅自推送原本未推送的本地实验分支；
> 3. **严禁**编造 Google Drive 链接、私有目录 ID 或不存在的文件路径；当前 VM 不可获取的原始文件一律如实标注 `UNKNOWN`；
> 4. 本地会话沙箱文件与未推送本地分支在**全新 Agent / 新容器环境**中默认不可直接访问，必须如实标注 `NO` 并给出真实恢复路径。

---

## 一、公开仓库资产（GitHub 公开可访问，新 Agent 直接可读）

| Asset ID | 名称 | 类型 | 存储位置 | 完整路径或链接 | SHA-256 | Git Commit | 隐私等级 | 新 Agent 可访问性 | 恢复说明 |
|---|---|---|---|---|---|---|---|---|---|
| `PUB-01` | `docs/PROJECT-CONTEXT.md` | 全仓库长期上下文档案 | GitHub（`feat/r3-p0-controlled`） | `docs/PROJECT-CONTEXT.md` | 随最新文档提交变动 | `15245e785535f83bf11fad684b3ae6dc980a9c0e`（v1.0 建档） | 公开 | `YES` | `git clone` / GitHub Web 或 `gh api` 直接读取 |
| `PUB-02` | `docs/R3-PRD.md` | R3 早期至迁移历史主 PRD | GitHub（`feat/r3-migration` / `feat/r3-p0-controlled`） | `docs/R3-PRD.md` | 见 Git Blob | `b5572a943f9157cda07faa7910dcbfd20b1a3ba5` | 公开 | `YES` | 公开仓库直接读取（含早期实验与私有 ZIP 独立复核记录） |
| `PUB-03` | `docs/r3/review-v3/`（10 份 MD） | 冻结 R3 审核体系 v3 架构蓝图（`v1.2.3`） | GitHub（`feat/r3-migration` PR #3 已合入） | `docs/r3/review-v3/` | 见 PR #3 逐文件清单 | `b5572a943f9157cda07faa7910dcbfd20b1a3ba5`（源 `b63c0b82`） | 公开 | `YES` | 公开仓库直接读取；只读权威冻结版本 |
| `PUB-04` | `r3-review-v3-architecture-package.zip` | 冻结架构 `v1.2.3` 完整打包 ZIP（94,084 B） | GitHub（`feat/r3-migration`） | `docs/r3/review-v3/r3-review-v3-architecture-package.zip` | `b5b1d77220e9e37ac0da8456ccdf2c8428ea878f7acfc10e6efe551617fedc88` | `b5572a943f9157cda07faa7910dcbfd20b1a3ba5`（Blob `21fa1821`） | 公开 | `YES` | `git clone` 或 GitHub raw 直链下载并核验 SHA-256 |
| `PUB-05` | `docs/r3/p0-implementation/`（3 份 MD） | P0 受控研发实施管理 PRD（`v1.0.1`，已验收） | GitHub（`feat/r3-p0-controlled`） | `docs/r3/p0-implementation/` | 随最新状态提交变动 | `e52105adca3f994fca3cbdeef9aa935479ceaf9b`（GPT-6 验收基线） | 公开 | `YES` | 公开仓库分支 `feat/r3-p0-controlled` 直接读取 |
| `PUB-06` | `references/webnovel/` | 统一中文网文知识库（含 GPL 上游原件与补充层） | GitHub（`feat/r3-migration`） | `references/webnovel/README.md` | 见 `UPSTREAM-MANIFEST.json` | `b5572a943f9157cda07faa7910dcbfd20b1a3ba5`（导入基线 `04e485d`） | 公开（GPL-3.0） | `YES` | 公开仓库直接读取，只读检索见 `scripts/webnovel_knowledge.py` |

---

## 二、私有与本地实验报告 / 小说原稿（Antigravity 会话 VM Artifact，未入公开仓）

> **跨环境可访问性说明**：以下 14 份文件位于当前 Antigravity 远端会话 VM 的 Artifact 目录（`<ART_ROOT>` = `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p_devbox/bb9496c7-61be-4b01-ad65-2da947e559e6`）。该 VM 仅绑定本会话生命周期；**全新 Agent / 新 ChatGPT 会话 / 新容器均无法直接读取（`NO`）**，仅在继续本会话或由作者预先导出归档后可访问。

| Asset ID | 名称 | 类型 | 存储位置 | 完整路径或链接 | SHA-256 | Git Commit | 隐私等级 | 新 Agent 可访问性 | 恢复说明 |
|---|---|---|---|---|---|---|---|---|---|
| `LOC-RPT-01` | `skill-live-eval-report.md` | 零干预双题材实测报告（23,090 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/skill-live-eval-report.md` | `b939662408257d9cb4e55598aff58b665082aa4664f00608c805a98e480ae4ea` | 无（未入 Git） | 私有（含原稿引文） | `NO` | 仅本会话 VM 可读；跨会话需作者从 Artifact 导出或重新提供 |
| `LOC-RPT-02` | `step1-m1-m4-delivery.md` | M1–M4 第一步工程改造交付报告（76,846 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/step1-m1-m4-delivery.md` | `407675f788cceeb015b3905473d9f16b22ab9498405d60f8faa5480faed1f871` | 对应本地分支 `0bf1798`→`c45d4c6` | 私有 | `NO` | 仅本会话 VM 可读；跨会话需作者导出或恢复本会话 |
| `LOC-RPT-03` | `step2-m1-replay-report.md` | M1 第二步《残器长生》Ch 3 返工重放报告（50,020 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/step2-m1-replay-report.md` | `6aad7dbbbbd6c7688db5e1f1839de1312b9bc6442e7eddc34c33f0eececd7a2d` | 对应本地分支 `c45d4c6` | 私有（含小说段落） | `NO` | 仅本会话 VM 可读；原稿不得入公开仓，需作者导出留存 |
| `LOC-RPT-04` | `step3-r3-trial-report.md` | M1–M4 第三步《器痕录》完整试跑报告（42,036 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/step3-r3-trial-report.md` | `091e76f558adf61f4f7a7406df03eed6a74994709a27fa478d4cb3e70ff1b7db` | 对应本地分支 `c45d4c6` | 私有（含规划与报告） | `NO` | 仅本会话 VM 可读；需作者导出归档 |
| `LOC-MS-01` | `step3-qihenlu-manuscript-ch1-3.md` | 小说原稿（《器痕录》Ch 1–3 全文，46,846 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/step3-qihenlu-manuscript-ch1-3.md` | `09d045ae51388c6bee300497846d189e8a41a458809304e013604f489f408239` | 无（严禁入公开 Git） | **含小说正文（严禁公开）** | `NO` | 仅本会话 VM 可读；由作者本地/私有云保管，不得提交公开仓 |
| `LOC-RPT-05` | `r3-phase1-midterm-report.md` | Phase 1 吞吐实验中报（24,683 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/r3-phase1-midterm-report.md` | `24f9c49958976fdc710a7581480e5d832d102639b1890cfea47d524c580e48b4` | 对应本地分支 `c0966b1` | 私有 | `NO` | 核心耗时数据已汇总入公开 `docs/r3/review-v3/01` & `03`；全文需本会话导出 |
| `LOC-RPT-06` | `r3-phase1-blind-audit-and-qa-report.md` | Phase 1 独立三路盲审报告 Blind A/B/C（52,194 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/r3-phase1-blind-audit-and-qa-report.md` | `5d12eb65f36b2b4c5a3d510795d23fc3d5d195337ac07593eb959501cbca20ca` | 对应本地分支 `c0966b1` | 私有（含原稿引文） | `NO` | 关键统计已汇总入公开 `docs/r3/review-v3/01`；原文需本会话导出 |
| `LOC-RPT-07` | `r3-review-calibration-v2.2-final-offline-validation-report.md` | 审稿尺度校准 v2.2 最终离线验证报告（24,004 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/r3-review-calibration-v2.2-final-offline-validation-report.md` | `ef812f5a76da1efac011660087879da60056c421383b7ef8f3454225d4e3d093` | 无（沙箱离线实验） | 私有（含案例引文） | `NO` | 门禁结论已汇总入公开 `docs/r3/review-v3/01` & `08`；原文需本会话导出 |
| `LOC-RPT-08` | `r3-throughput-optimization-blueprint.md` / `r3-phase1-feasibility-correction-and-plan.md` | Phase 1 吞吐蓝图与可行性修正计划（36,952 B / 35,758 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/r3-throughput-optimization-blueprint.md` 等 | `aa952429...10ccc` / `8d1da33f...776c` | 无 | 私有 | `NO` | 仅本会话 VM 可读；历史过程文件，核心架构已固化入 `docs/r3/review-v3/` |
| `LOC-RPT-09` | `r3-review-calibration-{design,offline,v2,v2.1}-*.md`（4 份） | 校准设计与 v1/v2/v2.1 离线验证过程报告 | 本地 VM（本会话 Artifact） | `<ART_ROOT>/r3-review-calibration-*.md` | `71e26b31...` / `045d8acb...` / `061a2879...` / `079001c4...` | 无 | 私有 | `NO` | 仅本会话 VM 可读；中间过程文件，终态见 `LOC-RPT-07` |
| `LOC-RPT-10` | `webnovel-writer-{,v8-}review-workflow-benchmark.md`（2 份） | 外部项目 v6 / v8 源码级审核基准报告（33,617 B / 20,470 B） | 本地 VM（本会话 Artifact） | `<ART_ROOT>/webnovel-writer-*benchmark.md` | `f3ee9d20...5335` / `014d1c42...e3d8` | 无 | 私有（研究笔记） | `NO` | 核心对比裁决已固化入公开 `docs/r3/review-v3/02-三方差异矩阵.md` |
| `LOC-SCR-01` | `scratch/{live-eval,step2-m1-replay,step3-r3-trial,phase1-*}` | 原始沙箱实验目录（含《残器长生》《降本增笑》《器痕录》及 Arm 0–2 原稿/遥测/校准原始 JSON） | 本地 VM（本会话 Scratch） | `<ART_ROOT>/scratch/` | 多文件目录（未打包） | 无（严禁入公开 Git） | **含小说正文与实验隐私键** | `NO` | 仅本会话 VM 可读；如需跨会话保留，须由作者授权导出加密私有备份 |

---

## 三、外部私有压缩包与 Google Drive 私有资产（当前 VM 不存在原件）

> **诚实声明**：经全盘检索当前 VM `/home/antigravity`，以下外部私有 ZIP 均**不在本 VM 内**，且未连接或保存私有 Google Drive 直链。以下如实标注 `UNKNOWN`，绝不编造链接或 SHA-256；历史复核摘要可查公开 [`docs/R3-PRD.md`](./R3-PRD.md)。

| Asset ID | 名称 | 类型 | 存储位置 | 完整路径或链接 | SHA-256 | Git Commit | 隐私等级 | 新 Agent 可访问性 | 恢复说明 |
|---|---|---|---|---|---|---|---|---|---|
| `EXT-ZIP-01` | `gemini-memory-literary-gain-exp.zip` | Gemini 原生记忆与文学增益实验包（6 篇成稿+盲审+揭晓） | 作者本地 / 早期聊天上传（不在本 VM，不在公开仓） | `UNKNOWN`（历史复核摘要见 `docs/R3-PRD.md` 250–258 行） | `UNKNOWN` | 无（严禁入公开 Git） | **私有 / 含实验正文** | `NO`（需作者重新上传） | 由作者从本地备份或历史上传记录提供；新 Agent 无法自行获取 |
| `EXT-ZIP-02` | `xianmen-dazhanggui-r3-pilot-delivery.zip` | 《仙门大掌柜》首次 R3 Pilot 精简交付包（22 文件） | 作者本地 / 早期聊天上传（不在本 VM，不在公开仓） | `UNKNOWN`（历史复核摘要见 `docs/R3-PRD.md` 225–231 行） | `UNKNOWN` | 无（严禁入公开 Git） | **含小说正文（严禁公开）** | `NO`（需作者提供） | 历史审阅精简包（缺快照目录，不可独立复现全门禁）；由作者私有保管 |
| `EXT-ZIP-03` | `xianmen-dazhanggui-r3-pilot-complete-20261124.zip`（`complete-20261124.zip`） | 《仙门大掌柜》完整 R3 Pilot 交付快照 ZIP（197,711 B，74 文件+清单）及后续 P1 激活版（210,038 B，78 文件+清单） | 作者 Google Drive / 本地私有备份（不在本 VM，不在公开仓） | `UNKNOWN`（私有 Drive ID 不入公开仓；复核摘要见 `docs/R3-PRD.md` 364、371、380 行） | `UNKNOWN` | 无（严禁入公开 Git） | **含小说正文（严禁公开）** | `UNKNOWN`（取决于宿主是否获作者 Drive 授权） | 须在获作者 Drive 授权或作者手动提供 ZIP 后，用 `scripts/r3_delivery.py verify` 与 `restore_snapshot.py` 隔离恢复 |
| `EXT-DRV-01` | `[CN-R3-EXP] 跨作品创作经验库` | Google Drive 唯一权威跨作品经验库（6 主题 + `00-INDEX-vN.md` + `staging/` + `archive/`） | 作者个人 Google Drive 根目录 | 规范目录名 `[CN-R3-EXP] 跨作品创作经验库`（实际 Drive Folder ID 私有：`UNKNOWN`） | 动态演进 | 无（仅脚本 `scripts/r3_experience_drive.mjs` 在公开仓） | 私有 | `UNKNOWN`（需作者授权 Drive 权限） | 仅在宿主获得作者 Google Drive 读写授权后按 `references/v3/r3-p1-protocol.md` 定位；无授权时静默降级不阻断创作 |

---

## 四、本地未推送 Git 实验分支（仅存于当前 VM `.git`，GitHub 远端不存在）

> **重要风险提示**：以下两个实验分支仅存在于当前 Antigravity 会话 VM 的本地 `.git` 对象库中，**从未推送至 GitHub `origin`**（严禁未经授权擅自推送）。**如果新 Agent 在全新环境重新 `git clone` GitHub 仓库，将完全无法看到这两个分支（可访问性 = `NO`）！**

| Asset ID | 名称 | 类型 | 存储位置 | 完整路径或链接 | SHA-256 | Git Commit | 隐私等级 | 新 Agent 可访问性 | 恢复说明 |
|---|---|---|---|---|---|---|---|---|---|
| `LOC-BR-01` | `feat/r3-m1-m4-craft-refinement` | 未推送本地 Git 实验分支（M1–M4 文学专项，领先 `b32e9289` 2 个提交） | 本地 VM `.git`（未推 GitHub） | 本地 `/home/antigravity/chindden/chinese-novelist-skill` 分支 `feat/r3-m1-m4-craft-refinement` | 不适用（Git 分支） | `c45d4c66eee1584b2be4cef0b7879d62e524bfda`（基线 `b32e92891d89945baed9a0707e90fbc3572afd20`，提交时间 `2026-11-24T14:29:22Z`） | 公开代码类（但未获授权推送） | **`NO`（新环境 `git clone` 无法恢复）** | 仅本会话 VM 可 `git checkout` / `git show`；若需跨环境保留，须先获作者明确授权推送到远端或导出 `git bundle` / patch 存档 |
| `LOC-BR-02` | `feat/r3-phase1-throughput-o1-o3` | 未推送本地 Git 实验分支（Phase 1 O1–O3 吞吐脚本、遥测与测试，领先 `b32e9289` 3 个提交） | 本地 VM `.git`（未推 GitHub） | 本地 `/home/antigravity/chindden/chinese-novelist-skill` 分支 `feat/r3-phase1-throughput-o1-o3` | 不适用（Git 分支） | `c0966b129135b8ec0d2fd38f90d8b34d2f92f6e9`（基线 `b32e92891d89945baed9a0707e90fbc3572afd20`，提交时间 `2026-11-25T04:22:28Z`） | 公开代码类（但未获授权推送） | **`NO`（新环境 `git clone` 无法恢复）** | 同上；`P0-0` 审计需在本会话 VM 执行，或在切换新环境前经作者授权以只读归档分支/`git bundle` 保留 |

---

## 五、当前无法在 VM 中定位原始文件的资产清单（透明留痕）

以下资产在历史文档中存在复核结论，但**原始文件当前不在本 VM 文件系统也不在公开 GitHub 仓库**，新会话如需核验原始字节，必须由作者重新提供或授予对应云端权限：
1. `EXT-ZIP-01`：`gemini-memory-literary-gain-exp.zip`（路径 `UNKNOWN`，SHA-256 `UNKNOWN`）
2. `EXT-ZIP-02`：`xianmen-dazhanggui-r3-pilot-delivery.zip`（路径 `UNKNOWN`，SHA-256 `UNKNOWN`）
3. `EXT-ZIP-03`：`xianmen-dazhanggui-r3-pilot-complete-20261124.zip`（及 P1 激活版 ZIP，路径 `UNKNOWN`，SHA-256 `UNKNOWN`）
4. `EXT-DRV-01`：Google Drive `[CN-R3-EXP] 跨作品创作经验库`（Folder ID 私有 `UNKNOWN`，视宿主 Drive 授权而定）
5. `Step 3` 与早期 Gemini 会话的子代理原始 `transcript.jsonl`（未落盘至本仓库或可访问日志，标 `UNKNOWN`）
