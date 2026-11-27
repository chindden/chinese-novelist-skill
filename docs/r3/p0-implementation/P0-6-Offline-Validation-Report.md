# P0-6 离线统计验收引擎交付与 G1–G6 样本就绪度阻断报告

> **任务**：`P0-6`（GitHub [Issue #10](https://github.com/chindden/chinese-novelist-skill/issues/10)）  
> **对应冻结规范**：[`docs/r3/review-v3/08-工程效率与文学质量双重验收方案.md`](../review-v3/08-工程效率与文学质量双重验收方案.md)（`v1.2.3`）§2.1 & §3、[`P0-Implementation-PRD.md`](./P0-Implementation-PRD.md) `P0-6`  
> **当前真实裁决**：**`BLOCKED_UNDERPOWERED`**（`winner: null`、`allowProductionMerge: false`）  
> **证据分层声明**：本报告所列自动化测试结果仅代表 **Neon 本地 Linux VM 对确定性统计与防泄漏引擎（阶段 1A）的工程验证**，不代表 GitHub CI、不代表 GPT-6 独立复跑结论、不代表离线 A/B/C 三方案已完成真实 LLM 盲测或独立泛化通过，亦不代表文学质量提升或生产主模板切换授权。

---

## 一、核心结论与阶段 1A / 阶段 1B 职责边界（严格遵循停机规则 1）

1. **已完成部分（P0-6 阶段 1A：确定性统计、防泄漏与 Go/No-Go 裁决引擎）**：
   - 已交付确定性统计与裁决脚本 [`scripts/p0_prototypes/eval_g1_g6_stats.mjs`](../../../scripts/p0_prototypes/eval_g1_g6_stats.mjs) 及完整数学/反作弊单元测试套件 [`scripts/tests/r3_p0_stats.test.mjs`](../../../scripts/tests/r3_p0_stats.test.mjs)（`TC-P0-6-1A`–`TC-P0-6-1G`、`TC-P0-6-R2-1`–`TC-P0-6-R2-4`、`TC-P0-6-R3-1`–`TC-P0-6-R3-4`、`TC-P0-6-R4-1`–`TC-P0-6-R4-4`，共 `19` 项）。
   - 完整实现冻结协议与 Round 1–4 复审收口要求的：
     - **`G2-A` 与 `G2-B` 强制分轨**：Schema 级硬拒绝任何合并 `G2` 字段（`R3_P0_6_MERGED_G2_FORBIDDEN`）；
     - **已声明历史暴露自动汇总 + 退役黑名单 + Holdout 内部唯一性**：`evaluateSchemeG1ToG6()` 自动汇总 `referenceChapters`、`G1`（Track 2 + Regression 7）、`G2-A`、`G3`（含 `S4-ARM* -> QHL-CH1..3` 映射）、`G4`（`QHL-CH1..3` 及实际探针来源章）、`G5` 历史死锁样本与退役黑名单（`NH-1..5`、`V22-H1..4`、`OLD-HOLD-1..4`、`DOC-1..6`、`Arm 0..2 Ch 1..3`、`S4-ARM*`、`QHL-CH1..3`、`器痕录`/`残器长生`/`降本增笑`/`潮汐证词`/`盐引旧账`），对 `G2-B`/`G6` 执行跨集零泄漏拦截（`R3_P0_6_DATA_LEAKAGE_DETECTED`）与内部来源唯一性校验（`sourceChapterId` + 64 位 hex `contentSha256`）。同时显式声明：**阶段 1A 仅核验已声明元数据；原始小说正文 SHA-256 保管、历史揭盲核验与真实素材 Data Custody 归属阶段 1B**；
     - **G3 真实来源章去重**：`evaluateG3()` 按 `sourceChapterId` 去重统计独立故事来源章与聚类 Bootstrap 单元，确保历史 Track 2 `S4_CLEAN_CONTROL` 的 `9` 个 `Arm × Chapter` 运行实例按《器痕录》Ch 1–3 去重为 `3` 个独立来源章（绝不虚增为 `9` 章）；
     - **逐案例真值清册与逐案例预测推导（零自报聚合计数）**：所有已执行轮次的 `G1`、`G2-A`、`G2-B`、`G3`、`G6` 均须提供 `cases[]` 与 1 对 1 `predictions[]`，由引擎自行推导 `tp`/`fp`/`fn`/`tn`/`clearTierFp` 与 `blockerMisses`，绝不信任自报汇总计数；
     - **G2-A 精确基准冻结与 G2-B 阶段 1B 审批闸门**：`G2-A` 严格锁定 P0-0 历史基准 **`9 章 / 40 正例 / 33 负例`**（`R3_P0_6_G2A_FROZEN_SAMPLE_COUNT_MISMATCH`）并校验 `manifestVersion` 与确定性 `manifestSha256`（`computeCaseManifestSha256()`，支持运行前 `expectedG2AManifestSha256` 锚定）；`G2-B` 保留冻结清册哈希校验与严格 Precision 非空校验（`R3_P0_6_PRECISION_UNDEFINED`），并在未获作者于阶段 1B 建集前书面批准正例 cohort（`positiveCohortApproved === true` 且非空 `positiveCohortApprovalRef`）前强制拒绝进入正式通过状态（`R3_P0_6_G2B_POSITIVE_COHORT_UNAPPROVED`）；
     - **`K_rep` 协议级运行溯源校验**：每轮均须提供门禁内唯一非空 `runId`、非空 `executionEvidenceRef` 与 `modelId`/`configVersion`（拦截缺失与复制同一 run 凑轮次：`R3_P0_6_RUN_ID_REQUIRED`、`R3_P0_6_DUPLICATE_RUN_ID`、`R3_P0_6_EXECUTION_EVIDENCE_REF_REQUIRED`、`R3_P0_6_RUN_MODEL_CONFIG_REQUIRED`），允许真实独立运行产出相同预测，并诚实标注 `runProvenanceBoundary: "protocol_metadata_only_does_not_prove_host_execution_independence"`（真实宿主机执行审计归属阶段 1B）；
     - **冻结重复轮次与探针规模精确锁定**：`G1`（Track 2 `K=3`、回归 7 章 `K=1`）、`G2-A`（`K=3`）、`G2-B`（`K=3`）、`G3`（`K=3`）、`G4`（`K=2` 且 `N_case === 24`）、`G6`（`K=1`）均严格拦截超轮次与 G4 非 24 探针；
     - **公平 A/B/C 同台对照硬门禁**：正式 `adjudicateSchemes()` 强制要求 `{A, B, C}` 三方案齐备且在 G1–G6 的冻结章节、来源章、正文哈希、题材、`manifestVersion`/`manifestSha256`、逐案例 `cases[]`（`caseId`/`truthClass`/`tier`）及 G4 探针上完全等价（`R3_P0_6_UNEQUAL_EVALUATION_DATASET`）；
     - **15 题材受控词表、每题材 `>= 2` 章与 G6 预算上限严格布尔 Fail-Closed**：对齐 `genre-canonical.md` 锁定 15 题材并归一化空白；`G6` 要求每个纳入题材均 `>= 2` 章；超出 `6` 题材或 `16` 章冻结预算时默认 Fail-Closed（`R3_P0_6_G6_BUDGET_EXCEEDED_UNAPPROVED`），仅在**严格布尔** `g6BudgetExpansionApproved === true`（拒绝 `"false"`、`1`、`{}` 等非布尔 truthy 值）且附带可追溯 `g6BudgetApprovalRef` 时放行（否则 `R3_P0_6_G6_BUDGET_APPROVAL_REF_REQUIRED`）；
     - **章节级聚类非参数 Bootstrap 95% CI**：硬锁 `B = 2,000`，Mulberry32 确定性可复现，显式标注 `doesNotCompensateForSmallNCh: true`；
     - **有序四级 4×4 混淆矩阵与退化 Kappa 校验**：`computeOrderedKappa()` 直接数学函数在退化边际分母为零时返回 `null` / `UNDEFINED_DEGENERATE_MARGINALS`（绝不硬赋 `1.0`）；`evaluateG4()` 门禁层前置强制 4 级真值全覆盖（`R3_P0_6_G4_INCOMPLETE_SEVERITY_CLASSES`）、拦截单类预测塌缩（$\kappa_w = 0 < 0.85 \Rightarrow \text{FAIL}$）并校验逐案例 `caseId`/`sourceChapterId` 追溯与声明来源章一致；
     - **G5 可复跑测试路径锚点校验**：`evaluateG5()` 强制要求 `compatEvidenceRef` 同时包含非空 `s1CompatTest` 与 `engFixP1Test` 两个必需键（拒绝 `{fake: "x"}` 等无效对象），并显式标注 `compatEvidenceAnchorNote: "reproducible_test_path_anchor_only_not_ci_execution_proof"`——**仅表明提供了可复跑测试路径锚点，不等同于已执行测试或机器验证通过**；
     - **方案 B 淘汰硬规则与多方案胜出优先级**：方案 B 在 G1 或 G6 任一门禁出现 `1` 例 `BLOCKER` 漏检，或召回率落后方案 A/C 超过 `1.0 pp`（`round6` 浮点安全比对），直接淘汰；胜出裁决输出强制保留 `allowProductionMerge: false`。

2. **阶段 1A 与阶段 1B 职责边界（与 GPT-6 Round 3 协商共识）**：

| 职责 | 归属阶段 / 决策方 |
|---|---|
| 统计计算、门禁判定、聚类 Bootstrap 与 4×4 Kappa | **阶段 1A（本引擎已完成）** |
| A/B/C 案例级等价性、G2-A 精确 `40/33` 清册版本与哈希校验 | **阶段 1A（本引擎已完成）** |
| `K_rep` 协议元数据检查（`runId`/`executionEvidenceRef`/`modelId`/`configVersion`） | **阶段 1A（本引擎已完成）** |
| 已声明历史暴露记录（G1–G5）自动汇总与 G3 来源去重 | **阶段 1A（本引擎已完成）** |
| 原始素材 SHA-256 注册、保管与历史揭盲真实性核验（Data Custody） | **阶段 1B（独立样本治理期）** |
| 宿主机真实独立 LLM 盲跑日志与执行独立性审计 | **阶段 1B（真实对照执行期）** |
| G2-B 正例 cohort 规格与 Precision 口径批准 | **作者在阶段 1B 建集前决定** |
| G2-B 与 G6 独立集是否强制完全互斥 | **作者在阶段 1B 建集前决定** |

3. **当前真实阻断状态（`BLOCKED_UNDERPOWERED`）**：
   - 依据 [`P0-0-Baseline-Audit-Report.md`](./P0-0-Baseline-Audit-Report.md) 第五节核实的仓库与本地样本现状，使用 `eval_g1_g6_stats.mjs` 对脱敏就绪清册 [`evidence/p0-6/p0-6-readiness-input.json`](./evidence/p0-6/p0-6-readiness-input.json) 执行确定性评估，生成可逐比特复现裁决档案 [`evidence/p0-6/p0-6-readiness-verdict.json`](./evidence/p0-6/p0-6-readiness-verdict.json)：
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
| **G1** | `Regression/Calibration`（历史开发回归，非独立泛化） | Track 2 `N_ch>=9, N_pos>=40, K=3` + 7 章回归 `K=1` | Track 2 `9 章 / 40 正例`；回归 `7 章` | `K = 0` | `UNDERPOWERED`（待实跑） | 样本已就绪；需执行 `Track 2 K=3` + `Regression7 K=1` 真实对照 |
| **G2-A** | `Regression/Calibration`（历史误报回归，**通过 ≠ G2-B 通过**） | 精确冻结 **`9 章 / 40 正例 / 33 负例 / K=3`** + 清册 SHA-256 锚定（Clear FP=0，均值 FPR<=13%，单轮<=15%，Precision>=88% 仅限该集） | `9 章 / 40 正例 / 33 负例` | `K = 0` | `UNDERPOWERED`（待实跑） | 样本已就绪；需执行 `K=3` 真实对照并冻结清册哈希 |
| **G2-B** | **`Independent Holdout`**（独立非阻断泛化验证，与 G2-A 零重叠） | 全新独立 **`N_ch>=20, N_neg>=60`**（单章 `<=3` 条、`>=3` 受控题材、`0` 重叠、禁黑名单、`K=3`；正例 cohort 须由作者于阶段 1B 前书面批准） | **`0 章 / 0 案例 / 0 题材`** | `K = 0` | **`UNDERPOWERED`（核心阻断）** | **`+20` 全新独立章节、`+60` 独立非阻断案例、`+3` 受控题材** + 作者批准正例 cohort 规格 + `K=3` |
| **G3** | 清白段落零误杀 | 独立来源章 `N_ch>=10`, `N_case>=15`（单章 `<=2` 段、`K=3`） | **`3` 独立来源章**（`9` 个历史 `Arm×Ch` 实例 / `9` 段，按 `QHL-CH1..3` 去重） | `K = 0` | **`UNDERPOWERED`** | **`+7` 独立故事来源章节、`+6` 独立清白段落** + `K=3` |
| **G4** | 有序四级稳定与零泄漏 | 独立来源章 **`N_ch>=8`**, `N_case=24, K=2`（$\kappa_w>=0.85$，`SUGGESTION` 泄漏=0%） | `3` 独立来源章 / `24` 探针 | `K = 0` | **`UNDERPOWERED`** | **`+5` 独立故事来源章节**（`Arm×Chapter=9` 不计作独立源章）+ `K=2` |
| **G5** | `OR6` 防漂白与工程兼容 | `>=3` 独立大纲死锁章 + 合法桥段 + S1/`ENG-FIX-P1` 可复跑测试路径锚点（`K=1`） | `1` 死锁章（`V22-H4`）+ 合法桥段；已提供可复跑测试路径锚点 | `K = 0` | **`UNDERPOWERED`** | **`+2` 独立大纲死锁章** + `K=1` |
| **G6** | **有限预算工程准入筛查**（**不宣称统计学证明 90% 生产召回**） | 4–6 受控题材 × `N_ch=12–16`（**每题材 `>=2` 章**，超上限须严格布尔授权与批准引用）, `N_pos>=30, N_neg>=40, K=1` | **`0 章 / 0 正例 / 0 负例 / 0 题材`** | `K = 0` | **`UNDERPOWERED`（核心阻断）** | **`+12..16` 未揭盲跨题材完整章、`+30` 客观正例、`+40` 非阻断负例、`+4..6` 受控题材** + `K=1` |

### 禁入黑名单（已硬编码进 `eval_g1_g6_stats.mjs`，并与 G1–G5 已声明暴露自动汇总）
以下已揭盲历史校准/退役样本严禁混入 `G2-B` 与 `G6`（一旦命中或正文 SHA-256 重复即 `exitCode: 2` 终止）：
- `ARM0-CH1`–`ARM2-CH3`、`S4-ARM0-CH1`–`S4-ARM2-CH3`、`QHL-CH1`–`QHL-CH3`、`G1-CH01`–`G1-CH03`、`DOC-1`–`DOC-6`、`STEP3-CH1`–`STEP3-CH3`、`LIVE-EVAL-*`；
- `OLD-HOLD-1`–`OLD-HOLD-4` / `HOLD-1`–`HOLD-4`；
- `NH-1`–`NH-5`；
- `V22-H1`–`V22-H4` / `H1-CH*`–`H4-CH*`；
- 已揭盲作品名关键字：`器痕录`、`残器长生`、`降本增笑`、`潮汐证词`、`盐引旧账`。

---

## 三、阶段二真实受控连载与多评委文学盲评状态

- **当前状态**：**`NOT_STARTED / LOCKED`**。
- **解锁前置条件**（全部满足且另获作者明确书面批准后方可启动）：
  1. 作者在阶段 1B 前书面决策 `G2-B` 正例 cohort 规格与 `G2-B`/`G6` 互斥关系；
  2. 补齐 `G2-B`、`G3`、`G4`、`G5`、`G6` 独立样本缺口并完成阶段 1B Data Custody（真实正文哈希封存 + 双评委与第三仲裁定案）；
  3. 由互相隔离的审稿子代理在同一冻结基线上完成 A/B/C 三方案真实离线盲跑及宿主机执行独立性审计；
  4. 至少一个方案全过 G1–G6（且未被方案 B 淘汰铁律淘汰），`eval_g1_g6_stats.mjs` 输出 `GO_CANDIDATE_SELECTED` 并经 GPT-6 独立复审认可；
  5. 作者明确批准开展阶段二（2 题材 × 3 章 = 6 独立章 Blind Audit A + Blind Audit B 多评委盲评）。

---

## 四、后续解锁路径建议（供作者决策）

1. **先完成 P0-6 阶段 1A 工程底座结项验收**：由 GPT-6 独立复审 `eval_g1_g6_stats.mjs`、`r3_p0_stats.test.mjs` 与本报告/JSON 档案，验收统计引擎、逐案例推导、A/B/C 等价性、协议级溯源与已声明历史暴露汇总能力；
2. **由作者决策阶段 1B 独立 Holdout 建设与预算**：在启动阶段 1B 前明确 ① `G2-B` 正例 cohort 规格（或 Precision 门槛口径）、② `G2-B` 与 `G6` 是否完全互斥、③ 独立样本建设来源与 Data Custody 封存方式，随后在受控批次中开展真实 A/B/C 同台盲跑并更新最终裁决报告。
