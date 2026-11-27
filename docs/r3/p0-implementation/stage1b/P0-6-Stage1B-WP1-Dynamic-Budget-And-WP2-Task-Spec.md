# P0-6 阶段 1B · WP1 历史盘点结论、动态预算单与 WP2 标准化补创任务书

- **文档定位**：WP1 脱敏公开交付物（**0 字节原始小说正文、0 本机绝对路径、0 历史作品原题名暴露**）
- **基线依据**：
  - 实验设计：[P0-6-Stage-1B-Experiment-Design-v0.2.5.md](../P0-6-Stage-1B-Experiment-Design-v0.2.5.md)（Commit `c55fa4a89a694ad372b5bddcae547758a4a87b85`，GPT-6 `ACCEPTED` @ Issue `#10` Comment `7221482725`）
  - 执行分工：[P0-6-Stage-1B-Execution-Work-Package-Agreement-v1.0.md](../P0-6-Stage-1B-Execution-Work-Package-Agreement-v1.0.md)（Commit `77b21609c38920285702f03ce01a4817575f7298`，GPT-6 `ACCEPTED` @ Issue `#10` Comment `7222475128`）
  - 冻结门槛：[08-工程效率与文学质量双重验收方案.md](../../review-v3/08-工程效率与文学质量双重验收方案.md)（`v1.2.3`）
  - 作者签字决议：[P0-6-Stage1B-Author-Approval-Record.json](./P0-6-Stage1B-Author-Approval-Record.json)（`D1-B`、`D2-A [G6=16]`、`D3-C`、`D4-A`、`D5-A`）
  - 全局分配脱敏清册：[P0-6-Stage1B-Global-Allocation-v1-Sanitized.json](./P0-6-Stage1B-Global-Allocation-v1-Sanitized.json)
- **当前状态**：`WP1 DELIVERED — 待 GPT-6 一次性有限独立复核与作者批准动态预算后方可启动 WP2`（**WP2 尚未启动**）

---

## 一、WP1 历史素材盘点结论与数据保管摘要

### 1.1 全量可访问素材盘点与五态归类

基于 `P0-0` 附录 C.3 既定 2,723 文件清册的实盘复核及对当前 Project A `<ART_ROOT>`、代码仓与 `$HOME/upload/` 的增量核查（`0` 份新增未盘点小说手稿）：

- **全部可访问历史作品**：共 **`7`** 部独立来源作品（`175` 份正文手稿文件），其中：
  - `5` 部内部历史实验/校准/退役作品（`HIST-WORK-01` 至 `HIST-WORK-05`），全部确认 `exposureAuditStatus: "exposed"`（均已揭盲或命中黑名单）；
  - `2` 部外部上游公开参考仓样例（`EXT-REF-01`、`EXT-REF-02`），确认 `exposureAuditStatus: "exposed"`（非独立第三方公开资产）；
  - **本机可访问 `unknown` 候选作品**：`0` 部；对 Project A VM 之外无法核查的历史会话/外部渠道，严格按 Fail-Closed 归态 `EXCLUDED_UNKNOWN`，**0 部准入 `G2-B` 或 `G6`**。
- **五态汇总**：
  - `ELIGIBLE_ASSIGNED`：**`1`** 部（仅限 `HIST-WORK-05` 作为非 Holdout `G5` 已知死锁参考 `V22-H4`，严禁进入 `G2-B`/`G6`）；
  - `EXCLUDED_EXPOSED`：**`6`** 部（其中仅 `HIST-WORK-01` 的 `QHL-CH1..3` 按唯一白名单例外 `EXC-HIST-QHL-G3-G4` 复用于历史回归门禁 `G3`/`G4` 及既有 `G1`/`G2-A`/`G5` 合法桥段参考，严禁进入 `G2-B`/`G6`）；
  - `EXCLUDED_UNKNOWN`：`0`；`RESERVE`：`0`；`UNASSIGNED`：`0`。
