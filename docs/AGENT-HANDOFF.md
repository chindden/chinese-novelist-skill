# Agent Handoff Protocol

> **文档职责**：本文定义跨 Agent 接管流程、三方角色职责、权限边界与全局协作规则，**不承担动态项目进度管理**。  
> **维护原则**：仅当接管流程、角色职责、权限边界或全局协作规则发生实质变化时才更新本文；不得在本文中固化当前分支名、当前 Commit SHA、当前任务状态或普通研发进度。

### 全局入口与规范优先级

任何新 Agent 接管本项目，必须首先读取以下**唯一双入口**，严禁依赖历史聊天记录、某个 Agent 的个人记忆或单次会话上下文：

1. **[`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)**（本文）：定义跨 Agent 接管流程、角色职责、权限边界和协作规则。
2. **[`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)**：定义全局项目背景、正式采用的协作架构、权威信息来源和恢复入口。

**文档规范优先级（从高到低）**：

1. **`docs/AGENT-HANDOFF.md`**（跨 Agent 协作协议、角色权限与审批红线的全局最高规范）
2. **`docs/PROJECT-CONTEXT.md`**（全局项目上下文、协作架构与权威入口规范）
3. **冻结架构文档**（如 [`docs/r3/review-v3/`](./r3/review-v3/README.md)）：约束其所属技术架构
4. **各专项 PRD**（如 [`docs/r3/p0-implementation/P0-Implementation-PRD.md`](./r3/p0-implementation/P0-Implementation-PRD.md)）：约束各自研发任务的技术范围、实施步骤与验收标准
5. **各专项 Progress Log**：保留专项研发细节与历史证据

> **全局规范优先铁律**：局部 PRD 与 Progress Log **不得**自行改变全局 Agent 协作协议、权限分配、审批制度与信息权威性。如发现规范冲突，**必须立即停止相关操作并向作者报告**，严禁自行选择性执行。

### 动态状态外置（GitHub 三组件权威分工）

项目动态状态与研发留痕正式外置至 GitHub，不再在全局入口文档中重复维护动态进度：

