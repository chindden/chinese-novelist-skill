# V3 执行流程（唯一流程入口）

此文档优先于旧版 phase1–4 的自动一口气写完、批次并行和固定三章套路条款。

## Stage 0：项目定位与能力发现
- 检查现有 `02-写作计划.json`、人物档案、章节摘要、未完成项目与 `05-共创草案.json`；有正式项目按其状态恢复，无正式文件而有草案则调用内部 status 恢复共创，不重复问已知决定。禁止在未核对路径时覆盖已有小说。
- 探测实际可用的文件读写、Node.js、独立子 Agent。**此阶段不启用 Google Drive**，不申请云端权限，不触发上传。
- 续写先查质量门禁状态，再查最近相关人物与事实账本，不要把“上一章摘要”当作全部世界事实。

## Stage 1：互动共创与故事提案
按 [互动共创协议](interactive-intake.md) 自然识别作者参与方式。先收集少数真正决定故事走向的选择；明确委托则自行推演。题材和机制只是材料，不能把“不同技术/行业/金手指”当作不同故事。
先实际读取 [题材调性](../webnovel/01-genre-and-tone.md) 的对应题材与调性、[人物关系](../webnovel/05-characters-relationships.md) 的相关方法，以及上游 [卖点定位](../webnovel/upstream/skills/webnovel-init/references/creativity/selling-points.md) §1、§7、[人物设计](../webnovel/upstream/skills/webnovel-init/references/worldbuilding/character-design.md) §1；按需要读取 [开篇钩子](../webnovel/upstream/skills/webnovel-init/references/creativity/creativity-constraints.md) §5、[追读力](../webnovel/upstream/references/reading-power-taxonomy.md) 和 [桥段套路](../webnovel/02-trope-patterns.md)。获取 topic 路径不等于阅读。知识检索先按叙事问题，技术与世界规则在故事需要时补充；不把缺少条目当作创作阻断。
按 [创意实验室](creative-lab.md) 构思、比较和修订故事。先呈现人物处境、行动、关系和有吸引力的变化，再解释必要差异；内部保留校验与来源，不向作者倾倒评审表。若提案只有职业、规则或升级路线，先重构故事而非润色表述。共创草案仅记录真实已知、授权和必要候选；不为字段齐全提前固化。创意方向经作者明确认可后进入 Stage 2。新项目在确认独立目录后记录草案；旧项目按状态恢复，不重走初始化。R3/P1 工程文档按实际阶段读取，保持既有门禁。

## Stage 2：精品故事架构
按 [互动蓝图与卷纲](interactive-planning.md) 自然讨论关键取舍，将专题知识融入既有四份规划文件；R3 核心/卷级冻结使用 [R3 运行手册](r3-operational-runbook.md)，不执行旧整文件审批命令。
**旧 V3/R2 使用 [原生蓝图审核协议](plan-review-protocol.md)，已显式启用 R3 的项目使用 [R3 运行手册](r3-operational-runbook.md) 中核心与卷级分离审批；不能混用或靠外部提示词补充核心流程。** 读取 [story-architecture.md](story-architecture.md)，按需查 [人物关系](../webnovel/05-characters-relationships.md)、[机制成长](../webnovel/03-golden-finger-setting.md)、[爽点与节奏](../webnovel/04-payoff-and-pacing.md)。先讲完整的、可读的故事梗概：具体人物如何行动、事件如何改变命运、读者为何关心，再核验因果、结局与规则，规划故事弧的局部兑现。不按章数硬塞高潮；不能以通过结构审计替代文学判断。
- 先诊断原始创意中的读者承诺、能力边界、人物命运和反派主动性；有结构性问题才进行修复路线对比，不强制重做作者指定的故事。**先写可完整剧透的故事梗概及明确结局，再进入分卷与章节规划。**
- 先定核心承诺、终局方向、人物命运和关键关系，再定全书/卷/故事弧/章节层级；在 `01-大纲.md` 明确**故事弧节奏蓝图**：读者期待、铺垫与阻力、阶段性兑现、重大转折、高潮后的代价/余波、下一轮期待，以及相邻弧的情绪与冲突方式差异。近三章详细，后续按卷逐渐具体化；不预先把每三章小高潮、每十章大高潮设为硬配额。
- 冻结前对主线资源/金额、生产能力、期限、修炼进展、金手指输出、人物知情、世界律法与反派应对做**跨文件可追溯审计**；阅读体验部分评估长篇密度、主角主动性、阶段性兑现和连续负反馈。任何已证实的硬性矛盾不得以自评分抵消。
- 建立 `00-人物档案.md`、`01-大纲.md`、`03-文风基准.md` 与事实词典，利用原版 `phase2-planning.md` 的模板和 `init_chapter_summaries.mjs` 初始化摘要。
- 先创建 `02-写作计划.json`，再由宿主运行 `init_v3_state.mjs` 初始化；R3 仅在作者明确选择实验模式时附 `--enable-r3`，不要求作者输入命令。创意选择经真实作者确认后才记录 `creativeDecision=accepted`。旧 V3/R2 用 `plan_review.mjs prepare/approve`，R3 用 `r3_plan.mjs core-prepare/core-submit/core-approve` 及 `volume-prepare/volume-approve`；核心分别由**两个真实独立执行上下文**进行架构与目标读者评审，再由作者真实批准。不得手工设置批准标志或借用旧批准链。
- 选定标题和规划需用户确认；如果大纲无法说清主角命运、具体因果、资源规则、主要冲突变化与阶段兑现，先改大纲，不用正文掩盖架构不足。存在 BLOCKER/MAJOR 未解决问题必须返工、重新冻结与复审；新修订不得沿用旧版批准。文学质量仍由编辑判断，版本门禁不代表自动证明精品。