- **Vault 完整原件留存锚点（0 字节入仓，仅存 Project A 本地 Vault）**：
  - `00-historical-exposure-registry.json` SHA-256：`7744a07830c94c20f6a78f21cef3587e3bd247e3257258ab6848b7279a74b21e`
  - `00b-historical-subagent-inventory.json` SHA-256：`81587be43cd1e01b0d4756e8aab1b9b035a6f039ae781b649c1aedf0fd35157e`
  - `00c-global-asset-allocation-v1-historical.json` SHA-256：`1c4d8be40610dfea7d0d20b3e31afc4608f7e5253e22836b96e1d1fd7785df6f`
  - `g4-hist-selected-9.json` SHA-256：`9cb97d98eaa91333b4dd9e6423888360e7fa9cf3298d01d1079bb74a7bb42c19`
  - `g4-hist-unselected-11.json` SHA-256：`976c4f89026031cea6b7b015821f8fdaf0bc92a2ebe0c3d298d9a4120ec3ad09`
  - `wp1-dedup-calibration.json` SHA-256：`031c169218ac686c74be44698f48df47e0477764bb450f2d1847710176429a10`

### 1.2 非 Holdout 近似重复阈值实证校准（NFKC 规范化字符 5-gram Jaccard）

在 5 部历史非 Holdout 作品（14 份代表章）上实测得到：

| 对比组 | 对数 | Jaccard5 最小值 | Jaccard5 最大值 | 校准结论 |
|---|---:|---:|---:|---|
| 同章修订稿（v1 vs 终稿） | `1` | `0.575902` | `0.575902` | 典型改写/修订 |
| 同作品同章不同实验 Arm 独立重写 | `5` | `0.017150` | `0.022638` | 同大纲重写下界 `0.0172` |
| 同作品不同章 | `24` | `0.001269` | `0.007418` | 同世界观共享专名背景 |
| **不同作品同题材**（`仙侠` vs `仙侠`） | `18` | `0.000000` | **`0.001491`** | 跨作品同题材噪声上限 |
| 不同作品不同题材 | `43` | `0.000000` | `0.000604` | 跨题材背景噪声 |

- **锁定 WP2 预检分级阈值（严格遵守分工协议 `v1.0` WP2）**：
  - **确定性硬失败（自动退回）**：`rawContentSha256` 精确相同、或 `normalizedContentSha256` 精确相同、或 `sourceWorkId` 冲突；
  - **近似重复预警（`HOLD / MANUAL_REVIEW_REQUIRED`，绝不自动拒收）**：字符 5-gram Jaccard $\ge 0.015$（为跨作品同题材噪声上限的 `10×`，同时可捕获同大纲重写 `0.0172`）**或**规范化最长公共子串 $\ge 25$ 汉字；仅经人工复核确认为改写/复制后才转入退回闭环，否则书面记录行业常规表达放行依据。

### 1.3 `G3-Plan A` 与 `G4-Plan A` 历史复用核验结果

- **`G3-Plan A`**：历史 `S4_CLEAN_CONTROL` 全部 `9` 条引文两两字符 5-gram Jaccard 均为 `0.0000`。为严格满足每历史源章仅取 `1` 冻结代表稿（`v0.2.5` §7.3 `10` 单元），锁定 `QHL-CH1`（`CAL-07`，167 字）、`QHL-CH2`（`CAL-46`，229 字）、`QHL-CH3`（`CAL-17`，246 字），贡献 `3` 独立来源章 / `3` 条清白段，仅需补充 **`7`** 个全新独立来源章 × `2` 段 = `14` 新段（总 `10` 章 / `17` 段 `>= 15`）。
- **`G4-Plan A`（`Mulberry32(20261128)` 连续 PRNG 流 + Fisher–Yates 确定性预注册）**：
  - 历史池 `20` 条真实案分布：`QHL-CH1`（`0M / 1m / 2S`）、`QHL-CH2`（`5M / 3m / 1S`）、`QHL-CH3`（`3M / 2m / 3S`），零篡改任何 `historicalOriginalTruth`；
  - 预注册入选 **`9` 案**（详见 `P0-6-Stage1B-Global-Allocation-v1-Sanitized.json` 完整 PRNG 抽取轨迹）：
    - `QHL-CH1`：`FC-03` (`MINOR`)、`FC-02` (`SUGGESTION`)、`FC-14` (`SUGGESTION`)；
    - `QHL-CH2`：`FC-11` (`MAJOR`)、`FC-23` (`MINOR`)、`FC-16` (`SUGGESTION`)；
    - `QHL-CH3`：`FC-19` (`MAJOR`)、`FC-18` (`MINOR`)、`FC-20` (`SUGGESTION`)；
  - 历史 9 案类别分布为 **`0 BLOCKER + 2 MAJOR + 3 MINOR + 4 SUGGESTION`**；因此 WP2 仅需补充 **`5` 个独立来源章 × `3` 案 = `15` 新案**（精准配置为 **`6 BLOCKER + 4 MAJOR + 3 MINOR + 2 SUGGESTION`**），合并构成精确 **`24` 案（`6B + 6M + 6m + 6S`） / `8` 独立源章**。

