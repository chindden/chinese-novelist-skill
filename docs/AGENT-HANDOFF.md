# Agent Handoff Protocol

> **文档职责**：本文定义跨 Agent 接管原则、三方角色职责、权限边界与全局协作规则，**不承担动态项目进度管理**。  
> **维护原则**：仅当接管原则、角色职责、权限边界或全局协作规则发生实质变化时才更新本文；不得在本文中固化当前分支名、当前 Commit SHA、当前任务状态或普通研发进度。

### 唯一入口与按职责划分的权威边界

任何新 Agent 接管本项目，必须首先读取以下**唯一双入口**，不得依赖历史聊天记录、个人记忆或单次会话上下文：

1. **[`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)**（本文）
2. **[`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)**

各类文档按**各自职责范围**行使权威，而非单一线性高低关系：

- **[`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md)**：跨 Agent 协作规则、角色职责、权限边界与隔离约束的权威规范。
- **[`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)**：全局项目背景、创作理念、长期原则、协作架构与权威信息入口。
- **冻结架构文档**（如 [`docs/r3/review-v3/`](./r3/review-v3/README.md)）与**各专项 PRD**（如 [`docs/r3/p0-implementation/P0-Implementation-PRD.md`](./r3/p0-implementation/P0-Implementation-PRD.md)）：各自所属技术范围内的权威技术规范、实施范围与验收标准。
- **各专项 Progress Log**：专项实施过程、返工台账与历史证据记录。

> **冲突处置红线**：局部 PRD 与 Progress Log **不得**覆盖全局 Agent 协作协议、权限分配、审批制度与信息权威性；全局入口文档亦**不覆盖**各冻结架构或专项 PRD 在其技术范围内的具体规定。如发现规范冲突，**必须立即停止相关操作并向作者报告**，不得自行选择性执行。

### 动态状态外置（GitHub 三组件权威分工）

项目动态状态与研发留痕正式外置至 GitHub，不再在全局入口文档中重复维护动态进度：

