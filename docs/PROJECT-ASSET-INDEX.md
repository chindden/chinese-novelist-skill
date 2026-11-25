# Chinese Novelist Skill — Project Asset Index

> **版本**：`2.1`（按依赖分级与按需保全原则修订，对齐 [`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md) `v1.1` 与 [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)）  
> **核验基线**：公开主仓 `chindden/chinese-novelist-skill`（唯一研发权威入口，不建第二仓），分支 `feat/r3-p0-controlled` @ `e9c9befc464f75b86aa9e1f6f4cd31872a1f13ff`  
> **核心纪律**：
> 1. **按需索引，不追求全量历史收录**：本表重点保障 **Tier 1（当前主流程必需）** 与 **Tier 2（冻结架构关键证据）** 可跨 Agent 直接恢复；Tier 3 / Tier 4 历史文件保留原位，**不因缺失而阻塞当前 P0 主流程**，仅在 `P0-0` 或具体任务确认直接依赖时再按需补充；
> 2. **公私与许可边界**：研发测试小说/实验样本原则上属公开研发资产（**测试小说许可证状态为 `REVIEW`，严禁擅自选定许可证**）；作者正式个人创作小说及其草稿属私人资产，严禁入公开仓；Google Drive 仅用于已完成正式个人小说备份；
> 3. **隐私脱敏**：本公开仓库严禁写入个人邮箱、私有 Drive ID/直链或访问令牌；已核实存在的历史文件保留原状、不擅自删除。

---

## 一、Tier 1：当前主流程必需资产（公开主仓，跨 Agent 直接可恢复）

| Asset ID | 资产名称 / 路径 | 用途 | 权威位置 | 新 Agent 可恢复 | 备注 |
|---|---|---|---|---|---|
| `PUB-01` | [`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md) | 全仓库长期上下文档案 | GitHub 主仓 `feat/r3-p0-controlled` | ✅ `YES` | `git clone` 直接读取 |
| `PUB-02` | [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md) | 新 Agent 长期接管协议与模拟测试清单 | GitHub 主仓 `feat/r3-p0-controlled` | ✅ `YES` | `git clone` 直接读取 |
| `PUB-03` | [`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md) | 研发资产按需保全规范（`v1.1`） | GitHub 主仓 `feat/r3-p0-controlled` | ✅ `YES` | `git clone` 直接读取 |
| `PUB-04` | [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md) | 项目关键资产索引（本文） | GitHub 主仓 `feat/r3-p0-controlled` | ✅ `YES` | `git clone` 直接读取 |
| `PUB-05` | [`docs/r3/p0-implementation/`](./r3/p0-implementation/README.md) | P0 实施管理 PRD（`v1.0.1`，已获 GPT-6 `ACCEPTED`） | GitHub 主仓 `feat/r3-p0-controlled`（验收基线 `e52105ad`） | ✅ `YES` | `P0-0` ~ `P0-6` 执行权威 |
| `PUB-06` | `SKILL.md` / `scripts/` / `tests/` / `references/` | Skill 源码、门禁脚本、单测基线与 GPL 知识库 | GitHub 主仓 `feat/r3-p0-controlled` | ✅ `YES` | 按 `README_V3.md` 即可无缓存复跑测试 |

---

## 二、Tier 2：冻结架构关键证据与 P0 待核查基准（核心结论已入仓；原始样本按 `P0-0` 实际需要补充）

| Asset ID | 资产名称 | 类型 | 当前状态与存放位置 | 新 Agent 可恢复 | P0 阶段处理方式 |
|---|---|---|---|---|---|
| `ARCH-01` | [`docs/r3/review-v3/`](./r3/review-v3/README.md)（含 8 份架构文档） | 已冻结 R3 审核体系 v3（`v1.2.3`，PR #3） | GitHub 主仓（Merge `b5572a94`） | ✅ `YES` | 只读冻结权威；已固化 Phase 1 盲审（57.4% 过度定级）与 v2.2 校准核心统计 |
| `ARCH-02` | [`docs/R3-PRD.md`](./R3-PRD.md) | R3 早期至迁移、知识库导入与 P1-08 历史主 PRD 台账 | GitHub 主仓 | ✅ `YES` | 历史决策与早期验证摘要权威记录 |
| `P0-DEP-01` | `G2-A` 历史回归样本（9 章 / 33 案例）与 `G2-B Independent Holdout`（目标 `>=20` 章 / `>=60` 案例） | `P0-6` A/B/C 离线对照基准 | `G2-A` 原始沙箱数据位于当前 VM `<ART_ROOT>/scratch/`；**`G2-B` 当前 `underpowered`（就绪 `0` 章 / `0` 案例）** | ⏳ 待 `P0-0` 实测定界 | **严格按 `P0-0` 审计结果决定**：仅将 P0 直接依赖的必要基准样本（测试小说标 `license_status: REVIEW`）纳入主仓或明确缺口补建计划 |
| `P0-DEP-02` | `feat/r3-phase1-throughput-o1-o3`（`c0966b129135b8ec0d2fd38f90d8b34d2f92f6e9`） | 本地未推送 Phase 1 实验分支（领先 `b32e9289` 3 提交） | 当前 VM 本地 `.git`（`git fsck` 正常） | ❌ 仅本地（不强制迁仓） | **不强制推送或迁移**；`P0-0` 按 PRD 只读核查其与 `feat/r3-p0-controlled` 的必要差异并记入 `P0-0-Baseline-Audit-Report.md` |

---

## 三、Tier 3：仍有价值的历史参考（保留原位，不阻塞 P0，按需补充）

> 以下资产已核实存在位置，**不再要求全量搬迁、不再新建第二仓库、不再为完整性强行补算全量 SHA-256**；仅当未来某具体任务确有依赖时再按需调取或补充。

| 参考类别 | 代表资产（已核实留痕） | 当前位置（脱敏） | 性质 / 许可状态 | 处置原则 |
|---|---|---|---|---|
| **VM 历史实验报告与测试稿** | `skill-live-eval-report.md`、`step1-m1-m4-delivery.md`、`step2-m1-replay-report.md`、`step3-r3-trial-report.md`、`step3-qihenlu-manuscript-ch1-3.md`、`r3-phase1-midterm-report.md`、`r3-phase1-blind-audit-and-qa-report.md`、`r3-review-calibration-v2.2-final-offline-validation-report.md` 及 `scratch/` | 当前会话 VM `<ART_ROOT>/`（核心 8 份实测 SHA-256 见历史提交 `bb01bbd0` / `e9c9befc`） | 公开研发测试资产（测试小说许可：`REVIEW`） | 核心结论已固化入 `docs/r3/review-v3/`；仅在 `P0-0` 确认某文件直接影响 P0 实施时按需补充入主仓 |
| **本地未推送历史代码分支** | `feat/r3-m1-m4-craft-refinement`（`c45d4c66eee1584b2be4cef0b7879d62e524bfda`） | 当前 VM 本地 `.git`（完整包含于 `c0966b12` 谱系内） | 公开研发代码 | 留存原位，不强制推送或迁移 |
| **ChatGPT 历史文件库实验包** | `gemini-memory-literary-gain-exp.zip`、`xianmen-dazhanggui-r3-pilot-delivery.zip` | ChatGPT 历史文件库 / 作者本地（GPT-6 侧曾核实历史存在；Neon 当前环境不可直读 ≠ 已丢失） | 研发历史测试包（测试小说许可：`REVIEW`） | 保留原位，**不再强行全量恢复**；与当前 P0 无直接依赖 |
| **Google Drive 历史实验快照** | `xianmen-dazhanggui-r3-{pilot-complete,p1-activated,ch12-complete}-20261124.zip`（3 份，只读核验 `testzip=OK`，SHA-256 记于 `c6ac24bd`） | Google Drive 私有目录（`Shared: false`，ID 脱敏） | 研发期测试连载快照（非正式完本个人小说；测试小说许可：`REVIEW`） | 保持原状不删除、不搬迁；与当前 P0 无直接依赖 |
| **`P1-08` 历史 Drive 经验空库** | `[CN-R3-EXP] 跨作品创作经验库`（`entries=0`） | Google Drive 私有目录（`Shared: false`，ID 脱敏） | 研发/运行时知识资产 | 保持原状不动；待 P1 阶段涉及跨作品学习时再按需去 Drive 重构，不阻塞 P0 |

---

## 四、Tier 4：已废弃、未落盘或与当前任务无关的历史文件（不恢复、不阻塞）

- **已揭盲退役样本**：历史离线校准 Holdout（`NH-1..5`、`V22-H1..4`）已退役，严禁充当 `G2-B Independent Holdout`。
- **未落盘历史过程文件**：早期会话未落盘的子代理原始 `transcript.jsonl` 与未定位独立原件的 `p1_final_host_acceptance_report.md`（摘要已完整记于 `docs/R3-PRD.md` L337–380）——**不追溯恢复，不视为项目阻塞**。
- **正式完本个人小说备份**：截至 `2026-11-25` 为 **`0` 项**（Google Drive 未来仅用于已完成正式个人小说备份，不属于研发工作流）。