---

## 二、各门禁真实缺口表与动态预算单（待作者批准）

### 2.1 真实缺口精确核算表（$\Delta N_g = \max(0, \; T_g - R_g)$）

| 门禁 | 目标章数 $T_g$ | 历史合格复用 $R_g$ | 真实缺口 $\Delta N_g$ | 缺口补创目标摘要 |
|---|---:|---:|---:|---|
| **G1** | `9` (+`7` 回归) | `9` (+`7`) | **`0`** | 历史已齐（40 正例 + 7 回归章） |
| **G2-A** | `9` | `9` | **`0`** | 历史已齐（冻结 9 章 / 40 正 / 33 负） |
| **G2-B（`D1-B`）** | `20` | `0` | **`20`** | `4` 规范题材 × `5` 章；`72` 正例（`18B+54M`）+ `60` 非阻断（`30C+30B`） |
| **G6（`D2-A`）** | `16` | `0` | **`16`** | `4` 规范题材 × `4` 章（与 G2-B 6 维互斥）；`32` 正例（`10B+22M`）+ `48` 非阻断（`24C+24B`） |
| **G3（`Plan A`）** | `10` | `3` | **`7`** | 补 `7` 独立源章 × `2` 清白段 = `14` 新段（合历史 `3` 段 = `17` 段 `>= 15`） |
| **G4（`Plan A`）** | `8` | `3` | **`5`** | 补 `5` 独立源章 × `3` 案 = `15` 新案（`6B+4M+3m+2S`，合历史 9 案 = `6/6/6/6`） |
| **G5（最低冻结要求）** | `3` 死锁 | `1`（`V22-H4`） | **`2`** | 补 `2` 独立大纲死锁章（`S1B-G5-DL-02/03`）+ 复用 `CAL-49/62/11` 合法桥段 |
| **核心缺口小计** | **`66`** *(不含 G1/G2-A 复用)* | **`7`** *(按独立源章去重：`QHL-CH1..3` 共享计 3 + `V22-H4` 计 1)* | **`50` 章** | 较零历史复用 `Plan B`（56 章）实际节省 **`6` 章** |
| **预注册 FIFO 备用池** | `4` | `0` | **`4`** | `4` 规范题材各 `1` 章（2 章按 G2-B 配额 + 2 章按 G6 配额），按原始 `creatorIntendedLabel` 索引 |
| **WP2 总补创规模** | — | — | **`54` 章** | **核心 `50` 章 + FIFO 备用 `4` 章** |

### 2.2 动态调用量预算单（对应已审批 `D1-B` + `D2-A [G6=16]` + `Plan A`）

| 预算模块 | 计算明细 | 预计调用量 |
|---|---|---:|
| **WP2 · GPT-6 补创（50 核心 + 4 备用）** | 50 章核心（约 2 次/章）+ 4 章备用（约 2 次/章） | `~108` 次 |
| **WP3 · 独立双评委两步盲审 + Arbiter 3** | `(50 新章 + 3 G4 历史复审章) × 4` = `212` 次评委 + `~37` 次仲裁 + 4 备用章 `~18` 次 | `~267` 次 |
| **建集阶段（WP2 + WP3）合计** | — | **`~375` 次** |
| **WP5 · 方案 A（`1x` 单阶段）** | `162` 单元（G1 `34` + G2-B `60` + G3 `30` + G4 `16` + G5 `6` + G6 `16`） | **`162` 次** |
| **WP5 · 方案 B（`2x` 固定双阶段）** | `162 × 2` | **`324` 次** |
| **WP5 · 方案 C（Stage 1 + 条件 Stage 2）** | Stage 1 `162` 次 + Stage 2 `~117` 次（**`72.2%` 为 `[预算假设]`**，非实测值） | **`~279` 次** *(假设)* |
| **盲跑阶段（WP5）三方案合计** | — | **`~765` 次** |

---

## 三、WP2 标准化补创任务书与交付规范（待动态预算获批后发给 GPT-6 执行）

