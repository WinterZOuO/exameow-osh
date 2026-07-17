# 录屏搜题 设计文档

日期：2026-07-17
状态：已确认（用户批准）

## 1. 背景与目标

搜题模块已实现文字搜题和拍照搜题。本次实现**录屏搜题**：用户在桌面端/移动端 Tauri 应用中启动录屏模式，系统在屏幕上显示一个可调整的透明录制框，定时截取框内区域 → 本地 OCR 识别 → 与本地题库匹配，最优结果展示在右下角答案浮窗中。

与拍照搜题共享同样的识别与匹配链路（OCR → `searchQuestions()`），区别在于截图是定时、自动、持续进行的。

## 2. 范围

### 本次实现

1. Tauri 多窗口支持（录制框子窗口 + 答案浮窗子窗口）
2. Rust 截图 command `capture_screen(x, y, w, h) → base64 JPEG`
3. 透明录制框（半透明边框，可拖动调整，屏幕中上方）
4. 答案浮窗（右下角，可拖动，三按钮：收起/调整/退出）
5. 定时截图 1.5s 间隔 + 图像比对有变化才 OCR
6. 仅本地 PaddleOCR（不支持 LLM 视觉模式）
7. 匹配结果展示：答案高亮首行 → 题干 2 行截断 → 选项
8. 无匹配时显示"未匹配到题目"
9. 平台限制：仅 `isTauri()` 桌面端和移动端支持，其他端显示"该平台不支持"

### 非目标

- 拍屏搜题（`cameraLive`，本次不实现，仍保持 `available: false`）
- 录屏搜题使用 LLM 视觉模式
- Web/Docker/Cloudflare 端的录屏搜题

## 3. 窗口架构

```
┌─────────────────────────────────────────┐
│           桌面（其他应用）                │
│                                          │
│    ┌───────────────┐                    │
│    │ 录制框（透明） │ ← 半透明边框      │
│    │               │    可拖动调整      │
│    │  用户在背后    │    z-index: 中     │
│    │  浏览题目     │                    │
│    └───────────────┘                    │
│                                          │
│              ┌──────────┐               │
│              │ 答案浮窗  │ ← 右下角      │
│              │ 答案: A   │   可拖动      │
│              │ 题干...   │   可收起      │
│              │ A.B.C.D. │   z-index: 高  │
│              │ [收][调][╳]│               │
│              └──────────┘               │
└─────────────────────────────────────────┘
```

### 窗口生命周期

- 用户在搜题主页点击"录屏搜题" → 导航到 `/search/screen-record` → 点击"开始录制" → 主窗口最小化 → 创建录制框子窗口 + 答案浮窗子窗口
- 录制框默认在屏幕上方 1/3 区域，宽度 60%，高度 40%
- 答案浮窗默认右下角
- 用户点击"退出" → 关闭两个子窗口 → 恢复主窗口
- 点击"收起" → 答案浮窗动画滑到最近屏幕边缘，缩成标签，点击恢复
- 点击"调整" → 切换录制框显示/隐藏

### 窗口间通信

使用 Tauri `emit`/`listen` 事件系统（`@tauri-apps/api/event`）：

```
主窗口 (ScreenRecordView)
  │  创建子窗口时传入区域坐标
  ├── emit → "record:state"  (idle/recording/paused)
  ├── emit → "record:result" (匹配结果)
  └── emit → "record:ocr-text" (OCR 原始文字)

录制框 (RecordOverlay)
  ├── emit → "record:region-change" (用户拖动调整区域后)
  └── listen ← "record:state" (显示/隐藏)

答案浮窗 (AnswerFloat)
  ├── listen ← "record:result" (展示匹配)
  └── emit → "record:action" (收起/调整/退出)
```

## 4. 数据流

```
定时器 (1.5s)
  │
  ▼
api.captureScreen(x, y, w, h)  ← Tauri command (Rust xcap)
  │  返回 base64 JPEG
  ▼
图像比对（缩略图 64×48 像素 hash）
  │  有变化？
  ├── 否 → 跳过，等下次
  └── 是
        │
        ▼
    PaddleOCR (ocr.ts)
        │  提取文字
        ▼
    searchQuestions() (questionSearch.ts)
        │  匹配本地题库 (practiceStore.banks)
        ▼
    最佳匹配结果 → 答案浮窗显示
```

### 手动刷新

用户在答案浮窗内**下拉**或**双击答案区域**，强制触发一次 OCR + 搜索，不依赖定时器（非按钮，不占浮窗按钮位）。

## 5. 前端组件结构