- **GitHub Issues（任务记录权威）**：[`chindden/chinese-novelist-skill/issues`](https://github.com/chindden/chinese-novelist-skill/issues) —— 每项独立任务对应一个 Issue，权威记录任务目标与范围、前置依赖与验收条件、沟通上下文、进展与重要决策、阻塞原因、优先级说明、研发实施报告、审核意见、整改记录与最终验收结论。
- **GitHub Projects（全生命周期唯一统一工程看板）**：[`Chinese Novelist Skill R3` (Project #4)](https://github.com/users/chindden/projects/4)
  - **全生命周期唯一性**：**Project #4 是整个 Chinese Novelist Skill 全生命周期唯一、长期沿用的统一工程看板**，覆盖原始 Skill、R2、R3 以及未来所有 P1、P2、R4 和后续阶段；不因版本、阶段或任务类型变化而另建 Project；当前显示名称含有“R3”不代表看板范围仅限 R3。
  - **当前实际能力与同步纪律**：Project #4 负责统一任务展示与 `Status` 状态推进（当前配置五态：`Backlog` / `Todo` / `In Progress` / `In review` / `Done`）；具体优先级说明与阻塞原因记录在对应 Issue 中。状态同步以 Issue 记录为依据，**发现 Issue 与 Project 状态不一致时，必须核对修复或向作者报告，严禁自行猜测**。
- **PR / Commit（变更与审查证据）**：[`chindden/chinese-novelist-skill/pulls`](https://github.com/chindden/chinese-novelist-skill/pulls) —— Commit 记录实际修改内容与历史，PR 汇总变更范围、Diff、测试结果与审查过程，Issue 关联对应 PR、Commit 与审核结论。**不能仅凭口头报告认定任务完成，也不能将代码合并、测试通过或 Issue 行政关闭等同于审核 Agent 正式 `ACCEPTED`。**

---

## 一、通用接管原则

新 Agent 在**不依赖历史聊天记录**的前提下，按以下通用原则完成接管核查：

1. **先读取两个全局入口**：通读 [`docs/AGENT-HANDOFF.md`](./AGENT-HANDOFF.md) 与 [`docs/PROJECT-CONTEXT.md`](./PROJECT-CONTEXT.md)，掌握项目长期目标、创作原则、协作架构与权限边界。
2. **用 Project #4 了解整体任务状态**：查看 [Project #4](https://github.com/users/chindden/projects/4) 掌握全部任务的集中展示与当前 `Status` 分布，识别当前真正活跃的任务，严禁依据静态历史文档猜测。
3. **进入相关 Issue 恢复任务上下文**：阅读对应 [GitHub Issues](https://github.com/chindden/chinese-novelist-skill/issues) 的正文与评论，恢复任务沟通、前置依赖、执行反馈、阻塞原因与审核记录，并核对 Issue 与 Project #4 状态是否一致。
4. **按需追溯 PR / Commit 与专项文档**：需要核实实际变更、Diff、测试证据或技术细则时，再追溯关联 PR / Commit、本地实时 Git 工作区状态（保护既有未提交修改），以及对应专项 PRD、冻结架构或资产规范（[`docs/RESEARCH-ASSET-POLICY.md`](./RESEARCH-ASSET-POLICY.md)、[`docs/PROJECT-ASSET-INDEX.md`](./PROJECT-ASSET-INDEX.md)）。
5. **严守角色分工与授权边界**：核验前置依赖与作者授权是否满足，完成本文第四节接管判定后再决定是否推进；遇规范冲突、状态不一致或任何不确定事项，立即停止并向作者确认。

---

## 二、角色与权限

### 1. 三方职责与权限边界
- **Neon（研发 Agent）**：负责工程研发、测试编排、子代理调度、实验观察、GitHub Issue 维护（进展记录、状态同步与证据关联）、PR / Commit 提交及整改交付；**最高只能提交 `READY_FOR_REVIEW`**，绝不得自行宣布 `ACCEPTED`。
- **GPT-6（审核 Agent）**：负责独立审查代码、文档、Diff、测试与实验证据，在 Issue / PR 中提出整改意见（`CHANGES_REQUESTED`），并独立出具正式 **`ACCEPTED`** 验收结论。
- **作者**：负责产品方向、核心原则、重大架构与范围决策、关键阶段授权及最终控制权。

> *角色承接说明：上述职责绑定于三方治理角色；若具体执行/审核 Agent 发生切换，继任者无条件继承对应角色的权限与约束。*

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
- 任何阶段或任务均不得因前序任务获 `ACCEPTED` 而自动启动，须遵守既有前置依赖与作者授权制度。

---

## 三、长期工作原则

1. **唯一入口、不依赖旧会话记忆**：只依靠双入口文档与 GitHub 实时协作信息恢复上下文，不假设具备历史聊天记录或临时 VM 私有凭证。
2. **动态状态外置、证据可追溯**：任务记录以 GitHub Issues 为权威，全局看板长期统一使用 Project #4，所有实际变更以 PR / Commit 留痕并与 Issue 互相印证。
3. **按职责守界、遇冲突即停**：局部文档不得覆盖全局协作协议，全局文档不覆盖具体技术规范；发现规范冲突或 Issue / Project 状态不一致时，立即停止相关写入并向作者报告。
4. **严守授权与修改边界**：不越权扩大任务范围、不擅自修改已冻结架构、不提前启动未获授权的任何阶段或任务。
5. **严明证据层级**：不将架构设计、代码实现、测试通过、沙箱运行与文学质量验证混为一谈；不以口头汇报替代 Git 与实测证据。
6. **按需保全、保护既有成果**：优先保障当前任务直接依赖的必需证据，无关历史缺失不自动阻塞主流程；严禁覆盖未提交工作、历史决策记录或已冻结成果。

---

## 四、接管判定（动态核查，不预填答案）

新 Agent 完成接管核查后，应基于实时 GitHub Issues、Project #4、相关 PR/Commit 与本地工作区状态，简洁输出接管判定后再决定是否执行：

- **接管判定**：`GO` 或 `NO-GO`
  - 若缺少作者对目标任务的明确授权、前置依赖未获审核 Agent 正式 `ACCEPTED`、Issue 与 Project #4 状态存在未厘清冲突、存在规范冲突、或实验任务无法满足 Writer / Reviewer 异代理隔离要求，**必须判为 `NO-GO`**。
- **判定依据**：当前活跃任务与对应 Issue / Project #4 实时状态、相关 PR / Commit 与工作区核验情况、前置依赖与授权核验结果。
- **下一步动作**：若为 `GO`，明确当前唯一允许执行的动作与修改边界；若为 `NO-GO`，明确列出具体阻塞点以及需要作者或审核 Agent 确认的事项。