> **所有题材标签均严格锁定 1A 统计引擎 `CANONICAL_GENRES` 受控词表**（`仙侠`、`都市`、`悬疑`、`历史`、`科幻`），严禁自造同义词。所有 `54` 章分别隶属 **`54` 部完全独立的全新虚构作品**（互不共享主角、宗门/组织、世界观专名、核心案情或大纲骨架，且与全部 5 部历史退役作品及 2 部外部参考样例严格 6 维零交集）。

### 3.1 精确逐章 ID、题材与案例配额分配总表（`50` 核心章 + `4` FIFO 备用章）

#### A. `G2-B` 独立 Holdout（`20` 章 / `72` 正例 + `60` 非阻断，按题材分 4 批）

| 批次 | `sourceWorkId` / `sourceChapterId` | 规范题材 | 预期正例配额 | 预期非阻断配额 |
|---|---|---|---|---|
| **Batch 01** (`5` 章) | `S1B-W-G2B-01..03` / `S1B-G2B-01..03` | `仙侠` | 各 `1 BLOCKER + 3 MAJOR` | 各 `2 CLEAR + 1 BORDERLINE` |
| | `S1B-W-G2B-04..05` / `S1B-G2B-04..05` | `仙侠` | 各 `1 BLOCKER + 2 MAJOR` | 各 `2 CLEAR + 1 BORDERLINE` |
| **Batch 02** (`5` 章) | `S1B-W-G2B-06..08` / `S1B-G2B-06..08` | `都市` | 各 `1 BLOCKER + 3 MAJOR` | 各 `2 CLEAR + 1 BORDERLINE` |
| | `S1B-W-G2B-09..10` / `S1B-G2B-09..10` | `都市` | 各 `1 BLOCKER + 2 MAJOR` | 各 `2 CLEAR + 1 BORDERLINE` |
| **Batch 03** (`5` 章) | `S1B-W-G2B-11..13` / `S1B-G2B-11..13` | `悬疑` | 各 `1 BLOCKER + 3 MAJOR` | 各 `1 CLEAR + 2 BORDERLINE` |
| | `S1B-W-G2B-14` / `S1B-G2B-14` | `悬疑` | `1 BLOCKER + 2 MAJOR` | `1 CLEAR + 2 BORDERLINE` |
| | `S1B-W-G2B-15` / `S1B-G2B-15` | `悬疑` | `0 BLOCKER + 3 MAJOR` | `1 CLEAR + 2 BORDERLINE` |
| **Batch 04** (`5` 章) | `S1B-W-G2B-16..18` / `S1B-G2B-16..18` | `历史` | 各 `1 BLOCKER + 3 MAJOR` | 各 `1 CLEAR + 2 BORDERLINE` |
| | `S1B-W-G2B-19` / `S1B-G2B-19` | `历史` | `1 BLOCKER + 2 MAJOR` | `1 CLEAR + 2 BORDERLINE` |
| | `S1B-W-G2B-20` / `S1B-G2B-20` | `历史` | `0 BLOCKER + 3 MAJOR` | `1 CLEAR + 2 BORDERLINE` |
| **G2-B 合计** | **`20` 独立作品 / `20` 章** | **4 题材 × 5 章** | **`18B + 54M = 72` 正例** | **`30C + 30B = 60` 非阻断** |

#### B. `G6` 独立多题材 Holdout（`16` 章 / `32` 正例 + `48` 非阻断，每章精确 `5` 案，按题材分 4 批）