## Stage 3：前三章试写
- 场景、文风及首次命名问题，按需读 [场景写法](../webnovel/06-scene-craft.md)、[写作技法](../webnovel/07-writing-techniques.md)、[命名规则](../webnovel/08-naming-rules.md)；**只取当前章节相关条目**，不要求逐项逐章执行全部套路。
- 强制串行完成 1→2→3 章。写前按原版 `chapter-checklist.md` 读取大纲、最近章节、人物状态和文风，并执行[逐章账本交接](operational-runbook.md#逐章账本交接)。按本章提纲提取有效事实基线、上章变化、相关历史锚点，只把需要的上下文交给写手，不在正文生成时逐段查表。
- 选用题材对应的开篇动力，不要求所有作品开篇有死亡威胁或金手指。
- 每章初稿与写手自查后先进行字数检查，保留章节 in_progress，并按 R2 操作手册冻结正文 SHA-256 送交独立上下文编辑。明确缺陷由写手局部修复，正文修改后重做独立审核；只有通过后才能置 completed、更新摘要和事实账本，写后交接通过才能写下一章。禁止为达字数注水。
- 第 3 章完成后先运行 `node scripts/validate_project.mjs <项目目录> --upto 3 --json`，通过后用 `node scripts/prepare_pilot_review.mjs <项目目录> --json` 固化前三章 SHA-256、递增审核修订号并进入 `under_review`；此时停止所有第 4 章及以后正文创作。

## Stage 4：独立红队停审
读取 [editorial-gate.md](editorial-gate.md)。
- 派出独立上下文编辑 Agent；只提供作品、设定与核查规则，不提供作者自评分、创作解释或“应给好评”指示。
- 输出缺陷 ID、定位、证据、严重性、影响和可操作修订；技术与事实性质疑要区分已核实与待查。
- 出现阻断缺陷则标 `revise`，返工后重审。不得仅把状态改为 passed 规避问题。
- 实际独立编辑按 [操作手册](operational-runbook.md) 生成结构化审稿 JSON，用 `submit_pilot_review.mjs` 验证并入档。通过候选进入 `awaiting_approval`；用户明确确认后保存真实聊天证据，再由 `record_pilot_approval.mjs` 记录批准，进入 `passed`。不得自行模拟用户发言。

## Stage 5：分卷续写
下一卷规划按 [互动蓝图与卷纲](interactive-planning.md) 基于真实账本和前卷后果，按需讨论取舍、节拍与时间线，沿用 R3 卷级批准。
- 故事弧与三章整体审稿时，可对照 [爽点与节奏](../webnovel/04-payoff-and-pacing.md) 的承诺兑现和重复风险检查；出现人物工具化可查 [人设与关系](../webnovel/05-characters-relationships.md)。参考库不是机器可证明的文学门禁，不得以“不符合某套路”阻断作者指定风格。
- **每次创建章节正文前运行** `node scripts/v3_gate.mjs <项目目录> --chapter N --json`。失败立即停止。
- 每章执行写前交接→正文初稿与自查→独立单章审核→必要时写手定向修复与独立复核→定稿更新账本→交接校验；没有真实独立上下文则停止，不得用作者自审冒充。
- 写作 Agent 不得自行批准稿件，审核 Agent 只读并提供有据可查的问题，不直接改写正文。不允许多名写手并行修改相邻章节或同一状态文件；资料核验可并行。
- 第 6、9、12……章通过单章审核和定稿后，必须独立连读最近三章并通过整体文学审核，**同时回看大纲中的承诺与兑现节点**：是否连续只增加谜题而不解决、冲突是否换皮、人物选择是否实际改变局势、是否给高潮余波与情绪喘息留空间；审稿窗口是检查频率，不是高潮频率。第 3 章沿用既有 Pilot 审核与作者确认，不额外重复三章审核。每章填充 `story-ledger.json`：真实发生的事实、伏笔、关系变化、故事机制。每五章执行 `node scripts/audit_story_state.mjs <项目目录> --upto N --write --json`，再由独立编辑完成语义层面的重复审查、人物选择及卷目标审查。
- 对远期卷纲的改动必须记录原因、影响范围和上一版快照；不得静默改写已成立的正文事实。

## Stage 6：本地校验与作品验收
- 本阶段**仅做本地**工程校验与可选 ZIP 快照的恢复测试。不连接 Google Drive，不上传数据，也不将云端备份写为本轮必验项。
- 完整 ZIP 本地快照工具：`scripts/create_snapshot.py`、`verify_snapshot.py`、`restore_snapshot.py`；用户明确需要本地快照时才执行。
- 质量验收包括至少三章对照盲评和十章续写检查；只有作品质量实际提升才能判断方法有效。
- [Gemini Tasks 实跑手册](operational-runbook.md) 列出启动、停审、提交和人工审批的实际步骤。

## 编辑反馈分级
- **BLOCKER**：事实矛盾、规则崩坏、关键动机断裂、非铺垫的机械降神；需修正并复审。
- **MAJOR**：动机薄弱、故事引擎重复、人物工具化、强烈文风漂移；修正或由用户知情接受并记录。
- **MINOR**：局部措辞、节奏细节；可随下一轮润色。


知识路由补充：使用 [统一网文知识库索引](../webnovel/README.md) 的 route/search/entry 确定当前题材、流派、专题及条目；旧 Markdown 是轻量参考而非全量边界。检索只为创作提供可选建议，不能改写作者选择、已批准状态或审稿门禁。
