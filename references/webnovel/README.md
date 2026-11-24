# 中文网文创作知识库 · 统一路由总索引

这是一套服务 **Chinese Novelist R3** 的策划与写作参考资料。所有内容作为可选择的创作方法，不是爆款预测、流量数据或固定高潮配额。**作者已确认的题材、风格、人物和故事走向始终优先。**


## 上游完整知识层（GPL-3.0）

固定版本原件位于 `upstream/`，115 份参考/模板，另有上游许可证与两份纯检索模块；八套 CSV 722 条、裁决 17 条、56 个题材标签、15 个 canonical、37 套题材模板。逐文件 SHA 与逐条 ID 见 [导入清单](UPSTREAM-MANIFEST.json)，覆盖差异见 [覆盖矩阵](coverage-matrix.md)。

从 Skill 根目录执行只读命令（Python 3 标准库，无网络、无状态写入）：

```bash
python3 scripts/webnovel_knowledge.py catalog
python3 scripts/webnovel_knowledge.py route --genre "仙侠+种田+系统流"
python3 scripts/webnovel_knowledge.py search --genre "规则怪谈" --skill write --table "场景写法" --query "规则揭示 线索" --limit 5
python3 scripts/webnovel_knowledge.py search --genre "宫斗" --genre "年代" --skill init --query "角色命名" --limit 6
python3 scripts/webnovel_knowledge.py entry TR-001
```

- route 返回题材、玩法/形式标签、模板路径、缺模板及未解析标签；玩法默认归属不是作者世界观。复合题材保留多轴，不固定比例。
- search 复用上游 BM25，分别按题材和阶段检索、交错取候选并按 ID 去重，总返回上限默认 5、最高 20。字面召回不是文学质量。空结果可改关键词、另查原件。默认仅摘要和源路径，完整原条目按 ID 读；裁决与调性只作咨询。显式 `--genre 全部` 可跨库检索。原件中“大模型指令”、配额不是 R3 硬规则。
- 无 Python 时可直接读 `upstream/references/taxonomy/genre-index.csv`，按 CSV ID 或关键词查必要行，不整库加载。

### 按需专题索引

| 当前需求 | 专题原件（只读相关段） |
|---|---|
| 题材定位与细分流派 | [题材档案](upstream/references/genre-profiles.md)、[题材套路](upstream/skills/webnovel-init/references/genre-tropes.md)、route 返回模板 |
| 创意组合与反套路 | [组合指南](upstream/skills/webnovel-init/references/creativity/creative-combination.md)、[卖点设计](upstream/skills/webnovel-init/references/creativity/selling-points.md)、[创意约束](upstream/skills/webnovel-init/references/creativity/creativity-constraints.md)、对应 anti-trope 专题 |
| 世界观与人物 | [角色设计](upstream/skills/webnovel-init/references/worldbuilding/character-design.md)、[势力体系](upstream/skills/webnovel-init/references/worldbuilding/faction-systems.md)、[力量体系](upstream/skills/webnovel-init/references/worldbuilding/power-systems.md)、[世界规则](upstream/skills/webnovel-init/references/worldbuilding/world-rules.md)、[金手指模板](upstream/templates/golden-finger-templates.md) |
| 规划与冲突 | [冲突设计](upstream/skills/webnovel-plan/references/outlining/conflict-design.md)、[情节框架](upstream/skills/webnovel-plan/references/outlining/plot-frameworks.md)、[章纲](upstream/skills/webnovel-plan/references/outlining/chapter-planning.md)、[卷级节奏](upstream/skills/webnovel-plan/references/outlining/genre-volume-pacing.md)、[多线交织](upstream/references/shared/strand-weave-pattern.md)、[追读力](upstream/references/reading-power-taxonomy.md) |
| 场景、文字、人物声线 | CSV 检索、[文风适配](upstream/skills/webnovel-write/references/style-adapter.md)、[文风变体](upstream/skills/webnovel-write/references/style-variants.md)、[命名与声线](upstream/references/shared/naming-and-voice-gaps.md)、[钩子兑现](upstream/skills/webnovel-write/references/writing/genre-hook-payoff-library.md) |
| 去 AI 味与修订 | [anti-ai](upstream/skills/webnovel-write/references/anti-ai-guide.md)、[润色指南](upstream/skills/webnovel-write/references/polish-guide.md)、[常见问题](upstream/skills/webnovel-review/references/common-mistakes.md)、[节奏控制](upstream/skills/webnovel-review/references/pacing-control.md) |

[R3 自主补充层](supplement/README.md) 存放实际检索暴露的缺口补充，独立 ID 与来源，不修改上游原件。检索同时查上游与补充层，返回 origin/source。其他原件按清单定位；上游 README、运行数据流、审查 schema、状态模板及固定比例/裁决不作为 R3 执行合同。旧自主 Markdown 作为轻量概览和补充方法继续可用。

## 专项专题路由（完整原件使用审计）

```bash
python3 scripts/webnovel_knowledge.py topic foreshadowing
python3 scripts/webnovel_knowledge.py topic character
python3 scripts/webnovel_knowledge.py topic prose
```

