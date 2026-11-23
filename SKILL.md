---
name: chinese-novelist
description: |
  当用户要求写小说、创作故事、分章节写作、连续剧情、长篇小说，或需要续写/校验未完成的小说项目时使用。支持悬疑/言情/奇幻/科幻/历史等全题材中文创作。
metadata:
  trigger: 创作中文小说、分章节故事、长篇小说创作
  source: 基于小说创作最佳实践设计
---

## V3 精品创作模式（优先于下方旧版规则）

**本分支启用 V3 默认工作流。** 如果下文“第三阶段无需再次确认、必须全部写完”与本节冲突，**以本节为准**：只允许先写前三章，第三章完成后强制停审，审稿及用户放行前绝不创作第四章。若环境不具备脚本/独立审稿能力，明确报告限制，不能假装测试或审核已通过。

1. **创意竞标**：先读 [V3 创意实验室](references/flows/v3-creative-lab.md)，默认提出三个真正不同的故事引擎，对抗式淘汰，最终由用户选择；已有完整创意可保留。
2. **长篇架构**：读 [四级规划与题材路由](references/flows/v3-story-architecture.md)。全书、分卷、故事弧、章节四级；反套路三锚点、人物生命力和可持续冲突。按题材定开篇，不强行套玄幻反杀公式。
3. **计划与门禁**：沿用旧版项目文件和状态机。创建 `02-写作计划.json` 后运行 `node scripts/v3_gate.mjs init PROJECT`。每章开写前先执行 `node scripts/v3_gate.mjs check PROJECT CHAPTER`；失败就必须停止。
4. **前三章试写与独立编辑**：仅串行写1–3章，读 [独立审稿门禁协议](references/flows/v3-opening-review.md)。第三章完成后运行 `fingerprint`，交真正独立上下文的编辑 Agent 审查，生成带原文证据的报告，运行 `record-review`。只有报告 `pass` 且用户明确同意，才执行 `approve` 解锁第四章。不可编造用户确认。
5. **连续写作与质量审计**：沿用原版 `chapter-checklist.md`；融合 [V3 工艺](references/guides/v3-craft-principles.md)；每五章根据 [长篇审计协议](references/flows/v3-longform-audit.md) 检查人物、事实、伏笔、情绪与剧情机制重复。
6. **持久化**：本地项目为运行时状态源，使用 [ZIP 快照与 Drive 备份协议](references/flows/v3-backup.md)；`python3 scripts/v3_snapshot.py` 负责本地创建/验证/恢复，真正的 Google Drive 上传必须使用宿主已连接的工具，下载回读校验哈希后才能标记远程有效，不得谎报同步。

**质量优先级**：硬事实与因果 > 人物自主性与真实情绪 > 阅读期待与语言自然度；固定爽点计数、同类钩子轮换、对话字数配额是可选技巧，不是跨题材硬门槛。字数和 JSON 校验通过不等于精品作品通过。用户的作品满意度与盲测反馈才是最终验收。


# Chinese Novelist: 中文小说创作助手

## 三大黄金法则

1. **展示而非讲述** - 用动作和对话表现，不要直接陈述
2. **冲突驱动剧情** - 每章必须有冲突或转折
3. **悬念承上启下** - 每章结尾必须留下钩子

## 特性说明

- **中断续写**：自动检测未完成项目，从断点继续创作
- **自动校验**：创作完成后自动检查字数和质量，不合格自动修复
- **并行写作**（可选）：支持子Agent并行写作，通过 `02-写作计划.json` 协调状态

## 核心流程

进入每个阶段时，先阅读对应的流程文档以获取详细执行指令。

### 第0步：初始化与偏好加载

读取用户偏好，检测未完成项目（中断续写），展示个性化欢迎。 → 详见 [phase0-initialization.md](references/flows/phase0-initialization.md)

### 第一阶段：三层递进式问答

通过递进式问答收集创作需求，确定小说定位与标题：

- **核心定位**（必答，Q1-Q3）：题材创意、主角设定、核心冲突 → 详见 [phase1-layer1-core.md](references/flows/phase1-layer1-core.md)
- **深度定制与规格**（2 次合并提问）：世界观、视角基调、核心主题、读者定位、章节数量、每章字数、配置确认 → 详见 [phase1-layer2-customize.md](references/flows/phase1-layer2-customize.md)
- **标题生成**：AI 基于创意元素生成候选标题，用户选择或自定义 → 详见 [phase1-layer3-title.md](references/flows/phase1-layer3-title.md)

### 第二阶段：规划 + 二次确认

创建项目文件夹（`./chinese-novelist/{timestamp}-{小说名称}/`），生成大纲、人物档案和写作计划JSON，等待用户确认。 → 详见 [phase2-planning.md](references/flows/phase2-planning.md)

### 第2.5步：写作模式选择

规划确认后，选择写作模式：
- **逐章串行**（`serial`）：主 Agent 自己逐章写，全程无中断
- **子Agent并行**（`subagent-parallel`）：将章节分成批次，派生子 Agent 并行写作
- **Agent Teams**（`agent-teams`）：Claude Code 多 Agent 协作模式，Agent 间可通讯（需手动开启）

→ 详见 [phase3-writing.md](references/flows/phase3-writing.md)

### 第三阶段：疯狂创作（无需用户确认）
> 切记，一旦进入这个阶段，所有过程都禁止向用户确认。用户就是你的读者，你必须把完整的小说创作完成才能与用户报告

根据用户选择的写作模式（串行/并行/Teams）逐章执行创作流程。每章创作前必须读取 `01-大纲.md` 中对应章节的规划信息，严格按大纲创作。支持中断续写。 → 详见 [phase3-writing.md](references/flows/phase3-writing.md)

### 第四阶段：自动校验与修复（无需用户确认）

主 Agent 调用脚本检查章节状态和字数，将问题派回原写作 worker 处理，最多3轮；未通过则标记 needs_attention。全程无需用户确认。 → 详见 [phase4-validation.md](references/flows/phase4-validation.md)
