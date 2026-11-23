# V3 Google Drive 备份与灾难恢复协议

本地工作目录是运行时主数据源；Google Drive 存储**不可变 ZIP 快照**。宿主未连接 Drive 时，不能谎称远程同步成功。

## 创建并本地验证

项目状态、章节摘要、红队报告和原始正文必须同版本落盘；然后：

```bash
python3 scripts/v3_snapshot.py create PROJECT /tmp/novel-ch003-r001.zip
python3 scripts/v3_snapshot.py verify /tmp/novel-ch003-r001.zip
```

使用**宿主真实可用**的 Drive 工具，将 ZIP 作为二进制文件上传（不要把 Markdown 转为 Google Docs），记录 Drive 文件 ID、版本、大小与本地 SHA-256。下载回读同一文件，重新计算 SHA-256 比对；一致之后才能标记为 `verified` 并更新“最新有效版本”索引。失败只重试，不得覆盖此前已验证备份。当前连接未验证同 ID 原地更新，不依赖该功能。

备份建议：前三章审稿通过时、一章完稿时、每五章和每卷节点；保留多个历史版本。自动同步、长期存活、冷启动重建和百章级规模还需要宿主实测。

## 恢复

只从**最近一次经哈希验证的完整快照**下载，验证压缩包的远端 SHA-256，并调用：

```bash
python3 scripts/v3_snapshot.py verify /tmp/download.zip
python3 scripts/v3_snapshot.py restore /tmp/download.zip /absolute/empty/recovery
```

恢复目录必须为空；拒绝 ZIP 路径穿越、重复条目及文件哈希不一致。恢复后再运行原版项目状态和字数校验，检查前三章门禁及审稿报告；恢复成功不等于授权跳过质量门禁。

**注意：** 本 Skill 包含本地打包与验证脚本，但不含跨账号通用 Drive 上传 API 实现。未拿到宿主连接与权限前，不可声称已有无人值守自动上传。