# V3 前三章试写、独立编辑与可执行质量门禁

此规范**优先于原版第三阶段“无需用户确认直到全部写完”**。完成第三章必须停止，不允许自动写第四章。

## 初始化并防止越闸

生成完整 `02-写作计划.json` 后执行：

```bash
node scripts/v3_gate.mjs init PROJECT
```

每次开始一章，先运行：

```bash
node scripts/v3_gate.mjs check PROJECT CHAPTER_NUMBER
```

非0退出码必须停止；不得以模型自行判断为由绕过脚本。前三章必须按章串行完成，保留正文、章节摘要与事实账本。第三章完成后：

```bash
node scripts/v3_gate.mjs fingerprint PROJECT
```

得到 `openingDigest`，它绑定前三章文件的真实内容。修改正文后旧审稿失效。

## 独立编辑 Agent

在运行环境真正支持子 Agent 时派生**独立上下文**审稿，输入只包含前三章原文、必要故事设定、规则和 fingerprint。不要转交作者的自评分或预设结论。独立编辑应指出具体问题，也可认定某方面有效，不能为了“毒舌”编造错误。

审查：核心创意是否在正文兑现、主角是否有能动选择和情感温度、开篇是否产生继续阅读的理由、因果及专业事实是否可信、是否强迫反派降智、结构性重复、对话声音是否区分。专业事实争议需要查证，不能仅靠主观直觉判定。

如果宿主不能派生独立 Agent，标明**仅完成自审、未完成独立审稿**，不能假冒独立审稿通过。

## 审稿报告：JSON 字段协议

将报告放入 `reviews/opening-review-RN.json`，示例：

```json
{
  "scope": "chapters-1-3",
  "reviewer": "independent-editor",
  "openingDigest": "由 fingerprint 命令得到的64位十六进制哈希",
  "decision": "revise",
  "summary": "第二章存在钥匙机制冲突",
  "issues": [
    {
      "id": "E01",
      "severity": "major",
      "chapter": 2,
      "excerpt": "章节中真实存在的证据短句",
      "reason": "具体的因果或规则问题",
      "reader_impact": "为什么损害阅读体验",
      "fix": "可执行的修正方案"
    }
  ]
}
```

`decision` 取 `pass` / `revise` / `rebuild`。缺陷级别 `blocking` / `major` / `minor`；存在前两种时不得 `pass`。每项缺陷必须包含正文证据、原因、读者影响和修改建议；禁止凭空给满分或笼统赞美。

执行：

```bash
node scripts/v3_gate.mjs record-review PROJECT reviews/opening-review-RN.json
node scripts/v3_gate.mjs status PROJECT
```

若 `needs_revision`，定向修改后**重新运行 fingerprint 和独立审稿**。若 `awaiting_user_approval`，展示前三章和审稿报告，请用户决定是否放行；只有在用户明确确认后，记录其**实际原话**：

```bash
node scripts/v3_gate.mjs approve PROJECT --user-quote "用户实际说过的批准原话"
node scripts/v3_gate.mjs check PROJECT 4
```

工具本身无法验证发言者身份；Agent 不得编造用户批准。未经同意必须停在第三章。这是质量闸门，不是字数通过就自动授予精品认证。