| 批次 | `sourceWorkId` / `sourceChapterId` | 规范题材 | 预期正例配额 | 预期非阻断配额 |
|---|---|---|---|---|
| **Batch 05** (`4` 章) | `S1B-W-G6-01..03` / `S1B-G6-01..03` | `仙侠` | 各 `1 BLOCKER + 1 MAJOR` | 各 `2 CLEAR + 1 BORDERLINE` |
| | `S1B-W-G6-04` / `S1B-G6-04` | `仙侠` | `0 BLOCKER + 2 MAJOR` | `2 CLEAR + 1 BORDERLINE` |
| **Batch 06** (`4` 章) | `S1B-W-G6-05..07` / `S1B-G6-05..07` | `都市` | 各 `1 BLOCKER + 1 MAJOR` | 各 `2 CLEAR + 1 BORDERLINE` |
| | `S1B-W-G6-08` / `S1B-G6-08` | `都市` | `0 BLOCKER + 2 MAJOR` | `2 CLEAR + 1 BORDERLINE` |
| **Batch 07** (`4` 章) | `S1B-W-G6-09..10` / `S1B-G6-09..10` | `悬疑` | 各 `1 BLOCKER + 1 MAJOR` | 各 `1 CLEAR + 2 BORDERLINE` |
| | `S1B-W-G6-11..12` / `S1B-G6-11..12` | `悬疑` | 各 `0 BLOCKER + 2 MAJOR` | 各 `1 CLEAR + 2 BORDERLINE` |
| **Batch 08** (`4` 章) | `S1B-W-G6-13..14` / `S1B-G6-13..14` | `历史` | 各 `1 BLOCKER + 1 MAJOR` | 各 `1 CLEAR + 2 BORDERLINE` |
| | `S1B-W-G6-15..16` / `S1B-G6-15..16` | `历史` | 各 `0 BLOCKER + 2 MAJOR` | 各 `1 CLEAR + 2 BORDERLINE` |
| **G6 合计** | **`16` 独立作品 / `16` 章** | **4 题材 × 4 章** | **`10B + 22M = 32` 正例** | **`24C + 24B = 48` 非阻断** |

#### C. `G3` / `G4` / `G5` 与 `RESERVE_FIFO`（`14` 核心章 + `4` 备用章，单门禁分 5 批）

| 批次 | 门禁 | `sourceWorkId` / `sourceChapterId` | 规范题材 | 精确案例配额要求 |
|---|---|---|---|---|
| **Batch 09** (`4` 章) | **G3** | `S1B-W-G3-01..02` / `S1B-G3-01..02` | `仙侠` | 每章标注 `2` 个高质量完全清白段落（全章无阻断缺陷，含文学性修辞/留白防误杀） |
| | **G3** | `S1B-W-G3-03..04` / `S1B-G3-03..04` | `都市` | 同上 |
| **Batch 10** (`3` 章) | **G3** | `S1B-W-G3-05..06` / `S1B-G3-05..06` | `悬疑` | 同上 |
| | **G3** | `S1B-W-G3-07` / `S1B-G3-07` | `历史` | 同上（G3 新补合计 `7` 章 / `14` 段） |
| **Batch 11** (`5` 章) | **G4** | `S1B-W-G4-01` / `S1B-G4-01` | `仙侠` | `2 BLOCKER + 1 MAJOR` |
| | **G4** | `S1B-W-G4-02` / `S1B-G4-02` | `都市` | `1 BLOCKER + 1 MAJOR + 1 MINOR` |
| | **G4** | `S1B-W-G4-03` / `S1B-G4-03` | `悬疑` | `1 BLOCKER + 1 MAJOR + 1 MINOR` |
| | **G4** | `S1B-W-G4-04` / `S1B-G4-04` | `历史` | `1 BLOCKER + 1 MAJOR + 1 SUGGESTION` |
| | **G4** | `S1B-W-G4-05` / `S1B-G4-05` | `科幻` | `1 BLOCKER + 1 MINOR + 1 SUGGESTION`（G4 新补合计 `6B+4M+3m+2S=15` 案） |
| **Batch 12** (`2` 章) | **G5** | `S1B-W-G5-02` / `S1B-G5-DL-02` | `都市` | 上游大纲/账本存在**客观不可调和硬死锁**（如时间线/财务总额/因果闭环上游自相矛盾，迫使审稿必须分流 `PLANNING_CONFLICT_BLOCK` 而非洗白通过） |
| | **G5** | `S1B-W-G5-03` / `S1B-G5-DL-03` | `仙侠` | 同上（不同死锁机制，如境界/道具唯一性上游自相矛盾） |
| **Batch 13** (`4` 章) | **RESERVE_FIFO** | `S1B-W-RSV-01` / `S1B-RSV-01` | `仙侠` | `G2-B` 模板：`1B + 3M` 正例 + `2C + 1B` 非阻断（FIFO 顺位 1） |
| | **RESERVE_FIFO** | `S1B-W-RSV-02` / `S1B-RSV-02` | `都市` | `G2-B` 模板：`1B + 3M` 正例 + `1C + 2B` 非阻断（FIFO 顺位 2） |
| | **RESERVE_FIFO** | `S1B-W-RSV-03` / `S1B-RSV-03` | `悬疑` | `G6` 模板：`1B + 1M` 正例 + `2C + 1B` 非阻断（FIFO 顺位 3） |
| | **RESERVE_FIFO** | `S1B-W-RSV-04` / `S1B-RSV-04` | `历史` | `G6` 模板：`1B + 1M` 正例 + `1C + 2B` 非阻断（FIFO 顺位 4） |

