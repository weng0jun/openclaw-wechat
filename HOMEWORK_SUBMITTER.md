# 📹 WeChat Homework Submitter

## 功能简介

通过微信自动向指定的群聊或联系人提交视频作业。支持批量提交、失败重试、去重保护。

## 快速开始

### 1. 准备工作

确保已安装依赖：
- macOS 系统
- 微信 Mac 客户端
- Node.js
- `peekaboo` 命令行工具（用于鼠标控制）

**重要**: 需要授予终端辅助功能权限：
```
系统偏好设置 → 安全性与隐私 → 隐私 → 辅助功能 → 添加 Terminal/iTerm
```

### 2. 配置文件

编辑 `homework-config.json`：

```json
{
  "targets": [
    {
      "id": "homework_group_1",
      "name": "AI 编程作业群",
      "searchKeyword": "AI 编程",
      "type": "group",
      "enabled": true
    }
  ],
  "submissions": [
    {
      "videoPath": "/Users/你的用户名/Videos/homework.mp4",
      "caption": "第3周作业 - 姓名\n实现了XXX功能",
      "targetIds": ["homework_group_1"]
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

### 3. 运行

```bash
# 试运行（不实际发送，测试流程）
node homework-submitter.js --config=homework-config.json --dry-run

# 正式提交
node homework-submitter.js --config=homework-config.json

# 使用默认配置文件
node homework-submitter.js
```

## 配置说明

### Target 配置

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | string | 唯一标识符 | "homework_group_1" |
| name | string | 目标名称（用于匹配） | "AI 编程作业群" |
| searchKeyword | string | 搜索关键词 | "AI 编程" |
| type | string | 类型：group/contact | "group" |
| enabled | boolean | 是否启用 | true |

### Submission 配置

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| videoPath | string | 视频文件绝对路径 | "/Users/xxx/video.mp4" |
| caption | string | 附加文字说明（可选） | "第3周作业" |
| targetIds | array | 目标 ID 列表 | ["homework_group_1"] |

### Options 配置

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| preventDuplicate | boolean | true | 防止重复提交 |
| retryOnFailure | number | 3 | 失败重试次数 |
| uploadTimeout | number | 300000 | 上传超时(ms)，大文件建议更长 |
| delayBetweenTargets | number | 5000 | 目标间延迟(ms) |

## 工作流程

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
   ├─ 通过剪贴板粘贴视频文件（Cmd+V）
   ├─ 添加文字说明（如果有）
   ├─ 点击发送按钮或按回车
   ├─ OCR 监控上传进度
   ├─ 验证发送成功
   └─ 记录到提交日志
   ↓
5. 生成提交报告
```

## 核心技术

### 1. 搜索功能
- **方法1**: `Cmd+F` 快捷键触发搜索（优先）
- **方法2**: OCR 识别搜索框并点击（备用）

### 2. 文件发送
- **方法1**: 复制文件到剪贴板 + `Cmd+V` 粘贴（优先）
- **方法2**: 点击"+"按钮 → 选择文件 → 使用 `Cmd+Shift+G` 输入路径（备用）

### 3. 发送验证
- OCR 监控聊天窗口
- 检测"上传中"/"uploading"关键词消失
- 检测"发送失败"关键词
- 超时机制保护

## 状态文件

所有状态文件存储在 `~/.openclaw/workspace/`：

- **homework_submit_log.json**: 提交历史记录
  ```json
  [
    {
      "targetId": "homework_group_1",
      "targetName": "AI 编程作业群",
      "videoPath": "/path/to/video.mp4",
      "caption": "第3周作业",
      "status": "success",
      "timestamp": "2026-03-08T12:00:00.000Z",
      "retryCount": 0
    }
  ]
  ```

- **homework_submit.txt**: 详细执行日志
  ```
  [2026-03-08 12:00:00] [📹 HomeworkSubmitter] Starting...
  [2026-03-08 12:00:05] [📹 HomeworkSubmitter] Searching for: AI 编程作业群
  ...
  ```

## 常见问题

### Q1: 提示"Video file not found"
**A**: 检查 `videoPath` 是否使用绝对路径，避免使用 `~` 符号。

