# Chinese Novelist · R3 开发预览

本独立仓库承接 Chinese Novelist V3 / R2 / R3 的持续研发。当前分支仍为实验开发版，不是正式发布版。

- [项目长期上下文档案（全仓库历史、决策、实验证据与跨会话恢复入口）](docs/PROJECT-CONTEXT.md)
- [安装、使用及测试](README_V3.md)
- [Skill 入口](SKILL.md)
- [R3 研发 PRD](docs/R3-PRD.md)
- [R3 运行手册](references/v3/r3-operational-runbook.md)
- [P1 创作反馈与持续学习协议](references/v3/r3-p1-protocol.md)
- [统一网文创作知识库](references/webnovel/README.md)

## 来源与历史

原始底座：[PenglongHuang/chinese-novelist-skill](https://github.com/PenglongHuang/chinese-novelist-skill) v2.3.2（MIT）。原 MIT 版权与许可全文保留于 [LICENSES/MIT-upstream.txt](LICENSES/MIT-upstream.txt)。本集成开发版采用 [GPL-3.0](LICENSE)，详见 [NOTICE](NOTICE.md)。本次迁移源：[chindden/skills R3 固定提交](https://github.com/chindden/skills/tree/7e084c5abb5d6d880abfa3c6be0e633b0914d4ad/chinese-novelist-v3)，[旧 V3/R1 独立分支](https://github.com/chindden/chinese-novelist-skill/tree/feat/v3-editorial-pipeline) 保留原 README、旧脚本及历史。旧集合仓库 PR 不合并。

## 验证边界

R3 opt-in，旧项目不静默启用。当前开发阶段为 P1 实验，P2、跨作品学习收益及多题材文学品质仍待验收。作者私有小说正文、账本、审批证据、项目 ZIP 与经验库不得进入公开 Skill 仓库。许可调整已作为独立提交实施；知识库扩容另行审计、引入与验收。


上游原件已导入：722 条创作知识 + 17 条裁决、37 套题材模板、完整专题参考及只读检索。详见 [知识库索引](references/webnovel/README.md) 与 [覆盖差异矩阵](references/webnovel/coverage-matrix.md)。不代表已证明文学收益或市场全覆盖。


使用方式保持自然语言单入口，例如“我想写一本仙侠长生流小说”“根据已有故事规划第一卷”“继续下一章”。互动共创、知识检索、规划与恢复由 Skill 自动路由，用户无需学习内部命令。R3 仍是显式实验模式，原作者审批与独审边界不变。见 [共创协议](references/v3/interactive-intake.md) 与 [互动规划](references/v3/interactive-planning.md)。
