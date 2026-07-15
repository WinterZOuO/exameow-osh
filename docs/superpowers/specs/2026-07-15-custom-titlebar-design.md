# Custom TitleBar Design — 独立桌面标题栏

**Date:** 2026-07-15
**Status:** Approved (Approach A)

## Problem

1. **Windows 重叠**:`WindowControls.vue` 以 `absolute right-0 top-0` 叠在页面 header 上,与右侧语言/暗色按钮重叠。
2. **拖拽/双击失效(全平台)**:`capabilities/default.json` 未授予任何 `core:window:*` 权限,前端 `startDragging()` / `toggleMaximize()` / `minimize()` / `close()` / `isMaximized()` 全部静默失败。
3. **Logo 视觉冲突**:`frontend/public/logo.png`(512×512)是"白色圆形底(直径约 460px)+ 中间蓝色图案(约 x132-380, y120-390)",外层圆框与 CSS `rounded-xl` 期望的圆角方形冲突。

## Solution Overview

新增独立 `TitleBar.vue`(高 38px),仅 Tauri 桌面端(Windows/macOS/Linux)渲染,位于页面 header 之上。系统原生标题栏保持关闭(Windows/Linux `decorations(false)`,macOS `TitleBarStyle::Overlay`)。

## Components

### 1. `frontend/src/components/layout/TitleBar.vue`(新建)

- 高度 `h-[38px]`,`sticky top-0 z-40`,背景 `rgb(var(--md-surface))`,底部无边框(与 header 视觉连续)。
- **布局**:
  - macOS:左侧 `pl-[80px]` 留红绿灯区,随后 Logo(20px,`rounded-md`)+ 应用名(text-xs);右侧无按钮。
  - Windows/Linux:左侧 `pl-3` + Logo + 应用名;右侧 `WindowControls`(高度改为 38px)。
- **拖拽 + 双击**(Tauri 官方推荐模式,单一 `mousedown` 监听):
  ```ts
  function onMouseDown(e: MouseEvent) {
    if (e.buttons !== 1) return
    if ((e.target as HTMLElement).closest('button, a, input, select')) return
    e.detail === 2 ? getCurrentWindow().toggleMaximize() : getCurrentWindow().startDragging()
  }
  ```
  不单独监听 `dblclick`(Windows 上 `startDragging` 的模态循环会吞掉第二次点击)。

### 2. `src-tauri/capabilities/default.json`(修改)

新增权限:

```
core:window:allow-start-dragging
core:window:allow-toggle-maximize
core:window:allow-minimize
core:window:allow-close
core:window:allow-is-maximized
```

### 3. `AppShell.vue`(修改)

- 引入并渲染 `<TitleBar v-if="isDesktopTauri" />`(`isTauri() && (isWindows() || isMacOS() || isLinux())`)。
- header:`sticky` 偏移改为桌面端 `top-[38px]`(浏览器/移动端仍 `top-0`)。
- 移除:header 上的 `mousedown`/`dblclick` 拖拽处理、`isMacOSOverlay` 左 padding hack、`WindowControls` 渲染。
- Logo:桌面 Tauri 下从 header 移除(已在 TitleBar);浏览器模式保留现状。

### 4. `WindowControls.vue`(微调)

- 由外部传入高度(或改为 `h-full`),适配 38px 标题栏;逻辑不变(权限修复后即可工作)。

### 5. Logo 资源修复

- 一次性脚本(PowerShell System.Drawing):从原 512px 图裁剪中心 `96..416`(320×320,完全位于白圆内切区域),缩放回 512×512,覆盖 `frontend/public/logo.png`。
- 结果:白色方形底 + 蓝色图案,CSS `rounded-xl`/`rounded-md` 呈现圆角方形,无外层圆框。
- `favicon.png`/`src-tauri/icons/*` 不动(系统图标场景圆形可接受,不在本次范围)。

## Data Flow

TitleBar mousedown → `@tauri-apps/api/window` → IPC(需 capabilities 授权)→ 原生窗口操作。浏览器模式 `isTauri()` 为 false,TitleBar 不渲染,零影响。

## Error Handling

- 窗口 API 调用失败(如权限缺失)静默忽略(现状行为),不阻塞 UI。
- 非 Tauri 环境所有窗口逻辑短路。

## Testing

- Windows(本机):`tauri dev` 验证——标题栏独立不重叠、拖拽移动、双击最大化/还原、最小化/最大化/关闭按钮。
- macOS/Linux:代码路径审查(无法本机验证);macOS 红绿灯区留白 80px,标题栏其余区域拖拽/双击可用。
- 浏览器模式:`pnpm dev` 直接访问 5273 端口,确认无标题栏、header 布局与 logo 正常。

## Out of Scope

- macOS 红绿灯垂直居中微调(`trafficLightPosition`)
- macOS 全屏时红绿灯留白收起
- 系统图标(icons/、favicon)重制