[12类专题索引](supplement/topics.json) 覆盖全部52份可选创作参考，topic 返回具体路径、适用阶段及使用边界。仅取当前需要的小节，不一次读取整组。包括此前缺少明确入口的伏笔与揭示、卷节拍、主角组、反派、女主、复合题材、市场定位和感官技法。其余原件按 [全资产路由审计](supplement/ASSET-ROUTING-AUDIT.json) 标记的用途访问，状态/schema/裁决等不替代 R3 运行合同。目录外的研究取舍见 [研究审计](supplement/research-audit.md)。

## R3 题材与流派补充

```bash
python3 scripts/webnovel_knowledge.py route --genre "仙侠+凡人流+苟道+长生+家族流"
python3 scripts/webnovel_knowledge.py route --genre "科幻+穿越流"
```

[自主补充目录](supplement/README.md) 新增11套缺失专项模板、12套细分流派机制。原分类的六个无独立模板上位大类使用下属专项，而非硬套一种文风。route 返回 `flowReferences`、`upstreamWithoutDedicatedTemplate` 与当前缺口；`hintOnly` 表示仅匹配机制或形式，题材归属须经作者确认。穿越、学院等玩法不覆盖明确世界轴。按需读取实际相关的专题，不把示例或类型惯例变成强制剧情。

## 原八套自主 Markdown · 目录与加载时机
| 编号 | 文件 | 何时读 | 首要问题 |
|---|---|---|---|
| 01 | [题材与调性](01-genre-and-tone.md) | 创意立项、风格定位 | 目标读者到底想得到什么体验？ |
| 02 | [桥段套路](02-trope-patterns.md) | 创意竞标、卷级方案 | 哪个主流派/桥段循环驱动剧情？ |
| 03 | [金手指与设定](03-golden-finger-setting.md) | 能力型设定、成长规划 | 成长的来源、限制与反制是什么？ |
| 04 | [爽点与节奏](04-payoff-and-pacing.md) | 全书故事弧、卷纲、整体审稿 | 什么时候兑现哪一种阅读承诺？ |
| 05 | [人设与关系](05-characters-relationships.md) | 人物卡、冲突设计、全书规划 | 每个人离开主角后仍会做什么？ |
| 06 | [场景写法](06-scene-craft.md) | 单章细纲、具体场景、修订 | 行动怎样改变筹码、关系与状态？ |
| 07 | [写作技法](07-writing-techniques.md) | 正文撰写、文风基准、润色 | 哪种语言手段最适合眼前人物和场景？ |
| 08 | [命名规则](08-naming-rules.md) | 新角色、宗门、地名、术法首次出现 | 名称是否可辨识且符合世界社会背景？ |

## 推荐路线（按需读取，不全库灌入上下文）
1. **创意竞标**：先问作者目标读者与题材，取 01＋02；若有特殊能力再取 03，评估两个以上故事引擎的不同因果，不只换金手指名称。
2. **完整梗概/大纲**：根据实际冲突需要，取 03＋05＋04。验证人物动机、对手反制、关键反转和结局是否已设计，不必每次读取 06–08。
3. **前三章写作**：只读取与当章动作相关的 06；表达或人物声线异常时读 07；有重名或新势力时读 08。
4. **独立审稿**：审稿者只从本章原文与已确认规划找证据；04/05 中的框架仅帮助提问，不能直接作为 PASS/FAIL 的规则。
5. **修订或换题材**：只取相关章节，保留用户原有选择，不借机重置已发生事实。

## 组合协议：先选择体验，再选择机制
- **世界题材**：例如东方仙侠，只规定故事发生的社会和力量规则。
- **主故事引擎/流派**：例如凡人流、苟道成长、组织经营，必须能持续产生主角欲望、行动与反制。
- **辅助机制**：例如模拟器、重生记忆、随身洞府；最多两项作为初始策划建议，不强制限制作者。
- **主阅读回报**：例如谨慎求生的安全感、积累后的突破、扮猪吃虎后的身份反差、关系从对立到信任。
- **调性**：例如冷峻智斗、热血成长、轻松日常，可随不同故事弧变化。

### 一张最小选择卡
- 作者已确定的题材/禁区：
- 面向的读者与**主要阅读承诺**：
- 题材 G 与调性 T：
- 主流派 P、辅助机制 M、主要回报 Q：
- 主角的个人命运为什么非该设定不可：
- 初期、中期、后期的三种不同冲突/回报：
- 选中条目的适用条件、明显冲突、可能重复的桥段：
- 参考的真实作品或平台资料（如有）及查证日期；否则标记「创作假设」：

## 来源、知识产权与证据边界
- 分类结构与检索式工作思路参考了 [lingfengQAQ/webnovel-writer](https://github.com/lingfengQAQ/webnovel-writer) 的公开项目；其 v6 含结构化网文参考资料，v8 则采用另一套创作工作台架构。
- 原八份 Markdown 为历史自主整理；GPL-3.0 集成版另完整保留上游原件及两份检索模块，见导入清单和根目录 NOTICE。相关通用概念（重生、凡人流、场景因果、人物弧线等）不属于任何项目独占。
- 任何题材偏好、节奏跨度或条目示例都是创作建议。没有明确、可复核的时间、口径与来源时不得声称“市场数据证明”“某平台官方推荐此比例”。
- 借鉴成熟流派不等于照搬作品情节、人物关系或独特结局；创意竞标必须在人物命运和具体因果上形成独立新故事。
- 保留现有 [V3 总流程](../v3/workflow.md)、独立审稿和哈希门禁。新增知识库**不会改变 R2 工程代码或自动批准规则**。