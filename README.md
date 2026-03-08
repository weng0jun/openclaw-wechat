# 📱 openclaw-wechat

> OpenClaw 的微信自动化 Skills 集合

[![Node.js](https://img.shields.io/badge/Node.js->=14-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![macOS](https://img.shields.io/badge/macOS-10.14+-blue?style=flat-square&logo=apple)](https://www.apple.com/macos/)
[![WeChat](https://img.shields.io/badge/WeChat-Mac-green?style=flat-square&logo=wechat&logoColor=white)](https://mac.weixin.qq.com/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

---

## 📖 项目简介

`openclaw-wechat` 是为 OpenClaw 设计的微信自动化工具集，基于 macOS 原生技术实现，完全本地运行，无需消耗 LLM Token。

**当前包含的 Skills：**

### 📹 Homework Submitter（视频作业提交工具）
通过微信自动向指定群聊或联系人提交视频作业。

**核心功能：**
- ✅ 批量提交：一次配置，发送到多个群/个人
- ✅ 去重保护：自动检测已提交，避免重复发送
- ✅ 失败重试：网络问题自动重试
- ✅ 文字说明：支持为视频添加描述
- ✅ 详细日志：完整记录提交信息

---

## 🚀 快速开始

### 前置要求

- macOS 系统（10.14+）
- 微信 Mac 客户端
- Node.js (>= 14)
- `peekaboo` 命令行工具

**重要**：需要授予终端辅助功能权限：
```
系统偏好设置 → 安全性与隐私 → 隐私 → 辅助功能 → 添加 Terminal/iTerm
```

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/mr-kelly/openclaw-wechat.git
cd openclaw-wechat
```

2. 安装 peekaboo（如果尚未安装）
```bash
brew install peekaboo
```

---

## 📹 视频作业提交工具

### 配置文件

```bash
cp homework-config.example.json homework-config.json
# 编辑 homework-config.json
```

示例配置：
```json
{
  "targets": [
    {
      "id": "homework_group",
      "name": "作业提交群",
      "searchKeyword": "作业提交",
      "type": "group",
      "enabled": true
    }
  ],
  "submissions": [
    {
      "videoPath": "/Users/你的用户名/Videos/homework.mp4",
      "caption": "第3周作业 - 姓名",
      "targetIds": ["homework_group"]
    }
  ],
  "options": {
    "preventDuplicate": true,
    "retryOnFailure": 3,
    "uploadTimeout": 300000
  }
}
```

### 运行

```bash
# 试运行（不实际发送）
node homework-submitter.js --dry-run

# 正式提交
node homework-submitter.js

# 使用指定配置文件
node homework-submitter.js --config=my-config.json
```

### 详细文档

查看 [HOMEWORK_SUBMITTER.md](HOMEWORK_SUBMITTER.md) 了解完整功能说明。

---

## 🛠️ 技术实现

### 核心技术栈

- **Node.js**: 内置模块（fs, path, child_process）
- **macOS Vision Framework**: OCR 文字识别（零 Token 消耗）
- **AppleScript**: 窗口控制、键盘输入
- **peekaboo CLI**: 鼠标点击和移动

### 关键技术亮点

**1. 零 Token 消耗**
- 完全本地运行，不调用任何 LLM API
- 使用 macOS 原生 Vision Framework 进行 OCR

**2. 输入法兼容**
- 使用剪贴板方式输入文字
- 不受中文/英文输入法状态影响

**3. 可靠的文件发送**
- Finder 原生复制 + 微信粘贴
- 经过实际测试验证的方案

**4. 系统语言兼容**
- 支持中英文系统
- 自动适配微信界面语言

---

## 📊 状态文件

所有状态文件存储在 `~/.openclaw/workspace/`：

- `homework_submit_log.json`: 提交历史记录
- `homework_submit.txt`: 详细执行日志

---

## ⚠️ 常见问题

### 搜索无法找到目标

**英文系统问题**：
- macOS 英文界面时，"文件传输助手" 显示为 "File Transfer"
- 需要在配置中使用微信实际显示的名称

**解决方法**：
- 在微信中手动搜索一次，确认显示名称
- 在 `searchKeyword` 中使用准确的名称

### 视频上传失败

- 增大 `uploadTimeout` 值（如 600000 = 10分钟）
- 检查网络连接
- 压缩视频文件大小

### 权限问题

```bash
# 打开系统设置辅助功能页面
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
```

更多问题请查看 [HOMEWORK_SUBMITTER.md](HOMEWORK_SUBMITTER.md)

---

## 🗂️ 项目结构

```
openclaw-wechat/
├── homework-submitter.js          # 视频作业提交工具
├── homework-config.json           # 配置文件（用户创建）
├── homework-config.example.json   # 配置示例
├── HOMEWORK_SUBMITTER.md          # 详细文档
├── CLAUDE.md                      # Claude Code 项目说明
└── README.md                      # 本文件
```

---

## 🚧 未来计划

计划添加更多微信自动化 Skills：

- [ ] 消息批量转发工具
- [ ] 聊天记录导出工具
- [ ] 群成员管理工具
- [ ] 自动回复机器人

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

如果你有好的微信自动化 Skill 想法，欢迎贡献代码。

---

## 📄 License

MIT License

---

## 🙏 致谢

本项目基于 macOS 原生自动化技术实现，灵感来源于实际使用场景。

---

*Built with ❤️ for [OpenClaw](https://claude.com/claude-code)*