### Q2: 搜索无法找到目标（重要）
**A**:
- **英文系统问题**：如果你的 macOS 是英文界面，微信联系人显示名称可能是英文
  - 例如："文件传输助手" 应该用 "File Transfer"
  - 建议：在微信手动搜索一次，确认显示名称
- **中文输入法问题**：工具已使用剪贴板方式输入，不受输入法状态影响
- 确保 `searchKeyword` 与微信中显示的名称完全一致
- 尝试使用更短的关键词（如只用姓氏）

### Q3: 视频上传超时
**A**:
- 增大 `uploadTimeout` 值（如 600000 = 10分钟）
- 检查网络连接
- 压缩视频文件大小

### Q4: 重复提交保护不生效
**A**: 检查 `preventDuplicate: true` 是否设置，删除 `homework_submit_log.json` 可重置历史。

### Q5: OCR 识别错误
**A**:
- 确保微信窗口完全可见
- 检查屏幕分辨率设置（代码中默认 1920x1080）
- 调整微信界面语言为简体中���

## 批量提交示例

提交到多个群/个人：

```json
{
  "targets": [
    {"id": "group1", "name": "算法作业群", "searchKeyword": "算法", "type": "group", "enabled": true},
    {"id": "group2", "name": "前端作业群", "searchKeyword": "前端", "type": "group", "enabled": true},
    {"id": "teacher", "name": "李老师", "searchKeyword": "李老师", "type": "contact", "enabled": true}
  ],
  "submissions": [
    {
      "videoPath": "/Users/me/Videos/algorithm_hw.mp4",
      "caption": "算法作业 - Week 3",
      "targetIds": ["group1", "teacher"]
    },
    {
      "videoPath": "/Users/me/Videos/frontend_hw.mp4",
      "caption": "前端作业 - Week 3",
      "targetIds": ["group2"]
    }
  ]
}
```

## 安全建议

1. **首次使用必须 --dry-run 测试**
2. **设置较小的 `retryOnFailure` 避免异常重试**
3. **合理设置 `delayBetweenTargets` 避免被微信限制**
4. **定期检查 `homework_submit.txt` 日志**
5. **大文件上传建议手动监控第一次执行**

## 限制与已知问题

- ❌ 不支持发送多个视频（一次一个）
- ❌ OCR 准确度依赖系统 Vision Framework
- ❌ 微信界面变化可能导致识别失败
- ❌ 需要手动授予辅助功能权限
- ⚠️ 大文件上传进度监控可能不准确

## 更新日志

### v1.0 (2026-03-08)
- ✅ 基础搜索功能
- ✅ 视频文件发送（双方案）
- ✅ 附加文字说明
- ✅ 发送验证与重试
- ✅ 去重保护
- ✅ 详细日志记录

---

**提示**: 本工具基于 GUI 自动化实现，执行过程中请勿操作微信窗口，否则可能导致流程中断。

## 技术细节

### 关键实现方案（已验证）

**1. 搜索关键词输入**
- 方法：剪贴板 + Cmd+V
- 原因：中文输入法状态下，直接 `keystroke` 会变成拼音输入
- 代码：`set the clipboard to "关键词"` → `keystroke "v" using command down`

**2. 视频文件发送**
- 方法：Finder 原生复制（Cmd+C）+ 微信粘贴（Cmd+V）
- 流程：
  1. `open -R` 在 Finder 中显示文件
  2. 激活 Finder，`keystroke "c" using command down`
  3. `open -a WeChat` 切换到微信（最可靠的置顶方法）
  4. `keystroke "v" using command down` 粘贴文件
- 原因：AppleScript 的 `set clipboard to (file as alias)` 在某些系统不支持文件复制

**3. 窗口切换**
- 最可靠方法：`open -a WeChat`
- 不可靠方法：`tell application "WeChat" to activate`（有时无法置顶）

### 系统兼容性

| 项目 | 要求 | 说明 |
|------|------|------|
| macOS 版本 | 10.14+ | 需要 Vision Framework 支持 |
| 微信版本 | 任意 | 基于 GUI 自动化，不依赖特定版本 |
| 系统语言 | 任意 | 搜索关键词需与微信显示名称匹配 |
| 输入法 | 任意 | 已使用剪贴板方式解决输入法问题 |
| 屏幕分辨率 | 任意 | OCR 坐标已归一化处理 |
