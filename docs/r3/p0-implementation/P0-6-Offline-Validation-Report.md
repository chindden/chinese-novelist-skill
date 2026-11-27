# P0-6 离线统计验收引擎交付与 G1–G6 样本就绪度阻断报告

> **任务**：`P0-6`（GitHub [Issue #10](https://github.com/chindden/chinese-novelist-skill/issues/10)）  
> **对应冻结规范**：[`docs/r3/review-v3/08-工程效率与文学质量双重验收方案.md`](../review-v3/08-工程效率与文学质量双重验收方案.md)（`v1.2.3`）§2.1 & §3、[`P0-Implementation-PRD.md`](./P0-Implementation-PRD.md) `P0-6`  
> **当前真实裁决**：**`BLOCKED_UNDERPOWERED`**（`winner: null`、`allowProductionMerge: false`）  
> **证据分层声明**：本报告所列自动化测试结果仅代表 **Neon 本地 Linux VM 对确定性统计与防泄漏引擎的工程验证**，不代表 GitHub CI、不代表 GPT-6 独立复跑结论、不代表离线 A/B/C 三方案已完成真实 LLM 盲测，亦不代表文学质量提升或生产主模板切换授权。

---

## 一、核心结论（严格遵循停机规则 1）

1. **已完成部分（P0-6 阶段 1A：确定性统计、防泄漏与 Go/No-Go 裁决引擎）**：
   - 已交付确定性统计与裁决脚本 [`scripts/p0_prototypes/eval_g1_g6_stats.mjs`](../../../scripts/p0_prototypes/eval_g1_g6_stats.mjs) 及完整数学/反作弊单元测试套件 [`scripts/tests/r3_p0_stats.test.mjs`](../../../scripts/tests/r3_p0_stats.test.mjs)（`TC-P0-6-1A`–`TC-P0-6-1G`、`TC-P0-6-R2-1`–`TC-P0-6-R2-4`）。
   - 完整实现冻结协议要求的：
     - **`G2-A` 与 `G2-B` 强制分轨**：Schema 级硬拒绝任何合并 `G2` 字段（`R3_P0_6_MERGED_G2_FORBIDDEN`）；
     - **跨集零泄漏 + 独立 Holdout 内部来源唯一性双层硬断言**：既按 `chapterId`、`sourceChapterId`、`contentSha256` 及退役黑名单（`NH-1..5`、`V22-H1..4`、`OLD-HOLD-1..4`、`DOC-1..6`、`Arm 0..2 Ch 1..3`、`器痕录`/`残器长生`/`降本增笑`/`潮汐证词`/`盐引旧账`）拦截历史泄漏（`R3_P0_6_DATA_LEAKAGE_DETECTED`），又对非空 `G2-B`/`G6` 独立 Holdout 强制校验可验证 `sourceChapterId` 与 64 位 hex `contentSha256` 存在且在内部唯一（`R3_P0_6_HOLDOUT_PROVENANCE_UNVERIFIED`、`R3_P0_6_HOLDOUT_DUPLICATE_SOURCE_CHAPTER`、`R3_P0_6_HOLDOUT_DUPLICATE_CONTENT_HASH`），彻底杜绝改名虚增 `$N_{\text{ch}}$`；
     - **声明清册与每轮实测强一致性**：每轮 run 必须 100% 覆盖声明章节（`R3_P0_6_RUN_CHAPTER_COVERAGE_MISMATCH`），逐章校验非负整数计数、包含关系（`clearTierFp <= fp`、`blockerMisses <= fn`、`noIssue <= nonBlockingTn`）及与清册真值一致（`tp+fn === positives`、`fp+tn === negatives`、`blockingFp+nonBlockingTn === paragraphs`），并对账 Bootstrap 实际聚类数 `nClusters`；
     - **公平 A/B/C 同台对照硬门禁**：正式 `adjudicateSchemes()` 强制要求 `{A, B, C}` 三方案齐备（`R3_P0_6_INCOMPLETE_ABC_SCHEMES`）且三方案在 G1–G6 的冻结章节清册、来源章、正文哈希、G4 案例主键与真值标注规范化等价（`R3_P0_6_UNEQUAL_EVALUATION_DATASET`），单方案诊断由 `evaluateSchemeG1ToG6()` 独立承担；
     - **章节级聚类非参数 Bootstrap 95% CI**：硬锁 `B = 2,000`（`R3_P0_6_BOOTSTRAP_ITERATIONS_LOCKED`），采用确定性 Mulberry32 PRNG 保证逐比特可复现，按独立章节整章有放回重抽样（`$K_{\text{rep}}$` 绝不放大聚类数 `$N_{\text{ch}}$`），输出点估计、章节级宏观均值及 95% CI，并显式标注 `doesNotCompensateForSmallNCh: true`；
     - **有序四级 4×4 混淆矩阵、退化 Kappa 拦截与案例可追溯性**：严格按 `['BLOCKER', 'MAJOR', 'MINOR', 'SUGGESTION']` 计算主指标 $\kappa_w$（`>= 0.85`）、辅指标未加权 Cohen's $\kappa$ 与 `SUGGESTION` 进必改闭环泄漏计数（`= 0%`）；退化边际分母为零时返回 `null` / `UNDEFINED_DEGENERATE_MARGINALS`（绝不硬赋 `1.0`），并强制校验每条探针的 `caseId`/`sourceChapterId` 追溯、4 级全覆盖及与声明来源章一致；
     - **G6 预算上限提示与 G5 兼容测试锚点**：`evaluateG6()` 显式标记 `budgetStatus`（超出 `4–6` 题材或 `12–16` 章预算时标示 `EXCEEDS_FROZEN_BUDGET_REQUIRES_AUTHOR_APPROVAL`）；G5 兼容布尔值在就绪清册中指向真实可复跑单测（`r3_s1_severity_compat.test.mjs`、`r3_fingerprint_failclosed.test.mjs`、`r3_p0_prototypes.test.mjs`）；
     - **方案 B 淘汰硬规则与多方案胜出优先级**：方案 B 在 G1 或 G6 任一门禁出现 `1` 例 `BLOCKER` 漏检，或召回率落后方案 A/C 超过 `1.0 pp`（采用浮点安全 `round6` 比对），直接淘汰；多方案全过时严格按 **① G6 `BLOCKER` 零漏检 & 召回最高 → ② G2-B 3 轮均值 FPR 最低 & 方差最小 → ③ 审稿延迟最低** 排序，且输出强制保留 `allowProductionMerge: false`。

2. **当前真实阻断状态（`BLOCKED_UNDERPOWERED`）**：
   - 依据 [`P0-0-Baseline-Audit-Report.md`](./P0-0-Baseline-Audit-Report.md) 第五节核实的仓库与本地样本现状，使用 `eval_g1_g6_stats.mjs` 对脱敏就绪清册 [`evidence/p0-6/p0-6-readiness-input.json`](./evidence/p0-6/p0-6-readiness-input.json) 执行确定性评估，生成可复现裁决档案 [`evidence/p0-6/p0-6-readiness-verdict.json`](./evidence/p0-6/p0-6-readiness-verdict.json)：
     - **`verdict`**：`BLOCKED_UNDERPOWERED`
     - **`winner`**：`null`
     - **`allowProductionMerge`**：`false`
   - 在补齐独立盲测样本（尤其 `G2-B` 与 `G6`，以及 `G3`/`G4`/`G5` 缺口）并完成由互相隔离的 Writer/Reviewer 子代理执行的 A/B/C 真实同台盲跑之前，**严禁宣布 `G2-B` / `G6` / `P0-6` 独立泛化验收通过，严禁将任何方案合入生产主模板**。

---

## 二、G1–G6 样本就绪度与精确缺口清册（严格分轨，禁止混算）

> 机器核验命令：
> ```bash
> node scripts/p0_prototypes/eval_g1_g6_stats.mjs evaluate \
>   --input docs/r3/p0-implementation/evidence/p0-6/p0-6-readiness-input.json \
>   --out docs/r3/p0-implementation/evidence/p0-6/p0-6-readiness-verdict.json \
>   --seed 20261126
> ```

| 门禁 | 轨道与方法学定位 | 冻结门槛（$N_{\text{ch}} / N_{\text{case}} / K_{\text{rep}}$） | 当前样本就绪 | 已执行真实 A/B/C 轮次 | 机器判定状态 | 精确缺口（禁止降门槛） |
|---|---|---|---:|---:|---|---|
| **G1** | `Regression/Calibration`（历史开发回归，非独立泛化） | Track 2 `N_ch>=9, N_pos>=40, K>=3` + 7 章回归 `K>=1` | Track 2 `9 章 / 40 正例`；回归 `7 章` | `K = 0` | `UNDERPOWERED`（待实跑） | 样本已就绪；需执行 `Track 2 K=3` + `Regression7 K=1` 真实对照 |
| **G2-A** | `Regression/Calibration`（历史误报回归，**通过 ≠ G2-B 通过**） | `N_ch>=9, N_neg>=33, K>=3`（Clear FP=0，均值 FPR<=13%，单轮<=15%，Precision>=88% 仅限该集） | `9 章 / 33 负例` | `K = 0` | `UNDERPOWERED`（待实跑） | 样本已就绪；需执行 `K=3` 真实对照 |
| **G2-B** | **`Independent Holdout`**（独立非阻断泛化验证，与 G2-A 零重叠） | 全新独立 **`N_ch>=20, N_neg>=60`**（单章 `<=3` 条、`>=3` 题材、`0` 重叠、禁黑名单、`K>=3`） | **`0 章 / 0 案例 / 0 题材`** | `K = 0` | **`UNDERPOWERED`（核心阻断）** | **`+20` 全新独立章节、`+60` 独立非阻断案例、`+3` 题材**（须双评委+第三仲裁定案）+ `K=3` |
| **G3** | 清白段落零误杀 | `N_ch>=10, N_case>=15`（单章 `<=2` 段、`K>=3`） | `9 章 / 9 段`（历史 S4） | `K = 0` | **`UNDERPOWERED`** | **`+1` 独立章节、`+6` 独立清白段落** + `K=3` |
| **G4** | 有序四级稳定与零泄漏 | 独立来源章 **`N_ch>=8`**, `N_case=24, K>=2`（$\kappa_w>=0.85$，`SUGGESTION` 泄漏=0%） | `3` 独立来源章 / `24` 探针 | `K = 0` | **`UNDERPOWERED`** | **`+5` 独立故事来源章节**（`Arm×Chapter=9` 不计作独立源章）+ `K=2` |
| **G5** | `OR6` 防漂白与工程兼容 | `>=3` 独立大纲死锁章 + 合法桥段 + S1/`ENG-FIX-P1` 兼容（`K=1`） | `1` 死锁章（`V22-H4`）+ 合法桥段；工程兼容单测已绿 | `K = 0` | **`UNDERPOWERED`** | **`+2` 独立大纲死锁章** + `K=1` |
| **G6** | **有限预算工程准入筛查**（**不宣称统计学证明 90% 生产召回**） | 4–6 题材 × `N_ch=12–16`（每题材 `>=2` 章）, `N_pos>=30, N_neg>=40, K=1` | **`0 章 / 0 正例 / 0 负例 / 0 题材`** | `K = 0` | **`UNDERPOWERED`（核心阻断）** | **`+12..16` 未揭盲跨题材完整章、`+30` 客观正例、`+40` 非阻断负例、`+4..6` 题材** + `K=1` |

### 禁入黑名单（已硬编码进 `eval_g1_g6_stats.mjs`）
以下已揭盲历史校准/退役样本严禁混入 `G2-B` 与 `G6`（一旦命中或正文 SHA-256 重复即 `exitCode: 2` 终止）：
- `ARM0-CH1`–`ARM2-CH3`、`G1-CH01`–`G1-CH03`、`DOC-1`–`DOC-6`、`STEP3-CH1`–`STEP3-CH3`、`LIVE-EVAL-*`；
- `OLD-HOLD-1`–`OLD-HOLD-4` / `HOLD-1`–`HOLD-4`；
- `NH-1`–`NH-5`；
- `V22-H1`–`V22-H4` / `H1-CH*`–`H4-CH*`；
- 已揭盲作品名关键字：`器痕录`、`残器长生`、`降本增笑`、`潮汐证词`、`盐引旧账`。

---

## 三、阶段二真实受控连载与多评委文学盲评状态

- **当前状态**：**`NOT_STARTED / LOCKED`**。
- **解锁前置条件**（全部满足且另获作者明确书面批准后方可启动）：
  1. 补齐 `G2-B`、`G3`、`G4`、`G5`、`G6` 独立样本缺口并完成独立双评委+第三仲裁定案；
  2. 由互相隔离的审稿子代理在同一冻结基线上完成 A/B/C 三方案真实离线盲跑；
  3. 至少一个方案全过 G1–G6（且未被方案 B 淘汰铁律淘汰），`eval_g1_g6_stats.mjs` 输出 `GO_CANDIDATE_SELECTED` 并经 GPT-6 独立复审认可；
  4. 作者明确批准开展阶段二（2 题材 × 3 章 = 6 独立章 Blind Audit A + Blind Audit B 多评委盲评）。

---

## 四、后续解锁路径建议（供作者决策）

1. **先验收 P0-6 阶段 1A 统计与防泄漏底座**：由 GPT-6 独立复审 `eval_g1_g6_stats.mjs`、`r3_p0_stats.test.mjs` 与本报告/JSON 档案，确认 P0-6 统计计量、反泄漏断言、停机规则与 `BLOCKED_UNDERPOWERED` 披露机制本身准确无误；
2. **由作者决策独立 Holdout 样本建设与预算**：明确 `G2-B`（`+20` 章 / `+60` 案例）、`G6`（`12–16` 章）及 `G3`/`G4`/`G5` 缺口章节的来源与独立定案安排后，再在后续受控批次中执行真实 A/B/C 三方案离线同台盲跑并更新最终裁决报告。