- **GitHub Issues（任务记录权威）**：[`chindden/chinese-novelist-skill/issues`](https://github.com/chindden/chinese-novelist-skill/issues) —— 每项独立研发/治理任务对应一个 Issue，权威记录任务目标与范围、前置依赖与验收条件、任务进展与重要决策、阻塞原因、研发 Agent 实施报告、审核 Agent 审查意见、整改记录与最终验收结论。
- **GitHub Projects（项目状态展示面板）**：[`Chinese Novelist Skill R3` (Project #4)](https://github.com/users/chindden/projects/4) —— 负责全部任务的集中展示、Status 状态管理、优先级排序与跨阶段进度总览，快速识别待办、进行中、待审核、已完成与阻塞任务。状态同步以 Issue 的任务记录为依据；**发现 Issue 与 Project 状态不一致时，必须核对并修复（或报告作者），严禁自行猜测**。
- **PR / Commit（变更与审查证据）**：[`chindden/chinese-novelist-skill/pulls`](https://github.com/chindden/chinese-novelist-skill/pulls) —— Commit 记录实际修改内容与变更历史；PR 汇总变更范围、Diff、测试结果与审查过程；Issue 关联对应 PR、Commit 与审核结论。**不能仅凭口头报告认定任务完成，也不能将代码合并、测试通过或 Issue 行政关闭自动等同于审核 Agent 正式 `ACCEPTED`。**

---

## 一、通用冷启动接管流程

新 Agent 在**完全不依赖旧聊天记录**的前提下，必须按以下顺序完成只读核查后再决定是否开展工作：

1. **定位权威仓库并核验本地与远端工作区**：确认当前工作目录指向公开主仓 `chindden/chinese-novelist-skill`，执行只读检查（`git status`、`git branch`、`git log -n 5`、`git ls-remote --heads origin`），保护全部既有未提交工作，不将静态文档快照或陈旧本地跟踪分支当作实时状态。
2. **读取唯一双入口文件**：按顺序通读 [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)（本文）与 [`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)，掌握项目整体目标、创作原则、重要历史决策、正式协作架构、角色权限与规范优先级。
3. **查询 GitHub Issues（任务记录权威）**：通过 GitHub Web 或 `gh issue list --repo chindden/chinese-novelist-skill --state all` 检索全部开放与已关闭 Issue，并对相关 Issue 读取正文与评论（`gh issue view <N> --comments`），核实各任务的前置依赖、验收条件、阻塞原因、最新实施报告、审核意见与正式 `ACCEPTED` / `CHANGES_REQUESTED` 结论。
4. **定位并读取 GitHub Project #4（统一状态展示面板）**：打开 [`Chinese Novelist Skill R3` (Project #4)](https://github.com/users/chindden/projects/4)（或通过 `gh project item-list 4 --owner chindden --format json` / GitHub GraphQL 查询各 Issue 对应的 `Status` 字段），核对全部任务的看板状态与排序，并与 Issue 权威记录交叉校验；若两边不一致，必须先核对修复或向作者报告，严禁猜测。
5. **沿 Issue 追溯 PR 与 Commit 证据**：检查相关 Issue 关联的 PR（`gh pr list --state all` / `gh pr view <PR>`）与具体 Commit SHA（`git show` / `git diff`），核验真实变更文件范围、测试输出与审查过程，确认实际工程证据与 Issue 结论一致。
6. **识别当前真正活跃的任务并按需读取专项文档**：仅以 GitHub Issues、Project #4 与最新 PR/Commit 的实时状态识别当前活跃任务（如处于 `In Progress`、`In review`、最新 `CHANGES_REQUESTED` 或本轮作者明确派发的 Open Issue），**严禁根据历史文档猜测活跃任务**；随后按需读取对应专项 PRD、Progress Log、冻结架构及 [`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md) / [`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)。
7. **核验继续执行的授权并输出 `GO` / `NO-GO` 结论**：逐项检查前置依赖是否已在对应 Issue 获审核 Agent 正式 `ACCEPTED`、当前任务是否已获作者明确授权（前序任务获 `ACCEPTED` **不自动构成**下游任务启动授权，除非存在明确的预先授权依据）、允许修改范围是否清晰且无规范冲突；随后按本文第四节输出 `GO` / `NO-GO` 接管结论。

---

## 二、角色与权限

### 1. 三方职责与权限边界
- **Neon（研发 Agent）**：负责工程研发、测试编排、子代理调度、实验观察、GitHub Issue 维护（进展记录、状态同步与证据关联）、PR / Commit 提交及整改交付；**最高只能将任务提交至 `READY_FOR_REVIEW`**，绝不得自行宣布 `ACCEPTED`。
- **GPT-6（审核 Agent）**：负责独立审查代码、文档、Diff、测试与实验证据，在 Issue / PR 中提出整改意见（`CHANGES_REQUESTED`），并独立出具正式 **`ACCEPTED`** 验收结论。
- **作者**：负责产品方向、核心原则、重大架构与范围决策、关键阶段授权及最终控制权。

> *角色承接说明：上述职责绑定于三方治理角色；若具体执行/审核模型或 Agent 实例发生切换，继任者无条件继承对应角色的权限与约束。*

### 2. 研发 Agent 角色隔离约束
为保证创作与审稿实验的独立性和客观性，研发 Agent 必须严格遵守以下边界：
- **不亲自充当测试小说写手**；
- **不亲自承担测试小说的文学修改**；
- **不亲自充当独立审稿人**；
- 真实创作测试必须由独立的 **Writer 子代理** 执行；
- 文学审稿必须由独立的 **Reviewer 子代理** 执行；
- **Writer 与 Reviewer 必须是不同的 Agent，不能由同一个 Agent 兼任**；
- 研发 Agent（当前 Neon）作为 **Observer**，不得为了使测试通过而临时补写正文、篡改审稿结论或绕过 Skill 既有流程，**不得通过临时增加提示、额外指导或人工补救来掩盖被测 Skill 本身的缺陷**；
- **若当前环境无法提供符合隔离要求的子代理，必须报告 `BLOCKED`，不得由研发 Agent 自行替代**；
- 若进行受干预对照实验，必须显式记录干预内容，并严格区分**零干预**与**受干预**结果；
- 工程单元测试、集成测试与代码实现仍由研发 Agent 执行。

### 3. 验收与决策分权
- 研发 Agent 最高只能提交 **`READY_FOR_REVIEW`**，绝不得自行标记 `ACCEPTED`；
- 审核 Agent 独立出具审查结论（`ACCEPTED` / `CHANGES_REQUESTED` / `BLOCKED`），所有结论留痕于对应 Issue 或 PR；
- 代码合并、测试通过或 Issue 行政关闭**均不等同于**审核 Agent 的正式 `ACCEPTED`；
- 作者对产品方向、重大变更与关键研发阶段启动保留最终审批权。

---

## 三、长期工作原则

1. **唯一入口、不依赖旧会话记忆**：新 Agent 只依靠双入口文档与 GitHub 实时协作记录恢复上下文，不得假设具备历史聊天记录、个人记忆或临时 VM 私有凭证。
2. **动态状态外置、证据可追溯**：任务进展留痕于 GitHub Issues，全局看板展示于 Project #4，所有实际变更必须以 Commit / PR 留痕并与 Issue 互相印证。
3. **全局规范优先、遇冲突即停**：局部 PRD 与 Progress Log 不得覆盖全局协作协议与权限分权；发现任何规范冲突或 Issue / Project 状态不一致时，立即停止相关写入并向作者报告。
4. **严守授权与修改边界**：不越权扩大任务范围、不擅自修改已冻结架构、不将前序验收通过视为下游自动授权、不提前启动未获授权的阶段。
5. **严明证据层级**：不将架构设计、代码实现、测试通过、沙箱运行与文学质量验证混为一谈；不将口头汇报替代 Git 与实测证据。
6. **按需保全、保护既有成果**：当前任务直接依赖的必需证据优先保障，无关历史文件缺失不自动阻塞主流程；严禁覆盖未提交工作、历史决策记录或已冻结成果。

---

## 四、接管验证与 `GO` / `NO-GO` 输出规范（动态检查，不预填答案）

新 Agent 应在**不依赖旧聊天记录**的条件下，仅依据双入口文件及 GitHub Issues、Project #4、PR / Commit 与实时 Git 状态，独立完成以下 6 项核查：

1. **项目目标与全局原则**：当前整体目标、核心创作原则及三大协作原则是什么？
2. **协作架构与权限边界**：当前扮演什么角色？最高权限与不可越过的红线是什么？
3. **实时活跃任务识别**：依据 GitHub Issues 与 Project #4，当前真正活跃的任务是什么？Issue 与 Project 状态是否一致？
4. **验收与未完成基线**：哪些关键工作已在对应 Issue 获正式 `ACCEPTED`（附证据链接）？哪些仍未完成或处于 `BLOCKED` / `underpowered`？
5. **规范冲突与风险检查**：双入口、专项 PRD、实时 Git 与 GitHub 状态之间是否存在规范冲突或真实阻塞风险？
6. **继续执行授权核验**：前置依赖是否均已获正式 `ACCEPTED`？是否具备作者对下一步工作的明确授权？

完成核查后，必须先输出以下结构化结论，再决定是否推进执行：

- **接管判定**：`GO` 或 `NO-GO`
  - 满足以下任一情形必须判为 **`NO-GO`**：缺少作者对目标任务的明确授权；前置依赖未获审核 Agent 正式 `ACCEPTED`；Issue 与 Project #4 状态存在未解释冲突；全局与局部规范存在冲突；实验任务无法满足 Writer / Reviewer 异代理隔离要求。
- **判定依据**：已核查的双入口文件版本、实时 GitHub Issues 与 Project #4 状态、关联 PR / Commit 与本地工作区状态、授权与前置依赖核验结果。
- **下一步动作**：若为 `GO`，写出当前唯一允许执行的动作与修改边界；若为 `NO-GO`，写明具体阻塞点以及需要作者或审核 Agent 拍板的明确事项。
