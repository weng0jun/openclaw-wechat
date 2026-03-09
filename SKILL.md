# WeChat Homework Submitter Skill

## Metadata

```yaml
name: wechat-homework-submitter
version: 1.0.0
author: wynn@wlab
category: automation
platform: macOS
tags: [wechat, automation, homework, video, macOS]
```

## Description

通过微信自动向指定群聊或联系人批量提交视频作业的自动化工具。基于 macOS 原生技术实现，完全本地运行，零 Token 消耗。

## Features

- ✅ 批量提交：一次配置，发送到多个群/个人
- ✅ 去重保护：自动检测已提交，避免重复发送
- ✅ 失败重试：网络问题自动重试
- ✅ 文字说明：支持为视频添加描述
- ✅ 详细日志：完整记录提交信息
- ✅ 零 Token：完全本地运行，无需 LLM API

## Prerequisites

### System Requirements
- macOS 10.14+
- WeChat Mac Client
- Node.js >= 14
- peekaboo CLI tool

### Permissions
需要授予终端辅助功能权限：
```
系统偏好设置 → 安全性与隐私 → 隐私 → 辅助功能 → 添加 Terminal/iTerm
```

### Installation
```bash
# 安装 peekaboo
brew install peekaboo

# 克隆项目
git clone https://github.com/weng0jun/openclaw-wechat.git
cd openclaw-wechat
```

## Usage

### Basic Usage

```bash
# 试运行（测试配置，不实际发送）
node homework-submitter.js --dry-run

# 正式提交（使用默认配置文件）
node homework-submitter.js

# 使用指定配置文件
node homework-submitter.js --config=my-config.json

# 试运行 + 指定配置
node homework-submitter.js --config=my-config.json --dry-run
```

### Configuration

创建配置文件 `homework-config.json`：

```json
{
  "targets": [
    {
      "id": "homework_group",
      "name": "AI 编程作业群",
      "searchKeyword": "AI 编程",
      "type": "group",
      "enabled": true
    }
  ],
  "submissions": [
    {
      "videoPath": "/Users/username/Videos/homework.mp4",
      "caption": "第3周作业 - 姓名\n实现功能：XXX",
      "targetIds": ["homework_group"]
    }
  ],
  "options": {
    "preventDuplicate": true,
    "retryOnFailure": 3,
    "uploadTimeout": 300000,
    "delayBetweenTargets": 5000
  }
}
```

### Configuration Schema

#### targets (array, required)
定义提交目标（群聊或个人）

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | 唯一标识符 |
| name | string | yes | 目标名称（用于匹配） |
| searchKeyword | string | yes | 搜索关键词 |
| type | string | yes | 类型：group/contact |
| enabled | boolean | yes | 是否启用 |

#### submissions (array, required)
定义提交任务

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| videoPath | string | yes | 视频文件绝对路径 |
| caption | string | no | 附加文字说明 |
| targetIds | array | yes | 目标 ID 列表 |

#### options (object, optional)
全局选项

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| preventDuplicate | boolean | true | 防止重复提交 |
| retryOnFailure | number | 3 | 失败重试次数 |
| uploadTimeout | number | 300000 | 上传超时(ms) |
| delayBetweenTargets | number | 5000 | 目标间延迟(ms) |

## Examples

### Example 1: 单个视频提交到一个群

```json
{
  "targets": [
    {
      "id": "ai_homework",
      "name": "AI 编程作业群",
      "searchKeyword": "AI 编程",
      "type": "group",
      "enabled": true
    }
  ],
  "submissions": [
    {
      "videoPath": "/Users/me/Videos/week3.mp4",
      "caption": "第3周作业 - 张三",
      "targetIds": ["ai_homework"]
    }
  ]
}
```

### Example 2: 一个视频提交到多个群和个人

```json
{
  "targets": [
    {
      "id": "group1",
      "name": "算法训练营",
      "searchKeyword": "算法",
      "type": "group",
      "enabled": true
    },
    {
      "id": "teacher",
      "name": "李老师",
      "searchKeyword": "李老师",
      "type": "contact",
      "enabled": true
    }
  ],
  "submissions": [
    {
      "videoPath": "/Users/me/Videos/final_project.mp4",
      "caption": "期末项目演示视频",
      "targetIds": ["group1", "teacher"]
    }
  ]
}
```

### Example 3: 批量提交多个视频

```json
{
  "targets": [
    {
      "id": "group1",
      "name": "前端作业群",
      "searchKeyword": "前端",
      "type": "group",
      "enabled": true
    },
    {
      "id": "group2",
      "name": "后端作业群",
      "searchKeyword": "后端",
      "type": "group",
      "enabled": true
    }
  ],
  "submissions": [
    {
      "videoPath": "/Users/me/Videos/frontend_hw.mp4",
      "caption": "前端作业 - Week 5",
      "targetIds": ["group1"]
    },
    {
      "videoPath": "/Users/me/Videos/backend_hw.mp4",
      "caption": "后端作业 - Week 5",
      "targetIds": ["group2"]
    }
  ]
}
```

## Workflow