```
views/
  ScreenRecordView.vue              ← 新增：录制设置与启停页面

components/search/
  RecordOverlay.vue                 ← 新增：录制框子窗口内容（透明边框 + 拖动句柄）
  AnswerFloat.vue                   ← 新增：答案浮窗子窗口内容

composables/
  useScreenRecord.ts                ← 新增：核心编排逻辑

stores/
  screenRecord.ts                   ← 新增：区域坐标、OCR 结果、匹配结果

store 状态：
{
  status: 'idle' | 'recording' | 'paused',
  region: { x: number, y: number, w: number, h: number },
  currentResult: { question: Question, score: number } | null,  // 最佳匹配
  ocrText: string,                                                // 原始 OCR 文字
  lastCaptureHash: string,                                        // 上次截图像素 hash
}
```

### 5.1 ScreenRecordView.vue

路由：`/search/screen-record`

- 显示当前录制状态（待开始 / 录制中）
- "开始录制"按钮 → 创建子窗口，主窗口最小化
- 平台不受支持时显示"该平台不支持"

### 5.2 useScreenRecord.ts

核心 composable，编排整个录屏搜题流程：

- **状态管理**：idle / recording / paused
- **定时器**：1.5s 间隔调用 `captureScreen`
- **图像比对**：缩略图像素 hash 快速判断画面变化
- **OCR 调用**：复用 `ocr.ts` 的 `recognizeImage()`
- **搜索调用**：复用 `questionSearch.ts` 的 `searchQuestions()`
- **结果通知**：匹配结果推送到 `screenRecord` store，由 `AnswerFloat` 响应式展示

### 5.3 AnswerFloat.vue（答案浮窗）

- 布局：答案高亮第一行 → 题干 2 行截断 → 选项
- 仅三个按钮：收起（动画滑到屏幕边缘）、调整（切换录制框显示/隐藏）、退出（关闭子窗口，恢复主窗口）
- 手动刷新通过下拉或双击答案区域触发（非按钮，不占浮窗按钮位）
- 可拖动（Tauri `startDragging()`）
- 无匹配时显示"未匹配到题目"

### 5.4 RecordOverlay.vue（录制框）

- 半透明背景 + 彩色边框
- 拖动句柄（四角 + 四边）
- 显示/隐藏由 `screenRecord` store 控制

## 6. Rust 后端改动

### 6.1 新增依赖

```toml
xcap = "0.5"  # 跨平台屏幕截图
```

### 6.2 新增 Tauri command

```rust
#[tauri::command]
fn capture_screen(x: i32, y: i32, w: i32, h: i32) -> Result<String, CommandError> {
    // 使用 xcap 截取指定区域，返回 base64 JPEG
}
```

### 6.3 多窗口配置

- `tauri.conf.json`：注册 `record-overlay` 和 `answer-float` 两个额外窗口
- `capabilities/default.json`：将新增窗口加入 `windows` 列表
- 录制框窗口属性：`transparent: true`, `decorations: false`, `alwaysOnTop: true`, `resizable: false`
- 答案浮窗窗口属性：`decorations: false`, `alwaysOnTop: true`, `resizable: false`

## 7. 现有文件修改

### SearchHomeView.vue

- `screenRecord` 模式：`available` 从 `false` → `true`
- `path`：`''` → `'/search/screen-record'`

### router/index.ts

- 新增路由：`/search/screen-record` → `ScreenRecordView.vue`

### locales.ts

补全文案：
- `searchModeScreenRecord` 保持不变
- 增加录制中、匹配中、未匹配等文案

### api/bridge.ts

- 新增 `captureScreen(x, y, w, h)` 方法

## 8. 匹配结果展示格式

```
┌──────────────────────────────┐
│ 答案: A                      │  ← 正确答案，高亮色，第一行
│ 从下列选项中选择...这是一道..  │  ← 题干，最多 2 行，超出截断
│ A. 选项一    B. 选项二       │  ← 选项，最多 4~6 行
│ C. 选项三    D. 选项四       │
└──────────────────────────────┘
```

无匹配结果时：显示"未匹配到题目"

## 9. 平台限制

| 平台 | 支持 | 表现 |
|------|------|------|
| Tauri 桌面端（macOS/Windows/Linux） | 完全支持 | 正常功能 |
| Tauri 移动端（Android/iOS） | 完全支持 | 正常功能 |
| Web/Docker | 不支持 | 搜题页面显示"该平台不支持" |
| Cloudflare | 不支持 | 搜题页面显示"该平台不支持" |

## 10. 技术风险

| 风险 | 缓解 |
|------|------|
| Tauri 透明窗口 Linux 兼容性 | 透明背景不可行时降级为不透明，仍可调整区域 |
| Android 移动端 xcap 截图 | xcap 支持 Android，需验证；如不支持可尝试 Tauri mobile 的 `webview_window.eval()` 方案 |
| 多窗口 Tauri 移动端限制 | Tauri v2 移动端多窗口支持需实测；如不可用，降级为同窗口浮动层方案 |
| PaddleOCR 首次加载延迟 | 录制开始前预加载模型；加载期间浮窗显示"模型加载中" |