### 3.2 每章必需输入骨架与标准单文件批次交付 Schema

每批由 GPT-6 打包为一个规范 `.tar.gz` 或 `.zip` 压缩包（例如 `wp2-batch-01-g2b-xianxia-v1.tar.gz`），交由作者上传至 Project A，目录结构强制遵循：

```text
wp2-batch-XX-<gate>-v<N>/
├── batch-manifest.json                  # 批次元数据、逐文件 SHA-256、门禁/题材统计
└── chapters/
    └── <sourceChapterId>/
        ├── meta.json                    # 作品/章节身份、6 维独立性元数据、字数、硬约束
        ├── planning-slice.md            # 本章上游骨架：人物档案切片 + 本章细纲 + 故事账本数值/时间线 + 硬约束
        ├── manuscript.md                # 完整中文小说正文（建议 2,500–4,500 汉字，自然叙事语态，零工程元数据词）
        └── intended-cases.json          # 仅存 Vault 供 Neon 预检与备查，绝不传入 WP3 独立评委！
```

- **`meta.json` 必填字段**：`sourceWorkId`、`sourceChapterId`、`targetGate`、`canonicalGenre`（必须在 `CANONICAL_GENRES` 内）、`corpusOrigin: "gpt6_stage1b_gap_creation"`、`workIndependenceProfile`（6 维：作品名、主角名、世界观/时代背景、核心组织/地点、核心冲突骨架、故事梗概 100 字以内）、`manuscriptSha256`、`batchId`、`deliveryVersion`（`v1`, `v2`... append-only）。
- **`intended-cases.json` 必填字段（数组，每案例一条）**：`caseId`（如 `S1B-G2B-01-C01`）、`sourceChapterId`、`creatorIntendedLabel`（`BLOCKER` / `MAJOR` / `CLEAR` / `BORDERLINE` / `MINOR` / `SUGGESTION` / `G3_CLEAN_PARAGRAPH` / `G5_PLANNING_DEADLOCK`）、`derivedTruthClass`（`BLOCKER` / `MAJOR` / `NON_BLOCKING`）、`nonBlockingTier`（非阻断必填 `CLEAR` / `BORDERLINE`，阻断填 `null`）、`quote`（必须精确逐字匹配 `manuscript.md` 原文子串）、`paragraphIndex`、`objectiveRationale`（客观事实依据，如账本数字冲突/时间线矛盾/限知 POV 越界/合法修辞留白等）。
- **机械预检规则（Neon 执行）**：
  - **确定性硬失败 → 生成 `precheck-rejection-report.json` 退回 GPT-6 仅修补失败章**：字段缺失、非规范题材名、ID 冲突、精确哈希重复、逐章/逐类配额不符、`quote` 在 `manuscript.md` 中无法逐字定位、正文夹带治理词（`BLOCKER`/`MAJOR`/`SHA-256` 等）；
  - **近似重复预警 → `HOLD / MANUAL_REVIEW_REQUIRED`**：与历史暴露库或已入库 WP2 章节的字符 5-gram Jaccard $\ge 0.015$ 或最长公共规范子串 $\ge 25$ 字时挂起人工复核，**不自动拒收**；
  - **版本不可覆盖**：每次重交递增 `v2`/`v3`，保留历史版本与退回记录；章节进入 WP3 后任何正文改动均须触发完整重审。

---

## 四、WP1 退出门禁（等待双签放行 WP2）

1. **GPT-6 WP1 一次性有限独立复核**：复核脱敏清册（`P0-6-Stage1B-Global-Allocation-v1-Sanitized.json`）、唯一历史例外白名单、`unknown` Fail-Closed、缺口算术 $\Delta N_g$ 与动态预算一致性；
2. **作者批准本动态预算单**（确认按核心 `50` 章 + 备用 `4` 章 = `54` 章预算启动 WP2）；
3. 以上两项达成后，立即进入 **WP2**（先由 GPT-6 产出 Batch 01 验证端到端交接与机械预检）。