```
1. 读取配置文件
   ↓
2. 加载提交历史（防重复）
   ↓
3. 聚焦微信窗口
   ↓
4. 对每个提交任务：
   ├─ 使用搜索功能找到目标（Cmd+F）
   ├─ 点击搜索结果打开聊天窗口
   ├─ 通过剪贴板粘贴视频文件
   ├─ 添加文字说明（如果有）
   ├─ 点击发送按钮
   ├─ OCR 监控上传进度
   ├─ 验证发送成功
   └─ 记录到提交日志
   ↓
5. 生成提交报告
```

## State Files

存储位置：`~/.openclaw/workspace/`

- `homework_submit_log.json`: 提交历史记录（JSON 格式）
- `homework_submit.txt`: 详细执行日志（文本格式）

### 历史记录格式

```json
[
  {
    "targetId": "homework_group",
    "targetName": "AI 编程作业群",
    "videoPath": "/path/to/video.mp4",
    "caption": "第3周作业",
    "status": "success",
    "timestamp": "2026-03-08T12:00:00.000Z",
    "retryCount": 0
  }
]
```

## Troubleshooting

### 搜索无法找到目标

**问题**：脚本无法找到指定的群聊或联系人

**原因**：
- 英文系统下，微信联系人显示名称可能是英文
- searchKeyword 与实际显示名称不匹配

**解决方案**：
1. 在微信中手动搜索一次，确认实际显示的名称
2. 使用实际显示的名称作为 `searchKeyword`
3. 例如："文件传输助手" 在英文系统显示为 "File Transfer"

### 视频上传超时

**问题**：大视频文件上传时超时

**解决方案**：
1. 增大 `uploadTimeout` 值（如 600000 = 10分钟）
2. 检查网络连接稳定性
3. 压缩视频文件大小
4. 使用有线网络代替 WiFi

### 权限被拒绝

**问题**：执行时提示权限错误

**解决方案**：
```bash
# 打开辅助功能设置
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"

# 添加 Terminal 或 iTerm 到允许列表
```

### OCR 识别错误

**问题**：无法正确识别界面文字

**解决方案**：
1. 确保微信窗口完全可见，不被其他窗口遮挡
2. 调整微信窗口大小（脚本会自动设置为 1200x900）
3. 设置系统语言为简体中文
4. 确保微信界面语言与系统语言一致

### 重复提交

**问题**：相同视频被多次提交

**解决方案**：
1. 确保配置中 `preventDuplicate: true`
2. 检查 `~/.openclaw/workspace/homework_submit_log.json` 是否正常记录
3. 如需重置历史，删除该文件

## Technical Details

### Core Technologies

- **Node.js**: 内置模块（fs, path, child_process）
- **macOS Vision Framework**: OCR 文字识别（零 Token 消耗）
- **AppleScript**: 窗口控制、键盘输入
- **Swift**: 内联执行 Vision Framework
- **screencapture**: 系统截图工具
- **peekaboo CLI**: 鼠标点击和移动

### Key Implementation

1. **搜索功能**：Cmd+F 快捷键 + 剪贴板输入（避免输入法问题）
2. **文件发送**：Finder 原生复制 + 微信粘贴（最可靠方案）
3. **发送验证**：OCR 监控 "上传中" 关键词消失
4. **窗口切换**：使用 `open -a WeChat`（最可靠的置顶方法）

### Performance

- 零 Token 消耗：完全本地运行
- OCR 速度：约 0.5-1 秒/截图
- 视频发送：取决于文件大小和网络速度
- 单个目标提交：约 10-20 秒

## Limitations

- ❌ 不支持一次发送多个视频
- ❌ 需要微信窗口可见（不能最小化）
- ❌ OCR 准确度依赖系统 Vision Framework
- ❌ 微信界面变化可能导致识别失败
- ⚠️ 执行过程中请勿操作微信窗口

## Best Practices

1. **首次使用必须 --dry-run 测试**
2. **使用绝对路径，避免 ~ 符号**
3. **合理设置重试次数（2-3次）**
4. **大文件设置更长的 uploadTimeout**
5. **批量提交时增大 delayBetweenTargets（建议 10000ms）**
6. **定期检查日志文件排查问题**
7. **英文系统务必确认微信显示的名称**

## Security & Privacy

- ✅ 完全本地运行，不发送数据到外部服务器
- ✅ 不存储微信账号密码
- ✅ 提交历史仅存储在本地
- ✅ 开源代码，可审计
- ⚠️ 需要辅助功能权限（用于窗口和键盘控制）

## Version History

### v1.0.0 (2026-03-08)
- ✅ 基础搜索功能
- ✅ 视频文件发送
- ✅ 附加文字说明
- ✅ 发送验证与重试
- ✅ 去重保护
- ✅ 详细日志记录

## Links

- Documentation: [HOMEWORK_SUBMITTER.md](HOMEWORK_SUBMITTER.md)
- Project README: [README.md](README.md)
- Claude Code Guide: [CLAUDE.md](CLAUDE.md)
- Configuration Example: [homework-config.example.json](homework-config.example.json)

## License

MIT License

## Support

如遇问题，请：
1. 查看 `~/.openclaw/workspace/homework_submit.txt` 日志
2. 参考 HOMEWORK_SUBMITTER.md 常见问题
3. 提交 GitHub Issue

---

*Built with ❤️ for OpenClaw*
